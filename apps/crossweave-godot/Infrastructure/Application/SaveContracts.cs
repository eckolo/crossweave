using Crossweave.Core.Application;

namespace Crossweave.Infrastructure.Application;

/// <summary>読込み・初回作成・復旧を開始できなかった理由。既存保存を初期化する指示ではない。</summary>
public sealed class SaveException(string code, string message, Exception? inner = null) : Exception(message, inner)
{
    public string Code { get; } = code;
}

/// <summary>保存を変更せず調べた結果。ready以外では通常プレイを開始しない。</summary>
public sealed record SaveFileStatus(string Code, long? Revision = null, string? Detail = null);
public sealed record SaveDiagnosis(SaveFileStatus Primary, SaveFileStatus Backup, string[] PendingFiles);

// 故障点は実I/Oの前後に置く。製品APIでは公開せず、試験と検査CLIだけが利用する。
internal enum SavePoint { BeforeWrite, DuringWrite, AfterFlush, BeforeReplace, AfterReplace, BeforeReconcile }
internal interface ISaveFaults { void Hit(SavePoint point, string temporaryPath); }
internal sealed record SavedState(ApplicationDto Dto, byte[] Bytes)
{
    internal long Revision => Dto.State["revision"]!.GetValue<long>();
}
