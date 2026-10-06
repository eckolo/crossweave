using Godot;
using System.Text.Json.Nodes;
using Crossweave.Core;

namespace Crossweave.Application;

/// <summary>
/// 合意UIの共通描画値。CSSの取得(cp)・探索(cw)・ナビを別の名前空間として扱う。
/// このpartialは同じGameScreenの一部であり、保存・規則・公開値の所有者にはならない。
/// SVGは既存Lucide定義の転記。OSフォントは現在の原本撮影と同じfamilyを選び、
/// 原本の古い撮影環境が判明したという意味ではない（U-C01の不足は別に残す）。
/// </summary>
public partial class GameScreen
{
    private const float InnerWidth = 1918, InnerHeight = 1078;
    private Font strongFont = null!, serifFont = null!;
    private readonly Dictionary<(Font face, int size), Font> lineBoxFonts = new();
    private bool darkTheme, reducedMotion;
    private bool journeyWindowStyle;
    private JsonObject acceptedIcons = new();
    private readonly Dictionary<string, Texture2D> iconTextures = new();
    private readonly Dictionary<string, Vector2> motionOrigins = new();
    internal ulong MotionEndsAt { get; private set; }
    private readonly HashSet<string> expandedFacts = [];
    private Rect2? modalAnchor;
    private Rect2? sourceWindow;
    private string knowledgeTab = "targets";
    private bool operationSettings;
    private bool keyboardFocusVisible;
    private readonly Queue<JsonObject> eventQueue = new();
    private readonly List<(JsonObject row, ulong start)> liveRows = [];
    private ulong nextEventAt;
    private Control? eventLayer;
    private string eventSignature = "";
    private Control? holdCue;
    private Panel? holdCaption;
    private Label? holdLabel;
    private ShaderMaterial? holdRing;
    internal bool? ThemeDarkOverride { get; set; }
    // 0.9：人が確認・了承した暗色を通常表示にする。OSの設定は入力として
    // 検査できるが採用色を変えない。overrideは隔離検査の過去light証拠専用。
    internal static bool NormalThemeIsDark(bool operatingSystemDark) => true;
    internal bool ActiveThemeIsDark => darkTheme;
    private string ColorScope => Screen == "preparation" && !journeyWindowStyle ? "cp" : Exploring && !journeyWindowStyle ? "cw" : "cj";
    private bool Exploring => Screen == "exploring" && !View.Obj("story").Obj("scene").Flag("paused");
    private bool ExplorerUtilityWindow => Exploring && (Modal is "objective" or "status" or "order" or "deck" or "deck-card" or "action-history" || Modal == "settings" && operationSettings);
    private bool CommonMenuChild => modalParent == "menu" && !ExplorerUtilityWindow && Modal is "settings" or "help" or "history" or "save-data" or "knowledge";
    internal Color Ink => UiColor(Exploring && !journeyWindowStyle ? "263c32" : "243d35");
    private Color Muted => UiColor("586e63");
    private Color Gold => UiColor(Exploring ? "345747" : "315849");
    private string Paper => Exploring && !journeyWindowStyle ? "f7f8f4" : "fcfcf5";
    private string Line => Exploring && !journeyWindowStyle ? "acbdad" : "bac9ba";
    // light-dark()の宣言値から転記。明色の画像しかないことをdark無効の根拠にしない。
    private static readonly Dictionary<string, string> DarkColors = new(StringComparer.OrdinalIgnoreCase)
    {
        ["243d35"] = "e6ece3",
        ["263c32"] = "f0f3ea",
        ["586e63"] = "b0c0b3",
        ["bac9ba"] = "52685b",
        ["acbdad"] = "697767",
        ["fcfcf5"] = "2b3d34",
        ["f7f8f4"] = "202820",
        ["315849"] = "c6d9ba",
        ["345747"] = "c2d8ba",
        ["fffef5"] = "193224",
        ["ffffff"] = "20311e",
        ["f1f1e8"] = "1d2b27",
        ["e8eddf"] = "26362b",
        ["dce6d2"] = "213727",
        ["e9eee4"] = "303d2e",
        ["943c25"] = "ffc5a8",
        ["f2f5e9"] = "2b4336",
        ["294133"] = "e2ebdc",
        ["a8b9a5"] = "5c745c",
        ["e6eddf"] = "3a5043",
        ["244537"] = "dce8d2",
        ["58754a"] = "809c6b",
        ["846838"] = "dbbd78",
        ["faf8ed"] = "343d2b",
        ["f1ebd7"] = "3d442c",
        ["f5f7ee"] = "293b2d",
        ["e2e9d8"] = "2a3c2b",
        ["bdb69a"] = "4b5846",
        ["c4c2ac"] = "52614b",
        ["b3c4a4"] = "4e6545",
        ["e9eee0"] = "283d2e",
        ["f5eedb"] = "3d442c",
        ["f4f6ec"] = "26382e",
        ["283d3555"] = "09191088",
        ["883e20"] = "ffc4a8",
        ["f6e3d6"] = "513b2c",
        ["803d25"] = "ffcfb2",
        ["dfe4d3"] = "35452f",
        ["95b2ab"] = "2e4247",
        ["e9eed81a"] = "192a171a",
        ["e8edd933"] = "182a2755",
        ["dfe8d8"] = "354b3c",
        ["f2e6c8"] = "453b25",
        ["294e3c"] = "ebf2dc",
        ["faf9ef"] = "203027",
        ["f1f1e8a8"] = "1d2b27b0",
        ["bbc7bb"] = "52665b",
        ["d3dbcf"] = "40524a",
        ["42684a"] = "d9dfa6"
        ,["f3f5eb"] = "24362c", ["9aae98"] = "708968", ["c0ceb8"] = "4b6448", ["d1dbc8"] = "415b3e", ["586e50"] = "afc59f"
    };
    private Color UiColor(string value)
    {
        value = value.TrimStart('#');
        // 同じlight hexでもcp-paperとcj-paperのdark値は異なる。
        // 取得画面から開く共通menu/記録もcj。画面phaseだけの例外にしない。
        if (darkTheme && value == "fcfcf5") return new Color(ColorScope == "cp" ? "2b3d34" : "192a22");
        if (darkTheme && DarkColors.TryGetValue(value, out var dark)) return new Color(dark);
        if (darkTheme && value.Length == 8 && DarkColors.TryGetValue(value[..6], out var baseDark)) return new Color(baseDark + value[6..]);
        return new Color(value);
    }
    private void PrepareAcceptedStyle()
    {
        darkTheme = ThemeDarkOverride ?? NormalThemeIsDark(DisplayServer.IsDarkMode());
        // 現Windows/Edgeではsystem-uiがYu Gothic UIへ解決した。OSの同じfamilyを利用し、
        // 配布素材を追加せず既存NotoをOS側にfamilyが無い場合のfallbackとして保つ。
        var fallback = new FontVariation { BaseFont = GD.Load<Font>("res://Assets/NotoSansJP.ttf"), VariationOpentype = new Godot.Collections.Dictionary { [TextServerManager.GetPrimaryInterface().NameToTag("wght")] = 400 } };
        font = AcceptedSystemFont.Resolve("Yu Gothic UI", 400, 1, fallback);
        strongFont = AcceptedSystemFont.Resolve("Yu Gothic UI", 600, 2, fallback);
        var mincho = new SystemFont { FontNames = ["Yu Mincho", "serif"], FontWeight = 400, Fallbacks = [fallback] };
        serifFont = new SystemFont { FontNames = ["Georgia", "serif"], FontWeight = 400, Fallbacks = [mincho, fallback] };
        acceptedIcons = (JsonObject)JsonNode.Parse(Godot.FileAccess.GetFileAsString("res://Application/AcceptedIcons.json"))!;
    }
    internal object AcceptedFontEvidence()
    {
        object Resolved(Font f) => new
        {
            declared = f.GetFontName(),
            face = f is FontVariation v ? v.VariationFaceIndex : 0,
            rid_fonts = f.GetRids().Select(r => new { family = TextServerManager.GetPrimaryInterface().FontGetName(r), face = TextServerManager.GetPrimaryInterface().FontGetFaceIndex(r) }).ToArray(),
            term_width_16 = f.GetStringSize("次の行動まで", fontSize: 16).X
        };
        return new { body = Resolved(font), strong = Resolved(strongFont), serif = Resolved(serifFont) };
    }
    private StyleBoxFlat Box(string color, string? border = null, int width = 1, int radius = 5) => new()
    {
        BgColor = UiColor(color),
        BorderColor = UiColor(border ?? Line),
        BorderWidthBottom = width,
        BorderWidthTop = width,
        BorderWidthLeft = width,
        BorderWidthRight = width,
        CornerRadiusTopLeft = radius,
        CornerRadiusTopRight = radius,
        CornerRadiusBottomLeft = radius,
        CornerRadiusBottomRight = radius,
        ContentMarginLeft = 0,
        ContentMarginRight = 0,
        ContentMarginTop = 0,
        ContentMarginBottom = 0
    };
    private Panel Surface(Control parent, Rect2 rect, string color, string? border = null, int width = 0, int radius = 0, bool shadow = false)
    {
        var p = new Panel { Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore };
        var style = Box(color, border, width, radius);
        if (shadow) { style.ShadowColor = new Color(rect.Size.X >= 900 ? "00000033" : darkTheme ? "00000066" : "243a2b30"); style.ShadowSize = rect.Size.X >= 900 ? 30 : 12; style.ShadowOffset = new(0, rect.Size.X >= 900 ? 10 : 3); }
        p.AddThemeStyleboxOverride("panel", style); parent.AddChild(p); return p;
    }
    private void ButtonStyle(Button b, string background, string border, string ink, int width = 1, int radius = 5, string? hover = null)
    {
        foreach (var state in new[] { "normal", "pressed", "disabled" }) b.AddThemeStyleboxOverride(state, Box(background, border, width, radius));
        b.AddThemeStyleboxOverride("hover", Box(hover ?? "e6eddf", border, width, radius));
        // CSS :hoverは押下中も成立する。同じButtonへthemeを再設定しても、
        // signalは一度だけ結び、現在のnormal/hoverを参照してpressedへ渡す。
        if (!b.HasMeta("accepted_pressed_style"))
        {
            b.SetMeta("accepted_pressed_style", true);
            b.MouseEntered += () => { b.AddThemeStyleboxOverride("pressed", b.GetThemeStylebox("hover")); b.AddThemeStyleboxOverride("hover_pressed", b.GetThemeStylebox("hover")); };
            b.MouseExited += () => b.AddThemeStyleboxOverride("pressed", b.GetThemeStylebox("normal"));
        }
        b.AddThemeStyleboxOverride("pressed", b.GetThemeStylebox(b.IsHovered() ? "hover" : "normal"));
        b.AddThemeStyleboxOverride("hover_pressed", b.GetThemeStylebox("hover"));
        b.SetMeta("accepted_focus_radius", radius); ApplyFocusAppearance(b);
        foreach (var state in new[] { "font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color", "font_disabled_color" }) b.AddThemeColorOverride(state, UiColor(ink));
        foreach (var child in b.GetChildren())
        { if (child is Label label) label.AddThemeColorOverride("font_color", UiColor(ink)); else if (child is TextureRect icon) icon.Modulate = UiColor(ink); }
    }
    private StyleBoxFlat FocusBox(int radius)
    {
        if (!keyboardFocusVisible) return Box("ffffff00", width:0);
        // 現在の固定原本・Edgeの:focus-visibleを実採取した二層の輪郭。
        // 通常の枠やselectedを上書きせず、外側1pxの対照線も別に保つ。
        var focus = Box("ffffff00", "101010", 2, radius);
        focus.BorderColor = new Color("101010");
        focus.SetExpandMarginAll(1); return focus;
    }
    private void ApplyFocusAppearance(BaseButton button)
    {
        if (button is CheckBox) return; // checkboxはinput20pxだけに輪郭を付ける。
        int radius = button.HasMeta("accepted_focus_radius") ? (int)button.GetMeta("accepted_focus_radius") : 5;
        button.AddThemeStyleboxOverride("focus", FocusBox(radius));
        // StyleBoxのshadowは透明面の内部にも下地を描き、hoverの色を白く消す。
        // 白い対照線は影で代用せず、外側だけの別Panelとして描く。
        var outer = button.GetNodeOrNull<Panel>("FocusOuter");
        if (outer is null)
        { outer = new Panel { Name="FocusOuter", MouseFilter=MouseFilterEnum.Ignore }; button.AddChild(outer); }
        var contrast=Box("ffffff00",width:1,radius:radius+1);contrast.BorderColor=new Color("ffffff");
        outer.AddThemeStyleboxOverride("panel",contrast);
        outer.Position=new(-2,-2);outer.Size=button.Size+new Vector2(4,4);outer.Visible=keyboardFocusVisible&&button.HasFocus();
    }
    private void FocusInput(InputEvent input)
    {
        bool next = keyboardFocusVisible;
        if (input is InputEventKey { Pressed:true, Echo:false }) next = true;
        if (input is InputEventMouseButton { Pressed:true } mouse)
        {
            // keyboardで選択済みの同じ操作をクリックしても輪郭は維持する。
            // 別の操作をmouseで選ぶと、原本と同じくkeyboard輪郭を出さない。
            var owner = GetViewport().GuiGetFocusOwner();
            if (owner is null || !owner.GetGlobalRect().HasPoint(mouse.Position)) next = false;
        }
        if (next == keyboardFocusVisible) return;
        keyboardFocusVisible = next;
        foreach (var button in Controls.Values.OfType<BaseButton>()) ApplyFocusAppearance(button);
    }
    private void UpdateCheckboxFocus()
    {
        foreach (var button in Controls.Values.OfType<BaseButton>())
            if (button.GetNodeOrNull<Panel>("FocusOuter") is {} outer)
            { outer.Position=new(-2,-2);outer.Size=button.Size+new Vector2(4,4);outer.Visible=keyboardFocusVisible&&button.HasFocus(); }
        foreach (var box in Controls.Values.OfType<CheckBox>())
            if (box.GetNodeOrNull<Panel>("InputFocus") is { } outline)
            { outline.Visible = keyboardFocusVisible && box.HasFocus(); outline.AddThemeStyleboxOverride("panel", FocusBox(2)); }
    }
    // 原本と同じYu Gothic UIでも、Godotの自然baselineは今回の実測で3px下に出る。
    // 行box・Control・当たり判定を動かさず、同じfaceの描画baselineだけを補正する。
    // 64pxの札glyphやGeorgiaは別の役割なので、この測定値を流用しない。
    private Font LineBoxFont(Font face, int size)
    {
        if (OS.GetName() != "Windows" || size > 36) return face;
        if (!lineBoxFonts.TryGetValue((face, size), out var resolved))
            lineBoxFonts[(face, size)] = resolved = new FontVariation { BaseFont = face, BaselineOffset = -3f / face.GetHeight(size) };
        return resolved;
    }
    private Label Strong(Label label) { label.AddThemeFontOverride("font", LineBoxFont(strongFont, label.GetThemeFontSize("font_size"))); return label; }
    private void LineHeight(Label label, int size, float height)
    { label.AddThemeConstantOverride("line_spacing", (int)Math.Round(height - font.GetHeight(size))); }
    private Texture2D IconTexture(string name, float stroke = 2, int textureSize = 96)
    {
        string key = name + "/" + stroke + "/" + textureSize;
        if (iconTextures.TryGetValue(key, out var texture)) return texture;
        var nodes = acceptedIcons[name == "ChevronDown" ? "ChevronRight" : name] as JsonArray ?? throw new InvalidOperationException("原本SVG未登録: " + name);
        // 既存SVGのpath属性だけを読む。新規形状を推測して不足を隠さない。
        string xml = string.Join("", nodes.Select(n => { var a = (JsonArray)n!; var attrs = (JsonObject)a[1]!; return "<" + a[0] + " " + string.Join(" ", attrs.Select(k => k.Key + "=\"" + k.Value + "\"")) + "/>"; }));
        if (name == "ChevronDown") xml = "<g transform=\"rotate(90 12 12)\">" + xml + "</g>";
        var image = new Image(); var error = image.LoadSvgFromString("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + textureSize + "\" height=\"" + textureSize + "\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"" + stroke.ToString(System.Globalization.CultureInfo.InvariantCulture) + "\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + xml + "</svg>");
        if (error != Error.Ok) throw new InvalidOperationException("原本SVG読込み失敗: " + name);
        return iconTextures[key] = ImageTexture.CreateFromImage(image);
    }
    private TextureRect Icon(Control parent, string name, Rect2 rect, Color? color = null, float stroke = 2)
    {
        var t = new TextureRect
        {
            Texture = IconTexture(name, stroke),
            ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
            Position = rect.Position,
            Size = rect.Size,
            StretchMode = TextureRect.StretchModeEnum.KeepAspectCentered,
            Modulate = color ?? Ink,
            MouseFilter = MouseFilterEnum.Ignore
        }; t.SetMeta("accepted_icon", name); parent.AddChild(t); return t;
    }
    private Button IconButton(Control parent, string id, string name, string label, Rect2 rect, Action action, bool enabled = true)
    {
        var b = Button(parent, id, "", rect, action, enabled); b.TooltipText = label;
        // Button.Iconの端配置に任せず、原本のflex(center,gap8)を同じノードで表す。
        int size = id is "knowledge" or "menu" ? 18 : id == "discard" ? 22 : Screen == "preparation" ? 20 : 18;
        float textWidth = label.Length == 0 ? 0 : font.GetStringSize(label, fontSize: size).X;
        float x = (rect.Size.X - 20 - (label.Length == 0 ? 0 : 8 + textWidth)) / 2;
        Icon(b, name, new(x, (rect.Size.Y - 20) / 2, 20, 20));
        if (label.Length > 0) Text(b, label, new(x + 28, 0, textWidth, rect.Size.Y), size);
        return b;
    }
    private void GradientSurface(Control parent, Rect2 rect, Vector2 from, Vector2 to, string[] colors, float[] stops, float topRadius = 0)
    {
        var gradient = new Gradient { Colors = colors.Select(UiColor).ToArray(), Offsets = stops };
        var texture = new TextureRect
        {
            ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
            Position = rect.Position,
            Size = rect.Size,
            Texture = new GradientTexture2D { Width = (int)rect.Size.X, Height = (int)rect.Size.Y, Gradient = gradient, FillFrom = new(0, .5f), FillTo = new(1, .5f) },
            MouseFilter = MouseFilterEnum.Ignore
        };
        // GradientTexture2Dの内積はUV空間なので、横長札ではCSSの150degにならない。
        // 実pixel空間で投影し、stopの1次元色だけを読む。角のmaskも同じshader内で
        // 適用する。軸方向の多stop・透明度・宣言順は変更しない。
        var material = new ShaderMaterial { Shader = new Shader { Code = "shader_type canvas_item; uniform vec2 extent; uniform vec2 start; uniform vec2 finish; uniform float radius; void fragment(){vec2 p=UV*extent;vec2 d=finish-start;float t=clamp(dot(p-start,d)/dot(d,d),0.0,1.0);vec4 c=texture(TEXTURE,vec2(t,0.5));float x=min(p.x,extent.x-p.x);if(radius>0.0&&p.y<radius&&x<radius){float v=length(vec2(x-radius,p.y-radius));c.a*=1.0-smoothstep(radius-0.5,radius+0.5,v);}COLOR=c;}" } };
        material.SetShaderParameter("extent", rect.Size); material.SetShaderParameter("start", from * rect.Size); material.SetShaderParameter("finish", to * rect.Size); material.SetShaderParameter("radius", topRadius); texture.Material = material;
        parent.AddChild(texture);
    }
    private static void RoundTexture(TextureRect texture, float radius, bool whole = false)
    {
        // fragmentのCOLORにはGodotが既にTEXTUREを乗算している。もう一度sampleすると
        // 色が二乗され暗くなるので、既存のCOLORのalphaだけを切る。
        var shader = new Shader { Code = "shader_type canvas_item; uniform vec2 extent; uniform float radius; uniform bool whole; void fragment(){vec4 c=COLOR;vec2 p=UV*extent;float x=min(p.x,extent.x-p.x);float y=whole?min(p.y,extent.y-p.y):p.y;if(y<radius && x<radius){float d=length(vec2(x-radius,y-radius));c.a*=1.0-smoothstep(radius-0.5,radius+0.5,d);}COLOR=c;}" };
        var material = new ShaderMaterial { Shader = shader }; material.SetShaderParameter("extent", texture.Size); material.SetShaderParameter("radius", radius); material.SetShaderParameter("whole", whole); texture.Material = material;
    }
    private void CardGradient(Control parent, Rect2 rect, float radius)
    {
        // CSS 150degの線長は長方形の投影から決まる。正規化座標で単に斜めに結ぶと
        // 縦横比248:87で角度も端の色も変わるため、pixel空間で端点を求める。
        var direction = new Vector2(.5f, Mathf.Sqrt(3) / 2);
        float length = direction.X * rect.Size.X + direction.Y * rect.Size.Y;
        var delta = direction * length / 2 / rect.Size;
        GradientSurface(parent, rect, new Vector2(.5f, .5f) - delta, new Vector2(.5f, .5f) + delta, ["dfe4d3", "95b2ab"], [0, 1], radius);
    }
    private Control ReadingWindow(Control parent, Rect2 rect)
    {
        var panel = new Control { Position = rect.Position, Size = rect.Size, MouseFilter = MouseFilterEnum.Ignore }; parent.AddChild(panel);
        // 本文面の横gradientは背後全体の二層gradientと別に宣言されている。
        GradientSurface(panel, new(Vector2.Zero, rect.Size), new(0, .5f), new(1, .5f), ["f1f1e8e8", "f1f1e8b8", "f1f1e800"], [0, .85f, 1]);
        return panel;
    }
    private void ShellBars()
    {
        Surface(content, new(0, 0, InnerWidth, 64), "f1f1e8");
        Surface(content, new(0, 1014, InnerWidth, 64), "e9eee0");
        Surface(content, new(0, 63, InnerWidth, 1), "d3dbcf");
    }
    private Rect2 EdgeWindow(float width, float height, bool actor = false)
    {
        float x = detailOrigin.X - 1 < InnerWidth / 2 - .01 ? InnerWidth - 16 - width : 16;
        float y = actor ? 16 : Mathf.Clamp(detailOrigin.Y - 1, 16, 982 - 16 - height);
        return new(x, y, width, height);
    }
    // window-placement.jsの候補生成・重なり重み・宣言順をそのまま移す。
    // Rectは内側1918×1078座標。トリガーが窓の大きさを変えることはない。
    private Rect2 PlaceWindow(Rect2? anchor, float width = 520, float height = 480)
    {
        // 原本では探索／取得中のjourney headerがhiddenになり、共通窓の
        // source検索がその非表示headerへ当たるためanchorはnullになる。
        // 取得・探索の実共通navの位置を、原本にない窓anchorへ読み替えない。
        if ((Exploring || Screen == "preparation") && (Modal is "menu" or "knowledge" or "knowledge-card" or "help" or "history" or "save-data" || Modal == "settings" && !operationSettings)) anchor = null;
        const float margin = 16;
        var bounds = new Rect2(margin, margin, InnerWidth - 2 * margin, InnerHeight - 2 * margin);
        var avoids = new List<Rect2> { new(0, 0, InnerWidth, 64), new(0, 1014, InnerWidth, 64) };
        if (ExplorerUtilityWindow)
        {
            // 原本openPanelは探索内のutilityを未固定で開く。非表示の旧menuは
            // anchorにならず、見えている主体・操作dock・本人帯を避ける。
            anchor = null; avoids.Clear();
            foreach (string key in new[] { "actors", "preview" }) if (Controls.TryGetValue(key, out var control)) avoids.Add(new(control.GlobalPosition - Vector2.One, control.Size));
            avoids.Add(new(24, 982, 1870, 72));
        }
        var regions = new List<Rect2> { bounds };
        foreach (var b in (anchor is { } a ? new[] { a } : Array.Empty<Rect2>()).Concat(avoids))
        { regions.Add(new(bounds.Position.X, bounds.Position.Y, b.Position.X - margin - bounds.Position.X, bounds.Size.Y)); regions.Add(new(b.End.X + margin, bounds.Position.Y, InnerWidth - margin - b.End.X - margin, bounds.Size.Y)); regions.Add(new(bounds.Position.X, bounds.Position.Y, bounds.Size.X, b.Position.Y - margin - bounds.Position.Y)); regions.Add(new(bounds.Position.X, b.End.Y + margin, bounds.Size.X, InnerHeight - margin - b.End.Y - margin)); }
        Rect2 best = bounds; double score = double.PositiveInfinity;
        static double Overlap(Rect2 a, Rect2 b) => Math.Max(0, Math.Min(a.End.X, b.End.X) - Math.Max(a.Position.X, b.Position.X)) * Math.Max(0, Math.Min(a.End.Y, b.End.Y) - Math.Max(a.Position.Y, b.Position.Y));
        foreach (var r0 in regions)
        {
            var r = new Rect2(r0.Position.Max(bounds.Position), r0.End.Min(bounds.End) - r0.Position.Max(bounds.Position));
            if (r.Size.X < width || r.Size.Y < height) continue;
            foreach (float x in new[] { r.Position.X, r.Position.X + (r.Size.X - width) / 2, r.End.X - width }) foreach (float y in new[] { r.Position.Y, r.Position.Y + (r.Size.Y - height) / 2, r.End.Y - height })
            { var p = new Rect2(x, y, width, height); double s = (anchor is { } t ? Overlap(p, t) * 1000 : 0) + avoids.Sum(t => Overlap(p, t) * 10) + (anchor is { } q ? (Math.Abs(p.GetCenter().X - q.GetCenter().X) + Math.Abs(p.GetCenter().Y - q.GetCenter().Y)) * .01 : 0); if (s < score) { score = s; best = p; } }
        }
        return best;
    }
    private (Rect2 left, Rect2 right) WindowPair(Rect2 parent)
    {
        const float width = 520, height = 480, gap = 16, margin = 16;
        float x = Mathf.Clamp(parent.Position.X, margin, InnerWidth - margin - 2 * width - gap), y = Mathf.Clamp(parent.Position.Y, margin, InnerHeight - margin - height);
        return (new(x, y, width, height), new(x + width + gap, y, width, height));
    }
    private void Notice(string value)
    {
        float width = Math.Min(InnerWidth - 48, font.GetStringSize(value, fontSize: 18).X + 32);
        bool preparation = Screen == "preparation";
        float actualWidth=preparation?InnerWidth-48:width,padding=preparation?16:8;
        // 原本のmin-heightは複数行を切る固定高ではない。同じ公開messageを
        // 内容幅で折り、各27px line boxと上下paddingから面の高さを求める。
        string lines=ProseLines(value,actualWidth-32,18);float height=Math.Max(preparation?64:56,lines.Split('\n').Length*27+padding*2);
        var p = Surface(content, new(preparation ? 24 : (InnerWidth - width) / 2, preparation ? 76 : 72, actualWidth, height), preparation ? Paper : "f2e6c8", radius: 5, shadow: true);
        var shadow = (StyleBoxFlat)p.GetThemeStylebox("panel"); shadow.ShadowSize = preparation ? 18 : 10; shadow.ShadowOffset = new(0, preparation ? 4 : 2); shadow.ShadowColor = new(preparation ? "00000055" : darkTheme ? "00000066" : "243a2b30");
        var text=Text(p, lines, new(16, padding, p.Size.X - 32, p.Size.Y - padding*2), 18);text.AutowrapMode=TextServer.AutowrapMode.Off;LineHeight(text,18,27);
        Controls["notice"] = p;
    }
    private string MotionKey(CardTile tile) => tile.Zone == "offer" ? "offer-" + tile.Row.Text("id") :
        tile.Row.Flag("pending") ? "offer-" + tile.Row.Text("offer_id") : tile.Row.Text("id");
    private void RememberAcquisition()
    {
        motionOrigins.Clear();
        if (Screen != "preparation") return;
        foreach (var tile in Controls.Values.OfType<CardTile>().Where(t => IsInstanceValid(t) && !t.Ghost)) motionOrigins[MotionKey(tile)] = tile.GlobalPosition;
    }
    private async void AnimateAcquisition()
    {
        if (Screen != "preparation" || reducedMotion) return;
        var owner = content; var origins = new Dictionary<string, Vector2>(motionOrigins);
        // Containerの並べ直しはフレーム末。確定位置が決まってから差分をTweenへ渡す。
        await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
        if (!IsInstanceValid(owner) || owner != content) return;
        foreach (var tile in Controls.Values.OfType<CardTile>())
        {
            if (!IsInstanceValid(tile) || tile.Ghost || !origins.TryGetValue(MotionKey(tile), out var before)) continue;
            var after = tile.GlobalPosition; if (before.DistanceTo(after) < .5f) continue;
            tile.GlobalPosition = before;
            MotionEndsAt = Time.GetTicksMsec() + 200;
            // CSS ease-outのcubic-bezier(0,0,.58,1)を求める。GodotのCubic/Outとは
            // 別曲線なので、線形の時計を補間し、表示位置だけを200msで移す。
            tile.CreateTween().TweenMethod(Callable.From<float>(t =>
            {
                if (IsInstanceValid(tile)) tile.GlobalPosition = before.Lerp(after, CssEaseOut(t));
            }), 0f, 1f, .2);
        }
    }
    private static float CssEaseOut(float x)
    {
        float lo = 0, hi = 1, t = .5f;
        for (int i = 0; i < 18; i++)
        {
            t = (lo + hi) / 2; float inv = 1 - t;
            float bx = 3 * inv * t * t * .58f + t * t * t;
            if (bx < x) lo = t; else hi = t;
        }
        return 3 * (1 - t) * t * t + t * t * t;
    }
    internal void PaintTile(CardTile tile)
    {
        bool compact = tile.Size.Y < 100, empty = tile.Row.Flag("empty"), pending = tile.Row.Flag("pending"), forecast = tile.Row.Flag("forecast");
        string background = empty ? (compact ? "e2e9d8" : "e8eed345") : pending ? "faf8ed" : compact ? "fcfcf5" : "f7f8f4";
        // consumeは公開予測の「離れる」であり、原本のdata-changedとは別の状態。
        // 消滅の確定安全条件は変えず、danger線はchangedの時だけに使う。
        string border = pending ? "846838" : tile.Row.Flag("changed") ? "943c25" : tile.Selected || tile.Linked ? "345747" : compact && tile.Zone == "build" ? "58754a" : Line;
        var style = Box(tile.Hovered && !empty ? "e6eddf" : background, border, compact ? 2 : tile.Selected || tile.Linked ? 2 : 1, compact ? 5 : tile.Zone == "hand" ? 7 : 6);
        if (tile.Ghost) { style.ShadowColor = new("203a3540"); style.ShadowSize = 18; style.ShadowOffset = new(0, 6); }
        if (pending || forecast || empty && compact) style.BorderWidthBottom = style.BorderWidthTop = style.BorderWidthLeft = style.BorderWidthRight = 0;
        tile.DrawStyleBox(style, new(Vector2.Zero, tile.Size));
        if (pending)
        {
            // repeating-linear-gradient(135deg,...8px,...10px)の既存斜線。端は札内にclipする。
            float w = tile.Size.X - 4, h = tile.Size.Y - 4;
            for (float c = 9 * Mathf.Sqrt(2); c < w + h; c += 10 * Mathf.Sqrt(2))
            { var a = new Vector2(Math.Max(0, c - h), Math.Min(h, c)); var b = new Vector2(Math.Min(w, c), Math.Max(0, c - w)); tile.DrawLine(a + new Vector2(2, 2), b + new Vector2(2, 2), UiColor("f1ebd7"), 2, true); }
        }
        if (pending || forecast || empty && compact) DashedRect(tile, new(.5f, .5f, tile.Size.X - 1, tile.Size.Y - 1), UiColor(border), pending || forecast ? 2 : 1, 3, 3, compact ? 5 : 6);
    }
    private void LiveEvents()
    {
        eventLayer = new Control { Size = new(InnerWidth, InnerHeight), MouseFilter = MouseFilterEnum.Ignore }; content.AddChild(eventLayer); eventSignature = ""; UpdateLiveEvents();
    }
    private void CreateHoldCue()
    {
        holdCue = new Control { Size = new(32, 32), Visible = false, MouseFilter = MouseFilterEnum.Ignore, ZIndex = 1000 }; canvas!.AddChild(holdCue);
        // CSSのconic-gradient＋radial mask（51%→54%）を同じ32pxで描く。
        // これは入力を判定する時計ではなく、既存PointerGestureの進捗の描画だけ。
        holdRing = new ShaderMaterial { Shader = new Shader { Code = "shader_type canvas_item; uniform vec4 ink:source_color; uniform vec4 paper:source_color; uniform float progress; void fragment(){vec2 p=UV*32.0-16.0;float radius=length(p);float angle=mod(atan(p.x,-p.y)+6.2831853,6.2831853)/6.2831853;float alpha=smoothstep(22.627417*0.51,22.627417*0.54,radius)*(1.0-smoothstep(15.5,16.5,radius));COLOR=mix(paper,ink,step(angle,progress));COLOR.a*=alpha;}" } };
        holdRing.SetShaderParameter("ink", UiColor("294e3c")); holdRing.SetShaderParameter("paper", UiColor("faf9ef"));
        // 既存CSS filterの0,1,2px影を環の背面にも付ける。32pxの環の外に
        // 影を描けるよう40pxの透明面を使い、入力範囲は一切増やさない。
        var shadow = new ShaderMaterial { Shader = new Shader { Code = "shader_type canvas_item; float a(vec2 p){float r=length(p);return smoothstep(22.627417*0.51,22.627417*0.54,r)*(1.0-smoothstep(15.5,16.5,r));}void fragment(){vec2 p=UV*40.0-20.0-vec2(0,1);float alpha=(a(p)*4.0+a(p+vec2(1,0))*2.0+a(p-vec2(1,0))*2.0+a(p+vec2(0,1))*2.0+a(p-vec2(0,1))*2.0+a(p+vec2(1,1))+a(p+vec2(-1,1))+a(p+vec2(1,-1))+a(p+vec2(-1,-1)))/16.0;COLOR=vec4(0,0,0,alpha*.4);}" } };
        holdCue.AddChild(new ColorRect { Position = new(-4, -4), Size = new(40, 40), Material = shadow, MouseFilter = MouseFilterEnum.Ignore });
        holdCue.AddChild(new ColorRect { Size = new(32, 32), Material = holdRing, MouseFilter = MouseFilterEnum.Ignore });
        holdCaption = Surface(holdCue, new(0, 34, 60, 18), "faf9ef", radius: 3); var style = Box("faf9ef", "faf9ef", 0, 3); style.ShadowColor = new("00000066"); style.ShadowSize = 2; style.ShadowOffset = new(0, 1); holdCaption.AddThemeStyleboxOverride("panel", style);
        holdLabel = Strong(Text(holdCaption, "移動", new(4, 0, 52, 18), 12, UiColor("294e3c"))); LineHeight(holdLabel, 12, 18);
        Controls["hold-cue"] = holdCue; Controls["hold-cue-label"] = holdLabel;
    }
    private void UpdateHoldCue()
    {
        if (holdCue is null || !IsInstanceValid(holdCue)) return;
        holdCue.Visible = allowDrag && gesture.Mode == GestureMode.Pending && !verticalSwipe && Time.GetTicksMsec() - gestureStarted >= 120;
        if (!holdCue.Visible) return;
        var legal = View.Obj("exploration").Arr("legal_actions").Rows().Where(r => r.Text("card_id") == gestureRow.Text("id"));
        string label = gestureZone == "hand" ? ActionLabel(gestureRow, legal.FirstOrDefault(r => r.Text("target") == selectedTarget) ?? legal.FirstOrDefault()) : "移動";
        float w = strongFont.GetStringSize(label, fontSize: 12).X + 8, pad = Math.Max(25, (label.Length * 12 + 8) / 2 + 4);
        var center = (pointer + new Vector2(20, -20)).Clamp(new Vector2(pad + 1, pad + 1), new Vector2(1919 - pad, 1037));
        holdCue.Position = center - new Vector2(16, 16); holdCaption!.Position = new(16 - w / 2, 34); holdCaption.Size = new(w, 18); holdLabel!.Text = label; holdLabel.Size = new(w - 8, 18);
        holdRing!.SetShaderParameter("progress", Mathf.Clamp((Time.GetTicksMsec() - gestureStarted) / (float)holdMilliseconds, 0, 1));
    }
    private void UpdateLiveEvents()
    {
        if (eventLayer is null || !IsInstanceValid(eventLayer) || !Exploring) return;
        ulong now = Time.GetTicksMsec(); liveRows.RemoveAll(r => now - r.start >= 2800);
        if (eventQueue.Count > 0 && liveRows.Count < 2 && now >= nextEventAt) { liveRows.Insert(0, (eventQueue.Dequeue(), now)); nextEventAt = now + 260; }
        string signature = string.Join('/', liveRows.Select(r => r.start));
        if (eventSignature == signature) { for (int i = 0; i < eventLayer.GetChildCount(); i++) { var p = (Control)eventLayer.GetChild(i); ulong start = liveRows[i].start; p.Modulate = new(1, 1, 1, reducedMotion ? now - start < 1300 ? 1 : 0 : Mathf.Clamp(1 - (now - start - 1300f) / 1500, 0, 1)); } return; }
        eventSignature = signature; foreach (var child in eventLayer.GetChildren()) { eventLayer.RemoveChild(child); child.QueueFree(); }
        for (int i = 0; i < liveRows.Count; i++)
        {
            var (row, start) = liveRows[i]; string value = PublicEventText(row).Replace('\n', ' ');
            float timeWidth = Math.Max(font.GetStringSize("000", fontSize: 18).X, font.GetStringSize(row.Number("time").ToString(), fontSize: 18).X);
            float width = Math.Min(720, font.GetStringSize(value, fontSize: 18).X + timeWidth + 32);
            var p = Surface(eventLayer, new(InnerWidth - 40 - 720, InnerHeight - 440 - 36 - i * 40, width, 36), "f7f8f4", radius: 4);
            var time = Text(p, row.Number("time").ToString(), new(12, 4, timeWidth, 28), 18); time.HorizontalAlignment = HorizontalAlignment.Right; time.Modulate = new(1, 1, 1, .7f);
            var text = Text(p, value, new(20 + timeWidth, 4, width - 32 - timeWidth, 28), 18); text.TextOverrunBehavior = TextServer.OverrunBehavior.TrimEllipsis;
            p.Modulate = new(1, 1, 1, reducedMotion ? now - start < 1300 ? 1 : 0 : Mathf.Clamp(1 - (now - start - 1300f) / 1500, 0, 1));
        }
    }
    internal static void DashedRect(Control surface, Rect2 r, Color color, float width, float on = 6, float gap = 4, float radius = 0)
    {
        if (radius > 0)
        {
            // CSSの1px破線の丸角を連続した周長へ展開する。直角に4本の線を
            // 重ねて角だけ太くする方法を避け、empty/pendingの線幅を保つ。
            var points = new List<Vector2>();
            foreach (var (center, angle) in new[] { (new Vector2(r.End.X-radius, r.Position.Y+radius), -90f), (new Vector2(r.End.X-radius, r.End.Y-radius), 0f), (new Vector2(r.Position.X+radius, r.End.Y-radius), 90f), (new Vector2(r.Position.X+radius, r.Position.Y+radius), 180f) })
                for (int i=0;i<=8;i++) { float a=Mathf.DegToRad(angle+i*90f/8);points.Add(center+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius); }
            points.Add(points[0]); float distance=0;
            for(int i=1;i<points.Count;i++)
            {
                var a=points[i-1];var b=points[i];float length=a.DistanceTo(b),at=0;
                while(at<length) { float phase=distance%(on+gap),step=Math.Min(length-at,(phase<on?on:on+gap)-phase);if(step<.001f)step=Math.Min(length-at,.001f);if(phase<on)surface.DrawLine(a.Lerp(b,at/length),a.Lerp(b,(at+step)/length),color,width,true);at+=step;distance+=step; }
            }
            return;
        }
        for (float x = r.Position.X; x < r.End.X; x += on + gap) { surface.DrawLine(new(x, r.Position.Y), new(Math.Min(x + on, r.End.X), r.Position.Y), color, width, true); surface.DrawLine(new(x, r.End.Y), new(Math.Min(x + on, r.End.X), r.End.Y), color, width, true); }
        for (float y = r.Position.Y; y < r.End.Y; y += on + gap) { surface.DrawLine(new(r.Position.X, y), new(r.Position.X, Math.Min(y + on, r.End.Y)), color, width, true); surface.DrawLine(new(r.End.X, y), new(r.End.X, Math.Min(y + on, r.End.Y)), color, width, true); }
    }
    internal object MotionEvidence() => new
    {
        at_ms = Time.GetTicksMsec(),
        reduced_motion = reducedMotion,
        gesture = gesture.Mode.ToString(),
        hold_elapsed_ms = gesture.Mode == GestureMode.Idle ? 0 : Time.GetTicksMsec() - gestureStarted,
        hold_threshold_ms = holdMilliseconds,
        cue_delay_ms = 120,
        cue_visible = holdCue is not null && IsInstanceValid(holdCue) && holdCue.IsVisibleInTree(),
        tween_until_ms = MotionEndsAt,
        live_events = liveRows.Select(r => new { age_ms = Time.GetTicksMsec() - r.start, text = PublicEventText(r.row) }).ToArray(),
        live_opacity = eventLayer is null || !IsInstanceValid(eventLayer) ? [] : eventLayer.GetChildren().OfType<Control>().Select(p => p.Modulate.A).ToArray()
    };
}

/// <summary>背景を塗らず破線だけを描く装飾。公開値・入力・保存を持たない。</summary>
internal partial class AcceptedDashedBorder : Control
{
    internal Color Border;
    public override void _Draw() => GameScreen.DashedRect(this, new(.5f, .5f, Size.X - 1, Size.Y - 1), Border, 1, 3, 3);
}
