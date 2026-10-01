using Godot;
using System.Text.Json.Nodes;
using Crossweave.Core;
using Crossweave.Core.Application;
using Crossweave.Infrastructure.Application;

namespace Crossweave.Application;

/// <summary>
/// 本編の一つの起動を所有するControl。sceneを交換せず、同じFileGameSessionから表示を作り直す。
/// Godotノードはメインスレッドだけで操作する。同期ファイルAPIは一度に一つのTaskで実行し、
/// _Processで完了を受け取る。保存中も描画と終了要求を受け付け、二重の確定は受け付けない。
/// </summary>
public partial class GameScreen : Control
{
    internal FileGameSession? Session { get; private set; }
    internal JsonObject View { get; private set; } = new();
    internal JsonObject Plan { get; private set; } = new();
    internal JsonObject Comparison { get; private set; } = new();
    internal string SavePath { get; private set; } = "";
    internal string Screen = "start", Message = "保存を確認しています。", Modal = "", LastStatus = "";
    internal bool Busy => operation is not null;
    internal bool Blocked => View.Flag("stale");
    internal bool Dirty => View.Text("phase") == "home" && !JsonNode.DeepEquals(Plan, View.Obj("draft").Obj("plan"));
    internal bool DraftDirty => Dirty || View.Obj("draft").Flag("dirty");
    internal readonly Dictionary<string, Control> Controls = new(StringComparer.Ordinal);
    internal GameCommand? LastCommand;
    private Task<UiResult>? operation;
    private Action<UiResult>? completion;
    private bool renderNeeded, closeRequested;
    private bool departAfterReturn;
    private SaveDiagnosis? diagnosis;
    private Font font = null!;
    private Control content = null!, popup = null!;
    private JsonObject detail = new();
    private string detailKey = "", detailKind = "", detailId = "";
    private Vector2 detailOrigin;
    private string preparationTab = "card", selectedCard = "", selectedTarget = "";
    private JsonObject actionPreview = new();
    private readonly Dictionary<string, int> scrollPositions = new();
    private readonly PointerGesture gesture = new();
    private JsonObject gestureRow = new();
    private string gestureZone = "";
    private double gestureStarted;
    private Vector2 pointer;
    private Vector2 grabOffset, grabbedSize;
    private CardTile? dragGhost;
    private bool verticalSwipe, autoDetails = true;
    private bool showRelations = true, quickPlace = true, allowDrag = true;
    private int holdMilliseconds = 220;
    private readonly HashSet<int> touchPointers = [];
    private string modalParent = "", knowledgeSelection = "";
    private bool prepareAfterReturn;
    private readonly List<(Rect2 rect, string zone)> dropZones = [];
    internal UiAutomation? Automation;

    // Taskからは純.NETの値だけが戻る。Node、Texture、Controlをworkerへ渡さない。
    private sealed record UiResult(FileGameSession? Opened = null, JsonObject? View = null, CommandResult? Command = null,
        SaveDiagnosis? Diagnosis = null, string? Error = null);

    public override void _Ready()
    {
        SetAnchorsAndOffsetsPreset(LayoutPreset.FullRect);
        GetTree().AutoAcceptQuit = false;
        // 同梱の可変フォントは既定wght=100。素材を変えず、Godot標準FontVariationで本文用400を選ぶ。
        font = new FontVariation { BaseFont = GD.Load<Font>("res://Assets/NotoSansJP.ttf"), VariationOpentype = new Godot.Collections.Dictionary { [TextServerManager.GetPrimaryInterface().NameToTag("wght")] = 400 } };
        BuildTheme();
        GetViewport().SizeChanged += CancelGesture;
        // 通常パスを解決するのはGodot側だけ。検査引数は専用領域との組合せが必須。
        SavePath = ProjectSettings.GlobalizePath("user://saves/local/m1.json");
        Automation = UiAutomation.FromArguments(this, OS.GetCmdlineUserArgs());
        if (Automation is not null) SavePath = Automation.SavePath;
        Diagnose();
    }

