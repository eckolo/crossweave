using Godot;

namespace Crossweave.Application;

public partial class GameScreen
{
    // GodotのButtonは通常、押下時ではなく解放時にPressedを発火する。
    // その間にRenderで全Controlを取り替えると、押下を覚えたButtonが
    // 消えて操作を失う。ゲーム状態ではなく、UIノードの寿命だけを保持する。
    private BaseButton? heldButton;
    private bool HoldingButton => IsInstanceValid(heldButton);

    private void RetainButtonThroughRelease(BaseButton button)
    {
        button.ButtonDown += () => heldButton = button;
        button.ButtonUp += () => { if (heldButton == button) heldButton = null; };
    }

    // Esc／右クリック／フォーカス喪失は「押したまま」の操作も取り消す。
    // DisabledはGodotに残る押下を解除する。元の有効状態は次のRenderで
    // 公開viewから復元し、解放を受けてから遅れて実行されることを防ぐ。
    private void CancelButtonHold()
    {
        if (!IsInstanceValid(heldButton)) { heldButton = null; return; }
        var button = heldButton;
        heldButton = null;
        button!.Disabled = true;
        renderNeeded = true;
    }
}
