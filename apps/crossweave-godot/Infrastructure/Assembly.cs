using System.Runtime.CompilerServices;
[assembly: InternalsVisibleTo("Crossweave.Tests")]
[assembly: InternalsVisibleTo("Crossweave.SaveProbe")]

// Godot実ノードの隔離試験専用。通常起動から故障点は選べない。
[assembly: InternalsVisibleTo("Crossweave.Proof")]
