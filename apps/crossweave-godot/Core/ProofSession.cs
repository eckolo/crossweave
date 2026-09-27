namespace Crossweave.Core;

public sealed record ProofCard(string Id, string Name, string Attribute);
public sealed record ProofSnapshot(int Revision, IReadOnlyList<ProofCard> Hand,
    IReadOnlyList<ProofCard> Field, IReadOnlyList<ProofCard> Recovery);
public sealed record ProofCommand(string OperationId, int ExpectedRevision, string CardId);
public sealed record ProofResult(bool Applied, string Reason, bool Matched, int Revision);

/// <summary>Only matching/placement and shared recovery for an integration probe.
/// No battle damage, economy, turn/lifetime advancement, or full campaign rules.</summary>
public sealed class ProofSession
{
    private readonly List<ProofCard> _hand = [new("h1", "牽制", "A"), new("h2", "踏み込み", "B"), new("h3", "小突き", "C")];
    private readonly List<ProofCard> _field = [new("f1", "受け流し", "A"), new("f2", "重撃", "B")];
    private readonly List<ProofCard> _recovery = [];
    private readonly Dictionary<string, ProofCommand> _accepted = new();
    public int Revision { get; private set; }
    public ProofSnapshot Snapshot() => new(Revision, _hand.ToArray(), _field.ToArray(), _recovery.ToArray());
    public ProofCard? MatchFor(string cardId)
    {
        var card = _hand.Find(c => c.Id == cardId);
        return card is null ? null : _field.Find(c => c.Attribute == card.Attribute);
    }
    public ProofResult Apply(ProofCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.OperationId)) return new(false, "invalid-operation", false, Revision);
        if (_accepted.TryGetValue(command.OperationId, out var previous))
            return new(false, previous == command ? "duplicate" : "operation-conflict", false, Revision);
        if (command.ExpectedRevision != Revision) return new(false, "stale-revision", false, Revision);
        var card = _hand.Find(c => c.Id == command.CardId);
        if (card is null) return new(false, "missing-card", false, Revision);
        var match = MatchFor(card.Id);
        _hand.Remove(card);
        if (match is null) _field.Add(card);
        else { _field.Remove(match); _recovery.Add(card); _recovery.Add(match); }
        Revision++;
        _accepted.Add(command.OperationId, command);
        return new(true, match is null ? "placed" : "matched", match is not null, Revision);
    }
}
