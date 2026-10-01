using System.Text.Json.Nodes;
using System.Text.Json;
using System.IO.Compression;
using Crossweave.Core.Application;
using Xunit;

namespace Crossweave.Tests;
public sealed class ApplicationTests
{
    [Fact]
    public void UiPublicLabelsAndOwnCatalogueDoNotChangeSaveOrRevealNpcCards()
    {
        // UI継承で追加したのは公開ラベルと本人の集計だけ。読取を繰り返してもDTOを変えない。
        var app=GameApplication.Create("D04B-UI-02-public-view");
        Assert.Empty(app.Inspect().O("knowledge").A("encounters"));
        Execute(app,"depart",J.Obj(("case_id","SCN-001")));Unpause(app);
        var before=J.Canonical(app.ExportDto().State);var view=app.Inspect().O("exploration");
        foreach(var (id,node) in view.O("actors"))
        {
            var actor=(JsonObject)node!;Assert.Equal(id,actor.S("id"));
            Assert.NotEmpty(actor.S("purpose"));
            Assert.False(actor.ContainsKey("hand"));Assert.False(actor.ContainsKey("deck"));
        }
        Assert.Equal(12,view.A("deck_catalogue").Rows().Sum(r=>r.I("initial_count")));
        Assert.Equal(view.O("self").I("deck_count"),view.A("deck_catalogue").Rows().Sum(r=>r.I("deck_count")));
        foreach(var row in view.O("knowledge").A("encounters").Rows())
        {
            Assert.NotEmpty(row.S("display_name"));
            Assert.Contains(row.S("profile"),view.O("actors").Values().Select(a=>a.S("knowledge_profile_id")));
        }
        _=app.Inspect();Assert.Equal(before,J.Canonical(app.ExportDto().State));
        Assert.DoesNotContain("deck_catalogue",before);
    }

    [Fact]
    public void AcquiredCardUsesExactIndividualAndVariantAtDeparture()
    {
        var app = Rich();
        var plan = Plan(app);
        var option = app.Inspect().O("home").A("acquisition").Rows().Single(x => x.S("id") == "choice-0");
        Assert.Equal("AO1:card:g:sturdy", option.O("blueprint").S("key"));
        var selected = app.Inspect().O("home").A("owned").Rows().First(x => x.B("selected") && x.O("blueprint").S("base") == "g").S("id");
        var deck = plan.O("composition").A("deck");
        for (int i = 0; i < deck.Count; i++)
            if (deck[i].S() == selected)
            {
                deck[i] = "pending:choice-0";
                break;
            }

        plan.Put("acquire", new[] { "choice-0" });
        Execute(app, "commit_preparation", J.Obj(("plan", plan)));
        var confirmed = app.ExportDto().State.O("session").O("au").A("deck").Strings();
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        var cards = app.ExportDto().State.O("session").O("game").O("state").O("cards").Values().Where(c => c.S("origin") == "P").ToArray();
        Assert.Equal(confirmed.Order(StringComparer.Ordinal), cards.Select(c => c.S("selection_id")).Order(StringComparer.Ordinal));
        var acquired = cards.Single(c => c.S("type") == "AO1:card:g:sturdy");
        Assert.Equal(option.O("details").I("power"), acquired.I("power"));
        Assert.Equal(option.O("details").I("evasion"), acquired.I("evasion"));
    }

    private static JsonObject Oracle()
    {
        using var file = File.OpenRead(Path.Combine(AppContext.BaseDirectory, "Fixtures/application-oracle.json.br"));
        using var stream = new BrotliStream(file, CompressionMode.Decompress);
        return (JsonObject)JsonNode.Parse(stream)!;
    }

    // Test-only adapter from a validated JS fixture. This is not product save migration.
    private static GameApplication FromLegacy(JsonObject legacy, IApplicationCommitBoundary? boundary = null)
    {
        var d = legacy.Copy();
        d.Put("schema", "CW-CSharp-application-1");
        d.Put("engine_version", "CW-CSharp-core-1");
        return GameApplication.Restore(new(1, Content.M1.S("rule_set_id"), Content.M1.S("content_set_id"), d), boundary);
    }

