# 採取・台帳補助の保存版

ここは実行した担当用補助コードの保存版。元の実行位置は`apps/crossweave-godot/.tools/`、原本読み取り用checkoutは同じ配下の`ui-original`（72d0eb58）、固定レビューは`fixed-ui-review`（8b535c2f）。各補助は元位置からの相対rootを使用し、当時の既定Node/Python/Edgeパスを含む。再採取する担当は元位置へコピーし、既定開発環境と固定原本を用意して新しい出力先で実行する。

通常の本編検査入口は今回版の確認入口にある`UiProbe/verify.py`。合法fixtureは通常Gitへ保存済みで、原本を任意改変する必要はない。localhostや拒否経路は使っていない。担当・CIの準備手順であり、遊ぶ利用者への導入・ビルド要求ではない。

原本採取は合法Campaign・MemoryStore・公開commandを使う。fixture接続は二つの識別タグだけを既存C#形式へ合わせ、登録数値を変えない。`build_reproduction_report.py`→`coverage_receipt.py`→`id_crops.py`→`preservation_receipt.py`の順に台帳・部品状態・等倍画素・保全を照合する。CIは`cloud_receipt.py`でZIP digestと実内部3manifestを確認する。
