using Godot;
using System.Text.Json.Nodes;
using Crossweave.Core;

namespace Crossweave.Application;

/// <summary>
/// 探索の公開viewを実Controlへ並べる。_InputはGodotの全体入力、札の_GuiInputはGUI内の入力。
/// PointerGestureは本作共通のC#判定器で、保持時間の意味はGodot標準機能ではない。
/// 予測・対象・ドラッグは画面だけの状態で、Coreへplayを送るまで乱数も保存も進めない。
/// </summary>
public partial class GameScreen
{
    private readonly Dictionary<string, JsonObject> cardRows = new();
    private readonly List<(Label label, ScrollContainer reader, string id)> visibleParagraphs = [];
    private readonly HashSet<string> displayedTexts = new(StringComparer.Ordinal);
    private InteractionCanvas? canvas;

    private void ExplorationScreen()
    {
        var e = View.Obj("exploration");
        Text(content, "夜潮の排水路", new(24, 12, 700, 62), 31);
        Button(content, "history", "本文", new(1190, 18, 170, 52), () => Modal = "history");
        Button(content, "knowledge", "記録", new(1378, 18, 120, 52), () => Modal = "knowledge");
        Button(content, "deck", "札組", new(1510, 18, 140, 52), () => Modal = "deck");
        var actors = e.Obj("actors").Where(x => x.Value.Flag("active")).ToArray();
        int idx = 0; float startX = Math.Max(24, (1920 - actors.Length * 344 + 24) / 2f);
        foreach (var (id, node) in actors)
        {
            var row = (JsonObject)node!; var x = startX + idx++ * 344;
            var b = Button(content, "actor-" + id, "", new(x, 104, 320, 224), () =>
            {
                selectedTarget = id; RefreshAction(); ShowDetail(row, "actor", new(x + 160, 104));
            }, !Blocked);
            if (row.Text("display_name") == "漂着した潜水服")
            {
                var art = new TextureRect { Texture = GD.Load<Texture2D>("res://Assets/Application/diver-placeholder.webp"), Position = new(30, -8), Size = new(260, 176),
                    ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize, StretchMode = TextureRect.StretchModeEnum.KeepAspectCentered, MouseFilter = MouseFilterEnum.Ignore, Modulate = new Color(1, 1, 1, .85f) }; b.AddChild(art);
            }
            Text(b, row.Text("display_name"), new(12, 12, 296, 48), 24, Gold);
            Text(b, row.Text("role") == "V" ? "◇" : row.Text("role") == "P" ? "◈" : "", new(30, 72, 260, 65), 42, Muted);
            var band = Panel(b, new(6, 143, 308, 76), "14272fec");
            Text(band, $"{row.Text("remaining_label")} {row.Number("hp")} / {row.Number("max_hp")}\n体勢 {row.Number("posture_remaining")}　身構 {row.Obj("defense").Number("guard")}", new(10, 3, 288, 70), 20);
        }
        var reservations = e.Arr("reservations").Rows().Select(r => e.Obj("actors").Obj(r.Text("actor_id")).Text("display_name") + " " + r.Number("at"));
        Text(content, "行動順　" + string.Join("  ›  ", reservations), new(26, 338, 1860, 43), 21, Muted);
        Text(content, "場", new(24, 382, 200, 42), 26, Gold);
        Text(content, $"共通回収 {e.Number("pool_count")}枚", new(1450, 382, 440, 42), 22, Muted);
        var field = e.Obj("field").Select(x => (JsonObject)x.Value!).ToList();
        if (actionPreview.Flag("ok"))
        {
            foreach (var next in actionPreview.Obj("field_after").Select(x => (JsonObject)x.Value!))
                if (!field.Any(r => r.Text("id") == next.Text("id"))) { var forecast = next.Copy(); forecast["forecast"] = true; field.Add(forecast); }
        }
        CardStrip("field", field, new(24, 428, 1872, 224));
        Text(content, "手札", new(24, 674, 280, 44), 26, Gold);
        Text(content, "選択：詳細と予測　·　220ms保持して場へドラッグ　·　横スワイプ：一覧を送る", new(330, 678, 1550, 38), 20, Muted);
        CardStrip("hand", e.Arr("hand").Rows(), new(24, 728, 1872, 224));
        dropZones.Add((new(24, 428, 1872, 224), "field"));
        Button(content, "withdraw", "撤退", new(24, 966, 230, 52), () => Modal = "withdraw", Can("withdraw"));
        Button(content, "preview", "行動予測", new(580, 966, 270, 52), () => { detailKey = ""; Modal = "prediction"; }, actionPreview.Flag("ok"));
        var choice = Choice();
        string action = actionPreview.Text("mode") switch { "place" => "場に置く", "guard" => "身構える", "heal" => "回復する", _ => "行動する" };
        Button(content, "play", action, new(878, 966, 520, 52), () => { if (Choice() is { } c) Send("play", new() { ["choice"] = c.Copy() }); }, choice is not null && Can("play"));
        Text(content, "手札 " + e.Arr("hand").Count + "枚　山札 " + e.Obj("self").Number("deck_count") + "枚", new(1475, 970, 421, 43), 21, Muted);
        if (View.Obj("story").Obj("scene").Flag("paused")) SceneReader();
    }

