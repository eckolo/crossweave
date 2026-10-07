using Crossweave.Infrastructure.Application;
using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

// 描画はこのpartialとPreparation/Explorationへ分ける。partialはC#のファイル分割機能で、別sessionを作るものではない。
public partial class GameScreen
{
    private void BuildTheme()
    {
        Theme=new Theme{DefaultFont=font,DefaultFontSize=18};
        Theme.SetColor("font_color","Label",Ink);
        foreach(var state in new[]{"normal","pressed","disabled"})Theme.SetStylebox(state,"Button",Box(Paper));
        Theme.SetStylebox("hover","Button",Box("e6eddf"));
        Theme.SetStylebox("focus","Button",Box("ffffff00",Line,2));
        foreach(var state in new[]{"font_color","font_hover_color","font_pressed_color","font_hover_pressed_color","font_focus_color","font_disabled_color","icon_normal_color","icon_hover_color","icon_pressed_color","icon_hover_pressed_color"})Theme.SetColor(state,"Button",Ink);
        foreach(var kind in new[]{"HScrollBar","VScrollBar"})
        {
            // 原本のCSSにはheight6もあるが、現Edgeではscrollbar-width:thinが優先し
            // 実client差は縦横とも10px。CSS文字だけで値を決めず採取画素を使う。
            const int thickness=10;bool vertical=kind=="VScrollBar";
            var track=Box("ffffff00",Line,0,0);if(vertical)track.BgColor=new Color(darkTheme?"2c2c2c":"fcfcfc");track.ContentMarginTop=track.ContentMarginBottom=thickness/2;
            track.ContentMarginLeft=track.ContentMarginRight=thickness/2;
            Theme.SetStylebox("scroll",""+kind,track);Theme.SetStylebox("scroll_focus",kind,track);
            foreach(var state in new[]{"grabber","grabber_highlight","grabber_pressed"})
            {
                var thumb=Box(Line,Line,0,3);if(vertical)thumb.BgColor=new Color(state=="grabber"?(darkTheme?"9f9f9f":"8b8b8b"):(darkTheme?"d1d1d1":"636363"));
                thumb.ContentMarginTop=thumb.ContentMarginBottom=thickness/2;thumb.ContentMarginLeft=thumb.ContentMarginRight=thickness/2;
                // 同overflowでthumb長は一致し描画だけ3pxずれる。page/操作面は変えない。
                if(vertical){thumb.SetExpandMargin(Side.Left,-2);thumb.SetExpandMargin(Side.Right,-2);thumb.SetExpandMargin(Side.Top,3);thumb.SetExpandMargin(Side.Bottom,-3);}
                else{thumb.SetExpandMargin(Side.Top,-2);thumb.SetExpandMargin(Side.Bottom,-2);thumb.SetExpandMargin(Side.Left,3);thumb.SetExpandMargin(Side.Right,-3);}
                Theme.SetStylebox(state,kind,thumb);
            }
            foreach(var state in new[]{"increment","decrement","increment_highlight","decrement_highlight","increment_pressed","decrement_pressed"})
                Theme.SetIcon(state,kind,ScrollbarArrow(vertical,state.StartsWith("increment"),vertical?new Color(darkTheme?"9f9f9f":"8b8b8b"):UiColor(Line)));
        }
    }
    private static Texture2D ScrollbarArrow(bool vertical,bool forward,Color color)
    {
        // 小さな標準UIの三角をメモリ上で描く。ゲーム素材ファイルを追加・置換しない。
        using var image=Image.CreateEmpty(10,10,false,Image.Format.Rgba8);image.Fill(new Color(0,0,0,0));
        for(int row=0;row<3;row++)for(int cross=3+row;cross<=7-row;cross++)
        {int axis=forward?4+row:6-row;image.SetPixel(vertical?cross:axis,vertical?axis:cross,color);}
        return ImageTexture.CreateFromImage(image);
    }

