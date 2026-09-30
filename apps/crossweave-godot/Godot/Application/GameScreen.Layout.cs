using Crossweave.Infrastructure.Application;
using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

// 描画はこのpartialとPreparation/Explorationへ分ける。partialはC#のファイル分割機能で、別sessionを作るものではない。
public partial class GameScreen
{
    private static readonly Color Ink = new("eee7d5"), Muted = new("b8c9c5"), Gold = new("dbc18a");
    private static StyleBoxFlat Box(string color, string border = "567477", int width = 1) => new()
    {
        BgColor = new Color(color), BorderColor = new Color(border), BorderWidthBottom = width, BorderWidthTop = width,
        BorderWidthLeft = width, BorderWidthRight = width, CornerRadiusTopLeft = 6, CornerRadiusTopRight = 6,
        CornerRadiusBottomLeft = 6, CornerRadiusBottomRight = 6, ContentMarginLeft = 12, ContentMarginRight = 12
    };
    private void BuildTheme()
    {
        Theme = new Theme { DefaultFont = font, DefaultFontSize = 23 };
        Theme.SetStylebox("normal", "Button", Box("203b40")); Theme.SetStylebox("hover", "Button", Box("34545a", "dbc18a"));
        Theme.SetStylebox("pressed", "Button", Box("50676b", "dbc18a", 2)); Theme.SetStylebox("focus", "Button", Box("203b40", "dbc18a", 2));
        Theme.SetStylebox("disabled", "Button", Box("203035", "455556"));
        Theme.SetColor("font_color", "Button", Ink); Theme.SetColor("font_disabled_color", "Button", new Color("88948e"));
        Theme.SetColor("font_color", "Label", Ink);
    }

    private Label Text(Control parent, string value, Rect2 rect, int size = 24, Color? color = null)
    {
        var label = new Label { Text = value, Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore,
            AutowrapMode = TextServer.AutowrapMode.WordSmart, ClipText = true };
        label.AddThemeFontSizeOverride("font_size", size); label.AddThemeColorOverride("font_color", color ?? Ink); parent.AddChild(label); return label;
    }
    private Panel Panel(Control parent, Rect2 rect, string color = "15272dea")
    {
        var p = new Panel { Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore };
        p.AddThemeStyleboxOverride("panel", Box(color)); parent.AddChild(p); return p;
    }
    private Button Button(Control parent, string id, string value, Rect2 rect, Action action, bool enabled = true)
    {
        var button = new Button { Text = value, Position = rect.Position, Size = rect.Size, Disabled = !enabled || (Busy && id != "exit"),
            FocusMode = FocusModeEnum.All, MouseDefaultCursorShape = CursorShape.PointingHand, ClipText = true, TooltipText = value };
        parent.AddChild(button); Controls[id] = button;
        // PressedはGodot標準のsignal。ラムダはUIの意図を本作の操作へ渡すだけで、ゲーム計算を行わない。
        button.Pressed += () => { if (Automation is not null) GD.Print("UI PRESS " + id + " busy=" + Busy); if ((!Busy || id == "exit") && !button.Disabled) { action(); renderNeeded = true; } };
        return button;
    }
    private ScrollContainer Scroll(Control parent, string id, Rect2 rect, bool horizontal)
    {
        var s = new ScrollContainer { Position = rect.Position, Size = rect.Size,
            HorizontalScrollMode = horizontal ? ScrollContainer.ScrollMode.Auto : ScrollContainer.ScrollMode.Disabled,
            VerticalScrollMode = horizontal ? ScrollContainer.ScrollMode.Disabled : ScrollContainer.ScrollMode.Auto };
        parent.AddChild(s); Controls[id] = s;
        if (scrollPositions.TryGetValue(id, out var position)) { if (horizontal) s.SetDeferred("scroll_horizontal", position); else s.SetDeferred("scroll_vertical", position); }
        return s;
    }
    private void LongText(Control parent, string id, string value, Rect2 rect, int fontSize = 24)
    {
        var s = Scroll(parent, id, rect, false);
        var label = new Label { Text = value, CustomMinimumSize = new(rect.Size.X - 28, 0), SizeFlagsHorizontal = SizeFlags.ExpandFill,
            AutowrapMode = TextServer.AutowrapMode.WordSmart, MouseFilter = MouseFilterEnum.Ignore };
        label.AddThemeFontSizeOverride("font_size", fontSize); s.AddChild(label);
    }

