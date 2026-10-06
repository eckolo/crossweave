using Godot;
using System.Text.Json.Nodes;

namespace Crossweave.Application;

/// <summary>
/// 2026-10-06固定再判定に必要な実ノードの幅・状態・通知を検査する。
/// 通常Mainと合法保存を使う。display-only通知の差替と実保存中は別modeで記録し、
/// 規則・数値・通常セーブを加工しない。追加routeの候補を製品へ採用する検査ではない。
/// </summary>
internal sealed partial class UiAutomation
{
    private async Task FixedRecheck()
    {
        var dto=screen.Session!.ExportDto();var bytes=System.IO.File.ReadAllBytes(SavePath);long revision=screen.View.Number("revision");
        if(mode=="repro-saving")
        {
            // 既存のBeforeReplace待機を用い、Taskが生きたままの同じMainを描く。
            // 二度押しは実Buttonへの入力。fault解除後に一度のdepartだけ確定する。
            var departurePoint=await Point("depart");fault.Mode="busy-close";await Click("depart",false);
            for(int i=0;i<300&&!fault.Entered.IsSet;i++)await Frame();
            Check("actual-save-worker-is-pending",screen.Busy&&fault.Entered.IsSet);
            await Capture("saving");await Mouse(departurePoint,true);await Mouse(departurePoint,false);
            Check("saving-input-does-not-write-twice",screen.View.Number("revision")==revision&&bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
            fault.Mode="";fault.Resume.Set();await Idle();
            // この固定fixtureの探索先はSCN-001。出発後viewのcase投影を探して
            // 空の識別子を期待値にしない。入力した対象を独立に照合する。
            VerifyCommand(dto,"depart",new(){["case_id"]="SCN-001"});
            Check("one-depart-after-worker-release",screen.View.Number("revision")==revision+1);await Capture("saved");return;
        }
        if(mode=="repro-notice")
        {
            // 文言は既存の製品message。改行例はその二つを並べる表示部品の検査で、
            // 同時に二種類の保存失敗が起きたという意味ではない。
            foreach(var (name,value) in new[]{("single","保存された状態を読み直しました。前の要求を照合できます。"),("multi","保存された状態を読み直しました。前の要求を照合できます。\n現在の保存がありません。直前の完全な保存から復旧できます。\n保存の終了を待ってから閉じます。")})
            {screen.Message=value;await Click("menu");await CloseDetail();await Capture(name);var notice=screen.Controls["notice"];Check("notice-content-not-clipped-"+name,notice.Size.Y>=56, new{message=value,rect=notice.GetGlobalRect().ToString(),display_only=true});}
            screen.Message="";await Click("prepare");screen.Message="保存された状態を読み直しました。前の要求を照合できます。";await Click("menu");await CloseDetail();await Capture("preparation");
        }
        else if(mode=="repro-owned-review")
        {
            await Click("prepare");string tile=screen.Controls.Keys.First(k=>k.StartsWith("item-build-"));await Click(tile);await Capture("owned-unlocked");
            Check("owned-controls-preserved-await-layout-decision",screen.Controls.ContainsKey("lock")&&screen.Controls.ContainsKey("convert"));
            await CloseDetail();
        }
        else
        {
            var choice=screen.View.Obj("exploration").Arr("legal_actions").Rows().First();await Click("card-hand-"+choice.Text("card_id"));
            var numbers=Descendants(screen.Controls["detail-panel"]).OfType<Label>().Where(l=>l.HasMeta("ledger_inline_value")).ToArray();
            // LINQの遅延列挙を窓close後のReportへ持ち越すと解放済みLabelを読む。
            // 実ノードが生きているこの時点で値を配列へ固定する。
            Check("ledger-values-have-content-width-and-no-wrap",numbers.Length>0&&numbers.All(l=>l.Size.X>1&&l.AutowrapMode==TextServer.AutowrapMode.Off&&l.Size.Y<40),numbers.Select(l=>new{text=l.Text,rect=l.GetGlobalRect().ToString(),font_size=l.GetThemeFontSize("font_size")}).ToArray());
            await Capture("ledger");var pin=(Button)screen.Controls["window-pin"];
            await Move(new(960,570),pin.GetGlobalRect().GetCenter());await Capture("pin-hover");
            Check("pinned-hover-retains-active-surface",((StyleBoxFlat)pin.GetThemeStylebox("hover")).BgColor==((StyleBoxFlat)pin.GetThemeStylebox("normal")).BgColor);
            await CloseDetail();await Click("menu");await Click("deck");await Capture("deck-table");await CloseDetail();
        }
        Check("fixed-recheck-viewing-preserves-dto-rng-and-file",JsonNode.DeepEquals(dto.State,screen.Session.ExportDto().State)&&bytes.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
    }
}
