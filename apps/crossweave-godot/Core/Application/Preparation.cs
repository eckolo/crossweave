using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;
internal static class Preparation
{
    internal const string Contract = "CW-M1-preparation-2";
    internal static long Funds(JsonObject e) => checked(e.O("profile").L("points") * 100 + e.L("remainder"));
    internal static void SetFunds(JsonObject e, long value)
    {
        J.Check(value >= 0 && value <= 9007199254740991, "invalid_funds");
        e.O("profile").Put("points", value / 100);
        e.Put("remainder", value % 100);
    }

    internal static JsonObject Resolve(JsonObject e, string handle, string kind)
    {
        J.Check(handle.StartsWith("owned:", StringComparison.Ordinal), "unknown_selection_handle");
        var uid = handle[6..];
        J.Check(e.O("inventory").ContainsKey(uid), "missing_possession");
        var item = e.O("inventory").O(uid);
        J.Check(item.O("blueprint").S("kind") == kind, "wrong_selection_kind");
        return item;
    }

    internal static string GrantUid(string basis, int index) => J.Text(new object[] { "CW-M1-grant-1", "card", basis, index });
    internal static JsonObject InitialEconomy()
    {
        var initial = Content.M1.O("initial");
        var grants = new JsonObject();
        var inventory = new JsonObject();
        foreach (var basis in initial.A("free_card_bases").Strings().Order(StringComparer.Ordinal))
            for (int i = 0; i < Content.Acquisition.I("initial_card_quantity"); i++)
            {
                var uid = GrantUid(basis, i);
                var b = Content.Blueprint("card", basis);
                grants.Put(uid, J.Obj(("blueprint", b), ("band", "ordinary"), ("source", "initial_card"), ("paid_units", 0)));
                inventory.Put(uid, J.Obj(("uid", uid), ("blueprint", b), ("band", "ordinary"), ("locked", false)));
            }

        return J.Obj(("schema", "AP1"), ("runtime_version", "CW-M1-economy-2"), ("profile", J.Obj(("schema", "AH1"), ("phase", "home"), ("run", null), ("points", 0), ("learned", new JsonObject()), ("materials", new JsonObject()), ("unlocked", initial["unlocked"]), ("clears", new JsonArray()), ("knowledge", J.Obj(("schema", "AD1"), ("events", new JsonArray()), ("encounters", new JsonArray()))), ("returns", new JsonObject()))), ("remainder", 0), ("inventory", inventory), ("known", new JsonObject()), ("runs", new JsonObject()), ("sales", new JsonObject()), ("references", new JsonObject()), ("aq", J.Obj(("policy", "cost"), ("equipped", new JsonArray()))), ("at", J.Obj(("version", Content.Economy.O("offers").S("version")), ("current", null), ("batches", new JsonObject()), ("purchases", new JsonObject()), ("returns", new JsonObject()), ("pending_contexts", new JsonArray()))), ("unified", J.Obj(("version", Content.Acquisition.S("version")), ("origin", "new"), ("legacy_learning", new JsonObject()), ("grants", grants), ("purchases", new JsonObject()))));
    }

    internal static JsonObject Plan(JsonObject s) => J.Obj(("schema", Contract), ("acquire", new JsonArray()), ("composition", J.Obj(("equipment", s.O("economy").O("aq")["equipped"]), ("deck", s.O("au")["deck"]))), ("migration_review", null));
    internal static void CheckShape(JsonObject p)
    {
        J.Check(p.S("schema") == Contract, "preparation_contract_changed");
        J.Check(p.All(x => new[] { "schema", "acquire", "composition", "migration_review" }.Contains(x.Key)), "unexpected_plan_field");
        J.Check(p["acquire"] is JsonArray, "invalid_acquisition_list");
        Unique(p.A("acquire"), "invalid_acquisition_list");
        J.Check(p["composition"] is JsonObject, "explicit_preparation_required");
        J.Check(p.O("composition").All(x => x.Key is "equipment" or "deck"), "explicit_preparation_required");
        J.Check(p.O("composition")["equipment"] is JsonArray, "invalid_equipment_list");
        Unique(p.O("composition").A("equipment"), "invalid_equipment_list");
        J.Check(p.O("composition")["deck"] is JsonArray, "invalid_deck");
        foreach (var x in p.O("composition").A("deck"))
            J.Check(x is JsonValue v && v.TryGetValue<string>(out _), "invalid_deck");
        J.Check(p["migration_review"] is null, "migrated_draft_requires_review");
    }