    private void Render()
    {
        // Renderは本作の通常メソッド（Godot標準の描画callbackは_Draw）。
        // 一つの公開viewから表示を一括再生成し、古いButtonに新しいtokenだけを渡さない。
        // QueueFreeはフレーム末の解放なので、先にRemoveChildで入力対象から外す。
        foreach (var (id, control) in Controls) if (control is ScrollContainer scroll)
            scrollPositions[id] = scroll.HorizontalScrollMode == ScrollContainer.ScrollMode.Auto ? scroll.ScrollHorizontal : scroll.ScrollVertical;
        foreach (var child in GetChildren()) { RemoveChild(child); child.QueueFree(); }
        Controls.Clear(); dropZones.Clear(); cardRows.Clear(); visibleParagraphs.Clear();
        content = new Control { MouseFilter = MouseFilterEnum.Ignore }; content.SetAnchorsAndOffsetsPreset(LayoutPreset.FullRect); AddChild(content);
        var background = new TextureRect { Texture = GD.Load<Texture2D>(Screen is "exploring" or "return" ? "res://Assets/Application/night-tide.webp" : "res://Assets/Application/antique-shop.webp"),
            Size = new(1920, 1080), ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize, StretchMode = TextureRect.StretchModeEnum.KeepAspectCovered,
            MouseFilter = MouseFilterEnum.Ignore, Modulate = new Color(.55f, .63f, .62f) };
        content.AddChild(background);
        if (Screen == "start") StartScreen();
        else if (Screen == "preparation") PreparationScreen();
        else if (Screen == "home") HomeScreen();
        else if (Screen == "return") ReturnScreen();
        else ExplorationScreen();
        // 共通操作帯を全体スクロールの外へ固定する。
        Button(content, "exit", Screen == "exploring" ? "中断して終了" : "終了", new(1668, 16, 228, 52), AskClose);
        if (Busy) Text(content, "保存・読込み中…", new(1380, 18, 280, 52), 23, Gold);
        if (Message.Length > 0) Text(content, Message, new(28, 1020, 1570, 48), 19, Gold);
        canvas = new InteractionCanvas { Screen = this, MouseFilter = MouseFilterEnum.Ignore, Size = new(1920, 1080) }; AddChild(canvas);
        popup = new Control { MouseFilter = MouseFilterEnum.Ignore }; popup.SetAnchorsAndOffsetsPreset(LayoutPreset.FullRect); AddChild(popup);
        RenderModal(); QueueRedraw();
    }

    private void StartScreen()
    {
        Text(content, "crossweave", new(128, 130, 1100, 110), 72);
        Text(content, "夜潮の排水路", new(136, 266, 1000, 64), 34, Gold);
        LongText(content, "start-message", Message, new(140, 360, 1050, 200), 29);
        bool empty = diagnosis?.Primary.Code == "missing" && diagnosis.Backup.Code == "missing" && diagnosis.PendingFiles.Length == 0;
        Button(content, "new", "新しく始める", new(140, 630, 360, 72), () => Open(create: true), empty);
        Button(content, "open", "続きから", new(530, 630, 360, 72), () => Open(), diagnosis?.Primary.Code == "ready");
        Button(content, "diagnose", "もう一度確認", new(140, 730, 360, 60), Diagnose);
        bool recover = diagnosis?.Backup.Code == "ready" && diagnosis.Primary.Code != "ready" && !diagnosis.Primary.Code.StartsWith("unsupported_");
        if (recover) Button(content, "recover", "直前の保存から復旧", new(530, 730, 440, 60), () => Modal = "recover");
        if (diagnosis?.Primary.Code == "missing" && diagnosis.Backup.Code == "missing" && diagnosis.PendingFiles.Length > 0)
            Button(content, "archive", "中断した新規作成を退避", new(530, 810, 440, 60), () => Modal = "archive");
    }

    private void HomeScreen()
    {
        Text(content, "先代の古道具屋", new(32, 22, 800, 58), 35);
        Button(content, "prepare", "編成", new(32, 112, 240, 62), () => { Screen = "preparation"; RefreshComparison(); });
        Button(content, "knowledge", "調査記録", new(296, 112, 240, 62), () => Modal = "knowledge");
        Text(content, "着想  " + ViewData.Money(View.Obj("home").Obj("economy").Number("unspent_units")), new(1160, 110, 600, 55), 29, Gold);
        var p = Panel(content, new(490, 252, 940, 654));
        Text(p, "夜潮の排水路", new(42, 32, 850, 62), 36);
        Text(p, View.Obj("case").Text("status") == "resolved" ? "踏破済み · 再訪" : View.Obj("case").Number("attempts") == 0 ? "初めての探索" : "再挑戦", new(44, 107, 820, 44), 25, Gold);
        StoryReader(p, "home-prose", new(44, 179, 848, 280), false);
        Button(p, "story-detail", "詳細", new(44, 480, 200, 54), () => Modal = "story-detail");
        Button(p, "depart", "出発", new(618, 538, 276, 68), () => Send("depart", new() { ["case_id"] = "SCN-001" }), Can("depart") && !DraftDirty);
        if (DraftDirty) Text(p, "編成に未確定の変更があります。", new(44, 566, 555, 52), 23, Gold);
    }

