using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Encodings.Web;
using System.Security.Cryptography;
using System.Text;

namespace Crossweave.Core.Application;
// JSON is the versioned data contract, not a scripting runtime. All rules execute in C#.
internal static class J
{
    internal static readonly JsonSerializerOptions Options = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
    internal static JsonNode? Node(object? v) => v is JsonNode n ? n.DeepClone() : JsonSerializer.SerializeToNode(v, Options);
    internal static JsonObject Obj(params (string Key, object? Value)[] rows)
    {
        var o = new JsonObject();
        foreach (var(k, v)in rows)
            o[k] = Node(v);
        return o;
    }

    internal static JsonArray Array<T>(IEnumerable<T> rows) => new(rows.Select(x => Node(x)).ToArray());
    internal static JsonObject O(this JsonNode n, string k) => (JsonObject)n[k]!;
    internal static JsonArray A(this JsonNode n, string k) => (JsonArray)n[k]!;
    internal static string S(this JsonNode? n, string? k = null) => (k is null ? n : n?[k])?.GetValue<string>() ?? "";
    internal static long L(this JsonNode? n, string? k = null) => (k is null ? n : n?[k])?.GetValue<long>() ?? 0;
    internal static int I(this JsonNode? n, string? k = null) => checked((int)L(n, k));
    internal static bool B(this JsonNode? n, string? k = null) => (k is null ? n : n?[k])?.GetValue<bool>() ?? false;
    internal static JsonObject Copy(this JsonObject n) => (JsonObject)n.DeepClone();
    internal static void Put(this JsonObject n, string k, object? v) => n[k] = Node(v);
    internal static string[] Strings(this JsonArray a) => a.Select(x => x.S()).ToArray();
    internal static JsonObject[] Rows(this JsonArray a) => a.Select(x => (JsonObject)x!).ToArray();
    internal static JsonObject[] Values(this JsonObject a) => a.Select(x => (JsonObject)x.Value!).ToArray();
    internal static void AddCopy(this JsonArray a, object? v) => a.Add(Node(v));
    internal static void RemoveString(this JsonArray a, string v)
    {
        for (int i = 0; i < a.Count; i++)
            if (a[i].S() == v)
            {
                a.RemoveAt(i);
                return;
            }
    }

    internal static void UniqueAdd(this JsonArray a, string v)
    {
        if (!a.Strings().Contains(v))
            a.Add(v);
    }

    internal static string Text(object? x) => Node(x)?.ToJsonString(Options) ?? "null";
    internal static string Canonical(JsonNode? n) => n switch
    {
        JsonObject o => "{" + string.Join(",", o.OrderBy(x => x.Key, StringComparer.Ordinal).Select(x => Text(x.Key) + ":" + Canonical(x.Value))) + "}",
        JsonArray a => "[" + string.Join(",", a.Select(Canonical)) + "]",
        _ => Text(n)};
    internal static string Hash(string s) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(s))).ToLowerInvariant();
    internal static void Check(bool ok, string code)
    {
        if (!ok)
            throw new RuleException(code);
    }

    internal static JsonObject Select(JsonObject o, params string[] keys) => Obj(keys.Select(k => (k, (object? )o[k])).ToArray());
}

public sealed class RuleException(string code) : Exception(code)
{
    public string Code { get; } = code;
}

internal static class Content
{
    internal static readonly JsonObject M1 = Read("m1");
    internal static readonly JsonObject Economy = Read("economy");
    internal static readonly JsonObject Acquisition = Read("acquisition");
    private static JsonObject Read(string name)
    {
        var asm = typeof(Content).Assembly;
        using var stream = asm.GetManifestResourceStream(asm.GetManifestResourceNames().Single(n => n.EndsWith(".Content." + name + ".json")))!;
        return (JsonObject)JsonNode.Parse(stream)!;
    }

    internal static JsonObject Blueprint(string kind, string basis, IEnumerable<string>? affixes = null)
    {
        var ids = (affixes ?? []).Order(StringComparer.Ordinal).ToArray();
        var table = Economy.O("affixes");
        J.Check(kind is "card" or "passive", "invalid_blueprint_kind");
        J.Check(kind == "card" ? M1.O("cards").ContainsKey(basis) : M1.O("rules").O("learning").O("bases").ContainsKey(basis), "unknown_blueprint_base");
        J.Check(ids.Distinct().Count() == ids.Length && ids.Length <= table.I("max_count"), "invalid_affix_count");
        var families = new HashSet<string>();
        foreach (var id in ids)
        {
            J.Check(table.O(kind).ContainsKey(id), "unknown_affix");
            var a = table.O(kind).O(id);
            J.Check(kind == "card" ? M1.O("cards").O(basis).A("affix_allowlist").Strings().Contains(id) : a.A("bases").Strings().Contains(basis) && !(table.O("passive_exclusions")[basis] as JsonArray ?? []).Strings().Contains(id), "incompatible_affix");
            J.Check(families.Add(a.S("family")), "incompatible_affix_family");
        }

        var b = J.Obj(("version", "AO1"), ("kind", kind), ("base", basis), ("affixes", ids), ("key", string.Join(":", new[] { "AO1", kind, basis }.Concat(ids))));
        if (kind == "card")
        {
            var c = Compile(b);
            J.Check(c.I("life") >= 1 && c.I("power") >= 0, "invalid_composed_card");
        }

        return b;
    }

    internal static JsonObject Compile(JsonObject b)
    {
        var basis = b.S("base");
        var c = M1.O("cards").O(basis).O("card").Copy();
        c.Put("base_type", basis);
        c.Put("type", b.S("key"));
        c.Put("variant_key", b.S("key"));
        c.Put("affixes", b["affixes"]);
        c.Put("cost_delta", 0);
        foreach (var id in b.A("affixes").Strings())
            foreach (var(key, value)in Economy.O("affixes").O("card").O(id).O("delta"))
            {
                var field = key == "cost" ? "cost_delta" : key;
                c.Put(field, c.I(field) + value.I());
            }

        c.Put("place_cost", c.I("place_cost") + c.I("cost_delta"));
        c.Put("match_cost", c.I("match_cost") + c.I("cost_delta"));
        c.Put("name", string.Join("・", b.A("affixes").Strings().Select(id => Economy.O("affixes").O("card").O(id).S("label")).Append(c.S("name"))));
        return c;
    }

    internal static JsonObject Card(string type)
    {
        if (M1.O("cards")[type] is JsonObject c)
            return c.O("card").Copy();
        if (M1.O("runtime_supply_cards")[type] is JsonObject s)
            return s.Copy();
        var p = type.Split(':');
        J.Check(p.Length >= 3 && p[0] == "AO1" && p[1] == "card", "unknown_card_base");
        return Compile(Blueprint("card", p[2], p.Skip(3)));
    }

    internal static int EquipmentCost(JsonObject b) => M1.O("rules").O("equipment").O("base_cost").I(b.S("base")) + b.A("affixes").Strings().Sum(id => M1.O("rules").O("equipment").O("affix_surcharge").I(id));
    internal static IEnumerable<JsonObject> Variants(string kind, string basis)
    {
        var ids = Economy.O("affixes").O(kind).Select(x => x.Key).ToArray();
        var results = new List<JsonObject>();
        for (int mask = 0; mask < (1 << ids.Length); mask++)
            try
            {
                results.Add(Blueprint(kind, basis, ids.Where((_, i) => (mask & (1 << i)) != 0)));
            }
            catch (RuleException e)when (e.Code is "invalid_affix_count" or "incompatible_affix" or "incompatible_affix_family" or "invalid_composed_card")
            {
            }

        return results;
    }
}
