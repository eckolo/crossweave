using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;
internal sealed class Expedition
{
    internal readonly JsonObject Data;
    internal JsonObject State => Data.O("state");

    internal readonly List<JsonObject> Trace = [];
    private readonly JsonObject targetSet;
    private readonly string targetSetId;
    private readonly Dictionary<string, MtRandom> rng;
    internal Expedition(JsonObject data, string targetSetId)
    {
        Data = data;
        this.targetSetId = targetSetId;
        targetSet = Content.M1.O("target_sets").O(targetSetId);
        rng = data.O("rng").ToDictionary(x => x.Key, x => new MtRandom((JsonArray)x.Value!));
    }

    internal JsonObject Save()
    {
        var copy = Data.Copy();
        copy.O("state").Put("N", Live());
        copy.Put("rng", J.Obj(rng.Select(x => (x.Key, (object? )x.Value.Export())).ToArray()));
        return copy;
    }

    private JsonObject Actors => State.O("actors");
    private JsonObject Cards => State.O("cards");
    private JsonObject Ah => State.O("ah");

    private JsonObject Target(string who) => Content.M1.O("targets").O(targetSet.O("slot_map").S(who));
    private JsonObject Spec(string who) => who == "P" ? Content.M1.O("rules").O("player") : Target(who).O("spec");
    private int Live() => Cards.Values().Count(c => !c.B("destroyed"));
    private MtRandom Stream(string who, string purpose) => rng[who + "|" + purpose];
    private void Log(string type, params (string, object? )[] fields)
    {
        var row = J.Obj(("type", type), ("time", State.I("now")));
        foreach (var(k, v)in fields)
            row.Put(k, v);
        Trace.Add(row);
    }

    internal static JsonObject Depart(JsonObject session, JsonObject active)
    {
        var e = session.O("economy");
        var streams = MtRandom.Streams(active.L("seed"));
        var cards = new JsonObject();
        var deck = new List<string>();
        int number = 0;
        foreach (var handle in session.O("au").A("deck").Strings().Order(StringComparer.Ordinal))
        {
            var item = Preparation.Resolve(e, handle, "card");
            var b = item.O("blueprint");
            var uid = item.S("uid");
            var card = e.O("unified").O("grants")[uid]?.S("source") == "initial_card" ? Content.Card(b.S("base")) : Content.Compile(b);
            var id = "P_initial_" + (++number).ToString("D4");
            InitCard(card, id, "P", "initial");
            card.Put("selection_id", handle);
            cards.Put(id, card);
            deck.Add(id);
        }

        var shuffle = new MtRandom(streams.A("P|initial"));
        shuffle.Shuffle(deck);
        var player = Actor("P", SpecPlayer(), 0);
        player.Put("deck", deck);
        var known = e.O("profile").O("knowledge").A("events").Rows().SelectMany(x => x.S("kind") == "observed_card" ? new[] { x.O("card").S("type") } : x.S("kind") == "initial_catalogue_grant" ? x.A("cards").Rows().Select(c => c.O("card").S("type")) : []).Distinct().ToArray();
        var state = J.Obj(("economy_version", "CW-M1-economy-2"), ("posture_rule", "AM1"), ("defense_rule", "D56"), ("actors", J.Obj(("P", player))), ("cards", cards), ("pool", new JsonArray()), ("field", new JsonObject()), ("rewards", new JsonObject()), ("events", new JsonArray()), ("boundary_number", 0), ("now", 0), ("ready", false), ("outcome", null), ("settlement", null), ("rules", "corrected"), ("p_size", 12), ("current_event", "A/start"), ("pending_scene", null), ("diagnostic", null), ("ah", J.Obj(("run", active.S("run")), ("learned", e.O("profile").O("learned").Select(x => x.Key)), ("equipped", e.O("aq")["equipped"]), ("equipment_entries", J.Array(e.O("aq").A("equipped").Strings().Select(id => J.Obj(("id", id), ("uid", id[6..]), ("blueprint", Preparation.Resolve(e, id, "passive")["blueprint"]), ("cost", Content.EquipmentCost(Preparation.Resolve(e, id, "passive").O("blueprint"))))))), ("pending", J.Obj(("after_guard", false), ("last_match_attr", null), ("borrowed_guard", false))), ("knowledge", e.O("profile")["knowledge"]), ("catalogues", new JsonObject()), ("seq", 0), ("enemy_result", null), ("borrowed_first", new JsonObject()), ("known_bases_at_departure", known))));
        var data = J.Obj(("state", state), ("next_card_number", 12), ("memory", J.Obj(("recent", J.Obj(("P", new JsonArray()))), ("observed_types", new JsonObject()))), ("rng", J.Obj(("P|initial", shuffle.Export()))), ("future_rng", streams));
        foreach (var purpose in new[]
        {
            "allocation",
            "generation",
            "selection",
            "target"
        }

        )
            data.O("rng").Put("P|" + purpose, streams["P|" + purpose]);
        var g = new Expedition(data, active.S("target_set_id"));
        foreach (var target in g.targetSet.A("initial_targets").Strings())
            g.Enter(Content.M1.O("targets").O(target).S("runtime_actor_id"), 0);
        g.Validate();
        return g.Save();
    }