    private string StoryText(bool optional) => string.Join("\n\n", View.Obj("story").Arr("texts").Rows()
        .Where(t => optional ? t.Text("kind") == "detail" : t.Text("kind") is "main" or "conditional" or "objective")
        .Select(t => t.Text("short_text")));

    private void ContinueStory(bool advance)
    {
        var story = View.Obj("story");
        RecordVisibleParagraphs();
        var allowed = story.Obj("scene").Arr("text_ids").Strings().Concat(story.Obj("scene").Arr("optional_text_ids").Strings()).ToHashSet();
        var rows = story.Arr("texts").Rows().Where(t => displayedTexts.Contains(t.Text("id")) && allowed.Contains(t.Text("id")));
        Send("continue_scene", new() { ["scene_id"] = story.Obj("scene").Text("id"), ["advance"] = advance,
            ["displayed_text_ids"] = ViewData.Array(rows.Select(t => t.Text("id"))) });
    }

    private void ReturnScreen()
    {
        var r = View.Obj("return");
        string outcome = r.Text("outcome") switch { "clear" => "踏破", "withdrawal" => "撤退", _ => "緊急脱出" };
        Text(content, outcome, new(72, 45, 900, 90), 48, Gold);
        var p = Panel(content, new(96, 184, 1728, 750));
        StoryReader(p, "return-prose", new(40, 35, 800, 345), false);
        Button(p, "story-detail", "詳細", new(40, 415, 200, 56), () => Modal = "story-detail");
        string rewards = $"取得した着想　{ViewData.Money(r.Number("gained_units"))}\n着想の残高　{ViewData.Money(r.Number("unspent_after_units"))}\n\n持ち帰った成果\n{RewardText(r.Arr("kept_items"))}\n\n失った成果\n{RewardText(r.Arr("lost_items"))}";
        LongText(p, "return-rewards", rewards, new(900, 40, 760, 500), 27);
        if (Can("continue_scene")) Button(p, "continue", "続きを読む", new(40, 625, 330, 70), () => ContinueStory(true));
        else
        {
            bool cleared = View.Obj("case").Text("status") == "resolved";
            Button(p, "ack", "拠点へ", new(cleared ? 40 : 400, 625, 330, 70), () => { departAfterReturn = false; Send("ack_return"); }, Can("ack_return"));
            Button(p, "repeat", cleared ? "再訪する" : "再挑戦", new(cleared ? 400 : 40, 625, 330, 70), () => { departAfterReturn = true; Send("ack_return"); }, Can("ack_return"));
        }
        Text(p, "取得・編成は拠点の「編成」から行えます。", new(800, 640, 850, 60), 23);
    }

    private static string RewardText(JsonArray items) => items.Count == 0 ? "なし" : string.Join("\n", items.Select(n =>
    {
        if (n is not JsonObject r) return n?.ToString() ?? "";
        if (r["items"] is JsonArray nested) return RewardText(nested);
        return r.Text("kind") switch { "points" => "着想 " + ViewData.Money(r.Number("amount_units")), "material" => r.Text("type") + " ×" + r.Number("amount"), "unlock" => "取得可能な札が増えました", _ => r.Text("label") };
    }));