    private static GameCommand Command(GameApplication app, string type, JsonObject? payload = null, string? id = null)
    {
        var v = app.Inspect();
        return new(id ?? Guid.NewGuid().ToString("N"), v.L("revision"), v.S("view_token"), type, payload ?? new JsonObject());
    }

    private static CommandResult Execute(GameApplication app, string type, JsonObject? payload = null)
    {
        var result = app.Execute(Command(app, type, payload));
        Assert.True(result.Error is null, type + ": " + result.Error);
        return result;
    }

    private static void Reject(GameApplication app, GameCommand cmd, string error)
    {
        var before = J.Canonical(app.ExportDto().State);
        var r = app.Execute(cmd);
        Assert.Equal(error, r.Error);
        Assert.Equal(before, J.Canonical(app.ExportDto().State));
    }

    private static void Same(JsonNode? expected, JsonNode? actual, string path = "root")
    {
        if (expected is JsonObject eo && actual is JsonObject ao)
        {
            Assert.True(eo.Select(x => x.Key).ToHashSet().SetEquals(ao.Select(x => x.Key)), path + " keys expected=" + string.Join(',', eo.Select(x => x.Key)) + " actual=" + string.Join(',', ao.Select(x => x.Key)));
            foreach (var(key, value)in eo)
                Same(value, ao[key], path + "." + key);
            return;
        }

        if (expected is JsonArray ea && actual is JsonArray aa)
        {
            Assert.True(ea.Count == aa.Count, path + $" length {ea.Count} != {aa.Count}");
            for (int i = 0; i < ea.Count; i++)
                Same(ea[i], aa[i], path + "[" + i + "]");
            return;
        }

        Assert.True(JsonNode.DeepEquals(expected, actual), path + ": expected " + J.Text(expected) + " actual " + J.Text(actual));
    }

    private static JsonObject Combat(JsonObject source)
    {
        var d = source.Copy();
        void Normalize(JsonNode? n)
        {
            if (n is JsonObject o)
            {
                foreach (var(key, value)in o.ToArray())
                {
                    if (key == "cards" && value is JsonArray array && array.All(x => x is JsonObject row && row.ContainsKey("initial_count")))
                        o.Put(key, J.Array(array.Rows().OrderBy(x => J.Canonical(x), StringComparer.Ordinal)));
                    else
                        Normalize(value);
                }
            }
            else if (n is JsonArray a)
                foreach (var x in a)
                    Normalize(x);
        }

        Normalize(d);
        return d;
    }

    private static void ApplyDelta(JsonObject state, JsonArray changes)
    {
        foreach (var op in changes.Rows())
        {
            var path = op.A("path").Strings();
            JsonNode node = state;
            foreach (var key in path[..^1])
                node = node is JsonArray a ? a[int.Parse(key)]! : node[key]!;
            var last = path[^1];
            if (node is JsonArray array)
                array[int.Parse(last)] = op["value"]?.DeepClone();
            else if (op.B("remove"))
                ((JsonObject)node).Remove(last);
            else
                node[last] = op["value"]?.DeepClone();
        }
    }

    [Fact]
    public void InitialAndPublicCopiesDoNotMutateOwner()
    {
        var app = GameApplication.Create("test");
        var before = J.Canonical(app.ExportDto().State);
        var v = app.Inspect();
        Assert.Equal(20, v.O("home").A("owned").Count);
        Assert.Equal(0, v.O("home").O("economy").L("unspent_units"));
        v.O("home").A("owned").Clear();
        var dto = app.ExportDto();
        dto.State.O("session").O("economy").O("profile").Put("points", 999);
        Assert.Equal(before, J.Canonical(app.ExportDto().State));
    }

    [Fact]
    public void MtStringSeedAndDrawMatchFrozenJavaScript()
    {
        foreach (var r in Oracle().A("random").Rows())
        {
            var mt = new MtRandom(r.S("text"));
            Same(r["state"], mt.Export(), r.S("text"));
            foreach (var word in r.A("words"))
                Assert.Equal(word.L(), (long)mt.NextUInt());
        }
    }

