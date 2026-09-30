# Dropboxアクセスの成功・失敗比較（2026-09-30）

利用者はブラウザーへの切替を代替手段として認めないと明示。ブラウザー案を撤回し、以後の再開条件から外す。今回の調査ではブラウザー・共有リンク作成・別の取得経路を使用していない。通常のDropboxプラグインによる読取りで比較した。

## 今回直接確認できた差

| 操作 | 実際の処理経路 | 結果・限界 |
|---|---|---|
| 本編ZIP・証拠ZIPの保存 | Dropbox upload_file と完了確認 | 前段で成功、内容hash一致。逆方向のZIP取得成功を意味しない |
| 同じ保管フォルダーの一覧と旧ZIPのmetadata | Dropbox list_folder / get_file_metadata | 今回も成功。旧ZIP82,448,984 bytes、rev不変、is_downloadable=true |
| 同フォルダーの外部成果物.md本文 | Dropbox fetchが本文を直接返す | 今回も成功。作業用実行環境から別途URLをGETしていない。ZIP原本の取得ではない |
| 今回ZIPの一時URL発行 | Dropbox download_link | 初回・再試行とも成功。プラグインの処理はここまで |
| 今回ZIPの全バイト取得 | 発行されたURLを作業用Python urllibでGET | 2回失敗。再試行403本文は Forbidden. Calls to this URL are not allowed.。実行環境のURLアクセス制限 |

したがって、Dropboxプラグイン全体やDropboxアカウントへの接続が失敗しているとはいえない。現在直接確認できる差は、本文をプラグインが返す経路は成功し、プラグイン外の実行環境からダウンロードURLへ接続する経路で止まること。ZIP破損やDropbox側の認可失敗をこの403から推定しない。Dropbox本体まで到達した応答は取得できていない。

## 過去のバイナリ取得成功記録

- 9月27日の旧基盤ZIP `crossweave-rd-proof-02-20260927-f2eb59b-win-x64.zip` について、旧枝commit `0ef1689599b0dbeaf89646322811bbb7a39cac93` の `docs/検証/実行基盤/m1-godot/delivery-record.json` は「Dropbox保存後の全ZIP・manifest・207 payload hash一致」を記録している。現在のmetadataも同一rev。82,448,984 bytesで、今回84,480,241 bytesと同じ大容量ZIPである。
- ただし、この記録と取得できた会話には、当時のダウンロードツール、コマンド、HTTP応答、URLホスト、ネットワーク許可条件がない。成功報告を否定はしないが、現在同じ経路を再現できたとも扱わない。以前だけ動いた理由や、当時と今回の環境差は未確定。
- 9月9日の回復構築ZIPから通常ファイルへ取り出した記録も確認した。`docs/検証/統合試作/deck_feedback_trial/README.md` に元ZIP rev／bytes／取り出したファイルhashがあるが、バイナリ転送方法のログはない。これだけでは成功経路を復元できない。

## 他Workで取得元まで特定できたZIP（追加調査）

| Work／成果 | 取得元と処理 | 記録の根拠 |
|---|---|---|
| ゲームバランス検討 CO-D03、9月20日 | ChatGPT Library上の `crossweave-CO-D03-delivery.zip` を受領し展開。11,031,736 bytes | Library file ID `libfile_ef0abeeed330819199e75d6e3d36cda0` とダウンロード参照先、ZIP SHA-256、変更36ファイル・復元後753ファイルの照合を記録 |
| ゲーム本編実装 D04B-UI-01＋RD-SAVE-02B、9月30日 | GitHub Actionsの証拠ZIPをダウンロードしhash照合。3,507,623 bytes | artifact ID `11073242830`、ZIP SHA-256、download_digest_match=trueを記録 |

CO-D03の根拠は `docs/作業資料/とりまとめ/引継ぎ/CO-D03_20260920_成果受領/README.md`・同 `verification.json`、受領側は `docs/検証/接続条件/co-d03/receipt-20260920/README.md`。ゲーム本編の根拠は `docs/検証/本編実装/d04b-ui-save-01/results/ci-receipt.json`。今回固定ref `523d2693666fd100bd97d11dad5dd57008874c47` から取得して確認した。

これらは取得元を特定できるZIP処理の成功例である。一方、当時のダウンロード呼出ツール名・コマンド自体はこの記録にはないため推測で補わない。LibraryとGitHub ActionsからZIPを受け取れることを、Dropboxプラグイン単独でZIP原本を受け取れた証拠にはしない。今回の保存先を変更する提案・操作でもない。Dropbox由来の旧ZIP読戻しの転送方法は、前節のとおり未確定。

## 現在のプラグイン機能との対応

公開されているDropboxツール群を確認した。`fetch` は5 MiBまでの抽出テキストを返す機能で、ZIP原本を返す機能ではない。`download_link` は一時URLとmetadataを返す。`file_preview` は画像プレビュー・リンクで原本取得ではない。今回の80 MiB超のZIPを、URLの外部GETを挟まず原本ファイルとして返す機能は、現在公開されている機能には見当たらない。

`fetch` の成功をZIP原本の全バイト読戻しに読み替えたり、ZIPをテキスト抽出へ投入して成功扱いにしたりしない。確認済みの失敗経路へ、サイズ・パス・User-Agent等だけを変えて接続制限を回避する試行もしない。

## 状態と再開条件

P5の全バイト読戻し／RD-PACK-02全体は未完了のまま。P1〜P4・P6、保存済みZIP、配布ソース `0765f1588e63b591733f3ea87635c8f4814dc1bc`、Windows実機未確認の区分は変わらない。

ブラウザーを前提とする再開案は撤回。再開には、プラグインからZIP原本を取得できる対応機能、またはプラグイン発行URLへ接続が許可された実行環境が必要。過去の具体的な成功操作ログが得られた場合は、まず経路・条件を比較する。異なる経路の採用や設定変更は原因・影響を示して事前相談する。現時点で利用者のゲーム操作・実機試遊・配布物再生成は不要。

比較の証拠は `docs/検証/実行基盤/rd-pack-02/dropbox-access-comparison.json`、今回のGET失敗記録は `docs/検証/実行基盤/rd-pack-02/download-diagnosis.json`。
