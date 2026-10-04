using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;
public sealed record GameCommand(string RequestId, long ExpectedRevision, string ViewToken, string Type, JsonObject Payload);
public sealed record ApplicationDto(int FormatVersion, string RuleSetId, string ContentSetId, JsonObject State);
public sealed record CommandResult(string Status, string? Error, JsonObject View);
/// <summary>
/// 一操作分の候補を保存してから、Coreの所有状態を交換するための境界。
/// false／通常例外は「候補は永続確定していない」。成否を判断できない場合だけ
/// ApplicationCommitUncertainExceptionを使い、再読込みまで操作を止める。
/// 境界を渡さない既存のメモリー本編の動作は変わらない。
/// </summary>
public interface IApplicationCommitBoundary
{
    bool TryCommit(long expectedRevision, ApplicationDto candidate);
}

/// <summary>置換後の読戻し不能など、保存成否を確定できない通知。単なる保存失敗とは区別する。</summary>
public sealed class ApplicationCommitUncertainException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>Single owner of campaign, expedition, preparations, receipts and request history.
/// Every public read is a detached copy; only Execute can publish a new revision.</summary>
public sealed class GameApplication
{
    public const int DtoVersion = 1;
    private readonly object gate = new();
    private JsonObject document;
    private readonly IApplicationCommitBoundary? boundary;
    private bool publishing;
    private bool commitBlocked;
    /// <summary>成否不明の確定が発生したらtrue。保存側で再読込みして新しい本体を作るまで解除しない。</summary>
    public bool IsCommitBlocked { get { lock (gate) return commitBlocked; } }
    private GameApplication(JsonObject d, IApplicationCommitBoundary? commitBoundary)
    {
        document = d.Copy();
        boundary = commitBoundary;
        Validate(document);
    }

    public static GameApplication Create(string? campaignId = null, IApplicationCommitBoundary? commitBoundary = null)
    {
        campaignId ??= Guid.NewGuid().ToString("N");
        J.Check(campaignId.Length is> 0 and <= 1024, "invalid_campaign_id");
        var s = J.Obj(("campaign_id", campaignId), ("phase", "home"), ("nextRun", 0), ("economy", Preparation.InitialEconomy()), ("au", J.Obj(("deck", J.Array(Content.M1.O("initial").O("deck_counts").OrderBy(x => x.Key, StringComparer.Ordinal).SelectMany(x => Enumerable.Range(0, x.Value.I()).Select(i => "owned:" + Preparation.GrantUid(x.Key, i))))))), ("active", null), ("game", null), ("scene", null), ("receipts", new JsonObject()), ("action_history", new JsonArray()));
        var d = J.Obj(("schema", "CW-CSharp-application-1"), ("rule_set_id", Content.M1.S("rule_set_id")), ("content_set_id", Content.M1.S("content_set_id")), ("engine_version", "CW-CSharp-core-1"), ("revision", 0), ("view_nonce", Guid.NewGuid().ToString("N")), ("session", s), ("draft", null), ("casebook", Content.M1.O("initial")["casebook"]), ("request_log", new JsonObject()), ("public_history", new JsonArray()));
        Story.Publish(d, "SCN-001-S01");
        return new GameApplication(d, commitBoundary);
    }

    public static GameApplication Restore(ApplicationDto dto, IApplicationCommitBoundary? commitBoundary = null)
    {
        J.Check(dto.FormatVersion == DtoVersion, "unsupported_dto_version");
        J.Check(dto.RuleSetId == Content.M1.S("rule_set_id") && dto.ContentSetId == Content.M1.S("content_set_id"), "unsupported_content_version");
        return new GameApplication(dto.State, commitBoundary);
    }

    public ApplicationDto ExportDto()
    {
        lock (gate)
        {
            // この時点のメモリーは永続側より古い可能性があり、正常な保存候補として外へ出さない。
            if (commitBlocked) throw new ApplicationCommitUncertainException("確定成否が不明です。保存から再読込みしてください。");
            return Dto(document);
        }
    }

