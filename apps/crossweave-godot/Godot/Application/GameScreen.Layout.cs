using Crossweave.Infrastructure.Application;
using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

// 描画はこのpartialとPreparation/Explorationへ分ける。partialはC#のファイル分割機能で、別sessionを作るものではない。
public partial class GameScreen
{
    // UI0.16.0の明色の紙面・緑の操作色。既存画像へ別の強い色調を掛けない。
    internal static readonly Color Ink = new("243d35"), Muted = new("586e63"), Gold = new("315849");
    private static string PaperColor(string color) => color switch
    {
        "203b40" => "fcfcf5", "34545a" => "e3ecd9", "50676b" => "cfdec8", "203035" => "e5e9de",
        "15272dea" => "f2f3eaea", "13272df8" or "142b32ed" or "13272df5" => "fcfcf5fa",
        "567477" or "455556" => "bac9ba", "dbc18a" => "315849", _ => color
    };
    private static StyleBoxFlat Box(string color, string border = "567477", int width = 1) => new()
    {
        BgColor = new Color(PaperColor(color)), BorderColor = new Color(PaperColor(border)), BorderWidthBottom = width, BorderWidthTop = width,
        BorderWidthLeft = width, BorderWidthRight = width, CornerRadiusTopLeft = 6, CornerRadiusTopRight = 6,
        CornerRadiusBottomLeft = 6, CornerRadiusBottomRight = 6, ContentMarginLeft = 12, ContentMarginRight = 12
    };
    private void BuildTheme()
    {
        Theme = new Theme { DefaultFont = font, DefaultFontSize = 20 };
        Theme.SetStylebox("normal", "Button", Box("203b40")); Theme.SetStylebox("hover", "Button", Box("34545a", "dbc18a"));
        Theme.SetStylebox("pressed", "Button", Box("50676b", "dbc18a", 2)); Theme.SetStylebox("focus", "Button", Box("203b40", "dbc18a", 2));
        Theme.SetStylebox("disabled", "Button", Box("203035", "455556"));
        Theme.SetColor("font_color", "Button", Ink); Theme.SetColor("font_disabled_color", "Button", new Color("89988b"));
        Theme.SetColor("font_hover_color", "Button", Ink); Theme.SetColor("font_pressed_color", "Button", Ink); Theme.SetColor("font_focus_color", "Button", Ink);
        Theme.SetColor("font_color", "Label", Ink);
    }

