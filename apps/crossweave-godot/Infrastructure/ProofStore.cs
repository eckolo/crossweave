using System.Text.Json;
namespace Crossweave.Infrastructure;

public sealed record ProbeDocument(int FormatVersion, int Counter, string Note);

/// <summary>Dedicated small-state transport probe. Not the campaign save contract.</summary>
public sealed class ProofStore(string absolutePath)
{
    public string Path { get; } = System.IO.Path.IsPathFullyQualified(absolutePath)
        ? absolutePath : throw new ArgumentException("Use an explicit absolute path", nameof(absolutePath));
    public ProbeDocument? Load()
    {
        if (!File.Exists(Path)) return null;
        var document = JsonSerializer.Deserialize<ProbeDocument>(File.ReadAllText(Path))
            ?? throw new InvalidDataException("Empty proof state");
        Validate(document); return document;
    }
    public void Save(ProbeDocument document)
    {
        Validate(document);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Path)!);
        // A unique temp avoids simultaneous temp truncation; this does NOT solve multi-process ownership.
        var temp = Path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                JsonSerializer.Serialize(stream, document, new JsonSerializerOptions { WriteIndented = true });
                stream.Flush(true);
            }
            File.Move(temp, Path, true);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }
    private static void Validate(ProbeDocument document)
    {
        if (document.FormatVersion != 1 || document.Counter < 0 || document.Note is null)
            throw new InvalidDataException("Unsupported or invalid proof state; preserve the original file");
    }
}