    private static ApplicationDto Dto(JsonObject d) => new(DtoVersion, d.S("rule_set_id"), d.S("content_set_id"), d.Copy());
    public JsonObject Inspect()
    {
        lock (gate)
            return CurrentView();
    }

    public JsonObject PreviewPreparation(long expectedRevision, string viewToken, JsonObject plan)
    {
        lock (gate)
            try
            {
                J.Check(!commitBlocked, "commit_outcome_unknown");
                Fresh(document, expectedRevision, viewToken);
                Require(document, "preview_preparation");
                var map = new Handles(document);
                var internalPlan = map.Decode(plan);
                var s = document.O("session");
                var next = Preparation.Apply(s, internalPlan, "preview-" + document.L("revision"));
                var d = document.Copy();
                d.Put("session", next);
                var pending = new Dictionary<string, string>();
                var oldInventory = s.O("economy").O("inventory");
                var acquired = next.O("economy").O("inventory").Where(x => !oldInventory.ContainsKey(x.Key)).ToArray();
                var refs = internalPlan.A("acquire").Strings();
                for (int i = 0; i < acquired.Length; i++)
                    pending["owned:" + acquired[i].Key] = "pending:" + map.EncodeString(refs[i]);
                var prepared = map.Encode(Preparation.View(d), pending);
                foreach (var row in prepared.A("owned").Rows())
                {
                    row.Put("pending", row.S("id").StartsWith("pending:", StringComparison.Ordinal));
                    UiPublicProjection.AddAffixes(row);
                }
                return prepared.With(("current", map.Encode(Preparation.View(document))), ("ok", true), ("read_only", true), ("payment", J.Obj(("cost_units", Preparation.Funds(s.O("economy")) - Preparation.Funds(next.O("economy"))), ("refund_units", 0), ("unspent_before_units", Preparation.Funds(s.O("economy"))), ("unspent_after_units", Preparation.Funds(next.O("economy"))))));
            }
            catch (Exception e)when (IsRefusal(e))
            {
                return J.Obj(("ok", false), ("read_only", true), ("error", ErrorCode(e)));
            }
    }

    public JsonObject PreviewAction(long expectedRevision, string viewToken, JsonObject choice)
    {
        lock (gate)
            try
            {
                J.Check(!commitBlocked, "commit_outcome_unknown");
                Fresh(document, expectedRevision, viewToken);
                Require(document, "preview_action");
                var g = Game(document.O("session"));
                J.Check(g.Choices().Rows().Any(x => J.Canonical(x) == J.Canonical(choice)), "illegal_choice");
                var p = g.Predict(choice);
                p.Remove("old_defense_ended");
                return p.With(("ok", true));
            }
            catch (Exception e)when (IsRefusal(e))
            {
                return J.Obj(("ok", false), ("error", ErrorCode(e)));
            }
    }

    public JsonObject QuoteConversion(long expectedRevision, string viewToken, JsonArray itemIds)
    {
        lock (gate)
            try
            {
                J.Check(!commitBlocked, "commit_outcome_unknown");
                Fresh(document, expectedRevision, viewToken);
                Require(document, "quote_conversion");
                var map = new Handles(document);
                var p = map.Decode(J.Obj(("ids", itemIds)));
                return map.Encode(Preparation.Quote(document, p.A("ids"))).With(("ok", true));
            }
            catch (Exception e)when (IsRefusal(e))
            {
                return J.Obj(("ok", false), ("error", ErrorCode(e)));
            }
    }

