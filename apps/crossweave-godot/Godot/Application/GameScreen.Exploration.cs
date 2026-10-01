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
        var e = View.Obj("exploration");
        // UI0.14.3の336/248/314/72行、20間隔。本人は下帯、相手は上段に置く。
        var actors=e.Obj("actors").Where(x=>x.Key!="P"&&x.Value.Flag("active")).ToArray();
        float total=actors.Length*344-24, startX=Math.Max(24,(1920-total)/2);
        var actorScroll=Scroll(content,"actors",new(24,88,1872,272),true);
        var actorLine=new HBoxContainer { CustomMinimumSize=new(Math.Max(1872,total),256),Alignment=BoxContainer.AlignmentMode.Center };
        actorLine.AddThemeConstantOverride("separation",24); actorScroll.AddChild(actorLine);
        foreach(var (id,node) in actors)
        {
            var row=((JsonObject)node!).Copy(); row["id"]=id;
            var cell=new Control {CustomMinimumSize=new(320,256),MouseFilter=MouseFilterEnum.Ignore};actorLine.AddChild(cell);
            var b=Button(cell,"actor-"+id,"",new(0,8,320,248),()=>SelectActor(row,"actor-"+id),!Blocked);
            b.AddThemeStyleboxOverride("normal",Box("ffffff00",id==selectedTarget?"315849":"bac9ba",id==selectedTarget?3:1));
            if(row.Text("knowledge_profile_id")=="SCN-001/target/ACT02")
            {
                b.AddChild(new TextureRect {ExpandMode=TextureRect.ExpandModeEnum.IgnoreSize,Texture=GD.Load<Texture2D>("res://Assets/Application/diver-placeholder.webp"),Position=new(19,-8),Size=new(282,176),StretchMode=TextureRect.StretchModeEnum.KeepAspectCentered,MouseFilter=MouseFilterEnum.Ignore});
            }
            else Text(b,ActorSymbol(row),new(30,14,260,110),64,Ink).HorizontalAlignment=HorizontalAlignment.Center;
            var band=Panel(b,new(0,128,320,120),id==selectedTarget?"e9eee2":"fcfcf5");
            Text(band,row.Text("display_name"),new(10,2,300,30),20);
            Text(band,$"♡ {row.Number("hp")}   ◒ {row.Number("posture_remaining")}",new(10,32,300,28),18);
            VitalBar(band,new(10,63,300,4),row.Number("hp"),row.Number("max_hp"));
            VitalBar(band,new(10,69,300,4),row.Number("posture_remaining"),row.Number("max_posture"));
            Text(band,$"◇ {row.Obj("defense").Number("guard")}   ϟ {row.Number("crit")}   ≋ {row.Obj("defense").Number("evasion")}",new(10,78,300,28),18);
            var change=actionPreview.Arr("actor_changes").Rows().FirstOrDefault(c=>c.Text("actor_id")==id);
            if(change is not null && !JsonNode.DeepEquals(change["before"],change["after"]))
                Text(band,$"予測 ♡ {change.Obj("after").Number("hp")}  ◒ {change.Obj("after").Number("posture_remaining")}",new(10,106,300,22),16,Gold);
        }
        OrderStrip(e);
        Panel(content,new(24,380,1872,248),"e9eed833");
        var actual=e.Obj("field"); var after=actionPreview.Obj("field_after");
        var field=new List<JsonObject>();
        // 公開された場→手札の属性順を保ち、同じ属性を重複させない（原本のSet順）。
        foreach(var attr in actual.Select(p=>p.Key).Concat(e.Arr("hand").Rows().Select(c=>c.Text("attr"))).Distinct())
        {
            if(actual[attr] is JsonObject placed)
            { var row=placed.Copy();row["consumed"]=actionPreview.Flag("ok")&&!after.Any(x=>x.Value.Text("id")==row.Text("id"));field.Add(row); }
            else if(after[attr] is JsonObject next)
            {var row=next.Copy();row["forecast"]=true;field.Add(row);}
            else field.Add(new JsonObject {["attr"]=attr,["empty"]=true,["id"]="empty-"+attr});
        }
        CardStrip("field",field,new(24,412,1872,216));
        CardStrip("hand",e.Arr("hand").Rows(),new(24,676,1872,228));
        dropZones.Add((new(24,380,1872,248),"field"));
        if(selectedCard!="" && Controls.GetValueOrDefault("card-hand-"+selectedCard) is Control hand)
        {
            float actionX=Mathf.Clamp(hand.GetGlobalRect().Position.X,24,1440);
            Button(content,"preview","予測",new(actionX,920,132,56),()=>{Modal=Modal=="prediction"?"":"prediction";},actionPreview.Flag("ok"));
            Button(content,"play",ActionLabel(),new(actionX+140,920,250,56),()=>{if(Choice() is {} c)Send("play",new(){["choice"]=c.Copy()});},Choice() is not null&&Can("play"));
        }
        var footer=Panel(content,new(24,984,1872,72),"fcfcf5");var self=e.Obj("self");
        Text(footer,$"♡ {self.Number("hp")}    ◒ {self.Number("posture_remaining")}\n◇ {self.Obj("defense").Number("guard")}    ϟ {self.Number("crit")}    ≋ {self.Obj("defense").Number("evasion")}",new(16,0,410,70),18);
        Text(footer,$"手札 {e.Arr("hand").Count}枚　山札 {self.Number("deck_count")}枚　共通回収 {e.Number("pool_count")}枚",new(450,15,1120,42),20);
        Button(footer,"withdraw","撤退",new(1738,8,110,56),()=>OpenModal("withdraw"),Can("withdraw"));
    }

    private void VitalBar(Control parent,Rect2 rect,long value,long maximum)
    {
        parent.AddChild(new ColorRect {Position=rect.Position,Size=rect.Size,Color=new("bac9ba"),MouseFilter=MouseFilterEnum.Ignore});
        parent.AddChild(new ColorRect {Position=rect.Position,Size=new(rect.Size.X*Mathf.Clamp((float)value/Math.Max(1,maximum),0,1),rect.Size.Y),Color=Gold,MouseFilter=MouseFilterEnum.Ignore});
    }
    private void SelectActor(JsonObject row,string controlId)
    {
        selectedTarget=row.Text("id");RefreshAction();
        if(autoDetails)ShowDetail(row,"actor",Controls[controlId].GetGlobalRect().GetCenter());
    }
    private void OrderStrip(JsonObject e)
    {
        var scroll=Scroll(content,"turn-order",new(24,24,1570,56),true);
        var line=new HBoxContainer {CustomMinimumSize=new(0,48)};line.AddThemeConstantOverride("separation",12);scroll.AddChild(line);
        var predicted=actionPreview.Flag("ok");
        var reservations=predicted?actionPreview.Arr("current_reservations_after"):e.Arr("reservations");int index=0;
        foreach(var r in reservations.Rows())
        {
            var id=r.Text("actor_id");var row=e.Obj("actors").Obj(id).Copy();row["id"]=id;
            var cell=new Control{CustomMinimumSize=new(126,48)};line.AddChild(cell);
            var key="order-"+index++;
            var b=Button(cell,key,ActorSymbol(row),new(0,0,44,44),()=>ShowDetail(row,"actor",Controls[key].GetGlobalRect().GetCenter()));
            b.TooltipText=row.Text("display_name")+"の詳細";
            if(row.Text("knowledge_profile_id")=="SCN-001/target/ACT02")
            {b.Text="";b.AddChild(new TextureRect{ExpandMode=TextureRect.ExpandModeEnum.IgnoreSize,Texture=GD.Load<Texture2D>("res://Assets/Application/diver-placeholder.webp"),Position=new(4,4),Size=new(36,36),StretchMode=TextureRect.StretchModeEnum.KeepAspectCentered,MouseFilter=MouseFilterEnum.Ignore});}
            Text(cell,(predicted&&id=="P"?"次 ":"")+"+"+(r.Number("at")-e.Number("now")),new(48,0,76,44),18,new Color("fcfcf5"));
        }
    }

    private string PredictionText()
    {
        if (!actionPreview.Flag("ok")) return "行動を選ぶと予測が表示されます。";
        var actors = View.Obj("exploration").Obj("actors");
        return "行動：" + ActionLabel() + "\n選択した一手の直後まで。続く相手の行動は含みません。"
            + "\n\n対象の変化\n" + string.Join("\n", actionPreview.Arr("actor_changes").Rows().Select(r => actors.Obj(r.Text("actor_id")).Text("display_name") + "　" + "残量 " + r.Obj("before").Number("hp") + " → " + r.Obj("after").Number("hp") + "　体勢 " + r.Obj("before").Number("posture_remaining") + " → " + r.Obj("after").Number("posture_remaining") + "　身構 " + r.Obj("before").Obj("defense").Number("guard") + " → " + r.Obj("after").Obj("defense").Number("guard")))
            + "\n\n行動後の場\n" + string.Join("、", actionPreview.Obj("field_after").Select(p => CardName((System.Text.Json.Nodes.JsonObject)p.Value!)))
            + "\n\n行動後の順序\n" + string.Join(" → ", actionPreview.Arr("current_reservations_after").Rows().Select(r => actors.Obj(r.Text("actor_id")).Text("display_name") + " " + r.Number("at")));
    }

    private static string ActorText(JsonObject row) => $"{row.Text("remaining_label")} {row.Number("hp")} / {row.Number("max_hp")}\n隠蔽 {row.Number("posture_remaining")} / {row.Number("max_posture")}\n身構 {row.Obj("defense").Number("guard")}　攪乱 {row.Obj("defense").Number("evasion")}\n機転 {row.Number("crit")}\n次の行動時刻 {row.Number("next_at")}\n公開された手札枚数 {row.Number("hand_count")}\n山札枚数 {row.Number("deck_count")}\n\n防御の内訳\n" + string.Join("\n", row.Obj("defense").Arr("effects").Rows().Select(e=>$"身構 {e.Number("guard")}・攪乱 {e.Number("evasion")} / 残り {(e["uses"] is null?"制限なし":e.Text("uses"))}"));

    private JsonObject? Choice()
    {
        var choices = View.Obj("exploration").Arr("legal_actions").Rows().Where(c => c.Text("card_id") == selectedCard).ToArray();
        return choices.FirstOrDefault(c => c.Text("target") == selectedTarget) ?? choices.FirstOrDefault(c=>c.Text("target")=="");
    }
    private void RefreshAction()
    {
        actionPreview = new();
        if (Session is not null && Can("preview_action") && Choice() is { } choice)
            actionPreview = Session.PreviewAction(View.Number("revision"), View.Text("view_token"), choice.Copy());
    }
    private void CardStrip(string zone, IEnumerable<JsonObject> rows, Rect2 rect)
    {
        var array=rows.ToArray();var scroll=Scroll(content,"strip-"+zone,rect,true);
        var line=new HBoxContainer {CustomMinimumSize=new(Math.Max(rect.Size.X,array.Length*264-16),208),Alignment=BoxContainer.AlignmentMode.Center};
        line.AddThemeConstantOverride("separation",16);scroll.AddChild(line);
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
        bool compact=rect.Size.Y<100;var d=row["details"] as JsonObject??row;
        if(compact)
        {
            Text(tile,CardName(row),new(8,2,rect.Size.X-88,46),20);
            string info=zone=="offer"||row.Flag("pending")?"着想 "+ViewData.Money(row.Number("price_units")):d["trigger"] is not null?"枠消費 "+d.Number("equipment_cost"):d.Text("attr");
            if(row.Number("display_quantity")>1)info+="　×"+row.Number("display_quantity");
            if(row.Flag("pending"))info+="　◷ 未払い";
            if(row.Flag("locked"))info+="　ロック";
            Text(tile,info,new(8,50,rect.Size.X-88,28),16,Muted);
        }
        else
        {
            // 原本と同じ上88／名称48／効果24／属性28。札名は最大2行、効果は記号＋値。
            Panel(tile,new(0,88,248,120),"fcfcf5");
            if(row.Flag("empty")){Text(tile,d.Text("attr"),new(8,152,232,48),18);return tile;}
            Text(tile,CardSymbol(d),new(0,0,248,88),64).HorizontalAlignment=HorizontalAlignment.Center;
            Text(tile,CardName(row),new(6,94,236,48),18);
            Text(tile,EffectLine(d,zone is "field" or "forecast",selected?.Text("kind") is "guard" or "defense_support"&&selected.Text("attr")==d.Text("attr")),new(6,146,236,24),18);
            Text(tile,d.Text("attr"),new(6,174,50,28),16);
            if(zone=="hand")Text(tile,d.Number("remaining")==1?"今回まで":"あと"+d.Number("remaining")+"行動",new(64,174,178,28),16,d.Number("remaining")==1?new Color("a43827"):Muted).HorizontalAlignment=HorizontalAlignment.Right;
            if(row.Flag("forecast")||row.Flag("consumed"))
                Text(tile,row.Flag("forecast")?"＋ 予測":"使用後に場から離れる",new(4,2,240,24),16,Gold);
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
            if (!verticalSwipe && end == GestureEnd.Tap) TapCard(gestureRow, gestureZone, pointer-grabOffset+grabbedSize/2);
            if (!verticalSwipe && end == GestureEnd.Drop) DropCard(gestureRow, gestureZone, zone);
            CancelGesture();
            renderNeeded = true; GetViewport().SetInputAsHandled();
        }
    }
    private ScrollContainer? GestureScroll() => Controls.GetValueOrDefault(Screen == "preparation" ? "prep-" + preparationTab + "-" + gestureZone : "strip-" + gestureZone) as ScrollContainer;
    private void AutoScroll()
    {
        if (gesture.Mode != GestureMode.Dragging || GestureScroll() is not { } scroll) return;
        var r = scroll.GetGlobalRect();
        if (Screen == "preparation") { if (pointer.Y > r.End.Y - 24) scroll.ScrollVertical += 9; if (pointer.Y < r.Position.Y + 24) scroll.ScrollVertical -= 9; }
        else { if (pointer.X > r.End.X - 50) scroll.ScrollHorizontal += 10; if (pointer.X < r.Position.X + 50) scroll.ScrollHorizontal -= 10; }
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
        Modal = "";
        if (from == "hand" && to == "field")
        {
            SelectHand(row);
            // 原本のquick条件を継承。設置以外・消滅する未使用札がある一手は、公開予測を見てから確定する。
            bool loses=View.Obj("exploration").Arr("hand").Rows().Any(c=>c.Flag("consume_on_recover")&&actionPreview.Arr("expired").Strings().Contains(c.Text("id")));
            if (Choice() is { } choice && actionPreview.Flag("ok"))
            {
                if(quickPlace&&actionPreview.Text("mode")=="place"&&!loses)Send("play",new(){["choice"]=choice.Copy()});
                else {detailOrigin=Controls["card-hand-"+selectedCard].GetGlobalRect().GetCenter();Modal="prediction";}
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
        ReadingBackdrop();
        Text(content,"夜潮の排水路",new(24,4,1100,56),24);
        var p=Panel(content,new(24,636,840,360),"f1f1e870");
        StoryReader(p,"scene-reader",new(24,20,792,320),false);
        Button(content,"story-detail","詳細",new(24,1018,112,56),()=>OpenModal("story-detail"));
        Button(content,"withdraw","撤退",new(1520,1018,120,56),()=>OpenModal("withdraw"),Can("withdraw"));
        Button(content,"continue","進む",new(1740,1018,156,56),()=>ContinueStory(true),Can("continue_scene"));
    }

    private void StoryReader(Control parent, string id, Rect2 rect, bool optional)
    {
        var scroll = Scroll(parent, id, rect, false); var list = new VBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill }; list.AddThemeConstantOverride("separation", 22); scroll.AddChild(list);
        foreach (var row in View.Obj("story").Arr("texts").Rows().Where(t => optional ? t.Text("kind") == "detail" : t.Text("kind") != "detail"))
        {
            var label = new Label { Text = row.Text("short_text"), CustomMinimumSize = new(rect.Size.X - 30, 0), AutowrapMode = TextServer.AutowrapMode.WordSmart, MouseFilter = MouseFilterEnum.Ignore };
            label.AddThemeFontSizeOverride("font_size", 20); label.AddThemeConstantOverride("line_spacing",10); list.AddChild(label); visibleParagraphs.Add((label, scroll, row.Text("id")));
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
        void Arrow(Rect2 start, Rect2 end)
        {
            var direction = (end.GetCenter()-start.GetCenter()).Normalized();
            float Edge(Rect2 r)=>Math.Min(Math.Abs(direction.X)<.001f?float.MaxValue:r.Size.X/2/Math.Abs(direction.X),Math.Abs(direction.Y)<.001f?float.MaxValue:r.Size.Y/2/Math.Abs(direction.Y));
            var from=start.GetCenter()+direction*(Edge(start)+8);var to=end.GetCenter()-direction*(Edge(end)+8);
            surface.DrawLine(from, to, Gold, 4, true); surface.DrawLine(to, to - direction.Rotated(.5f) * 20, Gold, 4, true); surface.DrawLine(to, to - direction.Rotated(-.5f) * 20, Gold, 4, true);
        }
        if (showRelations && selectedCard != "" && Controls.TryGetValue("card-hand-" + selectedCard, out var hand) && Choice() is { } choice)
        {
            var target = Controls.GetValueOrDefault("actor-" + choice.Text("target"));
            var matching = View.Obj("exploration").Obj("field").FirstOrDefault(p => p.Key == View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(c => c.Text("id") == selectedCard)?.Text("attr")).Value;
            var fieldControl = matching is null ? Controls.Values.OfType<CardTile>().FirstOrDefault(c=>c.Zone=="forecast") : Controls.GetValueOrDefault("card-field-" + matching.Text("id"));
            var fieldRect=fieldControl?.GetGlobalRect()??new Rect2(940,500,40,40);
            Arrow(hand.GetGlobalRect(),fieldRect);
            if (target is not null) Arrow(fieldRect,target.GetGlobalRect());
        }
        if (allowDrag && gesture.Mode == GestureMode.Pending && !verticalSwipe && Time.GetTicksMsec() - gestureStarted >= 120)
        {
            var cue=new Vector2(Mathf.Clamp(pointer.X+36,36,1630),Mathf.Clamp(pointer.Y,36,1030));
            surface.DrawArc(cue,16,-.5f*Mathf.Pi,(float)((Time.GetTicksMsec()-gestureStarted)/holdMilliseconds*2*Math.PI)-.5f*Mathf.Pi,32,Gold,3,true);
            var legal=View.Obj("exploration").Arr("legal_actions").Rows().Where(r=>r.Text("card_id")==gestureRow.Text("id"));
            surface.DrawString(font,cue+new Vector2(24,6),gestureZone=="hand"?ActionLabel(gestureRow,legal.FirstOrDefault(r=>r.Text("target")==selectedTarget)??legal.FirstOrDefault()):"移動",fontSize:18,modulate:Gold);
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
    public override void _Draw()
    {
        DrawRect(new(Vector2.Zero, Size), new Color(Row.Flag("empty")?"dce6d122":Size.Y<100?"fcfcf5":"c9d8c5"));
        var border=new Color(Selected||Linked||Row.Flag("pending")||Row.Flag("forecast")?"315849":"bac9ba");
        if(Row.Flag("pending")||Row.Flag("forecast"))
        {
            // 破線は状態の違い。予測札も未払い札も通常の確定個体と混同しない。
            for(float x=0;x<Size.X;x+=14){DrawLine(new(x,1),new(Math.Min(x+8,Size.X),1),border,2);DrawLine(new(x,Size.Y-1),new(Math.Min(x+8,Size.X),Size.Y-1),border,2);}
            for(float y=0;y<Size.Y;y+=14){DrawLine(new(1,y),new(1,Math.Min(y+8,Size.Y)),border,2);DrawLine(new(Size.X-1,y),new(Size.X-1,Math.Min(y+8,Size.Y)),border,2);}
        }
        else DrawRect(new(Vector2.Zero,Size),border,false,Selected||Linked?4:2);
    }
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
