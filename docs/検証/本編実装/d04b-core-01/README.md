# D04B-CORE-01 本編Core・検証記録

2026-09-28（日本時間）。Work `20260927-game-application`。純C#・メモリー保持のCoreを実装した。画面で遊べる本編、正式保存、M1完成の提出ではない。

## 成果と入口

- 本体：`apps/crossweave-godot/Core/Application/`、名前空間 `Crossweave.Core.Application`。単一所有者はGameApplication。ProofSession／ProofStoreを本編へ流用していない。
- [C1対応表](本編対応表.md)、[画面・保存への受渡し](画面・保存への受渡し.md)、[受領版・原本hash](source-receipt.json)。計画全37ファイルのblobは自Workの計画同期JSON。
- `ApplicationTests.cs`に操作列との比較と境界検査、`Fixtures/application-oracle.json.br`に旧版の固定期待結果と操作列。テストはNodeなしで動く。
- [とりまとめ向け引継ぎ](とりまとめ引継ぎ.md)と自Work設定が依頼全体の状態を示す。共有索引の登録・読戻しも完了（7f6f0fc）。

リポジトリの `apps/crossweave-godot/` から、固定SDKで実行する。

```sh
.tools/dotnet/dotnet build Crossweave.sln -m:1 --nologo -p:NuGetAudit=false
.tools/dotnet/dotnet test Tests/Crossweave.Tests.csproj --no-restore -m:1 --nologo
# 本編だけ、一巡だけを再実行する場合
.tools/dotnet/dotnet test Tests/Crossweave.Tests.csproj --no-restore -m:1 --filter FullyQualifiedName~ApplicationTests
.tools/dotnet/dotnet test Tests/Crossweave.Tests.csproj --no-restore -m:1 --filter FullyQualifiedName~RecordedJavaScriptOperationsMatchCombatAndPersistentResults
```

SDKの初回取得は既存bootstrap／toolchain.lockの手順。今回は固定10.0.401をSHA512照合して使用。Godotエンジンを起動しないCore検証なので、全solutionの.NETビルド以外にGodot実画面・export・プロセス再開は実行していない。

## 実測結果

Linux x64、.NET SDK10.0.401／runtime10.0.12／net10.0。既存solutionのCore・Infrastructure・Godot・Testsをビルドし、警告0・エラー0。xUnitは**42成功／失敗0／skip0**（新本編29＋既存基盤13）。旧JavaScriptの過去成功件数は加算していない。検査名・結果は `results/application.trx`、実行ログとhash一覧は同フォルダ。

### 旧版との比較

`Tests/application-oracle.mjs`を固定技術版9f46e0eの未変更srcとsupport上で実行して得た期待値を、C#で各操作の直後に比較した。6操作列、計160コマンド。初期所持・資源を水増ししていない。

| 入力 | 操作数 | 確認した期待結果（100units＝着想1） |
|---|---:|---|
| natural | 79 | 初期0→踏破300→基本PS01取得200と札組変更→再訪踏破300→残高400。初解決／再訪・候補・知識を継続 |
| withdraw-before | 5 | 保護前撤退0、帰還後の未解決再挑戦 |
| withdraw-protected | 20 | 保護済RW01を持帰り100 |
| defeat | 50 | 自然戦闘で得た未保護RW02を緊急脱出で喪失、獲得0 |
| withdraw-unprotected | 2 | 上記の自然到達checkpointを既存validatorで検証して再開、RW02を撤退で喪失、獲得0 |
| legal-acquisition | 4 | 既存d03-natural-homeの合法な3踏破・900から修飾PS02と基本PS01を600で取得し出発。自然初回と別入力 |

比較対象は全探索state、札の所在・残期限・性能、主体・防御・予約、乱数全語、memory、イベント順、所持・経済台帳・帰還候補と署名、案件。差分はなし。目録の同種集約行だけ表示順を正規化して比較する。UID/run/報酬keyは文字列も一致。view nonceは各確定で新しい値を発行するため、二つの復元先の次結果比較ではこの項目のみ除外する。

追加でCPython文字列seed互換MTを3seed・全624語＋index・次16語、D58の既存fixture構成を用いた6演算とイベント順を比較。weak_B/l/hによる場補正、本人／他者防御、同源張り直し、有限回数、命中0/99を含む。全旧テストの移植完了・全seedの一致を主張しない。

期待値の再生成が必要な場合のみ、ルートから `node apps/crossweave-godot/Tests/application-oracle.mjs`。記録はBrotli圧縮された損失なしdeltaで、C#試験が再構成する。原本srcの技術版・blobを先にsource-receiptと照合する。通常のC#検証で再生成しない。

### C#境界確認

初期20実個体と12編成、残高0／公開コピー改変の隔離、取得前取消、予測不変、残高不足・心得容量8・同base2・群上限・個体重複・無効札組・未選択pendingの一括拒否、取得実個体と修飾値を維持した出発、ロック・使用中・初期付与の変換拒否、1/4変換と基本棚復活を確認した。

取得・変換・帰還の同要求再送、同ID異内容、古いrevision/token、未確定draftの出発拒否・復元・取消、帰還本文閲覧による探索・経済の不変、private UID／NPC私有札順の非公開を確認した。

home/exploring/returnのDTOをJSONでメモリー往復し、別インスタンスの次コマンドで乱数・手札を含む全状態が一致した。拒否前後はDTO全体のcanonical値を比較。偽の保存境界の失敗時は元本体不変、同要求再試行成功、candidateを後から変えても本体に影響しない。実ファイル保存の失敗試験ではない。

## 未確認・残件

Coreの今回の限定条件は確認済み。Godot本編画面、OS入力、Windows11／FHD倍率、音・演出・体感性能、正式保存・更新互換・破損復旧・別プロセス再開、配布仕上げ、人の試遊は後続。仮データの製品採用や全内容のバランス調整も行っていない。

DTOの任意不正編集への完全な検査、長期の要求履歴・領収・知識の増加制御は正式保存で互換・寿命を定める。本編状態の公表後にUI都合で巻き戻さない。保存境界のfalse/例外は未永続化という契約を後続も守る。
