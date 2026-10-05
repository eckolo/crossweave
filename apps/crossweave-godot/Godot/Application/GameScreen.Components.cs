using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// UI原本の共通操作と表示部品。Control／GradientTexture2DはGodot標準、
/// 1920座標・端配置・公開記録の親子窓は本作のUI契約。ここから保存DTOを読まない。
/// </summary>
public partial class GameScreen
{
    private void CommonNavigation()
    {
        var records=IconButton(content,"knowledge","BookOpen","調査記録",new(InnerWidth-240,4,152,56),()=>OpenModal("knowledge"));
        var menu=IconButton(content,"menu","Menu","",new(InnerWidth-80,4,56,56),()=>OpenModal("menu"));
        foreach(var b in new[]{records,menu}){ButtonStyle(b,"f2f5e9","a8b9a5","294133");b.AddThemeFontSizeOverride("font_size",18);b.TooltipText="";}
    }

    private void OpenModal(string name, string parent = "")
    {
        CancelGesture(); windowPinned=!(Exploring&&(name is "objective" or "status" or "order" or "deck" or "action-history"||name=="settings"&&operationSettings));modalParent=parent;
        if(Controls.TryGetValue("dialog-panel",out var old)&&parent!="")sourceWindow=new(old.Position,old.Size);
        if(Controls.TryGetValue(name,out var trigger))modalAnchor=new(trigger.GlobalPosition-new Vector2(1,1),trigger.Size);
        Modal=name;
    }
    private void CloseModal()
    { CancelGesture(); Modal = modalParent; modalParent = ""; }

    private void ReadingBackdrop()
    {
        // flow最終層の二つの多stopを保持。SceneReaderから重複適用しない。
        string paper=darkTheme?"1d2b27":"f1f1e8";
        GradientSurface(content,new(0,64,InnerWidth,950),new(.5f,1),new(.5f,0),[paper+"ff",paper+"00"],[0,.76f]);
        GradientSurface(content,new(0,64,InnerWidth,950),new(0,.5f),new(1,.5f),[paper+"ff",paper+(darkTheme?"b0":"a8"),paper+"00"],[.02f,.38f,.76f]);
    }

    private static string ActorSymbol(JsonObject row) => row.Text("purpose") switch
    { "passage" => "△", "terminal" => "▣", "self" => "◉", _ => "◇" };
    private static string CardSymbol(JsonObject row) => row.Text("kind") switch
    { "guard" => "◇", "heal" => "＋", "defense_support" => "≋", _ => "↗" };
    private string PublicEventText(JsonObject row)
    {
        if(row.Text("type")!="action")return "場面が変化";
        string actor=View.Obj("exploration").Obj("actors").Obj(row.Text("actor")).Text("display_name");
        if(actor=="")actor=row.Text("actor")=="P"?"辿り屋":"相手";
        string target=View.Obj("exploration").Obj("actors").Obj(row.Text("target")).Text("display_name");
        string action=row.Text("mode") switch{"attack"=>target+" "+(View.Obj("exploration").Obj("actors").Obj(row.Text("target")).Text("remaining_label") is {Length:>0} term?term:"残量")+" −"+row.Number("actual_hp_loss"),"guard"=>"身構","heal"=>"回復 +"+row.Number("hp_restored"),"defense_support"=>"全員へ防御付与",_=>"設置"};
        return actor+" · "+(row.Text("card_name_status")=="recorded_at_resolution"?"「"+row.Text("card_name")+"」":"札（名称未記録）")+" · "+action;
    }
    private static string EffectLine(JsonObject d, bool field, bool defensive = false)
    {
        if (field) return $"{(defensive?"◇":"↗")} {d.Number("field_power")}   {(defensive?"≋":"⌖")} {d.Number("field_hit")}";
        return d.Text("kind") switch
        {
            "guard" => $"◇ {d.Number("power")}   ≋ {d.Number("evasion")}",
            "heal" => $"♡ {d.Number("power")}",
            "defense_support" => $"◇ {d.Obj("defense_grant").Number("guard")}   ≋ {d.Obj("defense_grant").Number("evasion")}  全員付与",
            _ => $"↗ {d.Number("power")}   ⌖ {d.Number("hit")}" 
        };
    }
    private string ActionLabel(JsonObject? card = null, JsonObject? choice = null)
    {
        card ??= View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(r=>r.Text("id")==selectedCard);
        choice ??= Choice();
        if (card is null || choice is null) return "対象を選択";
        if (choice.Text("target") is { Length: >0 } target)
            return View.Obj("exploration").Obj("actors").Obj(target).Text("action_label");
        if (!View.Obj("exploration").Obj("field").ContainsKey(card.Text("attr"))) return "場に置く";
        return card.Text("kind") switch { "guard"=>"身構", "heal"=>"回復", "defense_support"=>"付与", _=>"一致して使う" };
    }

