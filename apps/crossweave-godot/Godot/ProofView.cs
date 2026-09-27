using Godot;
using Crossweave.Core;
using Crossweave.Infrastructure;
using System.Diagnostics;
using System.Text.Json;
namespace Crossweave.Proof;

/// <summary>Custom 1920x1080 view. Core owns committed state; gestures own the pointer;
/// this view alone derives layout and animation positions. No competing Container/Tween writes.</summary>
public partial class ProofView : Control
{
    private ProofSession _session = new();
    private readonly PointerGesture _gesture = new();
    private Font _font = null!;
    private Panel _detailPanel = null!;
    private Label _status = null!, _detailText = null!, _summary = null!, _storageLabel = null!;
    private bool _ready, _storageFault;
    private string? _selected, _detail;
    private ProofStore _store = null!;
    private ProbeDocument _probe = new(1, 0, "日本語・疎通");
    private string _slot = "manual";
    private float _handOffset, _swipeStart;
    private readonly List<FlyingCard> _animations = [];
    private readonly List<double> _frameMs = [];
    private double _firstSceneMs, _readyMs, _firstRenderMs = -1;
    private double _maxWorkingSet;
    private readonly List<double> _inputDispatchMs = [];
    private int _operations;
    private readonly string _processInstance = Guid.NewGuid().ToString("N");
    private AudioStreamPlayer _audio = null!;
    private bool _headless;
    private string[] _args = [];
    private const string ProbeRoot = "user://proofs/rd-proof-02/";
    private static readonly Rect2 PlayArea = new(500, 335, 945, 320);
    private static readonly Rect2 Target = new(1090, 175, 330, 125);
    private static readonly Rect2 ResetButton = new(1570, 38, 300, 62);
    private static readonly Rect2 PlayButton = new(780, 966, 310, 60);
    private static readonly Rect2 SaveButton = new(1510, 896, 165, 56);
    private static readonly Rect2 LoadButton = new(1690, 896, 165, 56);
    private static readonly Rect2 IncrementButton = new(1510, 820, 165, 56);
    private static readonly Rect2 SoundButton = new(1690, 820, 165, 56);
    private Rect2 DetailRect => new(_detail is not null && RectFor(_detail).GetCenter().X < 960 ? 1470 : 28, 365, 422, 320);
    private double Now => Time.GetTicksMsec();
    private static double SinceStart => (DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalMilliseconds;
    private sealed record FlyingCard(ProofCard Card, Vector2 Start, double Started);

    public override async void _Ready()
    {
        try
        {
            _args = OS.GetCmdlineUserArgs(); _headless = DisplayServer.GetName() == "headless";
            MouseFilter = MouseFilterEnum.Ignore;
            GetTree().AutoAcceptQuit = false;
            if (_args.FirstOrDefault(a => a.StartsWith("--probe-slot=")) is { } slot)
            {
                _slot = slot.Split('=', 2)[1];
                if (!System.Text.RegularExpressions.Regex.IsMatch(_slot, "^[a-zA-Z0-9_-]{1,80}$")) throw new ArgumentException("Invalid probe slot");
            }
            QueueRedraw(); await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
            _firstSceneMs = SinceStart;
            if (!_headless) RecordFirstRender();
            // Give the loading screen a frame before reading resources.
            await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
            _font = GD.Load<Font>("res://Assets/NotoSansJP.ttf");
            if (_font is null) throw new InvalidDataException("Bundled Japanese font missing");
            BuildLabels(); BuildDiagnosticSound();
            _store = new ProofStore(ProjectSettings.GlobalizePath(ProbeRoot + _slot + "/probe.json"));
            LoadProbe();
            _ready = true; _readyMs = SinceStart; Refresh();
            GD.Print("PROOF_READY " + BuildMarker.Id + " " + _store.Path);
            if (_args.Contains("--env-smoke")) { WriteReport("env", new { status = "passed" }); GetTree().Quit(); }
            else if (_args.Any(a => a.StartsWith("--probe-write=") || a.StartsWith("--expect-probe=")) || _args.Contains("--probe-fail-write")) RunStorageCommand();
            else if (_args.Contains("--proof-smoke")) await RunEngineProbe();
        }
        catch (Exception exception) { GD.PushError(exception.ToString()); GetTree().Quit(1); }
    }
    private async void RecordFirstRender()
    {
        await ToSignal(RenderingServer.Singleton, RenderingServer.SignalName.FramePostDraw);
        _firstRenderMs = SinceStart;
    }
    private Label Text(string text, Rect2 rect, int size = 28)
    {
        var label = new Label { Text = text, Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore,
            AutowrapMode = TextServer.AutowrapMode.WordSmart };
        label.AddThemeFontOverride("font", _font); label.AddThemeFontSizeOverride("font_size", size);
        label.AddThemeColorOverride("font_color", new Color("e4ece9")); AddChild(label); return label;
    }
    private void BuildLabels()
    {
        Text("crossweave  /  基盤・操作の代表試作", new(48, 32, 1400, 70), 36);
        Text("夜潮の排水路  ·  画面接続の検査用 / 本編ではありません", new(48, 115, 1400, 48), 25);
        Text("操作\n札をクリック：詳細\n220ms保持してドラッグ：出札\n保持前の横移動：横送り\nEsc／右クリック：取消・窓閉じ\nF11：全画面、F12：画面保存", new(48, 184, 410, 260), 27);
        Text("検査する境界\n属性一致・共通回収のみ。\nダメージ・期限・経済・一巡は未実装。\n演出中も別の札を操作できます。", new(48, 720, 400, 220), 25);
        Text("対象：環境（表示用）", new(Target.Position + new Vector2(18, 24), Target.Size - new Vector2(30, 30)), 27);
        Text("場 / ドラッグの出札領域", new(525, 346, 850, 50), 26);
        Text("共通回収山", new(1520, 410, 320, 45), 27);
        _summary = Text("", new(1520, 465, 320, 140), 25);
        _status = Text("", new(48, 1035, 1800, 43), 22);
        _storageLabel = Text("", new(1510, 684, 350, 125), 23);
        _detailPanel = new Panel { MouseFilter = MouseFilterEnum.Ignore, ZIndex = 100, Visible = false };
        _detailPanel.AddThemeStyleboxOverride("panel", new StyleBoxFlat { BgColor = new Color(.07f, .13f, .18f, .96f), BorderColor = new Color("8cadab"), BorderWidthLeft = 2, BorderWidthTop = 2, BorderWidthRight = 2, BorderWidthBottom = 2 });
        AddChild(_detailPanel);
        _detailText = Text("", new(0, 0, 380, 280), 24); _detailText.Visible = false; _detailText.ZIndex = 101;
    }
    private void BuildDiagnosticSound()
    {
        // A short synthesized diagnostic signal, not a game audio asset.
        const int rate = 22050; var data = new byte[rate / 10 * 2];
        for (var i = 0; i < data.Length / 2; i++)
        {
            var amplitude = (short)(Math.Sin(2 * Math.PI * 440 * i / rate) * 1200 * (1.0 - (double)i / (data.Length / 2)));
            data[2 * i] = (byte)(amplitude & 255); data[2 * i + 1] = (byte)(amplitude >> 8);
        }
        _audio = new AudioStreamPlayer { Stream = new AudioStreamWav { Format = AudioStreamWav.FormatEnum.Format16Bits, MixRate = rate, Data = data } };
        AddChild(_audio);
    }
    private Rect2 RectFor(string id)
    {
        if (id.StartsWith('h') && _session.Snapshot().Field.Any(c => c.Id == id)) return new(690, 430, 300, 175);
        if (id.StartsWith('h')) return new(480 + (int.Parse(id[1..]) - 1) * 330 + _handOffset, 752, 300, 185);
        if (id == "f1") return new(600, 425, 300, 175);
        if (id == "f2") return new(990, 425, 300, 175);
        return Target;
    }
    private ProofCard? HandAt(Vector2 point) => _session.Snapshot().Hand.FirstOrDefault(card => RectFor(card.Id).HasPoint(point));
    private ProofCard? AnyCard(string id) => _session.Snapshot().Hand.Concat(_session.Snapshot().Field).Concat(_session.Snapshot().Recovery).FirstOrDefault(c => c.Id == id);
    private void Refresh(string? message = null)
    {
        var state = _session.Snapshot();
        _summary.Text = $"確定 {state.Revision} 回\n回収 {state.Recovery.Count} 枚\n演出 {_animations.Count} 件";
        _storageLabel.Text = $"専用保存カウンター：{_probe.Counter}\n本編状態とは別 / {_slot}";
        if (message is not null) _status.Text = message;
        _detailText.Visible = _detail is not null;
        _detailPanel.Visible = _detail is not null; _detailPanel.Position = DetailRect.Position; _detailPanel.Size = DetailRect.Size;
        if (_detail is not null && AnyCard(_detail) is { } card)
        {
            _detailText.Position = DetailRect.Position + new Vector2(22, 20); _detailText.Size = DetailRect.Size - new Vector2(44, 40);
            _detailText.Text = $"{card.Name}  ·  属性 {card.Attribute}\n\n同じ属性の場札があれば一致し、使用札と場札を共通回収山へ移します。\n\n同じ札の再クリック／外クリックで閉じます。検査用の抜粋です。";
        }
        QueueRedraw();
    }
    public override void _Process(double delta)
    {
        if (!_ready) return;
        _gesture.Tick(Now);
        if (_frameMs.Count < 6000) _frameMs.Add(delta * 1000);
        if (Engine.GetProcessFrames() % 30 == 0) _maxWorkingSet = Math.Max(_maxWorkingSet, Process.GetCurrentProcess().WorkingSet64);
        _animations.RemoveAll(a => Now - a.Started >= 900);
        Refresh();
    }
    public override void _Draw()
    {
        DrawRect(new(0, 0, 1920, 1080), new Color("111b22"));
        if (!_ready)
        {
            DrawString(ThemeDB.FallbackFont, new(70, 110), "Loading Crossweave / .NET and resources...", fontSize: 36, modulate: Colors.White);
            return;
        }
        DrawRect(new(0, 1027, 1920, 53), new Color("1a2c35"));
        DrawRect(PlayArea, new Color("1a3038")); DrawRect(PlayArea, new Color("54737d"), false, 2);
        DrawRect(Target, new Color("24404a")); DrawRect(new(1505, 460, 350, 162), new Color("253841"));
        Button(ResetButton, "試作をリセット"); Button(PlayButton, "出す");
        Button(IncrementButton, "＋1"); Button(SoundButton, "音を確認"); Button(SaveButton, "保存"); Button(LoadButton, "読込");
        foreach (var card in _session.Snapshot().Field) Card(card, RectFor(card.Id));
        foreach (var card in _session.Snapshot().Hand)
        {
            var rect = RectFor(card.Id);
            if (_gesture.Mode == GestureMode.Dragging && _gesture.CardId == card.Id)
                rect.Position = new((float)_gesture.X - rect.Size.X / 2, (float)_gesture.Y - rect.Size.Y / 2);
            Card(card, rect, _selected == card.Id);
        }
        if (_selected is not null && _session.Snapshot().Hand.Any(c => c.Id == _selected))
        {
            var start = RectFor(_selected).GetCenter();
            if (_session.MatchFor(_selected) is { } match) { Arrow(start, RectFor(match.Id).GetCenter()); Arrow(RectFor(match.Id).GetCenter(), Target.GetCenter()); }
            else Arrow(start, PlayArea.GetCenter());
        }
        foreach (var animation in _animations)
        {
            var t = Mathf.Clamp((float)(Now - animation.Started) / 900, 0, 1);
            Card(animation.Card, new(animation.Start.Lerp(new Vector2(1540, 455), t), new Vector2(230, 140)), false, 1 - t * .7f);
        }
        if (_detail is not null) { DrawRect(DetailRect, new Color(.07f, .13f, .18f, .94f)); DrawRect(DetailRect, new Color("8cadab"), false, 2); }
    }
    private void Button(Rect2 rect, string text)
    {
        DrawRect(rect, new Color("2b4953")); DrawRect(rect, new Color("71928e"), false, 1);
        DrawString(_font, rect.Position + new Vector2(18, 38), text, fontSize: 25, modulate: Colors.White);
    }
    private void Card(ProofCard card, Rect2 rect, bool selected = false, float alpha = 1)
    {
        DrawRect(rect, new Color(.16f, .25f, .30f, alpha));
        DrawRect(rect, selected ? new Color("e4c17b") : new Color("68808c"), false, selected ? 3 : 1);
        DrawString(_font, rect.Position + new Vector2(20, 49), card.Name, fontSize: 31, modulate: new Color(1, 1, 1, alpha));
        DrawString(_font, rect.Position + new Vector2(20, 100), "属性 " + card.Attribute, fontSize: 26, modulate: new Color(.75f, .85f, .82f, alpha));
    }
    private void Arrow(Vector2 start, Vector2 end)
    {
        var color = new Color(.80f, .75f, .44f, .7f); var direction = (end - start).Normalized(); end -= direction * 50;
        DrawLine(start, end, color, 5, true);
        DrawLine(end, end - direction.Rotated(.5f) * 25, color, 5, true);
        DrawLine(end, end - direction.Rotated(-.5f) * 25, color, 5, true);
    }
    public override void _Input(InputEvent input)
    {
        if (!_ready) return;
        var watch = Stopwatch.StartNew();
        if (input is InputEventKey { Pressed: true, Echo: false } key)
        {
            if (key.Keycode == Key.Escape) CancelPointer();
            if (key.Keycode == Key.F11) DisplayServer.WindowSetMode(DisplayServer.WindowGetMode() == DisplayServer.WindowMode.Fullscreen ? DisplayServer.WindowMode.Windowed : DisplayServer.WindowMode.Fullscreen);
            if (key.Keycode == Key.F12 && !_headless) CaptureScreen();
        }
        else if (input is InputEventMouseButton mouse)
        {
            var point = GetGlobalTransformWithCanvas().AffineInverse() * mouse.Position;
            if (mouse.ButtonIndex == MouseButton.Right && mouse.Pressed) CancelPointer();
            if (mouse.ButtonIndex == MouseButton.Left)
            {
                if (mouse.Pressed) Press(point); else Release(point);
            }
        }
        else if (input is InputEventMouseMotion move && _gesture.Mode != GestureMode.Idle)
        {
            var point = GetGlobalTransformWithCanvas().AffineInverse() * move.Position;
            _gesture.Move(point.X, point.Y, Now);
            if (_gesture.Mode == GestureMode.Swiping) _handOffset = Mathf.Clamp(_swipeStart + (float)(_gesture.X - _gesture.StartX), -24, 60);
            if (_gesture.Mode == GestureMode.Dragging) _detail = null;
            Refresh();
        }
        _inputDispatchMs.Add(watch.Elapsed.TotalMilliseconds);
    }
    private void Press(Vector2 point)
    {
        if (ResetButton.HasPoint(point)) { _session = new(); _animations.Clear(); _selected = _detail = null; _handOffset = 0; CancelPointer(); Refresh("試作の盤面だけを初期化しました。専用保存は変更していません。"); return; }
        if (SaveButton.HasPoint(point)) { SaveProbe(); return; }
        if (LoadButton.HasPoint(point)) { LoadProbe(); Refresh(); return; }
        if (IncrementButton.HasPoint(point)) { _probe = _probe with { Counter = _probe.Counter + 1 }; Refresh("専用カウンターを変更。まだ保存していません。"); return; }
        if (SoundButton.HasPoint(point)) { _audio.Play(); Refresh("短い検査音を再生しました。聞こえたかは実機で確認してください。"); return; }
        if (PlayButton.HasPoint(point) && _selected is not null) { Commit(_selected); return; }
        if (HandAt(point) is { } card) { _gesture.Begin(card.Id, point.X, point.Y, Now); _swipeStart = _handOffset; _selected = card.Id; Refresh(); return; }
        var field = _session.Snapshot().Field.FirstOrDefault(c => RectFor(c.Id).HasPoint(point));
        if (field is not null) { ToggleDetail(field.Id); return; }
        if (_detail is not null && !DetailRect.HasPoint(point)) { _detail = null; Refresh("詳細窓を閉じました。"); }
    }
    private void Release(Vector2 point)
    {
        var card = _gesture.CardId;
        _gesture.Move(point.X, point.Y, Now);
        var end = _gesture.End(PlayArea.HasPoint(point), Now);
        if (card is null) return;
        if (end == GestureEnd.Tap) ToggleDetail(card);
        else if (end == GestureEnd.Drop) Commit(card);
        else Refresh(end == GestureEnd.Swipe ? "横送り。Coreの確定状態は変わりません。" : "出札を取り消しました。");
    }
    private void ToggleDetail(string id) { _detail = _detail == id ? null : id; Refresh(); }
    private void CancelPointer() { _gesture.Cancel(); _detail = null; Refresh("入力を取り消しました。確定済みの結果は巻き戻しません。"); }
    private void Commit(string cardId)
    {
        var card = _session.Snapshot().Hand.FirstOrDefault(c => c.Id == cardId);
        if (card is null) return;
        var result = _session.Apply(new("ui-" + ++_operations, _session.Revision, cardId));
        _gesture.Cancel(); _detail = null;
        if (result.Applied)
        {
            if (result.Matched) _animations.Add(new(card, RectFor(cardId).Position, Now));
            _selected = null;
        }
        Refresh(result.Applied ? result.Matched ? "一致 → 共通回収。演出中も次の札を操作できます。" : "一致なし → 場へ設置。主効果は未成立。" : result.Reason);
    }
    private void LoadProbe()
    {
        try { _probe = _store.Load() ?? new(1, 0, "日本語・疎通"); _storageFault = false; _status.Text = "専用小状態を読み込みました。盤面は毎起動メモリーで初期化します。"; }
        catch (Exception exception) { _storageFault = true; _status.Text = "保存を読めません。元ファイルを保全：" + exception.Message; }
    }
    private bool SaveProbe()
    {
        try
        {
            if (_storageFault) throw new InvalidOperationException("読込エラーを解消するまで上書きしません");
            _store.Save(_probe); Refresh("専用小状態の保存成功：" + _store.Path); return true;
        }
        catch (Exception exception) { Refresh("保存失敗（別の場所へ保存していません）：" + exception.Message); return false; }
    }
    public override void _Notification(int what)
    {
        if (what == NotificationWMWindowFocusOut && _ready) CancelPointer();
        if (what == NotificationWMCloseRequest && _ready) { WriteMetrics(); GetTree().Quit(); }
    }
    private async void CaptureScreen()
    {
        await ToSignal(RenderingServer.Singleton, RenderingServer.SignalName.FramePostDraw);
        var path = ProjectSettings.GlobalizePath(ProbeRoot + _slot + "/screen.png"); Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        var result = GetViewport().GetTexture().GetImage().SavePng(path); Refresh("画面保存：" + result + " " + path);
    }
    private void WriteMetrics() => WriteReport("metrics", new {
        headless = _headless, process_id = System.Environment.ProcessId, os = OS.GetName(), os_version = OS.GetVersion(), cpu = OS.GetProcessorName(), cpu_count = OS.GetProcessorCount(), adapter = RenderingServer.GetVideoAdapterName(), reported_screen_dpi = _headless ? 0 : DisplayServer.ScreenGetDpi(), first_scene_callback_ms = _firstSceneMs,
        first_render_callback_ms = _firstRenderMs < 0 ? (double?)null : _firstRenderMs, ready_ms = _readyMs,
        frames = _frameMs.Count, frame_ms_mean = _frameMs.Count == 0 ? 0 : _frameMs.Average(),
        frame_ms_p95 = Percentile(_frameMs, .95), self_working_set_peak_bytes = _maxWorkingSet,
        input_handler_ms_p95 = Percentile(_inputDispatchMs, .95),
        limitation = "Callbacks are not physical display/input latency; headless values are not FHD/GPU performance. Self process only."
    });
    private static double Percentile(List<double> values, double percentile) => values.Count == 0 ? 0 : values.Order().ElementAt(Math.Min(values.Count - 1, (int)(values.Count * percentile)));
    private void WriteReport(string name, object data)
    {
        var path = ProjectSettings.GlobalizePath(ProbeRoot + _slot + "/" + name + ".json");
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true }));
        GD.Print("REPORT " + path);
    }
}
