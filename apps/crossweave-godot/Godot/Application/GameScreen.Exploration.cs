using Godot;
using System.Text.Json.Nodes;
using Crossweave.Core;

namespace Crossweave.Application;

/// <summary>
/// 探索の公開viewを実Controlへ並べる。_InputはGodotの全体入力、札の_GuiInputはGUI内の入力。
/// PointerGestureは本作共通のC#判定器で、保持時間の意味はGodot標準機能ではない。
/// 予測・対象・ドラッグは画面だけの状態で、Coreへplayを送るまで乱数も保存も進めない。
/// </summary>
public partial class GameScreen
{
    private readonly Dictionary<string, JsonObject> cardRows = new();
    private readonly List<(Label label, ScrollContainer reader, string id)> visibleParagraphs = [];
    private readonly HashSet<string> displayedTexts = new(StringComparer.Ordinal);
    private InteractionCanvas? canvas;

    private void ExplorationScreen()
    {
        RetainPublicTarget();
        var e=View.Obj("exploration");var actors=e.Obj("actors").Where(x=>x.Key!="P"&&x.Value.Flag("active")).ToArray();
        float total=actors.Length*344-24;
        var actorScroll=Scroll(content,"actors",new(24,88,1870,272),true);
        var actorLine=new HBoxContainer{CustomMinimumSize=new(Math.Max(1870,total),256),Alignment=BoxContainer.AlignmentMode.Center};actorLine.AddThemeConstantOverride("separation",24);actorScroll.AddChild(actorLine);
        foreach(var (id,node) in actors)
        {
            var row=((JsonObject)node!).Copy();row["id"]=id;
            var cell=new Control{CustomMinimumSize=new(320,256),MouseFilter=MouseFilterEnum.Ignore};actorLine.AddChild(cell);
            var b=Button(cell,"actor-"+id,"",new(0,8,320,248),()=>SelectActor(row,"actor-"+id),!Blocked);
            ButtonStyle(b,"ffffff00",id==selectedTarget?"345747":"ffffff00","263c32",id==selectedTarget?2:0,6,hover:"ffffff00");
            if(row.Text("knowledge_profile_id")=="SCN-001/target/ACT02")
                b.AddChild(new TextureRect{ExpandMode=TextureRect.ExpandModeEnum.IgnoreSize,Texture=GD.Load<Texture2D>("res://Assets/Application/diver-placeholder.webp"),Position=new(19,-8),Size=new(282,176),StretchMode=TextureRect.StretchModeEnum.KeepAspectCentered,MouseFilter=MouseFilterEnum.Ignore});
            else Icon(b,row.Text("purpose")=="passage"?"Triangle":"Flag",new(128,22,64,64),stroke:1.5f);
            var band=Surface(b,new(1,129,318,118),id==selectedTarget?"e9eee4":"f7f8f4");
            float nameX=id==selectedTarget?25:10;if(id==selectedTarget)Icon(band,"Crosshair",new(10,17,12,12));
            var name=Text(band,row.Text("display_name"),new(nameX,10,308-nameX,28),20);Strong(name);LineHeight(name,20,28);
            ActorVitals(band,id,row,10,46,298);
        }
        OrderStrip(e);
        Surface(content,new(24,380,1870,248),"e9eed81a",radius:8);
        if(selectedCard!=""&&e.Arr("hand").Rows().FirstOrDefault(c=>c.Text("id")==selectedCard) is {} linked)
        {
            string state=linked.Text("attr")+(e.Obj("field").ContainsKey(linked.Text("attr"))?" · 一致":" · 設置");
            float w=font.GetStringSize(state,fontSize:16).X+12;var label=Surface(content,new(24,380,w,24),"f7f8f4");Text(label,state,new(6,0,w-12,24),16);
        }
        var actual=e.Obj("field");var after=actionPreview.Obj("field_after");var field=new List<JsonObject>();
        foreach(var attr in actual.Select(p=>p.Key).Concat(e.Arr("hand").Rows().Select(c=>c.Text("attr"))).Distinct())
        {
            if(actual[attr] is JsonObject placed){var row=placed.Copy();row["consumed"]=actionPreview.Flag("ok")&&!after.Any(x=>x.Value.Text("id")==row.Text("id"));field.Add(row);}
            else if(after[attr] is JsonObject next){var row=next.Copy();row["forecast"]=true;field.Add(row);}
            else field.Add(new(){["attr"]=attr,["empty"]=true,["id"]="empty-"+attr});
        }
        CardStrip("field",field,new(24,412,1870,216));
        CardStrip("hand",e.Arr("hand").Rows(),new(24,684,1870,214));
        dropZones.Add((new(25,381,1870,248),"field"));
        if(selectedCard!=""&&Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control hand)
        {
            string label=ActionLabel();float playWidth=Math.Max(80,font.GetStringSize(label,fontSize:18).X+32);
            float x=Mathf.Clamp(hand.GetGlobalRect().GetCenter().X-1-(88+playWidth)/2,24,InnerWidth-24-88-playWidth);
            // 原本action-anchor::beforeの8px角を45度回す。選択札の中心を追い、
            // ScrollContainerの送りでボタンと同じ実Controlを移動する。
            var track=Surface(content,new(hand.GetGlobalRect().GetCenter().X-5,902,8,8),Paper);track.PivotOffset=new(4,4);track.Rotation=Mathf.Pi/4;Controls["action-track"]=track;
            Button(content,"preview","予測",new(x,906,80,56),()=>OpenPrediction(),actionPreview.Flag("ok"));
            Button(content,"play",label,new(x+88,906,playWidth,56),()=>{if(Choice() is {} c)Send("play",new(){["choice"]=c.Copy()});},Choice() is not null&&Can("play"));
        }
        var footer=Surface(content,new(24,982,1870,72),"f7f8f4",radius:5);
        ActorVitals(footer,"P",e.Obj("self"),16,7,400);
        Text(footer,$"手札 {e.Arr("hand").Count}枚",new(448,15,250,42),18);
        Button(footer,"withdraw","撤退",new(1784,8,70,56),()=>OpenModal("withdraw"),Can("withdraw"));
        LiveEvents();
    }