    private static JsonObject SpecPlayer() => Content.M1.O("rules").O("player");
    private static JsonObject Actor(string role, JsonObject spec, int at) => J.Obj(("role", role), ("acts", true), ("hp", spec.I("hp")), ("max_hp", spec.I("hp")), ("hit", 0), ("max_posture", spec.I("max_posture")), ("crit", 0), ("defense_effects", new JsonArray()), ("hand", new JsonArray()), ("deck", new JsonArray()), ("active", true), ("next_at", at), ("actions", 0), ("hand_size", spec.I("hand_size")), ("initial_size", 12), ("cap", 12), ("minimum", spec.I("hand_size")), ("passives", new JsonArray()), ("rebuilds", 0));
    private static void InitCard(JsonObject card, string id, string who, string birth)
    {
        card.Put("id", id);
        card.Put("origin", who);
        card.Put("birth", birth);
        card.Put("remaining", null);
        card.Put("doomed", false);
        card.Put("destroyed", false);
    }

    private string NewCard(string who, string birth, string type)
    {
        int number = Data.I("next_card_number") + 1;
        Data.Put("next_card_number", number);
        var id = $"{who}_{birth}_{number:D4}";
        var c = Content.Card(type);
        InitCard(c, id, who, birth);
        Cards.Put(id, c);
        return id;
    }

    private void Enter(string who, int at)
    {
        J.Check(!Actors.ContainsKey(who), "duplicate_actor");
        var role = who[..1];
        var target = Target(who);
        var a = Actor(role, target.O("spec"), at);
        Actors.Put(who, a);
        a = Actors.O(who);
        foreach (var purpose in new[]
        {
            "initial",
            "allocation",
            "generation",
            "selection",
            "target"
        }

        )
            rng[who + "|" + purpose] = new MtRandom(Data.O("future_rng").A(who + "|" + purpose));
        var types = role == "V" ? new List<string>
        {
            "weak_A",
            "weak_A",
            "weak_B",
            "weak_B",
            "weak_B",
            "weak_B",
            "weak_B",
            "weak_B",
            "weak_C",
            "weak_C",
            "weak_D",
            "weak_D"
        }

        : new List<string>
        {
            "f",
            "f",
            "h",
            "h",
            "l",
            "l",
            "j",
            "j",
            "g",
            "g",
            "r",
            "r"
        };
        foreach (var replacement in target.A("initial_replacements").Rows())
        {
            int n = 0;
            for (int i = 0; i < types.Count && n < replacement.I("count"); i++)
                if (types[i] == replacement.S("base"))
                {
                    types[i] = replacement.S("replacement");
                    n++;
                }
        }

        var deck = types.Select(t => NewCard(who, "initial", t)).ToList();
        Stream(who, "initial").Shuffle(deck);
        a.Put("deck", deck);
        Data.O("memory").O("recent").Put(who, new JsonArray());
        Data.O("memory").O("observed_types").Put(who, new JsonArray());
        Ah.O("catalogues").Put(target.S("catalogue_version"), J.Obj((target.S("knowledge_profile_id"), J.Array(types.GroupBy(x => x).OrderBy(g => J.Text(PublicCard(Content.Card(g.Key))), StringComparer.InvariantCulture).Select(g => J.Obj(("card", PublicCard(Content.Card(g.Key))), ("initial_count", g.Count())))))));
        Fact(who, "encounter");
        Log("enter", ("actor", who), ("first_at", at));
    }

    internal static JsonObject PublicCard(JsonObject c) => J.Select(c, "type", "name", "attr", "kind", "power", "hit", "evasion", "crit_gain", "field_power", "field_hit", "life", "place_cost", "match_cost", "consume_on_recover").WithOptional(c, "defense_uses", "defense_grant");
    private void Fact(string who, string kind, params (string, object? )[] fields)
    {
        var t = Target(who);
        Ah.Put("seq", Ah.I("seq") + 1);
        var e = J.Obj(("id", Ah.S("run") + ":" + Ah.I("seq")), ("run", Ah.S("run")), ("version", t.S("catalogue_version")), ("profile", t.S("knowledge_profile_id")), ("actor", who), ("time", State.I("now")), ("kind", kind));
        foreach (var(k, v)in fields)
            e.Put(k, v);
        var knowledge = Ah.O("knowledge");
        if (kind == "encounter")
            knowledge.A("encounters").AddCopy(J.Select(e, "id", "run", "version", "profile", "actor"));
        else if (kind == "resolution")
        {
            if (e.S("result")is not ("defeated" or "traversed") || knowledge.A("events").Rows().Any(x => x.S("kind") == "initial_catalogue_grant" && x.S("profile") == e.S("profile") && x.S("version") == e.S("version")))
                return;
            var grant = J.Select(e, "id", "run", "version", "profile");
            grant.Put("id", "grant:" + e.S("id"));
            grant.Put("kind", "initial_catalogue_grant");
            grant.Put("complete", true);
            grant.Put("evidence", $"AD trial first_resolution: public fact {e.S("id")} ({e.S("result")})");
            grant.Put("cards", Ah.O("catalogues").O(e.S("version"))[e.S("profile")]);
            knowledge.A("events").AddCopy(grant);
        }
        else
        {
            var row = J.Select(e, "id", "run", "version", "profile", "kind", "time");
            if (kind == "observed_card")
            {
                row.Put("actor", e.S("actor"));
                row.Put("card", PublicCard(e.O("card")));
            }
            else
            {
                row.Put("reward_key", e.S("reward_key"));
                row.Put("label", e.S("label"));
            }

            knowledge.A("events").AddCopy(row);
        }
    }

