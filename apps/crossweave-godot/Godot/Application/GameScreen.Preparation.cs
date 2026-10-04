using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// 本作の準備画面。PlanはUI内の未払い編集案、ViewはCoreが確定した公開状態。
/// 取得・移動・取消ではPlanだけを変え、PreviewPreparationへ丸ごと渡す。
/// 確認窓の確定だけが保存を伴う。価格・枠消費・変換可否は公開結果を表示する。
/// </summary>
public partial class GameScreen
{
    private JsonObject conversionQuote = new();
    private static string CardName(JsonObject row)
    {
        var d = row["details"] as JsonObject ?? row;
        return d.Text("name") is { Length: > 0 } name ? name : "観測した札";
    }
    private JsonObject[] ProjectedOwned()
    {
        // 未払い行は既に公開された候補とpending_selection_idから表示するだけ。
        // 予測が不成立（例：札組を一枚外した途中）でも、編集内容を補充・破棄しない。
        var result = View.Obj("home").Arr("owned").Rows().Select(r => r.Copy()).ToList();
        foreach (var offer in View.Obj("home").Arr("acquisition").Rows().Where(r => Plan.Arr("acquire").Strings().Contains(r.Text("id"))))
        {
            var row = offer.Copy(); row["offer_id"] = offer.Text("id"); row["id"] = offer.Text("pending_selection_id"); row["pending"] = true; result.Add(row);
        }
        return result.ToArray();
    }
    private string CompositionKey(JsonObject row) => row.Obj("blueprint").Text("kind") == "passive" ? "equipment" : "deck";
    private bool Composed(JsonObject row) => Plan.Obj("composition").Arr(CompositionKey(row)).Strings().Contains(row.Text("id"));

    private void Stage(JsonObject offer)
    {
        // 公開group_limitを全入口で共有する。上限超過ではPlanもComparisonも変えない。
        if(!CanStage(offer))return;
        EditPlan(p=>p.Arr("acquire").Add(offer.Text("id")));
    }
    private void Unstage(JsonObject row) => EditPlan(p =>
    {
        p["acquire"] = ViewData.Array(p.Arr("acquire").Strings().Where(s => s != row.Text("offer_id")));
        foreach (var key in new[] { "deck", "equipment" }) p.Obj("composition")[key] = ViewData.Array(p.Obj("composition").Arr(key).Strings().Where(s => s != row.Text("id")));
    });
    private void Compose(JsonObject row, bool add) => EditPlan(p =>
    {
        var key = CompositionKey(row); var ids = p.Obj("composition").Arr(key).Strings().ToList();
        if (add && !ids.Contains(row.Text("id"))) ids.Add(row.Text("id")); else if (!add) ids.Remove(row.Text("id"));
        p.Obj("composition")[key] = ViewData.Array(ids);
    });