    private void Diagnose()
    {
        Begin(() => new(Diagnosis: FileGameSession.Diagnose(SavePath)), r =>
        {
            diagnosis = r.Diagnosis; Message = r.Error is null ? ViewData.Explain(diagnosis!.Primary.Code) : ViewData.Explain(r.Error);
            if (diagnosis?.Primary.Code == "ready") Message = "前回の続きから再開できます。";
            if (diagnosis?.Primary.Code == "missing" && diagnosis.Backup.Code == "ready") Message = "現在の保存がありません。直前の完全な保存から復旧できます。";
            if (diagnosis?.Primary.Code == "missing" && diagnosis.PendingFiles.Length > 0) Message = "新規作成の途中のファイルが残っています。内容を退避してから新しく始められます。";
        });
    }

    private void Begin(Func<UiResult> work, Action<UiResult> after)
    {
        if (Busy) return;
        CancelGesture(); completion = after;
        operation = Task.Run(() =>
        {
            try { return work(); }
            catch (Exception e)
            {
                var code = e is SaveException save ? save.Code : e is FileNotFoundException ? "missing" : "io_error";
                // 起動・保存の技術詳細は診断ログへ。状態失敗を空の所持として返さない。
                LogIssue(e.ToString());
                return new(Error: code);
            }
        });
        renderNeeded = true;
    }

    private void LogIssue(string message)
    {
        try { System.IO.File.AppendAllText(SavePath + ".diagnostic.log", DateTimeOffset.UtcNow + " " + message + System.Environment.NewLine); }
        catch (Exception) { /* 診断の失敗は本編保存の成否を変えない。画面の説明は残す。 */ }
    }

    private void Open(bool create = false, bool recovery = false)
    {
        Begin(() =>
        {
            var opened = recovery ? FileGameSession.RecoverBackup(SavePath) : create ? FileGameSession.CreateNew(SavePath, Automation?.CampaignId) : FileGameSession.Open(SavePath, Automation?.Faults);
            return new(Opened: opened, View: opened.Inspect());
        }, r =>
        {
            if (r.Error is not null) { Message = ViewData.Explain(r.Error); LastStatus = r.Error; return; }
            Session = r.Opened; Adopt(r.View!); Message = ""; Modal = "";
            Automation?.Opened();
        });
    }

    private void Adopt(JsonObject view)
    {
        View = view.Copy(); Plan = View.Obj("draft").Obj("plan").Copy();
        displayedTexts.Clear();
        Comparison = new(); selectedCard = ""; actionPreview = new(); detailKey = ""; Modal = ""; modalParent = "";
        // 対象だけは公開された活動中の相手なら次の手番へ保持する。札IDは毎回選び直す。
        if (!View.Obj("exploration").Obj("actors").Obj(selectedTarget).Flag("active")) selectedTarget = "";
        Screen = View.Text("phase") == "home" ? "home" : View.Text("phase");
        if (Screen == "home") RefreshComparison();
    }

    internal bool Can(string name) => !Busy && !Blocked && View.Obj("capabilities").Obj(name).Flag("available");

    /// <summary>UIが発行した要求は保存結果が確定するまで同じ内容で保持。retryで新IDを発行しない。</summary>
    private void Send(string type, JsonObject? payload = null)
    {
        if (Busy || Blocked || Session is null) return;
        LastCommand = new(Guid.NewGuid().ToString("N"), View.Number("revision"), View.Text("view_token"), type, payload?.Copy() ?? new());
        ExecuteLast();
    }