    private void Observe(IEnumerable<string> ids)
    {
        foreach (var id in ids)
        {
            var c = Cards.O(id);
            if (c.S("origin") == "P")
                continue;
            var t = Target(c.S("origin"));
            var signature = J.Canonical(PublicCard(c));
            if (!Ah.O("knowledge").A("events").Rows().Any(e => e.S("kind") == "observed_card" && e.S("run") == Ah.S("run") && e.S("profile") == t.S("knowledge_profile_id") && e.S("version") == t.S("catalogue_version") && J.Canonical(e["card"]) == signature))
                Fact(c.S("origin"), "observed_card", ("actor", "P"), ("card", c));
        }
    }

    private void Recover(string id, string reason)
    {
        var c = Cards.O(id);
        J.Check(!c.B("destroyed"), "destroyed_card_recovered");
        c.Put("remaining", null);
        if (c.B("consume_on_recover") || c.B("doomed") || c.S("birth") == "filler")
        {
            c.Put("destroyed", true);
            Log("destroy", ("card_id", id), ("reason", reason), ("origin", c.S("origin")), ("consumable", c.B("consume_on_recover")));
        }
        else
        {
            State.A("pool").Add(id);
            Log("recover", ("card_id", id), ("reason", reason));
        }
    }

    private void Rebuild(string who)
    {
        var a = Actors.O(who);
        var pool = State.A("pool").Strings().ToList();
        Stream(who, "allocation").Shuffle(pool);
        var taken = pool.Take(a.I("cap")).ToArray();
        State.Put("pool", pool.Skip(taken.Length));
        int need = Math.Max(0, a.I("minimum") - taken.Length), basic = Math.Min(need, Math.Max(0, 32 - Live()));
        var generated = new List<string>();
        var weights = a.S("role") == "V" ? new[]
        {
            2,
            6,
            2,
            2
        }

        : new[]
        {
            4,
            4,
            2,
            2
        };
        for (int i = 0; i < need; i++)
        {
            double value = Stream(who, "generation").NextDouble() * weights.Sum();
            int ix = 0, sum = 0;
            while (ix < 3 && (sum += weights[ix]) <= value)
                ix++;
            string birth = i < basic ? "basic" : "filler";
            generated.Add(NewCard(who, birth, (birth == "filler" ? "filler_" : "weak_") + "ABCD"[ix]));
        }

        var deck = taken.Concat(generated).ToList();
        Stream(who, "allocation").Shuffle(deck);
        a.Put("deck", deck);
        a.Put("rebuilds", a.I("rebuilds") + 1);
        Log("rebuild", ("actor", who), ("received", taken), ("generated", generated), ("basic_count", basic), ("filler_count", need - basic), ("cycle", a.I("rebuilds") + 1));
        if (who == "P")
            Observe(deck);
    }

    private void Refill(string who)
    {
        var a = Actors.O(who);
        while (a.A("hand").Count < a.I("hand_size"))
        {
            if (a.A("deck").Count == 0)
                Rebuild(who);
            var id = a.A("deck")[0].S();
            a.A("deck").RemoveAt(0);
            Cards.O(id).Put("remaining", Cards.O(id).I("life"));
            a.A("hand").Add(id);
            Log("draw", ("actor", who), ("card_id", id));
        }

        if (who == "P")
        {
            Observe(a.A("hand").Strings());
            foreach (var id in a.A("hand").Strings())
            {
                var c = Cards.O(id);
                if (c.S("origin") != "P" && new[]
                {
                    "nt_flow",
                    "nt_pressure",
                    "nt_stop"
                }.Contains(c.S("type")) && !Ah.A("known_bases_at_departure").Strings().Contains(c.S("type")))
                    Ah.O("borrowed_first").Put(c.S("type"), true);
            }
        }

        Validate();
    }

