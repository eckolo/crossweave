using Crossweave.Core;
using Xunit;
namespace Crossweave.Tests;
public class BoundaryTests
{
 [Fact] public void CoreHasNoGodotDependency() => Assert.DoesNotContain(typeof(BuildMarker).Assembly.GetReferencedAssemblies(), x => x.Name!.StartsWith("Godot"));
}