    private void VitalBar(Control parent,Rect2 rect,long value,long maximum)
    {
        parent.AddChild(new ColorRect {Position=rect.Position,Size=rect.Size,Color=UiColor(Line),MouseFilter=MouseFilterEnum.Ignore});
        parent.AddChild(new ColorRect {Position=rect.Position,Size=new(rect.Size.X*Mathf.Clamp((float)value/Math.Max(1,maximum),0,1),rect.Size.Y),Color=Gold,MouseFilter=MouseFilterEnum.Ignore});
    }
    private void SelectActor(JsonObject row,string controlId)
    {
        selectedTarget=row.Text("id");RefreshAction();
        if(autoDetails)ShowDetail(row,"actor",Controls[controlId].GetGlobalRect().GetCenter());
    }
    private void OrderStrip(JsonObject e)
    {
        var scroll=Scroll(content,"turn-order",new(24,24,1610,56),true);
        var line=new HBoxContainer{CustomMinimumSize=new(0,56)};line.AddThemeConstantOverride("separation",16);scroll.AddChild(line);
        bool predicted=actionPreview.Flag("ok");int index=0;
        if(predicted){var now=new Control{CustomMinimumSize=new(56,56)};line.AddChild(now);Text(now,"本人・今",new(0,8,56,40),16);}
        // 現在予約は原本どおり一主体ずつ並べる。予測後だけ同時刻を一群にし、
        // 公開されていない同時刻内の未来順を表示しない。規則の予約は変更しない。
        var groups = predicted
            ? ReservationGroups().Select(g => (at: g.Key, rows: g.ToArray()))
            : e.Arr("reservations").Rows().Select(r => (at: r.Number("at"), rows: new[] { r }));
        foreach(var group in groups)
        {
            string time="+"+(group.at-e.Number("now"));float timeWidth=font.GetStringSize(time,fontSize:18).X+1;
            float gap=predicted?2:5, faces=group.rows.Length*40+(group.rows.Length-1)*gap;
            float prefix=line.GetChildCount()>0?font.GetStringSize("›",fontSize:18).X+4+gap:0;
            var cell=new Control{CustomMinimumSize=new(prefix+faces+gap+timeWidth,56)};line.AddChild(cell);int within=0;
            if(prefix>0){Surface(cell,new(0,15,prefix-gap,26),"f7f8f4",radius:3);Text(cell,"›",new(2,15,prefix-gap-4,26),18);}
            foreach(var r in group.rows)
            {
                string id=r.Text("actor_id"),key="order-"+index++;var row=e.Obj("actors").Obj(id).Copy();row["id"]=id;
                var b=Button(cell,key,"",new(prefix+within++*(40+gap),8,40,40),()=>ShowDetail(row,"actor",Controls[key].GetGlobalRect().GetCenter()));b.TooltipText=row.Text("display_name")+"の詳細";
                bool next=id=="P"&&predicted;ButtonStyle(b,next?"dfe8d8":"f7f8f4","acbdad","263c32",1,5);
                Surface(b,new(8,8,24,24),"ffffff00","263c32",1,12);
                if(row.Text("knowledge_profile_id")=="SCN-001/target/ACT02")
                {
                    var texture=GD.Load<Texture2D>("res://Assets/Application/diver-placeholder.webp");float side=Math.Min(texture.GetWidth(),texture.GetHeight());
                    var crop=new AtlasTexture{Atlas=texture,Region=new((texture.GetWidth()-side)/2,(texture.GetHeight()-side)*.2f,side,side)};
                    var face=new TextureRect{Texture=crop,ExpandMode=TextureRect.ExpandModeEnum.IgnoreSize,Position=new(9,9),Size=new(22,22),StretchMode=TextureRect.StretchModeEnum.KeepAspectCovered,MouseFilter=MouseFilterEnum.Ignore};RoundTexture(face,11,true);b.AddChild(face);
                }
                else {var symbol=Text(b,id=="P"?"●":row.Text("purpose") switch{"passage"=>"△","terminal"=>"▥","optional_enemy"=>"◈",_=>"◇"},new(9,9,22,22),12);symbol.HorizontalAlignment=HorizontalAlignment.Center;}
                if(next){Surface(b,new(0,38,40,2),"263c32");Text(b,"次",new(22,20,18,20),16);b.TooltipText+="・次回位置 "+SelfPosition();}
            }
            Text(cell,time,new(prefix+faces+gap,8,timeWidth,40),18).TooltipText=group.rows.Length>1?"同時刻（内部の順序は未公開）":"公開予約";
        }
    }