    private static void Unique(JsonArray a, string error)
    {
        J.Check(a.All(x => x is JsonValue v && v.TryGetValue<string>(out _)) && a.Strings().Distinct().Count() == a.Count, error);
    }

    internal static int ValidateEquipment(JsonObject e, IEnumerable<string> ids)
    {
        var list = ids.ToArray();
        J.Check(list.Distinct().Count() == list.Length, "invalid_equipment_list");
        int used = list.Sum(id => Content.EquipmentCost(Resolve(e, id, "passive").O("blueprint")));
        J.Check(used <= Content.M1.O("rules").O("equipment").I("cost_limit"), "equipment_capacity_exceeded");
        return used;
    }

    internal static string[] CanonicalDeck(JsonObject e, IEnumerable<string> ids)
    {
        var list = ids.ToArray();
        J.Check(list.Length == Content.M1.O("rules").O("deck").I("size"), "invalid_deck_size");
        J.Check(list.Distinct().Count() == list.Length, "duplicate_owned_card");
        var items = list.Select(id => (id, item: Resolve(e, id, "card"))).ToArray();
        J.Check(items.GroupBy(x => x.item.O("blueprint").S("base")).All(g => g.Count() <= Content.M1.O("rules").O("deck").I("per_base_cap")), "deck_base_cap_exceeded");
        return items.OrderBy(x => x.item.O("blueprint").S("base"), StringComparer.InvariantCulture).ThenBy(x => x.item.O("blueprint").S("key"), StringComparer.InvariantCulture).ThenBy(x => x.id, StringComparer.InvariantCulture).Select(x => x.id).ToArray();
    }

    internal static JsonArray Options(JsonObject e)
    {
        var options = new JsonArray();
        foreach (var(basis, price)in Content.Acquisition.O("basic_passive_prices").OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            var count = e.O("inventory").Values().Count(item => item.O("blueprint").S("kind") == "passive" && item.O("blueprint").S("base") == basis && (e.O("unified").O("grants")[item.S("uid")]?.S("source") == "legacy_learning" || e.O("unified").O("purchases").Values().Any(r => r.S("uid") == item.S("uid"))));
            if (count < Content.Acquisition.I("basic_passive_stock"))
                options.Add(J.Obj(("id", "basic:" + basis), ("blueprint", Content.Blueprint("passive", basis)), ("price_units", price), ("band", "ordinary"), ("group_id", "basic:" + basis), ("group_limit", 1), ("available_quantity", 1), ("affordable_now", Funds(e) >= price.L()), ("pending_selection_id", "pending:basic:" + basis)));
        }

        var batch = CurrentBatch(e);
        if (batch is not null && batch["purchased"] is null)
            foreach (var candidate in batch.A("candidates").Rows())
            {
                string id = Offers.CandidateRef(batch.S("id"), candidate.S("id"));
                options.Add(candidate.Copy().With(("id", id), ("group_id", "return-offer"), ("group_limit", 1), ("available_quantity", 1), ("affordable_now", Funds(e) >= candidate.L("price_units")), ("pending_selection_id", "pending:" + id)));
            }

        return options;
    }