    public CommandResult Execute(GameCommand command)
    {
        lock (gate)
            try
            {
                if (commitBlocked) return new("blocked", "commit_outcome_unknown", CurrentView());
                J.Check(!publishing, "commit_in_progress");
                J.Check(command is not null && command.RequestId.Length is> 0 and <= 1024 && command.ExpectedRevision >= 0, "invalid_request");
                J.Check(command!.Payload is not null, "invalid_payload");
                var signature = J.Canonical(J.Obj(("type", command.Type), ("payload", command.Payload)));
                if (document.O("request_log")[command.RequestId] is JsonObject prior)
                {
                    J.Check(prior.S("signature") == signature, "request_conflict");
                    return new("replayed", null, View(document));
                }

                Fresh(document, command.ExpectedRevision, command.ViewToken);
                Require(document, command.Type, command.Payload);
                var next = document.Copy();
                var s = next.O("session");
                var map = new Handles(document);
                var p = map.Decode(command.Payload!);
                var e = s.O("economy");
                void Fields(params string[] allowed) => J.Check(p.All(x => allowed.Contains(x.Key)), "unexpected_payload_field");
                switch (command.Type)
                {
                    case "save_draft":
                        Fields("plan");
                        Preparation.CheckShape(p.O("plan"));
                        next.Put("draft", Preparation.Draft(s, p.O("plan"), next.L("revision")));
                        break;
                    case "discard_draft":
                        Fields();
                        next.Put("draft", Preparation.Draft(s, Preparation.Plan(s), next.L("revision")));
                        break;
                    case "commit_preparation":
                        Fields("plan");
                        next.Put("session", Preparation.Apply(s, p.O("plan"), command.RequestId));
                        s = next.O("session");
                        next.Put("draft", Preparation.Draft(s, Preparation.Plan(s), next.L("revision")));
                        break;
                    case "set_item_lock":
                        Fields("item_id", "locked");
                        var id = p.S("item_id");
                        J.Check(id.StartsWith("owned:", StringComparison.Ordinal) && e.O("inventory").ContainsKey(id[6..]), "missing_possession");
                        J.Check(p["locked"] is JsonValue v && v.TryGetValue<bool>(out _), "invalid_lock");
                        e.O("inventory").O(id[6..]).Put("locked", p.B("locked"));
                        break;
                    case "convert_items":
                        Fields("item_ids");
                        var q = Preparation.Quote(next, p.A("item_ids"));
                        var uids = p.A("item_ids").Strings().Select(x => x[6..]).Order(StringComparer.Ordinal).ToArray();
                        var items = J.Array(uids.Select(uid => e.O("inventory").O(uid)));
                        foreach (var uid in uids)
                            e.O("inventory").Remove(uid);
                        Preparation.SetFunds(e, q.L("unspent_after_units"));
                        e.O("sales").Put(command.RequestId, J.Obj(("ids", uids), ("units", q.L("units")), ("items", items), ("signature", J.Canonical(J.Obj(("ids", uids))))));
                        break;
                    case "depart":
                        Fields("case_id");
                        J.Check(p.S("case_id") == "SCN-001", "case_not_available");
                        var c = next.O("casebook").O("SCN-001");
                        string mode = Story.Mode(c), set = mode == "revisit" ? "SCN-001-SET-REVISIT" : "SCN-001-SET-UNRESOLVED";
                        long index = s.L("nextRun");
                        J.Check(index < 9007199254740991, "run_index_exhausted");
                        string run = J.Text(new object[] { "CW-M1-run-1", s.S("campaign_id"), index });
                        var active = J.Obj(("run", run), ("index", index), ("seed", index), ("case_id", "SCN-001"), ("content_set_id", Content.M1.S("content_set_id")), ("mode", mode), ("target_set_id", set), ("targets", Content.M1.O("target_sets").O(set)["slot_map"]), ("published_clue_ids", new JsonArray()), ("read_text_ids", new JsonArray()), ("reward_ledger", new JsonObject()), ("published_scene_ids", new JsonArray()), ("emitted_conditionals", new JsonArray()), ("departure_case_state", J.Obj(("status", c.S("status")), ("attempts_before", c.I("attempts")))));
                        s.Put("active", active);
                        s.Put("game", Expedition.Depart(s, active));
                        s.Put("phase", "exploring");
                        e.O("profile").Put("phase", "exploring");
                        e.O("profile").Put("run", run);
                        s.Put("nextRun", index + 1);
                        c.Put("attempts", c.I("attempts") + 1);
                        s.Put("action_history", new JsonArray());
                        next.Put("draft", null);
                        Story.Publish(next, mode == "revisit" ? "SCN-001-S02R" : "SCN-001-S02", e.O("profile").O("knowledge"));
                        break;
                    case "continue_scene":
                        Fields("scene_id", "advance", "displayed_text_ids");
                        Story.RecordDisplayed(next, p);
                        bool advance = p["advance"] is null || p.B("advance");
                        if (advance)
                        {
                            var scene = s.O("scene");
                            var spec = Content.M1.O("scenes").O(scene.S("id"));
                            scene.Put("pause", false);
                            if (spec["next_scene_id"] is not null)
                                Story.Publish(next, spec.S("next_scene_id"));
                            else if (s["game"] is not null)
                            {
                                var g = Game(s);
                                g.Advance();
                                SyncGame(next, g);
                            }
                        }

                        break;
                    case "play":
                        Fields("choice");
                        var game = Game(s);
                        game.Step(p.O("choice"));
                        if (game.State["pending_scene"] is null && game.State["outcome"] is null)
                            game.Advance();
                        SyncGame(next, game);
                        break;
                    case "withdraw":
                        Fields();
                        var retreat = Game(s);
                        retreat.State.Put("pending_scene", null);
                        retreat.Settle("withdrawal");
                        SyncGame(next, retreat);
                        break;
                    case "ack_return":
                        Fields();
                        s.Put("phase", "home");
                        s.Put("active", null);
                        s.Put("game", null);
                        s.Put("action_history", new JsonArray());
                        next.Put("draft", Preparation.Draft(s, Preparation.Plan(s), next.L("revision")));
                        Story.Publish(next, "SCN-001-S07");
                        break;
                    default:
                        throw new RuleException("feature_not_connected");
                }

                J.Check(next.L("revision") < 9007199254740991, "revision_exhausted");
                next.Put("revision", next.L("revision") + 1);
                next.Put("view_nonce", Guid.NewGuid().ToString("N"));
                if (next["draft"] is JsonObject draft)
                    next.Put("draft", Preparation.Draft(next.O("session"), draft.O("plan"), next.L("revision")));
                next.O("request_log").Put(command.RequestId, J.Obj(("signature", signature), ("committed_revision", next.L("revision"))));
                Validate(next);
                if (boundary is not null)
                {
                    bool committed;
                    try
                    {
                        publishing = true;
                        committed = boundary.TryCommit(document.L("revision"), Dto(next));
                    }
                    catch (ApplicationCommitUncertainException)
                    {
                        // 旧状態を成功表示せず、候補も勝手に確定しない。保存の実物から復元するまで停止する。
                        commitBlocked = true;
                        return new("indeterminate", "commit_outcome_unknown", CurrentView());
                    }
                    catch (Exception)
                    {
                        throw new RuleException("commit_boundary_failed");
                    }
                    finally
                    {
                        publishing = false;
                    }

                    J.Check(committed, "commit_boundary_failed");
                }

                document = next;
                return new("committed", null, View(document));
            }
            catch (Exception ex)when (IsRefusal(ex))
            {
                return new("rejected", ErrorCode(ex), View(document));
            }
    }