    private void PreparationScreen()
    {
        Surface(content,new(0,0,InnerWidth,InnerHeight),"f1f1e8");
        Surface(content,new(0,63,InnerWidth,1),Line);
        IconButton(content,"home","ArrowLeft","戻る",new(24,4,102,56),()=>Screen="home");
        foreach(var (key,label,x,width) in new[]{("card","札",142f,64f),("passive","心得",214f,88f)})
        {
            var tab=Button(content,"tab-"+key,label,new(x,0,width,64),()=>{preparationTab=key;Modal="";});
            bool selected=preparationTab==key;
            ButtonStyle(tab,selected?"315849":"fcfcf5","bac9ba",selected?"fffef5":"243d35",0,0);
            tab.AddThemeFontSizeOverride("font_size",24);
        }
        PreparationWallet();
        string[] zones=["offer","reserve","build"],labels=["取得可能","所持","編成"];
        float[] xs=[16,412,1167],widths=[376,735,735];
        var projected=ProjectedOwned();
        for(int i=0;i<3;i++)
        {
            string zone=zones[i];float x=xs[i],width=widths[i];
            // 見出し32pxは囲いの外。main padding16→gap8→grid padding2の順に積む。
            var area=new Rect2(x,120,width,878);
            if(zone=="reserve")
            {
                var panel=Surface(content,area,"e8eddf","bac9ba",0,8);
                var style=Box("e8eddf","bac9ba",0,8);style.CornerRadiusTopLeft=style.CornerRadiusTopRight=0;
                style.BorderWidthLeft=style.BorderWidthRight=1;style.BorderWidthBottom=4;panel.AddThemeStyleboxOverride("panel",style);
            }
            else if(zone=="build")Surface(content,area,"dce6d2","b3c4a4",1,6);
            else Surface(content,new(x,996,width,2),"bdb69a");
            var scroll=Scroll(content,"prep-"+preparationTab+"-"+zone,new(x+2,122,width-4,874),false);
            dropZones.Add((new(x+1,121,width,878),zone));
            var grid=new GridContainer{Columns=i==0?1:2,SizeFlagsHorizontal=SizeFlags.ExpandFill};
            grid.AddThemeConstantOverride("h_separation",8);grid.AddThemeConstantOverride("v_separation",8);scroll.AddChild(grid);
            IEnumerable<JsonObject> rows=zone=="offer"?View.Obj("home").Arr("acquisition").Rows():zone=="build"?Plan.Obj("composition").Arr(preparationTab=="card"?"deck":"equipment").Strings().Select(id=>projected.FirstOrDefault(r=>r.Text("id")==id)).OfType<JsonObject>():projected.Where(r=>!Composed(r));
            rows=rows.Where(r=>r.Obj("blueprint").Text("kind")==preparationTab);
            if(zone=="reserve")rows=rows.GroupBy(r=>r.Obj("blueprint").Text("key")+"|"+r.Flag("pending")+"|"+r.Flag("locked")+"|"+r.Flag("conversion_available")).Select(g=>{var row=g.First().Copy();row["display_quantity"]=g.Count();return row;});
            int count=0,rowCount=0;
            foreach(var row in rows)
            {
                rowCount++;var unit=row.Copy();var cell=new Control{CustomMinimumSize=new(352,80),MouseFilter=MouseFilterEnum.Ignore};grid.AddChild(cell);
                if(zone=="offer"&&Plan.Arr("acquire").Strings().Contains(row.Text("id")))
                {Surface(cell,new(0,77,352,3),"c4c2ac");Icon(cell,"ArrowRight",new(164,28,24,24),Muted);continue;}
                var tile=MakeTile(cell,"item-"+zone+"-"+row.Text("id"),unit,new(0,0,352,80),zone);
                var verb=zone=="offer"?"取得":zone=="build"?"外す":"編成";
                var action=Button(tile,verb+"-"+row.Text("id"),verb,new(278,2,72,76),()=>{if(zone=="offer")Stage(unit);else Compose(unit,zone=="reserve");},zone=="offer"?CanStage(unit):Can("commit_preparation"));
                ButtonStyle(action,zone=="build"?"f5f7ee":"315849","bac9ba",zone=="build"?"243d35":"fffef5",0,0);
                Surface(tile,new(277,2,1,76),"bac9ba");
                count+=(int)Math.Max(1,row.Number("display_quantity"));
            }
            string amount=zone=="build"?(preparationTab=="card"?Plan.Obj("composition").Arr("deck").Count+" / 12":Plan.Obj("composition").Arr("equipment").Strings().Sum(id=>projected.First(r=>r.Text("id")==id).Obj("details").Number("equipment_cost"))+" / "+View.Obj("home").Obj("equipment").Number("capacity")):count.ToString();
            float titleX=x+36;
            if(zone!="offer")Icon(content,zone=="reserve"?"Layers":"LayoutGrid",new(x,84,24,24));
            var title=Text(content,labels[i],new(titleX,80,96,32),24);Strong(title);
            Text(content,amount,new(titleX+108,80,160,32),20,Muted);
            if(zone=="build"&&preparationTab=="card")for(int n=Plan.Obj("composition").Arr("deck").Count;n<12;n++)EmptyAcquisition(grid,"Plus");
            if(rowCount==0&&zone!="build")
            {
                if(zone=="offer")
                {
                    var cell=new Control{CustomMinimumSize=new(352,80),MouseFilter=MouseFilterEnum.Ignore};grid.AddChild(cell);
                    bool done=View.Obj("home").Obj("offers").Text("status")=="purchased";
                    Icon(cell,done?"CircleCheck":"Inbox",new(12,28,24,24),Muted);
                    var label=Text(cell,done?"今回の取得は完了":"取得できる"+(preparationTab=="card"?"札":"心得")+"はありません",new(48,12,292,56),20,Muted);LineHeight(label,20,28);
                }
                else EmptyAcquisition(grid,"Layers");
            }
        }
        Surface(content,new(0,1014,InnerWidth,64),"e9eee0");Surface(content,new(0,1014,InnerWidth,1),Line);
        Icon(content,View.Obj("home").Obj("offers").Text("status")=="purchased"?"CircleCheck":"Store",new(24,1034,24,24),Muted);
        Text(content,PurchaseTrack(),new(60,1014,380,64),22);
        if(DraftDirty){var token=Surface(content,new(450,1027,70,36),"f5eedb","846838",1,4);Icon(token,"Clock3",new(6,9,18,18),UiColor("846838"));Text(token,Plan.Arr("acquire").Count.ToString(),new(28,0,36,36),22);}
        // 枠は編成見出しと確認表へ置く。原本footerの取得群・未払い・取消・確認の密度を保つ。
        if(!Comparison.Flag("ok"))Text(content,ViewData.Explain(Comparison.Text("error")),new(560,1014,800,64),22,UiColor("883e20"));
        var discard=IconButton(content,"discard","Undo2","戻す",new(1640,1014,120,64),()=>{if(View.Obj("draft").Flag("dirty"))Send("discard_draft");else{Plan=View.Obj("draft").Obj("plan").Copy();RefreshComparison();LastCommand=null;}},DraftDirty&&!Blocked);
        var review=Button(content,"review","確認する",new(1768,1014,128,64),()=>{RefreshComparison();Modal="review";},DraftDirty&&Can("commit_preparation"));
        ButtonStyle(discard,"fcfcf5","bac9ba","243d35",0,0);ButtonStyle(review,"315849","315849","fffef5",0,0);
        discard.AddThemeFontSizeOverride("font_size",22);review.AddThemeFontSizeOverride("font_size",22);
    }
    private void EmptyAcquisition(Control grid,string icon)
    {
        if(icon is "CircleCheck" or "Inbox")
        {
            var message=new Control{CustomMinimumSize=new(352,80),MouseFilter=MouseFilterEnum.Ignore};grid.AddChild(message);
            Icon(message,icon,new(12,28,24,24),Muted);
            Text(message,icon=="CircleCheck"?"今回の取得は完了":"取得できる"+(preparationTab=="card"?"札":"心得")+"はありません",new(48,12,292,56),20,Muted);
        }
        else
        {
            var cell=new CardTile{Screen=this,Row=new(){["empty"]=true},CustomMinimumSize=new(352,80),Size=new(352,80),MouseFilter=MouseFilterEnum.Ignore};grid.AddChild(cell);
            Icon(cell,icon,new(164,28,24,24),Muted).Modulate=new(Muted.R,Muted.G,Muted.B,.6f);
        }
    }
    private void PreparationWallet()
    {
        var home=View.Obj("home");string current=ViewData.Money(home.Obj("economy").Number("unspent_units"));
        string after=Comparison.Flag("ok")?ViewData.Money(Comparison.Obj("payment").Number("unspent_after_units")):"—";
        float extra=DraftDirty?font.GetStringSize(after,fontSize:24).X+88:0;
        float currentWidth=font.GetStringSize(current,fontSize:24).X;float x=1662-currentWidth-extra-92;
        Icon(content,"Lightbulb",new(x,20,24,24));Text(content,"着想",new(x+32,0,52,64),24);Strong(Text(content,current,new(x+92,0,currentWidth,64),24));
        if(DraftDirty)
        {Icon(content,"ArrowRight",new(x+100+currentWidth,20,24,24));var next=Surface(content,new(x+132+currentWidth,14,extra-40,36),"ffffff00","bac9ba",0,5);next.AddChild(new AcceptedDashedBorder{Size=next.Size,Border=UiColor("bac9ba"),MouseFilter=MouseFilterEnum.Ignore});Icon(next,"Clock3",new(8,9,18,18));Strong(Text(next,after,new(31,0,extra-73,36),24));}
    }

