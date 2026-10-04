using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;

/// <summary>
/// 合意UIへ渡す既存記録の公開投影。保存形式・規則・登録値は変更しない。
/// 原本references-public / information.profileViewと同じ分類を、公開境界で行う。
/// 生のrun/event ID・未観測札・私有山札を画面へ渡さない。
/// </summary>
internal static class UiPublicProjection
{
    internal static JsonArray Knowledge(JsonObject k,string run,JsonObject? active)
    {
        var result=new JsonArray();
        foreach(var encounter in k.A("encounters").Rows().DistinctBy(x=>x.S("profile")+"/"+x.S("version")))
        {
            string profile=encounter.S("profile"),version=encounter.S("version");
            var target=Content.M1.O("targets").Values().FirstOrDefault(t=>t.S("knowledge_profile_id")==profile&&t.S("catalogue_version")==version);
            var events=k.A("events").Rows().Where(x=>x.S("profile")==profile&&x.S("version")==version).ToArray();
            var grant=events.LastOrDefault(x=>x.S("kind")=="initial_catalogue_grant");
            string actor=target?.S("runtime_actor_id")??"";
            JsonArray Observed(Func<JsonObject,bool> predicate)=>J.Array(events.Where(x=>x.S("kind")=="observed_card"&&predicate(x)).Select(x=>J.Obj(("card",x["card"]))).DistinctBy(J.Canonical).OrderBy(x=>J.Canonical(x["card"]),StringComparer.Ordinal));
            bool current=active is not null&&target is not null&&active.O("targets").S(actor)==target.S("id");
            result.Add(J.Obj(("key",profile+"/"+version),("profile",profile),("version",version),("display_name",target?.S("display_name")??"観測した相手・環境"),("current",current),
                ("initial_catalogue",grant is null?null:J.Obj(("cards",grant["cards"]),("basis","explicit_experienced_knowledge"))),
                ("observed_by_current_actor",Observed(x=>x.S("run")==run&&x.S("actor")==actor)),
                ("observed_elsewhere_this_run",Observed(x=>x.S("run")==run&&x.S("actor")!=actor)),
                ("observed_earlier",Observed(x=>x.S("run")!=run)),
                ("confirmed_reward_candidates",J.Array(events.Where(x=>x.S("kind")=="observed_reward").Select(x=>J.Select(x,"label","reward_key")).DistinctBy(J.Canonical))),
                ("current_private_composition","unknown"),("next_card","unknown")));
        }
        return result;
    }
    internal static JsonArray Affixes(JsonObject blueprint)
    {
        var rows=new JsonArray();string kind=blueprint.S("kind");
        var labels=new Dictionary<string,string>{{"power","主効果"},{"hit","探査"},{"evasion","攪乱"},{"crit_gain","機転"},{"field_power","場の効果量"},{"field_hit","場の探査補正"},{"life","使用期限"},{"cost","設置・一致の行動間隔"}};
        static string Signed(int n)=>n>0?"+"+n:n.ToString();
        foreach(string id in blueprint.A("affixes").Strings())
        {
            var a=Content.Economy.O("affixes").O(kind).O(id);var parts=new List<string>();
            if(kind=="card")foreach(var (key,value) in a.O("delta"))parts.Add(labels.GetValueOrDefault(key,key)+Signed(value.I()));
            else
            {
                if(a["gate"] is not null)parts.Add(a.S("gate")=="borrowed"?"他主体由来の札に限定":"B属性の札に限定");
                if(a.I("strength")!=0)parts.Add("効果量"+Signed(a.I("strength")*Content.Economy.O("affixes").O("passive_strength_units").I(blueprint.S("base"))));
                if(a.I("discount")!=0)parts.Add("行動間隔"+Signed(-a.I("discount")));
            }
            rows.Add(J.Obj(("label",a.S("label")),("description",string.Join("。",parts))));
        }
        return rows;
    }
    internal static void AddAffixes(JsonObject row)
    {
        if(row["details"] is JsonObject details&&row["blueprint"] is JsonObject blueprint)details.Put("affix_descriptions",Affixes(blueprint));
    }
}