    private Label Text(Control parent, string value, Rect2 rect, int size = 24, Color? color = null)
    {
        var label = new Label { Text = value, Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore,
            AutowrapMode = rect.Size.Y < size*2 ? TextServer.AutowrapMode.Off : TextServer.AutowrapMode.WordSmart, ClipText = true, VerticalAlignment=VerticalAlignment.Center };
        label.AddThemeFontSizeOverride("font_size", size); label.AddThemeFontOverride("font", font);
        label.AddThemeColorOverride("font_color", color ?? Ink);LineHeight(label,size,size*(Exploring&&!journeyWindowStyle?1.4f:1.5f)); parent.AddChild(label); return label;
    }
    private Panel Panel(Control parent, Rect2 rect, string color = "15272dea")
    {
        return Surface(parent,rect,color,Line,0,0);
    }
    private Button Button(Control parent, string id, string value, Rect2 rect, Action action, bool enabled = true)
    {
        var button = new Button { Text = value, Position = rect.Position, Size = rect.Size, Disabled = !enabled || (Busy && id != "exit"),
            FocusMode = FocusModeEnum.All, MouseDefaultCursorShape = CursorShape.PointingHand, ClipText = true };
        // 本文が見える通常ボタンには、原本に無いGodotの標準tooltipを重ねない。
        // 行動順などの追加公開説明は使用先が明示的にTooltipTextを与える。
        parent.AddChild(button); Controls[id] = button;
        bool primary=id.StartsWith("取得-")||id.StartsWith("編成-")||id is "depart" or "continue" or "ack" or "review" or "commit" or "play";
        bool explorationButton=Exploring&&!journeyWindowStyle;
        string normalPaper=ColorScope=="cj"?"fcfcf5":Paper;
        ButtonStyle(button,primary?(explorationButton?"345747":"315849"):normalPaper,primary?(explorationButton?"345747":"315849"):Line,primary?(explorationButton?"ffffff":"fffef5"):(explorationButton?"263c32":"243d35"),hover:primary?"244537":"e6eddf");
        button.AddThemeFontSizeOverride("font_size",Screen=="preparation"&&!journeyWindowStyle?20:18);
        button.AddThemeFontOverride("font",LineBoxFont(font,button.GetThemeFontSize("font_size"),button.GetThemeFontSize("font_size")*(explorationButton?1.4f:1.5f)));
        if(button.Disabled)button.Modulate=new Color(1,1,1,ColorScope=="cp"?.42f:ColorScope=="cj"?.45f:.5f);
        // PressedはGodot標準のsignal。ラムダはUIの意図を本作の操作へ渡すだけで、ゲーム計算を行わない。
        button.Pressed += () => { if (Automation is not null) {Automation.ButtonPressed(id);GD.Print("UI PRESS " + id + " busy=" + Busy);} if ((!Busy || id == "exit") && !button.Disabled) { CancelGesture(); action(); renderNeeded = true; } };
        return button;
    }
    private ScrollContainer Scroll(Control parent, string id, Rect2 rect, bool horizontal)
    {
        bool list=id.StartsWith("prep-")||id is "strip-hand" or "strip-field";
        var s = list?new ListViewport{Screen=this}:new ScrollContainer();
        s.Position=rect.Position;s.Size=rect.Size;
        s.HorizontalScrollMode=horizontal?ScrollContainer.ScrollMode.Auto:ScrollContainer.ScrollMode.Disabled;
        s.VerticalScrollMode=horizontal?ScrollContainer.ScrollMode.Disabled:ScrollContainer.ScrollMode.Auto;
        parent.AddChild(s); Controls[id] = s;
        if (scrollPositions.TryGetValue(id, out var position)) { if (horizontal) s.SetDeferred("scroll_horizontal", position); else s.SetDeferred("scroll_vertical", position); }
        return s;
    }
    private void LongText(Control parent, string id, string value, Rect2 rect, int fontSize = 24)
    {
        var s = Scroll(parent, id, rect, false);
        var label = new Label { Text = value, CustomMinimumSize = new(rect.Size.X - 28, 0), SizeFlagsHorizontal = SizeFlags.ExpandFill,
            AutowrapMode = TextServer.AutowrapMode.WordSmart, MouseFilter = MouseFilterEnum.Ignore };
        label.AddThemeFontSizeOverride("font_size", fontSize); LineHeight(label,fontSize,fontSize*1.6f); s.AddChild(label);
    }