    private void Retire(string who)
    {
        var a = Actors.O(who);
        a.Put("active", false);
        a.Put("next_at", null);
        a.Put("defense_effects", new JsonArray());
        foreach (var c in Cards.Values().Where(c => c.S("origin") == who && !c.B("destroyed")))
            c.Put("doomed", true);
        var held = a.A("hand").Strings().Concat(a.A("deck").Strings()).ToArray();
        a.Put("hand", new JsonArray());
        a.Put("deck", new JsonArray());
        foreach (var id in held)
            Recover(id, who + "_retirement_private");
        var doomed = State.A("pool").Strings().Where(id => Cards.O(id).S("origin") == who).ToArray();
        State.Put("pool", State.A("pool").Strings().Except(doomed));
        foreach (var id in doomed)
            Recover(id, who + "_retirement_pool");
        Log("retire", ("actor", who));
    }

    internal static JsonObject? Guard(JsonObject a)
    {
        var effects = a.A("defense_effects").Rows();
        if (effects.Length == 0)
            return null;
        int? uses = effects.All(x => x["uses"] is not null) && effects.Select(x => x.I("uses")).Distinct().Count() == 1 ? effects[0].I("uses") : null;
        return J.Obj(("value", effects.Sum(x => x.I("guard"))), ("evasion", effects.Sum(x => x.I("evasion"))), ("uses", uses));
    }

    private int Passive(string who, string kind) => Actors.Values().Where(a => a.B("active")).SelectMany(a => a.A("passives").Rows()).Where(p => p.S("target") == who && p.S("kind") == kind).Sum(p => p.I("value"));
    private void Grant(string who, JsonObject effect)
    {
        var a = Actors.O(who);
        var es = a.A("defense_effects").Rows().Where(e => e.S("source_actor_id") != effect.S("source_actor_id") || e.S("effect_kind") != effect.S("effect_kind")).Append(effect);
        a.Put("defense_effects", J.Array(es.OrderBy(e => J.Text(new[] { e.S("source_actor_id"), e.S("effect_kind") }), StringComparer.InvariantCulture)));
    }

    private (string[] Ids, int Hit, int Power, int Discount) Effect(string who, JsonObject card, bool match)
    {
        var ids = new List<string>();
        int hit = 0, power = 0, discount = 0;
        if (who != "P")
            return ([], 0, 0, 0);
        var p = Ah.O("pending");
        foreach (var entry in Ah.A("equipment_entries").Rows())
        {
            var b = entry.O("blueprint");
            var basis = b.S("base");
            bool applies = basis switch
            {
                "PS01" => p.B("after_guard") && !match,
                "PS02" => match && card.S("kind") == "attack" && p.S("last_match_attr") != "" && p.S("last_match_attr") != card.S("attr"),
                "PS03" => match && card.S("kind") == "guard" && p.B("borrowed_guard"),
                "PS04" => match && card.S("kind") == "heal" && card.B("consume_on_recover"),
                _ => false
            };
            if (!applies)
                continue;
            var modifiers = b.A("affixes").Strings().Select(id => Content.Economy.O("affixes").O("passive").O(id)).ToArray();
            if (modifiers.Any(m => m.S("gate") == "borrowed" && card.S("origin") == who || m.S("gate") == "attribute_B" && card.S("attr") != "B"))
                continue;
            var config = Content.M1.O("rules").O("learning").O("bases").O(basis);
            string key = basis switch
            {
                "PS01" => "placement_discount",
                "PS02" => "hit_bonus",
                "PS03" => "guard_bonus",
                _ => "heal_bonus"
            };
            int value = config.I(key) + modifiers.Sum(x => x.I("strength")) * Content.Economy.O("affixes").O("passive_strength_units").I(basis);
            if (basis == "PS01")
                discount += value;
            else if (basis == "PS02")
                hit += value;
            else
                power += value;
            discount += modifiers.Sum(x => x.I("discount"));
            ids.Add(basis);
        }

        return (ids.ToArray(), hit, power, discount);
    }

    internal JsonArray Choices()
    {
        var result = new JsonArray();
        if (!State.B("ready") || State["outcome"] is not null)
            return result;
        foreach (var id in Actors.O("P").A("hand").Strings())
        {
            var c = Cards.O(id);
            IEnumerable<string?> targets = c.S("kind") == "attack" && State.O("field")[c.S("attr")] is not null ? Actors.Where(x => x.Key != "P" && x.Value.B("active")).Select(x => (string? )x.Key) : new string? []
            {
                null
            };
            foreach (var target in targets)
                result.Add(J.Obj(("card_id", id), ("target", target)));
        }

        return result;
    }