    private string PredictionText()
    {
        if (!actionPreview.Flag("ok")) return "行動を選ぶと予測が表示されます。";
        var actors = View.Obj("exploration").Obj("actors");
        return "行動：" + (actionPreview.Text("mode") == "place" ? "場に置く" : "属性一致")
            + "\n\n対象の変化\n" + string.Join("\n", actionPreview.Arr("actor_changes").Rows().Select(r => actors.Obj(r.Text("actor_id")).Text("display_name") + "　" + "残量 " + r.Obj("before").Number("hp") + " → " + r.Obj("after").Number("hp") + "　体勢 " + r.Obj("before").Number("posture_remaining") + " → " + r.Obj("after").Number("posture_remaining") + "　身構 " + r.Obj("before").Obj("defense").Number("guard") + " → " + r.Obj("after").Obj("defense").Number("guard")))
            + "\n\n行動後の場\n" + string.Join("、", actionPreview.Obj("field_after").Select(p => CardName((System.Text.Json.Nodes.JsonObject)p.Value!)))
            + "\n\n行動後の順序\n" + string.Join(" → ", actionPreview.Arr("current_reservations_after").Rows().Select(r => actors.Obj(r.Text("actor_id")).Text("display_name") + " " + r.Number("at")));
    }

    private static string ActorText(JsonObject row) => $"{row.Text("remaining_label")} {row.Number("hp")} / {row.Number("max_hp")}\n体勢 {row.Number("posture_remaining")}\n身構 {row.Obj("defense").Number("guard")}　攪乱 {row.Obj("defense").Number("evasion")}\n一閃 {row.Number("crit")}\n次の行動時刻 {row.Number("next_at")}\n公開された手札枚数 {row.Number("hand_count")}\n山札枚数 {row.Number("deck_count")}";

