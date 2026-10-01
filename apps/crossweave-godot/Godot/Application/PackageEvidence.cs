using Godot;
using System.Diagnostics;
using System.Security.Cryptography;
using Crossweave.Core.Application;

namespace Crossweave.Application;

/// <summary>
/// 隔離した配布検査だけで、実際にロードしたruntime・資源の所在を記録する。
/// 生成ファイルが存在するだけでなく、展開先から読めたことを確認側へ渡す。
/// 通常起動からは呼ばない。物理入力・GPU性能の合格判定もしない。
/// </summary>
internal static class PackageEvidence
{
    internal static object Read()
    {
        var assembly = typeof(GameApplication).Assembly;
        var resources = assembly.GetManifestResourceNames().Order().Select(name =>
        {
            using var stream = assembly.GetManifestResourceStream(name)!;
            return new { name, sha256 = Convert.ToHexStringLower(SHA256.HashData(stream)) };
        }).ToArray();
        var images = new[] { "antique-shop.webp", "night-tide.webp", "diver-placeholder.webp" }.Select(name =>
        {
            var path = "res://Assets/Application/" + name;
            var texture = GD.Load<Texture2D>(path) ?? throw new IOException("Missing packaged texture: " + path);
            return new { path, width = texture.GetWidth(), height = texture.GetHeight() };
        }).ToArray();
        var font = GD.Load<Font>("res://Assets/NotoSansJP.ttf");
        // .NETがロードしたネイティブCLRを列挙し、CIのグローバルSDK利用と区別する。
        var modules = Process.GetCurrentProcess().Modules.Cast<ProcessModule>()
            .Where(m => new[] { "coreclr.dll", "hostfxr.dll", "hostpolicy.dll" }.Contains(m.ModuleName.ToLowerInvariant()))
            .Select(m => new { name = m.ModuleName, path = m.FileName }).ToArray();
        return new
        {
            executable = OS.GetExecutablePath(), app_base = AppContext.BaseDirectory,
            core_library = typeof(object).Assembly.Location, application_core = assembly.Location,
            modules, resources, images,
            japanese_glyphs = "取得編成着想探索撤退保存復旧".All(c => font.HasChar(c)),
            normal_save_path = ProjectSettings.GlobalizePath("user://saves/local/m1.json"),
            save_file_version = 1,
            note = "Windows CI with installed SDK; actual loaded modules checked against extracted package"
        };
    }
}