    private JsonObject Npc(string who)
    {
        var a = Actors.O(who);
        var cs = a.A("hand").Strings().Select(id => Cards.O(id)).ToArray();
        bool Match(JsonObject c) => State.O("field")[c.S("attr")] is not null;
        var heals = cs.Where(c => c.S("kind") == "heal" && c.I("power") > 0 && Match(c) && a.I("max_hp") - a.I("hp") >= 16).ToArray();
        if (heals.Length > 0)
            return J.Obj(("card_id", heals[0].S("id")), ("target", null));
        var attacks = cs.Where(c => c.S("kind") == "attack" && Match(c)).ToArray();
        var guards = cs.Where(c => c.S("kind") == "guard" && Match(c)).ToArray();
        var group = attacks.Length > 0 ? attacks : guards.Length > 0 ? guards : cs;
        var chosen = group[a.S("role") == "V" ? 0 : Stream(who, "selection").Below(group.Length)];
        return J.Obj(("card_id", chosen.S("id")), ("target", chosen.S("kind") == "attack" && Match(chosen) ? Spec(who).A("targets").Strings().First(id => Actors[id].B("active")) : null));
    }

    internal void Play(string who, JsonObject choice)
    {
        var a = Actors.O(who);
        string id = choice.S("card_id");
        J.Check(Cards.ContainsKey(id) && a.A("hand").Strings().Contains(id) && a.B("active") && State["outcome"] is null, "illegal_choice");
        var c = Cards.O(id);
        string? target = choice["target"] is null ? null : choice.S("target");
        var oldEvent = State.S("current_event");
        var oldGuard = Guard(a);
        var oldDefense = a.A("defense_effects").DeepClone();
        string? mid = State.O("field")[c.S("attr")]?.S();
        bool matched = mid is not null;
        var effect = Effect(who, c, matched);
        int cpower = c.I("power") + effect.Power, chit = c.I("hit") + effect.Hit;
        a.A("hand").RemoveString(id);
        c.Put("remaining", null);
        if (matched)
            State.O("field").Remove(c.S("attr"));
        string mode = "place";
        int damage = 0, actual = 0, gain = 0, restored = 0, crit = 0, overflow = 0, multiplier = 0;
        int? before = null, after = null;
        bool connected = false;
        if (!matched)
        {
            J.Check(target is null, "placement_target");
            State.O("field").Put(c.S("attr"), id);
        }
        else
        {
            var m = Cards.O(mid!);
            a.Put("defense_effects", new JsonArray());
            crit = c.I("crit_gain");
            a.Put("crit", a.I("crit") + crit);
            mode = c.S("kind");
            if (mode == "guard")
                Grant(who, J.Obj(("source_actor_id", who), ("effect_kind", "self_guard"), ("guard", Math.Max(0, cpower + m.I("field_power"))), ("evasion", c.I("evasion") + m.I("field_hit")), ("uses", c.ContainsKey("defense_uses") ? c["defense_uses"] : J.Node(2))));
            else if (mode == "defense_support")
            {
                J.Check(target is null, "support_target");
                var grant = c.O("defense_grant").Copy();
                grant.Put("guard", Math.Max(0, grant.I("guard") + m.I("field_power")));
                grant.Put("evasion", grant.I("evasion") + m.I("field_hit"));
                grant.Put("source_actor_id", who);
                foreach (var(recipient, r)in Actors)
                    if (recipient != who && r.B("active"))
                        Grant(recipient, grant);
            }
            else if (mode == "attack")
            {
                J.Check(target is not null && target != who && Actors[target].B("active"), "invalid_target");
                var d = Actors.O(target!);
                before = d.I("max_posture") - d.I("hit");
                gain = Math.Max(0, chit + m.I("field_hit") - Passive(target!, "evasion") - d.A("defense_effects").Rows().Sum(e => e.I("evasion")));
                d.Put("hit", d.I("hit") + gain);
                after = Math.Max(0, d.I("max_posture") - d.I("hit"));
                if (d.I("hit") >= d.I("max_posture"))
                {
                    connected = true;
                    int am = 1 + a.I("crit") / 100, hm = 1 + (d.I("hit") - d.I("max_posture")) / 100;
                    var guard = Guard(d);
                    overflow = d.I("hit") - d.I("max_posture");
                    multiplier = hm;
                    after = d.I("max_posture");
                    int defense = guard is null ? 0 : guard.I("value") * (1 + d.I("crit") / 100);
                    damage = Math.Max(0, ((cpower + m.I("field_power")) * am - defense - Passive(target!, "damage_reduction")) * hm);
                    actual = Math.Min(d.I("hp"), damage);
                    d.Put("hp", d.I("hp") - actual);
                    d.Put("hit", 0);
                    if (a.I("crit") >= 100)
                        a.Put("crit", 0);
                    if (guard is not null && d.I("crit") >= 100)
                        d.Put("crit", 0);
                }

                foreach (var de in d.A("defense_effects").Rows())
                    if (de["uses"] is not null)
                        de.Put("uses", de.I("uses") - 1);
                d.Put("defense_effects", J.Array(d.A("defense_effects").Rows().Where(e => e["uses"] is null || e.I("uses") > 0)));
            }
            else if (mode == "heal")
            {
                restored = Math.Min(cpower, a.I("max_hp") - a.I("hp"));
                a.Put("hp", a.I("hp") + restored);
            }
            else
                J.Check(mode == "none", "unsupported_card_kind");
            Recover(id, "played_match");
            Recover(mid!, "field_match");
        }

        var expired = new List<string>();
        foreach (var remaining in a.A("hand").Strings())
        {
            var rc = Cards.O(remaining);
            rc.Put("remaining", rc.I("remaining") - 1);
            if (rc.I("remaining") == 0)
            {
                a.A("hand").RemoveString(remaining);
                expired.Add(remaining);
                Recover(remaining, "expiry");
            }
        }

        a.Put("actions", a.I("actions") + 1);
        int cost = Math.Max(1, c.I(matched ? "match_cost" : "place_cost") - effect.Discount) * (Spec(who).ContainsKey("action_cost_scale") ? Spec(who).I("action_cost_scale") : 1);
        a.Put("next_at", State.I("now") + cost);
        if (mode == "attack" && target is not null && Actors.O(target).I("hp") == 0)
            Dispatch(target, who);
        Log("action", ("actor", who), ("action_number", a.I("actions")), ("card_id", id), ("target", target), ("matched_id", mid), ("mode", mode), ("damage", damage), ("actual_hp_loss", actual), ("hit_gain", gain), ("hit_connected", connected), ("posture_before", before), ("posture_after", after), ("posture_overflow", overflow), ("posture_multiplier", multiplier), ("hp_restored", restored), ("crit_added", crit), ("expired", expired), ("old_guard_ended", matched ? oldGuard : null), ("old_defense_ended", matched ? oldDefense : new JsonArray()), ("event_before", oldEvent), ("passives", effect.Ids), ("action_cost", cost), ("card_name", c.S("name")));
        var recent = Data.O("memory").O("recent").A(who).Rows().Append(J.Obj(("actor", who), ("time", State.I("now")), ("type", c.S("type")), ("attr", c.S("attr")), ("mode", mode), ("target", target))).TakeLast(3);
        Data.O("memory").O("recent").Put(who, J.Array(recent));
        if (Data.O("memory").O("observed_types")[who] is JsonArray seen)
            seen.UniqueAdd(c.S("type"));
        if (who == "P")
        {
            bool Has(string b) => Ah.A("equipment_entries").Rows().Any(e => e.O("blueprint").S("base") == b);
            var p = Ah.O("pending");
            p.Put("after_guard", Has("PS01") && matched && c.S("kind") == "guard");
            if (matched)
            {
                p.Put("last_match_attr", c.S("attr"));
                if (c.S("kind") == "guard")
                    p.Put("borrowed_guard", false);
                if (Has("PS03") && c.S("origin") != "P")
                    p.Put("borrowed_guard", true);
            }
        }
        else
            Fact(who, "observed_card", ("card", c));
        Validate();
    }