    internal static JsonObject? CurrentBatch(JsonObject e) => e.O("at")["current"] is null ? null : e.O("at").O("batches")[e.O("at").S("current")] as JsonObject;
    internal static JsonObject Apply(JsonObject s, JsonObject plan, string operation)
    {
        CheckShape(plan);
        var next = s.Copy();
        var e = next.O("economy");
        var options = Options(e).Rows();
        var selected = plan.A("acquire").Strings().Select(id => options.SingleOrDefault(x => x.S("id") == id) ?? throw new RuleException("acquisition_not_available")).ToArray();
        J.Check(selected.GroupBy(x => x.S("group_id")).All(g => g.Count() <= g.First().I("group_limit")), "acquisition_group_limit");
        long cost = selected.Sum(x => x.L("price_units"));
        J.Check(Funds(e) >= cost, "insufficient_unspent_funds");
        var pending = new Dictionary<string, string>();
        foreach (var row in selected)
        {
            var id = row.S("id");
            string uid;
            if (id.StartsWith("basic:", StringComparison.Ordinal))
            {
                var basis = row.O("blueprint").S("base");
                uid = J.Text(new[] { "CW-M1-basic-1", operation, basis });
                var key = J.Text(new[] { operation, basis });
                J.Check(!e.O("unified").O("purchases").ContainsKey(key), "duplicate_acquisition");
                e.O("unified").O("purchases").Put(key, J.Obj(("operation", operation), ("base", basis), ("uid", uid), ("units", row.L("price_units"))));
            }
            else
            {
                var batch = CurrentBatch(e)!;
                var c = batch.A("candidates").Rows().Single(c => Offers.CandidateRef(batch.S("id"), c.S("id")) == id);
                uid = J.Text(new[] { "AT1", batch.S("id"), c.S("id") });
                J.Check(batch["purchased"] is null && !e.O("at").O("purchases").ContainsKey(operation), "duplicate_purchase");
                batch.Put("purchased", operation);
                e.O("at").O("purchases").Put(operation, J.Obj(("batch", batch.S("id")), ("choice", c.S("id")), ("units", c.L("price_units")), ("uid", uid), ("signature", J.Canonical(J.Obj(("batch", batch.S("id")), ("choice", c.S("id")))))));
            }

            J.Check(!e.O("inventory").ContainsKey(uid), "duplicate_acquisition");
            e.O("inventory").Put(uid, J.Obj(("uid", uid), ("blueprint", row["blueprint"]), ("band", row.S("band")), ("locked", false)));
            pending["pending:" + id] = "owned:" + uid;
        }

        SetFunds(e, Funds(e) - cost);
        string Selection(string id) => id.StartsWith("pending:", StringComparison.Ordinal) ? pending.GetValueOrDefault(id) ?? throw new RuleException("unselected_acquisition") : id;
        var equipment = plan.O("composition").A("equipment").Strings().Select(Selection).ToArray();
        ValidateEquipment(e, equipment);
        e.O("aq").Put("equipped", equipment.Order(StringComparer.Ordinal));
        next.O("au").Put("deck", CanonicalDeck(e, plan.O("composition").A("deck").Strings().Select(Selection)));
        return next;
    }

    internal static JsonObject Draft(JsonObject s, JsonObject plan, long revision)
    {
        string? error = null;
        try
        {
            Apply(s, plan, "preview");
        }
        catch (RuleException ex)
        {
            error = ex.Code;
        }

        return J.Obj(("based_on_revision", revision), ("plan", plan), ("intent", "explicit"), ("dirty", J.Canonical(plan) != J.Canonical(Plan(s))), ("valid", error is null), ("errors", error is null ? new JsonArray() : J.Array(new[] { error })));
    }

    internal static string[] Usage(JsonObject d, string uid)
    {
        var s = d.O("session");
        var result = new List<string>();
        var handle = "owned:" + uid;
        if (s.O("au").A("deck").Strings().Contains(handle))
            result.Add("confirmed_deck");
        if (s.O("economy").O("aq").A("equipped").Strings().Contains(handle))
            result.Add("equipment");
        if (d["draft"] is JsonObject draft)
        {
            var comp = draft.O("plan").O("composition");
            if (comp.A("deck").Strings().Contains(handle))
                result.Add("saved_draft_deck");
            if (comp.A("equipment").Strings().Contains(handle))
                result.Add("saved_draft_equipment");
        }

        return result.ToArray();
    }

    internal static JsonObject Quote(JsonObject d, JsonArray ids)
    {
        Unique(ids, "duplicate_or_empty_conversion");
        J.Check(ids.Count > 0, "duplicate_or_empty_conversion");
        var e = d.O("session").O("economy");
        long units = 0;
        foreach (var id in ids.Strings())
        {
            J.Check(id.StartsWith("owned:", StringComparison.Ordinal) && e.O("inventory").ContainsKey(id[6..]), "missing_possession");
            var item = e.O("inventory").O(id[6..]);
            J.Check(e.O("unified").O("grants")[id[6..]]?.S("source") != "initial_card", "initial_grant_not_convertible");
            J.Check(!item.B("locked"), "item_locked");
            J.Check(Usage(d, id[6..]).Length == 0, "item_in_use");
            units = checked(units + ConversionUnits(item.S("band")));
        }

        return J.Obj(("item_ids", ids), ("units", units), ("removed_count", ids.Count), ("unspent_before_units", Funds(e)), ("unspent_after_units", checked(Funds(e) + units)), ("learning_refund_units", 0), ("knowledge_and_unlocks_preserved", true));
    }