    private JsonObject? Choice()
    {
        var choices = View.Obj("exploration").Arr("legal_actions").Rows().Where(c => c.Text("card_id") == selectedCard).ToArray();
        return choices.FirstOrDefault(c => c.Text("target") == selectedTarget) ?? (selectedTarget == "" ? choices.FirstOrDefault() : null);
    }
    private void RefreshAction()
    {
        actionPreview = new();
        if (Session is not null && Can("preview_action") && Choice() is { } choice)
            actionPreview = Session.PreviewAction(View.Number("revision"), View.Text("view_token"), choice.Copy());
    }
    private void CardStrip(string zone, IEnumerable<JsonObject> rows, Rect2 rect)
    {
        var scroll = Scroll(content, "strip-" + zone, rect, true);
        var line = new HBoxContainer(); line.AddThemeConstantOverride("separation", 16); scroll.AddChild(line);
        foreach (var row in rows)
        {
            var kind = row.Flag("forecast") ? "forecast" : zone;
            var cell = new Control { CustomMinimumSize = new(248, 208), MouseFilter = MouseFilterEnum.Ignore }; line.AddChild(cell);
            MakeTile(cell, "card-" + kind + "-" + row.Text("id"), row, new(0, 0, 248, 208), kind);
        }
    }
    private CardTile MakeTile(Control parent, string id, JsonObject row, Rect2 rect, string zone)
    {
        var tile = new CardTile { Position = rect.Position, Size = rect.Size, Screen = this, Row = row.Copy(), Zone = zone, FocusMode = FocusModeEnum.All, MouseFilter = MouseFilterEnum.Stop };
        parent.AddChild(tile); Controls[id] = tile; cardRows[id] = row;
        bool compact = rect.Size.Y < 100; var d = row["details"] as JsonObject ?? row;
        Text(tile, (row.Flag("forecast") ? "＋ 予測　" : "") + CardName(row) + (row.Number("display_quantity") > 1 ? " ×" + row.Number("display_quantity") : ""), new(10, 7, rect.Size.X - 20, compact ? 43 : 57), compact ? 19 : 22, row.Flag("pending") ? Gold : Ink);
        string info = d["trigger"] is not null ? $"心得　枠 {d.Number("equipment_cost")}" : $"{d.Text("attr")}　◆ {d.Number("power")}　◎ {d.Number("hit")}";
        if (compact)
        {
            if (zone == "offer") info = "着想 " + ViewData.Money(row.Number("price_units"));
            if (row.Flag("pending")) info += "　未払い";
            Text(tile, info, new(10, 51, rect.Size.X - 20, 26), 16, Muted);
        }
        else
        {
            Text(tile, d.Text("kind") switch { "guard" => "身構", "heal" => "回復", "defense_support" => "全員への支援", _ => "突破・探査" }, new(12, 70, 222, 36), 22, Muted);
            Text(tile, info, new(12, 109, 222, 40), 27, Gold);
            Text(tile, $"場 ◆ {d.Number("field_power")} ◎ {d.Number("field_hit")}\n期限 {d.Text("remaining")}　間隔 {d.Number("place_cost")} / {d.Number("match_cost")}", new(12, 155, 222, 48), 17, Muted);
        }
        return tile;
    }

    internal void PointerDown(CardTile tile, Vector2 location)
    {
        if (Busy || Blocked || (Modal != "" && Modal != "detail" && Modal != "prediction") || View.Obj("story").Obj("scene").Flag("paused")) return;
        gestureRow = tile.Row.Copy(); gestureZone = tile.Zone; pointer = location; gestureStarted = Time.GetTicksMsec();
        gesture.Begin(tile.Row.Text("id"), location.X, location.Y, gestureStarted); tile.GrabFocus();
    }

