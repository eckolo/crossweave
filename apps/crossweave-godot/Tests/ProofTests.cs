using Crossweave.Core;
using Crossweave.Infrastructure;
using Xunit;
namespace Crossweave.Tests;
public sealed class ProofTests
{
    [Fact] public void MatchingMovesBothCardsIntoSharedRecovery()
    {
        var session = new ProofSession(); var result = session.Apply(new("one", 0, "h1")); var state = session.Snapshot();
        Assert.True(result.Applied); Assert.True(result.Matched); Assert.Equal(1, state.Revision);
        Assert.Equal(new[] { "h1", "f1" }, state.Recovery.Select(c => c.Id));
        Assert.DoesNotContain(state.Hand, c => c.Id == "h1"); Assert.DoesNotContain(state.Field, c => c.Id == "f1");
    }
    [Fact] public void UnmatchedCardIsPlacedWithoutClaimingAMainEffect()
    {
        var session = new ProofSession(); var result = session.Apply(new("one", 0, "h3"));
        Assert.False(result.Matched); Assert.Equal("placed", result.Reason);
        Assert.Contains(session.Snapshot().Field, c => c.Id == "h3"); Assert.Empty(session.Snapshot().Recovery);
    }
    [Fact] public void DuplicateAndStaleInputDoNotApplyTwice()
    {
        var session = new ProofSession(); var command = new ProofCommand("one", 0, "h1");
        session.Apply(command);
        Assert.Equal("duplicate", session.Apply(command).Reason);
        Assert.Equal("operation-conflict", session.Apply(command with { CardId = "h2" }).Reason);
        Assert.Equal("stale-revision", session.Apply(new("two", 0, "h2")).Reason);
        Assert.Equal(1, session.Revision); Assert.Equal(2, session.Snapshot().Recovery.Count);
    }
    [Fact] public void NewRevisionCanActWhileTheViewIsStillAnimating()
    {
        var session = new ProofSession(); session.Apply(new("one", 0, "h1"));
        Assert.True(session.Apply(new("two", 1, "h2")).Applied);
        Assert.Equal(2, session.Revision); Assert.Equal(4, session.Snapshot().Recovery.Count);
    }
    [Fact] public void MutatingACopyDoesNotChangeTheStateOwner()
    {
        var session = new ProofSession(); var copy = (ProofCard[])session.Snapshot().Hand;
        copy[0] = new("other", "other", "Z"); Assert.Equal("h1", session.Snapshot().Hand[0].Id);
    }
    [Fact] public void EarlyHorizontalMoveNeverBecomesADragLater()
    {
        var gesture = new PointerGesture(); gesture.Begin("h1", 10, 10, 0); gesture.Move(40, 10, 30); gesture.Tick(500);
        Assert.Equal(GestureMode.Swiping, gesture.Mode); Assert.Equal(GestureEnd.Swipe, gesture.End(true, 510));
    }
    [Theory] [InlineData(219, GestureEnd.Tap)] [InlineData(220, GestureEnd.Drop)]
    public void HoldThresholdSeparatesTapAndDrag(double end, GestureEnd expected)
    {
        var gesture = new PointerGesture(); gesture.Begin("h1", 0, 0, 0); Assert.Equal(expected, gesture.End(true, end));
    }
    [Fact] public void CancelReleasesOwnershipWithoutADrop()
    {
        var gesture = new PointerGesture(); gesture.Begin("h1", 0, 0, 0); gesture.Tick(300); gesture.Cancel();
        Assert.Null(gesture.CardId); Assert.Equal(GestureEnd.None, gesture.End(true, 500));
    }
    [Fact] public void VersionedSmallStateRoundTripsThroughAFreshStore()
    {
        var dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        try {
            var path = System.IO.Path.Combine(dir, "probe.json"); var doc = new ProbeDocument(1, 7, "日本語・疎通");
            new ProofStore(path).Save(doc); Assert.Equal(doc, new ProofStore(path).Load());
        } finally { if (Directory.Exists(dir)) Directory.Delete(dir, true); }
    }
    [Fact] public void WriteFailureDoesNotFallbackToAnotherLocation()
    {
        var blocker = System.IO.Path.GetTempFileName();
        try { var store = new ProofStore(System.IO.Path.Combine(blocker, "probe.json")); Assert.ThrowsAny<IOException>(() => store.Save(new(1, 1, "blocked"))); }
        finally { File.Delete(blocker); }
    }
    [Fact] public void UnknownVersionIsPreservedAndRejected()
    {
        var path = System.IO.Path.GetTempFileName(); const string bytes = "{\"FormatVersion\":99,\"Counter\":2,\"Note\":\"future\"}";
        try { File.WriteAllText(path, bytes); Assert.Throws<InvalidDataException>(() => new ProofStore(path).Load()); Assert.Equal(bytes, File.ReadAllText(path)); }
        finally { File.Delete(path); }
    }
}