    internal static int ConversionUnits(string band)
    {
        var cfg = Content.M1.O("rules").O("conversion");
        J.Check(cfg.O("value_bands_units").ContainsKey(band), "unknown_value_band");
        return cfg.O("value_bands_units").I(band) * cfg.A("rate")[0].I() / cfg.A("rate")[1].I();
    }

    internal static JsonObject View(JsonObject d)
    {
        var s = d.O("session");
        var e = s.O("economy");
        var owned = new JsonArray();
        foreach (var item in e.O("inventory").Values().OrderBy(x => x.S("uid"), StringComparer.Ordinal))
        {
            var uid = item.S("uid");
            string id = "owned:" + uid;
            var b = item.O("blueprint");
            var refs = Usage(d, uid);
            var reasons = new List<string>();
            if (e.O("unified").O("grants")[uid]?.S("source") == "initial_card")
                reasons.Add("initial_grant_not_convertible");
            if (item.B("locked"))
                reasons.Add("item_locked");
            if (refs.Length > 0)
                reasons.Add("item_in_use");
            bool selected = s.O("au").A("deck").Strings().Contains(id) || e.O("aq").A("equipped").Strings().Contains(id);
            owned.Add(J.Obj(("id", id), ("blueprint", b), ("quantity", 1), ("selected", selected), ("location", selected ? "composition" : "possession"), ("locked", item.B("locked")), ("eligible", true), ("references", refs), ("conversion_available", reasons.Count == 0), ("conversion_reasons", reasons), ("conversion_units", reasons.Contains("initial_grant_not_convertible") ? 0 : ConversionUnits(item.S("band"))), ("details", b.S("kind") == "card" ? Content.Compile(b) : PassiveDetails(b))));
        }

        var groups = owned.Rows().GroupBy(x => x.O("blueprint").S("key")).Select(g => J.Obj(("group_key", g.Key), ("quantity", g.Count()), ("selected_quantity", g.Count(x => x.B("selected"))), ("selection_ids", g.Select(x => x.S("id"))), ("composition_ids", g.Where(x => x.B("selected")).Select(x => x.S("id"))), ("possession_ids", g.Where(x => !x.B("selected")).Select(x => x.S("id")))));
        var batch = CurrentBatch(e);
        int used = ValidateEquipment(e, e.O("aq").A("equipped").Strings());
        var latest = s.O("receipts").Values().OrderByDescending(x => x.L("index")).FirstOrDefault();
        var options = Options(e);
        foreach (var option in options.Rows())
        {
            var b = option.O("blueprint");
            option.Put("details", b.S("kind") == "card" ? Content.Compile(b) : PassiveDetails(b));
        }
        // 防御札の省略時2回は既存Playの既定値。nullの無制限と欠落を区別して公開する。
        // 説明用のコピーだけを補い、所持個体・blueprint・価格・保存形式は変更しない。
        foreach(var row in owned.Rows().Concat(options.Rows()))
            if(row.O("details").S("kind")=="guard"&&!row.O("details").ContainsKey("defense_uses"))row.O("details").Put("defense_uses",2);

        return J.Obj(("owned", owned), ("groups", J.Array(groups)), ("acquisition", options), ("equipment", J.Obj(("entries", e.O("aq")["equipped"]), ("used", used), ("capacity", 8), ("remaining", 8 - used))), ("deck", J.Obj(("composition", s.O("au")["deck"]), ("size", 12), ("per_base_cap", 2), ("order_semantics", "unordered_composition"))), ("economy", J.Obj(("unspent_units", Funds(e)), ("historical_learning_units", e.O("profile").O("learned").Sum(x => x.Value.L()) * 100), ("refundable_units", 0))), ("offers", J.Obj(("status", batch?["purchased"] is not null ? "purchased" : batch?.A("candidates").Count > 0 ? "available" : "none"), ("carried_from_previous_return", batch is not null && latest is not null && batch.O("context").S("run") != latest.S("run")))));
    }