    [Theory]
    [InlineData("D58-V0-weak_B")]
    [InlineData("D58-V0-l")]
    [InlineData("D58-V0-h")]
    [InlineData("D58-P-l")]
    [InlineData("D55-D58-hit-0")]
    [InlineData("D55-D58-hit-99")]
    public void AuthoredDefenseBoundariesMatchOldResolver(string name)
    {
        var c = Oracle().A("combat_cases").Rows().Single(x => x.S("name") == name);
        var g = new Expedition(c.O("initial").Copy(), c.S("target_set_id"));
        g.Play(c.S("actor"), c.O("choice"));
        Same(Combat(c.O("expected")), Combat(g.Save()), name);
        Same(c["trace"], J.Array(g.Trace), name + " event order");
    }

    private static JsonObject Plan(GameApplication app) => app.Inspect().O("draft").O("plan").Copy();
    private static GameApplication Rich(IApplicationCommitBoundary? boundary = null) => FromLegacy(Oracle().O("legal_fixture"), boundary);
    private static JsonObject BuyPlan(GameApplication app, string option = "choice-1", bool equip = true)
    {
        var p = Plan(app);
        p.Put("acquire", new[] { option });
        if (equip)
            p.O("composition").Put("equipment", new[] { "pending:" + option });
        return p;
    }

    private static JsonObject Preview(GameApplication app, JsonObject plan)
    {
        var v = app.Inspect();
        return app.PreviewPreparation(v.L("revision"), v.S("view_token"), plan);
    }

    private static long Balance(GameApplication app) => app.Inspect().O("home").O("economy").L("unspent_units");
    private static void Unpause(GameApplication app)
    {
        while (app.Inspect().O("story")["scene"].B("paused"))
            Execute(app, "continue_scene", J.Obj(("scene_id", app.Inspect().O("story").O("scene").S("id"))));
    }

    [Fact]
    public void PreviewCancelAndCompositionDoNotSpendOrCreateUnits()
    {
        var app = Rich();
        var before = J.Canonical(app.ExportDto().State);
        var p = BuyPlan(app);
        var preview = Preview(app, p);
        Assert.True(preview.B("ok"));
        Assert.Equal(400, preview.O("payment").L("cost_units"));
        Assert.Contains(preview.A("owned").Rows(), r => r.S("id") == "pending:choice-1" && r.B("selected"));
        p.O("composition").Put("equipment", new JsonArray());
        Assert.True(Preview(app, p).B("ok"));
        p.Put("acquire", new JsonArray());
        Assert.Equal(0, Preview(app, p).O("payment").L("cost_units"));
        Assert.Equal(before, J.Canonical(app.ExportDto().State));
        Execute(app, "commit_preparation", J.Obj(("plan", p)));
        Assert.Equal(900, Balance(app));
    }

    [Fact]
    public void InsufficientFundsCapacityAndInvalidTargetsRejectWithoutPartialApplication()
    {
        var app = GameApplication.Create();
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", BuyPlan(app, "basic:PS01")))), "insufficient_unspent_funds");
        var rich = Rich();
        var p = Plan(rich);
        p.Put("acquire", new[] { "basic:PS01", "basic:PS02", "basic:PS03", "basic:PS04" });
        p.O("composition").Put("equipment", p.A("acquire").Strings().Select(x => "pending:" + x));
        Reject(rich, Command(rich, "commit_preparation", J.Obj(("plan", p))), "equipment_capacity_exceeded");
        var invalid = Plan(rich);
        invalid.O("composition").A("deck")[0] = "owned-missing";
        Reject(rich, Command(rich, "commit_preparation", J.Obj(("plan", invalid))), "unknown_selection_handle");
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        Unpause(app);
        Reject(app, Command(app, "play", J.Obj(("choice", J.Obj(("card_id", app.Inspect().O("exploration").A("hand")[0].S("id")), ("target", "not-an-actor"))))), "illegal_choice");
    }

