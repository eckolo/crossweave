using System.IO.Compression;
using System.Text.Json.Nodes;
using Crossweave.Core.Application;
using Xunit;

namespace Crossweave.Tests;

/// <summary>表示境界の追加が、保存・乱数・未観測情報へ影響しないことを確認する。</summary>
public sealed class UiPublicProjectionTests
{
    [Fact]
    public void ObservationClassesUseRecordedRunActorAndVersionWithoutPrivateIdentities()
    {
        // authored単体入力で分類の全分岐を検査する。実UIへ到達した合法保存の証拠ではない。
        var target=Content.M1.O("targets").Values().First();string profile=target.S("knowledge_profile_id"),version=target.S("catalogue_version"),actor=target.S("runtime_actor_id");
        JsonObject Event(string run,string who,string type,string v)=>J.Obj(("kind","observed_card"),("profile",profile),("version",v),("run",run),("actor",who),("id","private-evidence-id"),("card",Expedition.PublicCard(Content.Card(type))));
        var k=J.Obj(("encounters",new JsonArray(J.Obj(("profile",profile),("version",version)))),("events",new JsonArray(Event("now",actor,"f",version),Event("now",actor,"f",version),Event("now","other","g",version),Event("earlier",actor,"h",version),Event("now",actor,"l","unknown-version"))));
        string before=J.Canonical(k);var projected=UiPublicProjection.Knowledge(k,"now",J.Obj(("targets",J.Obj((actor,target.S("id"))))));var row=(JsonObject)projected[0]!;
        Assert.True(row.B("current"));Assert.Null(row["initial_catalogue"]);
        Assert.Equal("f",row.A("observed_by_current_actor").Rows().Single().O("card").S("type"));
        Assert.Equal("g",row.A("observed_elsewhere_this_run").Rows().Single().O("card").S("type"));
        Assert.Equal("h",row.A("observed_earlier").Rows().Single().O("card").S("type"));
        Assert.DoesNotContain("private-evidence-id",J.Canonical(projected));Assert.DoesNotContain("unknown-version",J.Canonical(projected));
        Assert.Equal("unknown",row.S("current_private_composition"));Assert.Equal("unknown",row.S("next_card"));Assert.Equal(before,J.Canonical(k));
    }
    [Fact]
    public void OldSnapshotsKeepValuesAndDoNotAcquireCurrentNamesOrCatalogues()
    {
        var target=Content.M1.O("targets").Values().First();string profile=target.S("knowledge_profile_id");
        var snapshot=Expedition.PublicCard(Content.Card("g"));snapshot.Put("name","過去の公開名称");snapshot.Put("power",17);
        var k=J.Obj(("encounters",new JsonArray(J.Obj(("profile",profile),("version","old-authoring-version")))),("events",new JsonArray(J.Obj(("profile",profile),("version","old-authoring-version"),("kind","observed_card"),("run","earlier"),("actor","V"),("card",snapshot)))));
        var row=UiPublicProjection.Knowledge(k,"now",null).Rows().Single();var observed=row.A("observed_earlier").Rows().Single().O("card");
        Assert.False(row.B("current"));Assert.Equal("観測した相手・環境",row.S("display_name"));Assert.Null(row["initial_catalogue"]);Assert.Equal("過去の公開名称",observed.S("name"));Assert.Equal(17,observed.I("power"));
    }
    [Fact]
    public void ExistingLegalSavesRestoreWithReadonlyKnowledgeAndAffixViews()
    {
        using var file=File.OpenRead(Path.Combine(AppContext.BaseDirectory,"Fixtures/application-oracle.json.br"));using var br=new BrotliStream(file,CompressionMode.Decompress);var oracle=(JsonObject)JsonNode.Parse(br)!;
        int snapshots=0,observed=0,affixed=0;
        foreach(var record in oracle.A("records").Rows())
        {
            var state=record.O("initial").Copy();
            foreach(var step in new JsonObject?[]{null}.Concat(record.A("steps").Rows()))
            {
                if(step is not null)Delta(state,step.A("expected_delta"));
                var adapted=state.Copy();adapted.Put("schema","CW-CSharp-application-1");adapted.Put("engine_version","CW-CSharp-core-1");
                var app=GameApplication.Restore(new(1,adapted.S("rule_set_id"),adapted.S("content_set_id"),adapted));string before=J.Canonical(app.ExportDto().State);var view=app.Inspect();
                var knowledge=view.S("phase")=="exploring"?view.O("exploration").O("knowledge"):view.O("knowledge");
                foreach(var row in knowledge.A("views").Rows()){Assert.DoesNotContain("run",row.Select(p=>p.Key));Assert.DoesNotContain("actor",row.Select(p=>p.Key));observed+=row.A("observed_earlier").Count+row.A("observed_by_current_actor").Count;}
                var home=view["home"] as JsonObject;
                foreach(var row in (home?["owned"] as JsonArray??new JsonArray()).Rows().Concat((home?["acquisition"] as JsonArray??new JsonArray()).Rows()))
                {Assert.Equal((row.O("blueprint")["affixes"] as JsonArray)?.Count??0,row.O("details").A("affix_descriptions").Count);affixed+=row.O("details").A("affix_descriptions").Count;}
                _=app.Inspect();Assert.Equal(before,J.Canonical(app.ExportDto().State));Assert.DoesNotContain("affix_descriptions",before);Assert.DoesNotContain("observed_by_current_actor",before);snapshots++;
            }
        }
        Assert.True(snapshots>50);Assert.True(observed>0);Assert.True(affixed>0);
    }
    private static void Delta(JsonObject state,JsonArray ops)
    {
        foreach(var op in ops.Rows())
        {var path=op.A("path").Strings();JsonNode n=state;foreach(var part in path[..^1])n=n is JsonArray a?a[int.Parse(part)]!:n[part]!;if(n is JsonArray array)array[int.Parse(path[^1])]=op["value"]?.DeepClone();else if(op.B("remove"))((JsonObject)n).Remove(path[^1]);else n[path[^1]]=op["value"]?.DeepClone();}
    }
}
