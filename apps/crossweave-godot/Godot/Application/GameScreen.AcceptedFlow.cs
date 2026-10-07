using Godot;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>本文の同じ文字・読了IDを保持した改行と、合意された起動・帰還の組版。</summary>
public partial class GameScreen
{
    private string ProseLines(string text, float width, int fontSize = 20)
    {
        if (text.Contains('\n')) return string.Join('\n', text.Split('\n').Select(line => ProseLines(line, width, fontSize)));
        // 原本prose-layout.jsの句点優先・禁則・grapheme単位の分割。文字やreceipt IDは変えない。
        var chars = new List<string>(); var enumerator = StringInfo.GetTextElementEnumerator(text); while (enumerator.MoveNext()) chars.Add(enumerator.GetTextElement());
        var lines = new List<string>(); int start = 0;
        while (start < chars.Count)
        {
            int lo = 1, hi = chars.Count - start, fit = 1;
            while (lo <= hi) { int n = (lo + hi) / 2; string value = string.Concat(chars.Skip(start).Take(n)); if (font.GetStringSize(value, fontSize: fontSize).X <= width - .5f) { fit = n; lo = n + 1; } else hi = n - 1; }
            if (start + fit == chars.Count) { lines.Add(string.Concat(chars.Skip(start))); break; }
            int sentence = 0, comma = 0;
            for (int n = 1; n <= fit; n++) { string ch = chars[start + n - 1]; if (!Regex.IsMatch(ch, "[。！？、，,]")) continue; int end = n; while (start + end < chars.Count && Regex.IsMatch(chars[start + end], "[）」』】〕］｝〉》]")) end++; if (end > fit) continue; if (Regex.IsMatch(ch, "[。！？]")) sentence = end; else comma = end; }
            int cut = sentence > 0 ? sentence : comma > 0 ? comma : fit;
            if (sentence == 0 && comma == 0) while (cut > 1 && (Regex.IsMatch(chars[start + cut], "^[、。，．！？!?）」』】〕］｝〉》ーぁぃぅぇぉっゃゅょァィゥェォッャュョ]") || Regex.IsMatch(chars[start + cut - 1], "[（「『【〔［｛〈《]$"))) cut--;
            lines.Add(string.Concat(chars.Skip(start).Take(cut))); start += cut;
        }
        return string.Join('\n', lines);
    }
    private void AcceptedStartScreen()
    {
        Strong(Text(content, "crossweave", new(24, 4, 800, 56), 24));
        var brand = Text(content, "crossweave", new(0, 519, InnerWidth, 40), 28); brand.HorizontalAlignment = HorizontalAlignment.Center;
        brand.SetMeta("metric_face",spacedSerifFont);LineHeight(brand,28,33.6f);
        bool empty = diagnosis?.Primary.Code == "missing" && diagnosis.Backup.Code == "missing" && diagnosis.PendingFiles.Length == 0;
        bool recover = diagnosis?.Backup.Code == "ready" && diagnosis.Primary.Code != "ready" && !diagnosis.Primary.Code.StartsWith("unsupported_");
        var actions = new List<(string id, string label, Action action, bool enabled)>{
            ("new","新しく始める",()=>Open(create:true),empty),
            ("open","続きから",()=>Open(),diagnosis?.Primary.Code=="ready"),
            ("diagnose","もう一度確認",Diagnose,true)};
        if (recover) actions.Add(("recover", "直前の保存から復旧", () => Modal = "recover", true));
        if (diagnosis?.Primary.Code == "missing" && diagnosis.Backup.Code == "missing" && diagnosis.PendingFiles.Length > 0) actions.Add(("archive", "中断した新規作成を退避", () => Modal = "archive", true));
        // 起動の原本は下端の中央にcontent幅の操作群を置く。Windows固有の復旧等も
        // 同じ群へ入り、操作の契約・有効条件は既存の診断結果をそのまま使う。
        float x = (InnerWidth - actions.Sum(a => font.GetStringSize(a.label, fontSize: 18).X + 32) - 16 * (actions.Count - 1)) / 2;
        foreach (var a in actions) { float width = font.GetStringSize(a.label, fontSize: 18).X + 32; Button(content, a.id, a.label, new(x, 1018, width, 56), a.action, a.enabled); x += width + 16; }
    }
    private void AcceptedHomeScreen()
    {
        Button(content, "prepare", "編成", new(24, 4, 96, 56), () => { Screen = "preparation"; RefreshComparison(); }); Strong(Text(content, "探索先", new(136, 4, 800, 56), 24));
        CompactHeaderWallet();
        string prose = string.Join("\n", View.Obj("story").Arr("texts").Rows().Where(t => t.Text("kind") == "objective").Select(t => t.Text("short_text"))); int lines = ProseLines(prose, 840).Split('\n').Length; float proseHeight = lines * 34, height = 27 + 12 + 48 + 12 + proseHeight, y = 978 - height;
        Text(content, View.Obj("case").Text("status") == "resolved" ? "踏破済み" : "探索先", new(40, y, 840, 27), 18, Muted);
        var heading = Text(content, "夜潮の排水路", new(40, y + 39, 760, 48), 32); Strong(heading); float headingWidth = strongFont.GetStringSize(heading.Text, fontSize: 32).X;
        Button(content, "story-detail", "詳細", new(40 + headingWidth + 8, y + 41, 60, 44), () => OpenModal("story-detail"));
        StoryReader(content, "home-prose", new(40, y + 99, 840, proseHeight), false);
        Text(content, "夜潮の排水路", new(1500, 1018, 318, 56), 20).HorizontalAlignment = HorizontalAlignment.Right;
        Button(content, "depart", "出発", new(1824, 1018, 72, 56), () => Send("depart", new() { ["case_id"] = "SCN-001" }), Can("depart") && !DraftDirty);
        if (DraftDirty) Text(content, "編成に未確定の変更があります。", new(1000, 1018, 490, 56), 18, Muted);
    }
    private void AcceptedReturnScreen()
    {
        var r = View.Obj("return"); string outcome = r.Text("outcome") switch { "clear" => "踏破", "withdrawal" => "撤退", _ => "緊急脱出" }; var title = Text(content, outcome, new(24, 4, 900, 56), 24);title.SetMeta("metric_face",spacedSerifFont); LineHeight(title, 24, 28.8f); CompactHeaderWallet();
        // panels.returnViewの三行集計。本文や結果の見出しを独自に増やさず下端へ揃える。
        float bottom = 994, y = bottom - 165.4f; var summary = new Control { Position = new(24, y), Size = new(900, 165.4f), MouseFilter = MouseFilterEnum.Ignore }; content.AddChild(summary);
        Icon(summary, "Lightbulb", new(0, 11.2f, 16, 16)); Text(summary, "着想", new(22, 7, 40, 30), 20);
        string amount = "+" + ViewData.Money(r.Number("gained_units")); float amountWidth = serifFont.GetStringSize(amount, fontSize: 32).X;
        // CSSは異なるfontをbaselineで並べる。数値の自然高がline boxより高い場合も
        // 半行余白を配分し、Labelの最小高によって集計の一行目を下へ押し下げない。
        float moneyHeight = MathF.Ceiling(serifFont.GetHeight(32));
        var money = Text(summary, amount, new(68, (38.4f-moneyHeight)/2, amountWidth, moneyHeight), 32, UiColor("42684a"));money.SetMeta("metric_face",serifFont); LineHeight(money, 32, 38.4f);
        Text(summary, "計 " + ViewData.Money(r.Number("unspent_after_units")), new(74 + amountWidth, 16, 200, 18), 12, Muted);
        Text(summary, "余力 " + r.Number("expedition_end_hp") + " → " + r.Number("home_hp"), new(0, 46.4f, 850, 30), 20);
        var materials = r.Arr("kept_items").Rows().Where(x => x.Text("kind") != "points").ToArray();
        string material = materials.Length == 1 ? "素材 " + materials[0].Text("type") + " +" + materials[0].Number("amount") : "素材 " + materials.Length + "種";
        string items = material + "　記録 +" + r.Arr("new_unlocks").Count + (r.Arr("lost_items").Count > 0 ? "　喪失 " + r.Arr("lost_items").Count : "");
        Text(summary, items, new(0, 84.4f, 850, 27), 18); var receipt = Button(summary, "receipt", "詳細", new(0, 119.4f, 68, 46), () => OpenModal("receipt")); receipt.AddThemeFontSizeOverride("font_size",20); ButtonStyle(receipt, Paper, Line, "243d35", radius:6);
        float readingHeight = Math.Min(360, ProseHeight(792) + 48); var reading = ReadingWindow(content, new(1054, bottom - readingHeight, 840, readingHeight)); StoryReader(reading, "return-prose", new(24, 24, 792, readingHeight - 48), false);
        Button(content, "story-detail", "本文の詳細", new(24, 1018, 136, 56), () => OpenModal("story-detail"));
        if (Can("continue_scene")) Button(content, "continue", "進む", new(1828, 1018, 68, 56), () => ContinueStory(true)); else Button(content, "ack", "進む", new(1828, 1018, 68, 56), () => { departAfterReturn = false; Send("ack_return"); }, Can("ack_return"));
    }
    private float ProseHeight(float width)
    {
        var rows = StoryRows(false).ToArray(); return rows.Sum(r => ProseLines(r.Text("short_text"), width - 12).Split('\n').Length * 34) + Math.Max(0, rows.Length - 1) * 14;
    }

    private void CompactHeaderWallet()
    {
        string balance = ViewData.Money(View.Obj("home").Obj("economy").Number("unspent_units")); float width = font.GetStringSize(balance, fontSize: 18).X;
        Icon(content, "Lightbulb", new(1662 - width - 24, 23, 16, 16)); Text(content, balance, new(1662 - width, 4, width, 56), 18);
    }

    private IEnumerable<JsonObject> StoryRows(bool optional)
    {
        var story = View.Obj("story"); var scene = story.Obj("scene");
        if (Screen == "home") return story.Arr("texts").Rows().Where(t => t.Text("kind") == "objective");
        var ids = scene.Arr(optional ? "optional_text_ids" : "text_ids").Strings().ToHashSet();
        if (!optional) ids.UnionWith(scene.Arr("optional_text_ids").Strings());
        // Inspectは現在の目的も添えるが、原本sceneCopyはsceneのIDだけを表示する。
        // 表示されない目的を本文へ混ぜると高さと読了候補を増やしてしまう。
        return story.Arr("texts").Rows().Where(t => ids.Contains(t.Text("id")));
    }
}
