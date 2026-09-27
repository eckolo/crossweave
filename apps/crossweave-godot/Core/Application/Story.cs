using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;
internal static class Story
{
    internal static string Mode(JsonObject c) => c.S("status") == "resolved" ? "revisit" : c.I("attempts") > 0 ? "retry" : "first";
    internal static JsonObject Context(JsonObject d, string? sceneId = null, JsonObject? knowledge = null)
    {
        var s = d.O("session");
        var a = s["active"] as JsonObject;
        var c = d.O("casebook").O("SCN-001");
        var game = (s["game"] as JsonObject)?["state"] as JsonObject;
        var k = knowledge ?? game?.O("ah").O("knowledge") ?? s.O("economy").O("profile").O("knowledge");
        var actor = Content.M1.O("targets").O("SCN-001-ACT02");
        return J.Obj(("mode", a?.S("mode") ?? Mode(c)), ("scene_id", sceneId ?? s["scene"]?.S("id")), ("outcome", game?["outcome"]), ("clues", J.Obj(Content.M1.O("clues").Select(x => (x.Key[8..], (object? )c.A("visible_clue_ids").Strings().Contains(x.Key))).ToArray())), ("known_actor", J.Obj(("ACT02", k.A("encounters").Rows().Any(x => x.S("profile") == actor.S("knowledge_profile_id"))))), ("catalogue", J.Obj(("ACT02", k.A("events").Rows().Any(x => x.S("kind") == "initial_catalogue_grant" && x.S("profile") == actor.S("knowledge_profile_id") && x.S("version") == actor.S("catalogue_version"))))), ("current", J.Obj(("t1", game is not null && (game.O("rewards").ContainsKey("SCN-001-RW01") || game.O("rewards").ContainsKey("SCN-001-RW04"))), ("cause_public", a is not null && a.A("published_scene_ids").Strings().Any(id => id is "SCN-001-S04" or "SCN-001-S04R")), ("enemy_result", game?.O("ah")["enemy_result"]), ("borrowed_first", game?.O("ah")["borrowed_first"] ?? new JsonObject()))), ("resuming_unsettled", false), ("resuming_settled", false));
    }

    private static bool Eligible(JsonObject condition, JsonObject context)
    {
        if (condition["all"] is JsonArray all)
            return all.Rows().All(c => Eligible(c, context));
        if (condition["any"] is JsonArray any)
            return any.Rows().Any(c => Eligible(c, context));
        if (condition["not"] is JsonObject not)
            return !Eligible(not, context);
        var pair = (condition["eq"] ?? condition["in"]) as JsonArray ?? throw new RuleException("invalid_text_condition");
        JsonNode? value = context;
        foreach (var key in pair[0].S().Split('.'))
            value = value is JsonObject o ? o[key] : null;
        if (value is null && pair[1] is JsonValue v && v.TryGetValue<bool>(out _))
            value = JsonValue.Create(false);
        return condition.ContainsKey("eq") ? JsonNode.DeepEquals(value, pair[1]) : ((JsonArray)pair[1]!).Any(x => JsonNode.DeepEquals(x, value));
    }

    private static string History(JsonObject d, string kind, string scene, IEnumerable<string> ids, JsonObject context)
    {
        var id = $"M1-public:{d.L("revision")}:{d.A("public_history").Count + 1}";
        d.A("public_history").Add(J.Obj(("id", id), ("kind", kind), ("scene_id", scene), ("run", d.O("session")["active"]?["run"]), ("text_ids", ids), ("context", context)));
        return id;
    }