    internal void Settle(string reason)
    {
        J.Check(State["settlement"] is null, "duplicate_settlement");
        var kept = new List<string>();
        var lost = new List<string>();
        foreach (var(id, r)in State.O("rewards"))
            (reason == "clear" || reason == "withdrawal" && r.B("protected") ? kept : lost).Add(id);
        State.Put("settlement", J.Obj(("reason", reason), ("kept", kept), ("lost", lost), ("prior_growth", "unchanged")));
        State.Put("outcome", reason);
        State.Put("ready", false);
        Log("settlement", ("reason", reason), ("kept", kept), ("lost", lost), ("prior_growth", "unchanged"));
    }

    private void Dispatch(string victim, string attacker)
    {
        var old = State.S("current_event");
        if (victim == "P")
            Settle("defeat");
        else
        {
            var t = Target(victim);
            var reward = Content.M1.O("rewards").O(t.S("reward_id"));
            var tr = Content.M1.O("transitions").O(reward.S("source_event_id"));
            var key = reward.S("id");
            J.Check(!State.O("rewards").ContainsKey(key), "duplicate_reward");
            State.O("rewards").Put(key, J.Obj(("status", "acquired"), ("protected", false), ("source", victim), ("time", State.I("now"))));
            if (tr.B("protect"))
                foreach (var r in State.O("rewards").Values())
                    r.Put("protected", true);
            Fact(victim, "resolution", ("result", tr.O("trigger").S("result")));
            Fact(victim, "observed_reward", ("reward_key", key), ("label", string.Join("、", reward.A("items").Rows().Select(x => x.S("kind") == "points" ? $"{x.I("amount_units") / 100}習得点" : x.S("kind") == "unlock" ? "札解放:" + Content.Card(x.S("type")).S("name") : $"素材 {x.S("type")} {x.I("amount")}"))));
            if (victim == "E1")
                Ah.Put("enemy_result", "defeated");
            Retire(victim);
            foreach (var target in tr.A("retire_surviving_targets").Strings())
            {
                var w = Content.M1.O("targets").O(target).S("runtime_actor_id");
                if (Actors[w].B("active"))
                {
                    Fact(w, "resolution", ("result", "retired"));
                    Retire(w);
                    if (w == "E1")
                        Ah.Put("enemy_result", "retired");
                }
            }

            foreach (var target in tr.A("enter_targets").Strings())
                Enter(Content.M1.O("targets").O(target).S("runtime_actor_id"), State.I("now"));
            if (tr["pause_scene_id"] is not null)
                State.Put("pending_scene", tr["pause_scene_id"]);
            if (victim == "V0")
                State.Put("current_event", "A/terminal");
            if (tr.B("terminal"))
            {
                State.Put("current_event", "A/finished");
                Settle("clear");
            }
        }

        State.Put("boundary_number", State.I("boundary_number") + 1);
        var row = J.Obj(("number", State.I("boundary_number")), ("event", victim == "P" ? "player_defeated" : victim.StartsWith('V') ? "traversed" : "defeated"), ("victim", victim), ("attacker", attacker), ("time", State.I("now")), ("P_actions", Actors.O("P").I("actions")), ("from_event", old), ("to_event", State.S("current_event")));
        State.A("events").AddCopy(row);
        Log("boundary", row.Select(x => (x.Key, (object? )x.Value)).ToArray());
    }