    private JsonObject CurrentView()
    {
        var view = View(document);
        if (!commitBlocked) return view;
        view.Put("commit_state", "indeterminate");
        view.Put("stale", true);
        foreach (var capability in view.O("capabilities").Values())
        {
            capability.Put("available", false);
            capability.Put("reason", "commit_outcome_unknown");
        }
        return view;
    }

    private static bool IsRefusal(Exception e) => e is RuleException or InvalidOperationException or InvalidCastException or ArgumentException or KeyNotFoundException or NullReferenceException or OverflowException;
    private static string ErrorCode(Exception e) => e is RuleException r ? r.Code : "invalid_payload";
    private static Expedition Game(JsonObject s) => new(s.O("game").Copy(), s.O("active").S("target_set_id"));
    private static void Fresh(JsonObject d, long rev, string token)
    {
        J.Check(rev == d.L("revision"), "stale_revision");
        J.Check(token == d.S("view_nonce"), "stale_view");
    }

    private static void SyncGame(JsonObject d, Expedition g)
    {
        var s = d.O("session");
        s.Put("game", g.Save());
        s.O("active").Put("reward_ledger", Settlement.Ledger(s));
        foreach (var row in g.Trace.Where(e => e.S("type")is "action" or "boundary"))
            s.A("action_history").AddCopy(row);
        if (g.State["outcome"] is not null)
        {
            Settlement.Apply(d);
            var scene = g.State["pending_scene"]?.S() ?? "SCN-001-S06";
            s.O("game").O("state").Put("pending_scene", null);
            Story.Publish(d, scene);
        }
        else if (g.State["pending_scene"] is not null)
        {
            var scene = g.State.S("pending_scene");
            s.O("game").O("state").Put("pending_scene", null);
            Story.Publish(d, scene);
        }

        Story.Conditionals(d);
    }