    private static void Clues(JsonObject d, IEnumerable<string> textIds, string eventId)
    {
        var ids = textIds.ToHashSet();
        var c = d.O("casebook").O("SCN-001");
        var s = d.O("session");
        var a = s["active"] as JsonObject;
        foreach (var(id, clue)in Content.M1.O("clues"))
            if (clue!.A("publication_text_ids").Strings().Any(ids.Contains))
            {
                if (id == "SCN-001-CL04" && !(a is not null && s.O("receipts")[a.S("run")]?.S("outcome") == "clear" && a.S("mode") != "revisit"))
                    continue;
                if (!c.A("visible_clue_ids").Strings().Contains(id))
                {
                    c.A("visible_clue_ids").Add(id);
                    c.O("first_clue_events").Put(id, eventId);
                    if (a is not null)
                    {
                        if (c.O("run_achievements")[a.S("run")] is null)
                            c.O("run_achievements").Put(a.S("run"), new JsonArray());
                        c.O("run_achievements").A(a.S("run")).UniqueAdd(J.Text(new[] { "CW-M1-achievement-1", "SCN-001-ACH-CLUE", J.Text(new[] { "SCN-001", id }) }));
                    }
                }

                if (a is not null)
                    a.A("published_clue_ids").UniqueAdd(id);
            }
    }

    internal static void Publish(JsonObject d, string id, JsonObject? knowledge = null)
    {
        J.Check(Content.M1.O("scenes").ContainsKey(id), "unknown_scene");
        var spec = Content.M1.O("scenes").O(id);
        var ctx = Context(d, id, knowledge);
        var a = d.O("session")["active"] as JsonObject;
        var texts = Content.M1.O("texts");
        var ids = texts.Where(x => x.Value.S("kind")is "main" or "conditional" && Eligible(x.Value!.O("eligible_when"), ctx)).Where(x => x.Value.S("kind") != "conditional" || a is null || !a.A("emitted_conditionals").Strings().Contains(x.Key)).Select(x => x.Key).ToArray();
        var optional = texts.Where(x => x.Value.S("kind") == "detail" && Eligible(x.Value!.O("eligible_when"), ctx)).Select(x => x.Key).ToArray();
        var ev = History(d, "scene", id, ids, ctx);
        d.O("session").Put("scene", J.Obj(("id", id), ("pause", spec.B("pause")), ("text_ids", ids), ("optional_text_ids", optional), ("publication_event_id", ev), ("context", ctx)));
        if (a is not null)
        {
            a.A("published_scene_ids").UniqueAdd(id);
            foreach (var text in ids)
                if (texts[text].S("kind") == "conditional")
                    a.A("emitted_conditionals").UniqueAdd(text);
        }

        Clues(d, ids, ev);
    }

    internal static void Conditionals(JsonObject d)
    {
        var s = d.O("session");
        if (s["active"] is not JsonObject a || s["scene"] is not JsonObject scene)
            return;
        var ctx = Context(d);
        var ids = Content.M1.O("texts").Where(x => x.Value.S("kind") == "conditional" && !a.A("emitted_conditionals").Strings().Contains(x.Key) && Eligible(x.Value!.O("eligible_when"), ctx)).Select(x => x.Key).ToArray();
        if (ids.Length == 0)
            return;
        History(d, "conditional", scene.S("id"), ids, ctx);
        foreach (var id in ids)
        {
            scene.A("text_ids").Add(id);
            a.A("emitted_conditionals").Add(id);
        }
    }

    internal static void RecordDisplayed(JsonObject d, JsonObject payload)
    {
        var scene = d.O("session").O("scene");
        J.Check(scene.S("id") == payload.S("scene_id"), "stale_scene");
        var ids = (payload["displayed_text_ids"] as JsonArray ?? scene.A("text_ids")).Strings();
        J.Check(ids.Distinct().Count() == ids.Length, "invalid_displayed_text_ids");
        var allowed = scene.A("text_ids").Strings().Concat(scene.A("optional_text_ids").Strings()).ToHashSet();
        J.Check(ids.All(allowed.Contains), "text_not_available");
        var c = d.O("casebook").O("SCN-001");
        foreach (var id in ids)
        {
            var ev = History(d, "displayed", scene.S("id"), [id], scene.O("context"));
            c.A("read_text_ids").UniqueAdd(id);
            if (d.O("session")["active"] is JsonObject a)
                a.A("read_text_ids").UniqueAdd(id);
            Clues(d, [id], ev);
        }
    }