    private string PredictionText()
    {
        if (!actionPreview.Flag("ok")) return "行動を選ぶと予測が表示されます。";
        return PredictionSummary();
    }

    private static string ActorText(JsonObject row) => $"{row.Text("remaining_label")} {row.Number("hp")} / {row.Number("max_hp")}\n隠蔽 {row.Number("posture_remaining")} / {row.Number("max_posture")}\n身構 {row.Obj("defense").Number("guard")}　攪乱 {row.Obj("defense").Number("evasion")}\n機転 {row.Number("crit")}\n次の行動時刻 {row.Number("next_at")}\n公開された手札枚数 {row.Number("hand_count")}\n山札枚数 {row.Number("deck_count")}\n\n防御の内訳\n" + string.Join("\n", row.Obj("defense").Arr("effects").Rows().Select(e=>$"身構 {e.Number("guard")}・攪乱 {e.Number("evasion")} / 残り {(e["uses"] is null?"制限なし":e.Text("uses"))}"));

    private JsonObject? Choice()
    {
        var choices = View.Obj("exploration").Arr("legal_actions").Rows().Where(c => c.Text("card_id") == selectedCard).ToArray();
        return choices.FirstOrDefault(c => c.Text("target") == selectedTarget) ?? choices.FirstOrDefault(c=>c.Text("target")=="");
    }
    private void RefreshAction()
    {
        RetainPublicTarget();
        actionPreview = new();
        if (Session is not null && Can("preview_action") && Choice() is { } choice)
            actionPreview = Session.PreviewAction(View.Number("revision"), View.Text("view_token"), choice.Copy());
    }
    private void RetainPublicTarget()
    {
        // 原本targetForと同じ、公開合法候補だけのUI選択。前の対象を保持し、
        // 消えた時は公開passageを優先する。規則・対象能力・保存は変更しない。
        var e=View.Obj("exploration");var allowed=e.Arr("legal_actions").Rows().Where(r=>r.Text("card_id")==selectedCard&&r.Text("target")!="").Select(r=>r.Text("target")).ToHashSet();
        var candidates=e.Obj("actors").Where(p=>p.Key!="P"&&p.Value.Flag("active")&&(allowed.Count==0||allowed.Contains(p.Key))).ToArray();
        if(candidates.Any(p=>p.Key==selectedTarget))return;
        selectedTarget=candidates.FirstOrDefault(p=>p.Value.Text("purpose")=="passage").Key??candidates.FirstOrDefault().Key??"";
    }
    private void CardStrip(string zone, IEnumerable<JsonObject> rows, Rect2 rect)
    {
        var array=rows.ToArray();var scroll=Scroll(content,"strip-"+zone,rect,true);
        // overflow-y:hidden相当。208px札は縦バーを出さず、横バー出現時だけ
        // viewportの内側で切れる。padding2を同じ実一覧の内容に含める。
        scroll.VerticalScrollMode=ScrollContainer.ScrollMode.ShowNever;
        var inset=new MarginContainer{SizeFlagsHorizontal=SizeFlags.ExpandFill,SizeFlagsVertical=zone=="hand"?SizeFlags.ShrinkCenter:SizeFlags.ShrinkBegin,MouseFilter=MouseFilterEnum.Pass};
        inset.AddThemeConstantOverride("margin_left",2);inset.AddThemeConstantOverride("margin_right",2);scroll.AddChild(inset);
        if(zone=="hand")
        {
            // flexのcenterは横バー出現時に札の上下2pxを切る。整数余白で
            // 同じ位置へ寄せ、一覧の余白入力はPassで実viewportまで通す。
            void Center(){int pad=scroll.GetHScrollBar().IsVisibleInTree()?-2:3;inset.AddThemeConstantOverride("margin_top",pad);inset.AddThemeConstantOverride("margin_bottom",pad);}
            scroll.GetHScrollBar().VisibilityChanged+=Center;Center();
        }
        var line=new HBoxContainer {CustomMinimumSize=new(Math.Max(rect.Size.X-4,array.Length*264-16),208),Alignment=BoxContainer.AlignmentMode.Center};
        line.AddThemeConstantOverride("separation",16);inset.AddChild(line);
        foreach(var row in array)
        {
            var kind=row.Flag("forecast")?"forecast":zone;
            var cell=new Control {CustomMinimumSize=new(248,208),MouseFilter=MouseFilterEnum.Ignore};line.AddChild(cell);
            MakeTile(cell,"card-"+kind+"-"+row.Text("id"),row,new(0,0,248,208),kind);
        }
    }
    private CardTile MakeTile(Control parent,string id,JsonObject row,Rect2 rect,string zone)
    {
        var selected=View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(c=>c.Text("id")==selectedCard);
        var tile=new CardTile{Position=rect.Position,Size=rect.Size,Screen=this,Row=row.Copy(),Zone=zone,Selected=zone=="hand"&&row.Text("id")==selectedCard,Linked=zone is "field" or "forecast"&&selected?.Text("attr")==row.Text("attr"),FocusMode=row.Flag("empty")?FocusModeEnum.None:FocusModeEnum.All,MouseFilter=row.Flag("empty")?MouseFilterEnum.Ignore:MouseFilterEnum.Stop};
        parent.AddChild(tile);Controls[id]=tile;cardRows[id]=row;
        tile.MouseEntered+=()=>{tile.Hovered=true;tile.QueueRedraw();};tile.MouseExited+=()=>{tile.Hovered=false;tile.QueueRedraw();};
        var d=row["details"] as JsonObject??row;
        if(rect.Size.Y<100)
        {
            var title=Text(tile,CardName(row),new(10,6,260,48),20);Strong(title);LineHeight(title,20,24);title.MaxLinesVisible=2;title.VerticalAlignment=VerticalAlignment.Top;
            Icon(tile,zone=="build"?"Check":d["trigger"] is not null?"ScrollText":"Layers",new(10,55,18,18),zone=="build"?Gold:Muted);
            float x=34;
            if(zone=="offer"||row.Flag("pending")){Icon(tile,"Lightbulb",new(x,55,18,18),Muted);Text(tile,ViewData.Money(row.Number("price_units")),new(x+24,54,130,20),18,Muted);}
            else if(d["trigger"] is not null){Icon(tile,"Grid2X2",new(x,55,18,18),Muted);Text(tile,d.Number("equipment_cost").ToString(),new(x+24,54,96,20),18,Muted);}
            else Text(tile,d.Text("attr"),new(x,54,96,20),18,Muted);
            if(row.Number("display_quantity")>1)Text(tile,"×"+row.Number("display_quantity"),new(190,54,80,20),18,Muted).HorizontalAlignment=HorizontalAlignment.Right;
            if(row.Flag("locked")){Icon(tile,"Pin",new(228,55,18,18),Muted);tile.TooltipText="ロック済み";}
            if(row.Flag("pending")){Surface(tile,new(250,54,20,20),Paper,radius:10);Icon(tile,"Clock3",new(251,55,18,18),UiColor("846838"));}
        }
        else if(row.Flag("empty"))
        {
            // 空の場は短いcaptionのみ。通常札の名称48px・効果24pxを架空に確保しない。
            Surface(tile,new(1,147,246,60),"f7f8f4");var emptyCaption=Strong(Text(tile,d.Text("attr"),new(7,153,234,24),18));emptyCaption.VerticalAlignment=VerticalAlignment.Top;LineHeight(emptyCaption,18,24);
        }
        else
        {
            CardGradient(tile,new(1,1,246,87),zone=="hand"?6:5);
            // exploration.jsのart('cards')は64pxの既存glyph。stat欄のLucide SVGとは役割が違う。
            // 原本のillustrationは上padding8px、spanは64px/1.4のline box。
            // Labelはfontの自然高未満に縮まないため、半行余白を外側で配分する。
            // 字形の位置を画像から手で動かさず、同じfont metricsとCSS値から決める。
            float glyphHeight = MathF.Ceiling(font.GetHeight(64)), glyphLineHeight = 64 * 1.4f;
            var symbol=Text(tile,d.Text("kind") switch{"guard" or "defense_support"=>"◇","heal"=>"✚",_=>"↗"},new(1,9+(glyphLineHeight-glyphHeight)/2,246,glyphHeight),64);symbol.HorizontalAlignment=HorizontalAlignment.Center;LineHeight(symbol,64,glyphLineHeight);
            var name=Text(tile,CardName(row),new(7,94,234,48),18);Strong(name);LineHeight(name,18,24);name.MaxLinesVisible=2;name.VerticalAlignment=VerticalAlignment.Top;
            bool field=zone is "field" or "forecast",defensive=selected?.Text("kind") is "guard" or "defense_support"&&selected.Text("attr")==d.Text("attr");
            float effectX=7;
            void Effect(string icon,long value)
            {Icon(tile,icon,new(effectX,148,20,20));var text=value.ToString();float width=strongFont.GetStringSize(text,fontSize:18).X;Strong(Text(tile,text,new(effectX+24,146,width+1,24),18));effectX+=28+width;}
            if(field){Effect(defensive?"Shield":"ArrowUpRight",d.Number("field_power"));Effect(defensive?"Wind":"ScanSearch",d.Number("field_hit"));}
            else if(d.Text("kind")=="guard"){Effect("Shield",d.Number("power"));Effect("Wind",d.Number("evasion"));}
            else if(d.Text("kind")=="heal"){Effect("HeartPlus",d.Number("power"));Effect("ScanSearch",d.Number("hit"));}
            else if(d.Text("kind")=="defense_support"){Effect("Shield",d.Obj("defense_grant").Number("guard"));Effect("Wind",d.Obj("defense_grant").Number("evasion"));}
            else{Effect("ArrowUpRight",d.Number("power"));Effect("ScanSearch",d.Number("hit"));}
            float badgeWidth=font.GetStringSize(d.Text("attr"),fontSize:16).X+10;
            var badge=Surface(tile,new(7,175,badgeWidth,26),"ffffff00",Exploring?"263c32":"243d35",1,4);Text(badge,d.Text("attr"),new(5,0,badgeWidth-10,26),16);
            if(zone=="hand")Text(tile,d.Number("remaining")==1?"今回まで":"あと"+d.Number("remaining")+"行動",new(badgeWidth+15,176,226-badgeWidth,24),16,d.Number("remaining")==1?UiColor("943c25"):Ink).HorizontalAlignment=HorizontalAlignment.Right;
            if(row.Flag("forecast")||row.Flag("consumed"))
            {string caption=row.Flag("forecast")?"＋ 予測":"使用後に場から離れる";float w=Math.Min(240,font.GetStringSize(caption,fontSize:16).X+12);var state=Surface(tile,new(244-w,4,w,24),Paper,radius:3);Text(state,caption,new(6,0,w-12,24),16,row.Flag("consumed")?Muted:Ink);}
        }
        return tile;
    }