    private string ReviewText()
    {
        return PreparationSummary();
    }

    private string ConversionText()
    {
        conversionQuote = Session!.QuoteConversion(View.Number("revision"), View.Text("view_token"), ViewData.Array([detailId]));
        return CardName(detail) + "\n\n" + (conversionQuote.Flag("ok") ? $"この個体を手放します。\n着想 +{ViewData.Money(conversionQuote.Number("units"))}\n残高 {ViewData.Money(conversionQuote.Number("unspent_before_units"))} → {ViewData.Money(conversionQuote.Number("unspent_after_units"))}" : ViewData.Explain(conversionQuote.Text("error")));
    }

    private void ShowDetail(JsonObject row, string kind, Vector2 origin)
    {
        string key = kind + row.Text("id");
        if (Modal == "detail" && detailKey == key) { Modal = ""; detailKey = ""; return; }
        detail = row.Copy(); detailKey = key; detailKind = kind; detailId = row.Text("id"); detailOrigin = origin; Modal = "detail";windowPinned=true;
    }

    private void DetailWindow()=>AcceptedDetailWindow();

    private string ItemText(JsonObject row,bool contextual=false)
    {
        var d = row["details"] as JsonObject ?? row;
        if (d["trigger"] is not null) return $"発動条件\n{d.Text("trigger_text")}\n\n効果\n{d.Text("effect_text")}\n\n枠消費 {d.Number("equipment_cost")}";
        string power = d.Text("kind") switch { "guard" => "身構", "heal" => "回復", _ => "突破" };
        string extra = d["defense_grant"] is JsonObject grant ? $"\n使用者以外の活動中の全主体へ 身構 {grant.Number("guard")}・攪乱 {grant.Number("evasion")}\n同じ発生源の付与は張り直し\n防御の回数：{(grant.ContainsKey("uses")?grant["uses"] is null?"制限なし":grant.Text("uses")+"回":"未公開")}" : "";
        if(d.Text("kind")=="guard")extra+="\n防御の回数："+(d.ContainsKey("defense_uses")?d["defense_uses"] is null?"制限なし":d.Text("defense_uses")+"回":"未公開");
        if(contextual&&View.Obj("exploration").Obj("field")[d.Text("attr")] is JsonObject field&&d.Text("kind")!="heal")
            extra+="\n\n現在の場の加算（"+CardName(field)+"）\n"+(d.Text("kind") is "guard" or "defense_support"?"身構 ":"突破 ")+Signed(field.Number("field_power"))+" ／ "+(d.Text("kind") is "guard" or "defense_support"?"攪乱 ":"探査 ")+Signed(field.Number("field_hit"))+"\n上記の基礎値と分けた場の寄与です。";
        string recovery=row.Flag("doomed")?"\n回収時、この探索では消滅します（元の主体が離脱）。":row.Text("birth")=="filler"?"\n補充由来：回収時、この探索では消滅します。":d.Flag("consume_on_recover")?"\n回収時、この探索では消滅します。":"";
        return $"属性 {d.Text("attr")}\n基礎値：{power} {d.Number("power")}　探査 {d.Number("hit")}\n攪乱 {d.Number("evasion")}　機転 {d.Number("crit_gain")}\n使用期限 {d.Number("life")}\n行動間隔　設置 {d.Number("place_cost")} / 一致 {d.Number("match_cost")}\n\n場に置くと\n突破／身構 {d.Number("field_power")}\n探査／攪乱 {d.Number("field_hit")}" + extra + recovery
            + (row.Flag("pending") ? "\n\n取得予定・未払い" : "") + (row["conversion_reasons"] is JsonArray reasons && reasons.Count > 0 ? "\n\n" + string.Join("\n", reasons.Strings().Select(ViewData.Explain)) : "");
    }
}
