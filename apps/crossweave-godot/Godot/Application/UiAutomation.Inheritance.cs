using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>D04B-UI-02限定検査。通常sceneの実ノードへ入力し、保存・乱数が動かない表示操作を照合する。</summary>
internal sealed partial class UiAutomation
{
    private async Task KeyInput(Key key)
    {
        screen.GetViewport().PushInput(new InputEventKey{Keycode=key,Pressed=true},true);await Frame();
        screen.GetViewport().PushInput(new InputEventKey{Keycode=key,Pressed=false},true);await Idle();
    }
    private void CommonPosition(string scene)
    {
        Check(scene+"-common-menu",screen.Controls["menu"].GetGlobalRect()==new Rect2(1840,4,56,56));
        Check(scene+"-common-records",screen.Controls["knowledge"].GetGlobalRect()==new Rect2(1680,4,152,56));
    }
    private async Task Inheritance()
    {
        var save=screen.Session!.ExportDto().State.Copy();CommonPosition("home");await Capture("home");
        await Click("prepare");CommonPosition("preparation");await Capture("preparation");
        var owned=screen.View.Obj("home").Arr("owned").Rows().First(r=>r.Flag("selected"));
        var item="item-build-"+owned.Text("id");await Point(item);
        var start=screen.Controls[item].GetGlobalRect().Position+new Vector2(36,20);
        await Mouse(start,true);await screen.ToSignal(screen.GetTree().CreateTimer(.26),SceneTreeTimer.SignalName.Timeout);
        var end=new Vector2(832,426);await Move(start,end);await Frame(3);
        Check("compact-ghost-grab-offset",screen.Controls["drag-ghost"].GlobalPosition.DistanceTo(end-new Vector2(36,20))<1);
        Check("compact-ghost-same-face",screen.Controls["drag-ghost"].Size==new Vector2(352,80));await Capture("preparation-drag");
        await KeyInput(Key.Escape);await Mouse(end,false);await Idle();
        Check("escape-no-plan-or-save-change",!screen.Dirty&&JsonNode.DeepEquals(save,screen.Session.ExportDto().State));
        await Click("tab-passive");await Click("取得-basic:PS01");await Capture("pending-unpaid");
        var plan=screen.Plan.Copy();await Click("home");await Click("prepare");
        Check("back-and-return-preserve-tab-plan",screen.Controls.ContainsKey("item-reserve-pending:basic:PS01")&&JsonNode.DeepEquals(plan,screen.Plan));
        await Click("item-reserve-pending:basic:PS01");await Capture("passive-details");
        Check("passive-detail-conditions",screen.View.Obj("home").Arr("acquisition").Rows().First(r=>r.Text("id")=="basic:PS01").Obj("details").Text("trigger_text").Length>0);
        await Click("detail-unstage");await Click("tab-card");await Click("home");
        await Click("depart");CommonPosition("story");await Capture("story");await ReadAll("scene-reader");await Click("continue");
        CommonPosition("exploration");await Capture("exploration");save=screen.Session.ExportDto().State.Copy();
        var choice=screen.View.Obj("exploration").Arr("legal_actions").Rows().First(c=>screen.Session.PreviewAction(screen.View.Number("revision"),screen.View.Text("view_token"),c.Copy()).Text("mode")=="place");
        var cardId="card-hand-"+choice.Text("card_id");await Click(cardId);
        Check("hand-detail-edge-and-ratio",screen.Controls["detail-panel"].Size==new Vector2(520,480)&&screen.Controls["detail-panel"].Position.Y==488);
        await Capture("hand-detail");await Click(cardId);Check("same-card-closes",screen.Modal=="");
        var forecast=screen.Controls.Keys.Single(k=>k.StartsWith("card-forecast-"));await Click(forecast);
        Check("forecast-detail-readonly",screen.Modal=="detail"&&JsonNode.DeepEquals(save,screen.Session.ExportDto().State));await Capture("forecast-detail");
        await Click(forecast);Check("same-forecast-closes",screen.Modal=="");
        await Click("order-0");Check("order-opens-actor-detail",screen.Controls["detail-panel"].Size==new Vector2(416,384)&&screen.Controls["detail-panel"].Position.Y==16);await Capture("order-detail");
        await CloseDetail();await Click("preview");
        Check("prediction-uses-hand-origin-after-order",screen.Controls["detail-panel"].Position.Y==488);
        await Capture("prediction");await CloseDetail();
        var hover=await Point("preview");await Move(new(960,360),hover);await screen.ToSignal(screen.GetTree().CreateTimer(.24),SceneTreeTimer.SignalName.Timeout);await Frame(3);
        Check("hover-opens-transient-prediction",screen.Modal=="prediction"&&((Button)screen.Controls["window-pin"]).Text=="一時");
        await Click("window-pin");await Move(hover,new(960,360));await screen.ToSignal(screen.GetTree().CreateTimer(.22),SceneTreeTimer.SignalName.Timeout);await Frame(2);
        Check("pinned-prediction-survives-pointer-leave",screen.Modal=="prediction");await CloseDetail();
        await Point(cardId);start=screen.Controls[cardId].GlobalPosition+new Vector2(31,45);
        await Mouse(start,true);await screen.ToSignal(screen.GetTree().CreateTimer(.26),SceneTreeTimer.SignalName.Timeout);
        end=new Vector2(1000,570);await Move(start,end);await Frame(4);
        Check("hand-ghost-grab-offset",screen.Controls["drag-ghost"].GlobalPosition.DistanceTo(end-new Vector2(31,45))<1);
        Check("hand-ghost-same-face",screen.Controls["drag-ghost"].Size==new Vector2(248,208));await Capture("hand-drag");
        // 多重touchは保持中のmouseも取消す。以降の解放でplayへ落ちないことを確認する。
        foreach(int index in new[]{0,1})screen.GetViewport().PushInput(new InputEventScreenTouch{Index=index,Pressed=true,Position=end},true);
        await Frame(2);await Mouse(end,false);
        foreach(int index in new[]{0,1})screen.GetViewport().PushInput(new InputEventScreenTouch{Index=index,Pressed=false,Position=end},true);
        await Idle();Check("multiple-pointer-no-commit",JsonNode.DeepEquals(save,screen.Session.ExportDto().State));
        await Click("menu");await Capture("menu");await Click("settings");await Click("auto-details");await Capture("settings");await Click("modal-close");
        await Click(cardId);Check("auto-details-off",screen.Modal=="");await Click(forecast);Check("explicit-forecast-opens-with-auto-off",screen.Modal=="detail");await CloseDetail();
        var other=screen.Controls.Keys.First(k=>k.StartsWith("card-hand-")&&k!=cardId);await Click(other);Check("obsolete-forecast-detail-cleared",screen.Modal=="");
        await Click("deck");await Capture("deck");await Click("deck-card-0");await Click("modal-back");Check("deck-parent-restored",screen.Modal=="deck");await Click("modal-close");
        await Click("menu");await Click("action-history");await Capture("action-history");await Click("modal-close");
        await Click("knowledge");await Click("knowledge-group-0");Check("record-child-gap",screen.Controls["knowledge-child"].Position.X-screen.Controls["dialog-panel"].GetGlobalRect().End.X==16);await Capture("knowledge");
        await Click("knowledge-back");Check("record-parent-retained",screen.Modal=="knowledge"&&!screen.Controls.ContainsKey("knowledge-child"));await Click("modal-close");
        Check("all-display-inputs-preserve-dto",JsonNode.DeepEquals(save,screen.Session.ExportDto().State));
        start=await Point(cardId);await Mouse(start,true);await screen.ToSignal(screen.GetTree().CreateTimer(.26),SceneTreeTimer.SignalName.Timeout);
        await Mouse(start,true,MouseButton.WheelDown);await Mouse(new(960,540),false);await Idle();
        Check("wheel-cancels-held-card",JsonNode.DeepEquals(save,screen.Session.ExportDto().State));
        await Click("withdraw");await Click("withdraw-confirm");while(screen.Can("continue_scene")){await ReadAll("return-prose");await Click("continue");}
        CommonPosition("return");await Capture("return");await Click("ack");await Click("prepare");await Capture("return-preparation");
        Check("return-to-same-preparation",screen.Screen=="preparation"&&screen.View.Text("phase")=="home");
    }

    private async Task KnownCatalogue()
    {
        var knowledge=screen.View.Text("phase")=="exploring"?screen.View.Obj("exploration").Obj("knowledge"):screen.View.Obj("knowledge");
        var catalogue=knowledge.Arr("evidence").Rows().First(r=>r.Text("kind")=="initial_catalogue_grant");
        var group=knowledge.Arr("encounters").Rows().Select((r,i)=>(r,i)).First(x=>x.r.Text("profile")==catalogue.Text("profile"));
        var before=screen.Session!.ExportDto().State.Copy();
        await Click("knowledge");await Click("knowledge-group-"+group.i);await Capture("known-catalogue");
        Check("catalogue-has-public-card-entries",screen.Controls.ContainsKey("knowledge-card-0"));
        await Click("knowledge-card-0");await Capture("known-card");await Click("modal-back");
        Check("catalogue-parent-and-selection-retained",screen.Modal=="knowledge"&&screen.Controls.ContainsKey("knowledge-child"));
        await Click("modal-close");Check("catalogue-browsing-no-save-change",JsonNode.DeepEquals(before,screen.Session.ExportDto().State));
    }
}