    private void ExecuteLast()
    {
        if (Busy || Session is null || LastCommand is null) return;
        var session = Session; var command = LastCommand;
        Begin(() =>
        {
            var result = session.Execute(command);
            if (result.Error is not null) LogIssue($"{result.Status} {result.Error}; operation={command.Type}; revision={command.ExpectedRevision}");
            return new(Command: result);
        }, r =>
        {
            if (r.Command is null)
            {
                // 境界の外で例外になった場合にも、根拠なく「未保存」と判定して操作を再開しない。
                View["stale"] = true; LastStatus = "indeterminate"; Message = ViewData.Explain("commit_outcome_unknown"); Modal = "failure"; return;
            }
            var result = r.Command; LastStatus = result.Status;
            if (result.Status is "committed" or "replayed")
            {
                var previousScreen = Screen; Adopt(result.View); Message = "";
                if (previousScreen == "preparation" && View.Text("phase") == "home") Screen = previousScreen;
                if (command.Type == "ack_return" && prepareAfterReturn)
                { prepareAfterReturn = false; Screen = "preparation"; }
                if (command.Type == "ack_return" && departAfterReturn)
                {
                    departAfterReturn = false;
                    Send("depart", new() { ["case_id"] = "SCN-001" });
                }
            }
            else
            {
                // 拒否は未確定案をそのまま残す。成否不明のViewだけはstale表示を採用する。
                if (result.Status is "indeterminate" or "blocked") View = result.View.Copy();
                Message = ViewData.Explain(result.Error ?? "io_error"); Modal = "failure";
            }
        });
    }

    private void Reload()
    {
        if (Session is null) { Diagnose(); return; }
        var session = Session;
        Begin(() => { session.Reload(); return new(View: session.Inspect()); }, r =>
        {
            if (r.Error is not null) { Message = ViewData.Explain(r.Error); return; }
            Adopt(r.View!); Message = "保存された状態を読み直しました。前の要求を照合できます。";
            Modal = LastCommand is not null ? "resend" : "";
        });
    }

    private void RefreshComparison()
    {
        if (Session is null || Busy || Blocked || View.Text("phase") != "home") return;
        Comparison = Session.PreviewPreparation(View.Number("revision"), View.Text("view_token"), Plan);
    }

    private void EditPlan(Action<JsonObject> edit)
    {
        if (!Can("commit_preparation")) return;
        edit(Plan); RefreshComparison(); LastCommand = null; Message = ""; renderNeeded = true;
    }

    private void AskClose()
    {
        CancelGesture();
        if (Busy) { closeRequested = true; Message = "保存の終了を待ってから閉じます。"; renderNeeded = true; return; }
        if (DraftDirty || Blocked) { Modal = "quit"; renderNeeded = true; return; }
        Close();
    }

    private void Close()
    {
        if (Busy) { closeRequested = true; return; }
        var session = Session;
        Begin(() => { session?.Dispose(); return new(); }, _ => { Session = null; GetTree().Quit(); });
    }

    public override void _Notification(int what)
    {
        if (what == NotificationWMCloseRequest) AskClose();
        if (what == NotificationWMWindowFocusOut) { CancelGesture(); QueueRedraw(); }
    }

    public override void _ExitTree()
    {
        // 正常終了はCloseが待機する。sceneが外部から外された時にも、workerの完了後に所有権を解放する。
        if (operation is { } pending) pending.ContinueWith(t => { if (t.Status == TaskStatus.RanToCompletion) t.Result.Opened?.Dispose(); Session?.Dispose(); });
        else Session?.Dispose();
    }

    public override void _Process(double delta)
    {
        if (operation?.IsCompleted == true)
        {
            var result = operation.GetAwaiter().GetResult(); operation = null;
            var after = completion; completion = null; after?.Invoke(result); renderNeeded = true;
            if (closeRequested) { closeRequested = false; AskClose(); }
        }
        gesture.Tick(GestureClock());
        if (gesture.Mode != GestureMode.Idle) AutoScroll();
        RecordVisibleParagraphs();
        if (renderNeeded) { renderNeeded = false; Render(); }
        UpdateDragGhost();
        canvas?.QueueRedraw();
        Automation?.Tick();
    }
}
