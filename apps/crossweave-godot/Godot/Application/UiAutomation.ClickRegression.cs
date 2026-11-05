using Godot;
using System.Text.Json.Nodes;
using Crossweave.Infrastructure.Application;

namespace Crossweave.Application;

/// <summary>
/// 押下と解放の間に描画フレームを挟む入力回帰。
/// 従来のClick（同一フレームの短クリック）とは別に、人の押下時間で
/// 全Control再生成・予測窓の遅延表示を通す。規則値と通常保存は変更しない。
/// </summary>
internal sealed partial class UiAutomation
{
    private async Task PauseInput(double seconds) => await screen.ToSignal(screen.GetTree().CreateTimer(seconds), SceneTreeTimer.SignalName.Timeout);
    private void HoverInput(Vector2 point) => screen.GetViewport().PushInput(new InputEventMouseMotion { Position=point,GlobalPosition=point },true);
    private async Task KeyInput(Key key, bool down)
    { screen.GetViewport().PushInput(new InputEventKey { Keycode=key,PhysicalKeycode=key,Pressed=down },true);await Frame(2); }
    private async Task ClickRegression()
    {
        var choice=reviewFixture!.Obj("choice").Copy();
        Check("fixed-attack-choice",choice.Text("target")!=""&&screen.View.Obj("exploration").Arr("legal_actions").Rows().Any(r=>JsonNode.DeepEquals(r,choice)));
        await Click("card-hand-"+choice.Text("card_id"));
        await Click("actor-"+choice.Text("target"));
        await CloseDetail();
        var before=screen.Session!.ExportDto();
        string scenario=mode["review-click-".Length..];
        if(scenario.StartsWith("prediction")||scenario is "escape" or "right" or "focus" or "outside" or "reenter" or "navigation" or "preview")await Click("preview");
        if(scenario=="detail")await Click("actor-"+choice.Text("target"));
        var id=scenario=="navigation"?"menu":scenario=="preview"?"preview":"play";
        var point=await Point(id);HoverInput(point);
        if(scenario=="hover")await PauseInput(.25);
        var button=screen.Controls[id];int presses=receivedPresses.GetValueOrDefault(id);
        if(scenario=="keyboard")
        { button.GrabFocus();HoverInput(new(1900,1000));await KeyInput(Key.Enter,true);await PauseInput(.1);await KeyInput(Key.Enter,false); }
        else
        {
            await Mouse(point,true);
            await PauseInput(scenario.Contains("long")?.35:.1);
            if(scenario=="escape")await KeyInput(Key.Escape,true);
            if(scenario=="right")await Mouse(point,true,MouseButton.Right);
            if(scenario=="focus")screen.Notification((int)Node.NotificationWMWindowFocusOut);
            if(scenario is "outside" or "reenter")
            {HoverInput(new(1900,1000));await Frame(3);if(scenario=="reenter"){HoverInput(point);await Frame(3);}}
            await Mouse(scenario=="outside"?new(1900,1000):point,false);
            if(scenario=="double") { await Mouse(point,true); await Mouse(point,false); }
            if(scenario=="escape")await KeyInput(Key.Escape,false);
            if(scenario=="right")await Mouse(point,false,MouseButton.Right);
        }
        await Idle();await Frame(3);
        bool cancel=scenario is "escape" or "right" or "focus" or "outside";
        if(cancel)
        {
            Check("cancel-no-action",receivedPresses.GetValueOrDefault("play")==presses&&JsonNode.DeepEquals(before.State,screen.Session!.ExportDto().State));
            Check("cancel-file-unchanged",JsonNode.DeepEquals(before.State,SaveFileCodec.Read(SavePath).Dto.State));
            // 取消で一時無効化した古いButtonを残さず、次の操作が通常に通ること。
            point=await Point("play");await Mouse(point,true);await PauseInput(.1);await Mouse(point,false);await Idle();
            Check("cancel-allows-next-press",receivedPresses.GetValueOrDefault("play")==presses+1);
            VerifyCommand(before,"play",new(){["choice"]=choice.Copy()});
        }
        else if(scenario is "navigation" or "preview")
        {
            Check("adjacent-button-single-press",receivedPresses.GetValueOrDefault(id)==presses+1,new{scenario,presses,actual=receivedPresses.GetValueOrDefault(id),screen.Modal});
            Check("adjacent-button-no-command",JsonNode.DeepEquals(before.State,screen.Session!.ExportDto().State));
            Check("adjacent-button-result",scenario=="navigation"?screen.Modal=="menu":screen.Modal=="");
        }
        else
        {
            Check("attack-single-press",(scenario=="double"?receivedPresses.GetValueOrDefault("play")>=presses+1:receivedPresses.GetValueOrDefault("play")==presses+1),new{scenario,presses,actual=receivedPresses.GetValueOrDefault("play"),screen.Modal,screen.LastStatus});
            VerifyCommand(before,"play",new(){["choice"]=choice.Copy()});
            Check("attack-revision-progressed",screen.View.Number("revision")==before.State.Number("revision")+1);
        }
        await Capture("after-input");
    }
}
