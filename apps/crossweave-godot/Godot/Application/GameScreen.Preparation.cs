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

    private void Stage(JsonObject offer) => EditPlan(p =>
    {
        if (!p.Arr("acquire").Strings().Contains(offer.Text("id"))) p.Arr("acquire").Add(offer.Text("id"));
    });
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
        Button(content, "home", "戻る", new(24, 18, 190, 54), () => Screen = "home");
        Button(content, "tab-card", "札", new(240, 18, 164, 54), () => { preparationTab = "card"; Modal = ""; });
        Button(content, "tab-passive", "心得", new(420, 18, 164, 54), () => { preparationTab = "passive"; Modal = ""; });
        string money = "着想  " + ViewData.Money(View.Obj("home").Obj("economy").Number("unspent_units"));
        if (DraftDirty) money += "  →  " + (Comparison.Flag("ok") ? ViewData.Money(Comparison.Obj("payment").Number("unspent_after_units")) : "—");
        Text(content, money, new(820, 20, 630, 55), 27, Gold);
        // 了承済み三領域と共通352×80の札枠。列ごとの内部スクロールだけを許可する。
        string[] zones = ["offer", "reserve", "build"], labels = ["取得可能", "所持", "編成"];
        float[] xs = [25, 413, 1160], widths = [376, 735, 735];
        var projected = ProjectedOwned();
        for (int i = 0; i < zones.Length; i++)
        {
            var zone = zones[i]; var panel = Panel(content, new(xs[i], 92, widths[i], 878));
            Text(panel, labels[i], new(14, 12, widths[i] - 28, 48), 28, Gold);
            var scroll = Scroll(panel, "prep-" + zone, new(4, 72, widths[i] - 8, 792), false);
            dropZones.Add((new(xs[i], 92, widths[i], 878), zone));
            var grid = new GridContainer { Columns = i == 0 ? 1 : 2, SizeFlagsHorizontal = SizeFlags.ExpandFill };
            grid.AddThemeConstantOverride("h_separation", 8); grid.AddThemeConstantOverride("v_separation", 8); scroll.AddChild(grid);
            IEnumerable<JsonObject> rows = zone == "offer" ? View.Obj("home").Arr("acquisition").Rows().Where(r => !Plan.Arr("acquire").Strings().Contains(r.Text("id")))
                : zone == "build" ? Plan.Obj("composition").Arr(preparationTab == "card" ? "deck" : "equipment").Strings().Select(id => projected.FirstOrDefault(r => r.Text("id") == id)).OfType<JsonObject>()
                : projected.Where(r => !Composed(r));
            rows = rows.Where(r => r.Obj("blueprint").Text("kind") == preparationTab);
            if (zone == "reserve")
                rows = rows.GroupBy(r => r.Obj("blueprint").Text("key") + "|" + r.Flag("pending") + "|" + r.Flag("locked") + "|" + r.Flag("conversion_available"))
                    .Select(g => { var representative = g.First().Copy(); representative["display_quantity"] = g.Count(); return representative; });
            // 同性能の所持をまとめても送信するのは代表一個体の公開ID。移動すると次の個体が代表になる。
            // 未払い／ロック／変換可否が違うものは、操作の意味が隠れないよう別行にする。
            int count = 0;
            foreach (var row in rows)
            {
                var unit = row.Copy(); var tile = new Control { CustomMinimumSize = new(352, 80), MouseFilter = MouseFilterEnum.Ignore }; grid.AddChild(tile);
                MakeTile(tile, "item-" + zone + "-" + row.Text("id"), unit, new(0, 0, 272, 80), zone);
                var verb = zone == "offer" ? "取得" : zone == "build" ? "外す" : "編成";
                Button(tile, verb + "-" + row.Text("id"), verb, new(277, 10, 74, 58), () => { if (zone == "offer") Stage(unit); else Compose(unit, zone == "reserve"); }, Can("commit_preparation")); count++;
            }
            if (count == 0)
            {
                var message = new Label { Text = zone == "offer" ? (View.Obj("home").Obj("offers").Text("status") == "purchased" ? "今回の取得は完了" : "取得できる候補はありません") : "ここにはありません", CustomMinimumSize = new(300, 100), AutowrapMode = TextServer.AutowrapMode.WordSmart };
                grid.AddChild(message);
            }
        }
        string capacity = Comparison.Flag("ok") ? $"札組 {Comparison.Obj("deck").Number("size")}枚　心得 {Comparison.Obj("equipment").Number("used")} / {Comparison.Obj("equipment").Number("capacity")} 枠" : ViewData.Explain(Comparison.Text("error"));
        Text(content, capacity, new(32, 972, 1200, 44), 22, Comparison.Flag("ok") ? Muted : Gold);
        Button(content, "discard", "戻す", new(1270, 988, 190, 62), () =>
        {
            if (View.Obj("draft").Flag("dirty")) Send("discard_draft");
            else { Plan = View.Obj("draft").Obj("plan").Copy(); RefreshComparison(); LastCommand = null; }
        }, DraftDirty && !Blocked);
        Button(content, "review", "確認する", new(1484, 988, 408, 62), () => { RefreshComparison(); Modal = "review"; }, DraftDirty && Can("commit_preparation"));
    }

    private string ReviewText()
    {
        string warning = Comparison.Flag("ok") ? "" : ViewData.Explain(Comparison.Text("error")) + "\n\n";
        var pay = Comparison.Obj("payment");
        string balance = Comparison.Flag("ok") ? $"着想 {ViewData.Money(pay.Number("unspent_before_units"))} → {ViewData.Money(pay.Number("unspent_after_units"))}　支払い {ViewData.Money(pay.Number("cost_units"))}\n\n" : "金額は現在の案では確定できません。\n\n";
        var projected = ProjectedOwned();
        return warning + balance + "取得するもの\n" + string.Join("、", projected.Where(r => r.Flag("pending")).Select(CardName).DefaultIfEmpty("なし"))
            + "\n\n確定後の札組\n" + string.Join("、", Plan.Obj("composition").Arr("deck").Strings().Select(id => CardName(projected.FirstOrDefault(r => r.Text("id") == id) ?? new())))
            + "\n\n確定後の心得\n" + string.Join("、", Plan.Obj("composition").Arr("equipment").Strings().Select(id => CardName(projected.FirstOrDefault(r => r.Text("id") == id) ?? new())).DefaultIfEmpty("なし"));
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
        detail = row.Copy(); detailKey = key; detailKind = kind; detailId = row.Text("id"); detailOrigin = origin; Modal = "detail";
    }

    private void DetailWindow()
    {
        bool actor = detailKind == "actor"; float width = actor ? 416 : 520, height = actor ? 384 : 480;
        float x = detailOrigin.X < 960 ? 1920 - width - 16 : 16, y = actor ? 84 : 380;
        var p = Panel(popup, new(x, y, width, height), "142b32ed"); p.MouseFilter = MouseFilterEnum.Stop;
        Controls["detail-panel"] = p;
        Text(p, actor ? detail.Text("display_name") : (detailKind == "forecast" ? "予測 · " : "") + CardName(detail), new(20, 12, width - 95, 65), 25, Gold);
        Button(p, "detail-close", "×", new(width - 66, 12, 48, 48), () => Modal = "");
        string value = actor ? ActorText(detail) : ItemText(detail);
        LongText(p, "detail-body", value, new(20, 82, width - 40, height - 170), 22);
        if (detailKind is "offer") Button(p, "detail-stage", "取得", new(22, height - 72, 190, 52), () => { Stage(detail); Modal = ""; }, Can("commit_preparation"));
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

    private static string ItemText(JsonObject row)
    {
        var d = row["details"] as JsonObject ?? row;
        if (d["trigger"] is not null) return $"発動条件\n{d.Text("trigger_text")}\n\n効果\n{d.Text("effect_text")}\n\n枠消費 {d.Number("equipment_cost")}";
        string power = d.Text("kind") switch { "guard" => "身構", "heal" => "回復", _ => "突破" };
        string extra = d["defense_grant"] is JsonObject grant ? $"\n全員へ 身構 {grant.Number("guard")}・攪乱 {grant.Number("evasion")}" : "";
        return $"属性 {d.Text("attr")}\n{power} {d.Number("power")}　探査 {d.Number("hit")}\n攪乱 {d.Number("evasion")}　機転 {d.Number("crit_gain")}\n使用期限 {d.Number("life")}\n行動間隔　設置 {d.Number("place_cost")} / 一致 {d.Number("match_cost")}\n\n場の効果\n突破／身構 {d.Number("field_power")}\n探査／攪乱 {d.Number("field_hit")}" + extra + (d.Flag("consume_on_recover") ? "\n回収時、この探索では消滅します。" : "")
            + (row.Flag("pending") ? "\n\n取得予定・未払い" : "") + (row["conversion_reasons"] is JsonArray reasons && reasons.Count > 0 ? "\n\n" + string.Join("\n", reasons.Strings().Select(ViewData.Explain)) : "");
    }
}