    internal void Step(JsonObject choice)
    {
        J.Check(Choices().Rows().Any(x => J.Canonical(x) == J.Canonical(choice)), "illegal_choice");
        State.Put("ready", false);
        Play("P", choice);
    }

    internal void Advance()
    {
        int steps = 0;
        while (!State.B("ready") && State["outcome"] is null && State["pending_scene"] is null)
        {
            J.Check(++steps < 10000, "step_budget");
            int Order(JsonNode? a) => a.S("role") switch
            {
                "V" => 0,
                "P" => 1,
                _ => 2
            };
            var who = Actors.Where(x => x.Value.B("active") && x.Value.B("acts")).OrderBy(x => x.Value.I("next_at")).ThenBy(x => Order(x.Value)).ThenBy(x => x.Key, StringComparer.Ordinal).First().Key;
            State.Put("now", Actors.O(who).I("next_at"));
            Refill(who);
            if (who == "P")
                State.Put("ready", true);
            else
                Play(who, Npc(who));
        }
    }

    internal JsonObject Predict(JsonObject choice)
    {
        var fork = new Expedition(Save(), targetSetId);
        fork.Play("P", choice);
        var row = fork.Trace.Last(x => x.S("type") == "action" && x.S("actor") == "P").Copy();
        row.Put("guard", row.S("mode") == "guard" ? Guard(fork.Actors.O("P")) : null);
        row.Put("resolution_scope", "after_current_action_before_next_actor");
        row.Put("actor_changes", J.Array(Actors.Select(x => x.Key).Union(fork.Actors.Select(x => x.Key)).Select(id => J.Obj(("actor_id", id), ("before", Actors[id] is JsonObject previous ? ActorView(previous) : null), ("after", ActorView(fork.Actors.O(id)))))));
        var visible = fork.View();
        row.Put("field_after", visible["field"]);
        row.Put("unused_hand_after", visible["hand"]);
        row.Put("current_reservations_after", visible["reservations"]);
        row.Put("next_self_reservation", fork.Actors.O("P")["next_at"]);
        return row;
    }

    internal static JsonObject ActorView(JsonObject a) => J.Select(a, "role", "active", "hp", "max_hp", "hit", "max_posture", "crit", "next_at", "actions", "rebuilds").With(("posture_remaining", a.I("max_posture") - a.I("hit")), ("guard", Guard(a)), ("defense", J.Obj(("effects", a["defense_effects"]), ("guard", a.A("defense_effects").Rows().Sum(e => e.I("guard"))), ("evasion", a.A("defense_effects").Rows().Sum(e => e.I("evasion"))))), ("hand_count", a.A("hand").Count), ("deck_count", a.A("deck").Count));
    private static JsonObject CardView(JsonObject card)
    {
        var copy = card.Copy();
        copy.Remove("selection_id");
        return copy;
    }

