using Godot;
using Crossweave.Core;
using Crossweave.Infrastructure;
namespace Crossweave.Proof;

public partial class ProofView
{
    private void RunStorageCommand()
    {
        if (_slot == "manual") throw new InvalidOperationException("Automated storage probes require a dedicated --probe-slot");
        if (_args.FirstOrDefault(a => a.StartsWith("--probe-write=")) is { } write)
        {
            _probe = new(1, int.Parse(write.Split('=', 2)[1]), "日本語・疎通");
            if (!SaveProbe()) throw new IOException("Probe save failed");
            WriteReport("write", new { status = "passed", process_id = System.Environment.ProcessId, process_instance = _processInstance, state = _probe, path = _store.Path });
        }
        else if (_args.FirstOrDefault(a => a.StartsWith("--expect-probe=")) is { } read)
        {
            var expected = new ProbeDocument(1, int.Parse(read.Split('=', 2)[1]), "日本語・疎通");
            var actual = _store.Load();
            if (actual != expected) throw new InvalidDataException("Restart state mismatch");
            WriteReport("read", new { status = "passed", process_id = System.Environment.ProcessId, process_instance = _processInstance, state = actual, path = _store.Path });
        }
        else
        {
            var blocker = System.IO.Path.Combine(System.IO.Path.GetDirectoryName(_store.Path)!, "blocked-parent");
            Directory.CreateDirectory(System.IO.Path.GetDirectoryName(blocker)!); File.WriteAllText(blocker, "not a directory");
            var oldPath = _store.Path; _store = new ProofStore(System.IO.Path.Combine(blocker, "probe.json"));
            var success = SaveProbe();
            if (success || !_status.Text.StartsWith("保存失敗")) throw new InvalidDataException("Write failure was not displayed");
            WriteReport("write-failure", new { status = "passed", success_displayed = false, fallback_written = false, original_path = oldPath, reason = "A file occupies the parent directory; real filesystem failure" });
        }
        WriteMetrics(); GetTree().Quit();
    }
    private async Task Frame() => await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
    private async Task Mouse(Vector2 point, bool pressed, MouseButton button = MouseButton.Left)
    {
        GetViewport().PushInput(new InputEventMouseButton { Position = point, GlobalPosition = point, ButtonIndex = button, Pressed = pressed }, true); await Frame();
    }
    private async Task Click(Vector2 point) { await Mouse(point, true); await Mouse(point, false); }
    private async Task MovePointer(Vector2 point)
    {
        GetViewport().PushInput(new InputEventMouseMotion { Position = point, GlobalPosition = point, ButtonMask = MouseButtonMask.Left }, true); await Frame();
    }
    private async Task Hold() => await ToSignal(GetTree().CreateTimer(.25), SceneTreeTimer.SignalName.Timeout);
    private async Task RunEngineProbe()
    {
        var checks = new List<string>();
        void Check(string id, bool success) { if (!success) throw new InvalidDataException("Engine probe failed: " + id); checks.Add(id); }
        try
        {
            Check("japanese-font-glyphs", "夜潮の排水路牽制探査身構攪乱共通回収保存".All(c => _font.HasChar(c)));
            Check("root-1920x1080", GetViewportRect().Size == new Vector2(1920, 1080));
            Check("separate-core-loaded", _session.GetType().Assembly != GetType().Assembly);
            Check("diagnostic-audio-resource", _audio.Stream is AudioStreamWav { Data.Length: > 0 });
            await Click(RectFor("h1").GetCenter());
            Check("tap-opens-details", _detail == "h1" && _session.Revision == 0);
            Check("left-source-window-right", DetailRect.Position.X == 1470);
            await Frame(); Check("japanese-wrapping-node", _detailText.GetLineCount() > 3);
            Check("matching-prediction-source", _selected == "h1" && _session.MatchFor(_selected)?.Id == "f1");
            await Click(RectFor("h1").GetCenter()); Check("same-source-closes", _detail is null);
            await Click(RectFor("h3").GetCenter()); Check("right-source-window-left", _detail == "h3" && DetailRect.Position.X == 28);
            await Click(new Vector2(900, 680)); Check("outside-closes-without-commit", _detail is null && _session.Revision == 0);
            var start = RectFor("h1").GetCenter(); await Mouse(start, true); await MovePointer(start + new Vector2(80, 0)); await Mouse(start + new Vector2(80, 0), false);
            Check("early-motion-swipes-without-commit", _handOffset > 0 && _session.Revision == 0 && _gesture.Mode == GestureMode.Idle);
            start = RectFor("h1").GetCenter(); await Mouse(start, true); await Hold(); await MovePointer(PlayArea.GetCenter());
            Check("held-pointer-is-dragging", _gesture.Mode == GestureMode.Dragging);
            await Mouse(PlayArea.GetCenter(), false);
            Check("drop-commits-core-once", _session.Revision == 1 && _session.Snapshot().Recovery.Count == 2 && _gesture.Mode == GestureMode.Idle);
            Check("commit-has-animation", _animations.Count == 1);
            await Click(RectFor("h2").GetCenter()); await Click(PlayButton.GetCenter());
            Check("reinput-during-animation", _session.Revision == 2 && _animations.Count == 2 && _session.Snapshot().Recovery.Count == 4);
            await Click(PlayButton.GetCenter()); Check("repeat-execute-no-double-commit", _session.Revision == 2);
            await Mouse(RectFor("h3").GetCenter(), true); await Hold(); await Mouse(new Vector2(900, 700), true, MouseButton.Right); await Mouse(PlayArea.GetCenter(), false);
            Check("cancel-drag-keeps-state", _session.Revision == 2 && _gesture.Mode == GestureMode.Idle);
            await Mouse(RectFor("h3").GetCenter(), true); Notification((int)NotificationWMWindowFocusOut); await Mouse(PlayArea.GetCenter(), false);
            Check("focus-loss-releases-pointer", _session.Revision == 2 && _gesture.Mode == GestureMode.Idle);
            for (var i = 0; i < 5; i++) { Refresh(); await Frame(); }
            Check("view-refresh-does-not-commit", _session.Revision == 2);
            WriteReport("engine-probe", new { status = "passed", checks, execution = _headless ? "Godot headless, viewport-local synthetic InputEvent" : "Godot rendered, viewport-local synthetic InputEvent", physical_input = false, human_visual_check = false, process_id = System.Environment.ProcessId });
            WriteMetrics(); GetTree().Quit();
        }
        catch (Exception exception)
        {
            WriteReport("engine-probe", new { status = "failed", passed_checks = checks, error = exception.ToString() });
            GD.PushError(exception.ToString()); GetTree().Quit(1);
        }
    }
}