    private void CancelGesture()
    {
        foreach(var tile in Controls.Values.OfType<CardTile>())tile.Modulate=Colors.White;
        gesture.Cancel(); verticalSwipe = false;blankScroll=null;
        if (IsInstanceValid(dragGhost)) dragGhost!.QueueFree();
        dragGhost = null;Controls.Remove("drag-ghost");
    }
    // 判定器の220msを画面設定に合わせて時計だけ換算する。Coreの規則・保存へ設定を混ぜない。
    private double GestureClock()=>(allowDrag?Time.GetTicksMsec():gestureStarted)*220.0/holdMilliseconds;
    private void OpenPrediction(bool pinned=true, bool toggle=true)
    {
        if(Modal=="prediction"&&pinned&&windowPinned&&toggle){Modal="";return;}
        if(Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control source)detailOrigin=source.GetGlobalRect().Position;
        Modal="prediction";windowPinned=pinned;hoverOpenAt=hoverCloseAt=0;renderNeeded=true;
    }
    private void PinButton(Control parent,float width)
    {
        var pin=IconButton(parent,"window-pin","Pin","",new(width-139,4.5f,56,56),()=>{windowPinned=!windowPinned;hoverCloseAt=0;});
        ButtonStyle(pin,windowPinned?(Exploring?"345747":"315849"):Paper,Line,windowPinned?"ffffff":(Exploring?"263c32":"243d35"),1,6);
        pin.TooltipText=windowPinned?"固定を外す":"固定する";
    }
    private void TrackPreviewHover()
    {
        // 原本の180msで一時予測、離れて160msで閉じる。クリックで固定された窓は置き換えない。
        bool overAction=new[]{"preview","play"}.Any(id=>Controls.TryGetValue(id,out var c)&&IsInstanceValid(c)&&c.GetGlobalRect().HasPoint(hoverPoint));
        ulong now=Time.GetTicksMsec();
        if(!Busy&&gesture.Mode==Crossweave.Core.GestureMode.Idle&&Modal==""&&overAction&&actionPreview.Flag("ok"))
        {if(hoverOpenAt==0)hoverOpenAt=now+180;else if(now>=hoverOpenAt)OpenPrediction(false,false);}
        else hoverOpenAt=0;
        if(!windowPinned&&Modal is "detail" or "prediction")
        {
            bool overWindow=Controls.TryGetValue("detail-panel",out var p)&&p.GetGlobalRect().HasPoint(hoverPoint);
            if(overWindow||overAction)hoverCloseAt=0;
            else if(hoverCloseAt==0)hoverCloseAt=now+160;
            else if(now>=hoverCloseAt){Modal="";hoverCloseAt=0;renderNeeded=true;}
        }
    }
    internal void ActivateTile(CardTile tile)
    { if(!Busy&&!Blocked){TapCard(tile.Row,tile.Zone,tile.GetGlobalRect().Position);renderNeeded=true;} }
    private void UpdateDragGhost()
    {
        if(selectedCard!=""&&Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control hand&&Controls.TryGetValue("play",out var play)&&Controls.TryGetValue("preview",out var preview))
        {
            float width=preview.Size.X+8+play.Size.X;
            float x=Mathf.Clamp(hand.GetGlobalRect().GetCenter().X-1-width/2,24,InnerWidth-24-width);
            preview.Position=new(x,906);play.Position=new(x+preview.Size.X+8,906);
        }
        if(gesture.Mode!=Crossweave.Core.GestureMode.Dragging||verticalSwipe)return;
        if(gestureZone=="hand"&&selectedCard!=gestureRow.Text("id")){SelectHand(gestureRow);Modal="";renderNeeded=true;return;}
        if(!IsInstanceValid(dragGhost))
        {
            dragGhost=MakeTile(canvas!,"drag-ghost",gestureRow,new(Vector2.Zero,grabbedSize),gestureZone);dragGhost.Ghost=true;dragGhost.QueueRedraw();
            if(grabbedSize.Y<100)
            {var action=Surface(dragGhost,new(278,2,72,76),gestureZone=="build"?"f5f7ee":"315849");Text(action,gestureZone=="offer"?"取得":gestureZone=="build"?"外す":"編成",new(0,0,72,76),20,gestureZone=="build"?Muted:UiColor("fffef5")).HorizontalAlignment=HorizontalAlignment.Center;}
            dragGhost.MouseFilter=MouseFilterEnum.Ignore;
        }
        var destination=dropZones.LastOrDefault(z=>z.rect.HasPoint(pointer));bool blocked=destination.zone is not null&&!DropPlan(gestureRow,gestureZone,destination.zone).allowed;
        dragGhost!.Modulate=new(1,1,1,blocked?.75f:1);
        if(Screen=="preparation"&&Controls.Values.OfType<CardTile>().FirstOrDefault(t=>!t.Ghost&&t.Zone==gestureZone&&t.Row.Text("id")==gestureRow.Text("id")) is {} source)source.Modulate=new(1,1,1,.3f);
        if(Screen=="exploring"&&Controls.Values.OfType<CardTile>().FirstOrDefault(t=>!t.Ghost&&t.Zone=="hand"&&t.Row.Text("id")==gestureRow.Text("id")) is {} held)held.Modulate=new(1,1,1,.6f);
        dragGhost.GlobalPosition=(pointer-grabOffset).Clamp(Vector2.Zero,new Vector2(1920,1080)-grabbedSize);
    }

    private void MenuWindow()=>AcceptedMenuWindow();
    private Panel DialogFrame(string title,Rect2 rect,bool back=false,Action? backAction=null)
        =>WindowFrame(title,rect,back:back,backAction:backAction);
    private void SettingsWindow()=>AcceptedSettingsWindow();

    private void DeckWindow()=>AcceptedDeckWindow();
    private JsonObject Knowledge => Screen=="exploring" ? View.Obj("exploration").Obj("knowledge") : View.Obj("knowledge");
    private string PurchaseTrack()
    {
        var home=View.Obj("home");var options=home.Arr("acquisition").Rows();
        int pending=options.Count(r=>r.Text("group_id")=="return-offer"&&Plan.Arr("acquire").Strings().Contains(r.Text("id")));
        return home.Obj("offers").Text("status") switch
        // 同じ公開状態の原本runtime.purchaseTrackに文言を合わせる。
        // 取得済み記号は隣の実SVG一個へ集約し、文中へ重複させない。
        { "purchased"=>"帰還分 取得済み", "available"=>$"帰還分 {pending} / 1", _=>"帰還分 候補なし" };
    }
    private void KnowledgeWindow()=>AcceptedKnowledgeWindow();
}
