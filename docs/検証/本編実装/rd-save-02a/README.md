# RD-SAVE-02A 実ファイル保存・別プロセス再開の検証

対象：ゲーム本編実装／20260927-game-application／`impl/m1-godot-application-20260927`。実行コードSHA：`e6b3b7446626f99131396e10bfbfdbd5990d8694`。開始HEAD220d347、受領済みCore56caf205を継承する。

最新計画36435deの `docs/作業資料/とりまとめ/` 39ファイル全体→技術7f6f0fceの順に同期。技術は自Work登録以外に前回から変更なし。計画のpath/blobを再照合した。登録し直し、別Work稼働、共有原本への逆統合はしていない。

## 再現と証拠

`apps/crossweave-godot/` で `python SaveProbe/verify.py` を実行する。固定SDKのみ取得・hash照合し、locked restore→build→Testsを実行、`artifacts/rd-save-02a-<host>/` に証拠を出す。SDK取得済みなら `--no-acquire`。通常ユーザー保存先やGodotは使わない。

| 環境 | 確認内容・結果 | 証拠 |
|---|---|---|
| Linux x86_64 / kernel6.18.44 / glibc2.39 | .NET SDK10.0.401 / runtime10.0.12。72成功・失敗0・skip0、build警告0・エラー0 | [manifest](results/linux/manifest.json)、[TRX](results/linux/save.trx)、[ソース一致票](results/linux-source-receipt.json) |
| Windows Server 2025 / 10.0.26100 / windows-2025 | .NET SDK10.0.401 / runtime10.0.12。72成功・失敗0・skip0、build警告0・エラー0 | [CI run36406511159](https://github.com/eckolo/crossweave/actions/runs/36406511159)、[manifest](results/windows/manifest.json)、[TRX](results/windows/save.trx)、[取得照合票](results/windows-source-receipt.json) |

72件の内訳は新規保存30＋既存Application29＋既存基盤13。Linux実行は公開直前なので生manifestのHEADは220d347だが、記録した16入力ファイルのSHA256すべてが公開コードe6b3b744と一致する。記録を後から別SHAに書き換えず、一致票を別添する。Windowsのcommitはe6b3b744で一致。Windows checkoutのテキストはCRLFのため、その改行を含むhashで一致確認した。Actions artifactの期限切れ後も読めるよう、ZIPから取り出した全15証拠ファイルを本フォルダに保存する。

実I/O：通常のファイル生成・flush・置換・backup・読込み・復旧・実際のtmp作成拒否。実プロセス：別CLI起動、Killによる中断、所有者の強制終了、別配置からの起動。注入：書込み点のIOException、容量不足相当、置換後の応答／読戻し障害。容量不足試験はディスクを実際に満杯にした試験ではなく、OS全体の電源断試験でもない。

## 入力・期待結果・実結果

検査の本体は [SaveTests.cs](../../../../apps/crossweave-godot/Tests/SaveTests.cs)。各ケースの成功・失敗はTRXに実名で記録される。

| 分類／件数 | 入力・故障点 | 期待する保存前後と実結果 |
|---|---|---|
| 初回・draft・preview／1 | 新規20個体、取得予定basic:PS01、予測→save_draft→別プロセス→discard | 予測でファイル不変。draftは未払いのまま保存、dirty出発拒否、購入済み個体は増えない。初期backup一致、DTO全体一致 |
| 確実な保存失敗／5 | BeforeWrite、DuringWrite、AfterFlush、BeforeReplace、tmpパスをディレクトリにして実I/O拒否 | 旧メモリー・旧完全ファイルが完全一致、revision/乱数を進めない。同じ要求を再試行で1回適用、次はreplayed |
| 初回失敗／1 | 初回DuringWrite IOException | sessionを返さず保存なし。障害除去後に作成可能 |
| 置換後応答障害／2 | AfterReplace例外、加えてBeforeReconcile例外 | 前者は候補を読戻してcommitted、後者はindeterminate→blocked→Reload。両者とも再送はreplayed、ファイル不変 |
| 外部巻戻し／1 | 所有中に外部から旧ファイルへ差替え | 全バイト比較で検出、旧所有者を停止、外部のファイルを上書きしない |
| 破損復旧／1 | 完全backupを残し現保存を不正JSONにする | Open／CreateNew拒否。明示RecoverBackupで直前状態へ、壊れた原本を別名保全しbackupも不変 |
| 非対応・checksum／4 | fileVersion999、DTO999、未来content、hash不一致 | 診断を区別、現保存・backupを保全、未来版への復旧上書きも拒否 |
| 書込みプロセス中断／4 | DuringWrite、AfterFlush、BeforeReplace、AfterReplaceで実Kill | 置換前は旧完全状態、置換後は新完全状態。別プロセスで読込み、再送はcommittedまたはreplayedで最終状態一致 |
| 初回プロセス中断／2 | 初回DuringWrite／AfterReplaceで実Kill | 途中tmpを黙って昇格しない。明示退避後の新規作成、または確定済みrevision0を再開 |
| 排他／1 | 子プロセスが所有中に別open、その後所有者Kill | save_in_use、ファイル不変。所有者終了後は取得可能 |
| 終了待機／1 | BeforeReplaceで処理待機中にDispose | 保存完了までDisposeは戻らず、次の所有者は確定revision1を読む |
| 本編継続／6 | 下表の既存操作列、各操作ごとに実ファイル、代表点を別プロセス | メモリー参照結果と全DTO・公開view・次結果一致。帰還／取得再送でも支払い・報酬・履歴を二重適用しない |
| 固定v1・別配置／1 | 実CreateNewで作った固定保存を、別フォルダへコピーしたCLIで開く | 同じ絶対保存先を使い、次の出発結果がメモリー復元結果と一致。実行物の隣に保存を作らない |

上表はLinux・Windows双方で全件成功。実結果は上の環境表・各TRXで確認する。予測／拒否の不変、要求衝突、古いrevision、旧入力のゲーム意味照合は既存42件も回帰確認している。

## 本編の代表状態

旧Coreで採用済みの `Tests/Fixtures/application-oracle.json.br` の入力列を再使用。新たに旧JSを実行して比較し直したものではない。各保存操作の参照結果は同じ開始DTOから独立したメモリーCoreで計算する。全State（全MT語・位置、run、手札、資源、要求履歴等）とviewを比較する。独立した次操作が発行するview_nonce／view_tokenだけは正規化し、同じ保存の再読込みではその2項目も含め完全一致を確認する。

| 入力列 | 操作数 | 別プロセスで次操作・再送を確認した点数 | 意味 |
|---|---:|---:|---|
| natural | 79 | 11 | 通常初期値から準備・探索・目的帰還・編成変更・再出発 |
| withdraw-before | 5 | 4 | 探索開始後、獲得前の任意帰還 |
| withdraw-protected | 20 | 4 | 保護した獲得を伴う任意帰還 |
| defeat | 50 | 4 | 戦闘・全滅帰還 |
| withdraw-unprotected | 2 | 2 | 合法fixtureによる未保護獲得の帰還精算 |
| legal-acquisition | 4 | 2 | 合法fixtureの資源で取得・変換・編成・再出発 |
| 合計 | 160 | 27 | 自然初期値を水増しせず、目的／任意／全滅の3帰還を保存して再開 |

各代表点でsnapshot用の別プロセスが保存直前DTOとviewを完全照合し、その後のexecuteも別プロセスで行い、さらに別プロセスで同要求を再送する。`results/<host>/checks/campaign-*.json` に操作名・要求ID・revision・phase・PID・expected/actual hashを保存。中断4点は `crash-*.json` に停止／読込／再送PIDと最終hashを保存する。

## N2〜N6と後続境界

| 項目 | 02Aで確認済み | 02B／D04で確認すること |
|---|---|---|
| N2 準備・取得・編成 | 未払いdraftと確定購入を区別、全所持・札組・心得・資源を一操作保存、再送防止 | Godotの確定操作・成功／失敗表示との接続 |
| N3 探索中断 | 全run・札所在・乱数内部状態を保存し、別プロセスで同じ次結果 | 通常user://保存先、起動時読込み、中断／終了導線 |
| N4 帰還・再出発 | 3帰還、領収・要求履歴、取得・編成変更・再出発を実ファイルで再現 | 画面の結果再表示・場面遷移との結線と実操作 |
| N5 保存異常 | 確実失敗の状態不変、成否不明の停止とReload、実Kill、backup、破損保全、二重起動拒否 | 失敗／停止／復旧の表示、Godot終了待機。OS全体の停電耐性は未確認 |
| N6 形式・更新保持 | 実v1固定保存、別配置CLIから同じ保存先、未来版・破損の原本保持 | 実配布版の差替え・ユーザーデータ維持の最終受入。存在しない旧M1移行は実装しない |

対応形式・APIは[接続契約](接続契約.md)、読む順序・一操作の流れ・失敗分岐・C#とGodotの区別は[コード解説](コード解説.md)。Windows保存CIはWindows11物理入力・文字・音・倍率・GPU性能の確認とは別。基盤実機は結果待ちを維持する。Godot画面、02B、配布、RD-SAVE-02親／D04／M1完成は今回の成果に含めない。