    private void Render()
    {
        journeyWindowStyle=false;
        RememberAcquisition();
        // Renderは本作の通常メソッド（Godot標準の描画callbackは_Draw）。
        // 一つの公開viewから表示を一括再生成し、古いButtonに新しいtokenだけを渡さない。
        // QueueFreeはフレーム末の解放なので、先にRemoveChildで入力対象から外す。
        foreach (var (id, control) in Controls) if (control is ScrollContainer scroll)
            scrollPositions[id] = scroll.HorizontalScrollMode == ScrollContainer.ScrollMode.Auto ? scroll.ScrollHorizontal : scroll.ScrollVertical;
        foreach (var child in GetChildren()) { RemoveChild(child); child.QueueFree(); }
        Controls.Clear(); dropZones.Clear(); cardRows.Clear(); visibleParagraphs.Clear();
        darkTheme=ThemeDarkOverride??NormalThemeIsDark(DisplayServer.IsDarkMode());BuildTheme();
        // cj-shellの外角10と1px内側のクリップを別の役割として保持する。
        // ScrollContainerの矩形clipとは別の機能。子へ丸いmaskを重ねて作らない。
        var shell=Surface(this,new(0,0,1920,1080),"f1f1e8","bbc7bb",1,10);
        shell.ClipChildren=CanvasItem.ClipChildrenMode.AndDraw;
        content = new Control { MouseFilter = MouseFilterEnum.Ignore, Position=new(1,1), Size=new(InnerWidth,InnerHeight),ClipContents=true }; shell.AddChild(content);
        // ExpandModeをSizeより先に指定する。逆順だと元画像の最小サイズにSizeが拡大され、後のIgnoreSizeでは戻らない。
        var background = new TextureRect { ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
            Texture = GD.Load<Texture2D>(Screen == "exploring" ? "res://Assets/Application/night-tide.webp" : "res://Assets/Application/antique-shop.webp"),
            Position=new(0,Exploring?0:64), Size = new(InnerWidth, Exploring?InnerHeight:950), StretchMode = TextureRect.StretchModeEnum.Scale,
            MouseFilter = MouseFilterEnum.Ignore };
        // sceneArtworkのcoverとobject-positionを実画像の切出しへ変換する。
        // 原素材は不変。KeepAspectCoveredの中央固定で40%指定を失わない。
        var artwork = background.Texture; float scale = Math.Max(background.Size.X/artwork.GetWidth(),background.Size.Y/artwork.GetHeight());
        var regionSize=background.Size/scale; float yPosition=Exploring?.4f:.5f;
        background.Texture=new AtlasTexture { Atlas=artwork, Region=new(new Vector2((artwork.GetWidth()-regionSize.X)*.5f,(artwork.GetHeight()-regionSize.Y)*yPosition),regionSize) };
        content.AddChild(background);
        if(Screen=="start")background.Hide();
        if(Screen is "home" or "return" || View.Obj("story").Obj("scene").Flag("paused"))ReadingBackdrop();
        if(Screen!="preparation"&&!Exploring)ShellBars();
        if(Exploring)
        {
            // transparentも終点と同じRGBでalpha0にする。透明な明色RGBをdark終点へ
            // 補間すると中間のwashが明るくなり、空場の透過色まで変わってしまう。
            string wash=darkTheme?"182a27":"e8edd9",end=darkTheme?"182a2755":"e8edd933";
            GradientSurface(content,new(0,0,InnerWidth,InnerHeight),new(.5f,0),new(.5f,1),[wash+"00",wash+"00",end],[0,.45f,1]);
        }
        if (Screen == "start") StartScreen();
        else if (Screen == "preparation") PreparationScreen();
        else if (Screen == "home") HomeScreen();
        else if (Screen == "return") ReturnScreen();
        else if (View.Obj("story").Obj("scene").Flag("paused")) SceneReader();
        else ExplorationScreen();
        // 共通操作帯を全体スクロールの外へ固定する。
        if (Screen == "start") Button(content, "exit", "終了", new(1770, 4, 126, 56), AskClose);
        else CommonNavigation();
        if(Busy||Message.Length>0)Notice(Busy?"保存・読込み中…":Message);
        canvas = new InteractionCanvas { Screen = this, MouseFilter = MouseFilterEnum.Ignore, Size = new(1920, 1080) }; shell.AddChild(canvas);
        popup = new Control { MouseFilter = MouseFilterEnum.Ignore,Position=new(1,1),Size=new(InnerWidth,InnerHeight) }; shell.AddChild(popup);
        CreateHoldCue();
        AnimateAcquisition();RenderModal();journeyWindowStyle=false;QueueRedraw();
    }