    private static JsonObject PassiveDetails(JsonObject b)
    {
        string basis = b.S("base");
        var config = Content.M1.O("rules").O("learning").O("bases").O(basis);
        var modifiers = b.A("affixes").Strings().Select(id => Content.Economy.O("affixes").O("passive").O(id)).ToArray();
        string field = basis == "PS01" ? "discount" : basis == "PS02" ? "hit" : "power";
        string key = basis switch
        {
            "PS01" => "placement_discount",
            "PS02" => "hit_bonus",
            "PS03" => "guard_bonus",
            _ => "heal_bonus"
        };
        int value = config.I(key) + modifiers.Sum(x => x.I("strength")) * Content.Economy.O("affixes").O("passive_strength_units").I(basis);
        // Godot側で心得の効果を再計算させない。既存JSの公開詳細と同じ仮表示名・条件をCoreで合成する。
        // 追加するのは公開説明だけで、DTO・価格・演算規則・保存形式は変更しない。
        int extra = modifiers.Sum(x => x.I("discount"));
        string name = basis switch { "PS01" => "守りからの設置", "PS02" => "属性連携", "PS03" => "借り札の守り", _ => "回復の工夫" };
        string effect = basis switch { "PS01" => $"行動間隔を{value + extra}短縮（最小1）", "PS02" => $"探査を{value}加算", "PS03" => $"今回の身構の基礎値を{value}加算", _ => $"回復量を{value}加算（最大余力まで）" };
        if (basis != "PS01" && extra != 0) effect += $"。行動間隔を{Math.Abs(extra)}" + (extra > 0 ? "短縮（最小1）" : "延長");
        string trigger = basis switch { "PS01" => "直前の本人行動が防御一致で、今回が設置", "PS02" => "直前の本人の一致と異なる属性で攻撃一致", "PS03" => "他主体由来の札で本人が一致し、その後に防御一致", _ => "消耗する回復札で本人が回復一致" };
        var gates = modifiers.Where(x => x["gate"] is not null).Select(x => x.S("gate") == "borrowed" ? "今回の札が他主体由来" : "今回の札がB属性");
        return J.Obj(("name", string.Join("・", modifiers.Select(x => x.S("label")).Append(name))),
        ("trigger_text", string.Join("。", new[] { trigger }.Concat(gates))), ("effect_text", effect), ("base", basis), ("trigger", basis switch
        {
            "PS01" => "防御一致後の不一致設置",
            "PS02" => "直前の一致と異なる属性の攻撃一致",
            "PS03" => "借り札一致後の防御一致",
            _ => "回収時消滅する回復札の一致"
        }), ("effect_field", field), ("effect_value", value), ("extra_discount", modifiers.Sum(x => x.I("discount"))), ("gates", modifiers.Where(x => x["gate"] is not null).Select(x => x.S("gate"))), ("modifiers", J.Array(modifiers)), ("equipment_cost", Content.EquipmentCost(b)));
    }
}

