using System.Text.Json;
using Crossweave.Core.Application;
using Crossweave.Infrastructure.Application;

// 実ファイル・別プロセス検証専用のCLI。Godotの通常起動入口ではない。
// 引数: mode / 保存の絶対パス / 出力JSON(中断試験ではreadyファイル) / 追加引数。
// すべて外から指定した試験領域を使い、user://や利用者の既定保存は解決しない。
if (args.Length < 3) { Console.Error.WriteLine("mode absolute-save-path output-path [request-json|campaign-id] [fault-point]"); return 2; }
try
{
    var (mode, path, output) = (args[0], args[1], args[2]);
    if (mode == "diagnose") { Write(output, FileGameSession.Diagnose(path)); return 0; }
    ISaveFaults? fault = mode is "fault" or "create-fault" ? new PauseAt(Enum.Parse<SavePoint>(args[4]), output) : null;
    using var session = mode switch
    {
        "create" => FileGameSession.CreateNew(path, args.Length > 3 ? args[3] : null),
        "create-fault" => FileGameSession.CreateFromDto(path, GameApplication.Create(args[3]).ExportDto(), fault),
        "fault" => FileGameSession.Open(path, fault),
        _ => FileGameSession.Open(path)
    };
    if (mode == "hold") { Write(output, new { pid = Environment.ProcessId, locked = true }); new ManualResetEventSlim(false).Wait(); }
    CommandResult? result = null;
    if (mode is "execute" or "fault")
    {
        var command = JsonSerializer.Deserialize<GameCommand>(File.ReadAllText(args[3]))!;
        result = session.Execute(command);
    }
    if (mode is "fault" or "create-fault") throw new InvalidOperationException("指定した故障点へ到達しませんでした。");
    Write(output, new { pid = Environment.ProcessId, result, dto = session.ExportDto(), view = session.Inspect() });
    return 0;
}
catch (Exception ex)
{
    var code = ex is SaveException save ? save.Code : ex.GetType().Name;
    Write(args[2], new { error = code, detail = ex.Message, pid = Environment.ProcessId });
    return 7;
}

static void Write(string path, object value) => File.WriteAllText(path, JsonSerializer.Serialize(value));

// 試験親プロセスがreadyを読んでからこの子を強制終了する。
// 強制終了は.NETのfinallyを通らないので、実際の書込み途中の残物とOSロック解放を観測できる。
sealed class PauseAt(SavePoint point, string ready) : ISaveFaults
{
    public void Hit(SavePoint reached, string temporaryPath)
    {
        if (reached != point) return;
        File.WriteAllText(ready + ".writing", JsonSerializer.Serialize(new { pid = Environment.ProcessId, point = point.ToString(), temporaryPath }));
        File.Move(ready + ".writing", ready); // 親が存在を見た時点で通知JSONも完成している。
        new ManualResetEventSlim(false).Wait();
    }
}