    internal static JsonObject View(JsonObject d)
    {
        var s = d.O("session");
        var scene = s["scene"] as JsonObject;
        var ctx = Context(d);
        var objective = Content.M1.O("texts").FirstOrDefault(x => x.Value.S("kind") == "objective" && Eligible(x.Value!.O("eligible_when"), ctx)).Key;
        var ids = (scene?.A("text_ids").Strings() ?? []).Concat(scene?.A("optional_text_ids").Strings() ?? []).Concat(objective is null ? [] : new[] { objective }).Distinct();
        var read = d.O("casebook").O("SCN-001").A("read_text_ids").Strings();
        JsonObject Text(string id) => J.Select(Content.M1.O("texts").O(id), "short_text", "kind").With(("id", id), ("read", read.Contains(id)));
        return J.Obj(("objective", objective), ("texts", J.Array(ids.Select(Text))), ("text_history", J.Array(d.A("public_history").Rows().Where(e => e.S("kind") != "displayed").SelectMany(e => e.A("text_ids").Strings()).Concat(read).Distinct().Select(Text))), ("scene", scene is null ? null : J.Select(scene, "id", "text_ids", "optional_text_ids").With(("paused", scene.B("pause")))));
    }
}

internal static class Settlement
{
    internal static JsonObject Ledger(JsonObject s)
    {
        var a = s.O("active");
        var ledger = new JsonObject();
        foreach (var(id, r)in s.O("game").O("state").O("rewards"))
        {
            var spec = Content.M1.O("rewards").O(id);
            var t = Content.M1.O("targets").O(spec.S("target_id"));
            var key = J.Text(new[] { "CW-M1-reward-1", a.S("run"), id, spec.S("source_event_id") });
            ledger.Put(key, J.Obj(("key", key), ("reward_id", id), ("run", a.S("run")), ("case_id", a.S("case_id")), ("mode", a.S("mode")), ("target_set_id", a.S("target_set_id")), ("target_id", t.S("id")), ("catalogue_version", t.S("catalogue_version")), ("content_set_id", Content.M1.S("content_set_id")), ("source_event_id", spec.S("source_event_id")), ("legacy_engine_key", spec["legacy_engine_key"]), ("protected", r.B("protected")), ("items", spec["items"])));
        }

        return ledger;
    }