    internal void PointerDown(CardTile tile, Vector2 location)
    {
        if (Busy || Blocked || touchPointers.Count>1 || (Modal != "" && Modal != "detail" && Modal != "prediction") || View.Obj("story").Obj("scene").Flag("paused")) return;
        if(gesture.Mode!=GestureMode.Idle){CancelGesture();return;}
        if(tile.Row.Flag("empty"))return;
        grabOffset=location-tile.GetGlobalRect().Position;grabbedSize=tile.Size;verticalSwipe=false;
        gestureRow = tile.Row.Copy(); gestureZone = tile.Zone; pointer = location; gestureStarted = Time.GetTicksMsec();
        gesture.Begin(tile.Row.Text("id"), location.X, location.Y, GestureClock()); tile.GrabFocus();
    }

    public override void _Input(InputEvent input)
    {
        FocusInput(input);
        if(input is InputEventMouseMotion hover)hoverPoint=hover.Position;
        if(input is InputEventMouseButton wheel&&wheel.Pressed&&wheel.ButtonIndex is MouseButton.WheelUp or MouseButton.WheelDown or MouseButton.WheelLeft or MouseButton.WheelRight)CancelGesture();
        if(input is InputEventScreenTouch touch)
        {
            if(touch.Pressed)touchPointers.Add(touch.Index);else touchPointers.Remove(touch.Index);
            if(touchPointers.Count>1||touch.Canceled){CancelGesture();GetViewport().SetInputAsHandled();return;}
        }
        if (input is InputEventKey key && key.Pressed && key.Keycode == Key.Escape)
        { CancelGesture(); if (!Blocked) CloseModal(); renderNeeded = true; GetViewport().SetInputAsHandled(); return; }
        if (input is InputEventKey full && full.Pressed && full.Keycode == Key.F11)
        { DisplayServer.WindowSetMode(DisplayServer.WindowGetMode() == DisplayServer.WindowMode.Fullscreen ? DisplayServer.WindowMode.Windowed : DisplayServer.WindowMode.Fullscreen); CancelGesture(); return; }
        if (input is InputEventMouseButton right && right.Pressed && right.ButtonIndex == MouseButton.Right)
        { CancelGesture(); if (!Blocked) CloseModal(); renderNeeded = true; GetViewport().SetInputAsHandled(); return; }
        if (input is InputEventMouseButton outside && outside.Pressed && Modal is "detail" or "prediction" && Controls.TryGetValue("detail-panel", out var panel) && !panel.GetGlobalRect().HasPoint(outside.Position)
            && !Controls.Any(c=>(c.Value is CardTile||c.Key.StartsWith("actor-")||c.Key.StartsWith("order-")||c.Key=="preview")&&c.Value.GetGlobalRect().HasPoint(outside.Position)))
        { Modal = ""; renderNeeded = true; } // 外クリックは窓を閉じ、隣の札の入力はそのまま通す。
        if(blankScroll is not null)
        {
            if(!IsInstanceValid(blankScroll)){blankScroll=null;return;}
            if(input is InputEventMouseMotion pan)
            {
                var delta=pan.Position-blankLast;blankLast=pan.Position;
                // overflow-y:hidden相当のShowNeverでも操作軸は横。
                // バーの表示条件ではなく、一覧の横操作契約から送り先を決める。
                if(blankScroll.HorizontalScrollMode!=ScrollContainer.ScrollMode.Disabled)blankScroll.ScrollHorizontal-=(int)delta.X;
                else blankScroll.ScrollVertical-=(int)delta.Y;
                GetViewport().SetInputAsHandled();return;
            }
            if(input is InputEventMouseButton {Pressed:false,ButtonIndex:MouseButton.Left})
            {blankScroll=null;GetViewport().SetInputAsHandled();return;}
        }
        if (gesture.Mode == GestureMode.Idle) return;
        if (input is InputEventMouseMotion move)
        {
            var previous = gesture.X; pointer = move.Position; gesture.Move(pointer.X, pointer.Y, GestureClock());
            if(Screen=="preparation"&&gesture.Mode==GestureMode.Pending&&Math.Abs(pointer.Y-gesture.StartY)>=PointerGesture.SwipeThreshold)
                verticalSwipe=true;
            if ((gesture.Mode == GestureMode.Swiping||verticalSwipe) && GestureScroll() is { } scroll)
            { if (Screen == "preparation") scroll.ScrollVertical -= (int)move.Relative.Y; else scroll.ScrollHorizontal -= (int)(gesture.X - previous); }
        }
        if (input is InputEventMouseButton release && !release.Pressed && release.ButtonIndex == MouseButton.Left)
        {
            pointer = release.Position; var zone = dropZones.LastOrDefault(z => z.rect.HasPoint(pointer)).zone ?? "";
            var end = gesture.End(zone.Length > 0, GestureClock());
            if (!verticalSwipe && end == GestureEnd.Tap) TapCard(gestureRow, gestureZone, pointer-grabOffset);
            if (!verticalSwipe && end == GestureEnd.Drop) DropCard(gestureRow, gestureZone, zone);
            CancelGesture();
            renderNeeded = true; GetViewport().SetInputAsHandled();
        }
    }
    private ScrollContainer? GestureScroll() => Controls.GetValueOrDefault(Screen == "preparation" ? "prep-" + preparationTab + "-" + gestureZone : "strip-" + gestureZone) as ScrollContainer;
    private void AutoScroll()
    {
        if (gesture.Mode != GestureMode.Dragging || DestinationScroll() is not { } scroll) return;
        var r = scroll.GetGlobalRect();
        if(!r.HasPoint(pointer))return; // 元列外で送り続けず、移動先の領域内だけを送る。
        if (Screen == "preparation") { if (pointer.Y > r.End.Y - 22) scroll.ScrollVertical += 7; if (pointer.Y < r.Position.Y + 22) scroll.ScrollVertical -= 7; }
        else { if (pointer.X > r.End.X - 64) scroll.ScrollHorizontal += 16; if (pointer.X < r.Position.X + 64) scroll.ScrollHorizontal -= 16; }
    }
    private void TapCard(JsonObject row, string zone, Vector2 point)
    {
        if (zone == "hand") { SelectHand(row); }
        if(autoDetails || zone!="hand")ShowDetail(row, zone, point);
    }
    private void SelectHand(JsonObject row)
    {
        selectedCard=row.Text("id");
        var legal=View.Obj("exploration").Arr("legal_actions").Rows().Where(r=>r.Text("card_id")==selectedCard).ToArray();
        // 公開された合法対象からだけ選ぶ。別の札へ移っても有効な対象を保持する。
        if(!legal.Any(r=>r.Text("target")==selectedTarget))
            selectedTarget=legal.FirstOrDefault(r=>View.Obj("exploration").Obj("actors").Obj(r.Text("target")).Text("purpose")=="passage")?.Text("target")??legal.FirstOrDefault()?.Text("target")??"";
        RefreshAction();
        if(detailKind=="forecast"&&!actionPreview.Obj("field_after").Any(r=>r.Value.Text("id")==detailId)){Modal="";detailKey="";}
    }
    private void DropCard(JsonObject row, string from, string to)
    {
        if(!DropPlan(row,from,to).allowed)return; // 可否表示と実解放で同じ判定を使う。
        Modal = "";
        if (from == "hand" && to == "field")
        {
            SelectHand(row);
            // 原本のquick条件を継承。設置以外・消滅する未使用札がある一手は、公開予測を見てから確定する。
            bool loses=actionPreview["unused_hand_expiry"] is not JsonArray||actionPreview.Arr("unused_hand_expiry").Rows().Any(c=>c.Flag("expires")&&c.Text("destination")=="destroyed");
            if (Choice() is { } choice && actionPreview.Flag("ok"))
            {
                if(quickPlace&&actionPreview.Text("mode")=="place"&&!loses)Send("play",new(){["choice"]=choice.Copy()});
                else OpenPrediction(true,false);
            }
            else Message = "対象を選び、予測を確認して「行動する」を押してください。";
        }
        else if (from == "offer" && to is "reserve" or "build")
        {
            Stage(row);
            if (to == "build") { var pending = ProjectedOwned().First(r => r.Text("id") == row.Text("pending_selection_id")); Compose(pending, true); }
        }
        else if (from is "reserve" or "build" && to is "reserve" or "build") Compose(row, to == "build");
        else if (row.Flag("pending") && to == "offer") Unstage(row);
    }

