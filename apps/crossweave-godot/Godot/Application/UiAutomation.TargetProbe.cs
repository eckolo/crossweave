using Godot;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// 対象保持の回帰検査。固定oracle由来の合法fixtureを通常Mainと隔離セーブで開く。
/// 手札・相手・予測・詳細は実ControlへのInputEventで操作する。
/// reflectionはUI内部の選択と送信予定choiceを観測するためだけに使う。
/// 最後の主体離脱・候補ゼロだけは公開view投影の境界検査と明記し、実戦の合格に数えない。
/// </summary>
internal sealed partial class UiAutomation
{
    private static readonly BindingFlags TargetProbeFlags = BindingFlags.Instance | BindingFlags.NonPublic;
    private string TargetProbeText(string name) => (string)typeof(GameScreen).GetField(name, TargetProbeFlags)!.GetValue(screen)!;
    private JsonObject? TargetProbeChoice() => (JsonObject?)typeof(GameScreen).GetMethod("Choice", TargetProbeFlags)!.Invoke(screen, null);

    private async Task TargetProbe()
    {
        var before = screen.Session!.ExportDto();
        var file = System.IO.File.ReadAllBytes(SavePath);
        var exploration = screen.View.Obj("exploration");
        var hand = exploration.Arr("hand").Rows().ToArray();
        var legal = exploration.Arr("legal_actions").Rows().ToArray();
        var attack = hand.First(c => c.Text("kind") == "attack" && legal.Any(a => a.Text("card_id") == c.Text("id") && a.Text("target") != ""));
        var targetless = hand.Where(c => legal.Any(a => a.Text("card_id") == c.Text("id") && a.Text("target") == "")).ToArray();
        var actors = exploration.Obj("actors").Where(p => p.Key != "P" && p.Value.Flag("active")).ToArray();
        var passage = actors.First(p => p.Value.Text("purpose") == "passage").Key;
        var other = actors.First(p => p.Key != passage).Key;
        Check("target-fixture-multiple-actors-and-targetless-cards", actors.Length >= 2 && targetless.Length > 0);
        Check("target-initial-passage", TargetProbeText("selectedTarget") == passage);

        var steps = new JsonArray();
        void Record(string name)
        {
            steps.Add(new JsonObject { ["step"] = name, ["selected_card"] = TargetProbeText("selectedCard"),
                ["selected_target"] = TargetProbeText("selectedTarget"), ["modal"] = screen.Modal,
                ["choice"] = TargetProbeChoice()?.Copy(), ["revision"] = screen.View.Number("revision") });
        }
        // 非通路と通路の両方を明示選択する。予測窓を開かない切替と、開いた後の復帰を同じ入力で区別する。
        foreach (var target in new[] { other, passage })
        foreach (var card in targetless)
        {
            string key = target + "-" + card.Text("id");
            await Click("card-hand-" + attack.Text("id"));
            await Click("actor-" + target);
            Check("target-selected-" + key, TargetProbeText("selectedTarget") == target && TargetProbeChoice()?.Text("target") == target);
            await Click("card-hand-" + card.Text("id"));
            Record("targetless-before-preview-" + key);
            Check("target-retained-before-preview-" + key, TargetProbeText("selectedTarget") == target);
            Check("targetless-choice-stays-null-" + key, TargetProbeChoice() is { } c && c["target"] is null);
            if (screen.Controls.ContainsKey("card-forecast-" + card.Text("id")))
            {
                await Click("card-forecast-" + card.Text("id"));
                Check("target-forecast-detail-retains-selection-" + key,
                    TargetProbeText("selectedCard") == card.Text("id") && TargetProbeText("selectedTarget") == target && TargetProbeChoice()?["target"] is null);
                await Click("card-forecast-" + card.Text("id"));
                Check("target-forecast-detail-close-retains-selection-" + key, TargetProbeText("selectedTarget") == target);
            }
            await Click("preview");
            Check("target-prediction-open-" + key, screen.Modal == "prediction" && TargetProbeText("selectedTarget") == target);
            await Click("card-hand-" + attack.Text("id"));
            Record("matched-return-" + key);
            Check("target-restored-attack-choice-" + key, TargetProbeText("selectedTarget") == target && TargetProbeChoice()?.Text("target") == target);
        }
        Check("target-selection-does-not-commit", JsonNode.DeepEquals(before.State, screen.Session.ExportDto().State) && file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        TargetProjectionBoundaries(other, passage);
        System.IO.File.WriteAllText(System.IO.Path.Combine(output, "target-selection-steps.json"), steps.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        Report("passed");
    }

    private void TargetProjectionBoundaries(string other, string passage)
    {
        // 本体の状態・セーブを編集せず、公開viewに主体離脱が届いた場合のUI境界だけを検査する。
        // 途中で失敗してもfinallyで元のviewと選択を戻し、通常画面への影響を残さない。
        var property = typeof(GameScreen).GetProperty("View", TargetProbeFlags)!;
        var target = typeof(GameScreen).GetField("selectedTarget", TargetProbeFlags)!;
        var retain = typeof(GameScreen).GetMethod("RetainPublicTarget", TargetProbeFlags)!;
        var original = screen.View;
        var previous = TargetProbeText("selectedTarget");
        try
        {
            var departed = original.Copy();
            departed.Obj("exploration").Obj("actors").Obj(other)["active"] = false;
            var remaining = new JsonArray(departed.Obj("exploration").Arr("legal_actions").Rows().Where(a => a.Text("target") != other).Select(a => (JsonNode)a.Copy()).ToArray());
            departed.Obj("exploration")["legal_actions"] = remaining;
            property.SetValue(screen, departed); target.SetValue(screen, other); retain.Invoke(screen, null);
            Check("target-projection-departed-moves-to-passage", TargetProbeText("selectedTarget") == passage);
            foreach (var actor in departed.Obj("exploration").Obj("actors").Where(p => p.Key != "P")) actor.Value!["active"] = false;
            departed.Obj("exploration")["legal_actions"] = new JsonArray();
            retain.Invoke(screen, null);
            Check("target-projection-no-candidates-is-empty", TargetProbeText("selectedTarget") == "");
        }
        finally { property.SetValue(screen, original); target.SetValue(screen, previous); }
    }
}