    private void RenderModal()
    {
        if (Modal == "") return;
        if (Modal == "detail") { DetailWindow(); return; }
        if (Modal == "prediction")
        {
            var forecast = Panel(popup, new(detailOrigin.X < 960 ? 1384 : 16, 380, 520, 480), "142b32ed");
            forecast.MouseFilter = MouseFilterEnum.Stop; Controls["detail-panel"] = forecast;
            Text(forecast, "行動予測", new(20, 12, 380, 58), 27, Gold);
            Button(forecast, "modal-close", "×", new(454, 12, 48, 48), () => Modal = "");
            LongText(forecast, "prediction-body", PredictionText(), new(20, 82, 480, 370), 22);
            return;
        }
        var shade = new ColorRect { Color = new Color(0, 0, 0, .6f), Size = new(1920, 1080), MouseFilter = MouseFilterEnum.Stop }; popup.AddChild(shade);
        var p = Panel(popup, new(450, 170, 1020, 740), "13272df8"); p.MouseFilter = MouseFilterEnum.Stop;
        string title = "確認", body = "";
        switch (Modal)
        {
            case "quit": title = "終了しますか"; body = Blocked ? "保存の成否は未確認です。次の起動時に読み込まれた保存から再開します。" : "この画面で行った未確定の編集は失われます。取得や支払いは行いません。保存済みの状態や、以前保存された未払い案は残ります。"; break;
            case "recover": title = "直前の保存から復旧"; body = "最後の一操作分が戻る可能性があります。壊れた原本は別名で保全し、直前の完全な保存を読み込みます。"; break;
            case "archive": title = "中断した新規作成を退避"; body = "未確定のファイルは別名で保全します。途中の状態を続きとして扱わず、新規作成を選べるようにします。"; break;
            case "failure": title = Blocked ? "保存状態の確認が必要です" : "操作を確定できませんでした"; body = Message; break;
            case "resend": title = "前の操作を照合"; body = "保存された状態を表示しています。前の操作を同じ要求で照合すると、確定済みなら再適用せず結果を返します。未確定ならその操作を実行します。"; break;
            case "reload": title = "保存を読み直す"; body = "画面内の変更案を破棄し、保存された状態を読み直します。古い個体の参照をそのまま新しい状態へ移しません。"; break;
            case "withdraw": title = "探索から撤退"; body = "保護されていない成果は失われます。続きから再開したい場合は「中断して終了」を使ってください。"; break;
            case "review": title = "取得・編成を確定"; body = ReviewText(); break;
            case "convert": title = "所持品を変換"; body = ConversionText(); break;
            case "story-detail": title = "詳細"; body = StoryText(true); break;
            case "history": title = "これまでの本文"; body = string.Join("\n\n", View.Obj("story").Arr("text_history").Rows().Select(t => t.Text("short_text"))); break;
            case "knowledge": title = "調査記録"; body = KnowledgeText(); break;
            case "deck": title = "札組の残り"; body = "並びは見やすく整理したもので、引く順序ではありません。\n\n" + string.Join("\n\n", View.Obj("exploration").Arr("own_deck").Rows().Select(r => CardName(r) + "\n" + ItemText(r))); break;
            case "prediction": title = "行動予測"; body = PredictionText(); break;
        }
        Text(p, title, new(32, 24, 950, 64), 34, Gold);
        if (Modal == "story-detail") StoryReader(p, "dialog-body", new(36, 112, 948, 450), true);
        else LongText(p, "dialog-body", body, new(36, 112, 948, 450), 26);
        Button(p, "modal-close", Modal == "quit" ? "編集を続ける" : "閉じる", new(40, 620, 290, 66), () => Modal = "", !Blocked || Modal != "failure");
        switch (Modal)
        {
            case "quit": Button(p, "quit-confirm", "終了", new(684, 620, 290, 66), Close); break;
            case "recover": Button(p, "recover-confirm", "復旧する", new(684, 620, 290, 66), () => Open(recovery: true)); break;
            case "archive": Button(p, "archive-confirm", "退避する", new(684, 620, 290, 66), () => Begin(() => { FileGameSession.ArchiveIncompleteCreation(SavePath); return new(Diagnosis: FileGameSession.Diagnose(SavePath)); }, r => { diagnosis = r.Diagnosis; Modal = ""; Message = r.Error is null ? "新規作成を選べます。" : ViewData.Explain(r.Error); })); break;
            case "failure":
                Button(p, "reload", "読み直す", new(360, 620, 290, 66), () => Modal = "reload");
                Button(p, "retry", "同じ操作を再試行", new(684, 620, 290, 66), ExecuteLast, !Blocked && LastCommand is not null); break;
            case "resend": Button(p, "retry", "前の操作を照合", new(684, 620, 290, 66), ExecuteLast); break;
            case "reload": Button(p, "reload-confirm", "読み直す", new(684, 620, 290, 66), Reload); break;
            case "withdraw": Button(p, "withdraw-confirm", "撤退", new(684, 620, 290, 66), () => Send("withdraw"), Can("withdraw")); break;
            case "review": Button(p, "commit", "確定する", new(684, 620, 290, 66), () => Send("commit_preparation", new() { ["plan"] = Plan.DeepClone() }), Comparison.Flag("ok") && Can("commit_preparation")); break;
            case "convert": Button(p, "convert-confirm", "変換する", new(684, 620, 290, 66), () => Send("convert_items", new() { ["item_ids"] = ViewData.Array([detailId]) }), conversionQuote.Flag("ok") && Can("convert_items") && !DraftDirty); break;
            case "story-detail": Button(p, "record-detail", "読了して閉じる", new(654, 620, 320, 66), () => ContinueStory(false), !Blocked); break;
        }
    }

    private string KnowledgeText()
    {
        var k = View.Obj("knowledge"); var rows = k.Arr("evidence").Rows().ToArray();
        if (rows.Length == 0) return "まだ調査記録はありません。探索で観測した情報がここに残ります。";
        // 公開された観測だけを列挙する。DTOや敵の私有山札から補完しない。
        return string.Join("\n\n", rows.Select(r => r.Text("label") is { Length: > 0 } label ? label : r["card"] is JsonObject c ? CardName(c) : "観測済みの情報\n" + string.Join("、", r.Arr("cards").Select(c => CardName(c as JsonObject ?? new())))));
    }
}
