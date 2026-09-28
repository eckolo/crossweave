using Crossweave.Core.Application;

namespace Crossweave.Infrastructure.Application;

/// <summary>
/// 保存ファイルの一人の書込み所有者。別ファイルのロックを開いたまま保持し、
/// JSON本体を置換してもロック対象のファイルが入れ替わらないようにする。
/// 通常の利用者はFileGameSessionを使い、Coreの候補DTOだけをこの境界へ渡す。
/// </summary>
internal sealed class ApplicationFileStore : IApplicationCommitBoundary, IDisposable
{
    internal string Path { get; }
    internal string BackupPath => Path + ".bak";
    internal bool Blocked { get; private set; }
    internal string? LastFailure { get; private set; }
    private readonly FileStream owner;
    private readonly ISaveFaults? faults;
    private SavedState? current;
    private bool disposed;

    private ApplicationFileStore(string path, FileStream owner, ISaveFaults? faults)
    { Path = path; this.owner = owner; this.faults = faults; }

    internal static string NormalizePath(string path)
    {
        if (!System.IO.Path.IsPathFullyQualified(path)) throw new ArgumentException("保存先は明示した絶対OSパスで指定してください。", nameof(path));
        return System.IO.Path.GetFullPath(path);
    }

    internal static ApplicationFileStore Acquire(string path, ISaveFaults? faults = null)
    {
        path = NormalizePath(path);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        try
        {
            // lockファイルは削除しない。Unixで削除して作り直すと、別のinodeをロックできてしまうため。
            var owner = new FileStream(path + ".lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            return new(path, owner, faults);
        }
        catch (IOException ex) { throw new SaveException("save_in_use", "保存領域を取得できません。他プロセスの使用中、またはロックI/Oの失敗です。", ex); }
    }

    internal ApplicationDto Load()
    {
        ObjectDisposedException.ThrowIf(disposed, this);
        var loaded = SaveFileCodec.Read(Path);
        current = loaded;
        Blocked = false;
        LastFailure = null;
        return loaded.Dto;
    }

    internal void Create(ApplicationDto dto)
    {
        // File.Existsだけでは権限エラーを「存在しない」と誤認する。診断でmissingを確認する。
        if (SaveFileCodec.Diagnose(Path).Code != "missing" || SaveFileCodec.Diagnose(BackupPath).Code != "missing" || PendingFiles(Path).Length != 0)
            throw new SaveException("save_already_exists", "保存・バックアップ・未確定ファイルが存在します。新規開始で上書きしません。");
        var candidate = new SavedState(dto, SaveFileCodec.Encode(dto));
        if (!Write(candidate)) throw new SaveException("initial_save_failed", LastFailure ?? "初回保存に失敗しました。");
    }

    public bool TryCommit(long expectedRevision, ApplicationDto candidate)
    {
        ObjectDisposedException.ThrowIf(disposed, this);
        if (Blocked) throw new ApplicationCommitUncertainException("保存状態の再読込みが必要です。");
        if (current is null || current.Revision != expectedRevision || candidate.State["revision"]!.GetValue<long>() != checked(expectedRevision + 1))
            throw new SaveException("stale_save_revision", "保存revisionと確定要求が一致しません。");
        var next = new SavedState(candidate, SaveFileCodec.Encode(candidate));
        // ロックに従わない外部編集も、前回読んだ完全バイトとの比較で検出する。
        // revisionだけ同じ別文書を上書きしない。
        try
        {
            if (!SaveFileCodec.Read(Path).Bytes.AsSpan().SequenceEqual(current.Bytes))
                throw new SaveException("save_changed_externally", "所有中に保存内容が外部から変わりました。");
        }
        catch (Exception ex) when (ex is SaveException or IOException or UnauthorizedAccessException)
        { Block(ex); }
        return Write(next);
    }

    private bool Write(SavedState candidate)
    {
        var temp = Path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        LastFailure = null;
        try
        {
            faults?.Hit(SavePoint.BeforeWrite, temp);
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                int half = candidate.Bytes.Length / 2;
                stream.Write(candidate.Bytes.AsSpan(0, half));
                faults?.Hit(SavePoint.DuringWrite, temp);
                stream.Write(candidate.Bytes.AsSpan(half));
                stream.Flush(flushToDisk: true);
            }
            faults?.Hit(SavePoint.AfterFlush, temp);
            if (!SaveFileCodec.Read(temp).Bytes.AsSpan().SequenceEqual(candidate.Bytes))
                throw new SaveException("temporary_mismatch", "書き出した候補が一致しません。");
            faults?.Hit(SavePoint.BeforeReplace, temp);
            if (current is null) File.Move(temp, Path, overwrite: false);
            else File.Replace(temp, Path, BackupPath, ignoreMetadataErrors: false);
            faults?.Hit(SavePoint.AfterReplace, temp);
            // 戻り値を成功にする前に保存先を照合する。置換の後の例外も下の同じ照合へ進む。
            return Reconcile(candidate, temp, null);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or SaveException)
        {
            return Reconcile(candidate, temp, ex);
        }
        finally
        {
            // 自分の未確定候補だけを片付ける。プロセス強制終了で残った他のtmpは復旧診断用に保全。
            try { File.Delete(temp); } catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
        }
    }

