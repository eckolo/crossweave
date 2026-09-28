using System.Text.Json.Nodes;
using Crossweave.Core.Application;

namespace Crossweave.Infrastructure.Application;

/// <summary>
/// 本編の寿命とファイル所有権をまとめる、画面側の入口。これは本作独自の純C#クラスで、GodotのNodeではない。
/// Godot側は02Bでuser://を絶対OSパスへ解決して渡す。別プロセス・二重起動は同じ保存パスを使う。
/// </summary>
public sealed class FileGameSession : IDisposable
{
    private readonly object gate = new();
    private readonly ApplicationFileStore store;
    private GameApplication application;
    private bool disposed;
    private FileGameSession(ApplicationFileStore store, ApplicationDto dto)
    { this.store = store; application = GameApplication.Restore(dto, store); }

    /// <summary>完全な既存保存を開く。見つからない／破損／未来版の場合は例外とし、新規開始に置換しない。</summary>
    public static FileGameSession Open(string absolutePath) => Open(absolutePath, null);

    internal static FileGameSession Open(string absolutePath, ISaveFaults? faults)
    {
        var store = ApplicationFileStore.Acquire(absolutePath, faults);
        try { return new(store, store.Load()); }
        catch { store.Dispose(); throw; }
    }

    /// <summary>保存が存在しない時だけ新規開始する。初期DTOのファイル確定が成功してからインスタンスを返す。</summary>
    public static FileGameSession CreateNew(string absolutePath, string? campaignId = null)
        => CreateFromDto(absolutePath, GameApplication.Create(campaignId).ExportDto());

    // 合法な固定入力を保存試験へ渡すための内部入口。製品の旧JSインポートAPIとして公開しない。
    internal static FileGameSession CreateFromDto(string path, ApplicationDto initial, ISaveFaults? faults = null)
    {
        var store = ApplicationFileStore.Acquire(path, faults);
        try { store.Create(initial); return new(store, initial); }
        catch { store.Dispose(); throw; }
    }

    /// <summary>読取り専用の診断。missingと読込み失敗を区別する。ここではロック取得・復旧・初期化をしない。</summary>
    public static SaveDiagnosis Diagnose(string absolutePath)
    {
        var path = ApplicationFileStore.NormalizePath(absolutePath);
        return new(SaveFileCodec.Diagnose(path), SaveFileCodec.Diagnose(path + ".bak"), ApplicationFileStore.PendingFiles(path));
    }

    /// <summary>
    /// 壊れた／消失した現保存を、直前の完全保存から明示的に戻す。最大一操作分を巻き戻すため利用者への説明が必要。
    /// 壊れた原本は別名で残す。未来版の上書き・正常な現保存の巻き戻しは拒否する。
    /// </summary>
    public static FileGameSession RecoverBackup(string absolutePath)
    {
        var store = ApplicationFileStore.Acquire(absolutePath);
        try { return new(store, store.RecoverBackup()); }
        catch { store.Dispose(); throw; }
    }

    /// <summary>初回作成の中断でtmpだけ残った場合の明示処置。候補を確定せず別名で保全し、新規作成を可能にする。</summary>
    public static void ArchiveIncompleteCreation(string absolutePath)
    {
        using var store = ApplicationFileStore.Acquire(absolutePath);
        store.ArchiveIncompleteCreation();
    }

    public bool RequiresReload => Use(() => application.IsCommitBlocked || store.Blocked);
    public string? LastSaveFailure => Use(() => store.LastFailure);

    /// <summary>画面へ渡す独立コピー。成否不明時はstale=trueかつ全操作不可。DTOを画面の状態原本にしない。</summary>
    public JsonObject Inspect() => Use(() => application.Inspect());

    /// <summary>候補計算→ファイル保存→メモリー交換を同期的に行う。indeterminateなら通常操作へ戻さずReload/再起動へ進む。</summary>
    public CommandResult Execute(GameCommand command) => Use(() => application.Execute(command));

    /// <summary>確定済みDTOの診断・検査用コピー。成否不明中には取り出せない。</summary>
    public ApplicationDto ExportDto() => Use(() => application.ExportDto());

    /// <summary>予測はファイルへ書かない。明示save_draftは未払いの案として一操作保存される。</summary>
    public JsonObject PreviewPreparation(long revision, string token, JsonObject plan) => Use(() => application.PreviewPreparation(revision, token, plan));
    public JsonObject PreviewAction(long revision, string token, JsonObject choice) => Use(() => application.PreviewAction(revision, token, choice));
    public JsonObject QuoteConversion(long revision, string token, JsonArray ids) => Use(() => application.QuoteConversion(revision, token, ids));

    /// <summary>成否不明時も、所有権を維持して現保存を再検証する。成功した実物から本体を作り直し、要求再送を可能にする。</summary>
    public void Reload() => Use(() => { application = GameApplication.Restore(store.Load(), store); return true; });

    private T Use<T>(Func<T> action)
    {
        lock (gate) { ObjectDisposedException.ThrowIf(disposed, this); return action(); }
    }

    /// <summary>
    /// 終了は進行中の同期Executeが終わるまで待ってからロックを解放する。
    /// Godotの終了要求をこの待機へ接続する処理と表示は02B。強制終了時の未確定操作は保証しない。
    /// </summary>
    public void Dispose()
    {
        lock (gate)
        {
            if (disposed) return;
            disposed = true;
            store.Dispose();
        }
    }
}