    public override void _Input(InputEvent input)
    {
        if (input is InputEventKey key && key.Pressed && key.Keycode == Key.Escape)
        { gesture.Cancel(); if (!Blocked) Modal = ""; renderNeeded = true; GetViewport().SetInputAsHandled(); return; }
        if (input is InputEventKey full && full.Pressed && full.Keycode == Key.F11)
        { DisplayServer.WindowSetMode(DisplayServer.WindowGetMode() == DisplayServer.WindowMode.Fullscreen ? DisplayServer.WindowMode.Windowed : DisplayServer.WindowMode.Fullscreen); gesture.Cancel(); return; }
        if (input is InputEventMouseButton right && right.Pressed && right.ButtonIndex == MouseButton.Right)
        { gesture.Cancel(); if (!Blocked) Modal = ""; renderNeeded = true; GetViewport().SetInputAsHandled(); return; }
        if (input is InputEventMouseButton outside && outside.Pressed && Modal is "detail" or "prediction" && Controls.TryGetValue("detail-panel", out var panel) && !panel.GetGlobalRect().HasPoint(outside.Position))
        { Modal = ""; renderNeeded = true; } // 外クリックは窓を閉じ、隣の札の入力はそのまま通す。
        if (gesture.Mode == GestureMode.Idle) return;
        if (input is InputEventMouseMotion move)
        {
            var previous = gesture.X; pointer = move.Position; gesture.Move(pointer.X, pointer.Y, Time.GetTicksMsec());
            if (gesture.Mode == GestureMode.Swiping && GestureScroll() is { } scroll)
            { if (Screen == "preparation") scroll.ScrollVertical -= (int)move.Relative.Y; else scroll.ScrollHorizontal -= (int)(gesture.X - previous); }
        }
        if (input is InputEventMouseButton release && !release.Pressed && release.ButtonIndex == MouseButton.Left)
        {
            pointer = release.Position; var zone = dropZones.LastOrDefault(z => z.rect.HasPoint(pointer)).zone ?? "";
            var end = gesture.End(zone.Length > 0, Time.GetTicksMsec());
            if (end == GestureEnd.Tap) TapCard(gestureRow, gestureZone, pointer);
            if (end == GestureEnd.Drop) DropCard(gestureRow, gestureZone, zone);
            renderNeeded = true; GetViewport().SetInputAsHandled();
        }
    }
    private ScrollContainer? GestureScroll() => Controls.GetValueOrDefault(Screen == "preparation" ? "prep-" + gestureZone : "strip-" + gestureZone) as ScrollContainer;
    private void AutoScroll()
    {
        if (gesture.Mode != GestureMode.Dragging || GestureScroll() is not { } scroll) return;
        var r = scroll.GetGlobalRect();
        if (Screen == "preparation") { if (pointer.Y > r.End.Y - 24) scroll.ScrollVertical += 9; if (pointer.Y < r.Position.Y + 24) scroll.ScrollVertical -= 9; }
        else { if (pointer.X > r.End.X - 50) scroll.ScrollHorizontal += 10; if (pointer.X < r.Position.X + 50) scroll.ScrollHorizontal -= 10; }
    }
    private void TapCard(JsonObject row, string zone, Vector2 point)
    {
        if (zone == "hand") { selectedCard = row.Text("id"); selectedTarget = ""; RefreshAction(); }
        ShowDetail(row, zone, point);
    }
    private void DropCard(JsonObject row, string from, string to)
    {
        Modal = "";
        if (from == "hand" && to == "field")
        {
            selectedCard = row.Text("id"); RefreshAction();
            // 目標を複数持つ札は先に選んだ相手を使う。未選択なら合法候補の先頭を予測表示し、確定ボタンで確認する。
            var legal = View.Obj("exploration").Arr("legal_actions").Rows().Where(c => c.Text("card_id") == selectedCard).ToArray();
            if ((selectedTarget != "" || legal.Length == 1) && Choice() is { } choice) Send("play", new() { ["choice"] = choice.Copy() });
            else Message = "対象を選び、予測を確認して「行動する」を押してください。";
        }
        else if (from == "offer" && to is "reserve" or "build")
        {
            Stage(row);
            if (to == "build") { var pending = ProjectedOwned().First(r => r.Text("id") == row.Text("pending_selection_id")); Compose(pending, true); }
        }
        else if (from is "reserve" or "build" && to is "reserve" or "build") Compose(row, to == "build");
        else if (row.Flag("pending") && to == "offer") Unstage(row);
    }

    private void SceneReader()
    {
        var shade = new ColorRect { Color = new Color(0, 0, 0, .7f), Size = new(1920, 1080), MouseFilter = MouseFilterEnum.Stop }; content.AddChild(shade);
        var p = Panel(content, new(476, 280, 968, 550), "13272df5"); p.MouseFilter = MouseFilterEnum.Stop;
        StoryReader(p, "scene-reader", new(44, 28, 880, 380), false);
        Button(p, "story-detail", "詳細", new(44, 444, 210, 62), () => Modal = "story-detail");
        Button(p, "withdraw", "撤退", new(282, 444, 240, 62), () => Modal = "withdraw", Can("withdraw"));
        Button(p, "continue", "続きを読む", new(590, 444, 330, 62), () => ContinueStory(true), Can("continue_scene"));
    }
    private void StoryReader(Control parent, string id, Rect2 rect, bool optional)
    {
        var scroll = Scroll(parent, id, rect, false); var list = new VBoxContainer { SizeFlagsHorizontal = SizeFlags.ExpandFill }; list.AddThemeConstantOverride("separation", 22); scroll.AddChild(list);
        foreach (var row in View.Obj("story").Arr("texts").Rows().Where(t => optional ? t.Text("kind") == "detail" : t.Text("kind") != "detail"))
        {
            var label = new Label { Text = row.Text("short_text"), CustomMinimumSize = new(rect.Size.X - 30, 0), AutowrapMode = TextServer.AutowrapMode.WordSmart, MouseFilter = MouseFilterEnum.Ignore };
            label.AddThemeFontSizeOverride("font_size", 26); list.AddChild(label); visibleParagraphs.Add((label, scroll, row.Text("id")));
        }
    }
    private void RecordVisibleParagraphs()
    {
        foreach (var (label, reader, id) in visibleParagraphs)
            if (IsInstanceValid(label) && label.IsVisibleInTree())
            {
                var a = label.GetGlobalRect(); var b = reader.GetGlobalRect();
                if (a.Size.Y > 0 && a.End.Y <= b.End.Y + 1 && a.End.Y > b.Position.Y) displayedTexts.Add(id);
            }
    }