    private bool Reconcile(SavedState candidate, string temp, Exception? error)
    {
        try
        {
            faults?.Hit(SavePoint.BeforeReconcile, temp);
            byte[]? actual;
            try { actual = SaveFileCodec.Read(Path).Bytes; }
            catch (FileNotFoundException) { actual = null; }
            catch (DirectoryNotFoundException) { actual = null; }
            if (actual is not null && actual.AsSpan().SequenceEqual(candidate.Bytes))
            {
                current = candidate;
                // 置換後の応答障害でも、候補そのものが読めれば成功。要求履歴も同時に保存済み。
                return true;
            }
            if ((current is null && actual is null) || (current is not null && actual is not null && actual.AsSpan().SequenceEqual(current.Bytes)))
            {
                LastFailure = error?.Message ?? "保存先に候補が反映されませんでした。";
                return false;
            }
            throw new SaveException("unrecognized_save", "保存先が旧状態・候補のどちらとも一致しません。");
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or SaveException)
        { Block(ex); return false; }
    }

    private void Block(Exception cause)
    {
        Blocked = true;
        LastFailure = cause.Message;
        // false/通常例外へ潰すとCoreが「確実に未保存」と誤解する。専用例外で操作を停止させる。
        throw new ApplicationCommitUncertainException(cause.Message, cause);
    }

    internal static string[] PendingFiles(string path)
    {
        var folder = System.IO.Path.GetDirectoryName(path)!;
        return Directory.Exists(folder) ? Directory.GetFiles(folder, System.IO.Path.GetFileName(path) + ".*.tmp") : [];
    }

    internal ApplicationDto RecoverBackup()
    {
        var status = SaveFileCodec.Diagnose(Path);
        if (status.Code == "ready") throw new SaveException("recovery_not_needed", "完全な現保存があるため巻き戻しません。");
        if (status.Code.StartsWith("unsupported_", StringComparison.Ordinal))
            throw new SaveException("unsupported_recovery", "新しい形式の現保存を古いバックアップで上書きしません。");
        var backup = SaveFileCodec.Read(BackupPath);
        byte[]? damaged = null;
        try { damaged = File.ReadAllBytes(Path); }
        catch (FileNotFoundException) { }
        catch (DirectoryNotFoundException) { }
        if (damaged is not null)
        {
            // 復旧は明示操作のみ。壊れた原本も先に別名へ複製し、診断・将来の救出に残す。
            using var archive = new FileStream(Path + ".damaged-" + Guid.NewGuid().ToString("N"), FileMode.CreateNew, FileAccess.Write, FileShare.None);
            archive.Write(damaged);
            archive.Flush(true);
        }
        var temp = Path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            { stream.Write(backup.Bytes); stream.Flush(true); }
            _ = SaveFileCodec.Read(temp);
            // .bakへ壊れた現保存を移さない。復旧元の完全保存はそのまま残す。
            File.Move(temp, Path, overwrite: true);
            return Load();
        }
        finally { try { File.Delete(temp); } catch (IOException) { } }
    }

    internal void ArchiveIncompleteCreation()
    {
        if (SaveFileCodec.Diagnose(Path).Code != "missing" || SaveFileCodec.Diagnose(BackupPath).Code != "missing")
            throw new SaveException("save_already_exists", "現保存またはバックアップが存在します。");
        foreach (var temp in PendingFiles(Path)) File.Move(temp, temp + ".abandoned");
    }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        owner.Dispose(); // 終了・強制終了でOSハンドルが解放され、次プロセスが取得できる。
    }
}
