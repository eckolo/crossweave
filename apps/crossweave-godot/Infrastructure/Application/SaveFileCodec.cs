using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Crossweave.Core.Application;

namespace Crossweave.Infrastructure.Application;

/// <summary>
/// ファイルの外枠と、本編DTOの検証を担当する純.NETの処理。
/// FileVersionはこの外枠、ApplicationDto.FormatVersionはCoreの状態構造の版で、別々に扱う。
/// SHA256は偶発的な破損の検出用であり、秘密鍵を使う改ざん防止機能ではない。
/// </summary>
internal static class SaveFileCodec
{
    internal const string Kind = "crossweave.application.save";
    internal const int FileVersion = 1;
    internal const int MaxBytes = 64 * 1024 * 1024;

    internal static byte[] Encode(ApplicationDto dto)
    {
        ValidateDto(dto);
        var payload = JsonSerializer.SerializeToUtf8Bytes(dto);
        using var output = new MemoryStream();
        using (var writer = new Utf8JsonWriter(output))
        {
            writer.WriteStartObject();
            writer.WriteString("kind", Kind);
            writer.WriteNumber("fileVersion", FileVersion);
            writer.WriteString("writtenUtc", DateTimeOffset.UtcNow);
            writer.WriteString("payloadSha256", Convert.ToHexString(SHA256.HashData(payload)));
            // ハッシュを計算したバイトをそのまま格納する。整形してから読むと破損として検出する。
            writer.WritePropertyName("payload");
            writer.WriteRawValue(payload);
            writer.WriteEndObject();
        }
        if (output.Length > MaxBytes) throw new SaveException("save_too_large", "保存の上限64MiBを超えました。");
        return output.ToArray();
    }

    internal static SavedState Read(string path)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete);
        if (stream.Length > MaxBytes) throw new SaveException("save_too_large", "保存の上限64MiBを超えています。");
        var bytes = new byte[checked((int)stream.Length)];
        stream.ReadExactly(bytes);
        return Decode(bytes);
    }

    internal static SavedState Decode(byte[] bytes)
    {
        try
        {
            using var document = JsonDocument.Parse(bytes, new JsonDocumentOptions { MaxDepth = 128 });
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object) throw new JsonException("外枠がobjectではありません。");
            var names = root.EnumerateObject().Select(x => x.Name).ToArray();
            if (names.Length != names.Distinct(StringComparer.Ordinal).Count()) throw new JsonException("外枠に重複キーがあります。");
            if (root.GetProperty("kind").GetString() != Kind || root.GetProperty("fileVersion").GetInt32() != FileVersion)
                throw new SaveException("unsupported_file_version", "このアプリが対応していない保存形式です。元ファイルを保持します。");
            var payload = root.GetProperty("payload");
            var raw = Encoding.UTF8.GetBytes(payload.GetRawText());
            if (root.GetProperty("payloadSha256").GetString() != Convert.ToHexString(SHA256.HashData(raw)))
                throw new SaveException("checksum_mismatch", "保存内容のハッシュが一致しません。");
            var dto = payload.Deserialize<ApplicationDto>() ?? throw new JsonException("DTOがありません。");
            ValidateDto(dto);
            return new(dto, bytes);
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or FormatException or OverflowException)
        {
            throw new SaveException("invalid_save", "保存のJSONまたは構造を読み取れません。", ex);
        }
    }

    private static void ValidateDto(ApplicationDto dto)
    {
        if (dto.FormatVersion != GameApplication.DtoVersion)
            throw new SaveException("unsupported_dto_version", "本編DTOの版に対応していません。");
        try
        {
            // Core自身の札保存則・編成・領収等を再検査し、描画に必要なviewも構築できることを確認する。
            // 旧JS保存からの暗黙の変換や、壊れた値の補正は行わない。
            _ = GameApplication.Restore(dto).Inspect();
        }
        catch (RuleException ex) when (ex.Code == "unsupported_content_version")
        {
            throw new SaveException("unsupported_content_version", "規則／内容の版に対応していません。", ex);
        }
        catch (Exception ex) when (ex is RuleException or InvalidOperationException or InvalidCastException or ArgumentException or KeyNotFoundException or NullReferenceException or OverflowException)
        {
            throw new SaveException("invalid_application_state", "本編状態の整合性検査に失敗しました。", ex);
        }
    }

    internal static SaveFileStatus Diagnose(string path)
    {
        try { return new("ready", Read(path).Revision); }
        catch (FileNotFoundException) { return new("missing"); }
        catch (DirectoryNotFoundException) { return new("missing"); }
        catch (SaveException ex) { return new(ex.Code, Detail: ex.Message); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { return new("io_error", Detail: ex.Message); }
    }
}