    internal void PaintInteraction(Control surface)
    {
        void Arrow(Vector2 from, Vector2 to)
        {
            var direction = (to - from).Normalized(); to -= direction * 14;
            surface.DrawLine(from, to, Gold, 4, true); surface.DrawLine(to, to - direction.Rotated(.5f) * 20, Gold, 4, true); surface.DrawLine(to, to - direction.Rotated(-.5f) * 20, Gold, 4, true);
        }
        if (selectedCard != "" && Controls.TryGetValue("card-hand-" + selectedCard, out var hand) && Choice() is { } choice)
        {
            var target = Controls.GetValueOrDefault("actor-" + choice.Text("target"));
            var matching = View.Obj("exploration").Obj("field").FirstOrDefault(p => p.Key == View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(c => c.Text("id") == selectedCard)?.Text("attr")).Value;
            var fieldControl = matching is null ? null : Controls.GetValueOrDefault("card-field-" + matching.Text("id"));
            Arrow(hand.GetGlobalRect().GetCenter(), fieldControl?.GetGlobalRect().GetCenter() ?? new Vector2(960, 520));
            if (target is not null) Arrow(fieldControl?.GetGlobalRect().GetCenter() ?? new Vector2(960, 520), target.GetGlobalRect().GetCenter());
        }
        if (gesture.Mode == GestureMode.Dragging)
        {
            var size = Screen == "preparation" ? new Vector2(352, 80) : new Vector2(248, 208);
            surface.DrawStyleBox(Box("243e48dd", "dbc18a", 2), new Rect2(pointer - size / 2, size));
            surface.DrawString(font, pointer - size / 2 + new Vector2(12, 35), CardName(gestureRow), fontSize: 23, modulate: Ink);
        }
        else if (gesture.Mode == GestureMode.Pending && Time.GetTicksMsec() - gestureStarted >= 120)
            surface.DrawArc(pointer, 23, -.5f * Mathf.Pi, (float)((Time.GetTicksMsec() - gestureStarted) / 220 * 2 * Math.PI) - .5f * Mathf.Pi, 32, Gold, 4, true);
    }
}

/// <summary>Control標準のGuiInputを受ける札。ゲーム状態は持たず、公開行と入力意図だけを親へ返す。</summary>
internal partial class CardTile : Control
{
    internal GameScreen Screen = null!;
    internal JsonObject Row = new();
    internal string Zone = "";
    public override void _Draw()
    {
        DrawRect(new(Vector2.Zero, Size), new Color("203943ef"));
        DrawRect(new(Vector2.Zero, Size), new Color(Row.Flag("pending") || Row.Flag("forecast") ? "dbc18a" : "729594"), false, 2);
    }
    public override void _GuiInput(InputEvent input)
    {
        if (input is InputEventMouseButton mouse && mouse.Pressed && mouse.ButtonIndex == MouseButton.Left)
        { Screen.PointerDown(this, GetGlobalRect().Position + mouse.Position); AcceptEvent(); }
    }
}

/// <summary>関係線とドラッグ像の描画専用Control。MouseFilter.Ignoreで下の実入力ノードを遮らない。</summary>
internal partial class InteractionCanvas : Control
{
    internal GameScreen Screen = null!;
    public override void _Draw() => Screen.PaintInteraction(this);
}
