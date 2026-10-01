using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>公開viewを読む表示用の補助。ゲームの計算・保存DTOの解釈をここへ追加しない。</summary>
internal static class ViewData
{
    internal static JsonObject Obj(this JsonNode? n, string key) => n?[key] as JsonObject ?? new();
    internal static JsonArray Arr(this JsonNode? n, string key) => n?[key] as JsonArray ?? new();
    internal static string Text(this JsonNode? n, string key = "") => (key == "" ? n : n?[key])?.ToString() ?? "";
    internal static long Number(this JsonNode? n, string key) => long.TryParse(n.Text(key), out var v) ? v : 0;
    internal static bool Flag(this JsonNode? n, string key) => n?[key] is JsonValue v && v.TryGetValue<bool>(out var b) && b;
    internal static JsonObject Copy(this JsonObject n) => (JsonObject)n.DeepClone();
    internal static IEnumerable<JsonObject> Rows(this JsonArray n) => n.OfType<JsonObject>();
    internal static string[] Strings(this JsonArray n) => n.Select(x => x?.ToString() ?? "").ToArray();
    internal static JsonArray Array(IEnumerable<string> values) => new(values.Select(x => (JsonNode?)JsonValue.Create(x)).ToArray());
    internal static string Money(long units) => (units / 100m).ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);

    // エラーコードは開発者ログに残し、画面は利用者が次の操作を判断できる説明にする。
    internal static string Explain(string code) => code switch
    {
        "save_in_use" => "ほかの起動中の画面がこの保存を使っています。そちらを終了してから、もう一度読み込んでください。",
        "missing" => "保存がありません。新しく始めることができます。",
        "checksum_mismatch" or "invalid_save" or "invalid_application_state" => "保存を正しく読み取れません。元のファイルを保持しています。直前の保存があれば復旧できます。",
        "unsupported_file_version" or "unsupported_dto_version" or "unsupported_content_version" or "unsupported_recovery" => "この版では扱えない保存です。対応するアプリの版で開いてください。上書きはしていません。",
        "commit_boundary_failed" => "保存できませんでした。今回の操作は確定していません。変更案は残っています。同じ操作を再試行できます。",
        "commit_outcome_unknown" => "保存されたか確認できないため操作を停止しました。読み直して、保存された状態と照合してください。",
        "stale_revision" or "stale_view" or "request_conflict" => "表示と保存の状態が一致しません。読み直して選び直してください。変更案へ新しい識別子だけを付け直すことはしません。",
        "insufficient_funds" or "insufficient_unspent_funds" => "着想が不足しています。取得予定を減らすか、今回は編成だけを変更してください。",
        "invalid_deck_size" or "deck_size" => "札組の枚数が揃っていません。所持から編成して確認してください。",
        "equipment_capacity_exceeded" => "心得の使用枠が上限を超えています。心得を外して確認してください。",
        "dirty_draft" => "未確定の変更があります。確認して確定するか、変更を戻してから出発してください。",
        "item_in_use" => "編成中、または保存済みの案で使っているため変換できません。",
        "item_locked" => "ロックしているため変換できません。",
        "initial_grant_not_convertible" => "初期所持の札は変換できません。",
        "offer_group_limit" or "acquisition_group_limit" => "この取得群の上限を超えています。取得予定を減らしてください。",
        "deck_base_cap_exceeded" => "同じ基本札の編成上限を超えています。別の札に替えて確認してください。",
        _ => "この操作を確定できません。選択内容または保存先の空き容量・アクセス状態を確認してください。"
    };
}