    [Fact]
    public void OneOfferLimitAndIndividualAndBaseCapsAreAtomic()
    {
        var app = Rich();
        var p = BuyPlan(app);
        p.Put("acquire", new[] { "choice-1", "choice-0" });
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", p))), "acquisition_group_limit");
        p = Plan(app);
        p.O("composition").A("deck")[1] = p.O("composition").A("deck")[0]!.DeepClone();
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", p))), "duplicate_owned_card");
        p = Plan(app);
        p.O("composition").A("deck").RemoveAt(0);
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", p))), "invalid_deck_size");
        p = Plan(app);
        p.O("composition").Put("equipment", new[] { "pending:choice-1" });
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", p))), "unselected_acquisition");
        p = Plan(app);
        var owned = app.Inspect().O("home").A("owned").Rows();
        var sameBase = owned.Where(x => x.O("blueprint").S("base") == "g").Select(x => x.S("id"));
        var otherBases = owned.Where(x => x.B("selected") && x.O("blueprint").S("base") != "g").Take(9).Select(x => x.S("id"));
        p.Put("acquire", new[] { "choice-0" });
        p.O("composition").Put("deck", sameBase.Concat(otherBases).Append("pending:choice-0"));
        Reject(app, Command(app, "commit_preparation", J.Obj(("plan", p))), "deck_base_cap_exceeded");
    }

    [Fact]
    public void AcquisitionReplayConflictAndStaleRequestsPreserveState()
    {
        var app = Rich();
        var r = Command(app, "commit_preparation", J.Obj(("plan", BuyPlan(app))), "same-purchase");
        Assert.Null(app.Execute(r).Error);
        Assert.Equal(500, Balance(app));
        var before = J.Canonical(app.ExportDto().State);
        Assert.Equal("replayed", app.Execute(r).Status);
        Assert.Equal(before, J.Canonical(app.ExportDto().State));
        Reject(app, r with { Payload = J.Obj(("plan", Plan(app))) }, "request_conflict");
        Reject(app, r with { RequestId = "other" }, "stale_revision");
        Reject(app, r with { RequestId = "other", ExpectedRevision = app.Inspect().L("revision") }, "stale_view");
        var restored = GameApplication.Restore(app.ExportDto());
        Assert.Equal("replayed", restored.Execute(r).Status);
        Assert.Equal(before, J.Canonical(restored.ExportDto().State));
    }

    [Fact]
    public void SavedDraftBlocksDepartureAndCancellationRestoresConfirmedComposition()
    {
        var app = Rich();
        var plan = BuyPlan(app);
        Execute(app, "save_draft", J.Obj(("plan", plan)));
        Assert.Equal(900, Balance(app));
        Assert.True(app.Inspect().O("draft").B("dirty"));
        var restored = GameApplication.Restore(app.ExportDto());
        Reject(restored, Command(restored, "depart", J.Obj(("case_id", "SCN-001"))), "dirty_draft");
        Execute(restored, "discard_draft");
        Assert.Equal(900, Balance(restored));
        Execute(restored, "depart", J.Obj(("case_id", "SCN-001")));
    }

    [Fact]
    public void ConversionLockReferencesInitialGrantsAndRestock()
    {
        var app = Rich();
        Execute(app, "commit_preparation", J.Obj(("plan", BuyPlan(app, "basic:PS01"))));
        var item = app.Inspect().O("home").A("owned").Rows().Single(r => r.O("blueprint").S("kind") == "passive");
        string id = item.S("id");
        Reject(app, Command(app, "convert_items", J.Obj(("item_ids", new[] { id }))), "item_in_use");
        var p = Plan(app);
        p.O("composition").Put("equipment", new JsonArray());
        Execute(app, "commit_preparation", J.Obj(("plan", p)));
        Execute(app, "set_item_lock", J.Obj(("item_id", id), ("locked", true)));
        Reject(app, Command(app, "convert_items", J.Obj(("item_ids", new[] { id }))), "item_locked");
        Execute(app, "set_item_lock", J.Obj(("item_id", id), ("locked", false)));
        var q = app.QuoteConversion(app.Inspect().L("revision"), app.Inspect().S("view_token"), J.Array(new[] { id }));
        Assert.Equal(50, q.L("units"));
        var conversion = Command(app, "convert_items", J.Obj(("item_ids", new[] { id })));
        Assert.Null(app.Execute(conversion).Error);
        Assert.Equal(750, Balance(app));
        Assert.Equal("replayed", app.Execute(conversion).Status);
        Assert.Contains(app.Inspect().O("home").A("acquisition").Rows(), o => o.S("id") == "basic:PS01");
        var initial = app.Inspect().O("home").A("owned").Rows().First(r => !r.B("selected"));
        Reject(app, Command(app, "convert_items", J.Obj(("item_ids", new[] { initial.S("id") }))), "initial_grant_not_convertible");
    }

