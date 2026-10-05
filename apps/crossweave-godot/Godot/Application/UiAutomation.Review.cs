using Godot;
using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Nodes;
using Crossweave.Core.Application;
using Crossweave.Infrastructure.Application;

namespace Crossweave.Application;

/// <summary>
/// R01〜R07／U01の限定入力。固定oracleの合法状態を復元し、通常sceneと隔離保存で確認する。
/// 数値や規則は書き換えない。fixtureのschema表記だけ既存C#接続と同じ形式へ置き換える。
/// </summary>
internal sealed partial class UiAutomation
{
    private static readonly string[] ReviewModes=["review-fixtures","review-scroll-prep","review-scroll-hand","review-scroll-field","review-safety-consume","review-safety-doomed","review-safety-filler","review-safety-quick","review-safety-off","review-safety-matched","review-prediction-place","review-prediction-attack","review-prediction-guard","review-prediction-heal","review-prediction-defense_support","review-order-tie","review-order-different","review-details-unlimited","review-preparation","review-destination","review-destination-field","review-resume"];
    private JsonObject? reviewFixture;
    private void LoadReviewFixture(string path)
    {
        reviewFixture=(JsonObject)JsonNode.Parse(System.IO.File.ReadAllText(path))!;
        var dto=JsonSerializer.Deserialize<ApplicationDto>(reviewFixture["dto"]!.ToJsonString())!;
        using var created=FileGameSession.CreateFromDto(SavePath,dto);
    }
    private async Task GenerateReviewFixtures()
    {
        using var file=System.IO.File.OpenRead(System.IO.Path.GetFullPath(System.IO.Path.Combine(ProjectSettings.GlobalizePath("res://"),"../Tests/Fixtures/application-oracle.json.br")));
        using var stream=new BrotliStream(file,CompressionMode.Decompress);
        var oracle=(JsonObject)JsonNode.Parse(stream)!;
        var found=new Dictionary<string,JsonObject>();
        var counts=new Dictionary<string,int>();
        var branchSeeds=new List<(ApplicationDto dto,string record,int step)>();
        void Save(string name,GameApplication app,JsonObject? choice,string source,int index,int score=0)
        {
            if(found.ContainsKey(name)&&counts.GetValueOrDefault(name)>=score)return;
            counts[name]=score;
            var view=app.Inspect();
            found[name]=new JsonObject{["source_record"]=source,["source_step"]=index,["dto"]=JsonSerializer.SerializeToNode(app.ExportDto()),["choice"]=choice?.Copy(),["public_view"]=view.Copy(),["preview"]=choice is null?null:app.PreviewAction(view.Number("revision"),view.Text("view_token"),choice)};
        }
        foreach(var record in oracle.Arr("records").Rows())
        {
            var state=record.Obj("initial").Copy();int index=-1;
            foreach(var step in new JsonObject?[]{null}.Concat(record.Arr("steps").Rows()))
            {
                if(step is not null)Delta(state,step.Arr("expected_delta"));index++;
                var adapted=state.Copy();adapted["schema"]="CW-CSharp-application-1";adapted["engine_version"]="CW-CSharp-core-1";
                var app=GameApplication.Restore(new(1,adapted.Text("rule_set_id"),adapted.Text("content_set_id"),adapted));var view=app.Inspect();
                if(view.Text("phase")=="home")
                {
                    var home=view.Obj("home");int score=home.Arr("owned").Count+home.Arr("acquisition").Count;
                    Save("review-scroll-prep",app,null,record.Text("name"),index,score);
                    if(home.Arr("acquisition").Rows().Count(r=>r.Text("group_id")=="return-offer")>1)Save("review-preparation",app,null,record.Text("name"),index,score+(int)home.Obj("economy").Number("unspent_units"));
                }
                var e=view.Obj("exploration");
                if(view.Text("phase")!="exploring"||view.Obj("story").Obj("scene").Flag("paused"))continue;
                if(record.Text("name")=="natural")branchSeeds.Add((app.ExportDto(),record.Text("name"),index));
                Save("review-scroll-hand",app,null,record.Text("name"),index,e.Arr("hand").Count);
                Save("review-scroll-field",app,null,record.Text("name"),index,e.Obj("field").Count);
                foreach(var choice in e.Arr("legal_actions").Rows())
                {
                    var p=app.PreviewAction(view.Number("revision"),view.Text("view_token"),choice);if(!p.Flag("ok"))continue;
                    Save("review-prediction-"+p.Text("mode"),app,choice,record.Text("name"),index,p.Arr("expired").Count+(int)p.Number("hit_gain"));
                    if(p.Text("mode")!="place")Save("review-safety-matched",app,choice,record.Text("name"),index);
                    if(e.Arr("hand").Rows().Any(c=>c.Text("kind")=="guard"&&c.ContainsKey("defense_uses")&&c["defense_uses"] is null))Save("review-details-unlimited",app,choice,record.Text("name"),index);
                    bool tie=p.Arr("current_reservations_after").Rows().Any(r=>r.Text("actor_id")!="P"&&r.Number("at")==p.Number("next_self_reservation"));
                    Save(tie?"review-order-tie":"review-order-different",app,choice,record.Text("name"),index);
                    if(p.Text("mode")=="place")
                    {
                        var expired=e.Arr("hand").Rows().Where(c=>p.Arr("expired").Strings().Contains(c.Text("id"))).ToArray();
                        if(expired.Any(c=>c.Flag("consume_on_recover")))Save("review-safety-consume",app,choice,record.Text("name"),index);
                        if(expired.Any(c=>c.Flag("doomed"))&&!expired.Any(c=>c.Flag("consume_on_recover")))Save("review-safety-doomed",app,choice,record.Text("name"),index);
                        if(expired.Any(c=>c.Text("birth")=="filler")&&!expired.Any(c=>c.Flag("consume_on_recover")))Save("review-safety-filler",app,choice,record.Text("name"),index);
                        if(!expired.Any(c=>c.Flag("consume_on_recover")||c.Flag("doomed")||c.Text("birth")=="filler")){Save("review-safety-quick",app,choice,record.Text("name"),index);Save("review-safety-off",app,choice,record.Text("name"),index);}
                    }
                }
            }
        }
        // oracleに含まれない補充札の設置分岐だけ、固定状態から合法commandを分岐する。
        // Coreへ通常のExecuteを送るため、生成・配札・期限の数値を検査側で改変しない。
        int searched=0;
        for(int trial=0;trial<32&&!found.ContainsKey("review-safety-filler");trial++)
        {
            var seed=branchSeeds[(trial*7)%branchSeeds.Count];var app=GameApplication.Restore(seed.dto);var path=new JsonArray();var random=new Random(trial);
            for(int turn=0;turn<70&&!found.ContainsKey("review-safety-filler");turn++)
            {
                var v=app.Inspect();if(v.Text("phase")!="exploring")break;
                string type;JsonObject payload;
                if(v.Obj("story").Obj("scene").Flag("paused"))
                {type="continue_scene";payload=new(){["scene_id"]=v.Obj("story").Obj("scene").Text("id"),["advance"]=true,["displayed_text_ids"]=v.Obj("story").Obj("scene").Arr("text_ids").DeepClone()};}
                else
                {
                    var choices=v.Obj("exploration").Arr("legal_actions").Rows().ToArray();
                    foreach(var c in choices)
                    {
                        var p=app.PreviewAction(v.Number("revision"),v.Text("view_token"),c);
                        var expired=v.Obj("exploration").Arr("hand").Rows().Where(r=>p.Arr("expired").Strings().Contains(r.Text("id"))).ToArray();
                        if(p.Text("mode")=="place"&&expired.Any(r=>r.Text("birth")=="filler")&&!expired.Any(r=>r.Flag("consume_on_recover")))
                        {Save("review-safety-filler",app,c,"legal-branch:"+seed.record+":"+seed.step,turn);found["review-safety-filler"]["branch_commands"]=path.DeepClone();break;}
                    }
                    if(found.ContainsKey("review-safety-filler"))break;
                    if(choices.Length==0)break;
                    var defensive=choices.Where(c=>app.PreviewAction(v.Number("revision"),v.Text("view_token"),c).Text("mode") is "guard" or "heal").ToArray();
                    var pool=trial%2==0&&defensive.Length>0?defensive:choices;
                    type="play";payload=new(){["choice"]=pool[random.Next(pool.Length)].Copy()};
                }
                var request=new GameCommand("review-branch-"+trial+"-"+turn,v.Number("revision"),v.Text("view_token"),type,payload);
                var result=app.Execute(request);if(result.Status!="committed")throw new InvalidDataException("Fixture branch refused: "+result.Error);
                path.Add(JsonSerializer.SerializeToNode(request));searched++;
            }
        }
        found["review-destination"]=found["review-preparation"].Copy();
        counts["review-destination"]=counts["review-preparation"];
        found["review-destination-field"]=found["review-scroll-field"].Copy();
        counts["review-destination-field"]=counts["review-scroll-field"];
        var directory=System.IO.Path.Combine(output,"fixtures");Directory.CreateDirectory(directory);
        foreach(var (name,value) in found)System.IO.File.WriteAllText(System.IO.Path.Combine(directory,name+".json"),value.ToJsonString(new(){WriteIndented=true}));
        System.IO.File.WriteAllText(System.IO.Path.Combine(output,"fixture-index.json"),JsonSerializer.Serialize(found.Select(x=>new{name=x.Key,record=x.Value.Text("source_record"),step=x.Value.Number("source_step"),hand=x.Value.Obj("public_view").Obj("exploration").Arr("hand").Count,field=x.Value.Obj("public_view").Obj("exploration").Obj("field").Count,score=counts[x.Key]}),new JsonSerializerOptions{WriteIndented=true}));
        Check("fixed-oracle-snapshots-validated",found.Count>5,new{fixtures=found.Keys,legal_branch_commands=searched});await Frame();
        Check("optional-boundary-availability-recorded",true,new{missing=new[]{"review-safety-filler","review-details-unlimited"}.Except(found.Keys).ToArray(),reason="固定oracleと合法command探索に状態がある場合だけ実描画する。未再現を合格へ読み替えない。"});
    }
    private async Task ReviewScroll()
    {
        if(mode=="review-scroll-prep"){await Click("prepare");await Click("tab-passive");}
        var id=mode=="review-scroll-prep"?"prep-passive-offer":mode=="review-scroll-hand"?"strip-hand":"strip-field";
        var scroll=(ScrollContainer)screen.Controls[id];bool vertical=mode=="review-scroll-prep";
        if(vertical)scroll.ScrollVertical=0;else scroll.ScrollHorizontal=0;await Frame(3);
        var r=scroll.GetGlobalRect();ScrollBar bar=vertical?scroll.GetVScrollBar():scroll.GetHScrollBar();
        var originalRect=r;var naturalMaximum=Math.Max(0,bar.MaxValue-bar.Page);
        // M1の手札3枚・場4属性はFHD内に収まる。実ノードのサイズだけを狭めて
        // overflow分岐も測る。札・Core状態は増やさず、通常描画と限定サイズを記録する。
        await Capture("U01-natural");
        if(naturalMaximum<1)
        {
            if(vertical)scroll.Size=new(scroll.Size.X,220);
            else{scroll.Size=new(540,scroll.Size.Y);Descendants(scroll).OfType<HBoxContainer>().First().CustomMinimumSize=new(536,208);}
            await Frame(3);r=scroll.GetGlobalRect();
        }
        var maximum=Math.Max(0,bar.MaxValue-bar.Page);var before=screen.Session!.ExportDto();var plan=screen.Plan.Copy();
        // 札ではなく8pxの列間／札下の余白から押す。スクロールバーのthumbも避ける。
        var start=vertical?new Vector2(r.Position.X+356,r.Position.Y+140):new Vector2(r.Position.X+256,r.Position.Y+100);
        var end=start+(vertical?new Vector2(0,-140):new Vector2(-180,0));
        await Capture("U01-before");await Mouse(start,true);await Move(start,end);await Mouse(end,false);await Idle();
        int value=vertical?scroll.ScrollVertical:scroll.ScrollHorizontal;
        await Capture("U01-after");
        Check("U01-no-execution",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&JsonNode.DeepEquals(plan,screen.Plan));
        Check("U01-blank-start-scroll",maximum<1||value>0,new{control=id,from=start.ToString(),to=end.ToString(),before=0,after=value,maximum,overflow=maximum>=1,natural_maximum=naturalMaximum,original_rect=originalRect.ToString(),probe_rect=r.ToString()});
        await Mouse(start,true);await Move(start,end);await KeyInput(Key.Escape);await Mouse(end,false);await Idle();
        Check("U01-cancel-no-execution",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&JsonNode.DeepEquals(plan,screen.Plan));
    }

