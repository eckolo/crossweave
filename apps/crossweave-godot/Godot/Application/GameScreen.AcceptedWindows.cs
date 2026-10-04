using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// 合意案の表・折畳み・親子窓を同じ本編の公開値から組み立てる。
/// VBox/ScrollContainer/CheckBoxはGodot標準。価格・場の加算・観測分類の規則はここで作らない。
/// 閲覧と画面設定は保存操作を送らない。確定ボタンだけ既存Sendへ接続する。
/// </summary>
public partial class GameScreen
{
    private int menuPage;
    private VBoxContainer FactsBody(Control parent, string id, Rect2 rect, float gap = 12)
    {
        // CSSのpaddingは1px borderの内側。外形520に対し内容幅は486となる。
        rect = new(rect.Position + Vector2.One, rect.Size - new Vector2(2, 2));
        var scroll = Scroll(parent, id, rect, false);
        var list = new VBoxContainer { CustomMinimumSize = new(rect.Size.X - 12, 0), SizeFlagsHorizontal = SizeFlags.ExpandFill };
        list.AddThemeConstantOverride("separation", (int)gap); scroll.AddChild(list); return list;
    }
    private Label Paragraph(Control parent, string value, int size = 18, float height = 1.6f, Color? color = null)
    {
        var label = new Label { Text = value, AutowrapMode = TextServer.AutowrapMode.WordSmart, VerticalAlignment = VerticalAlignment.Center, SizeFlagsHorizontal = SizeFlags.ExpandFill, MouseFilter = MouseFilterEnum.Ignore };
        label.AddThemeFontSizeOverride("font_size", size); label.AddThemeColorOverride("font_color", color ?? Ink); LineHeight(label, size, size * height); parent.AddChild(label);
        // 原本layoutProseは窓内pも句点で折る。実Containerの幅が決まってから
        // 同じ文字を改行し、語の意味・公開値を編集しない。
        label.Resized += () =>
        {
            if (label.Size.X <= size) return;
            string lines = ProseLines(value, label.Size.X, size);
            label.AutowrapMode = TextServer.AutowrapMode.Off;
            if (label.Text != lines) label.Text = lines;
            // 末行にもCSSのline boxを確保する。幅の再計算でResizedが再発しても、
            // 同じ最小高を再代入せず、Containerの再配置を循環させない。
            float blockHeight = lines.Split('\n').Length * size * height;
            if (!Mathf.IsEqualApprox(label.CustomMinimumSize.Y, blockHeight))
                label.CustomMinimumSize = new(label.CustomMinimumSize.X, blockHeight);
        };
        return label;
    }
    private void Heading(Control parent, string value)
    { var label = Paragraph(parent, value, 20, 1.4f); Strong(label); label.CustomMinimumSize = new(0, 28); }
    private void Fact(VBoxContainer body, string term, string value, string? symbol = null, float labelWidth = 164)
    {
        var row = new HBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill }; row.SetMeta("fact_columns", true); row.AddThemeConstantOverride("separation", 16); body.AddChild(row);
        var name = new Control { CustomMinimumSize = new(labelWidth, Screen == "preparation" ? 33 : 29), SizeFlagsVertical = SizeFlags.ExpandFill, MouseFilter = MouseFilterEnum.Ignore }; row.AddChild(name);
        if (symbol is not null) Icon(name, symbol, new(0, 4, 20, 20));
        var title = Text(name, term, new(symbol is null ? 0 : 28, 0, labelWidth - (symbol is null ? 0 : 28), Screen == "preparation" ? 33 : 29), Screen == "preparation" ? 20 : 18, Screen == "preparation" ? Muted : Ink); title.VerticalAlignment = VerticalAlignment.Top; LineHeight(title, Screen == "preparation" ? 20 : 18, Screen == "preparation" ? 30 : 28.8f);
        var label = Paragraph(row, value, Screen == "preparation" ? 22 : 18, Screen == "preparation" ? 1.5f : 1.6f); label.SizeFlagsHorizontal = SizeFlags.ExpandFill;
    }
    private void Divider(VBoxContainer body)
    { var line = new ColorRect { Color = UiColor(Line), CustomMinimumSize = new(0, 1), MouseFilter = MouseFilterEnum.Ignore }; body.AddChild(line); }
    private void Ledger(VBoxContainer body, IEnumerable<(string term, string value, string? icons, string? field)> entries)
    {
        // CSSのmax-content列幅は表ごとに決まる。単一の固定164px幅にすると
        // 短いラベルの値が遠ざかり、長い主体名では逆に切れる。
        var rows = entries.ToArray();
        float TermWidth((string term, string value, string? icons, string? field) r) => font.GetStringSize(r.term, fontSize: 16).X + (r.icons is null ? 0 : r.icons.Split('/').Length * 17);
        float width = rows.Length == 0 ? 0 : Math.Min(300, rows.Max(TermWidth));
        var table = new VBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill };
        table.AddThemeConstantOverride("separation", 12); body.AddChild(table);
        foreach (var r in rows)
        {
            var line = new HBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill };
            line.SetMeta("fact_columns", true); line.AddThemeConstantOverride("separation", 16); table.AddChild(line);
            var term = new Control { CustomMinimumSize = new(width, 29), SizeFlagsVertical = SizeFlags.ExpandFill, MouseFilter = MouseFilterEnum.Ignore }; line.AddChild(term);
            float x = 0; var parts = r.term.Split('／'); var icons = r.icons?.Split('/');
            for (int i = 0; i < parts.Length; i++)
            {
                if (i > 0) { Text(term, "／", new(x, 0, 16, 29), 16); x += 16; }
                if (icons is not null && i < icons.Length) { Icon(term, icons[i], new(x, 7, 14, 14)); x += 17; }
                float w = font.GetStringSize(parts[i], fontSize: 16).X;
                Text(term, parts[i], new(x, 0, w, 29), 16); x += w;
            }
            var value = new HBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill }; value.AddThemeConstantOverride("separation", 4); line.AddChild(value);
            Paragraph(value, r.value).SizeFlagsHorizontal = r.field is null ? SizeFlags.ExpandFill : SizeFlags.ShrinkBegin;
            if (r.field is not null)
            {
                // 場の値は既存公開fieldからの表示。基礎値に足して規則を再実装しない。
                var extra = Paragraph(value, "+ " + r.field + "（場）", 16, 1.8f, Muted);
                extra.SetMeta("field_contribution", r.field); extra.SizeFlagsHorizontal = SizeFlags.ExpandFill;
            }
        }
    }
    private void Fold(VBoxContainer body, string key, string title, Action<VBoxContainer> fill)
    {
        float height = Screen == "preparation" ? 64 : 40; var cell = new Control { CustomMinimumSize = new(0, height) }; body.AddChild(cell);
        var b = IconButton(cell, "fold-" + key, expandedFacts.Contains(key) ? "ChevronLeft" : "ChevronRight", title, new(0, 0, body.CustomMinimumSize.X, height), () => { if (!expandedFacts.Add(key)) expandedFacts.Remove(key); });
        ButtonStyle(b, "ffffff00", Line, Exploring ? "263c32" : "243d35", 0, 0);
        // 原本summaryは左寄せ。通常の中央寄せIconButtonと配置だけを分ける。
        foreach (var icon in b.GetChildren().OfType<TextureRect>()) icon.Position = new(0, (height - 20) / 2);
        foreach (var text in b.GetChildren().OfType<Label>()) text.Position = new(28, 0);
        if (expandedFacts.Contains(key)) fill(body);
    }
    private Panel WindowFrame(string title, Rect2 rect, string panelId = "dialog-panel", bool back = false, Action? backAction = null, bool pinned = false, bool preparation = false)
    {
        var p = Surface(popup, rect, preparation ? "f4f6ec" : "f7f8f4", preparation ? "bac9ba" : "acbdad", 1, 8, true); p.MouseFilter = MouseFilterEnum.Stop; Controls[panelId] = p;
        if (!preparation && (panelId == "detail-panel" || ExplorerUtilityWindow)) { var shadow = (StyleBoxFlat)p.GetThemeStylebox("panel"); shadow.ShadowSize = 14; shadow.ShadowOffset = new(0, 4); shadow.ShadowColor = new(darkTheme ? "00000055" : "00000022"); }
        Surface(p, new(1, 63, rect.Size.X - 2, 1), preparation ? "bac9ba" : "acbdad");
        if (back) IconButton(p, "modal-back", "ArrowLeft", "", new(8, 4, 56, 56), backAction ?? CloseModal);
        int titleSize = preparation ? 24 : 20;
        var label = Text(p, title, new(back ? 73 : preparation ? 13 : 9, 4.5f, rect.Size.X - (back ? 144 : pinned ? 160 : 96), 56), titleSize); Strong(label); LineHeight(label, titleSize, preparation ? 36 : 28);
        if (pinned) PinButton(p, rect.Size.X);
        string closeId = panelId == "detail-panel" && Modal == "detail" ? "detail-close" : "modal-close";
        if (preparation) IconButton(p, closeId, "X", "", new(rect.Size.X - 65, 4.5f, 56, 56), () => { Modal = ""; modalParent = ""; });
        else Button(p, closeId, "×", new(rect.Size.X - 65, 4.5f, 56, 56), () => { Modal = ""; modalParent = ""; });
        var close = (Button)Controls[closeId]; ButtonStyle(close, preparation ? "ffffff00" : Paper, Line, Exploring ? "263c32" : "243d35", preparation ? 0 : 1, preparation ? 0 : 6);
        return p;
    }
    private void CardFacts(VBoxContainer body, JsonObject row, bool contextual = false)
    {
        var d = row["details"] as JsonObject ?? row;
        if (d["trigger"] is not null)
        {
            Fact(body, "枠消費", Known(d["equipment_cost"]), "Grid2X2"); Heading(body, "発動条件"); Paragraph(body, d.Text("trigger_text")); Heading(body, "効果"); Paragraph(body, d.Text("effect_text"));
        }
        else
        {
            bool guard = d.Text("kind") == "guard", heal = d.Text("kind") == "heal";
            JsonObject? field = contextual ? View.Obj("exploration").Obj("field")[d.Text("attr")] as JsonObject : null;
            var primary = new List<(string, string, string?, string?)>();
            string? Contribution(string key) => field is null ? null : Known(field[key]);
            if (detailKind is "knowledge" or "deck") primary.Add(("属性", d.Text("attr"), null, null));
            if (d.Text("kind") == "defense_support")
            { primary.Add(("身構", Known(d.Obj("defense_grant")["guard"]), "Shield", Contribution("field_power"))); primary.Add(("攪乱", Known(d.Obj("defense_grant")["evasion"]), "Wind", Contribution("field_hit"))); }
            else
            { primary.Add((guard ? "身構" : heal ? "回復" : "突破", Known(d["power"]), guard ? "Shield" : heal ? "HeartPlus" : "ArrowUpRight", heal ? null : Contribution("field_power"))); if (!heal) primary.Add((guard ? "攪乱" : "探査", Known(d[guard ? "evasion" : "hit"]), guard ? "Wind" : "ScanSearch", Contribution("field_hit"))); }
            primary.Add(("機転", Known(d["crit_gain"]), "Zap", null));
            if (detailKind is "knowledge" or "deck") primary.Add(("手札期限", Known(row["remaining_life"] ?? d["life"]), null, null));
            // HTML dlの既定上下余白を残し、原本にない「基礎値」見出しは増やさない。
            body.AddChild(new Control { CustomMinimumSize = new(0, 6) }); Ledger(body, primary);
            Heading(body, "場に置くと"); Ledger(body, [("突破／身構", Known(d["field_power"]), "ArrowUpRight/Shield", null), ("探査／攪乱", Known(d["field_hit"]), "ScanSearch/Wind", null)]);
            Heading(body, "次の行動まで"); Ledger(body, [("置く", Known(d["place_cost"]), null, null), ("一致", Known(d["match_cost"]), null, null)]);
            if (guard) Paragraph(body, "防御の回数：" + (d.ContainsKey("defense_uses") ? d["defense_uses"] is null ? "制限なし" : d.Text("defense_uses") + "回" : "未公開"));
            if (d["defense_grant"] is JsonObject grant)
            { Paragraph(body, "使用者以外の活動中の全主体へ付与。同じ発生源の付与は張り直し。"); Paragraph(body, "防御の回数：" + (grant.ContainsKey("uses") ? grant["uses"] is null ? "制限なし" : grant.Text("uses") + "回" : "未公開")); }
            string loss = row.Flag("doomed") ? "回収時、この探索では消滅します（元の主体が離脱）。" : row.Text("birth") == "filler" ? "補充由来：回収時、この探索では消滅します。" : d.Flag("consume_on_recover") ? "回収時、この探索では消滅します。" : "";
            if (loss != "") Paragraph(body, loss, 18, 1.6f, UiColor("943c25"));
        }
        // 修飾の説明は公開detailsに存在するものだけ。IDを独自の効果文へ翻訳しない。
        var affixes = d.Arr("affix_descriptions");
        if (affixes.Count > 0) Fold(body, "affix-" + row.Text("id"), "修飾", b => { foreach (var a in affixes.Rows()) Paragraph(b, a.Text("label") + "：" + a.Text("description")); });
    }
    private void ActorFacts(VBoxContainer body, JsonObject row)
    {
        Paragraph(body, $"余力 {Known(row["hp"])} / {Known(row["max_hp"])} · 隠蔽 {Known(row["posture_remaining"])} / {Known(row["max_posture"])}");
        Ledger(body, [("身構", Known(StatValue(row, "guard")), "Shield", null), ("機転", Known(row["crit"]), "Zap", null), ("攪乱", Known(StatValue(row, "evasion")), "Wind", null)]);
        var effects = row.Obj("defense").Arr("effects").Rows().ToArray();
        if (effects.Length > 0)
        {
            Heading(body, "防御の内訳");
            // 原本defenseDurationの表示区分だけを、既に公開されたeffectから作る。
            // 効果量・消費・終了条件の再計算はしない。キー欠落をnullと同一視しない。
            string Duration(string key)
            {
                var relevant = effects.Where(e => e.Number(key) != 0).ToArray();
                if (relevant.Length == 0) return "";
                if (relevant.Any(e => !e.ContainsKey("uses"))) return "未公開";
                if (relevant.All(e => e["uses"] is null)) return "∞";
                if (relevant.All(e => e["uses"] is not null && JsonNode.DeepEquals(e["uses"], relevant[0]["uses"])))
                    return "×" + relevant[0].Text("uses");
                return "混在";
            }
            Paragraph(body, "身構 " + Duration("guard") + " · 攪乱 " + Duration("evasion"));
            foreach (var e in effects)
                Paragraph(body, "• " + View.Obj("exploration").Obj("actors").Obj(e.Text("source_actor_id")).Text("display_name") + " · 身構 " + e.Number("guard") + " / 攪乱 " + e.Number("evasion") + " · " + (!e.ContainsKey("uses") ? "未公開" : e["uses"] is null ? "回数制限なし" : e.Text("uses") + "回"));
        }
    }
    private void PredictionFacts(VBoxContainer body)
    {
        // exploration.js predictionのledger。本人を含む余力・隠蔽の差分は主体札へ
        // 同時表示する。予約の範囲はR05の既確認表示を保持する。
        if (!actionPreview.Flag("ok")) { Paragraph(body, "行動を選ぶと予測が表示されます。"); return; }
        var rows = new List<(string, string, string?, string?)> { ("次の行動まで", Known(actionPreview["action_cost"]), null, null) };
        void Row(string term, string value) => rows.Add((term, value, null, null));
        string mode = actionPreview.Text("mode");
        if (mode == "attack") { Row("対象の余力", Signed(-actionPreview.Number("actual_hp_loss"))); Row("隠蔽", Known(actionPreview["posture_before"]) + " → " + (actionPreview.Number("posture_before") - actionPreview.Number("hit_gain"))); }
        if (mode == "heal") Row("回復", Known(actionPreview["hp_restored"]));
        if (mode == "guard") { Row("身構", Known(actionPreview.Obj("guard")["value"])); Row("攪乱（この身構）", Known(actionPreview.Obj("guard")["evasion"])); }
        if (mode == "defense_support") Row("対象", "使用者以外の全員");
        foreach (var change in actionPreview.Arr("actor_changes").Rows())
        {
            string name = change.Text("actor_id") == "P" ? "本人" : View.Obj("exploration").Obj("actors").Obj(change.Text("actor_id")).Text("display_name");
            foreach (var (key, label) in new[] { ("guard", "身構"), ("crit", "機転"), ("evasion", "攪乱") })
            { var b = StatValue(change.Obj("before"), key); var a = StatValue(change.Obj("after"), key); if (b is null || a is null) Row(name + " " + label, "未公開"); else if (!JsonNode.DeepEquals(b, a)) Row(name + " " + label, Known(b) + " → " + Known(a)); }
        }
        if (mode == "place") Row("主効果", "発動なし");
        body.AddChild(new Control { CustomMinimumSize = new(0, 6) }); Ledger(body, rows);
        // 一閃倍率の公開不足をゼロとして見せない。補足は別段落に置き、
        // 原本ledgerのmax-content列幅を長い主体名で広げない。
        Paragraph(body, "一閃倍率：未公開", 16, 1.6f, Muted);
        var expired = actionPreview.Arr("unused_hand_expiry").Rows().Where(r => r.Flag("expires")).ToArray();
        if (expired.Length > 0) Paragraph(body, "期限切れ：" + string.Join("、", expired.Select(r => CardName(View.Obj("exploration").Arr("hand").Rows().First(c => c.Text("id") == r.Text("id"))) + (r.Text("destination") == "destroyed" ? "（消滅）" : "（共通回収）"))), 18, 1.6f, UiColor("943c25"));
        // 数値の同時刻順を推定せず、公表された予約だけを補足する。
        Paragraph(body, "本人・今\n" + OrderText() + "\n本人の次回位置：" + SelfPosition(), 16, 1.4f);
    }
    private void PreparationFacts(VBoxContainer body)
    {
        if (!Comparison.Flag("ok"))
        {
            var warning = new PanelContainer(); warning.AddThemeStyleboxOverride("panel", Box("f6e3d6", width: 0)); body.AddChild(warning);
            var inset = new MarginContainer(); foreach (string side in new[] { "left", "top", "right", "bottom" }) inset.AddThemeConstantOverride("margin_" + side, 8); warning.AddChild(inset);
            Paragraph(inset, ViewData.Explain(Comparison.Text("error")), 20, 1.5f, UiColor("803d25")); return;
        }
        body.AddThemeConstantOverride("separation", 24);
        var pay = Comparison.Obj("payment");
        var wallet = new Control { CustomMinimumSize = new(0, 54) }; body.AddChild(wallet);
        string beforeBalance = ViewData.Money(pay.Number("unspent_before_units")), afterBalance = ViewData.Money(pay.Number("unspent_after_units")), cost = "−" + ViewData.Money(pay.Number("cost_units"));
        float bw = strongFont.GetStringSize(beforeBalance, fontSize: 36).X, aw = strongFont.GetStringSize(afterBalance, fontSize: 36).X, cw = font.GetStringSize(cost, fontSize: 18).X;
        float x = (body.CustomMinimumSize.X - (24 + bw + 24 + aw + cw + 56)) / 2;
        Icon(wallet, "Lightbulb", new(x, 15, 24, 24)); x += 38; Strong(Text(wallet, beforeBalance, new(x, 0, bw, 54), 36)); x += bw + 14;
        Icon(wallet, "ArrowRight", new(x, 15, 24, 24)); x += 38; Strong(Text(wallet, afterBalance, new(x, 0, aw, 54), 36)); x += aw + 14; Text(wallet, cost, new(x, 0, cw, 54), 18, Muted);
        // 外側24、節内8、変更行の上下6を別々に持つ。全行を節の間隔で離さない。
        VBoxContainer Section(string title, string icon)
        { var list = new VBoxContainer(); list.AddThemeConstantOverride("separation", 8); body.AddChild(list); var h = new Control { CustomMinimumSize = new(0, 30) }; list.AddChild(h); Icon(h, icon, new(0, 5, 20, 20), Muted); Strong(Text(h, title, new(32, 0, 600, 30), 20, Muted)); return list; }
        Control ChangeRow(VBoxContainer list, string id, float height = 45)
        { var row = new Control { CustomMinimumSize = new(0, height) }; list.AddChild(row); Controls[id] = row; Surface(row, new(0, height - 1, body.CustomMinimumSize.X, 1), "bac9ba"); return row; }
        var purchases = View.Obj("home").Arr("acquisition").Rows().Where(r => Plan.Arr("acquire").Strings().Contains(r.Text("id"))).ToArray();
        var buying = purchases.Length > 0 ? Section("取得", "Store") : null;
        foreach (var r in purchases)
        {
            bool built = Plan.Obj("composition").Arr(r.Obj("blueprint").Text("kind") == "passive" ? "equipment" : "deck").Strings().Contains(r.Text("pending_selection_id"));
            var row = ChangeRow(buying!, "review-purchase-" + r.Text("id")); row.SetMeta("destination", built ? "build" : "reserve"); row.SetMeta("price_units", r.Number("price_units")); row.TooltipText = CardName(r) + "を取得し、" + (built ? "編成する" : "編成せず所持する");
            var token = Surface(row, new(0, 8, 28, 28), "f5eedb", "846838", 1, 4); Icon(token, "Clock3", new(5, 5, 18, 18), UiColor("846838"));
            Strong(Text(row, CardName(r), new(40, 6, body.CustomMinimumSize.X - 244, 33), 22));
            float right = body.CustomMinimumSize.X; string price = ViewData.Money(r.Number("price_units")); float pw = font.GetStringSize(price, fontSize: 22).X;
            Text(row, price, new(right - pw, 6, pw, 33), 22); Icon(row, "Lightbulb", new(right - pw - 28, 12, 20, 20)); Icon(row, built ? "LayoutGrid" : "Layers", new(right - pw - 56, 12, 20, 20)); Icon(row, "ArrowRight", new(right - pw - 88, 12, 20, 20));
        }
        var current = Comparison.Obj("current"); var before = current.Arr("owned").Rows().Where(r => r.Flag("selected")).ToArray(); var after = Comparison.Arr("owned").Rows().Where(r => r.Flag("selected")).ToArray();
        var changed = new List<JsonObject>();
        VBoxContainer? composition = null; int changeIndex = 0;
        foreach (string key in before.Concat(after).Select(r => r.Obj("blueprint").Text("key")).Distinct())
        {
            int b = before.Count(r => r.Obj("blueprint").Text("key") == key), a = after.Count(r => r.Obj("blueprint").Text("key") == key); if (a == b) continue;
            composition ??= Section("編成", "LayoutGrid"); var item = before.Concat(after).First(r => r.Obj("blueprint").Text("key") == key); changed.Add(item);
            var row = ChangeRow(composition, "review-change-" + changeIndex++); row.SetMeta("blueprint_key", key); row.SetMeta("before_count", b); row.SetMeta("after_count", a);
            Text(row, CardName(item), new(0, 6, body.CustomMinimumSize.X - 164, 33), 22); Strong(Text(row, b + " → " + a, new(body.CustomMinimumSize.X - 148, 6, 148, 33), 22)).HorizontalAlignment = HorizontalAlignment.Right;
        }
        var capacity = new Control { CustomMinimumSize = new(0, 78) }; body.AddChild(capacity); Controls["review-capacity"] = capacity;
        Text(capacity, "札", new(0, 0, 300, 33), 22); Strong(Text(capacity, Comparison.Obj("deck").Number("size") + " / 12", new(body.CustomMinimumSize.X - 260, 0, 260, 33), 22)).HorizontalAlignment = HorizontalAlignment.Right;
        Text(capacity, "心得", new(0, 45, 300, 33), 22); Strong(Text(capacity, Comparison.Obj("equipment").Number("used") + " / " + Comparison.Obj("equipment").Number("capacity"), new(body.CustomMinimumSize.X - 260, 45, 260, 33), 22)).HorizontalAlignment = HorizontalAlignment.Right;
        foreach (var row in changed.Where(r => r.Obj("blueprint").Text("kind") == "passive")) Fold(body, "review-" + row.Obj("blueprint").Text("key"), CardName(row), b => PreparationItemFacts(b, row));
    }
    private void PreparationItemFacts(VBoxContainer body, JsonObject row)
    {
        var d = row.Obj("details"); var list = new VBoxContainer(); list.AddThemeConstantOverride("separation", 12); body.AddChild(list);
        void Row(string term, string value) => Fact(list, term, value, labelWidth: 112);
        if (d["trigger"] is not null) { Row("枠消費", Known(d["equipment_cost"])); Row("発動条件", d.Text("trigger_text").Replace("／", "。")); Row("効果", d.Text("effect_text").Replace("／", "。")); return; }
        if (d.Text("kind") == "defense_support") { Row("全員へ身構", Known(d.Obj("defense_grant")["guard"])); Row("全員へ攪乱", Known(d.Obj("defense_grant")["evasion"])); }
        else { Row(d.Text("kind") == "guard" ? "身構" : d.Text("kind") == "heal" ? "回復" : "突破", Known(d["power"])); if (d.Text("kind") is "guard" or "attack") Row(d.Text("kind") == "guard" ? "攪乱" : "探査", Known(d[d.Text("kind") == "guard" ? "evasion" : "hit"])); }
        Row("手札期限", Known(d["life"])); Row("行動間隔", "置く " + Known(d["place_cost"]) + " / 一致 " + Known(d["match_cost"])); Row("場の効果", "突破／身構 " + Known(d["field_power"]) + "、探査／攪乱 " + Known(d["field_hit"]));
        if (d.Flag("consume_on_recover")) Row("性質", "この探索では回収時に消滅。所持品は残る。");
    }
    private void PreparationDetailFacts(VBoxContainer body)
    {
        bool offer = detailKind == "offer", pending = detail.Flag("pending");
        var locations = new Control { CustomMinimumSize = new(0, 48) }; body.AddChild(locations);
        string location = offer ? "offer" : detailKind == "build" ? "build" : "reserve";
        foreach (var (id, icon, x) in new[] { ("offer", "Store", 0f), ("reserve", "Layers", 108f), ("build", "LayoutGrid", 216f) })
        { var p = Surface(locations, new(x, 0, 64, 48), id == location ? "315849" : "ffffff00", width: 0, radius: 6); Icon(p, icon, new(22, 14, 20, 20), id == location ? UiColor("fffef5") : Ink); p.Modulate = new(1, 1, 1, id == location ? 1 : .45f); if (x < 216) Icon(locations, "ChevronRight", new(x + 76, 14, 20, 20)); }
        if (pending) { var token = Surface(locations, new(body.CustomMinimumSize.X - 32, 8, 32, 32), "f5eedb", "846838", 1, 4); Icon(token, "Clock3", new(7, 7, 18, 18), UiColor("846838")); token.TooltipText = "取得予定・未払い"; }
        PreparationItemFacts(body, detail);
        var affixes = detail.Obj("details").Arr("affix_descriptions"); if (affixes.Count > 0) Fold(body, "affix-" + detail.Text("id"), "修飾", b => { foreach (var a in affixes.Rows()) Paragraph(b, a.Text("label") + "：" + a.Text("description")); });
        if (offer || pending) { var price = new Control { CustomMinimumSize = new(0, 33) }; body.AddChild(price); string amount = ViewData.Money(detail.Number("price_units")); float w = strongFont.GetStringSize(amount, fontSize: 22).X; Icon(price, "Lightbulb", new(body.CustomMinimumSize.X - w - 28, 6, 20, 20)); Strong(Text(price, amount, new(body.CustomMinimumSize.X - w, 0, w, 33), 22)); Controls["detail-price"] = price; }
        if (detail["conversion_reasons"] is JsonArray reasons && reasons.Count > 0) { Heading(body, "所持品の状態"); foreach (string r in reasons.Strings()) Paragraph(body, ViewData.Explain(r)); }
    }
    private void AcceptedDetailWindow()
    {
        bool actor = detailKind == "actor", preparation = detailKind is "offer" or "reserve" or "build";
        var rect = preparation ? new Rect2(479, 129, 960, 820) : EdgeWindow(actor ? 416 : 520, actor ? 384 : 480, actor);
        if (preparation) popup.AddChild(new ColorRect { Color = UiColor("283d3555"), Size = new(InnerWidth, InnerHeight), MouseFilter = MouseFilterEnum.Stop });
        var p = WindowFrame(actor ? detail.Text("display_name") : (detailKind == "forecast" ? "予測 · " : "") + CardName(detail), rect, "detail-panel", pinned: !preparation, preparation: preparation);
        float pad = preparation ? 24 : 16, footer = preparation ? 72 : actor ? 72 : 0;
        var body = FactsBody(p, "detail-body", new(pad, 64 + pad, rect.Size.X - pad * 2, rect.Size.Y - 64 - pad * 2 - footer), preparation ? 24 : 12);
        if (preparation) PreparationDetailFacts(body); else if (actor) ActorFacts(body, detail); else CardFacts(body, detail, detailKind == "hand");
        float y = rect.Size.Y - 72;
        if (actor && detail.Text("knowledge_profile_id") is { Length: > 0 } profile) Button(p, "actor-record", "調査記録", new(16, y, rect.Size.X - 32, 56), () => { knowledgeSelection = profile; OpenModal("knowledge"); });
        if (!preparation) return;
        Surface(p, new(1, y, rect.Size.X - 2, 1), "bac9ba");
        if (detailKind == "offer") Button(p, "detail-stage", "取得", new(rect.Size.X - 184, y + 4, 160, 64), () => { Stage(detail); Modal = ""; }, CanStage(detail));
        else
        {
            Button(p, "detail-compose", detailKind == "build" ? "外す" : "編成", new(24, y + 4, 160, 64), () => { Compose(detail, detailKind != "build"); Modal = ""; }, Can("commit_preparation"));
            if (detail.Flag("pending")) Button(p, "detail-unstage", "取消", new(200, y + 4, 160, 64), () => { Unstage(detail); Modal = ""; }, Can("commit_preparation"));
            else { Button(p, "lock", detail.Flag("locked") ? "解除" : "ロック", new(200, y + 4, 160, 64), () => Send("set_item_lock", new() { ["item_id"] = detailId, ["locked"] = !detail.Flag("locked") }), Can("set_item_lock") && !DraftDirty); Button(p, "convert", "変換", new(376, y + 4, 160, 64), () => Modal = "convert", Can("convert_items") && detail.Flag("conversion_available") && !DraftDirty); }
        }
    }
    private void AcceptedMenuWindow()
    {
        var p = WindowFrame("メニュー", PlaceWindow(modalAnchor));
        var choices = new List<(string id, string label, string modal)> { ("menu-knowledge", "調査記録", "knowledge"), ("settings", "表示", "settings"), ("help", "遊び方", "help"), ("save-data", "保存データ", "save-data"), ("history", "文章の記録", "history") };
        if (Screen == "exploring") choices.AddRange([("objective", "目的", "objective"), ("status", "状況", "status"), ("order", "行動順", "order"), ("deck", "山札", "deck"), ("action-history", "履歴", "action-history"), ("operation", "操作", "settings")]);
        choices.Add(("exit", Screen == "exploring" ? "中断して終了" : "終了", "quit"));
        if (Screen == "return" && Can("ack_return")) { choices.Add(("repeat", View.Obj("case").Text("status") == "resolved" ? "再訪する" : "再挑戦", "")); choices.Add(("return-prepare", "取得・編成へ", "")); }
        const int pageSize = 12; int pages = (choices.Count + pageSize - 1) / pageSize; menuPage = Math.Clamp(menuPage, 0, pages - 1);
        int index = 0; foreach (var (id, label, modal) in choices.Skip(menuPage * pageSize).Take(pageSize))
        { int n = index++; Button(p, id, label, new(16 + n % 2 * 248, 72 + n / 2 * 56, 240, 56), () => { if (id == "exit") AskClose(); else if (id == "repeat") { departAfterReturn = true; Send("ack_return"); } else if (id == "return-prepare") { prepareAfterReturn = true; Send("ack_return"); } else { operationSettings = id == "operation"; OpenModal(modal, "menu"); } }); }
        if (pages > 1) { IconButton(p, "menu-prev", "ChevronLeft", "", new(16, 416, 56, 56), () => menuPage--, menuPage > 0); Text(p, (menuPage + 1) + " / " + pages, new(80, 416, 360, 56), 18).HorizontalAlignment = HorizontalAlignment.Center; IconButton(p, "menu-next", "ChevronRight", "", new(448, 416, 56, 56), () => menuPage++, menuPage + 1 < pages); }
    }
    private CheckBox Setting(Control parent, string id, string value, Rect2 rect, bool enabled, Action<bool> changed, bool browserInput = false)
    {
        var box = new CheckBox { Text = value, Position = rect.Position, Size = rect.Size, ButtonPressed = enabled, FocusMode = FocusModeEnum.All }; parent.AddChild(box); Controls[id] = box;
        box.AddThemeFontSizeOverride("font_size", 18); box.AddThemeConstantOverride("h_separation", 10);
        // 原本の20px inputとaccent-colorを実CheckBoxへ与える。標準テーマの
        // 大きいチェック絵を残さず、既存Check SVGと同じ四角面で構成する。
        var blank = new GradientTexture2D { Width = 20, Height = 20, Gradient = new Gradient { Colors = [new Color(0, 0, 0, 0), new Color(0, 0, 0, 0)] } };
        foreach (string key in new[] { "checked", "unchecked", "checked_disabled", "unchecked_disabled" }) box.AddThemeIconOverride(key, blank);
        foreach (string state in new[] { "normal", "hover", "pressed", "disabled", "focus" }) { var style = Box("ffffff00", width: 0); if (browserInput) style.ContentMarginLeft = 4; box.AddThemeStyleboxOverride(state, style); }
        string accent = browserInput ? (darkTheme ? "99c8ff" : "0075ff") : "315849";
        var check = Surface(box, new(browserInput ? 4 : 0, browserInput ? 4.094f : (rect.Size.Y - 20) / 2, 20, 20), enabled ? accent : Paper, enabled ? accent : Line, 1, 2);
        if (enabled) Icon(check, "Check", new(2, 2, 16, 16), new Color(browserInput ? (darkTheme ? "3b3b3b" : "ffffff") : "fffef5"), 3);
        var focus = Surface(box, new(browserInput ? 4 : 0, browserInput ? 4.094f : (rect.Size.Y - 20) / 2, 20, 20), "ffffff00"); focus.Name = "InputFocus"; focus.Visible = false;
        box.Toggled += on => { Automation?.ButtonPressed(id); CancelGesture(); changed(on); renderNeeded = true; }; return box;
    }
    private void AcceptedSettingsWindow()
    {
        var rect = PlaceWindow(modalAnchor); var p = WindowFrame(operationSettings ? "操作" : "表示", rect, back: modalParent != "" && !operationSettings, pinned: operationSettings);
        if (!operationSettings) { Setting(p, "reduced-motion", "動きを抑える", new(16, 80, 488, 48), reducedMotion, on => reducedMotion = on); return; }
        var body = FactsBody(p, "settings-body", new(16, 80, 488, 384), 10); Paragraph(body, "札も相手もクリックで選択・詳細。相手を選ぶと行動の対象も切り替わります。札を短く押し続けて場へ運ぶと出札できます。押してすぐ横へ動かすと手札を送ります。");
        foreach (var (id, label, on) in new[] { ("show-relations", "関係線を表示", showRelations), ("auto-details", "選択時に詳細を開く", autoDetails), ("quick-place", "通常の設置をすぐ実行", quickPlace), ("allow-drag", "ドラッグを使う", allowDrag) })
        { var cell = new Control { CustomMinimumSize = new(0, 27.094f) }; body.AddChild(cell); Setting(cell, id, label, new(0, 0, 486, 27.094f), on, v => { switch (id) { case "show-relations": showRelations = v; break; case "auto-details": autoDetails = v; break; case "quick-place": quickPlace = v; break; case "allow-drag": allowDrag = v; break; } }, browserInput: true); }
        var hold = new Control { CustomMinimumSize = new(0, 38) }; body.AddChild(hold); var title = Text(hold, "つかむまで", new(0, 0, 76.453f, 38), 18); LineHeight(title, 18, 25.2f);
        var select = new OptionButton { Position = new(76.453f, 0), Size = new(90, 38) }; hold.AddChild(select); Controls["hold-duration"] = select;
        select.AddThemeFontSizeOverride("font_size", 18); select.AddThemeIconOverride("arrow", IconTexture("ChevronDown", textureSize: 12)); select.AddThemeConstantOverride("arrow_margin", 4); select.AddThemeConstantOverride("h_separation", 4); select.AddThemeColorOverride("font_color", Ink); select.AddThemeColorOverride("font_hover_color", Ink);
        foreach (string state in new[] { "normal", "hover", "pressed", "focus" }) { var style = Box(Paper, Line, 1, 5); style.ContentMarginLeft = style.ContentMarginRight = 6; select.AddThemeStyleboxOverride(state, style); }
        foreach (string state in new[] { "icon_normal_color", "icon_hover_color", "icon_pressed_color" }) select.AddThemeColorOverride(state, Ink);
        select.SetMeta("accepted_focus_radius",5); ApplyFocusAppearance(select);
        foreach (int ms in new[] { 150, 220, 320 }) select.AddItem((ms / 1000m).ToString("0.00") + "秒", ms); select.Selected = Array.IndexOf(new[] { 150, 220, 320 }, holdMilliseconds); select.ItemSelected += index => { CancelGesture(); holdMilliseconds = select.GetItemId((int)index); };
    }
    private void GenericFacts(VBoxContainer body, string kind, string fallback)
    {
        if (kind == "status")
        { var e = View.Obj("exploration"); Paragraph(body, $"時刻 {e.Number("now")} · 本人の行動 {e.Obj("self").Number("actions")}回"); foreach (var a in e.Obj("actors").Select(p => (JsonObject)p.Value!).Where(r => r.Flag("active"))) Fact(body, a.Text("display_name"), $"余力 {Known(a["hp"])} / {Known(a["max_hp"])} · 機転 {Known(a["crit"])}"); return; }
        if (kind == "order")
        { foreach (var group in ReservationGroups()) { Heading(body, group.Count() > 1 ? "同時刻［+" + (group.Key - View.Obj("exploration").Number("now")) + "］" : "+" + (group.Key - View.Obj("exploration").Number("now"))); foreach (var row in group) Paragraph(body, View.Obj("exploration").Obj("actors").Obj(row.Text("actor_id")).Text("display_name") + (row.Text("actor_id") == "P" ? actionPreview.Flag("ok") ? "・次" : "・今" : "")); } return; }
        if (kind == "action-history")
        { foreach (var row in View.Arr("action_history").Rows().Reverse()) { Paragraph(body, row.Number("time") + "　" + PublicEventText(row)); Divider(body); } if (View.Arr("action_history").Count == 0) Paragraph(body, "まだ履歴がありません。"); return; }
        if (kind == "history")
        { int n = 0; foreach (var t in View.Obj("story").Arr("text_history").Rows().Where(t => t.Text("kind") != "detail" || t.Flag("read"))) { Heading(body, "記録 " + (++n)); Paragraph(body, t.Text("short_text"), 20, 1.7f); } if (n == 0) Paragraph(body, "文章の記録はまだありません"); return; }
        if (kind == "help")
        {
            Heading(body, "編成"); Paragraph(body, "探索先画面の「編成」から札・心得を切り替える。取得可能・所持・編成の間を、ボタンまたはホールド後のドラッグで移せる。取得は支払前に編成へ試せる。「確認する」で差分を見て確定する。「戻す」は未確定の変更をまとめて取り消す。");
            Heading(body, "探索"); Paragraph(body, "札と相手はクリックで選択と詳細を表示する。選んだ札のボタン、またはホールド後のドラッグで行動する。予測の場札も詳細を開ける。");
            Heading(body, "共通操作"); Paragraph(body, "調査記録とメニューは右上。前の画面へ戻る操作は左上、窓を閉じる操作はその窓の右上にある。帰還結果は「進む」で送り、その後の探索先画面から編成できる。"); return;
        }
        foreach (string text in fallback.Split("\n\n", StringSplitOptions.RemoveEmptyEntries)) Paragraph(body, text);
    }
    private void AcceptedDeckWindow(bool child = false)
    {
        var rect = PlaceWindow(modalAnchor); var pair = WindowPair(sourceWindow ?? rect);
        var p = WindowFrame("本人の札", child ? pair.left : rect, back: modalParent != "");
        var e = View.Obj("exploration"); var body = FactsBody(p, "deck-list", new(16, 80, 488, 384));
        Paragraph(body, $"山札 {e.Arr("own_deck").Count}枚 · 手札 {e.Arr("hand").Count}枚 · 共有回収 {e.Number("pool_count")}枚");
        var header = new HBoxContainer(); header.SetMeta("fact_columns", true); body.AddChild(header);
        foreach (var (title, width) in new[] { ("札", 242f), ("持込", 76f), ("山札", 76f), ("手札", 76f) }) { var cell = new Control { CustomMinimumSize = new(width, 32) }; header.AddChild(cell); Strong(Text(cell, title, new(0, 0, width, 32), 18)); }
        int index = 0; foreach (var row in e.Arr("deck_catalogue").Rows())
        {
            var line = new Control { CustomMinimumSize = new(0, 56) }; body.AddChild(line);
            Button(line, "deck-card-" + index++, CardName(row.Obj("card")), new(0, 0, 242, 56), () => { detail = row.Obj("card").Copy(); detailKind = "deck"; sourceWindow = new(p.Position, p.Size); Modal = "deck-card"; });
            int col = 0; foreach (string key in new[] { "initial_count", "deck_count", "hand_count" }) Text(line, Known(row[key]), new(242 + 76 * col++, 0, 76, 56), 18).HorizontalAlignment = HorizontalAlignment.Center; Divider(body);
        }
        Paragraph(body, "相手の現在の内訳・共有回収の内訳は未公開", 16);
        if (child) { var card = WindowFrame(CardName(detail), pair.right, back: true, backAction: () => Modal = "deck"); CardFacts(FactsBody(card, "deck-detail", new(16, 80, 488, 384)), detail); }
    }
    private void RecordedTable(VBoxContainer body, JsonArray rows, bool counts, string scope)
    {
        var header = new HBoxContainer(); header.SetMeta("fact_columns", true); body.AddChild(header);
        foreach (var (title, width) in counts ? new[] { ("札", 276f), ("属性", 80f), ("初期枚数", 108f) } : new[] { ("札", 340f), ("属性", 124f) })
        { var cell = new Control { CustomMinimumSize = new(width, 32) }; header.AddChild(cell); Strong(Text(cell, title, new(0, 0, width, 32), 18)); }
        int index = 0; foreach (var row in rows.Rows())
        {
            var card = row.Obj("card"); var line = new Control { CustomMinimumSize = new(0, 56) }; body.AddChild(line); float w = counts ? 276 : 340;
            // 入口の識別子とPressed signalの識別子を一致させる。別名参照では受信検証ができない。
            string id = Controls.ContainsKey("knowledge-card-0") ? "knowledge-card-" + scope + index : "knowledge-card-0";
            Button(line, id, CardName(card), new(0, 0, w, 56), () => { detail = card.Copy(); detailKind = "knowledge"; detailId = card.Text("type"); Modal = "knowledge-card"; });
            index++; Text(line, card.Text("attr"), new(w, 0, 80, 56), 18); if (counts) Text(line, Known(row["initial_count"]), new(w + 80, 0, 108, 56), 18).HorizontalAlignment = HorizontalAlignment.Center; Divider(body);
        }
    }
    private void TargetKnowledge(VBoxContainer body, JsonObject target)
    {
        Heading(body, "基本構成"); if (target["initial_catalogue"] is JsonObject catalogue) RecordedTable(body, catalogue.Arr("cards"), true, "initial-"); else Paragraph(body, "まだ判明していない", 18, 1.6f, Muted);
        foreach (var (key, title) in new[] { ("observed_by_current_actor", "この相手の札"), ("observed_elsewhere_this_run", "今回の探索で観測"), ("observed_earlier", "過去の探索で観測") })
        { var rows = target.Arr(key); if (rows.Count > 0) { Heading(body, title); RecordedTable(body, rows, false, key + "-"); } }
        Heading(body, "獲得記録"); var rewards = target.Arr("confirmed_reward_candidates"); if (rewards.Count == 0) Paragraph(body, "記録なし", 18, 1.6f, Muted); else foreach (var reward in rewards.Rows()) Paragraph(body, reward.Text("label"));
        Paragraph(body, "現在の手札・次に出す札は未公開。", 16, 1.6f, Muted);
    }
    private void AcceptedKnowledgeWindow(bool cardDetail = false)
    {
        var targets = Knowledge.Arr("views").Rows().ToArray();
        var target = targets.FirstOrDefault(r => r.Text("key") == knowledgeSelection || r.Text("profile") == knowledgeSelection);
        bool hasChild = cardDetail || target is not null; var rect = PlaceWindow(modalAnchor); var pair = WindowPair(sourceWindow ?? rect);
        var parent = WindowFrame(cardDetail && target is not null ? target.Text("display_name") : "調査記録", hasChild ? pair.left : rect, back: cardDetail && target is not null || modalParent != "", backAction: () => { knowledgeSelection = ""; Modal = "knowledge"; });
        sourceWindow = new(parent.Position, parent.Size);
        if (cardDetail && target is not null) TargetKnowledge(FactsBody(parent, "knowledge-cards", new(16, 80, 488, 384)), target);
        else
        {
            Button(parent, "knowledge-tab-targets", "相手・環境", new(16, 80, 236, 40), () => { knowledgeTab = "targets"; knowledgeSelection = ""; }); Button(parent, "knowledge-tab-cards", "札", new(260, 80, 244, 40), () => { knowledgeTab = "cards"; knowledgeSelection = ""; });
            foreach (var (id, tab) in new[] { ("knowledge-tab-targets", "targets"), ("knowledge-tab-cards", "cards") }) if (Controls[id] is Button b) ButtonStyle(b, knowledgeTab == tab ? "345747" : "ffffff00", "acbdad", knowledgeTab == tab ? "ffffff" : "263c32", 1, 5);
            var body = FactsBody(parent, "knowledge-list", new(16, 132, 488, 332)); Paragraph(body, knowledgeTab == "targets" ? "探索で判明した構成と札" : "判明した札の性能", 16, 1.6f, Muted);
            if (knowledgeTab == "cards")
            { int i = 0; foreach (var card in View.Arr("known_cards").Rows()) { var line = new Control { CustomMinimumSize = new(0, 56) }; body.AddChild(line); Button(line, "knowledge-known-" + i++, CardName(card), new(0, 0, 476, 56), () => { detail = card.Copy(); detailKind = "knowledge"; knowledgeSelection = ""; Modal = "knowledge-card"; }); } }
            else
            {
                int i = 0; foreach (var row in targets)
                {
                    var line = new Control { CustomMinimumSize = new(0, 76) }; body.AddChild(line);
                    var b = Button(line, "knowledge-group-" + i++, "", new(0, 0, 476, 76), () => { knowledgeSelection = row.Text("key"); });
                    Strong(Text(b, row.Text("display_name"), new(12, 8, 424, 28), 18));
                    int versions = targets.Count(t => t.Text("profile") == row.Text("profile")); int version = Array.IndexOf(targets.Where(t => t.Text("profile") == row.Text("profile")).ToArray(), row) + 1;
                    string status = "基本構成 " + (row["initial_catalogue"] is JsonObject ? "判明" : "未判明") + (versions > 1 ? "・記録 " + version : "") + (row.Flag("current") ? "・今回の相手" : ""); Text(b, status, new(12, 40, 424, 26), 16, Muted); Icon(b, "ChevronRight", new(444, 28, 20, 20));
                }
                if (i == 0) Paragraph(body, "まだ調査記録はありません。", 18);
            }
        }
        if (!hasChild) return;
        var child = WindowFrame(cardDetail ? CardName(detail) : target!.Text("display_name"), pair.right, "knowledge-child", back: true, backAction: () => { if (cardDetail) Modal = "knowledge"; else knowledgeSelection = ""; });
        var close = Controls["modal-close"]; Controls["knowledge-child-close"] = close;
        if (cardDetail) CardFacts(FactsBody(child, "knowledge-detail", new(16, 80, 488, 384)), detail);
        else TargetKnowledge(FactsBody(child, "knowledge-cards", new(16, 80, 488, 384)), target!);
    }
}