    private static string? Refusal(JsonObject d, string type, JsonObject? p = null)
    {
        var s = d.O("session");
        string phase = s.S("phase");
        bool paused = s["scene"].B("pause");
        return type switch
        {
            "save_draft" or "discard_draft" or "commit_preparation" or "convert_items" or "set_item_lock" or "quote_conversion" => phase == "home" ? null : phase == "return" ? "return_not_acknowledged" : "exploring",
            "preview_preparation" => phase is "home" or "return" ? null : "exploring",
            "depart" => phase != "home" ? "already_exploring" : d["draft"].B("dirty") ? "dirty_draft" : null,
            "play" or "preview_action" => phase != "exploring" ? "not_exploring" : paused ? "scene_paused" : !s.O("game").O("state").B("ready") ? "not_player_turn" : null,
            "withdraw" => phase == "exploring" ? null : "not_exploring",
            "continue_scene" => p?["advance"] is JsonValue v && v.TryGetValue<bool>(out bool advance) && !advance ? (s["scene"] is not null ? null : "scene_not_available") : paused ? null : "scene_not_paused",
            "ack_return" => phase != "return" ? "not_return" : paused ? "scene_paused" : null,
            "purchase" => "use_commit_preparation",
            _ => "feature_not_connected"
        };
    }

    private static void Require(JsonObject d, string type, JsonObject? p = null)
    {
        var error = Refusal(d, type, p);
        J.Check(error is null, error ?? "");
    }

    private static JsonObject View(JsonObject d)
    {
        var s = d.O("session");
        var home = s.S("phase")is "home" or "return" ? Preparation.View(d) : null;
        // J.Objは渡したJsonNodeを複製する。公開説明は複製の前に付け、
        // 後で元のlocal homeだけを書き換えて画面へ届かなくなるのを防ぐ。
        // このhomeは表示用コピーであり、所持品・保存・効果計算を変更しない。
        if(home is not null)foreach(var row in home.A("owned").Rows().Concat(home.A("acquisition").Rows()))UiPublicProjection.AddAffixes(row);
        var scene = Story.View(d);
        var result = J.Obj(("revision", d.L("revision")), ("view_token", d.S("view_nonce")), ("phase", s.S("phase")), ("home", home), ("draft", d["draft"] ?? Preparation.Draft(s, Preparation.Plan(s), d.L("revision"))), ("story", scene), ("case", J.Select(d.O("casebook").O("SCN-001"), "status", "attempts", "visible_clue_ids", "read_text_ids")), ("profile", J.Select(s.O("economy").O("profile"), "materials", "unlocked", "clears")), ("capabilities", J.Obj(new[] { "save_draft", "discard_draft", "commit_preparation", "depart", "play", "withdraw", "continue_scene", "ack_return", "convert_items", "set_item_lock", "preview_action", "preview_preparation", "quote_conversion" }.Select(op => (op, (object? )J.Obj(("available", Refusal(d, op)is null), ("reason", Refusal(d, op))))).ToArray())));
        if (s["game"] is JsonObject)
        {
            var exp = Game(s).View();
            exp.Put("knowledge", PublicKnowledge(exp.O("knowledge"),s.O("active").S("run"),s.O("active")));
            foreach (var card in exp.A("hand").Rows())
                card.Remove("selection_id");
            foreach (var card in exp.A("own_deck").Rows())
                card.Remove("selection_id");
            foreach (var card in exp.O("field").Values())
                card.Remove("selection_id");
            result.Put("exploration", exp);
        }
        else
            result.Put("exploration", null);
        result.Put("action_history", s["action_history"]);
        result.Put("knowledge", PublicKnowledge(s.O("economy").O("profile").O("knowledge"),s.O("active").S("run"),s["active"] as JsonObject));
        result.Put("known_cards",J.Array(s.O("economy").O("profile").A("unlocked").Strings().Select(id=>Expedition.PublicCard(Content.Card(id)))));
        if (s["active"] is JsonObject a && s.O("receipts")[a.S("run")] is JsonObject receipt)
            result.Put("return", J.Select(receipt, "outcome", "mode", "gained_units", "unspent_after_units", "kept_items", "lost_items", "new_unlocks", "knowledge_changes", "case_changes", "expedition_end_hp", "home_hp", "end_id"));
        return new Handles(d).Encode(result);
    }

