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
        Panel(content,new(0,0,1920,1080),"f1f1e8");
        Button(content, "home", "← 戻る", new(24, 4, 102, 56), () => Screen = "home");
        var cardTab=Button(content, "tab-card", "札", new(144, 0, 64, 64), () => { preparationTab = "card"; Modal = ""; });
        var passiveTab=Button(content, "tab-passive", "心得", new(216, 0, 88, 64), () => { preparationTab = "passive"; Modal = ""; });
        (preparationTab=="card"?cardTab:passiveTab).AddThemeStyleboxOverride("normal",Box("cfdec8","315849",2));
        string money = "着想  " + ViewData.Money(View.Obj("home").Obj("economy").Number("unspent_units"));
        if (DraftDirty) money += "  →  " + (Comparison.Flag("ok") ? ViewData.Money(Comparison.Obj("payment").Number("unspent_after_units")) : "—");
        Text(content, money, new(1210, 4, 450, 56), 20, Gold).HorizontalAlignment=HorizontalAlignment.Right;
        // 了承済み三領域と共通352×80の札枠。列ごとの内部スクロールだけを許可する。
        string[] zones = ["offer", "reserve", "build"], labels = ["取得可能", "所持", "編成"];
        float[] xs = [25, 413, 1160], widths = [376, 735, 735];
        var projected = ProjectedOwned();
        for (int i = 0; i < zones.Length; i++)
        {
            var zone = zones[i]; var panel = Panel(content, new(xs[i], 76, widths[i], 922),i==0?"f1f1e8":i==1?"e8edde":"dce6d1");
            var scroll = Scroll(panel, "prep-" + preparationTab + "-"+zone, new(2, 48, widths[i] - 4, 872), false);
            dropZones.Add((new(xs[i], 76, widths[i], 922), zone));
            var grid = new GridContainer { Columns = i == 0 ? 1 : 2, SizeFlagsHorizontal = SizeFlags.ExpandFill };
            grid.AddThemeConstantOverride("h_separation", 8); grid.AddThemeConstantOverride("v_separation", 8); scroll.AddChild(grid);
            IEnumerable<JsonObject> rows = zone == "offer" ? View.Obj("home").Arr("acquisition").Rows()
                : zone == "build" ? Plan.Obj("composition").Arr(preparationTab == "card" ? "deck" : "equipment").Strings().Select(id => projected.FirstOrDefault(r => r.Text("id") == id)).OfType<JsonObject>()
                : projected.Where(r => !Composed(r));
            rows = rows.Where(r => r.Obj("blueprint").Text("kind") == preparationTab);
            if (zone == "reserve")
                rows = rows.GroupBy(r => r.Obj("blueprint").Text("key") + "|" + r.Flag("pending") + "|" + r.Flag("locked") + "|" + r.Flag("conversion_available"))
                    .Select(g => { var representative = g.First().Copy(); representative["display_quantity"] = g.Count(); return representative; });
            // 同性能の所持をまとめても送信するのは代表一個体の公開ID。移動すると次の個体が代表になる。
            // 未払い／ロック／変換可否が違うものは、操作の意味が隠れないよう別行にする。
            int count = 0, rowCount = 0;
            foreach (var row in rows)
            {
                rowCount++; var unit = row.Copy(); var tile = new Control { CustomMinimumSize = new(352, 80), MouseFilter = MouseFilterEnum.Ignore }; grid.AddChild(tile);
                // 支払前は移動元の位置を空けたまま印を残す。戻した札で後続候補をずらさない。
                if(zone=="offer"&&Plan.Arr("acquire").Strings().Contains(row.Text("id")))
                { Text(tile,"→ 取得予定",new(12,12,328,56),20,Muted); continue; }
                MakeTile(tile, "item-" + zone + "-" + row.Text("id"), unit, new(0, 0, 352, 80), zone);
                var verb = zone == "offer" ? "取得" : zone == "build" ? "外す" : "編成";
                Button(tile, verb + "-" + row.Text("id"), verb, new(278, 0, 74, 80), () => { if (zone == "offer") Stage(unit); else Compose(unit, zone == "reserve"); }, zone=="offer"?CanStage(unit):Can("commit_preparation")); count+=(int)Math.Max(1,row.Number("display_quantity"));
            }
            string amount=zone=="build"?(preparationTab=="card"?Plan.Obj("composition").Arr("deck").Count+" / 12":Plan.Obj("composition").Arr("equipment").Strings().Sum(id=>projected.First(r=>r.Text("id")==id).Obj("details").Number("equipment_cost"))+" / "+View.Obj("home").Obj("equipment").Number("capacity")):count.ToString();
            Text(panel,labels[i]+"  "+amount,new(16,0,widths[i]-32,46),22,Gold);
            if(zone=="build"&&preparationTab=="card")for(int n=Plan.Obj("composition").Arr("deck").Count;n<12;n++)
            {var empty=new Control{CustomMinimumSize=new(352,80),MouseFilter=MouseFilterEnum.Ignore};grid.AddChild(empty);Text(empty,"＋",new(8,10,336,60),28,Muted).HorizontalAlignment=HorizontalAlignment.Center;}
            if (rowCount == 0 && zone != "build")
            {
                var message = new Label { Text = zone == "offer" ? (View.Obj("home").Obj("offers").Text("status") == "purchased" ? "✓ 今回の取得は完了" : "取得できる"+(preparationTab=="card"?"札":"心得")+"はありません") : "ここにはありません", CustomMinimumSize = new(300, 100), AutowrapMode = TextServer.AutowrapMode.WordSmart };
                grid.AddChild(message);
            }
        }
        string capacity = Comparison.Flag("ok") ? $"札組 {Comparison.Obj("deck").Number("size")}枚　心得 {Comparison.Obj("equipment").Number("used")} / {Comparison.Obj("equipment").Number("capacity")} 枠" : ViewData.Explain(Comparison.Text("error"));
        Text(content, PurchaseTrack()+"   "+capacity, new(32, 1018, 1550, 56), 20, Comparison.Flag("ok") ? Muted : Gold);
        Button(content, "discard", "戻す", new(1640, 1016, 120, 64), () =>
        {
            if (View.Obj("draft").Flag("dirty")) Send("discard_draft");
            else { Plan = View.Obj("draft").Obj("plan").Copy(); RefreshComparison(); LastCommand = null; }
        }, DraftDirty && !Blocked);
        Button(content, "review", "確認する", new(1768, 1016, 128, 64), () => { RefreshComparison(); Modal = "review"; }, DraftDirty && Can("commit_preparation"));
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

    private void DetailWindow()
    {
        bool actor = detailKind == "actor", preparation = detailKind is "offer" or "reserve" or "build";
        float width = preparation ? 960 : actor ? 416 : 520, height = preparation ? 820 : actor ? 384 : 480;
        float x = preparation ? 480 : detailOrigin.X < 960 ? 1920 - width - 16 : 16;
        float y = preparation ? 130 : actor ? 16 : Mathf.Clamp(detailOrigin.Y - 104,16,984-16-height);
        if(preparation)popup.AddChild(new ColorRect{Color=new(0,0,0,.3f),Size=new(1920,1080),MouseFilter=MouseFilterEnum.Stop});
        var p = Panel(popup, new(x, y, width, height), "142b32ed"); p.MouseFilter = MouseFilterEnum.Stop;
        Controls["detail-panel"] = p;
        Text(p, actor ? detail.Text("display_name") : (detailKind == "forecast" ? "予測 · " : "") + CardName(detail), new(20, 12, width - (preparation?95:162), 65), 22, Gold);
        if(!preparation)PinButton(p,width);
        Button(p, "detail-close", "×", new(width - 66, 12, 48, 48), () => Modal = "");
        string value = actor ? ActorText(detail) : ItemText(detail,detailKind=="hand");
        LongText(p, "detail-body", value, new(20, 82, width - 40, height - 170), 22);
        if(actor&&detail.Text("knowledge_profile_id") is {Length:>0} profile)
            Button(p,"actor-record","調査記録",new(20,height-72,width-40,52),()=>{knowledgeSelection=profile;OpenModal("knowledge");});
        if (detailKind is "offer") Button(p, "detail-stage", "取得", new(22, height - 72, 190, 52), () => { Stage(detail); Modal = ""; }, CanStage(detail));
        else if (detailKind is "reserve" or "build")
        {
            Button(p, "detail-compose", detailKind == "build" ? "外す" : "編成", new(22, height - 72, 134, 52), () => { Compose(detail, detailKind != "build"); Modal = ""; }, Can("commit_preparation"));
            if (detail.Flag("pending")) Button(p, "detail-unstage", "取消", new(176, height - 72, 140, 52), () => { Unstage(detail); Modal = ""; }, Can("commit_preparation"));
            else
            {
                Button(p, "lock", detail.Flag("locked") ? "解除" : "ロック", new(168, height - 72, 140, 52), () => Send("set_item_lock", new() { ["item_id"] = detailId, ["locked"] = !detail.Flag("locked") }), Can("set_item_lock") && !DraftDirty);
                Button(p, "convert", "変換", new(320, height - 72, 172, 52), () => Modal = "convert", Can("convert_items") && detail.Flag("conversion_available") && !DraftDirty);
            }
        }
    }

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
