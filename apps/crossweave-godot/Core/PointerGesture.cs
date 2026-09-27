namespace Crossweave.Core;

public enum GestureMode { Idle, Pending, Swiping, Dragging }
public enum GestureEnd { None, Tap, Swipe, Drop, Cancel }

/// <summary>One pointer owner; monotonic milliseconds supplied by the host.</summary>
public sealed class PointerGesture
{
    public const double HoldMilliseconds = 220;
    public const double SwipeThreshold = 12;
    public GestureMode Mode { get; private set; }
    public string? CardId { get; private set; }
    public double StartX { get; private set; }
    public double StartY { get; private set; }
    public double X { get; private set; }
    public double Y { get; private set; }
    private double _started;
    public void Begin(string cardId, double x, double y, double now)
    {
        Cancel(); CardId = cardId; StartX = X = x; StartY = Y = y; _started = now; Mode = GestureMode.Pending;
    }
    public void Move(double x, double y, double now)
    {
        X = x; Y = y;
        if (Mode == GestureMode.Pending && now - _started < HoldMilliseconds && Math.Abs(x - StartX) >= SwipeThreshold)
            Mode = GestureMode.Swiping;
        Tick(now);
    }
    public void Tick(double now)
    {
        if (Mode == GestureMode.Pending && now - _started >= HoldMilliseconds) Mode = GestureMode.Dragging;
    }
    public GestureEnd End(bool overPlayArea, double now)
    {
        Tick(now);
        var result = Mode switch { GestureMode.Pending => GestureEnd.Tap, GestureMode.Swiping => GestureEnd.Swipe,
            GestureMode.Dragging => overPlayArea ? GestureEnd.Drop : GestureEnd.Cancel, _ => GestureEnd.None };
        Cancel(); return result;
    }
    public void Cancel() { Mode = GestureMode.Idle; CardId = null; }
}
