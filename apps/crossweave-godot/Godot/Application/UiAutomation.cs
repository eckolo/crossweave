using Godot;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Crossweave.Core.Application;
using Crossweave.Infrastructure.Application;

namespace Crossweave.Application;

/// <summary>
/// 製品の入口と同じGameScreenを、Godotの実InputEventで操作する隔離検査。
/// 通常起動では生成されない。DTO・故障注入に触るのはこの検査クラスだけ。
/// ViewModelのメソッドを直接呼んで「画面が通った」と見なさず、実Controlの位置へ入力する。
/// </summary>
internal sealed partial class UiAutomation
{
    private readonly GameScreen screen;
    private readonly string mode, output;
    private readonly bool packageEvidence;
    internal readonly string SavePath, CampaignId;
    internal ISaveFaults? Faults;
    private bool running;
    private readonly List<object> checks = [];
    private readonly List<object> commands = [];
    private readonly JsonObject? record;
    private FileGameSession? otherOwner;
    private readonly UiFault fault = new();
    private ApplicationDto? checkpoint;
    private readonly Dictionary<string,int> receivedPresses = new();
    // 再描画でButtonインスタンスが替わっても、実signal受信の記録を同じ検査所有者へ集約する。
    internal void ButtonPressed(string id)=>receivedPresses[id]=receivedPresses.GetValueOrDefault(id)+1;

    private UiAutomation(GameScreen screen, string mode, string slot, string output, string? fixture, bool packageEvidence)
    {
        this.screen = screen; this.mode = mode; this.output = output; this.packageEvidence = packageEvidence;
        SavePath = ProjectSettings.GlobalizePath("user://proofs/d04b-ui-save-01/" + slot + "/m1.json");
        CampaignId = "D04B-" + mode;
        Directory.CreateDirectory(output);
        if ((mode.StartsWith("review-", StringComparison.Ordinal) && mode is not "review-fixtures" and not "review-resume")||mode.StartsWith("repro-",StringComparison.Ordinal))
            LoadReviewFixture(fixture ?? throw new ArgumentException("Review check requires a fixed fixture"));
        if (mode is "natural" or "withdraw-before" or "withdraw-protected" or "defeat" or "withdraw-unprotected" or "legal-acquisition")
        {
            // 配布exeには試験原本を混ぜない。隔離検査だけが明示した絶対パスを読む。
            // 既存のエディター検査は従来の固定fixtureをそのまま使う。
            using var file = System.IO.File.OpenRead(fixture ?? System.IO.Path.GetFullPath(System.IO.Path.Combine(ProjectSettings.GlobalizePath("res://"), "../Tests/Fixtures/application-oracle.json.br")));
            using var stream = new BrotliStream(file, CompressionMode.Decompress);
            record = ((JsonObject)JsonNode.Parse(stream)!).Arr("records").Rows().Single(r => r.Text("name") == mode).Copy();
            if (mode is "legal-acquisition" or "withdraw-unprotected")
            {
                var d = record.Obj("initial").Copy(); d["schema"] = "CW-CSharp-application-1"; d["engine_version"] = "CW-CSharp-core-1";
                using var created = FileGameSession.CreateFromDto(SavePath, new(1, d.Text("rule_set_id"), d.Text("content_set_id"), d));
            }
        }
        if (mode is "failure" or "unknown" or "busy-close" or "in-use" or "corrupt" or "future")
        {
            using (var created = FileGameSession.CreateNew(SavePath, CampaignId))
            {
                if (mode == "corrupt")
                {
                    var v = created.Inspect(); created.Execute(new("make-backup", v.Number("revision"), v.Text("view_token"), "depart", new() { ["case_id"] = "SCN-001" }));
                }
            }
            if (mode is "failure" or "unknown" or "busy-close") Faults = fault;
            if (mode == "in-use") otherOwner = FileGameSession.Open(SavePath);
            if (mode == "corrupt") System.IO.File.WriteAllText(SavePath, "{broken");
            if (mode == "future")
            {
                var document = (JsonObject)JsonNode.Parse(System.IO.File.ReadAllText(SavePath))!;
                document["fileVersion"] = 999; System.IO.File.WriteAllText(SavePath, document.ToJsonString());
            }
        }
    }