internal static class Offers
{
    internal static string CandidateRef(string batch, string choice) => J.Text(new[] { "CW-M1-candidate-1", batch, choice });
    internal static string BatchId(JsonObject r) => J.Text(new[] { "CW-M1-offer-1", r.S("run"), r.S("content_set_id") });
    internal static JsonArray Generate(JsonObject context)
    {
        var cfg = Content.Economy.O("offers");
        var affixes = Content.Economy.O("affixes");
        var tier = cfg.O("tiers").O(context.S("tier"));
        var entries = context.A("card_bases").Strings().SelectMany(b => Content.Variants("card", b)).Concat(cfg.A("passive_pool").Strings().SelectMany(b => Content.Variants("passive", b))).Where(b => b.A("affixes").Count == 0 || b.A("affixes").Strings().Any(id => affixes.O(b.S("kind")).O(id).B("benefit"))).ToArray();
        int serial = 0;
        uint Word(string purpose) => Convert.ToUInt32(J.Hash(J.Text(new object? [] { cfg.S("namespace"), context.L("seed"), context.L("index"), context.S("route"), context.S("tier"), context["sources"], purpose, serial++ }))[..8], 16);
        T Draw<T>(IEnumerable<T> xs, Func<T, int> weight, string purpose)
        {
            var positive = xs.Select(x => (x, w: weight(x))).Where(x => x.w > 0).ToArray();
            int total = positive.Sum(x => x.w);
            J.Check(total > 0, "no_eligible_offer");
            long n = Word(purpose) % (uint)total;
            foreach (var row in positive)
            {
                if (n < row.w)
                    return row.x;
                n -= row.w;
            }

            throw new InvalidOperationException();
        }

        int count = tier.A("count")[0].I() + (int)(Word("count") % (tier.A("count")[1].I() - tier.A("count")[0].I() + 1));
        var result = new JsonArray();
        var used = new HashSet<string>();
        for (int i = 0; i < count; i++)
        {
            var eligible = entries.Where(b => !used.Contains(b.S("key")) && tier.A("affix_count_weights")[b.A("affixes").Count].I() > 0).ToArray();
            if (eligible.Length == 0)
                break;
            if (i == 1)
            {
                var first = result[0]!.O("blueprint");
                var other = eligible.Where(b => b.S("kind") + ":" + b.S("base") != first.S("kind") + ":" + first.S("base")).ToArray();
                if (other.Length > 0)
                    eligible = other;
            }

            var kind = Draw(eligible.Select(b => b.S("kind")).Distinct(), k => cfg.O("kind_weights").I(k), "kind");
            var basis = Draw(eligible.Where(b => b.S("kind") == kind).Select(b => b.S("base")).Distinct(), b => kind == "passive" ? cfg.O("passive_base_weights").O(context.S("route")).I(b) : cfg.I("card_base_weight"), "base");
            var variants = eligible.Where(b => b.S("kind") == kind && b.S("base") == basis).ToArray();
            int length = Draw(variants.Select(b => b.A("affixes").Count).Distinct(), n => tier.A("affix_count_weights")[n].I(), "affix-count");
            var chosen = Draw(variants.Where(b => b.A("affixes").Count == length), _ => 1, "variant");
            result.Add(J.Obj(("id", "choice-" + i), ("blueprint", chosen), ("price_units", cfg.I("price_units")), ("band", cfg.S("value_band"))));
            used.Add(chosen.S("key"));
        }

        return result;
    }

    internal static void Receive(JsonObject s, JsonObject receipt)
    {
        var e = s.O("economy");
        var at = e.O("at");
        J.Check(!at.O("returns").ContainsKey(receipt.S("run")), "duplicate_offer_return");
        var kept = receipt.A("kept").Strings();
        string? id = kept.Length > 0 ? BatchId(receipt) : null;
        at.O("returns").Put(receipt.S("run"), J.Obj(("receipt_signature", receipt.S("signature")), ("batch", id)));
        if (id is null)
            return;
        var retained = kept.Select(k => receipt.O("reward_ledger").O(k)).ToArray();
        var cfg = Content.Economy.O("offers");
        var tier = retained.Select(r => cfg.O("event_tiers").S(r.S("source_event_id"))).OrderByDescending(t => cfg.O("tiers").O(t).I("rank")).First();
        var context = J.Select(receipt, "run", "seed", "index", "case_id", "mode", "target_set_id", "content_set_id").With(("route", "A"), ("tier", tier), ("sources", kept.Order(StringComparer.Ordinal)), ("card_bases", e.O("profile").A("unlocked").Strings().Order(StringComparer.Ordinal)), ("reward_ids", retained.Select(x => x.S("reward_id")).Order(StringComparer.Ordinal)), ("source_event_ids", retained.Select(x => x.S("source_event_id")).Order(StringComparer.Ordinal)), ("target_ids", retained.Select(x => x.S("target_id")).Order(StringComparer.Ordinal)), ("catalogue_versions", retained.Select(x => x.S("catalogue_version")).Order(StringComparer.Ordinal)));
        var candidates = Generate(context);
        at.O("batches").Put(id, J.Obj(("id", id), ("version", cfg.S("version")), ("context", context), ("candidates", candidates), ("purchased", null)));
        at.Put("current", id);
        foreach (var c in candidates.Rows())
            e.O("known").Put(c.O("blueprint").S("key"), c["blueprint"]);
    }
}