    private void SceneReader()
    {
        Text(content,"夜潮の排水路",new(24,4,1100,56),24);
        var p=ReadingWindow(content,new(24,636,840,360));
        StoryReader(p,"scene-reader",new(24,24,792,312),false);
        Button(content,"story-detail","詳細",new(24,1018,112,56),()=>OpenModal("story-detail"));
        Button(content,"withdraw","撤退",new(1520,1018,120,56),()=>OpenModal("withdraw"),Can("withdraw"));
        Button(content,"continue","進む",new(1740,1018,156,56),()=>ContinueStory(true),Can("continue_scene"));
    }

    private void StoryReader(Control parent, string id, Rect2 rect, bool optional)
    {
        var scroll = Scroll(parent, id, rect, false); var list = new VBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill }; list.AddThemeConstantOverride("separation", 14); scroll.AddChild(list);
        foreach (var row in StoryRows(optional))
        {
            string lines = ProseLines(row.Text("short_text"), rect.Size.X - 12);
            // CSSのline-heightは末行にも一行分の領域を持つ。GodotのLabel既定高は
            // 末行のfont heightで終わるため、段落数に応じて後続の位置がずれる。
            // 行送りと外形高を別に固定し、上下の半行余白は中央寄せで再現する。
            var label = new Label { Text = lines, CustomMinimumSize = new(rect.Size.X - 12, lines.Split('\n').Length * 34), VerticalAlignment = VerticalAlignment.Center, AutowrapMode = TextServer.AutowrapMode.Off, MouseFilter = MouseFilterEnum.Ignore };
            label.AddThemeFontSizeOverride("font_size", 20); label.AddThemeFontOverride("font",LineBoxFont(font,20)); LineHeight(label,20,34); list.AddChild(label); visibleParagraphs.Add((label, scroll, row.Text("id")));
        }
    }
    private void RecordVisibleParagraphs()
    {
        foreach (var (label, reader, id) in visibleParagraphs)
            if (IsInstanceValid(label) && label.IsVisibleInTree())
            {
                var a = label.GetGlobalRect(); var b = reader.GetGlobalRect();
                if (a.Size.Y > 0 && a.End.Y <= b.End.Y + 1 && a.End.Y > b.Position.Y) displayedTexts.Add(id);
            }
    }

    internal void PaintInteraction(Control surface)
    {
        PaintDropTargets(surface);
        Vector2? Point(Control? node,Control? track,bool top)
        {
            if(node is null||track is null)return null;var a=node.GetGlobalRect();var b=track.GetGlobalRect();
            float left=Math.Max(a.Position.X,Math.Max(b.Position.X,1)),right=Math.Min(a.End.X,Math.Min(b.End.X,1919));
            return right-left<4?null:new Vector2((left+right)/2,top?a.Position.Y:a.End.Y);
        }
        void Relation(Vector2? from,Vector2? to)
        {
            if(from is not {} a||to is not {} b)return;float mid=(a.Y+b.Y)/2;
            var curve=new Curve2D();curve.AddPoint(a,Vector2.Zero,new(0,mid-a.Y));curve.AddPoint(b,new(0,mid-b.Y),Vector2.Zero);
            var color=Ink;color.A=.5f;surface.DrawPolyline(curve.Tessellate(6,2),color,2,true);
        }
        if(showRelations&&selectedCard!=""&&Controls.TryGetValue("card-hand-"+selectedCard,out var hand)&&Choice() is {} choice)
        {
            var selected=View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(c=>c.Text("id")==selectedCard);
            var field=Controls.Values.OfType<CardTile>().FirstOrDefault(c=>c.Zone is "field" or "forecast"&&c.Row.Text("attr")==selected?.Text("attr"));
            var fieldTrack=Controls.GetValueOrDefault("strip-field");
            Relation(Point(hand,Controls.GetValueOrDefault("strip-hand"),true),Point(field,fieldTrack,false));
            Relation(Point(field,fieldTrack,true),Point(Controls.GetValueOrDefault("actor-"+choice.Text("target")),Controls.GetValueOrDefault("actors"),false));
        }
    }
}

/// <summary>Control標準のGuiInputを受ける札。ゲーム状態は持たず、公開行と入力意図だけを親へ返す。</summary>
internal partial class CardTile : Control
{
    internal GameScreen Screen = null!;
    internal JsonObject Row = new();
    internal string Zone = "";
    internal bool Selected,Linked;
    internal bool Hovered,Ghost;
    public override void _Draw()=>Screen.PaintTile(this);
    public override void _GuiInput(InputEvent input)
    {
        if (input is InputEventMouseButton mouse && mouse.Pressed && mouse.ButtonIndex == MouseButton.Left)
        { Screen.PointerDown(this, GetGlobalRect().Position + mouse.Position); AcceptEvent(); }
        if(input is InputEventKey key&&key.Pressed&&!key.Echo&&key.Keycode is Key.Enter or Key.Space)
        { Screen.ActivateTile(this);AcceptEvent(); }
    }
}

/// <summary>関係線とドラッグ像の描画専用Control。MouseFilter.Ignoreで下の実入力ノードを遮らない。</summary>
internal partial class InteractionCanvas : Control
{
    internal GameScreen Screen = null!;
    public override void _Draw() => Screen.PaintInteraction(this);
}