    internal static UiAutomation? FromArguments(GameScreen screen, string[] args)
    {
        string? Value(string prefix) => args.FirstOrDefault(a => a.StartsWith(prefix, StringComparison.Ordinal))?[prefix.Length..];
        if (Value("--ui-check=") is not { } mode) return null;
        // 同状態比較では撮影テーマを明示する。通常起動のOS判定と保存DTOには影響しない。
        screen.ThemeDarkOverride=Value("--ui-theme=") switch {"light"=>false,"dark"=>true,null=>null,_=>throw new ArgumentException("Unknown UI theme")};
        string slot = Value("--ui-slot=") ?? "", output = Value("--ui-output=") ?? "";
        if (!Regex.IsMatch(slot, "^[a-z0-9][a-z0-9-]{7,95}$") || !System.IO.Path.IsPathFullyQualified(output))
            throw new ArgumentException("--ui-check requires a dedicated --ui-slot and absolute --ui-output");
        if (!new[] { "natural", "withdraw-before", "withdraw-protected", "defeat", "withdraw-unprotected", "legal-acquisition", "interaction", "inheritance", "resume", "failure", "unknown", "busy-close", "in-use", "corrupt", "future", "package-checkpoint", "package-resume", "repro-home", "repro-story", "repro-explore", "repro-prediction", "repro-motion-home", "repro-motion-explore", "repro-return-clear", "repro-return-withdrawal", "repro-return-defeat", "repro-shared-preparation", "repro-shared-story", "repro-shared-return-clear", "repro-shared-return-withdrawal", "repro-shared-return-defeat", "repro-acquisition-affix", "repro-acquisition-funded", "repro-acquisition-complete", "repro-revisit-home", "repro-component-extra", "repro-bars-prep", "repro-bars-hand", "repro-bars-field", "repro-edges-prep", "repro-edges-hand", "repro-edges-field" }.Contains(mode)&&!ReviewModes.Contains(mode))
            // 追加の合法状態境界も同じ検査窓口へ限定する。
            if (mode is not "repro-hover" and not "repro-preparation-boundaries" and not "repro-record-memory" and not "repro-checkbox-states") throw new ArgumentException("Unknown isolated UI check");
        string? fixture = Value("--ui-fixture=");
        if (fixture is not null && !System.IO.Path.IsPathFullyQualified(fixture))
            throw new ArgumentException("Isolated fixture requires an absolute path");
        return new(screen, mode, slot, output, fixture, args.Contains("--package-evidence"));
    }
    internal void Opened() { }
    internal void Tick()
    {
        if (running || screen.Busy) return;
        running = true;
        _ = Run();
    }
    private async Task Frame(int count = 1) { for (int i = 0; i < count; i++) await screen.ToSignal(screen.GetTree(), SceneTree.SignalName.ProcessFrame); }
    private async Task Idle()
    {
        for (int i = 0; i < 2000; i++) { await Frame(); if (!screen.Busy) { await Frame(2); return; } }
        throw new TimeoutException("UI operation did not complete");
    }
    private void Check(string id, bool ok, object? details = null)
    {
        if (!ok) throw new InvalidDataException(id + ": " + JsonSerializer.Serialize(details));
        checks.Add(new { id, expected = true, actual = ok, details });
    }
    private async Task Mouse(Vector2 point, bool down, MouseButton button = MouseButton.Left)
    {
        if(down)screen.GetViewport().PushInput(new InputEventMouseMotion{Position=point,GlobalPosition=point},true);
        screen.GetViewport().PushInput(new InputEventMouseButton { Position = point, GlobalPosition = point, ButtonIndex = button, Pressed = down }, true); await Frame();
    }
    private async Task Move(Vector2 from, Vector2 to)
    {
        screen.GetViewport().PushInput(new InputEventMouseMotion { Position = to, GlobalPosition = to, Relative = to - from, ButtonMask = MouseButtonMask.Left }, true); await Frame();
    }
    private async Task<Vector2> Point(string id)
    {
        await Frame(2);
        // 移動中フレームの検査以外は、原本の200ms移動が着地した実ノードへ入力する。
        while(Time.GetTicksMsec()<screen.MotionEndsAt)await Frame();
        if (!screen.Controls.TryGetValue(id, out var control)) throw new InvalidDataException("Missing control " + id + " at " + screen.Screen + "/" + screen.Modal);
        for (Node? n = control.GetParent(); n is not null; n = n.GetParent())
            if (n is ScrollContainer s)
            {
                var rect = s.GetGlobalRect(); var center = control.GetGlobalRect().GetCenter();
                if (s.VerticalScrollMode != ScrollContainer.ScrollMode.Disabled) s.ScrollVertical += (int)(center.Y - Mathf.Clamp(center.Y, rect.Position.Y + 42, rect.End.Y - 42));
                if (s.HorizontalScrollMode != ScrollContainer.ScrollMode.Disabled) s.ScrollHorizontal += (int)(center.X - Mathf.Clamp(center.X, rect.Position.X + 125, rect.End.X - 125));
                await Frame(2);
            }
        if (control is Button { Disabled: true }) throw new InvalidDataException("Disabled control " + id + " " + screen.Message);
        return control.GetGlobalRect().GetCenter();
    }
    private async Task Click(string id, bool waitForIdle = true)
    {
        if(!screen.Controls.ContainsKey(id) && id is "exit" or "history" or "deck" or "repeat" or "return-prepare") await Click("menu");
        var point = await Point(id);
        // GodotのGUIは直前のmouse motionでホバー先を更新する。実マウスと同じ順で
        // 移動→押下→解放を送る。最初の入力だけOSポインター位置へ依存させない。
        screen.GetViewport().PushInput(new InputEventMouseMotion { Position = point, GlobalPosition = point }, true);
        var button=screen.Controls[id] as Button;int previous=receivedPresses.GetValueOrDefault(id);
        // OSの実マウス移動と同フレームになった場合だけ再送する。Pressed受信後は再送せず二重確定を防ぐ。
        for(int attempt=0;attempt<3;attempt++)
        {
            await Frame(2);
            screen.GetViewport().PushInput(new InputEventMouseMotion{Position=point,GlobalPosition=point},true);
            // 短クリックの押下・解放を同じフレームへ入れ、初回フォント生成時間をホールドと誤認させない。
            screen.GetViewport().PushInput(new InputEventMouseButton{Position=point,GlobalPosition=point,ButtonIndex=MouseButton.Left,Pressed=true},true);
            screen.GetViewport().PushInput(new InputEventMouseButton{Position=point,GlobalPosition=point,ButtonIndex=MouseButton.Left,Pressed=false},true);
            if(waitForIdle)await Idle();else await Frame(3);
            if(button is null||receivedPresses.GetValueOrDefault(id)>previous)break;
        }
        if(button is not null&&receivedPresses.GetValueOrDefault(id)==previous)throw new InvalidDataException("Button received no Pressed signal: "+id);
    }
    private async Task CloseDetail()
    {
        if (screen.Modal == "detail") await Click("detail-close");
        else if (screen.Modal != "") await Click("modal-close");
    }
    private async Task ReadAll(string id)
    {
        if (screen.Controls.GetValueOrDefault(id) is not ScrollContainer s) return;
        for (int i = 0; i < 8; i++) { await Frame(2); s.ScrollVertical += (int)(s.Size.Y / 2); }
        await Frame(2);
    }
    private static JsonObject Comparable(ApplicationDto dto) { var s = dto.State.Copy(); s.Remove("view_nonce"); return s; }
    private static string Hash(JsonNode node)
    {
        JsonNode? Sort(JsonNode? n) => n is JsonObject o ? new JsonObject(o.OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => KeyValuePair.Create(p.Key, Sort(p.Value)))) : n is JsonArray a ? new JsonArray(a.Select(Sort).ToArray()) : n?.DeepClone();
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Sort(node)!.ToJsonString()))).ToLowerInvariant();
    }
    private void VerifyCommand(ApplicationDto before, string type, JsonObject? payload = null)
    {
        Check("command-committed-" + commands.Count, screen.LastStatus == "committed", new { screen.LastStatus, screen.Message });
        var command = screen.LastCommand!;
        Check("intent-" + commands.Count, command.Type == type && (payload is null || JsonNode.DeepEquals(command.Payload, payload)), command);
        var expected = GameApplication.Restore(before); var result = expected.Execute(command);
        var actual = screen.Session!.ExportDto();
        Check("core-file-view-equal-" + commands.Count, result.Status == "committed" && JsonNode.DeepEquals(Comparable(expected.ExportDto()), Comparable(actual)) && JsonNode.DeepEquals(actual.State, SaveFileCodec.Read(SavePath).Dto.State));
        commands.Add(new { type, revision = actual.State.Number("revision"), phase = screen.View.Text("phase"), expected_hash = Hash(Comparable(expected.ExportDto())), actual_hash = Hash(Comparable(actual)), file_bytes = new FileInfo(SavePath).Length });
    }
    private async Task EditTo(JsonObject plan)
    {
        if (screen.Screen != "preparation") await Click("prepare");
        foreach (var id in plan.Arr("acquire").Strings())
        {
            var offer = screen.View.Obj("home").Arr("acquisition").Rows().Single(r => r.Text("id") == id);
            await Click("tab-" + offer.Obj("blueprint").Text("kind")); await Click("取得-" + id);
        }
        foreach (var kind in new[] { "card", "passive" })
        {
            await Click("tab-" + kind); string key = kind == "card" ? "deck" : "equipment";
            var target = plan.Obj("composition").Arr(key).Strings();
            foreach (var id in screen.Plan.Obj("composition").Arr(key).Strings().Where(s => !target.Contains(s)).ToArray()) await Click("外す-" + id);
            foreach (var id in target.Where(s => !screen.Plan.Obj("composition").Arr(key).Strings().Contains(s))) await Click("編成-" + id);
        }
        // 札組は並べ替え操作を持たず、Coreが個体集合として正規化する。候補順は購入順を維持する。
        Check("edited-plan-content", plan.Arr("acquire").Strings().SequenceEqual(screen.Plan.Arr("acquire").Strings())
            && new[] { "deck", "equipment" }.All(k => plan.Obj("composition").Arr(k).Strings().Order().SequenceEqual(screen.Plan.Obj("composition").Arr(k).Strings().Order())));
    }
    private static void Delta(JsonObject state, JsonArray changes)
    {
        foreach (var op in changes.Rows())
        {
            var path = op.Arr("path").Strings(); JsonNode n = state;
            foreach (var part in path[..^1]) n = n is JsonArray a ? a[int.Parse(part)]! : n[part]!;
            if (n is JsonArray array) array[int.Parse(path[^1])] = op["value"]?.DeepClone();
            else if (op.Flag("remove")) ((JsonObject)n).Remove(path[^1]); else n[path[^1]] = op["value"]?.DeepClone();
        }
    }
    private async Task Campaign()
    {
        var expectedLegacy = record!.Obj("initial").Copy(); int index = 0;
        foreach (var row in record.Arr("steps").Rows())
        {
            Delta(expectedLegacy, row.Arr("expected_delta"));
            var request = row.Obj("request"); var type = request.Text("type"); var payload = request.Obj("payload").Copy();
            var before = screen.Session!.ExportDto();
            switch (type)
            {
                case "depart": if (screen.Screen == "preparation") await Click("home"); await Click("depart"); break;
                case "continue_scene":
                    if (payload["advance"] is not null && !payload.Flag("advance"))
                    { await Click("story-detail"); await ReadAll("dialog-body"); await Click("record-detail"); }
                    else { await ReadAll(screen.Screen == "return" ? "return-prose" : "scene-reader"); await Click("continue"); }
                    break;
                case "play":
                    var choice = payload.Obj("choice"); await Click("card-hand-" + choice.Text("card_id")); await CloseDetail();
                    if (choice.Text("target").Length > 0) { await Click("actor-" + choice.Text("target")); await CloseDetail(); }
                    await Click("play"); break;
                case "withdraw": await Click("withdraw"); await Click("withdraw-confirm"); break;
                case "ack_return": await Click("ack"); break;
                case "commit_preparation":
                    if (mode == "natural")
                    {
                        var raw = expectedLegacy.Obj("session").Obj("au").Arr("deck").Strings();
                        var owned = before.State.Obj("session").Obj("economy").Obj("inventory").Select(p => p.Key).Order(StringComparer.Ordinal).ToArray();
                        payload.Obj("plan").Obj("composition")["deck"] = ViewData.Array(raw.Select(s => "owned-" + (Array.IndexOf(owned, s[6..]) + 1)));
                    }
                    await EditTo(payload.Obj("plan"));
                    payload["plan"] = screen.Plan.Copy(); await Click("review"); await Capture("preparation-review"); await Click("commit"); break;
                default: throw new InvalidDataException("Unsupported fixture command " + type);
            }
            VerifyCommand(before, type, type == "continue_scene" ? null : payload);
            Check("fixture-phase-" + index, screen.View.Text("phase") == expectedLegacy.Obj("session").Text("phase"));
            if (screen.Screen == "return")
            {
                await Capture("return-" + screen.View.Obj("return").Text("outcome"));
                var saved = screen.Session.ExportDto().State; await Frame(5);
                Check("redisplay-does-not-settle-" + index, JsonNode.DeepEquals(saved, screen.Session.ExportDto().State));
            }
            if (index == 2) await Capture("exploration");
            index++;
        }
        if (mode == "legal-acquisition") Check("passive-public-japanese", screen.View.Obj("exploration").Obj("self").Count > 0);
    }
    private async Task RepeatCheck()
    {
        if (screen.View.Text("phase") == "home") { await Click("depart"); await Click("withdraw"); await Click("withdraw-confirm"); }
        while (screen.Can("continue_scene")) { await ReadAll("return-prose"); await Click("continue"); }
        bool resolved = screen.View.Obj("case").Text("status") == "resolved";
        var owner = screen.Session; long revision = screen.View.Number("revision");
        await Click("repeat");
        Check("return-repeat-same-owner-two-boundaries", ReferenceEquals(owner, screen.Session) && screen.View.Number("revision") == revision + 2 && screen.View.Text("phase") == "exploring");
        Check("repeat-mode", screen.Session!.ExportDto().State.Obj("session").Obj("active").Text("mode") == (resolved ? "revisit" : "retry"));
    }

    private async Task ConversionChecks()
    {
        // 自然初回で未解禁の有料個体だけを、別の合法取得fixtureで確認する。
        await Click("withdraw"); await Click("withdraw-confirm");
        while (screen.Can("continue_scene")) { await ReadAll("return-prose"); await Click("continue"); }
        await Click("ack"); await Click("prepare"); await Click("tab-passive");
        var id = screen.Plan.Obj("composition").Arr("equipment").Strings().First();
        await Click("外す-" + id); await Click("review"); await Click("commit");
        var row = screen.View.Obj("home").Arr("owned").Rows().First(r => !r.Flag("selected") && r.Flag("conversion_available")); id = row.Text("id");
        Check("compiled-passive-japanese", row.Obj("details").Text("effect_text").Length > 0 && row.Obj("details").Text("trigger_text").Length > 0);
        await Click("item-reserve-" + id); await Click("lock");
        await Click("item-reserve-" + id); Check("acquired-lock-prevents-conversion", screen.Controls["convert"] is Button { Disabled: true }); await Click("lock");
        var before = screen.Session!.ExportDto();
        await Click("item-reserve-" + id); await Click("convert"); await Capture("conversion"); await Click("convert-confirm"); VerifyCommand(before, "convert_items");
        await Click("home"); await Click("depart");
        Check("conversion-then-redepart", screen.View.Text("phase") == "exploring");
    }

    private async Task Interaction()
    {
        Check("root-1920x1080", screen.GetViewportRect().Size == new Vector2(1920, 1080));
        Check("japanese-font", "取得編成着想探索撤退保存復旧".All(c => GD.Load<Font>("res://Assets/NotoSansJP.ttf").HasChar(c)));
        await Capture("home"); await Click("prepare"); await Capture("preparation");
        var before = screen.Session!.ExportDto().State.Copy();
        var owned = screen.View.Obj("home").Arr("owned").Rows().First(r => r.Flag("selected")); string id = owned.Text("id");
        await Click("item-build-" + id);
        Check("preparation-detail-960x820", screen.Controls["detail-panel"].GetGlobalRect() == new Rect2(480,130,960,820)); await CloseDetail();
        // 実ノードの長押しドラッグで編成から外す。未確定なのでファイルは不変。
        var from = await Point("item-build-" + id); await Mouse(from, true);
        await screen.ToSignal(screen.GetTree().CreateTimer(.25), SceneTreeTimer.SignalName.Timeout);
        await Move(from, new(750, 700)); await Mouse(new(750, 700), false); await Idle();
        Check("drag-plan-only", screen.Dirty && !screen.Comparison.Flag("ok") && JsonNode.DeepEquals(before, SaveFileCodec.Read(SavePath).Dto.State));
        await Click("review"); Check("invalid-plan-cannot-commit", screen.Controls["commit"] is Button { Disabled: true }); await Click("modal-close");
        await Click("exit"); Check("dirty-exit-confirm", screen.Modal == "quit"); await Click("modal-close");
        Check("cancel-exit-retains-plan", screen.Dirty); await Click("discard");
        await Click("tab-passive"); await Click("取得-basic:PS01");
        Check("insufficient-funds-plan-retained", screen.Dirty && !screen.Comparison.Flag("ok"));
        await Click("item-reserve-pending:basic:PS01"); await Click("detail-unstage"); Check("cancel-acquisition-no-payment", !screen.Dirty && JsonNode.DeepEquals(before, SaveFileCodec.Read(SavePath).Dto.State));
        await Click("tab-card");
        var extra = screen.View.Obj("home").Arr("owned").Rows().First(r => !r.Flag("selected")).Text("id");
        await Click("item-reserve-" + extra); await Click("lock");
        Check("lock-saved", screen.View.Obj("home").Arr("owned").Rows().Single(r => r.Text("id") == extra).Flag("locked"));
        await Click("item-reserve-" + extra); Check("locked-conversion-disabled", screen.Controls["convert"] is Button { Disabled: true }); await Click("lock");
        await Click("item-reserve-" + extra); Check("initial-grant-not-convertible", screen.Controls["convert"] is Button { Disabled: true }); await CloseDetail();
        await Click("home"); await Click("depart"); await ReadAll("scene-reader"); await Click("continue"); Check("continue-unpauses", !screen.View.Obj("story").Obj("scene").Flag("paused"), new {screen.Modal,screen.LastStatus,screen.Message, point=screen.Controls.GetValueOrDefault("continue")?.GetGlobalRect().ToString()});
        var hand = screen.View.Obj("exploration").Arr("hand").Rows().First().Text("id");
        var actorImages = screen.Controls.Where(p => p.Key.StartsWith("actor-")).SelectMany(p => p.Value.GetChildren().OfType<TextureRect>()).ToArray();
        Check("actor-art-contained", actorImages.Length > 0 && actorImages.All(t => t.Size.X <= ((Control)t.GetParent()).Size.X && t.Size.Y <= ((Control)t.GetParent()).Size.Y && t.GetGlobalRect().End.X <= ((Control)t.GetParent()).GetGlobalRect().End.X));
        await Click("card-hand-" + hand); Check("tap-details", screen.Modal == "detail"); await CloseDetail();
        await Click("preview"); Check("prediction-readonly", screen.Modal == "prediction"); await Capture("prediction"); await CloseDetail();
        var revision = screen.View.Number("revision"); from = await Point("card-hand-" + hand);
        await Mouse(from, true); await Move(from, from + new Vector2(60, 0)); await Mouse(from + new Vector2(60, 0), false); await Idle();
        Check("swipe-no-commit", screen.View.Number("revision") == revision);
        from = await Point("card-hand-" + hand); await Mouse(from, true); await screen.ToSignal(screen.GetTree().CreateTimer(.25), SceneTreeTimer.SignalName.Timeout);
        await Mouse(new(950, 650), true, MouseButton.Right); await Mouse(new(950, 520), false); await Idle();
        Check("right-cancel-no-commit", screen.View.Number("revision") == revision);
        await Mouse(from, true); screen.Notification((int)Node.NotificationWMWindowFocusOut); await Mouse(new(950, 520), false); await Idle();
        Check("focus-loss-no-commit", screen.View.Number("revision") == revision);
        checkpoint = screen.Session.ExportDto();
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, "resume-expected.json"), JsonSerializer.Serialize(checkpoint));
        await Capture("exploration");
    }
    private async Task Resume()
    {
        int initialCommandCount = commands.Count;
        checkpoint = JsonSerializer.Deserialize<ApplicationDto>(System.IO.File.ReadAllText(System.IO.Path.Combine(output, "resume-expected.json")))!;
        Check("separate-process-exact-resume", JsonNode.DeepEquals(checkpoint.State, screen.Session!.ExportDto().State));
        var choice = screen.View.Obj("exploration").Arr("legal_actions").Rows().First();
        await Click("card-hand-" + choice.Text("card_id")); await CloseDetail();
        if (choice.Text("target") != "") { await Click("actor-" + choice.Text("target")); await CloseDetail(); }
        var from = await Point("card-hand-" + choice.Text("card_id"));
        await Mouse(from, true); await screen.ToSignal(screen.GetTree().CreateTimer(.25), SceneTreeTimer.SignalName.Timeout);
        await Move(from, new(960, 540)); await Mouse(new(960, 540), false); await Idle();
        if(screen.Modal=="prediction")
        {
            Check("matched-drag-waits-for-confirmation",JsonNode.DeepEquals(checkpoint.State,screen.Session!.ExportDto().State));
            await CloseDetail();await Click("play");
        }
        VerifyCommand(checkpoint, "play", new() { ["choice"] = choice.Copy() });
        Check("rng-next-result-equal", commands.Count == initialCommandCount + 1);
    }
    // 差替え直前の読み取り専用スナップショット。通常保存は変更しない。
    private void PackageCheckpoint()
    {
        checkpoint = screen.Session!.ExportDto();
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, "resume-expected.json"), JsonSerializer.Serialize(checkpoint));
        Check("package-checkpoint-full-dto", JsonNode.DeepEquals(checkpoint.State, SaveFileCodec.Read(SavePath).Dto.State));
    }
    private async Task PackageResume()
    {
        checkpoint = JsonSerializer.Deserialize<ApplicationDto>(System.IO.File.ReadAllText(System.IO.Path.Combine(output, "resume-expected.json")))!;
        // nonceも含む全DTOで所持・編成・進行・乱数・精算済み状態を比較する。
        Check("replacement-full-dto-unchanged", JsonNode.DeepEquals(checkpoint.State, screen.Session!.ExportDto().State));
        // 再出発直後は物語が停止中。通常の本文読了操作で再開してから次結果を比較する。
        for (int i = 0; i < 8 && screen.Can("continue_scene"); i++)
        {
            var before = screen.Session.ExportDto();
            await ReadAll("scene-reader"); await Click("continue"); VerifyCommand(before, "continue_scene");
        }
        PackageCheckpoint(); await Resume();
    }
    private async Task Failures()
    {
        var original = screen.Session!.ExportDto().State.Copy(); var bytes = System.IO.File.ReadAllBytes(SavePath);
        JsonObject? pending = null;
        if (mode == "failure")
        {
            await Click("prepare");
            var owned = screen.View.Obj("home").Arr("owned").Rows().ToArray();
            var reserve = owned.First(r => !r.Flag("selected") && !owned.Any(x => x.Flag("selected") && x.Obj("blueprint").Text("base") == r.Obj("blueprint").Text("base")));
            var selected = owned.First(r => r.Flag("selected"));
            await Click("外す-" + selected.Text("id")); await Click("編成-" + reserve.Text("id"));
            pending = screen.Plan.Copy(); await Click("review"); fault.Mode = mode; await Click("commit");
        }
        else { fault.Mode = mode; await Click("depart"); }
        if (mode == "failure")
        {
            Check("definite-failure-state-file-invariant", screen.LastStatus == "rejected" && !screen.Blocked && JsonNode.DeepEquals(pending, screen.Plan) && JsonNode.DeepEquals(original, screen.Session.ExportDto().State) && bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
            var id = screen.LastCommand!.RequestId; await Capture("save-failure"); fault.Mode = ""; await Click("retry");
            Check("same-request-retry-committed", screen.LastStatus == "committed" && screen.LastCommand.RequestId == id && screen.View.Number("revision") == 1);
        }
        else
        {
            Check("unknown-stops-normal-input", screen.LastStatus == "indeterminate" && screen.Blocked && screen.Controls["retry"] is Button { Disabled: true } && !screen.Can("depart"));
            await Capture("save-unknown"); fault.Mode = ""; await Click("reload"); await Click("reload-confirm");
            Check("reload-replaces-whole-view", !screen.Blocked && screen.View.Text("phase") == "exploring");
            var saved = System.IO.File.ReadAllBytes(SavePath); await Click("retry");
            Check("same-request-replayed-no-second-apply", screen.LastStatus == "replayed" && screen.View.Number("revision") == 1 && saved.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        }
    }
    private async Task Capture(string name)
    {
        if (DisplayServer.GetName() == "headless") return;
        // 比較用の静止画は200msの取得移動が着地した後に採る。
        // 遷移中の実フレームはReproductionMotionのSampleへ分け、途中を
        // 静止状態と読み替えない。保存・入力の製品処理には待機を足さない。
        while (Time.GetTicksMsec() < screen.MotionEndsAt) await Frame();
        await screen.ToSignal(RenderingServer.Singleton, RenderingServer.SignalName.FramePostDraw);
        ulong capturedAt=Time.GetTicksMsec();
        var image = screen.GetViewport().GetTexture().GetImage();
        if (image.SavePng(System.IO.Path.Combine(output, mode + "-" + name + ".png")) != Error.Ok) throw new IOException("Screenshot failed");
        System.IO.File.WriteAllText(System.IO.Path.Combine(output,mode+"-"+name+".nodes.json"),JsonSerializer.Serialize(new{at_ms=capturedAt,viewport=screen.GetViewportRect().Size.ToString(),theme=screen.ThemeDarkOverride?.ToString()??"OS",revision=screen.View.Number("revision"),phase=screen.View.Text("phase"),screen=screen.Screen,modal=screen.Modal,nodes=Geometry()},new JsonSerializerOptions{WriteIndented=true}));
    }
    private void Report(string status, Exception? error = null)
    {
        var report = new { status, mode, process_id = System.Environment.ProcessId, process_instance = Guid.NewGuid().ToString("N"), engine = Engine.GetVersionInfo()["string"].ToString(), display = DisplayServer.GetName(), runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            os = System.Runtime.InteropServices.RuntimeInformation.OSDescription, normal_scene = "res://Main.tscn", save_path = SavePath, controls = screen.Controls.Count,
            logical_viewport = screen.GetViewportRect().Size.ToString(), actual_window = DisplayServer.WindowGetSize().ToString(),
            execution = "real Godot nodes; viewport-local synthetic InputEvent; actual FileGameSession files", physical_input = false, windows11_physical = false, human_playtest = false,
            package = packageEvidence ? PackageEvidence.Read() : null,font_environment=FontEnvironment(),resolved_fonts=screen.AcceptedFontEvidence(),
            checks, commands, error = error?.ToString(), final_revision = screen.View.Number("revision"), final_phase = screen.View.Text("phase") };
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, mode + ".json"), JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
    }
    private async Task Run()
    {
        try
        {
            await Frame(3);
            await Capture("start");
            if (mode == "in-use")
            {
                await Click("open"); Check("second-owner-visible-no-reset", screen.LastStatus == "save_in_use" && screen.Session is null && screen.Controls["new"] is Button { Disabled: true });
                otherOwner!.Dispose(); otherOwner = null; await Click("open"); Check("ownership-release-opens", screen.Session is not null);
            }
            else if (mode == "future") Check("future-no-new-no-recovery", screen.Controls["open"] is Button { Disabled: true } && screen.Controls["new"] is Button { Disabled: true } && !screen.Controls.ContainsKey("recover"));
            else if (mode == "corrupt")
            {
                Check("corrupt-does-not-reset", screen.Controls["new"] is Button { Disabled: true });
                await Click("recover"); Check("explicit-recovery-confirm", screen.Modal == "recover"); await Capture("recovery"); await Click("recover-confirm");
                Check("backup-opened-and-original-retained", screen.View.Number("revision") == 0 && Directory.GetFiles(System.IO.Path.GetDirectoryName(SavePath)!, "*.damaged-*").Length > 0);
            }
            else
            {
                await Click(screen.Controls["open"] is Button { Disabled: false } ? "open" : "new");
                Check("opened-one-session", screen.Session is not null && screen.Screen != "start");
                if (mode.StartsWith("repro-",StringComparison.Ordinal))await Reproduction();
                else if (mode == "review-fixtures") await GenerateReviewFixtures();
                else if (mode.StartsWith("review-scroll-",StringComparison.Ordinal)) await ReviewScroll();
                else if (mode.StartsWith("review-safety-",StringComparison.Ordinal)) await ReviewSafety();
                else if (mode.StartsWith("review-prediction-",StringComparison.Ordinal)) await ReviewPrediction();
                else if (mode.StartsWith("review-order-",StringComparison.Ordinal)) await ReviewOrder();
                else if (mode=="review-details-unlimited") await ReviewUnlimited();
                else if (mode=="review-preparation") await ReviewPreparation();
                else if (mode.StartsWith("review-destination",StringComparison.Ordinal)) await ReviewDestination();
                else if (mode=="review-resume") await Resume();
                else if (record is not null) { await Campaign(); if (mode == "legal-acquisition") await ConversionChecks(); if(mode=="natural")await KnownCatalogue(); if (mode is "natural" or "defeat") await RepeatCheck(); }
                else if (mode == "interaction") await Interaction();
                else if (mode == "inheritance") await Inheritance();
                else if (mode == "resume") await Resume();
                else if (mode == "package-checkpoint") PackageCheckpoint();
                else if (mode == "package-resume") await PackageResume();
                else if (mode is "failure" or "unknown") await Failures();
                else if (mode == "busy-close")
                {
                    fault.Mode = "busy-close";
                    var point = await Point("depart"); await Click("depart",false);
                    for (int i = 0; i < 1000 && !fault.Entered.IsSet; i++) await Frame();
                    Check("save-pending-ui-alive", screen.Busy && fault.Entered.IsSet);
                    await Mouse(point, true); await Mouse(point, false);
                    screen.Notification((int)Node.NotificationWMCloseRequest);
                    Check("close-waits-for-save", screen.Busy && screen.IsInsideTree());
                    Report("passed"); fault.Resume.Set(); return; // 正常終了を製品のCloseへ任せる。次プロセスでrevision=1を照合する。
                }
            }
            Report("passed"); await Click("exit"); if (screen.Modal == "quit") await Click("quit-confirm");
        }
        catch (Exception e)
        {
            Report("failed", e); otherOwner?.Dispose(); fault.Resume.Set(); GD.PushError(e.ToString()); screen.GetTree().Quit(1);
        }
    }
    private sealed class UiFault : ISaveFaults
    {
        internal string Mode = "";
        internal readonly ManualResetEventSlim Entered = new(), Resume = new();
        public void Hit(SavePoint point, string path)
        {
            if (Mode == "failure" && point == SavePoint.BeforeWrite) throw new IOException("isolated UI save failure");
            if (Mode == "unknown" && point is SavePoint.AfterReplace or SavePoint.BeforeReconcile) throw new IOException("isolated UI outcome unknown");
            if (Mode == "busy-close" && point == SavePoint.BeforeReplace) { Entered.Set(); if (!Resume.Wait(20000)) throw new TimeoutException("UI did not release test save"); }
        }
    }
}
