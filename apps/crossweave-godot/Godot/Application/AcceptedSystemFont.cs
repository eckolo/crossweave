using System.Buffers.Binary;
using Godot;

namespace Crossweave.Application;

/// <summary>現OSにある書体の一faceをメモリで選ぶ。素材や保存へ書体を複製しない。</summary>
internal static class AcceptedSystemFont
{
    internal static Font Resolve(string family, int weight, int face, Font fallback)
    {
        string path = OS.GetSystemFontPath(family, weight);
        if (OS.GetName() == "Windows" && System.IO.File.Exists(path)
            && path.EndsWith(".ttc", StringComparison.OrdinalIgnoreCase))
        {
            // このGodot版ではVariationFaceIndexを変えてもYu Gothic face 0の
            // 実測幅が残った。既存faceのテーブルをそのまま一書体として渡す。
            // glyph・メトリクス・nameはOSの原データ。補正するのは格納位置とchecksumだけ。
            var data = SingleFace(System.IO.File.ReadAllBytes(path), face);
            if (data is not null)
                return new FontFile { Data = data, KeepRoundingRemainders = true, Fallbacks = [fallback] };
        }
        return new SystemFont { FontNames = [family, "Segoe UI", "sans-serif"], FontWeight = weight, Fallbacks = [fallback] };
    }

    private static ushort U16(byte[] data, int offset) => BinaryPrimitives.ReadUInt16BigEndian(data.AsSpan(offset, 2));
    private static uint U32(byte[] data, int offset) => BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset, 4));
    private static void Put32(byte[] data, int offset, uint value) => BinaryPrimitives.WriteUInt32BigEndian(data.AsSpan(offset, 4), value);

    private static byte[]? SingleFace(byte[] collection, int face)
    {
        if (collection.Length < 16 || U32(collection, 0) != 0x74746366 || face < 0
            || face >= U32(collection, 8) || 12L + (face + 1L) * 4 > collection.Length) return null;
        uint faceOffset = U32(collection, 12 + face * 4);
        if (faceOffset + 12L > collection.Length) return null;
        int start = (int)faceOffset, count = U16(collection, start + 4), header = 12 + count * 16;
        if (count == 0 || start + (long)header > collection.Length) return null;
        var tables = new List<(int record, int source, int length, int destination)>();
        long total = header;
        for (int i = 0; i < count; i++)
        {
            int record = start + 12 + i * 16;
            uint offset = U32(collection, record + 8), length = U32(collection, record + 12);
            if (offset + (long)length > collection.Length || total + length + 3 > int.MaxValue) return null;
            tables.Add((12 + i * 16, (int)offset, (int)length, (int)total));
            total += (length + 3L) & ~3L;
        }
        var result = new byte[(int)total];
        Array.Copy(collection, start, result, 0, header);
        int head = -1;
        foreach (var table in tables)
        {
            Array.Copy(collection, table.source, result, table.destination, table.length);
            Put32(result, table.record + 8, (uint)table.destination);
            if (U32(result, table.record) == 0x68656164 && table.length >= 12) head = table.destination;
        }
        if (head < 0) return null;
        Put32(result, head + 8, 0);
        uint checksum = 0;
        for (int offset = 0; offset < result.Length; offset += 4)
            checksum = unchecked(checksum + U32(result, offset));
        Put32(result, head + 8, unchecked(0xB1B0AFBA - checksum));
        return result;
    }
}