    private void StartScreen()=>AcceptedStartScreen();

    private void HomeScreen()=>AcceptedHomeScreen();

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

    private void ReturnScreen()=>AcceptedReturnScreen();

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
        if(Modal=="deck-card"){AcceptedDeckWindow(true);return;}
        if(Modal=="knowledge-card"){AcceptedKnowledgeWindow(true);return;}
        if (Modal == "detail") { DetailWindow(); return; }
        if (Modal == "prediction")
        {
            var selected=View.Obj("exploration").Arr("hand").Rows().FirstOrDefault(r=>r.Text("id")==selectedCard);
            var forecast=WindowFrame("予測 · "+CardName(selected??new()),EdgeWindow(520,480),"detail-panel",pinned:true);
            // 予測も詳細と同じ表・本文間隔。閲覧のためにplayを送らない。
            var predictionBody=FactsBody(forecast,"prediction-body",new(16,80,488,384));PredictionFacts(predictionBody);
            return;
        }
        bool blocking=Modal is "review" or "convert" or "quit" or "recover" or "archive" or "failure" or "resend" or "reload" or "withdraw";
        if(blocking)popup.AddChild(new ColorRect{Color=UiColor("283d3555"),Size=new(InnerWidth,InnerHeight),MouseFilter=MouseFilterEnum.Stop});
        bool preparation=Modal is "review" or "convert";
        float width=preparation?960:520,height=preparation?820:480,footer=height-72;
        var rect=preparation?new Rect2(479,129,width,height):CommonWindowRect();
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
            case "review": title = "変更内容"; body = ReviewText(); break;
            case "convert": title = "所持品を変換"; body = ConversionText(); break;
            case "story-detail": title = "詳細"; body = StoryText(true); break;
            case "history": title = "これまでの本文"; body = string.Join("\n\n", View.Obj("story").Arr("text_history").Rows().Select(t => t.Text("short_text"))); break;
            case "help": title="遊び方"; body="編成を整えて出発し、札を選んで対象と予測を確認します。札を短く長押しして場へ移すか、行動ボタンで確定できます。\n\n横に払うと札列をスクロールします。編成の列は縦に払います。右クリック・Escで移動や詳細を取り消します。\n\n取得は未払いの案として編集し、確認画面で確定します。帰還分の取得は一度に1枚です。"; break;
            case "save-data": title="保存データ"; body="確定した操作は自動で保存します。編集中の未確定案は、終了すると失われます。\n\n保存や読込みに失敗したときは画面の案内に従って照合・再読込みを行えます。"; break;
            case "settings": title="表示・操作"; body="札・対象を選んだときの詳細の自動表示を切り替えます。この起動中の画面設定です。\n\nEnter / Space：選んだ札の詳細\nEsc / 右クリック：取消・閉じる\nF11：全画面／ウィンドウ"; break;
            case "objective": title="目的"; body=StoryText(false); break;
            case "status": title="状況"; body=ActorText(View.Obj("exploration").Obj("self")); break;
            case "order": title="行動順"; body=(actionPreview.Flag("ok")?"本人・今\n":"")+OrderText(); break;
            case "action-history": title="履歴"; body=string.Join("\n\n",View.Arr("action_history").Rows().Reverse().Select(PublicEventText)); if(body=="")body="まだ履歴はありません。"; break;
            case "receipt": title="帰還の精算"; body="持ち帰ったもの\n"+RewardText(View.Obj("return").Arr("kept_items"))+"\n\n失ったもの\n"+RewardText(View.Obj("return").Arr("lost_items"))+"\n\n新しい記録 "+View.Obj("return").Arr("new_unlocks").Count; break;
            case "deck": title = "札組の残り"; body = "並びは見やすく整理したもので、引く順序ではありません。\n\n" + string.Join("\n\n", View.Obj("exploration").Arr("own_deck").Rows().Select(r => CardName(r) + "\n" + ItemText(r))); break;
            case "prediction": title = "行動予測"; body = PredictionText(); break;
        }
        var p=WindowFrame(title,rect,back:modalParent!=""&&!ExplorerUtilityWindow,pinned:ExplorerUtilityWindow,preparation:preparation);
        if(Modal=="review")PreparationFacts(FactsBody(p,"dialog-body",new(24,88,width-48,height-184),22));
        // 既存の読了確定操作を本文に重ねない。最下段まで実際に見えたIDだけを
        // receiptへ渡す判定も、操作帯を除いた同じScrollContainerの範囲で行う。
        else if(Modal=="story-detail")StoryReader(p,"dialog-body",new(17,81,width-34,height-170),true);
        else GenericFacts(FactsBody(p,"dialog-body",new(16,80,width-32,height-(blocking||Modal=="save-data"?168:96))),Modal,body);
        if(preparation)
        {
            Surface(p,new(1,footer,width-2,1),"bac9ba");
            if(Modal=="review")
            {
                string cost=Comparison.Flag("ok")?ViewData.Money(Comparison.Obj("payment").Number("cost_units")):"—";float w=strongFont.GetStringSize(cost,fontSize:22).X;
                Icon(p,"Lightbulb",new(width-184-w-40,footer+22,24,24));Strong(Text(p,cost,new(width-184-w-12,footer+4,w,64),22));
            }
        }
        if(Blocked&&Modal=="failure")((Button)Controls["modal-close"]).Disabled=true;
        switch (Modal)
        {
            case "quit": Button(p, "quit-confirm", "終了", new(width-184, footer+4, 160, preparation?64:56), Close); break;
            case "recover": Button(p, "recover-confirm", "復旧する", new(width-184, footer+4, 160, preparation?64:56), () => Open(recovery: true)); break;
            case "archive": Button(p, "archive-confirm", "退避する", new(width-184, footer+4, 160, preparation?64:56), () => Begin(() => { FileGameSession.ArchiveIncompleteCreation(SavePath); return new(Diagnosis: FileGameSession.Diagnose(SavePath)); }, r => { diagnosis = r.Diagnosis; Modal = ""; Message = r.Error is null ? "新規作成を選べます。" : ViewData.Explain(r.Error); })); break;
            case "failure":
                Button(p, "reload", "読み直す", new(20, footer, 228, 56), () => Modal = "reload");
                Button(p, "retry", "同じ操作を再試行", new(width-184, footer+4, 160, preparation?64:56), ExecuteLast, !Blocked && LastCommand is not null); break;
            case "resend": Button(p, "retry", "前の操作を照合", new(width-184, footer+4, 160, preparation?64:56), ExecuteLast); break;
            case "reload": Button(p, "reload-confirm", "読み直す", new(width-184, footer+4, 160, preparation?64:56), Reload); break;
            case "withdraw": Button(p, "withdraw-confirm", "撤退", new(width-184, footer+4, 160, preparation?64:56), () => Send("withdraw"), Can("withdraw")); break;
            case "review": var commit=Button(p, "commit", "確定する", new(width-167, footer+4, 160, preparation?64:56), () => Send("commit_preparation", new() { ["plan"] = Plan.DeepClone() }), Comparison.Flag("ok") && Can("commit_preparation"));commit.AddThemeFontSizeOverride("font_size",22);break;
            case "convert": Button(p, "convert-confirm", "変換する", new(width-184, footer+4, 160, preparation?64:56), () => Send("convert_items", new() { ["item_ids"] = ViewData.Array([detailId]) }), conversionQuote.Flag("ok") && Can("convert_items") && !DraftDirty); break;
            case "story-detail": Button(p, "record-detail", "読了して閉じる", new(width-184, footer+4, 160, preparation?64:56), () => ContinueStory(false), !Blocked); break;
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
