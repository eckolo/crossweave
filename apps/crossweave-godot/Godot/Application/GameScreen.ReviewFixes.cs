using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// UIレビュー追補の表示投影。公開Comparison／Previewだけを読み、戦闘・価格・乱数を計算しない。
/// partialはC#の分割で、既存GameScreenと同じControl・FileGameSessionを使う。
/// </summary>
public partial class GameScreen
{
    private ScrollContainer? blankScroll;
    private Vector2 blankLast;
    private static string Signed(long value)=>value>0?"+"+value:value.ToString();
    private static string Known(JsonNode? node)=>long.TryParse(node?.ToString(),out var n)?n.ToString():"未公開";
    private static JsonNode? StatValue(JsonObject row,string key)=>key is "guard" or "evasion"?row.Obj("defense")[key]:row[key];
    private JsonObject? ActorChange(string id)=>actionPreview.Arr("actor_changes").Rows().FirstOrDefault(r=>r.Text("actor_id")==id);
    private string StatDelta(string id,string key)
    {
        var change=ActorChange(id);if(change is null)return "";
        var before=StatValue(change.Obj("before"),key);var after=StatValue(change.Obj("after"),key);
        // 原本と同じく、隠蔽突破はリセット後の値だけで打撃を隠さない。
        // 既に解決済みのhit_gainを引く表示であり、命中／防御の再演算ではない。
        if(key=="posture_remaining"&&actionPreview.Text("mode")=="attack"&&actionPreview.Text("target")==id)
        {before=actionPreview["posture_before"];after=long.TryParse(before?.ToString(),out var b)&&long.TryParse(actionPreview.Text("hit_gain"),out var h)?JsonValue.Create(b-h):null;}
        if(!long.TryParse(before?.ToString(),out var x)||!long.TryParse(after?.ToString(),out var y))return " (?)";
        return x==y?" (±0)":" ("+Signed(y-x)+")";
    }
    private void ActorVitals(Control parent,string id,JsonObject row,float x,float y,float width)
    {
        Controls["vitals-"+id]=parent;
        void Stat(string key,string icon,Rect2 rect,bool right=false)
        {
            string value=Known(StatValue(row,key)),delta=StatDelta(id,key).Trim(' ','(',')');
            float w=24+font.GetStringSize(value,fontSize:18).X+(delta==""?0:8+font.GetStringSize(delta,fontSize:16).X);
            float left=right?rect.End.X-w:rect.Position.X;
            Icon(parent,icon,new(left,rect.Position.Y+2,20,20));
            var number=Strong(Text(parent,value,new(left+24,rect.Position.Y,w-24,24),18));number.TooltipText=key+" / "+Known(row[key=="hp"?"max_hp":"max_posture"]);number.SetMeta("public_stat",key);
            if(delta!=""){var deltaLabel=Text(parent,delta,new(left+28+font.GetStringSize(value,fontSize:18).X,rect.Position.Y,Math.Max(1,w-28-font.GetStringSize(value,fontSize:18).X),22),16);deltaLabel.SetMeta("forecast_delta",key);}
        }
        Stat("hp","Heart",new(x,y,width/2,24));Stat("posture_remaining","VenetianMask",new(x+width/2,y,width/2,24),true);
        VitalBar(parent,new(x,y+24,width,4),row.Number("hp"),row.Number("max_hp"));
        var bars=new Control{Position=new(x,y+30),Size=new(width,4),Modulate=new(1,1,1,.6f),MouseFilter=MouseFilterEnum.Ignore};parent.AddChild(bars);VitalBar(bars,new(0,0,width,4),row.Number("posture_remaining"),row.Number("max_posture"));
        // CSS space-betweenは3等分セルではなく、実内容幅を引いた残りを二つのgapへ。
        // 予測差分が増えた時も中央項の位置を同じ公開文言の幅から求める。
        float StatWidth(string key) { string value=Known(StatValue(row,key)),delta=StatDelta(id,key).Trim(' ','(',')');return 24+strongFont.GetStringSize(value,fontSize:18).X+(delta==""?0:8+font.GetStringSize(delta,fontSize:16).X); }
        float guardWidth=StatWidth("guard"),critWidth=StatWidth("crit"),evasionWidth=StatWidth("evasion");
        float space=(width-guardWidth-critWidth-evasionWidth)/2;
        Stat("guard","Shield",new(x,y+38,guardWidth,24));Stat("crit","Zap",new(x+guardWidth+space,y+38,critWidth,24));Stat("evasion","Wind",new(x+width-evasionWidth,y+38,evasionWidth,24));
    }
    private string PredictionSummary()
    {
        if(!actionPreview.Flag("ok"))return "行動を選ぶと予測が表示されます。";
        var e=View.Obj("exploration");var actors=e.Obj("actors");var lines=new List<string>{"行動："+ActionLabel(),"次の行動まで "+Known(actionPreview["action_cost"]),"選択した一手の直後まで。続く相手の行動は含みません。"};
        if(actionPreview.Text("mode")=="place")lines.Add("主効果：発動なし");
        if(actionPreview.Text("mode")=="attack")
        {
            lines.Add("対象の余力 −"+Known(actionPreview["actual_hp_loss"]));
            string strike=long.TryParse(actionPreview.Text("posture_before"),out var b)&&long.TryParse(actionPreview.Text("hit_gain"),out var h)?(b-h).ToString():"未公開";
            lines.Add("隠蔽への打撃 "+Known(actionPreview["posture_before"])+" → "+strike+"（探査 "+Known(actionPreview["hit_gain"])+"）");
            if(actionPreview.Flag("hit_connected"))lines.Add("突破後は隠蔽を "+Known(actionPreview["posture_after"])+" へリセット");
        }
        if(actionPreview.Text("mode")=="heal")lines.Add("回復 +"+Known(actionPreview["hp_restored"]));
        if(actionPreview.Text("mode")=="guard")lines.Add("今回の身構 "+Known(actionPreview.Obj("guard")["value"])+"・攪乱 "+Known(actionPreview.Obj("guard")["evasion"]));
        if(actionPreview.Text("mode")=="defense_support")lines.Add("付与対象：使用者以外の活動中の全主体（同じ発生源は張り直し）");
        var changes=new List<string>();
        string[] keys=["hp","posture_remaining","guard","crit","evasion"],terms=["余力","隠蔽","身構","機転","攪乱"];
        foreach(var change in actionPreview.Arr("actor_changes").Rows())
        {
            var values=new List<string>();
            for(int i=0;i<keys.Length;i++)
            {
                var before=StatValue(change.Obj("before"),keys[i]);var after=StatValue(change.Obj("after"),keys[i]);
                if(before is null||after is null){values.Add(terms[i]+" 未公開");continue;}
                if(!JsonNode.DeepEquals(before,after))values.Add(terms[i]+" "+Known(before)+" → "+Known(after));
            }
            if(change.Obj("before").Flag("active")&&!change.Obj("after").Flag("active"))values.Add("離脱");
            if(values.Count>0)changes.Add(actors.Obj(change.Text("actor_id")).Text("display_name")+"："+string.Join("、",values));
        }
        lines.Add("\n状態の変化\n"+(changes.Count>0?string.Join("\n",changes):"変化なし"));
        lines.Add("一閃倍率・軽減の予測値：未公開");
        var expiry=actionPreview.Arr("unused_hand_expiry").Rows().Where(r=>r.Flag("expires")).ToArray();
        if(expiry.Length>0)lines.Add("\n期限切れ\n"+string.Join("\n",expiry.Select(r=>CardName(e.Arr("hand").Rows().First(c=>c.Text("id")==r.Text("id")))+" → "+(r.Text("destination")=="destroyed"?"消滅":"共通回収"))));
        lines.Add("\n行動後の場\n"+string.Join("、",actionPreview.Obj("field_after").Select(p=>CardName((JsonObject)p.Value!))));
        lines.Add("\n行動後の予約\n本人・今\n"+OrderText()+"\n本人の次回位置："+SelfPosition());
        return string.Join("\n",lines);
    }
    // 同時刻内の順は推定せず、公開予約を時刻でまとめる。乱数ストリームへアクセスしない。
    private IEnumerable<IGrouping<long,JsonObject>> ReservationGroups()=>
        (actionPreview.Flag("ok")?actionPreview.Arr("current_reservations_after"):View.Obj("exploration").Arr("reservations")).Rows().GroupBy(r=>r.Number("at")).OrderBy(g=>g.Key);
    private string SelfPosition()
    {
        if(!actionPreview.Flag("ok"))return "";int before=0;
        foreach(var group in ReservationGroups())
        {if(group.Any(r=>r.Text("actor_id")=="P"))return group.Count()==1?(before+1).ToString():(before+1)+"〜"+(before+group.Count());before+=group.Count();}
        return "未公開";
    }
    private string OrderText()=>string.Join("\n",ReservationGroups().Select(g=>"+"+(g.Key-View.Obj("exploration").Number("now"))+"　"+(g.Count()>1?"同時刻［":"")+string.Join(" ／ ",g.Select(r=>View.Obj("exploration").Obj("actors").Obj(r.Text("actor_id")).Text("display_name")+(r.Text("actor_id")=="P"?(actionPreview.Flag("ok")?"・次":"・今"):"")))+(g.Count()>1?"］":"")));
    private bool CanStage(JsonObject offer)
    {
        if(!Can("commit_preparation")||Plan.Arr("acquire").Strings().Contains(offer.Text("id")))return false;
        var options=View.Obj("home").Arr("acquisition").Rows().ToArray();
        var publicOffer=options.FirstOrDefault(r=>r.Text("id")==offer.Text("id"));if(publicOffer is null)return false;
        return options.Count(r=>r.Text("group_id")==publicOffer.Text("group_id")&&Plan.Arr("acquire").Strings().Contains(r.Text("id")))<publicOffer.Number("group_limit");
    }
    private string PreparationSummary()
    {
        if(!Comparison.Flag("ok"))return ViewData.Explain(Comparison.Text("error"))+"\n\n金額は現在の案では確定できません。";
        var pay=Comparison.Obj("payment");var current=Comparison.Obj("current");var projected=Comparison.Arr("owned").Rows().ToArray();
        var lines=new List<string>{$"着想 {ViewData.Money(pay.Number("unspent_before_units"))} → {ViewData.Money(pay.Number("unspent_after_units"))}　支払い {ViewData.Money(pay.Number("cost_units"))}","\n取得"};
        var purchases=View.Obj("home").Arr("acquisition").Rows().Where(r=>Plan.Arr("acquire").Strings().Contains(r.Text("id"))).ToArray();
        lines.Add(purchases.Length==0?"なし":string.Join("\n",purchases.Select(r=>CardName(r)+"　着想 "+ViewData.Money(r.Number("price_units"))+" → "+(Plan.Obj("composition").Arr(r.Obj("blueprint").Text("kind")=="passive"?"equipment":"deck").Strings().Contains(r.Text("pending_selection_id"))?"編成":"所持"))));
        var before=current.Arr("owned").Rows().Where(r=>r.Flag("selected")).ToArray();var after=projected.Where(r=>r.Flag("selected")).ToArray();
        var keys=before.Concat(after).Select(r=>r.Obj("blueprint").Text("key")).Distinct();var changed=new List<JsonObject>();var diffs=new List<string>();
        foreach(var key in keys)
        {
            var b=before.Count(r=>r.Obj("blueprint").Text("key")==key);var a=after.Count(r=>r.Obj("blueprint").Text("key")==key);if(a==b)continue;
            var row=before.Concat(after).First(r=>r.Obj("blueprint").Text("key")==key);changed.Add(row);diffs.Add((row.Obj("blueprint").Text("kind")=="passive"?"心得 ":"札 ")+CardName(row)+"　"+b+" → "+a);
        }
        lines.Add("\n編成の数量差分\n"+(diffs.Count>0?string.Join("\n",diffs):"数量の変更なし"));
        lines.Add($"\n札枚数 {current.Obj("deck").Number("size")} → {Comparison.Obj("deck").Number("size")} / 12\n心得枠 {current.Obj("equipment").Number("used")} → {Comparison.Obj("equipment").Number("used")} / {Comparison.Obj("equipment").Number("capacity")}");
        foreach(var row in changed.Where(r=>r.Obj("blueprint").Text("kind")=="passive"))lines.Add("\n"+CardName(row)+"\n"+ItemText(row));
        return string.Join("\n",lines);
    }
    private (bool allowed,string text) DropPlan(JsonObject row,string from,string to)
    {
        if(Busy||Blocked)return(false,"操作できません");
        if(from=="hand"&&to=="field")return(View.Obj("exploration").Arr("legal_actions").Rows().Any(c=>c.Text("card_id")==row.Text("id")),"出札・予測");
        if(Screen!="preparation"||!Can("commit_preparation"))return(false,"対象外");
        if(from=="offer"&&to is "reserve" or "build")return(CanStage(row),CanStage(row)?to=="build"?"取得して編成":"取得して所持":"取得群の上限");
        if(from is "reserve" or "build"&&to is "reserve" or "build")return(from!=to,to=="build"?"編成する":"編成から外す");
        if(to=="offer")return(row.Flag("pending"),row.Flag("pending")?"取得を取り消す":"正式所持は取消できません");
        return(false,"受入できません");
    }
    internal JsonObject DragAcceptance()
    {
        var zone=dropZones.LastOrDefault(z=>z.rect.HasPoint(pointer)).zone??"";var state=DropPlan(gestureRow,gestureZone,zone);
        return new(){["from"]=gestureZone,["to"]=zone,["allowed"]=state.allowed,["label"]=state.text};
    }
    private ScrollContainer? DestinationScroll()
    {
        if(Screen=="exploring")
        {
            // 原本は保持中、pointerがある手札／場の実一覧だけを送る。
            // 手札上の送りはdrop受入とは別で、playや保存を発生させない。
            foreach(string key in new[]{"strip-field","strip-hand"})
                if(Controls.GetValueOrDefault(key)is ScrollContainer list&&list.GetGlobalRect().HasPoint(pointer))return list;
            return null;
        }
        var zone=dropZones.LastOrDefault(z=>z.rect.HasPoint(pointer)).zone;
        return Controls.GetValueOrDefault(Screen=="preparation"?"prep-"+preparationTab+"-"+zone:"strip-"+zone) as ScrollContainer;
    }
    private void PaintDropTargets(Control surface)
    {
        if(gesture.Mode!=Crossweave.Core.GestureMode.Dragging)return;
        // 元の可否判定はDragAcceptance/DropCardと共用。見えている移動先だけを強調する。
        var destination=dropZones.LastOrDefault(z=>z.rect.HasPoint(pointer));if(destination.zone is null)return;
        var (rect,zone)=destination;var status=DropPlan(gestureRow,gestureZone,zone);
        var color=status.allowed?Gold:Muted;
        var overlay=rect.Grow(-2);
        if(status.allowed)surface.DrawStyleBox(Box("ffffff00",Exploring?"345747":"315849",2,Screen=="preparation"?6:8),overlay);
        else DashedRect(surface,overlay,color,1,3,3,Screen=="preparation"?6:8);
        if(Screen!="preparation")return;
        string caption=gestureZone=="offer"?zone=="build"?"取得・編成":"取得":zone=="offer"?"取消":zone=="build"?"編成":"外す";
        var heading=new Rect2(rect.Position.X,81,rect.Size.X,32);
        surface.DrawRect(heading,UiColor("f1f1e8"));float textWidth=strongFont.GetStringSize(caption,fontSize:24).X;
        surface.DrawString(strongFont,new(heading.Position.X+(heading.Size.X-textWidth)/2,105),caption,fontSize:24,modulate:color);
    }
    internal void BlankPointerDown(ScrollContainer scroll,Vector2 point)
    {
        if(Busy||Blocked||gesture.Mode!=Crossweave.Core.GestureMode.Idle||Modal!="")return;
        blankScroll=scroll;blankLast=point; // 左mouseの余白送りは札の短ホールドと別状態。
    }
}

/// <summary>一覧の実ScrollContainer。札が受け取らなかった余白の左mouse入力だけを親へ返す。</summary>
internal partial class ListViewport : ScrollContainer
{
    internal GameScreen Screen=null!;
    public override void _GuiInput(InputEvent input)
    {
        if(input is InputEventMouseButton {Pressed:true,ButtonIndex:MouseButton.Left} mouse)
        {Screen.BlankPointerDown(this,GetGlobalRect().Position+mouse.Position);AcceptEvent();}
    }
}