    internal static void Apply(JsonObject d)
    {
        var s = d.O("session");
        var a = s.O("active");
        var g = s.O("game").O("state");
        var e = s.O("economy");
        var profile = e.O("profile");
        var c = d.O("casebook").O(a.S("case_id"));
        string run = a.S("run"), outcome = g.S("outcome");
        J.Check(outcome is "clear" or "withdrawal" or "defeat", "unsettled_expedition");
        J.Check(!s.O("receipts").ContainsKey(run), "duplicate_settlement");
        var ledger = Ledger(s);
        var kept = ledger.Where(x => outcome == "clear" || outcome == "withdrawal" && x.Value.B("protected")).Select(x => x.Key).ToArray();
        var lost = ledger.Select(x => x.Key).Except(kept).ToArray();
        var previousKnowledge = profile.O("knowledge").Copy();
        var before = c.Copy();
        var oldUnlocked = profile.A("unlocked").Strings();
        profile.Put("knowledge", g.O("ah")["knowledge"]);
        long gained = 0;
        foreach (var key in kept)
            foreach (var item in ledger.O(key).A("items").Rows())
                switch (item.S("kind"))
                {
                    case "points":
                        gained += item.L("amount_units");
                        break;
                    case "material":
                        profile.O("materials").Put(item.S("type"), profile.O("materials").I(item.S("type")) + item.I("amount"));
                        break;
                    case "unlock":
                        profile.A("unlocked").UniqueAdd(item.S("type"));
                        break;
                }

        Preparation.SetFunds(e, checked(Preparation.Funds(e) + gained));
        profile.Put("phase", "home");
        profile.Put("run", null);
        var ev = J.Text(new[] { "CW-M1-settlement-1", run });
        var achievements = new List<string>();
        if (outcome == "clear" && a.S("mode") != "revisit")
        {
            c.Put("status", "resolved");
            if (c["first_resolved_event"] is null)
                c.Put("first_resolved_event", ev);
            achievements.Add(J.Text(new[] { "CW-M1-achievement-1", "SCN-001-ACH-RESOLVED", a.S("case_id") }));
        }

        if (outcome == "clear" && a.S("mode") == "revisit")
        {
            if (c["first_route_checked_event"] is null)
                c.Put("first_route_checked_event", ev);
            achievements.Add(J.Text(new[] { "CW-M1-achievement-1", "SCN-001-ACH-ROUTE-CHECKED", a.S("case_id") }));
        }

        var unlocks = profile.A("unlocked").Strings().Except(oldUnlocked).ToArray();
        achievements.AddRange(unlocks.Select(b => J.Text(new[] { "CW-M1-achievement-1", "SCN-001-ACH-UNLOCK", b })));
        var newKnowledge = profile.O("knowledge").A("events").Rows().Where(x => !previousKnowledge.A("events").Rows().Any(p => p.S("id") == x.S("id"))).ToArray();
        achievements.AddRange(newKnowledge.Where(x => x.S("kind") == "initial_catalogue_grant").Select(x => J.Text(new[] { "CW-M1-achievement-1", "SCN-001-ACH-CATALOGUE", J.Text(new[] { x.S("profile"), x.S("version") }) })));
        if (c.O("run_achievements")[run] is null)
            c.O("run_achievements").Put(run, new JsonArray());
        foreach (var achievement in achievements)
            c.O("run_achievements").A(run).UniqueAdd(achievement);
        if (outcome == "clear")
            profile.A("clears").UniqueAdd("A");
        var receipt = J.Select(a, "run", "index", "seed", "mode", "case_id", "target_set_id", "content_set_id").With(("outcome", outcome), ("settlement_event_id", ev), ("source_events", ledger.Values().Select(x => x.S("source_event_id"))), ("reward_ledger", ledger), ("kept", kept), ("lost", lost), ("gained_units", gained), ("unspent_after_units", Preparation.Funds(e)), ("paid_learning_units", profile.O("learned").Sum(x => x.Value.L()) * 100), ("kept_items", J.Array(kept.SelectMany(k => ledger.O(k).A("items").Rows().Where(x => x.S("kind") != "unlock").Select(x => x.Copy().With(("protected", ledger.O(k).B("protected"))))))), ("lost_items", J.Array(lost.SelectMany(k => ledger.O(k).A("items").Rows()))), ("new_unlocks", unlocks), ("new_knowledge", J.Array(newKnowledge)), ("knowledge_changes", J.Obj(("observations", newKnowledge.Count(x => x.S("kind") == "observed_card")), ("catalogues", J.Array(newKnowledge.Where(x => x.S("kind") == "initial_catalogue_grant").Select(x => J.Select(x, "profile", "version")))), ("retained_on_all_outcomes", true))), ("case_changes", J.Obj(("before", before.S("status")), ("after", c.S("status")), ("resolved_now", before.S("status") != "resolved" && c.S("status") == "resolved"), ("route_checked_now", before["first_route_checked_event"] is null && c["first_route_checked_event"] is not null))), ("expedition_end_hp", g.O("actors").O("P").I("hp")), ("home_hp", 40), ("offer_batch_id", kept.Length > 0 ? Offers.BatchId(a) : null), ("end_id", outcome == "clear" ? (a.S("mode") == "revisit" ? "SCN-001-END-R" : "SCN-001-END-C") : outcome == "defeat" ? "SCN-001-END-E" : !ledger.Values().Any(r => r.S("reward_id")is "SCN-001-RW01" or "SCN-001-RW04") ? "SCN-001-END-W0" : a.A("published_scene_ids").Strings().Any(id => id is "SCN-001-S04" or "SCN-001-S04R") ? "SCN-001-END-W2" : "SCN-001-END-W1"));
        receipt.Put("signature", J.Canonical(receipt));
        s.O("receipts").Put(run, receipt);
        profile.O("returns").Put(run, receipt.S("signature"));
        Offers.Receive(s, receipt);
        a.Put("reward_ledger", ledger);
        s.Put("phase", "return");
    }
}
