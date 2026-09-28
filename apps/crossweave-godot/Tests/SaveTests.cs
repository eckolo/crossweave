using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Crossweave.Core.Application;
using Crossweave.Infrastructure.Application;
using Xunit;

namespace Crossweave.Tests;

// 保存試験はすべて固有の一時フォルダを使う。通常user://、ProofStore、旧JS保存へ書き込まない。
public sealed class SaveTests
{
    private sealed class Area : IDisposable
    {
        internal string Folder { get; } = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "crossweave-save-02a-" + Guid.NewGuid().ToString("N"));
        internal string Save => System.IO.Path.Combine(Folder, "m1.json");
        internal Area() => Directory.CreateDirectory(Folder);
        internal string File(string name) => System.IO.Path.Combine(Folder, name);
        public void Dispose() { if (Directory.Exists(Folder)) Directory.Delete(Folder, true); }
    }

    private sealed class Fault(Action<SavePoint, string> action) : ISaveFaults
    {
        internal bool Enabled = true;
        public void Hit(SavePoint point, string path) { if (Enabled) action(point, path); }
    }

    private static string ProjectRoot => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../.."));
    private static string Probe => Path.Combine(ProjectRoot, "SaveProbe/bin", new DirectoryInfo(AppContext.BaseDirectory).Parent!.Name, "net10.0/Crossweave.SaveProbe.dll");
    private static string Dotnet => Environment.GetEnvironmentVariable("CROSSWEAVE_DOTNET") ?? Path.Combine(ProjectRoot, ".tools/dotnet", OperatingSystem.IsWindows() ? "dotnet.exe" : "dotnet");
    private static Process Start(string mode, string path, string output, string? input = null, string? point = null, string? probe = null)
    {
        var info = new ProcessStartInfo(Dotnet) { UseShellExecute = false, RedirectStandardError = true, RedirectStandardOutput = true };
        foreach (var arg in new[] { probe ?? Probe, mode, path, output, input, point }.Where(x => x is not null)) info.ArgumentList.Add(arg!);
        return Process.Start(info)!;
    }

    private static JsonObject Run(string mode, string path, string output, string? input = null, string? probe = null, int exit = 0)
    {
        using var process = Start(mode, path, output, input, probe: probe);
        if (!process.WaitForExit(40000)) { process.Kill(true); throw new TimeoutException("検査CLIが40秒以内に終了しませんでした。"); }
        Assert.True(process.ExitCode == exit, $"{mode}: exit={process.ExitCode}, stderr={process.StandardError.ReadToEnd()}");
        var result = (JsonObject)JsonNode.Parse(System.IO.File.ReadAllText(output))!;
        Assert.NotEqual(Environment.ProcessId, result.I("pid"));
        return result;
    }

    private static void KillAtReady(Process process, string ready)
    {
        try
        {
            Assert.True(SpinWait.SpinUntil(() => System.IO.File.Exists(ready) || process.HasExited, 30000), "故障点の通知がありません。");
            Assert.False(process.HasExited, process.HasExited ? process.StandardError.ReadToEnd() : "");
        }
        finally { if (!process.HasExited) { process.Kill(true); Assert.True(process.WaitForExit(10000)); } }
    }

    private static GameCommand Command(JsonObject view, string type = "depart", JsonObject? payload = null, string? id = null)
        => new(id ?? Guid.NewGuid().ToString("N"), view.L("revision"), view.S("view_token"), type, payload ?? J.Obj(("case_id", "SCN-001")));

    private static ApplicationDto Dto(JsonObject result) => result["dto"]!.Deserialize<ApplicationDto>()!;
    private static JsonObject Comparable(ApplicationDto dto)
    { var state = dto.State.Copy(); state.Remove("view_nonce"); return state; }
    private static JsonObject ComparableView(JsonObject view)
    { var copy = view.Copy(); copy.Remove("view_token"); return copy; }
    private static string Hash(JsonNode value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(J.Canonical(value))));
    private static void Same(JsonNode expected, JsonNode actual) => Assert.Equal(J.Canonical(expected), J.Canonical(actual));
    private static string RequestFile(Area area, GameCommand command)
    { var path = area.File("request.json"); System.IO.File.WriteAllText(path, JsonSerializer.Serialize(command)); return path; }
    private static void Evidence(string name, object value)
    {
        var directory = Environment.GetEnvironmentVariable("RD_SAVE_EVIDENCE") ?? Path.Combine(ProjectRoot, "Tests/TestResults/rd-save-02a");
        Directory.CreateDirectory(directory);
        System.IO.File.WriteAllText(Path.Combine(directory, name + ".json"), JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
    }

    [Fact]
    public void InitialCreationDraftAndPreviewKeepTheirSeparateMeanings()
    {
        using var area = new Area();
        Assert.Equal("missing", FileGameSession.Diagnose(area.Save).Primary.Code);
        Assert.Throws<FileNotFoundException>(() => FileGameSession.Open(area.Save));
        Assert.False(System.IO.File.Exists(area.Save));
        ApplicationDto saved;
        using (var session = FileGameSession.CreateNew(area.Save, "save-02a-new"))
        {
            Assert.Equal(20, session.Inspect().O("home").A("owned").Count);
            var original = System.IO.File.ReadAllBytes(area.Save);
            var view = session.Inspect();
            var plan = view.O("draft").O("plan").Copy();
            plan.Put("acquire", new[] { "basic:PS01" });
            session.PreviewPreparation(view.L("revision"), view.S("view_token"), plan);
            Assert.Equal(original, System.IO.File.ReadAllBytes(area.Save));
            var r = session.Execute(Command(view, "save_draft", J.Obj(("plan", plan))));
            Assert.Equal("committed", r.Status);
            saved = session.ExportDto();
            Assert.True(session.Inspect().O("draft").B("dirty"));
            Assert.Equal(0, session.Inspect().O("home").O("economy").L("unspent_units"));
            Assert.Equal(20, session.Inspect().O("home").A("owned").Count);
            Assert.Equal(original, System.IO.File.ReadAllBytes(area.Save + ".bak"));
        }
        var read = Run("snapshot", area.Save, area.File("read.json"));
        Same(saved.State, Dto(read).State);
        using var reopened = FileGameSession.Open(area.Save);
        Assert.Equal("dirty_draft", reopened.Execute(Command(reopened.Inspect())).Error);
        Assert.Null(reopened.Execute(Command(reopened.Inspect(), "discard_draft", new())).Error);
        Assert.Equal(0, reopened.Inspect().O("home").O("economy").L("unspent_units"));
    }

    [Theory]
    [InlineData("BeforeWrite")]
    [InlineData("DuringWrite")]
    [InlineData("AfterFlush")]
    [InlineData("BeforeReplace")]
    [InlineData("ActualTemporaryPathDenied")]
    public void DefiniteWriteFailureKeepsMemoryAndCompleteFileAndAllowsSameRequestRetry(string point)
    {
        using var area = new Area();
        using (FileGameSession.CreateNew(area.Save)) { }
        var fault = new Fault((p, temp) =>
        {
            if (point == "ActualTemporaryPathDenied" && p == SavePoint.BeforeWrite) Directory.CreateDirectory(temp);
            else if (p.ToString() == point) throw new IOException("容量不足相当の書込み失敗注入: " + point);
        });
        using var session = FileGameSession.Open(area.Save, fault);
        var dto = session.ExportDto(); var bytes = System.IO.File.ReadAllBytes(area.Save);
        var command = Command(session.Inspect());
        Assert.Equal("commit_boundary_failed", session.Execute(command).Error);
        Assert.False(session.RequiresReload);
        Same(dto.State, session.ExportDto().State);
        Assert.Equal(bytes, System.IO.File.ReadAllBytes(area.Save));
        fault.Enabled = false;
        Assert.Equal("committed", session.Execute(command).Status);
        Assert.Equal("replayed", session.Execute(command).Status);
    }

    [Fact]
    public void InitialSaveFailureDoesNotReturnPlayableSession()
    {
        using var area = new Area();
        var dto = GameApplication.Create().ExportDto();
        var fault = new Fault((p, _) => { if (p == SavePoint.DuringWrite) throw new IOException("quota injected"); });
        Assert.Equal("initial_save_failed", Assert.Throws<SaveException>(() => FileGameSession.CreateFromDto(area.Save, dto, fault)).Code);
        Assert.Equal("missing", FileGameSession.Diagnose(area.Save).Primary.Code);
        using var created = FileGameSession.CreateNew(area.Save);
        Assert.Equal(0, created.Inspect().L("revision"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AfterReplaceResponseFailureIsReconciledOrBlocksUntilReload(bool unreadable)
    {
        using var area = new Area();
        using (FileGameSession.CreateNew(area.Save)) { }
        var fault = new Fault((p, _) =>
        {
            if (p == SavePoint.AfterReplace || (unreadable && p == SavePoint.BeforeReconcile)) throw new IOException("置換後の応答／読戻し障害注入");
        });
        using var session = FileGameSession.Open(area.Save, fault);
        var command = Command(session.Inspect());
        var result = session.Execute(command);
        Assert.Equal(unreadable ? "indeterminate" : "committed", result.Status);
        Assert.Equal(1, SaveFileCodec.Read(area.Save).Revision);
        if (unreadable)
        {
            Assert.True(session.RequiresReload);
            Assert.True(session.Inspect().B("stale"));
            Assert.All(session.Inspect().O("capabilities").Values(), c => Assert.False(c.B("available")));
            Assert.Equal("blocked", session.Execute(command).Status);
            Assert.Throws<ApplicationCommitUncertainException>(session.ExportDto);
            fault.Enabled = false;
            session.Reload();
        }
        var bytes = System.IO.File.ReadAllBytes(area.Save);
        Assert.Equal("replayed", session.Execute(command).Status);
        Assert.Equal(bytes, System.IO.File.ReadAllBytes(area.Save));
        Assert.False(session.RequiresReload);
    }

    [Fact]
    public void ExternalRevisionRollbackStopsTheOldOwnerWithoutOverwriting()
    {
        using var area = new Area();
        using var session = FileGameSession.CreateNew(area.Save);
        var old = System.IO.File.ReadAllBytes(area.Save);
        Assert.Null(session.Execute(Command(session.Inspect())).Error);
        System.IO.File.WriteAllBytes(area.Save, old); // ロックを無視する外部編集を試験として再現する。
        var result = session.Execute(Command(session.Inspect(), "withdraw", new()));
        Assert.Equal("indeterminate", result.Status);
        Assert.True(session.RequiresReload);
        Assert.Equal(old, System.IO.File.ReadAllBytes(area.Save));
    }

    [Fact]
    public void CorruptionNeverCreatesNewGameAndExplicitRecoveryPreservesDamagedOriginal()
    {
        using var area = new Area();
        byte[] initial;
        using (var session = FileGameSession.CreateNew(area.Save))
        { initial = System.IO.File.ReadAllBytes(area.Save); Assert.Null(session.Execute(Command(session.Inspect())).Error); }
        var damaged = Encoding.UTF8.GetBytes("{broken");
        System.IO.File.WriteAllBytes(area.Save, damaged);
        Assert.Equal("invalid_save", FileGameSession.Diagnose(area.Save).Primary.Code);
        Assert.Throws<SaveException>(() => FileGameSession.Open(area.Save));
        Assert.Throws<SaveException>(() => FileGameSession.CreateNew(area.Save));
        Assert.Equal(damaged, System.IO.File.ReadAllBytes(area.Save));
        using var restored = FileGameSession.RecoverBackup(area.Save);
        Assert.Equal(initial, System.IO.File.ReadAllBytes(area.Save));
        Assert.Equal(initial, System.IO.File.ReadAllBytes(area.Save + ".bak"));
        var archive = Assert.Single(Directory.GetFiles(area.Folder, "m1.json.damaged-*"));
        Assert.Equal(damaged, System.IO.File.ReadAllBytes(archive));
        Assert.Equal(0, restored.Inspect().L("revision"));
    }

    [Theory]
    [InlineData("file", "unsupported_file_version")]
    [InlineData("dto", "unsupported_dto_version")]
    [InlineData("content", "unsupported_content_version")]
    [InlineData("checksum", "checksum_mismatch")]
    public void UnsupportedVersionsAndChecksumFailureKeepOriginals(string kind, string error)
    {
        using var area = new Area();
        using (var session = FileGameSession.CreateNew(area.Save)) { Assert.Null(session.Execute(Command(session.Inspect())).Error); }
        var root = (JsonObject)JsonNode.Parse(System.IO.File.ReadAllText(area.Save))!;
        if (kind == "file") root.Put("fileVersion", 999);
        if (kind == "dto") root.O("payload").Put("FormatVersion", 999);
        if (kind == "content") root.O("payload").Put("ContentSetId", "future-content");
        root.Put("payloadSha256", kind == "checksum" ? "broken" : Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(root["payload"]!.ToJsonString()))));
        System.IO.File.WriteAllText(area.Save, root.ToJsonString());
        var primary = System.IO.File.ReadAllBytes(area.Save); var backup = System.IO.File.ReadAllBytes(area.Save + ".bak");
        Assert.Equal(error, FileGameSession.Diagnose(area.Save).Primary.Code);
        Assert.Throws<SaveException>(() => FileGameSession.Open(area.Save));
        Assert.Throws<SaveException>(() => FileGameSession.CreateNew(area.Save));
        if (kind != "checksum") Assert.Equal("unsupported_recovery", Assert.Throws<SaveException>(() => FileGameSession.RecoverBackup(area.Save)).Code);
        Assert.Equal(primary, System.IO.File.ReadAllBytes(area.Save));
        Assert.Equal(backup, System.IO.File.ReadAllBytes(area.Save + ".bak"));
    }

    [Theory]
    [InlineData("DuringWrite")]
    [InlineData("AfterFlush")]
    [InlineData("BeforeReplace")]
    [InlineData("AfterReplace")]
    public void KilledWriterResumesOnlyACompleteStateAndDoesNotApplyRequestTwice(string point)
    {
        using var area = new Area();
        ApplicationDto before; GameCommand command;
        using (var session = FileGameSession.CreateNew(area.Save, "save-crash")) { before = session.ExportDto(); command = Command(session.Inspect()); }
        var old = System.IO.File.ReadAllBytes(area.Save);
        var request = RequestFile(area, command); var ready = area.File("ready.json");
        using (var process = Start("fault", area.Save, ready, request, point)) KillAtReady(process, ready);
        var read = Run("snapshot", area.Save, area.File("after-kill.json"));
        var expected = GameApplication.Restore(before); Assert.Null(expected.Execute(command).Error);
        if (point == "AfterReplace")
        { Same(Comparable(expected.ExportDto()), Comparable(Dto(read))); Assert.Equal(old, System.IO.File.ReadAllBytes(area.Save + ".bak")); }
        else
        { Same(before.State, Dto(read).State); Assert.Equal(old, System.IO.File.ReadAllBytes(area.Save)); Assert.NotEmpty(FileGameSession.Diagnose(area.Save).PendingFiles); }
        var replay = Run("execute", area.Save, area.File("replayed.json"), request);
        Assert.Equal(point == "AfterReplace" ? "replayed" : "committed", replay.O("result").S("Status"));
        Same(Comparable(expected.ExportDto()), Comparable(Dto(replay)));
        Evidence("crash-" + point, new { point, killedPid = ((JsonObject)JsonNode.Parse(System.IO.File.ReadAllText(ready))!).I("pid"), readPid = read.I("pid"), retryPid = replay.I("pid"), completeState = true, retryStatus = replay.O("result").S("Status"), expectedHash = Hash(Comparable(expected.ExportDto())), actualHash = Hash(Comparable(Dto(replay))) });
    }

    [Theory]
    [InlineData("DuringWrite")]
    [InlineData("AfterReplace")]
    public void InterruptedInitialCreationDoesNotSilentlyPromoteATemporaryFile(string point)
    {
        using var area = new Area(); var ready = area.File("ready.json");
        using (var process = Start("create-fault", area.Save, ready, "first-crash", point)) KillAtReady(process, ready);
        Assert.Throws<SaveException>(() => FileGameSession.CreateNew(area.Save));
        if (point == "DuringWrite")
        {
            Assert.Equal("missing", FileGameSession.Diagnose(area.Save).Primary.Code);
            Assert.NotEmpty(FileGameSession.Diagnose(area.Save).PendingFiles);
            FileGameSession.ArchiveIncompleteCreation(area.Save);
            Assert.NotEmpty(Directory.GetFiles(area.Folder, "*.abandoned"));
            using var created = FileGameSession.CreateNew(area.Save);
        }
        else
        { using var opened = FileGameSession.Open(area.Save); Assert.Equal(0, opened.Inspect().L("revision")); }
    }

    [Fact]
    public void SecondProcessIsRejectedAndKilledOwnerReleasesItsLock()
    {
        using var area = new Area(); using (FileGameSession.CreateNew(area.Save)) { }
        var before = System.IO.File.ReadAllBytes(area.Save); var ready = area.File("ready.json");
        using var holder = Start("hold", area.Save, ready);
        try
        {
            Assert.True(SpinWait.SpinUntil(() => System.IO.File.Exists(ready) || holder.HasExited, 30000));
            Assert.False(holder.HasExited);
            Assert.Equal("save_in_use", Assert.Throws<SaveException>(() => FileGameSession.Open(area.Save)).Code);
            var second = Run("snapshot", area.Save, area.File("second.json"), exit: 7);
            Assert.Equal("save_in_use", second.S("error"));
            Assert.Equal(before, System.IO.File.ReadAllBytes(area.Save));
        }
        finally { if (!holder.HasExited) { holder.Kill(true); holder.WaitForExit(10000); } }
        using var reopened = FileGameSession.Open(area.Save);
        Assert.Equal(0, reopened.Inspect().L("revision"));
    }

    [Fact]
    public async Task DisposeWaitsForTheInFlightCommitBeforeReleasingOwnership()
    {
        using var area = new Area(); using (FileGameSession.CreateNew(area.Save)) { }
        using var entered = new ManualResetEventSlim(); using var resume = new ManualResetEventSlim(); using var disposeStarted = new ManualResetEventSlim();
        var fault = new Fault((p, _) => { if (p == SavePoint.BeforeReplace) { entered.Set(); if (!resume.Wait(10000)) throw new TimeoutException(); } });
        var session = FileGameSession.Open(area.Save, fault); var command = Command(session.Inspect());
        var saving = Task.Run(() => session.Execute(command));
        Assert.True(entered.Wait(10000));
        var closing = Task.Run(() => { disposeStarted.Set(); session.Dispose(); });
        try { Assert.True(disposeStarted.Wait(10000)); await Task.Delay(100); Assert.False(closing.IsCompleted); }
        finally { resume.Set(); }
        Assert.Equal("committed", (await saving).Status); await closing;
        using var reopened = FileGameSession.Open(area.Save); Assert.Equal(1, reopened.Inspect().L("revision"));
    }

    private static JsonObject Oracle()
    {
        using var file = System.IO.File.OpenRead(Path.Combine(AppContext.BaseDirectory, "Fixtures/application-oracle.json.br"));
        using var stream = new BrotliStream(file, CompressionMode.Decompress);
        return (JsonObject)JsonNode.Parse(stream)!;
    }

    private static ApplicationDto LegacyFixture(JsonObject source)
    {
        var d = source.Copy(); d.Put("schema", "CW-CSharp-application-1"); d.Put("engine_version", "CW-CSharp-core-1");
        return GameApplication.Restore(new(1, Content.M1.S("rule_set_id"), Content.M1.S("content_set_id"), d)).ExportDto();
    }

    private static void ApplyDelta(JsonObject state, JsonArray changes)
    {
        foreach (var op in changes.Rows())
        {
            var path = op.A("path").Strings(); JsonNode node = state;
            foreach (var key in path[..^1]) node = node is JsonArray a ? a[int.Parse(key)]! : node[key]!;
            var last = path[^1];
            if (node is JsonArray array) array[int.Parse(last)] = op["value"]?.DeepClone();
            else if (op.B("remove")) ((JsonObject)node).Remove(last);
            else node[last] = op["value"]?.DeepClone();
        }
    }

    [Theory]
    [InlineData("natural")]
    [InlineData("withdraw-before")]
    [InlineData("withdraw-protected")]
    [InlineData("defeat")]
    [InlineData("withdraw-unprotected")]
    [InlineData("legal-acquisition")]
    public void RealCampaignFilesContinueInOtherProcessesAcrossAcquisitionAndAllReturns(string name)
    {
        using var area = new Area();
        var record = Oracle().A("records").Rows().Single(r => r.S("name") == name);
        var initial = name is "legal-acquisition" or "withdraw-unprotected" ? LegacyFixture(record.O("initial")) : GameApplication.Create("D04B-" + name).ExportDto();
        var expectedLegacy = J.Select(record.O("initial"), "session", "casebook");
        using (FileGameSession.CreateFromDto(area.Save, initial)) { }
        var evidence = new List<object>(); int index = 0;
        foreach (var row in record.A("steps").Rows())
        {
            ApplyDelta(expectedLegacy, row.A("expected_delta"));
            var request = row.O("request"); ApplicationDto before; JsonObject view;
            using (var opened = FileGameSession.Open(area.Save)) { before = opened.ExportDto(); view = opened.Inspect(); }
            var payload = request.O("payload").Copy();
            if (name == "natural" && request.S("type") == "commit_preparation")
            {
                var raw = expectedLegacy.O("session").O("au").A("deck").Strings();
                var owned = before.State.O("session").O("economy").O("inventory").Select(x => x.Key).Order(StringComparer.Ordinal).ToArray();
                payload.O("plan").O("composition").Put("deck", raw.Select(id => "owned-" + (Array.IndexOf(owned, id[6..]) + 1)));
            }
            var command = Command(view, request.S("type"), payload, request.S("id"));
            var memory = GameApplication.Restore(before); var expected = memory.Execute(command); Assert.Null(expected.Error);
            // phase遷移・取得・初回行動・一定間隔は、本当に子プロセスで読込みと次操作を実施する。
            bool separate = index % 17 == 0 || expected.View.S("phase") != view.S("phase") || command.Type == "commit_preparation";
            ApplicationDto actual; JsonObject actualView; int pid = Environment.ProcessId;
            if (separate)
            {
                var read = Run("snapshot", area.Save, area.File("snapshot.json")); Same(before.State, Dto(read).State); Same(view, read.O("view"));
                var result = Run("execute", area.Save, area.File("executed.json"), RequestFile(area, command));
                Assert.Equal("committed", result.O("result").S("Status")); actual = Dto(result); actualView = result.O("view"); pid = result.I("pid");
                var bytes = System.IO.File.ReadAllBytes(area.Save);
                var replay = Run("execute", area.Save, area.File("resend.json"), RequestFile(area, command));
                Assert.Equal("replayed", replay.O("result").S("Status")); Assert.Equal(bytes, System.IO.File.ReadAllBytes(area.Save));
            }
            else
            {
                using var opened = FileGameSession.Open(area.Save); Assert.Null(opened.Execute(command).Error);
                actual = opened.ExportDto(); actualView = opened.Inspect();
            }
            Same(Comparable(memory.ExportDto()), Comparable(actual)); Same(ComparableView(expected.View), ComparableView(actualView));
            Same(actual.State, SaveFileCodec.Read(area.Save).Dto.State);
            evidence.Add(new { index, command.Type, command.RequestId, pid, separateProcess = separate, revision = actual.State.L("revision"), phase = actualView.S("phase"), expectedHash = Hash(Comparable(memory.ExportDto())), actualHash = Hash(Comparable(actual)), publicViewHash = Hash(ComparableView(actualView)) });
            index++;
        }
        Evidence("campaign-" + name, new { name, source = "application-oracle.json.br at Core56caf205", commands = index, checks = evidence });
    }

    [Fact]
    public void FrozenVersionOneSaveCanResumeFromAnotherProgramDirectory()
    {
        using var area = new Area();
        System.IO.File.Copy(Path.Combine(AppContext.BaseDirectory, "Fixtures/save-file-v1.json"), area.Save);
        var first = Run("snapshot", area.Save, area.File("first.json"));
        var elsewhere = area.File("other-install"); Directory.CreateDirectory(elsewhere);
        foreach (var source in Directory.GetFiles(Path.GetDirectoryName(Probe)!)) System.IO.File.Copy(source, Path.Combine(elsewhere, Path.GetFileName(source)));
        var command = Command(first.O("view")); var request = RequestFile(area, command);
        var second = Run("execute", area.Save, area.File("second.json"), request, Path.Combine(elsewhere, Path.GetFileName(Probe)));
        var expected = GameApplication.Restore(Dto(first)); Assert.Null(expected.Execute(command).Error);
        Same(Comparable(expected.ExportDto()), Comparable(Dto(second)));
        Assert.False(System.IO.File.Exists(Path.Combine(elsewhere, "m1.json")));
    }
}