    private Label Text(Control parent, string value, Rect2 rect, int size = 24, Color? color = null)
    {
        var label = new Label { Text = value, Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore,
            AutowrapMode = rect.Size.Y < size*2 ? TextServer.AutowrapMode.Off : TextServer.AutowrapMode.WordSmart, ClipText = true };
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
        if(id.StartsWith("取得-")||id.StartsWith("編成-")||id.StartsWith("外す-")||id is "depart" or "continue" or "ack" or "review" or "commit" or "play")
        {
            button.AddThemeStyleboxOverride("normal",Box("315849","315849"));
            button.AddThemeStyleboxOverride("hover",Box("426b58","315849"));
            button.AddThemeStyleboxOverride("pressed",Box("243d35","315849"));
            button.AddThemeColorOverride("font_color",new Color("fcfcf5"));
            button.AddThemeColorOverride("font_hover_color",new Color("fcfcf5"));
            button.AddThemeColorOverride("font_pressed_color",new Color("fcfcf5"));
            button.AddThemeColorOverride("font_focus_color",new Color("fcfcf5"));
        }
        // PressedはGodot標準のsignal。ラムダはUIの意図を本作の操作へ渡すだけで、ゲーム計算を行わない。
        button.Pressed += () => { if (Automation is not null) GD.Print("UI PRESS " + id + " busy=" + Busy); if ((!Busy || id == "exit") && !button.Disabled) { CancelGesture(); action(); renderNeeded = true; } };
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
        // ExpandModeをSizeより先に指定する。逆順だと元画像の最小サイズにSizeが拡大され、後のIgnoreSizeでは戻らない。
        var background = new TextureRect { ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
            Texture = GD.Load<Texture2D>(Screen == "exploring" ? "res://Assets/Application/night-tide.webp" : "res://Assets/Application/antique-shop.webp"),
            Size = new(1920, 1080), StretchMode = TextureRect.StretchModeEnum.KeepAspectCovered,
            MouseFilter = MouseFilterEnum.Ignore };
        content.AddChild(background);
        if (Screen != "exploring") ReadingBackdrop();
        if (Screen == "start") StartScreen();
        else if (Screen == "preparation") PreparationScreen();
        else if (Screen == "home") HomeScreen();
        else if (Screen == "return") ReturnScreen();
        else if (View.Obj("story").Obj("scene").Flag("paused")) SceneReader();
        else ExplorationScreen();
        // 共通操作帯を全体スクロールの外へ固定する。
        if (Screen == "start") Button(content, "exit", "終了", new(1770, 4, 126, 56), AskClose);
        else CommonNavigation();
        if (Busy) Text(content, "保存・読込み中…", new(1230, 4, 290, 56), 20, Gold);
        if (Message.Length > 0 && Screen != "start")
        { var notice = Panel(content, new(24, 66, 1540, 50), "fcfcf5f2"); Text(notice, Message, new(12, 0, 1516, 50), 19, Gold); }
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
        Button(content,"prepare","編成",new(24,4,96,56),()=>{Screen="preparation";RefreshComparison();});
        Text(content,"探索先",new(136,4,800,56),24);
        Text(content,"着想 "+ViewData.Money(View.Obj("home").Obj("economy").Number("unspent_units")),new(1350,4,290,56),20,Gold).HorizontalAlignment=HorizontalAlignment.Right;
        Text(content,View.Obj("case").Text("status")=="resolved"?"踏破済み · 再訪":View.Obj("case").Number("attempts")==0?"初めての探索":"再挑戦",new(40,714,800,40),20,Gold);
        Text(content,"夜潮の排水路",new(40,760,760,56),32);
        Button(content,"story-detail","詳細",new(824,760,112,56),()=>OpenModal("story-detail"));
        StoryReader(content,"home-prose",new(40,834,840,156),false);
        Button(content,"depart","出発",new(1760,1018,136,56),()=>Send("depart",new(){["case_id"]="SCN-001"}),Can("depart")&&!DraftDirty);
        if(DraftDirty)Text(content,"編成に未確定の変更があります。",new(1040,1018,690,56),20,Gold);
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
        var r=View.Obj("return");
        string outcome=r.Text("outcome") switch {"clear"=>"踏破","withdrawal"=>"撤退",_=>"緊急脱出"};
        Text(content,outcome,new(24,4,900,56),24,Gold);
        Text(content,$"着想 +{ViewData.Money(r.Number("gained_units"))}　計 {ViewData.Money(r.Number("unspent_after_units"))}\n余力 {r.Number("expedition_end_hp")} → {r.Number("home_hp")}\n記録 +{r.Arr("new_unlocks").Count}",new(24,812,890,132),24);
        Button(content,"receipt","詳細",new(24,946,112,50),()=>OpenModal("receipt"));
        var reading=Panel(content,new(1056,636,840,360),"f1f1e860");StoryReader(reading,"return-prose",new(24,20,792,320),false);
        Button(content,"story-detail","本文の詳細",new(24,1018,164,56),()=>OpenModal("story-detail"));
        if(Can("continue_scene"))Button(content,"continue","進む",new(1740,1018,156,56),()=>ContinueStory(true));
        else Button(content,"ack","進む",new(1740,1018,156,56),()=>{departAfterReturn=false;Send("ack_return");},Can("ack_return"));
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
        if (Modal == "menu") { MenuWindow(); return; }
        if (Modal == "knowledge") { KnowledgeWindow(); return; }
        if (Modal == "settings") { SettingsWindow(); return; }
        if (Modal == "deck") { DeckWindow(); return; }
        if(Modal=="deck-card")
        {var card=DialogFrame(CardName(detail),new(700,300,520,480),true,()=>Modal="deck");LongText(card,"deck-detail",ItemText(detail),new(20,76,480,384),20);return;}
        if (Modal == "knowledge-card")
        {
            var card=DialogFrame(CardName(detail),new(700,300,520,480),true,()=>Modal="knowledge");
            // 基本構成→札→基本構成で一覧の選択とスクロールを保持する。
            LongText(card,"knowledge-detail",ItemText(detail),new(20,76,480,384),20);return;
        }
        if (Modal == "detail") { DetailWindow(); return; }
        if (Modal == "prediction")
        {
            var forecast = Panel(popup, new(detailOrigin.X < 960 ? 1384 : 16, Mathf.Clamp(detailOrigin.Y-104,16,488), 520, 480), "142b32ed");
            forecast.MouseFilter = MouseFilterEnum.Stop; Controls["detail-panel"] = forecast;
            Text(forecast, "行動予測", new(20, 12, 380, 58), 27, Gold);
            Button(forecast, "modal-close", "×", new(454, 12, 48, 48), () => Modal = "");
            LongText(forecast, "prediction-body", PredictionText(), new(20, 82, 480, 370), 22);
            return;
        }
        var shade = new ColorRect { Color = new Color(0, 0, 0, .6f), Size = new(1920, 1080), MouseFilter = MouseFilterEnum.Stop }; popup.AddChild(shade);
        bool preparation=Modal is "review" or "convert";
        float width=preparation?960:520,height=preparation?820:480,footer=height-76;
        var p = Panel(popup, new((1920-width)/2, (1080-height)/2, width, height), "13272df8"); p.MouseFilter = MouseFilterEnum.Stop;
        Controls["dialog-panel"]=p;
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
            case "help": title="遊び方"; body="編成を整えて出発し、札を選んで対象と予測を確認します。札を短く長押しして場へ移すか、行動ボタンで確定できます。\n\n横に払うと札列をスクロールします。編成の列は縦に払います。右クリック・Escで移動や詳細を取り消します。\n\n取得は未払いの案として編集し、確認画面で確定します。帰還分の取得は一度に1枚です。"; break;
            case "save-data": title="保存データ"; body="確定した操作は自動で保存します。編集中の未確定案は、終了すると失われます。\n\n保存や読込みに失敗したときは画面の案内に従って照合・再読込みを行えます。"; break;
            case "settings": title="表示・操作"; body="札・対象を選んだときの詳細の自動表示を切り替えます。この起動中の画面設定です。\n\nEnter / Space：選んだ札の詳細\nEsc / 右クリック：取消・閉じる\nF11：全画面／ウィンドウ"; break;
            case "objective": title="目的"; body=StoryText(false); break;
            case "status": title="状況"; body=ActorText(View.Obj("exploration").Obj("self")); break;
            case "order": title="行動順"; body=string.Join("\n",View.Obj("exploration").Arr("reservations").Rows().Select(r=>View.Obj("exploration").Obj("actors").Obj(r.Text("actor_id")).Text("display_name")+"　+"+(r.Number("at")-View.Obj("exploration").Number("now")))); break;
            case "action-history": title="履歴"; body=string.Join("\n\n",View.Arr("action_history").Rows().Reverse().Select(PublicEventText)); if(body=="")body="まだ履歴はありません。"; break;
            case "receipt": title="帰還の精算"; body="持ち帰ったもの\n"+RewardText(View.Obj("return").Arr("kept_items"))+"\n\n失ったもの\n"+RewardText(View.Obj("return").Arr("lost_items"))+"\n\n新しい記録 "+View.Obj("return").Arr("new_unlocks").Count; break;
            case "deck": title = "札組の残り"; body = "並びは見やすく整理したもので、引く順序ではありません。\n\n" + string.Join("\n\n", View.Obj("exploration").Arr("own_deck").Rows().Select(r => CardName(r) + "\n" + ItemText(r))); break;
            case "prediction": title = "行動予測"; body = PredictionText(); break;
        }
        Text(p, title, new(modalParent!=""?76:20, 4, width-150, 56), 22, Gold);
        if(modalParent!="")Button(p,"modal-back","←",new(8,4,56,56),CloseModal);
        if (Modal == "story-detail") StoryReader(p, "dialog-body", new(20, 76, width-40, height-170), true);
        else LongText(p, "dialog-body", body, new(20, 76, width-40, height-170), 20);
        Button(p, "modal-close", "×", new(width-64,4,56,56), () => {Modal="";modalParent="";}, !Blocked || Modal != "failure");
        switch (Modal)
        {
            case "quit": Button(p, "quit-confirm", "終了", new(width-248, footer, 228, 56), Close); break;
            case "recover": Button(p, "recover-confirm", "復旧する", new(width-248, footer, 228, 56), () => Open(recovery: true)); break;
            case "archive": Button(p, "archive-confirm", "退避する", new(width-248, footer, 228, 56), () => Begin(() => { FileGameSession.ArchiveIncompleteCreation(SavePath); return new(Diagnosis: FileGameSession.Diagnose(SavePath)); }, r => { diagnosis = r.Diagnosis; Modal = ""; Message = r.Error is null ? "新規作成を選べます。" : ViewData.Explain(r.Error); })); break;
            case "failure":
                Button(p, "reload", "読み直す", new(20, footer, 228, 56), () => Modal = "reload");
                Button(p, "retry", "同じ操作を再試行", new(width-248, footer, 228, 56), ExecuteLast, !Blocked && LastCommand is not null); break;
            case "resend": Button(p, "retry", "前の操作を照合", new(width-248, footer, 228, 56), ExecuteLast); break;
            case "reload": Button(p, "reload-confirm", "読み直す", new(width-248, footer, 228, 56), Reload); break;
            case "withdraw": Button(p, "withdraw-confirm", "撤退", new(width-248, footer, 228, 56), () => Send("withdraw"), Can("withdraw")); break;
            case "review": Button(p, "commit", "確定する", new(width-248, footer, 228, 56), () => Send("commit_preparation", new() { ["plan"] = Plan.DeepClone() }), Comparison.Flag("ok") && Can("commit_preparation")); break;
            case "convert": Button(p, "convert-confirm", "変換する", new(width-248, footer, 228, 56), () => Send("convert_items", new() { ["item_ids"] = ViewData.Array([detailId]) }), conversionQuote.Flag("ok") && Can("convert_items") && !DraftDirty); break;
            case "story-detail": Button(p, "record-detail", "読了して閉じる", new(width-248, footer, 228, 56), () => ContinueStory(false), !Blocked); break;
            case "settings": Button(p,"auto-details",autoDetails?"自動詳細：入":"自動詳細：切",new(20,footer,width-40,56),()=>autoDetails=!autoDetails);break;
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
