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
        Button(content, "knowledge", "調査記録", new(1680, 4, 152, 56), () => OpenModal("knowledge"));
        Button(content, "menu", "☰", new(1840, 4, 56, 56), () => OpenModal("menu"));
    }

    private void OpenModal(string name, string parent = "")
    { CancelGesture(); windowPinned=true;modalParent = parent; Modal = name; }
    private void CloseModal()
    { CancelGesture(); Modal = modalParent; modalParent = ""; }

    private void ReadingBackdrop()
    {
        // 元UIの本文側と下辺の淡い紙色をGodot標準のグラデーションで表現する。
        // 既存背景の画素には手を加えない。横長本文を中央の大きな箱へ戻さない。
        void Fade(Vector2 from, Vector2 to)
        {
            var gradient = new Gradient { Colors = [new Color("f1f1e8ff"), new Color("f1f1e800")], Offsets = [0, 1] };
            content.AddChild(new TextureRect { ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
                Texture = new GradientTexture2D { Gradient = gradient, FillFrom = from, FillTo = to },
                Size = new(1920,1080), MouseFilter = MouseFilterEnum.Ignore });
        }
        Fade(new(0, .5f), new(.75f, .5f)); Fade(new(.5f,1), new(.5f,.3f));
        Panel(content, new(0,0,1920,64), "f1f1e8"); Panel(content,new(0,1016,1920,64),"f1f1e8");
    }

    private static string ActorSymbol(JsonObject row) => row.Text("purpose") switch
    { "passage" => "△", "terminal" => "▣", "self" => "◉", _ => "◇" };
    private static string CardSymbol(JsonObject row) => row.Text("kind") switch
    { "guard" => "◇", "heal" => "＋", "defense_support" => "≋", _ => "↗" };
    private string PublicEventText(JsonObject row)
    {
        if(row.Text("type")=="boundary")return "時刻 "+row.Number("time")+"："+(row.Text("event") switch
        {"traversed"=>"道を進んだ","defeated"=>"相手を退けた","player_defeated"=>"余力を失い、緊急脱出",_=>"状況が変わった"});
        string actor=View.Obj("exploration").Obj("actors").Obj(row.Text("actor")).Text("display_name");
        if(actor=="")actor=row.Text("actor")=="P"?"辿り屋":"相手";
        return $"時刻 {row.Number("time")}　{actor}：{row.Text("card_name")}\n余力の減少 {row.Number("actual_hp_loss")}　探査 {row.Number("hit_gain")}　回復 {row.Number("hp_restored")}";
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
        gesture.Cancel(); verticalSwipe = false;blankScroll=null;
        if (IsInstanceValid(dragGhost)) dragGhost!.QueueFree();
        dragGhost = null;
    }
    // 判定器の220msを画面設定に合わせて時計だけ換算する。Coreの規則・保存へ設定を混ぜない。
    private double GestureClock()=>(allowDrag?Time.GetTicksMsec():gestureStarted)*220.0/holdMilliseconds;
    private void OpenPrediction(bool pinned=true, bool toggle=true)
    {
        if(Modal=="prediction"&&pinned&&windowPinned&&toggle){Modal="";return;}
        if(Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control source)detailOrigin=source.GetGlobalRect().GetCenter();
        Modal="prediction";windowPinned=pinned;hoverOpenAt=hoverCloseAt=0;renderNeeded=true;
    }
    private void PinButton(Control parent,float width)
    {
        var pin=Button(parent,"window-pin",windowPinned?"固定":"一時",new(width-132,12,60,48),()=>{windowPinned=!windowPinned;hoverCloseAt=0;});
        pin.AddThemeFontSizeOverride("font_size",16); // 60pxの操作枠に日本語2文字と内側余白を収める。
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
    { if(!Busy&&!Blocked){TapCard(tile.Row,tile.Zone,tile.GetGlobalRect().GetCenter());renderNeeded=true;} }
    private void UpdateDragGhost()
    {
        if(selectedCard!="" && Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control hand && Controls.TryGetValue("play",out var play))
        {
            float x=Mathf.Clamp(hand.GetGlobalRect().Position.X,24,1500);
            play.Position=new(x+140,920);if(Controls.TryGetValue("preview",out var preview))preview.Position=new(x,920);
        }
        if (gesture.Mode != Crossweave.Core.GestureMode.Dragging || verticalSwipe) return;
        if(gestureZone=="hand"&&selectedCard!=gestureRow.Text("id"))
        {SelectHand(gestureRow);Modal="";renderNeeded=true;return;}
        if (!IsInstanceValid(dragGhost))
        {
            // 元の札と同じ部品・同じ寸法を使う。掴んだ点を中心へ飛ばさない。
            dragGhost = MakeTile(canvas!, "drag-ghost", gestureRow, new(Vector2.Zero, grabbedSize), gestureZone);
            if(grabbedSize.Y<100)
            {
                var action=Panel(dragGhost,new(278,0,74,80),"315849");
                Text(action,gestureZone=="offer"?"取得":gestureZone=="build"?"外す":"編成",new(0,0,74,80),20,new Color("fcfcf5")).HorizontalAlignment=HorizontalAlignment.Center;
            }
            dragGhost.MouseFilter = MouseFilterEnum.Ignore; dragGhost.Modulate = new Color(1,1,1,.88f);
        }
        dragGhost!.GlobalPosition = (pointer - grabOffset).Clamp(Vector2.Zero,new Vector2(1920,1080)-grabbedSize);
    }

    private void MenuWindow()
    {
        var p = DialogFrame("メニュー", new(1384, 80, 520, 480));
        var choices = new List<(string id,string label,string modal)> {
            ("menu-knowledge","調査記録","knowledge"),("settings","表示","settings"),
            ("help","遊び方","help"),("save-data","保存データ","save-data"),("history","文章の記録","history") };
        if (Screen=="exploring") choices.AddRange([("objective","目的","objective"),("status","状況","status"),
            ("order","行動順","order"),("deck","山札","deck"),("action-history","履歴","action-history"),("operation","操作","settings")]);
        var scroll=Scroll(p,"menu-list",new(16,68,488,332),false);
        var list=new VBoxContainer {CustomMinimumSize=new(460,0)};scroll.AddChild(list);
        foreach(var (id,label,modal) in choices)
        {var line=new Control{CustomMinimumSize=new(460,58)};list.AddChild(line);Button(line,id,label,new(0,0,456,54),()=>OpenModal(modal,"menu"));}
        if(Screen=="return"&&Can("ack_return"))
        {
            var line=new Control{CustomMinimumSize=new(460,58)};list.AddChild(line);
            Button(line,"repeat",View.Obj("case").Text("status")=="resolved"?"再訪する":"再挑戦",new(0,0,224,54),()=>{departAfterReturn=true;Send("ack_return");});
            Button(line,"return-prepare","取得・編成へ",new(232,0,224,54),()=>{prepareAfterReturn=true;Send("ack_return");});
        }
        Button(p,"exit",Screen=="exploring"?"中断して終了":"終了",new(20,408,480,56),AskClose);
    }
    private Panel DialogFrame(string title, Rect2 rect, bool back = false, Action? backAction = null)
    {
        var p=Panel(popup,rect,"fcfcf5fa"); p.MouseFilter=MouseFilterEnum.Stop;
        Controls["dialog-panel"]=p;
        if(back)Button(p,"modal-back","←",new(8,4,56,56),backAction??CloseModal);
        Text(p,title,new(back?72:16,4,rect.Size.X-(back?152:96),56),22,Gold);
        Button(p,"modal-close","×",new(rect.Size.X-64,4,56,56),()=>{Modal="";modalParent="";});
        return p;
    }

    private void SettingsWindow()
    {
        var p=DialogFrame("表示・操作",new(700,300,520,480),modalParent!="");
        Text(p,"この起動中の画面設定",new(20,66,480,34),18,Muted);
        Button(p,"auto-details",autoDetails?"✓ 選択時に詳細を開く":"選択時に詳細を開く",new(20,110,480,50),()=>autoDetails=!autoDetails);
        Button(p,"show-relations",showRelations?"✓ 関係線を表示":"関係線を表示",new(20,170,480,50),()=>showRelations=!showRelations);
        Button(p,"quick-place",quickPlace?"✓ 通常の設置をすぐ実行":"通常の設置をすぐ実行",new(20,230,480,50),()=>quickPlace=!quickPlace);
        Button(p,"allow-drag",allowDrag?"✓ ドラッグを使う":"ドラッグを使う",new(20,290,480,50),()=>allowDrag=!allowDrag);
        Button(p,"hold-duration","つかむまで "+(holdMilliseconds/1000m).ToString("0.00")+" 秒",new(20,350,480,50),()=>holdMilliseconds=holdMilliseconds==150?220:holdMilliseconds==220?320:150);
        Text(p,"Esc・右クリック：取消   F11：全画面",new(20,418,480,40),18,Muted);
    }

    private void DeckWindow()
    {
        var p=DialogFrame("本人の札",new(700,300,520,480),modalParent!="");
        Text(p,"札名                         持込 / 山札 / 手札",new(20,66,480,40),18,Muted);
        var scroll=Scroll(p,"deck-list",new(20,112,480,304),false);var list=new VBoxContainer{CustomMinimumSize=new(450,0)};scroll.AddChild(list);int index=0;
        foreach(var r in View.Obj("exploration").Arr("deck_catalogue").Rows())
        {
            var line=new Control{CustomMinimumSize=new(450,54)};list.AddChild(line);
            Button(line,"deck-card-"+index++,CardName(r.Obj("card")),new(0,0,240,50),()=>{detail=r.Obj("card").Copy();Modal="deck-card";});
            Text(line,$"{r.Number("initial_count")} / {r.Number("deck_count")} / {r.Number("hand_count")}",new(256,0,186,50),20);
        }
        Text(p,"山札の表示順は引く順序ではありません。",new(20,426,480,38),18,Muted);
    }
    private JsonObject Knowledge => Screen=="exploring" ? View.Obj("exploration").Obj("knowledge") : View.Obj("knowledge");
    private string PurchaseTrack()
    {
        var home=View.Obj("home");var options=home.Arr("acquisition").Rows();
        int pending=options.Count(r=>r.Text("group_id")=="return-offer"&&Plan.Arr("acquire").Strings().Contains(r.Text("id")));
        return home.Obj("offers").Text("status") switch
        { "purchased"=>"✓ 帰還分 取得済み 1 / 1", "available"=>$"帰還分 {pending} / 1", _=>"取得候補なし" };
    }
    private void KnowledgeWindow()
    {
        var parent=DialogFrame("調査記録",new(424,300,520,480),modalParent!="");
        var scroll=Scroll(parent,"knowledge-list",new(16,80,488,384),false);
        var list=new VBoxContainer { CustomMinimumSize=new(460,0) }; scroll.AddChild(list);
        int index=0;
        foreach(var group in Knowledge.Arr("encounters").Rows())
        {
            var profile=group.Text("profile");
            var label=group.Text("display_name"); if(label=="") label="観測した相手・環境";
            var line=new Control { CustomMinimumSize=new(460,58) };list.AddChild(line);
            Button(line,"knowledge-group-"+index++,label+"  ›",new(0,0,456,54),()=>knowledgeSelection=profile);
        }
        if(index==0)Text(parent,"まだ調査記録はありません。",new(24,88,470,100),20);
        if(knowledgeSelection=="")return;
        // 親一覧は再描画時も同じscroll IDで位置を保持。子は横に16px離して置く。
        var child=Panel(popup,new(960,300,520,480),"fcfcf5fa");child.MouseFilter=MouseFilterEnum.Stop;
        Controls["knowledge-child"]=child;
        Text(child,"基本構成と観測札",new(72,4,370,56),22,Gold);
        Button(child,"knowledge-back","←",new(8,4,56,56),()=>knowledgeSelection="");
        Button(child,"knowledge-child-close","×",new(456,4,56,56),()=>knowledgeSelection="");
        var body=Scroll(child,"knowledge-cards",new(16,80,488,384),false);
        var rows=new VBoxContainer { CustomMinimumSize=new(458,0) };body.AddChild(rows);
        var evidence=Knowledge.Arr("evidence").Rows().Where(r=>r.Text("profile")==knowledgeSelection).ToArray();
        var catalogue=evidence.FirstOrDefault(r=>r.Text("kind")=="initial_catalogue_grant");
        var intro=new Label { Text=catalogue is null?"基本構成は未判明。観測した札だけ表示します。":"判明した基本構成（初期枚数）", AutowrapMode=TextServer.AutowrapMode.WordSmart,CustomMinimumSize=new(458,60) };rows.AddChild(intro);
        var cards=catalogue?.Arr("cards").Rows().Select(r=>(card:r.Obj("card"),suffix:" ×"+r.Number("initial_count")))
            ?? evidence.Where(r=>r["card"] is JsonObject).Select(r=>(card:r.Obj("card"),suffix:"（観測）"));
        int n=0;
        foreach(var (card,suffix) in cards.DistinctBy(r=>r.card.ToJsonString()))
        {
            var line=new Control { CustomMinimumSize=new(458,64) };rows.AddChild(line);
            Button(line,"knowledge-card-"+n++,CardName(card)+suffix+"  ›",new(0,0,454,58),()=>
            { detail=card.Copy(); detailKind="knowledge"; detailId=card.Text("type"); Modal="knowledge-card"; });
        }
    }
}