    // 遭遇済みの公開見出しをUIへ渡す。未遭遇の対象・未観測札・私有山札を追加しない。
    // 元セーブのknowledgeは変更せず、表示境界だけ既存targetの名前と用途で補う。
    private static JsonObject PublicKnowledge(JsonObject k,string run,JsonObject? active) => J.Obj(("views",UiPublicProjection.Knowledge(k,run,active)),("encounters", J.Array(k.A("encounters").Rows().Select(x =>
    {
        var target = Content.M1.O("targets").Values().FirstOrDefault(t => t.S("knowledge_profile_id") == x.S("profile"));
        return J.Select(x, "profile", "version").With(("display_name", target?.S("display_name") ?? "観測した相手・環境"), ("purpose", target?.S("purpose") ?? ""));
    }).DistinctBy(J.Canonical))), ("evidence", J.Array(k.A("events").Rows().Select(x => J.Select(x, "profile", "version", "kind").WithOptional(x, "card", "cards", "reward_key", "label")))));
    private static void Validate(JsonObject d)
    {
        J.Check(d.S("schema") == "CW-CSharp-application-1" && d.S("rule_set_id") == Content.M1.S("rule_set_id") && d.S("content_set_id") == Content.M1.S("content_set_id"), "unsupported_application_state");
        J.Check(d.L("revision") >= 0 && d.L("revision") <= 9007199254740991 && d.S("view_nonce").Length > 0, "invalid_revision");
        var s = d.O("session");
        var e = s.O("economy");
        J.Check(s.S("phase")is "home" or "exploring" or "return", "invalid_phase");
        J.Check(s.L("nextRun") >= 0, "invalid_run_index");
        J.Check(Preparation.Funds(e) >= 0, "invalid_funds");
        Preparation.CanonicalDeck(e, s.O("au").A("deck").Strings());
        Preparation.ValidateEquipment(e, e.O("aq").A("equipped").Strings());
        foreach (var(uid, item)in e.O("inventory"))
        {
            J.Check(item.S("uid") == uid, "invalid_inventory_uid");
            var b = item!.O("blueprint");
            J.Check(J.Canonical(b) == J.Canonical(Content.Blueprint(b.S("kind"), b.S("base"), b.A("affixes").Strings())), "invalid_blueprint");
        }

        foreach (var(id, request)in d.O("request_log"))
            J.Check(id.Length > 0 && request.L("committed_revision") <= d.L("revision") && request.L("committed_revision") >= 0 && request.S("signature").Length > 0, "invalid_request_history");
        if (s.S("phase") == "home")
            J.Check(s["active"] is null && s["game"] is null, "invalid_home_state");
        else
        {
            J.Check(s["active"] is JsonObject && s["game"] is JsonObject, "missing_expedition");
            var a = s.O("active");
            J.Check(a.L("index") < s.L("nextRun") && a.L("seed") == a.L("index"), "invalid_active_run");
            var g = Game(s);
            g.Validate();
            foreach (var rng in s.O("game").O("rng").Select(x => x.Value).Concat(s.O("game").O("future_rng").Select(x => x.Value)))
            {
                J.Check(rng is JsonArray arr && arr.Count == 625 && arr[624].I()is >= 0 and <= 624 && arr.Take(624).All(x => x.L()is >= 0 and <= uint.MaxValue), "invalid_rng_state");
            }

            J.Check(s.S("phase") == "return" ? (g.State["outcome"] is not null && s.O("receipts").ContainsKey(a.S("run"))) : g.State["outcome"] is null, "invalid_settlement_phase");
        }

        foreach (var(run, r)in s.O("receipts"))
        {
            var receipt = (JsonObject)r!;
            var copy = receipt.Copy();
            copy.Remove("signature");
            J.Check(receipt.S("run") == run && receipt.S("signature") == J.Canonical(copy), "invalid_receipt");
            J.Check(e.O("profile").O("returns").S(run) == receipt.S("signature"), "missing_return_ledger");
        }

        if (d["draft"] is JsonObject draft)
            Preparation.CheckShape(draft.O("plan"));
    }

