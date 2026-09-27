using System.Text;
using System.Security.Cryptography;
using System.Text.Json.Nodes;

namespace Crossweave.Core.Application;
// CPython string seed v2 + MT19937 getrandbits rejection/shuffle, matching random.mjs.
internal sealed class MtRandom
{
    private readonly uint[] words;
    private int index;
    internal MtRandom(JsonArray state)
    {
        words = state.Take(624).Select(x => checked((uint)x.L())).ToArray();
        index = state[624].I();
    }

    internal MtRandom(string text)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        var input = bytes.Concat(SHA512.HashData(bytes)).ToArray();
        var keys = new List<uint>();
        for (int end = input.Length; end > 0; end -= 4)
        {
            uint word = 0;
            for (int n = Math.Max(0, end - 4); n < end; n++)
                word = unchecked(word * 256 + input[n]);
            keys.Add(word);
        }

        words = new uint[624];
        words[0] = 19650218;
        unchecked
        {
            for (int n = 1; n < 624; n++)
                words[n] = (words[n - 1] ^ (words[n - 1] >> 30)) * 1812433253 + (uint)n;
            int i = 1, j = 0;
            for (int k = Math.Max(624, keys.Count); k > 0; k--)
            {
                words[i] = (words[i] ^ ((words[i - 1] ^ (words[i - 1] >> 30)) * 1664525)) + keys[j] + (uint)j;
                if (++i >= 624)
                {
                    words[0] = words[623];
                    i = 1;
                }

                if (++j >= keys.Count)
                    j = 0;
            }

            for (int k = 623; k > 0; k--)
            {
                words[i] = (words[i] ^ ((words[i - 1] ^ (words[i - 1] >> 30)) * 1566083941)) - (uint)i;
                if (++i >= 624)
                {
                    words[0] = words[623];
                    i = 1;
                }
            }
        }

        words[0] = 0x80000000;
        index = 624;
    }

    internal uint NextUInt()
    {
        if (index >= 624)
        {
            for (int i = 0; i < 624; i++)
            {
                uint y = (words[i] & 0x80000000) | (words[(i + 1) % 624] & 0x7fffffff);
                words[i] = words[(i + 397) % 624] ^ (y >> 1) ^ ((y & 1) != 0 ? 0x9908b0dfu : 0u);
            }

            index = 0;
        }

        uint n = words[index++];
        n ^= n >> 11;
        n ^= (n << 7) & 0x9d2c5680;
        n ^= (n << 15) & 0xefc60000;
        n ^= n >> 18;
        return n;
    }

    internal double NextDouble() => ((NextUInt() >> 5) * 67108864d + (NextUInt() >> 6)) / 9007199254740992d;
    internal int Below(int n)
    {
        J.Check(n > 0, "invalid_random_bound");
        int k = 32 - System.Numerics.BitOperations.LeadingZeroCount((uint)n);
        uint r;
        do
        {
            r = NextUInt() >> (32 - k);
        }
        while (r >= n);
        return (int)r;
    }

    internal void Shuffle(List<string> list)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = Below(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    internal JsonArray Export() => J.Array(words.Select(x => (long)x).Append(index));
    internal static JsonObject Streams(long seed)
    {
        var o = new JsonObject();
        foreach (var actor in new[]
        {
            "P",
            "V0",
            "E1",
            "V1"
        }

        )
            foreach (var purpose in new[]
            {
                "initial",
                "allocation",
                "generation",
                "selection",
                "target"
            }

            )
            {
                var key = actor + "|" + purpose;
                o[key] = new MtRandom($"crossweave:AH1:{seed}:{key}").Export();
            }

        return o;
    }
}