    internal JsonObject View()
    {
        var view = J.Obj(("now", State.I("now")), ("outcome", State["outcome"]), ("current_event", State.S("current_event")), ("self", ActorView(Actors.O("P"))), ("actors", J.Obj(Actors.Select(x => (x.Key, (object? )ActorView((JsonObject)x.Value!))).ToArray())), ("hand", J.Array(Actors.O("P").A("hand").Strings().Select(id => CardView(Cards.O(id))))), ("field", J.Obj(State.O("field").Select(x => (x.Key, (object? )CardView(Cards.O(x.Value.S())))).ToArray())), ("pool_count", State.A("pool").Count), ("own_deck", J.Array(Actors.O("P").A("deck").Strings().Select(id => CardView(Cards.O(id))).OrderBy(c => c.S("type"), StringComparer.Ordinal).ThenBy(c => c.S("id"), StringComparer.Ordinal))), ("legal_actions", Choices()), ("rewards", State["rewards"]), ("knowledge", Ah["knowledge"]), ("reservations", J.Array(Actors.Where(x => x.Value.B("active") && x.Value.B("acts")).OrderBy(x => x.Value.I("next_at")).ThenBy(x => x.Value.S("role") switch
        {
            "V" => 0,
            "P" => 1,
            _ => 2
        }).ThenBy(x => x.Key, StringComparer.Ordinal).Select(x => J.Obj(("actor_id", x.Key), ("at", x.Value.I("next_at")))))));
        foreach (var(id, node)in view.O("actors"))
        {
            var row = (JsonObject)node!;
            // 表示側が名前やroleから素材・地形を推測しないための公開接続情報。
            // 規則やセーブは変えず、現在出現している主体の既存定義だけを渡す。
            row.Put("id", id);
            row.Put("purpose", id == "P" ? "self" : Target(id).S("purpose"));
            row.Put("knowledge_profile_id", id == "P" ? "" : Target(id).S("knowledge_profile_id"));
            row.Put("display_name", id == "P" ? "辿り屋" : Target(id).S("display_name"));
            row.Put("action_label", id == "P" ? "行動" : Target(id).S("action_label"));
            row.Put("remaining_label", id == "P" ? "余力" : Target(id).S("remaining_label"));
        }

        // 本人が持ち込んだ札の公開内訳。相手の手札や山札の順序は含めない。
        var own = Actors.O("P");
        view.Put("deck_catalogue", J.Array(Cards.Values().Where(c=>c.S("origin")=="P").GroupBy(c=>c.S("type")).OrderBy(g=>g.Key,StringComparer.Ordinal).Select(g=>J.Obj(
            ("card",PublicCard(g.First())),("initial_count",g.Count()),
            ("deck_count",g.Count(c=>own.A("deck").Strings().Contains(c.S("id")))),
            ("hand_count",g.Count(c=>own.A("hand").Strings().Contains(c.S("id"))))))));
        return view;
    }

    internal void Validate()
    {
        J.Check(State.S("posture_rule") == "AM1" && State.S("defense_rule") == "D56", "incompatible_combat_rules");
        var members = State.A("pool").Strings().Concat(State.O("field").Select(x => x.Value.S())).ToList();
        var hands = new HashSet<string>();
        foreach (var a in Actors.Values())
        {
            members.AddRange(a.A("hand").Strings());
            members.AddRange(a.A("deck").Strings());
            J.Check(a.I("hp") >= 0 && a.I("hp") <= a.I("max_hp") && a.I("max_posture") >= 1 && a.I("hit") >= 0 && a.I("hit") < a.I("max_posture") && a.I("crit") >= 0, "invalid_actor_state");
            J.Check(a.A("hand").Count <= a.I("hand_size"), "invalid_hand");
            J.Check(a.B("active") || a.A("hand").Count + a.A("deck").Count + a.A("defense_effects").Count == 0, "retired_state");
            foreach (var id in a.A("hand").Strings())
            {
                hands.Add(id);
                J.Check(Cards.O(id).I("remaining") >= 1 && Cards.O(id).I("remaining") <= Cards.O(id).I("life"), "invalid_deadline");
            }

            var effects = a.A("defense_effects").Rows();
            J.Check(effects.Select(e => e.S("source_actor_id") + ":" + e.S("effect_kind")).Distinct().Count() == effects.Length, "duplicate_defense_source");
            foreach (var e in effects)
                J.Check(Actors.ContainsKey(e.S("source_actor_id")) && e.I("guard") >= 0 && (e["uses"] is null || e.I("uses") > 0), "invalid_defense_effect");
        }

        J.Check(members.Distinct().Count() == members.Count && members.Count == Live(), "card_conservation");
        foreach (var(id, node)in Cards)
        {
            var c = (JsonObject)node!;
            J.Check(members.Contains(id) == !c.B("destroyed"), "card_location");
            if (!hands.Contains(id))
                J.Check(c["remaining"] is null, "non_hand_deadline");
            if (!c.B("destroyed") && !Actors[c.S("origin")].B("active"))
                J.Check(c.B("doomed"), "retired_origin");
        }

        foreach (var id in State.A("pool").Strings())
        {
            var c = Cards.O(id);
            J.Check(!c.B("doomed") && !c.B("consume_on_recover") && c.S("birth") != "filler", "invalid_recycled_card");
        }
    }
}

internal static class JsonObjectExtensions
{
    internal static JsonObject With(this JsonObject o, params (string, object? )[] rows)
    {
        foreach (var(k, v)in rows)
            o.Put(k, v);
        return o;
    }

    internal static JsonObject WithOptional(this JsonObject o, JsonObject from, params string[] keys)
    {
        foreach (var k in keys)
            if (from.ContainsKey(k))
                o.Put(k, from[k]);
        return o;
    }
}