    // UI handles are revision-scoped. DTO identifiers and accounting identities never enter a view.
    private sealed class Handles
    {
        private readonly Dictionary<string, string> forward = [];
        private readonly Dictionary<string, string> reverse = [];
        internal Handles(JsonObject d)
        {
            var e = d.O("session").O("economy");
            int i = 1;
            foreach (var uid in e.O("inventory").Select(x => x.Key).Order(StringComparer.Ordinal))
                Add("owned:" + uid, "owned-" + i++);
            var options = Preparation.Options(e).Rows();
            int c = 0;
            foreach (var row in options)
            {
                string id = row.S("id");
                Add(id, id.StartsWith("basic:", StringComparison.Ordinal) ? id : "choice-" + c++);
            }
        }

        private void Add(string from, string to)
        {
            forward[from] = to;
            reverse[to] = from;
        }

        internal string EncodeString(string text) => forward.GetValueOrDefault(text, text);
        private JsonNode? Map(JsonNode? node, bool decode, Dictionary<string, string>? extra = null)
        {
            if (node is JsonObject o)
            {
                var result = new JsonObject();
                foreach (var(k, v)in o)
                    result[k] = Map(v, decode, extra);
                return result;
            }

            if (node is JsonArray a)
                return new JsonArray(a.Select(x => Map(x, decode, extra)).ToArray());
            if (node is JsonValue value && value.TryGetValue<string>(out var str))
            {
                if (extra is not null && extra.TryGetValue(str, out var pending))
                    return JsonValue.Create(pending);
                if (str.StartsWith("pending:", StringComparison.Ordinal))
                {
                    var rest = str[8..];
                    return JsonValue.Create("pending:" + (decode ? reverse.GetValueOrDefault(rest, rest) : forward.GetValueOrDefault(rest, rest)));
                }

                if (decode)
                {
                    J.Check(!str.StartsWith("owned:", StringComparison.Ordinal) && !str.StartsWith("[\"CW-M1-candidate", StringComparison.Ordinal), "private_handle_not_allowed");
                    return JsonValue.Create(reverse.GetValueOrDefault(str, str));
                }

                return JsonValue.Create(forward.GetValueOrDefault(str, str));
            }

            return node?.DeepClone();
        }

        internal JsonObject Encode(JsonObject o, Dictionary<string, string>? extra = null) => (JsonObject)Map(o, false, extra)!;
        internal JsonObject Decode(JsonObject o) => (JsonObject)Map(o, true)!;
    }
}