    private sealed class FailingBoundary : IApplicationCommitBoundary
    {
        public bool Fail = true;
        public ApplicationDto? Candidate;
        public bool TryCommit(long expectedRevision, ApplicationDto candidate)
        {
            Candidate = candidate;
            return !Fail;
        }
    }

    [Fact]
    public void CommitBoundaryFailurePublishesNothingAndSameRequestCanRetry()
    {
        var sink = new FailingBoundary();
        var app = Rich(sink);
        var r = Command(app, "commit_preparation", J.Obj(("plan", BuyPlan(app))));
        Reject(app, r, "commit_boundary_failed");
        Assert.Equal(900, Balance(app));
        sink.Fail = false;
        Assert.Null(app.Execute(r).Error);
        Assert.Equal(500, Balance(app));
        sink.Candidate!.State.O("session").O("economy").O("inventory").Clear();
        Assert.Equal(21, app.Inspect().O("home").A("owned").Count);
    }

    [Fact]
    public void ReturnResendAndTextReadsCannotSettleTwice()
    {
        var app = GameApplication.Create();
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        var req = Command(app, "withdraw");
        Assert.Null(app.Execute(req).Error);
        var snapshot = J.Canonical(app.ExportDto().State);
        Assert.Equal("replayed", app.Execute(req).Status);
        Assert.Equal(snapshot, J.Canonical(app.ExportDto().State));
        var e = J.Canonical(app.ExportDto().State.O("session").O("economy"));
        var game = J.Canonical(app.ExportDto().State.O("session")["game"]);
        for (int i = 0; i < 3; i++)
        {
            app.Inspect();
            var v = app.Inspect();
            Execute(app, "continue_scene", J.Obj(("scene_id", v.O("story").O("scene").S("id")), ("advance", false)));
        }

        Assert.Equal(e, J.Canonical(app.ExportDto().State.O("session").O("economy")));
        Assert.Equal(game, J.Canonical(app.ExportDto().State.O("session")["game"]));
        Assert.Single(app.ExportDto().State.O("session").O("receipts"));
    }

    [Theory]
    [InlineData("home")]
    [InlineData("exploring")]
    [InlineData("return")]
    public void VersionedDtoRoundTripPreservesNextResult(string phase)
    {
        var app = Rich();
        if (phase != "home")
        {
            Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
            Unpause(app);
        }

        if (phase == "return")
            Execute(app, "withdraw");
        var dto = JsonSerializer.Deserialize<ApplicationDto>(JsonSerializer.Serialize(app.ExportDto()))!;
        var restored = GameApplication.Restore(dto);
        Same(app.ExportDto().State, restored.ExportDto().State);
        GameCommand command;
        if (phase == "home")
            command = Command(app, "commit_preparation", J.Obj(("plan", BuyPlan(app, "basic:PS01"))));
        else if (phase == "exploring")
            command = Command(app, "play", J.Obj(("choice", app.Inspect().O("exploration").A("legal_actions")[0])));
        else
            command = Command(app, "ack_return");
        Assert.Null(app.Execute(command).Error);
        Assert.Null(restored.Execute(command).Error);
        var a = app.ExportDto().State;
        var b = restored.ExportDto().State;
        a.Remove("view_nonce");
        b.Remove("view_nonce");
        Same(a, b, "next DTO result");
    }

    [Fact]
    public void ActionPredictionDoesNotDrawOrChangeState()
    {
        var app = GameApplication.Create();
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        Unpause(app);
        var before = J.Canonical(app.ExportDto().State);
        var view = app.Inspect();
        foreach (var choice in view.O("exploration").A("legal_actions").Rows())
        {
            var preview = app.PreviewAction(view.L("revision"), view.S("view_token"), choice);
            Assert.True(preview.B("ok"));
            Assert.Equal("after_current_action_before_next_actor", preview.S("resolution_scope"));
        }

        Assert.Equal(before, J.Canonical(app.ExportDto().State));
    }