    private string NodeText(string id)=>NodeText(screen.Controls[id]);
    private static IEnumerable<Node> Descendants(Node root)
    {
        yield return root;
        foreach(var child in root.GetChildren())foreach(var node in Descendants(child))yield return node;
    }
    private string NodeText(Node root)
    {
        var texts=new List<string>();
        void Read(Node node){
            if(node.HasMeta("fact_columns")){var columns=new List<string>();void Column(Node n){if(n is Label l)columns.Add(l.Text);foreach(var child in n.GetChildren())Column(child);}Column(node);texts.Add(string.Join(" ",columns));return;}
            if(node is Label label)texts.Add(label.Text);foreach(var child in node.GetChildren())Read(child);
        }
        Read(root);return string.Join("\n",texts);
    }
    private async Task ReviewChoice()
    {
        var choice=reviewFixture!.Obj("choice");await Click("card-hand-"+choice.Text("card_id"));await CloseDetail();
        if(choice.Text("target")!=""){await Click("actor-"+choice.Text("target"));await CloseDetail();}
    }
    private async Task HoldTo(string id,Vector2 point,bool release=true)
    {
        await Point(id);var start=screen.Controls[id].GlobalPosition+new Vector2(36,40);await Mouse(start,true);
        await screen.ToSignal(screen.GetTree().CreateTimer(.27),SceneTreeTimer.SignalName.Timeout);await Move(start,point);await Frame(3);
        if(release){await Mouse(point,false);await Idle();}
    }
    private async Task ReviewSafety()
    {
        if(mode=="review-safety-off"){await Click("menu");await Click("operation");await Click("quick-place");await Click("modal-close");}
        var before=screen.Session!.ExportDto();var file=System.IO.File.ReadAllBytes(SavePath);
        await ReviewChoice();var choice=reviewFixture!.Obj("choice").Copy();var v=screen.View;
        var preview=screen.Session.PreviewAction(v.Number("revision"),v.Text("view_token"),choice);
        foreach(var expiry in preview.Arr("unused_hand_expiry").Rows().Where(r=>r.Flag("expires")&&r.Text("destination")=="destroyed"))
        {
            await Click("card-hand-"+expiry.Text("id"));var text=NodeText("detail-body");
            Check("R04-public-destruction-property-"+expiry.Text("id"),text.Contains("消滅"),new{text});await Capture("R04-destruction-detail");await CloseDetail();
        }
        await ReviewChoice();await Capture("R01-before-drop");await HoldTo("card-hand-"+choice.Text("card_id"),new(960,540));
        bool quick=mode=="review-safety-quick";
        if(!quick)
        {
            Check("R01-drop-waits-with-dto-file-unchanged",screen.Modal=="prediction"&&JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)),new{preview});
            var text=NodeText("prediction-body");Check("R01-loss-warning",mode is "review-safety-matched" or "review-safety-off"||text.Contains("消滅"),new{text});await Capture("R01-after-drop");
            await ReadAll("prediction-body");await Capture("R01-expiry-and-order");
            await Click("play");
        }
        VerifyCommand(before,"play",new(){["choice"]=choice});
        Check("R01-one-play-one-revision",screen.View.Number("revision")==before.State.Number("revision")+1&&commands.Count==1);
        var committed=screen.Session.ExportDto();var replay=screen.Session.Execute(screen.LastCommand!);
        Check("R01-resend-no-second-save",replay.Status=="replayed"&&JsonNode.DeepEquals(committed.State,screen.Session.ExportDto().State)&&JsonNode.DeepEquals(committed.State,SaveFileCodec.Read(SavePath).Dto.State));
        await Capture("R01-confirmed");
        if(quick)System.IO.File.WriteAllText(System.IO.Path.Combine(output,"resume-expected.json"),JsonSerializer.Serialize(committed));
    }
    private async Task ReviewPrediction()
    {
        var before=screen.Session!.ExportDto();var file=System.IO.File.ReadAllBytes(SavePath);await ReviewChoice();
        var c=reviewFixture!.Obj("choice");var v=screen.View;var p=screen.Session.PreviewAction(v.Number("revision"),v.Text("view_token"),c);
        await Click("card-hand-"+c.Text("card_id"));var details=NodeText("detail-body");var card=v.Obj("exploration").Arr("hand").Rows().Single(r=>r.Text("id")==c.Text("card_id"));
        if(v.Obj("exploration").Obj("field").ContainsKey(card.Text("attr"))&&card.Text("kind")!="heal")
        {
            var field=v.Obj("exploration").Obj("field").Obj(card.Text("attr"));
            var contributions=Descendants(screen.Controls["detail-body"]).OfType<Label>().Where(n=>n.HasMeta("field_contribution")).ToArray();
            Check("R04-field-contribution-separated",contributions.Length==2&&contributions[0].Text=="+ "+field.Number("field_power")+"（場）"&&contributions[1].Text=="+ "+field.Number("field_hit")+"（場）"&&details.Contains(card.Number("power").ToString()),new{details,field});
        }
        if(card.Text("kind")=="guard")Check("R04-defense-uses-visible",details.Contains("防御の回数"),new{details,card});
        if(card.Text("kind")=="defense_support")Check("R04-grant-target-restack-visible",details.Contains("使用者以外")&&details.Contains("張り直し")&&details.Contains("防御の回数"),new{details,card});
        await Capture("R04-hand-detail");await ReadAll("detail-body");await Capture("R04-hand-detail-bottom");await CloseDetail();await Click("preview");var text=NodeText("prediction-body");
        Check("R03-action-cost-and-public-unknown",text.Contains("次の行動まで "+p.Number("action_cost"))&&text.Contains("未公開")&&!text.Contains("体勢"),new{text,preview=p});
        foreach(var change in p.Arr("actor_changes").Rows())
        {
            foreach(var (key,label) in new[]{("hp","余力"),("posture_remaining","隠蔽"),("crit","機転")})
                if(!JsonNode.DeepEquals(change.Obj("before")[key],change.Obj("after")[key]))
                {
                    // 余力・隠蔽は原本どおり主体札の数値とdeltaで読む。検査のためだけに
                    // 予測窓へ同じ情報の段落を増やさず、実Labelを検査する。
                    var node=screen.Controls["vitals-"+change.Text("actor_id")];
                    long delta=change.Obj("after").Number(key)-change.Obj("before").Number(key);
                    if(key=="posture_remaining"&&p.Text("mode")=="attack"&&p.Text("target")==change.Text("actor_id"))delta=-p.Number("hit_gain");
                    string expected=delta==0?"±0":delta>0?"+"+delta:delta.ToString();
                    bool visible=key=="crit"?text.Contains(label+" "+change.Obj("before").Number(key)+" → "+change.Obj("after").Number(key)):Descendants(node).OfType<Label>().Any(n=>n.HasMeta("forecast_delta")&&n.GetMeta("forecast_delta").AsString()==key&&n.Text==expected);
                    Check("R03-visible-"+change.Text("actor_id")+"-"+key,visible,new{expected,text=NodeText(node)});
                }
            foreach(var (key,label) in new[]{("guard","身構"),("evasion","攪乱")})
                if(!JsonNode.DeepEquals(change.Obj("before").Obj("defense")[key],change.Obj("after").Obj("defense")[key]))Check("R03-visible-"+change.Text("actor_id")+"-"+key,text.Contains(label+" "+change.Obj("before").Obj("defense").Number(key)+" → "+change.Obj("after").Obj("defense").Number(key)));
        }
        if(p.Text("mode")=="attack")Check("R03-pre-reset-strike-visible",text.Contains("隠蔽 "+p.Number("posture_before")+" → "+(p.Number("posture_before")-p.Number("hit_gain"))));
        foreach(var expiry in p.Arr("unused_hand_expiry").Rows().Where(r=>r.Flag("expires")))Check("R03-expiry-destination-visible-"+expiry.Text("id"),text.Contains(expiry.Text("destination")=="destroyed"?"消滅":"共通回収"));
        await Capture("R03-prediction-top");await ReadAll("prediction-body");await Capture("R03-prediction-bottom");await CloseDetail();
        if(card.Text("kind") is "guard" or "defense_support")
        {
            await Click("knowledge");await Click("knowledge-group-0");await Click("knowledge-card-0");
            Check("R04-record-has-no-current-field-addition",!Descendants(screen.Controls["knowledge-detail"]).Any(n=>n.HasMeta("field_contribution")));
            await Capture("R04-record-top");await ReadAll("knowledge-detail");await Capture("R04-record-bottom");await Click("modal-back");await CloseDetail();
        }
        Check("R03-R04-reading-preserves-dto-rng-file",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
        await Capture("R03-self-and-actors");
    }
    private async Task ReviewOrder()
    {
        var before=screen.Session!.ExportDto();await ReviewChoice();var c=reviewFixture!.Obj("choice");var v=screen.View;var p=screen.Session.PreviewAction(v.Number("revision"),v.Text("view_token"),c);
        var reservations=p.Arr("current_reservations_after").Rows().ToArray();var group=reservations.Where(r=>r.Number("at")==p.Number("next_self_reservation")).ToArray();int preceding=reservations.Count(r=>r.Number("at")<p.Number("next_self_reservation"));
        string position=group.Length>1?(preceding+1)+"〜"+(preceding+group.Length):(preceding+1).ToString();
        Check("R05-public-position-range",NodeText("turn-order").Contains("次")&&screen.Controls.Where(p=>p.Key.StartsWith("order-")).Any(p=>p.Value.TooltipText.Contains("次回位置 "+position)),new{position,reservations});
        await Capture("R05-order-strip");await Click("order-0");Check("R05-existing-detail-readonly",screen.Modal=="detail"&&JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State));await CloseDetail();
        await Click("preview");var text=NodeText("prediction-body");Check("R05-now-next-grouping",text.Contains("本人・今")&&text.Contains("本人の次回位置："+position)&&text.Contains("・次")&&(mode!="review-order-tie"||text.Contains("同時刻［")),new{text,position});
        await ReadAll("prediction-body");await Capture("R05-reservations");await CloseDetail();Check("R05-no-execution",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State));
    }
    private async Task ReviewUnlimited()
    {
        var before=screen.Session!.ExportDto();var row=screen.View.Obj("exploration").Arr("hand").Rows().First(r=>r.Text("kind")=="guard"&&r.ContainsKey("defense_uses")&&r["defense_uses"] is null);
        await Click("card-hand-"+row.Text("id"));var text=NodeText("detail-body");Check("R04-unlimited-visible",text.Contains("防御の回数：制限なし"),new{text,row});await ReadAll("detail-body");await Capture("R04-unlimited");await CloseDetail();Check("R04-no-save",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State));
    }

    private async Task PressDisabled(string id)
    {
        var button=(Button)screen.Controls[id];Check("disabled-"+id,button.Disabled);
        // DisabledはPointが拒否するため、実Control中心へ入力して副作用がないことを測る。
        var p=button.GetGlobalRect().GetCenter();await Mouse(p,true);await Mouse(p,false);await Idle();
    }
    private async Task ReviewPreparation()
    {
        var before=screen.Session!.ExportDto();var file=System.IO.File.ReadAllBytes(SavePath);
        await Click("prepare");await Click("tab-card");await Click("取得-choice-0");
        var selected=screen.Plan.Copy();var comparison=screen.Comparison.Copy();await Click("tab-passive");
        await PressDisabled("取得-choice-1");
        Check("R07-row-button-keeps-plan-comparison",JsonNode.DeepEquals(selected,screen.Plan)&&JsonNode.DeepEquals(comparison,screen.Comparison));
        await Click("item-offer-choice-1");await PressDisabled("detail-stage");await Capture("R07-detail-disabled");await CloseDetail();
        Check("R07-detail-keeps-plan",JsonNode.DeepEquals(selected,screen.Plan));
        await HoldTo("item-offer-choice-1",new(790,400),false);var denied=screen.DragAcceptance();await Capture("R07-drag-denied");await Mouse(new(790,400),false);await Idle();
        Check("R07-drag-keeps-plan-dto-file",!denied.Flag("allowed")&&denied.Text("label").Contains("上限")&&JsonNode.DeepEquals(selected,screen.Plan)&&JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)),denied);
        Check("R07-other-group-enabled",screen.Controls["取得-basic:PS01"] is Button {Disabled:false});
        await Click("tab-card");await Click("item-reserve-pending:choice-0");await Click("detail-unstage");await Click("tab-passive");
        Check("R07-cancel-reenables-group",screen.Controls["取得-choice-1"] is Button {Disabled:false});await Click("取得-choice-1");
        Check("R07-reselection-in-same-group",screen.Plan.Arr("acquire").Strings().SequenceEqual(new[]{"choice-1"}));await Click("discard");

        var plan=screen.Plan.Copy();plan["acquire"]=new JsonArray("choice-0","basic:PS01","basic:PS02");
        var oldGuard=screen.View.Obj("home").Arr("owned").Rows().First(r=>r.Flag("selected")&&r.Obj("blueprint").Text("base")=="g").Text("id");
        plan.Obj("composition")["deck"]=ViewData.Array(plan.Obj("composition").Arr("deck").Strings().Where(id=>id!=oldGuard).Append("pending:choice-0"));
        plan.Obj("composition")["equipment"]=new JsonArray("pending:basic:PS01");await EditTo(plan);
        await Click("review");var text=NodeText("dialog-body");
        foreach(var (id,destination,price) in new[]{("choice-0","build",400L),("basic:PS01","build",200L),("basic:PS02","reserve",200L)})
        {
            var row=screen.Controls["review-purchase-"+id];string symbol=destination=="build"?"LayoutGrid":"Layers";
            Check("R02-individual-price-destination-"+id,row.GetMeta("destination").AsString()==destination&&row.GetMeta("price_units").AsInt64()==price&&row.GetChildren().OfType<TextureRect>().Any(t=>t.HasMeta("accepted_icon")&&t.GetMeta("accepted_icon").AsString()==symbol)&&row.GetChildren().OfType<Label>().Any(t=>t.Text==ViewData.Money(price)),new{destination,price,text=NodeText(row)});
        }
        await Capture("R02-mixed-top");await ExpandReviewEffects();text=NodeText("dialog-body");
        Check("R02-mixed-quantity-capacity-passive",text.Contains("0 → 1")&&text.Contains("1 → 0")&&NodeText("review-capacity").Contains("12 / 12")&&NodeText("review-capacity").Contains("2 / "+screen.View.Obj("home").Obj("equipment").Number("capacity"))&&text.Contains("発動条件")&&text.Contains("効果"));
        await Capture("R02-mixed-expanded-top");await ReadAll("dialog-body");await Capture("R02-mixed-bottom");await CloseDetail();
        Check("R02-cancel-is-readonly",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath))&&JsonNode.DeepEquals(plan,screen.Plan));
        var committedPlan=screen.Plan.Copy();await Click("review");await Click("commit");VerifyCommand(before,"commit_preparation",new(){["plan"]=committedPlan});
        var committed=screen.Session.ExportDto();var replay=screen.Session.Execute(screen.LastCommand!);
        Check("R02-R07-replay-one-payment",replay.Status=="replayed"&&screen.View.Number("revision")==before.State.Number("revision")+1&&JsonNode.DeepEquals(committed.State,screen.Session.ExportDto().State)&&JsonNode.DeepEquals(committed.State,SaveFileCodec.Read(SavePath).Dto.State));
        await Capture("R02-mixed-committed");file=System.IO.File.ReadAllBytes(SavePath);
        // 別支払いを行わず、同じ確定後状態から編成だけ／心得だけの確認と取消をする。
        await Click("tab-card");var owned=screen.View.Obj("home").Arr("owned").Rows().ToArray();
        // 公開handleは確定後のViewから取り直す。同じ性能の未編成個体を選ぶ。
        oldGuard=owned.First(r=>!r.Flag("selected")&&r.Obj("blueprint").Text("base")=="g"&&r.Obj("blueprint").Arr("affixes").Count==0).Text("id");
        var variant=owned.First(r=>r.Flag("selected")&&r.Obj("blueprint").Text("base")=="g"&&r.Obj("blueprint").Arr("affixes").Count>0).Text("id");
        plan=screen.Plan.Copy();plan.Obj("composition")["deck"]=ViewData.Array(plan.Obj("composition").Arr("deck").Strings().Where(id=>id!=variant).Append(oldGuard));await EditTo(plan);await Click("review");text=NodeText("dialog-body");
        Check("R02-composition-only-difference",!screen.Controls.Keys.Any(k=>k.StartsWith("review-purchase-"))&&text.Contains("1 → 0")&&text.Contains("0 → 1")&&NodeText("review-capacity").Contains("12 / 12"),new{text});await Capture("R02-composition-only");await CloseDetail();await Click("discard");
        owned=screen.View.Obj("home").Arr("owned").Rows().ToArray();var passive=owned.Single(r=>r.Obj("blueprint").Text("base")=="PS02").Text("id");
        plan=screen.Plan.Copy();plan.Obj("composition")["equipment"]=new JsonArray(passive);await EditTo(plan);await Click("review");text=NodeText("dialog-body");
        await Capture("R02-passive-only-top");await ExpandReviewEffects();text=NodeText("dialog-body");
        Check("R02-passive-only-trigger-effect-capacity",NodeText("review-capacity").Contains("3 / "+screen.View.Obj("home").Obj("equipment").Number("capacity"))&&text.Contains("発動条件")&&text.Contains("効果")&&text.Contains("1 → 0")&&text.Contains("0 → 1"),new{text});await ReadAll("dialog-body");await Capture("R02-passive-only-bottom");await CloseDetail();await Click("discard");
        Check("R02-only-edits-cancel-no-save",JsonNode.DeepEquals(committed.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));
    }
    private async Task ExpandReviewEffects()
    {
        foreach(string id in screen.Controls.Keys.Where(k=>k.StartsWith("fold-review-",StringComparison.Ordinal)).ToArray())await Click(id);
    }
    private async Task ReviewDestination()
    {
        if(mode=="review-destination-field"){await ReviewFieldDestination();return;}
        await Click("prepare");await Click("tab-card");
        // 所持の表示行はまとめられるため、そのままの個体を編成から外して受入側にoverflowを作る。
        foreach(var row in screen.View.Obj("home").Arr("owned").Rows().Where(r=>r.Flag("selected")).Take(8).ToArray())await Click("外す-"+row.Text("id"));
        var origin=(ScrollContainer)screen.Controls["prep-card-build"];var dest=(ScrollContainer)screen.Controls["prep-card-reserve"];
        var original=dest.GetGlobalRect();dest.Size=new(dest.Size.X,100);await Frame(3);var r=dest.GetGlobalRect();
        var id=screen.Plan.Obj("composition").Arr("deck").Strings().First();var before=screen.Session!.ExportDto();var plan=screen.Plan.Copy();var file=System.IO.File.ReadAllBytes(SavePath);
        await HoldTo("item-build-"+id,new(r.Position.X+130,r.End.Y-4),false);var acceptance=screen.DragAcceptance();await Frame(8);
        Check("R06-destination-only-edge-scroll",dest.ScrollVertical>0&&origin.ScrollVertical==0&&acceptance.Flag("allowed"),new{destination=dest.ScrollVertical,origin=origin.ScrollVertical,natural_rect=original.ToString(),probe_rect=r.ToString(),acceptance});await Capture("R06-destination-scroll");
        await Move(new(r.Position.X+130,r.End.Y-4),new(960,1050));await Frame(2);int at=dest.ScrollVertical;await Frame(8);
        Check("R06-outside-stops-scroll",dest.ScrollVertical==at&&origin.ScrollVertical==0);await Capture("R06-outside");await KeyInput(Key.Escape);await Mouse(new(960,1050),false);await Idle();
        Check("R06-cancel-plan-dto-file-unchanged",JsonNode.DeepEquals(plan,screen.Plan)&&JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));await Click("discard");
        await Click("取得-choice-0");plan=screen.Plan.Copy();await HoldTo("item-reserve-pending:choice-0",new(210,400),false);acceptance=screen.DragAcceptance();
        Check("R06-pending-cancel-allowed",acceptance.Flag("allowed")&&acceptance.Text("label").Contains("取り消す"),acceptance);await Capture("R06-pending-cancel-allowed");await KeyInput(Key.Escape);await Mouse(new(210,400),false);await Idle();
        Check("R06-pending-escape-keeps-plan",JsonNode.DeepEquals(plan,screen.Plan));
        id=screen.Plan.Obj("composition").Arr("deck").Strings().First();await HoldTo("item-build-"+id,new(210,400),false);acceptance=screen.DragAcceptance();
        Check("R06-owned-cancel-denied",!acceptance.Flag("allowed")&&acceptance.Text("label").Contains("正式所持"),acceptance);await Capture("R06-owned-cancel-denied");await Mouse(new(210,400),false);await Idle();
        Check("R06-denied-release-keeps-plan-dto",JsonNode.DeepEquals(plan,screen.Plan)&&JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State));await Click("discard");
    }
    private async Task ReviewFieldDestination()
    {
        var before=screen.Session!.ExportDto();var file=System.IO.File.ReadAllBytes(SavePath);var id=screen.View.Obj("exploration").Arr("legal_actions").Rows().First().Text("card_id");
        // 選択に伴う通常再描画を先に済ませ、その同じ場viewportを限定幅で確認する。
        await HoldTo("card-hand-"+id,new(960,540),false);
        var origin=(ScrollContainer)screen.Controls["strip-hand"];var dest=(ScrollContainer)screen.Controls["strip-field"];var original=dest.GetGlobalRect();
        dest.Size=new(540,dest.Size.Y);Descendants(dest).OfType<HBoxContainer>().First().CustomMinimumSize=new(536,208);await Frame(3);var r=dest.GetGlobalRect();var point=new Vector2(r.End.X-4,r.Position.Y+70);
        await Move(new(960,540),point);await Frame(8);var acceptance=screen.DragAcceptance();
        Check("R06-field-destination-only",dest.ScrollHorizontal>0&&origin.ScrollHorizontal==0&&acceptance.Flag("allowed"),new{destination=dest.ScrollHorizontal,origin=origin.ScrollHorizontal,natural_rect=original.ToString(),probe_rect=r.ToString(),acceptance});await Capture("R06-field-edge-scroll");
        await Move(point,new(960,760));await Frame(2);int at=dest.ScrollHorizontal;await Frame(8);Check("R06-field-outside-stops",dest.ScrollHorizontal==at&&origin.ScrollHorizontal==0);await KeyInput(Key.Escape);await Mouse(new(960,760),false);await Idle();
        Check("R06-field-cancel-no-dto-save",JsonNode.DeepEquals(before.State,screen.Session.ExportDto().State)&&file.SequenceEqual(System.IO.File.ReadAllBytes(SavePath)));await Capture("R06-field-cancelled");
    }
}
