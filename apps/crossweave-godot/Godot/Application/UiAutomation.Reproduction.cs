using Godot;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// 原本の通常commandで得た保存から、同じMain/GameScreenの使用先を撮る隔離検査。
/// 値・規則の改変や代用画面を作らない。入力は実Control、証拠はFramePostDrawの実画像。
/// 原本の過去撮影環境や人の物理入力の合格を、この検査から推定しない。
/// </summary>
internal sealed partial class UiAutomation
{
    private async Task Reproduction()
    {
        if(mode.StartsWith("repro-bars-",StringComparison.Ordinal)){await ReproductionBars();return;}
        if(mode.StartsWith("repro-edges-",StringComparison.Ordinal)){await ReproductionEdges();return;}
        if (mode.StartsWith("repro-acquisition-", StringComparison.Ordinal)||mode is "repro-revisit-home" or "repro-component-extra") { await ReproductionExtra(); return; }
        if (mode.StartsWith("repro-shared-", StringComparison.Ordinal)) { await ReproductionShared(); return; }
        if (mode.StartsWith("repro-motion-", StringComparison.Ordinal)) { await ReproductionMotion(); return; }
        var dto = screen.Session!.ExportDto(); var bytes = System.IO.File.ReadAllBytes(SavePath);
        await Capture("entry"); CommonPosition(mode);
        if (mode == "repro-home") { await ButtonStates("prepare"); await ButtonStates("knowledge"); await ButtonStates("depart"); await ButtonStates("menu"); }
        if (mode == "repro-explore") await ButtonStates("menu");
        if (mode == "repro-home")
        {
            await Click("story-detail"); await Capture("home-detail"); await Click("modal-close");
            await Click("prepare"); await Capture("card");
            await ButtonStates("tab-card");
            await ButtonStates("review"); await ButtonStates("discard");
            await ButtonStates(screen.Controls.Keys.First(k => k.StartsWith("外す-")));
            var first = screen.Controls.Keys.First(k => k.StartsWith("item-build-")); await Click(first); await Capture("owned-detail"); await ButtonStates("detail-close"); await CloseDetail();
            await Click("tab-passive"); await Capture("passive");
            await Click("item-offer-basic:PS01"); await Capture("passive-detail"); await Click("detail-stage"); await Capture("pending");
            await Click("item-reserve-pending:basic:PS01"); await Capture("pending-detail");
            Check("N01-pending-price-real-node", screen.Controls.ContainsKey("detail-price")); await CloseDetail();
            await Click("review"); await Capture("confirmation"); await CloseDetail(); await Click("discard");
            Check("readonly-preparation-revert", !screen.Dirty);
            await Click("tab-card");
            // 空編成は合法な未確定編集で作る。無効な案を保存fixtureへ書き込まず、
            // 正式所持が残ることと取消で元に戻ることを同じ実操作から確認する。
            foreach (string uid in screen.Plan.Obj("composition").Arr("deck").Strings()) await Click("外す-" + uid);
            await Capture("empty-composition"); Check("empty-draft-owned-retained", screen.Plan.Obj("composition").Arr("deck").Count == 0 && screen.View.Obj("home").Arr("owned").Count > 0);
            await Click("discard");
        }
        else if (mode == "repro-story")
        {
            await ReadAll("scene-reader"); await Capture("prose-end");
            await Click("story-detail"); await Capture("optional-prose"); await Click("modal-close");
        }
        else if (mode.StartsWith("repro-return-", StringComparison.Ordinal))
        {
            await ReadAll("return-prose"); await Capture("prose-end");
            await Click("receipt"); await Capture("receipt"); await ReadAll("dialog-body"); await Capture("receipt-end"); await CloseDetail();
            await Click("story-detail"); await Capture("optional-prose"); await CloseDetail();
        }
        else
        {
            // 原本の減動設定は表示窓に属する。実CheckBoxで切替え、保存DTOへ入れない。
            foreach (string targetModal in new[] { "settings", "operation", "help", "objective", "status", "order", "deck", "history", "action-history", "save-data" })
            {
                await Click("menu"); await Capture("menu-" + targetModal); await Click(targetModal); await Capture(targetModal);
                if (targetModal == "settings")
                { await ButtonStates("reduced-motion"); await Click("reduced-motion"); await Capture("reduced-motion"); Check("N03-real-checkbox", screen.Controls["reduced-motion"] is CheckBox { ButtonPressed: true }); await Click("reduced-motion"); }
                if (targetModal == "deck" && screen.Controls.ContainsKey("deck-card-0")) { await Click("deck-card-0"); await Capture("deck-child"); await Click("modal-back"); }
                await Click("modal-close");
            }
            await Click("knowledge"); await Capture("records-targets");
            if (screen.Controls.ContainsKey("knowledge-group-0"))
            { await Click("knowledge-group-0"); await Capture("records-current"); if (screen.Controls.ContainsKey("knowledge-card-0")) { await Click("knowledge-card-0"); await Capture("records-card-child"); await Click("modal-back"); } await Click("modal-back"); }
            await Click("knowledge-tab-cards"); await Capture("records-cards");
            if (screen.Controls.ContainsKey("knowledge-known-0")) { await Click("knowledge-known-0"); await Capture("known-card-child"); await Click("modal-back"); }
            await Click("modal-close");
            var hand = screen.View.Obj("exploration").Arr("hand").Rows().First();
            var choice = reviewFixture!["choice"] as JsonObject;
            if (choice is not null) hand = screen.View.Obj("exploration").Arr("hand").Rows().Single(r => r.Text("id") == choice.Text("card_id"));
            string id = "card-hand-" + hand.Text("id"); await Click(id); await Capture("hand-detail"); await ButtonStates("window-pin"); await ButtonStates("detail-close"); await ReadAll("detail-body"); await Capture("hand-detail-end"); await CloseDetail();
            if (choice?.Text("target") is { Length: > 0 } target) { await ButtonStates("actor-" + target); await Click("actor-" + target); await Capture("actor-detail"); await CloseDetail(); }
            await Capture("selected"); await ButtonStates("preview"); await ButtonStates("play"); await Click("preview"); await Capture("prediction"); await ReadAll("prediction-body"); await Capture("prediction-end");
            await Click("window-pin"); await Capture("unpinned"); await CloseDetail();
            // 120ms cueと220ms dragは壁時計を記録する。描画待ち時間を固定値の実測と混同しない。
            var start = await Point(id); ulong pressed = Time.GetTicksMsec(); await Mouse(start, true);
            await screen.ToSignal(screen.GetTree().CreateTimer(.125), SceneTreeTimer.SignalName.Timeout); await Capture("hold-cue");
            checks.Add(new { id = "hold-cue-wall-clock", elapsed_ms = Time.GetTicksMsec() - pressed, expected_delay_ms = 120, physical_input = false });
            await screen.ToSignal(screen.GetTree().CreateTimer(.12), SceneTreeTimer.SignalName.Timeout);
            await Move(start, new(960, 570)); await Frame(3); await Capture("drag-field"); await KeyInput(Key.Escape); await Mouse(new(960, 570), false); await Idle();

        }
        Check("all-reading-inputs-preserve-full-dto-file", JsonNode.DeepEquals(dto.State, screen.Session.ExportDto().State) && bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, mode + "-public.json"), screen.View.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }
    private async Task ReproductionEdges()
    {
        var before=screen.Session!.ExportDto();var file=System.IO.File.ReadAllBytes(SavePath);bool vertical=mode=="repro-edges-prep";
        string origin;
        if(vertical){await Click("prepare");await Click("tab-passive");await Click("取得-basic:PS01");origin="item-reserve-pending:basic:PS01";}
        else origin="card-hand-"+screen.View.Obj("exploration").Arr("hand").Rows().First().Text("id");
        await HoldTo(origin,new(960,540),false);
        string id=vertical?"prep-passive-offer":mode=="repro-edges-hand"?"strip-hand":"strip-field";
        var list=(ScrollContainer)screen.Controls[id];
        if(vertical)list.Size=new(list.Size.X,220);else{list.Size=new(400,list.Size.Y);Descendants(list).OfType<HBoxContainer>().First().CustomMinimumSize=new(396,208);}
        if(vertical)list.ScrollVertical=0;else list.ScrollHorizontal=0;await Frame(3);var r=list.GetGlobalRect();int threshold=vertical?22:64;
        var p=vertical?new Vector2(r.Position.X+150,r.End.Y-threshold-1):new Vector2(r.End.X-threshold-1,r.Position.Y+80);
        await Move(new(960,540),p);await screen.ToSignal(screen.GetTree().CreateTimer(.16),SceneTreeTimer.SignalName.Timeout);await Capture("threshold-before");
        Check("edge-before-threshold-still",(vertical?list.ScrollVertical:list.ScrollHorizontal)==0);
        var active=p+(vertical?new Vector2(0,2):new Vector2(2,0));await Move(p,active);ulong began=Time.GetTicksMsec();var trace=new List<object>();
        while(Time.GetTicksMsec()-began<1000){await Frame();trace.Add(new{elapsed_ms=Time.GetTicksMsec()-began,horizontal=list.ScrollHorizontal,vertical=list.ScrollVertical});}
        await Capture("edge-one-second");var value=vertical?list.ScrollVertical:list.ScrollHorizontal;ScrollBar bar=vertical?list.GetVScrollBar():list.GetHScrollBar();
        Check("edge-one-logical-second-moved",value>0,new{threshold,step_per_frame=vertical?7:16,logical_seconds=1,actual_elapsed_ms=Time.GetTicksMsec()-began,maximum=bar.MaxValue-bar.Page,value,trace,acceptance=screen.DragAcceptance()});
        await Move(active,r.End+Vector2.One);await screen.ToSignal(screen.GetTree().CreateTimer(.16),SceneTreeTimer.SignalName.Timeout);await Capture("outside-stops");Check("edge-outside-still",value==(vertical?list.ScrollVertical:list.ScrollHorizontal));
        await KeyInput(Key.Escape);await Mouse(r.End+Vector2.One,false);await Idle();await Capture("canceled");if(vertical)await Click("discard");
        Check("edge-cancel-keeps-full-dto-file",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
    }
    private async Task ReproductionBars()
    {
        bool vertical=mode=="repro-bars-prep";if(vertical){await Click("prepare");await Click("tab-passive");}
        string id=vertical?"prep-passive-offer":mode=="repro-bars-hand"?"strip-hand":"strip-field";
        var list=(ScrollContainer)screen.Controls[id];ScrollBar bar=vertical?list.GetVScrollBar():list.GetHScrollBar();
        var before=screen.Session!.ExportDto();var bytes=System.IO.File.ReadAllBytes(SavePath);var plan=screen.Plan.Copy();
        object Measure()=>new{rect=list.GetGlobalRect().ToString(),bar_rect=bar.GetGlobalRect().ToString(),visible=bar.IsVisibleInTree(),value=bar.Value,maximum=bar.MaxValue,page=bar.Page,
            styles=new[]{"scroll","grabber","grabber_highlight","grabber_pressed"}.Select(k=>new{key=k,color=(bar.GetThemeStylebox(k)as StyleBoxFlat)?.BgColor.ToHtml(),radius=(bar.GetThemeStylebox(k)as StyleBoxFlat)?.CornerRadiusTopLeft})};
        await Frame(3);await Capture("natural");checks.Add(new{id="natural-bar-metrics",data=Measure()});
        // 同じ実ノードの寸法だけを制限する。自然状態の非overflowを成功扱いの代用にしない。
        if(vertical)list.Size=new(list.Size.X,220);else{int width=mode=="repro-bars-field"?400:540;list.Size=new(width,list.Size.Y);Descendants(list).OfType<HBoxContainer>().First().CustomMinimumSize=new(width-4,208);}
        bar.Value=0;await Frame(3);Check("limited-real-node-overflow",bar.IsVisibleInTree()&&bar.MaxValue-bar.Page>0,Measure());
        await Capture("bar-start");var r=bar.GetGlobalRect();float length=(vertical?r.Size.Y:r.Size.X)*(float)(bar.Page/bar.MaxValue);
        var p=vertical?new Vector2(r.GetCenter().X,r.Position.Y+length/2):new Vector2(r.Position.X+length/2,r.GetCenter().Y);
        await Move(new(950,500),p);await Capture("bar-hover");await Mouse(p,true);await Capture("bar-pressed");
        var end=p+(vertical?new Vector2(0,70):new Vector2(90,0));await Move(p,end);await Capture("bar-drag");await Mouse(end,false);await Frame(3);await Capture("bar-released");
        Check("actual-native-thumb-drag",bar.Value>0,Measure());bar.Value=bar.MaxValue-bar.Page;await Frame(3);await Capture("bar-end");checks.Add(new{id="bar-end-metrics",data=Measure()});
        bar.Value=0;await Frame(3);await Capture("bar-restored");
        Check("bar-input-preserves-full-dto-plan-file",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&JsonNode.DeepEquals(plan,screen.Plan)&&bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
    }
    private async Task ReproductionExtra()
    {
        var dto=screen.Session!.ExportDto();var bytes=System.IO.File.ReadAllBytes(SavePath);
        await Capture("entry");CommonPosition(mode);
        if(mode=="repro-component-extra")
        {
            await ButtonStates("knowledge");await Click("menu");await Click("operation");await Capture("operation");
            var select=(OptionButton)screen.Controls["hold-duration"];
            // OptionButtonは製品がPressedを接続しない標準部品。独自Button用の
            // 受信カウンタではなく、同じ実入力と実PopupMenuの可視状態で確認する。
            var point=await Point("hold-duration");screen.GetViewport().PushInput(new InputEventMouseMotion{Position=point,GlobalPosition=point},true);
            await Mouse(point,true);await Mouse(point,false);await Frame(3);
            Check("actual-option-popup-visible",select.GetPopup().Visible);await Capture("hold-select-open");
            await KeyInput(Key.Escape);await KeyInput(Key.Tab);select=(OptionButton)screen.Controls["hold-duration"];select.GrabFocus();
            await KeyInput(Key.Down);await Capture("hold-select-keyboard");await KeyInput(Key.Escape);await CloseDetail();
            await Click("knowledge");await ButtonStates("knowledge-tab-targets");await ButtonStates("knowledge-tab-cards");await CloseDetail();
        }
        else
        {
            await Click("story-detail");await Capture("home-detail");await CloseDetail();await Click("prepare");await Capture("card");await Click("tab-passive");await Capture("passive");
            if(mode=="repro-acquisition-affix")
            {
                var offer=screen.View.Obj("home").Arr("acquisition").Rows().First(r=>r.Obj("blueprint").Arr("affixes").Count>0);
                await Click("item-offer-"+offer.Text("id"));await Capture("affix-closed");
                string key="fold-affix-"+offer.Text("id");Check("N01-public-affix-fold-real-node",screen.Controls.ContainsKey(key));await Click(key);await Capture("affix-expanded");await CloseDetail();
            }
            else if(mode=="repro-acquisition-funded")
            {
                var offers=screen.View.Obj("home").Arr("acquisition").Rows().ToArray();
                var selected=offers.Where(r=>r.Text("id").StartsWith("basic:")).Append(offers.First(r=>!r.Text("id").StartsWith("basic:"))).ToArray();
                foreach(var r in selected){await Click(r.Obj("blueprint").Text("kind")=="passive"?"tab-passive":"tab-card");await Click("取得-"+r.Text("id"));}
                await Capture("all-groups-pending");await Click("review");await Capture("all-groups-confirmation");await ReadAll("dialog-body");await Capture("all-groups-confirmation-end");
                var plan=screen.Plan.Copy();Check("all-groups-valid-plan",screen.Comparison.Flag("ok")&&plan.Arr("acquire").Count==5);
                Check("all-groups-pending-full-dto-file-unchanged",JsonNode.DeepEquals(dto.State,screen.Session.ExportDto().State)&&bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
                await ButtonStates("commit");await Click("commit");VerifyCommand(dto,"commit_preparation",new(){["plan"]=plan});await Capture("all-groups-committed");
                Check("all-groups-committed-empty",screen.View.Obj("home").Arr("acquisition").Count==0&&screen.View.Number("revision")==dto.State.Number("revision")+1);
                return;
            }
            else if(mode=="repro-acquisition-complete")
            { Check("all-groups-actual-public-empty",screen.View.Obj("home").Arr("acquisition").Count==0);await Capture("all-groups-empty"); }
        }
        Check("extra-reading-full-dto-file-unchanged",JsonNode.DeepEquals(dto.State,screen.Session.ExportDto().State)&&bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
    }
    private async Task ReproductionShared()
    {
        var dto = screen.Session!.ExportDto(); var bytes = System.IO.File.ReadAllBytes(SavePath);
        if (mode == "repro-shared-preparation") await Click("prepare");
        await Capture("entry"); CommonPosition(mode);
        foreach (string name in new[] { "settings", "help", "history", "save-data" })
        {
            await Click("menu"); await Capture("menu-" + name); await Click(name); await Capture(name);
            if (name == "settings") { await Click("reduced-motion"); await Capture("reduced-motion"); await Click("reduced-motion"); }
            await Click("modal-close");
        }
        await Click("knowledge"); await Capture("records-targets");
        if (screen.Controls.ContainsKey("knowledge-group-0"))
        {
            await Click("knowledge-group-0"); await Capture("records-observations");
            if (screen.Controls.ContainsKey("knowledge-card-0")) { await Click("knowledge-card-0"); await Capture("records-card-child"); await Click("modal-back"); }
            await Click("modal-back");
        }
        await ButtonStates("knowledge-tab-targets"); await ButtonStates("knowledge-tab-cards");
        await Click("knowledge-tab-cards"); await Capture("records-cards");
        if (screen.Controls.ContainsKey("knowledge-known-0")) { await Click("knowledge-known-0"); await Capture("known-card-child"); await Click("modal-back"); }
        await Click("modal-close");
        Check("shared-navigation-preserves-full-dto-file", JsonNode.DeepEquals(dto.State, screen.Session.ExportDto().State) && bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, mode + "-public.json"), screen.View.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }
    private async Task ButtonStates(string id)
    {
        var b = (Button)screen.Controls[id];
        if (b.Disabled) { await Capture(id + "-disabled"); Check("actual-disabled-" + id, b.GetDrawMode() == BaseButton.DrawMode.Disabled); return; }
        var point = await Point(id);
        screen.GetViewport().PushInput(new InputEventMouseMotion { Position = new(950, 500), GlobalPosition = new(950, 500) }, true); await Frame(2); await Capture(id + "-normal");
        screen.GetViewport().PushInput(new InputEventMouseMotion { Position = point, GlobalPosition = point }, true); await Frame(2); await Capture(id + "-hover");
        // hover予測が開くと通常Renderが実Buttonを作り直す。保存した旧参照を
        // 生きた入力先と見なさず、keyboard移動の後にもControlsから取り直す。
        await KeyInput(Key.Tab); b = (Button)screen.Controls[id]; b.GrabFocus(); await Capture(id + "-focus");
        await Mouse(point, true); await Capture(id + "-pressed");
        // 外側で解放する取消を実入力で行う。押下画像のために通常操作を確定しない。
        await Move(point, new(950, 500)); await Mouse(new(950, 500), false);
        if (screen.Controls.GetValueOrDefault(id) is Button current) current.ReleaseFocus(); await Idle();
    }
    private async Task ReproductionMotion()
    {
        var initial = screen.Session!.ExportDto(); var initialBytes = System.IO.File.ReadAllBytes(SavePath);
        var sequence = new List<object>();
        var rawFrames = new List<(Image image, string filename, string nodes)>();
        async Task Sample(string label, ulong start)
        {
            // PNG圧縮中はmain threadが進まない。保持の120〜220msを圧縮時間で
            // 延ばさないよう、実FramePostDrawの画像を先に保持し、操作後に保存する。
            await screen.ToSignal(RenderingServer.Singleton, RenderingServer.SignalName.FramePostDraw);
            ulong at = Time.GetTicksMsec(); var state = screen.MotionEvidence();
            string filename = mode + "-" + label;
            var image = screen.GetViewport().GetTexture().GetImage();
            rawFrames.Add((image, filename, JsonSerializer.Serialize(new { at_ms = at, revision = screen.View.Number("revision"), screen = screen.Screen, modal = screen.Modal, nodes = Geometry() }, new JsonSerializerOptions { WriteIndented = true })));
            sequence.Add(new { frame = filename + ".png", elapsed_ms = at - start, state });
        }
        async Task Reduced(bool on)
        {
            await Click("menu"); await Click("settings");
            if (((CheckBox)screen.Controls["reduced-motion"]).ButtonPressed != on) await Click("reduced-motion");
            await CloseDetail();
        }
        if (mode == "repro-motion-home")
        {
            foreach (bool reduced in new[] { false, true })
            {
                await Reduced(reduced); await Click("prepare"); await Click("tab-passive");
                ulong start = Time.GetTicksMsec(); await Click("取得-basic:PS01", false);
                for (int i = 0; i < 8; i++) await Sample((reduced ? "reduced" : "normal") + "-move-" + i, start);
                await Click("discard"); await Click("home");
            }
            Check("motion-plan-only-no-dto-file", JsonNode.DeepEquals(initial.State, screen.Session.ExportDto().State) && initialBytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        }
        else
        {
            // 120msより短い押下を実画像に残す。選択・詳細を開く短クリックは
            // ホールド表示もplayも起こさず、同じ保存を保つ。
            var shortHand = screen.View.Obj("exploration").Arr("hand").Rows().First();
            var shortPoint = await Point("card-hand-" + shortHand.Text("id")); ulong shortStart = Time.GetTicksMsec();
            await Mouse(shortPoint, true); await Sample("short-press", shortStart); await Mouse(shortPoint, false); await Sample("short-release", shortStart); await CloseDetail();
            Check("short-click-no-cue-no-save", !screen.Controls["hold-cue"].IsVisibleInTree() && JsonNode.DeepEquals(initial.State, screen.Session.ExportDto().State) && initialBytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
            foreach (bool reduced in new[] { false, true })
            {
                await Reduced(reduced);
                var choice = screen.View.Obj("exploration").Arr("legal_actions").Rows().First(); string id = "card-hand-" + choice.Text("card_id");
                await Click(id); await CloseDetail(); var point = await Point(id); ulong start = Time.GetTicksMsec(); await Mouse(point, true);
                for (int i = 0; i < 12; i++) await Sample((reduced ? "reduced" : "normal") + "-hold-" + i, start);
                await screen.ToSignal(screen.GetTree().CreateTimer(.05), SceneTreeTimer.SignalName.Timeout);
                await Move(point, new(960, 570)); await Sample((reduced ? "reduced" : "normal") + "-drag", start);
                await KeyInput(Key.Escape); await Mouse(new(960, 570), false); await Idle(); await Sample((reduced ? "reduced" : "normal") + "-cancel", start);
                Check("hold-cancel-no-save-" + reduced, JsonNode.DeepEquals(initial.State, screen.Session.ExportDto().State) && initialBytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
            }
            // 各モードで一度だけ合法playを実行し、新しく確定した公開イベントを追う。
            // 初期保存を描画用に書換えたり、過去履歴の再演をイベント証拠にしない。
            foreach (bool reduced in new[] { false, true })
            {
                await Reduced(reduced); var before = screen.Session.ExportDto();
                var choice = screen.View.Obj("exploration").Arr("legal_actions").Rows().First();
                await Click("card-hand-" + choice.Text("card_id")); await CloseDetail();
                if (choice.Text("target") != "") { await Click("actor-" + choice.Text("target")); await CloseDetail(); }
                ulong start = Time.GetTicksMsec(); await Click("play", false);
                while (Time.GetTicksMsec() - start < 3200)
                { await Sample((reduced ? "reduced" : "normal") + "-event-" + sequence.Count, start); await screen.ToSignal(screen.GetTree().CreateTimer(.08), SceneTreeTimer.SignalName.Timeout); }
                await Idle(); VerifyCommand(before, "play", new() { ["choice"] = choice.Copy() });
                await Capture((reduced ? "reduced" : "normal") + "-event-ended");
            }
        }
        foreach (var frame in rawFrames)
        {
            if (frame.image.SavePng(System.IO.Path.Combine(output, frame.filename + ".png")) != Error.Ok) throw new IOException("Motion screenshot failed");
            System.IO.File.WriteAllText(System.IO.Path.Combine(output, frame.filename + ".nodes.json"), frame.nodes);
            frame.image.Dispose();
        }
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, mode + "-sequence.json"), JsonSerializer.Serialize(new { physical_input = false, frames_are_actual = true, no_interpolation = true, timing = "壁時計と実FramePostDraw。PNG圧縮は入力列の終了後", sequence }, new JsonSerializerOptions { WriteIndented = true }));
    }
    private static object FontEnvironment()
    {
        var names = new[] { ("Yu Gothic UI", 400), ("Yu Gothic UI", 600), ("Georgia", 400) };
        return new
        {
            os = System.Environment.OSVersion.ToString(),
            renderer = RenderingServer.GetRenderingDevice() is null ? "compatibility" : "rendering-device",
            system_lookup = names.Select(n => { string path = OS.GetSystemFontPath(n.Item1, n.Item2); return new { name = n.Item1, weight = n.Item2, path, sha256 = System.IO.File.Exists(path) ? Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.IO.File.ReadAllBytes(path))).ToLowerInvariant() : null }; }).ToArray(),
            fallback_sha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.IO.File.ReadAllBytes(ProjectSettings.GlobalizePath("res://Assets/NotoSansJP.ttf")))).ToLowerInvariant(),
            scope = "現環境のOS family検索と実Labelのfont名。旧撮影環境・文字別fallbackの断定ではない"
        };
    }
    private object Geometry()
    {
        var rows = new List<object>();
        void Read(Node node, string path)
        {
            if (node is Control c)
            {
                var r = c.GetGlobalRect(); var label = c as Label; var button = c as BaseButton; var scroll = c as ScrollContainer;
                var ids = screen.Controls.Where(p => ReferenceEquals(p.Value, c)).Select(p => p.Key).ToArray();
                rows.Add(new
                {
                    path,
                    kind = c.GetClass(),
                    ids,
                    rect = new[] { r.Position.X, r.Position.Y, r.Size.X, r.Size.Y },
                    visible = c.IsVisibleInTree(),
                    focus = c.HasFocus(),
                    mouse = c.MouseFilter.ToString(),
                    opacity = c.Modulate.A,
                    text = label?.Text ?? (c as Button)?.Text,
                    tooltip = c.TooltipText,
                    font = label?.GetThemeFont("font").GetFontName() ?? (c as Button)?.GetThemeFont("font").GetFontName(),
                    font_size = label?.GetThemeFontSize("font_size") ?? (c as Button)?.GetThemeFontSize("font_size"),
                    line_spacing = label?.GetThemeConstant("line_spacing"),
                    color = label?.GetThemeColor("font_color").ToHtml(),
                    disabled = button?.Disabled,
                    pressed = button?.ButtonPressed,
                    draw_mode = button?.GetDrawMode().ToString(),
                    icon = c.HasMeta("accepted_icon") ? c.GetMeta("accepted_icon").AsString() : null,
                    horizontal = scroll is null ? null : new[] { scroll.ScrollHorizontal, (float)scroll.GetHScrollBar().MaxValue, (float)scroll.GetHScrollBar().Page, scroll.GetHScrollBar().Size.Y },
                    vertical = scroll is null ? null : new[] { scroll.ScrollVertical, (float)scroll.GetVScrollBar().MaxValue, (float)scroll.GetVScrollBar().Page, scroll.GetVScrollBar().Size.X }
                });
            }
            int i = 0; foreach (var child in node.GetChildren()) Read(child, path + "/" + i++);
        }
        Read(screen, "Main/GameScreen"); return rows;
    }
}
