using Godot;

namespace Crossweave.Application;

/// <summary>
/// Main.tscnからGodotが生成する起動ノード。通常は本編、既存のproof引数だけは代表試作へ送る。
/// Nodeと_ReadyはGodot標準、この振分け規則は本作の設計である。
/// </summary>
public partial class AppEntry : Control
{
    public override void _Ready()
    {
        var args = OS.GetCmdlineUserArgs();
        bool proof = args.Any(a => a == "--proof" || a == "--env-smoke" || a.StartsWith("--proof-") || a.StartsWith("--probe-") || a.StartsWith("--expect-probe="));
        if (proof) AddChild(GD.Load<PackedScene>("res://Proof.tscn").Instantiate());
        else AddChild(new GameScreen { Name = "GameScreen" });
    }
}