    [Fact]
    public void DtoInvalidVersionAndConservationReject()
    {
        var app = GameApplication.Create();
        Assert.Throws<RuleException>(() => GameApplication.Restore(app.ExportDto()with { FormatVersion = 99 }));
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        var dto = app.ExportDto();
        dto.State.O("session").O("game").O("state").O("actors").O("P").A("deck").RemoveAt(0);
        Assert.Throws<RuleException>(() => GameApplication.Restore(dto));
    }

    [Fact]
    public void PublicViewDoesNotExposePrivateIdentityOrNpcDrawOrder()
    {
        var app = Rich();
        Execute(app, "depart", J.Obj(("case_id", "SCN-001")));
        Unpause(app);
        var text = J.Text(app.Inspect());
        foreach (var forbidden in new[]
        {
            "future_rng",
            "request_log",
            "CW-M1-grant-1",
            "CW-M1-basic-1",
            "CW-M1-run-1",
            "owned:["
        }

        )
            Assert.DoesNotContain(forbidden, text);
        foreach (var actor in app.Inspect().O("exploration").O("actors").Values())
        {
            Assert.False(actor.ContainsKey("hand"));
            Assert.False(actor.ContainsKey("deck"));
        }
    }

    [Theory]
    [InlineData("natural")]
    [InlineData("withdraw-before")]
    [InlineData("withdraw-protected")]
    [InlineData("defeat")]
    [InlineData("legal-acquisition")]
    [InlineData("withdraw-unprotected")]
    public void RecordedJavaScriptOperationsMatchCombatAndPersistentResults(string name)
    {
        var record = Oracle().A("records").Rows().Single(r => r.S("name") == name);
        var app = name is "legal-acquisition" or "withdraw-unprotected" ? FromLegacy(record.O("initial")) : GameApplication.Create("D04B-" + name);
        var expectedState = J.Select(record.O("initial"), "session", "casebook");
        int step = 0;
        foreach (var row in record.A("steps").Rows())
        {
            ApplyDelta(expectedState, row.A("expected_delta"));
            var request = row.O("request");
            var payload = request.O("payload").Copy();
            if (request.S("type") == "commit_preparation")
            {
                // Public owned-N differs only by handle assignment order. Resolve by fixture identity.
                var expected = expectedState.O("session");
                var plan = payload.O("plan");
                if (name == "natural")
                {
                    var raw = expected.O("au").A("deck").Strings();
                    var own = app.ExportDto().State.O("session").O("economy").O("inventory").Select(x => x.Key).Order(StringComparer.Ordinal).ToArray();
                    plan.O("composition").Put("deck", raw.Select(id => "owned-" + (Array.IndexOf(own, id[6..]) + 1)));
                }
            }

            var result = app.Execute(Command(app, request.S("type"), payload, request.S("id")));
            Assert.True(result.Error is null, name + " step " + step + " " + request.S("type") + ": " + result.Error);
            var s = app.ExportDto().State.O("session");
            var es = expectedState.O("session");
            if (es["game"] is JsonObject eg)
                Same(Combat(eg), Combat(s.O("game")), name + " step " + step + " combat");
            Same(es["action_history"], s["action_history"], name + " step " + step + " events");
            Same(es.O("economy").O("profile")["points"], s.O("economy").O("profile")["points"], "funds");
            Same(es.O("economy")["remainder"], s.O("economy")["remainder"], "remainder");
            Same(es.O("economy").O("profile")["materials"], s.O("economy").O("profile")["materials"], "materials");
            Same(es.O("economy").O("profile")["unlocked"], s.O("economy").O("profile")["unlocked"], "unlocks");
            Same(es.O("economy")["inventory"], s.O("economy")["inventory"], "possessions");
            Same(es.O("economy")["at"], s.O("economy")["at"], "offer generation");
            Assert.Equal(expectedState.O("casebook").O("SCN-001").S("status"), app.ExportDto().State.O("casebook").O("SCN-001").S("status"));
            step++;
        }
    }
}
