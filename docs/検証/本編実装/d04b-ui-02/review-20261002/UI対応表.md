# UI-GODOT-REVIEW-01 追補対応表

固定レビュー4b8dae9b、初回提出2102acaを継承。7指摘とU01を一つの追補として実装した。実装担当の限定確認と後続UI判定を区別する。

| 指摘 | 対応 | 実装・確認 | 証拠 | 残件・範囲 |
|---|---|---|---|---|
| R01 | 消滅を伴うドロップの確定条件 | Core forkの公開回収先で消滅を検知。通常の消滅なし設置だけquick。確定までDTO・保存不変、一回のplayとrevision、再送で二重保存なし。 | [review-safety-consume](final-details/review-safety-consume.json)、[review-safety-doomed](final-details/review-safety-doomed.json)、[review-safety-quick](targeted-first/review-safety-quick.json)、[review-safety-off](targeted-first/review-safety-off.json)、[review-safety-matched](targeted-first/review-safety-matched.json) | 補充由来札の期限切れ実描画は未再現。共通判定は実装済み。 |
| R02 | 一括確定前の変更差分・取得先 | 各価格→編成／所持、blueprint別数量before→after、12枚と心得枠、変更心得の条件・効果。混合取得・編成だけ・心得だけ・取消・一回支払い／再送を確認。 | [review-preparation](final-caption/review-preparation.json) | UI適合の再判定待ち。 |
| R03 | 探索予測情報・本人状態 | 間隔、公開状態差分、リセット前打撃とリセット後、回収先、本人の現在バーと5能力／差分。一閃倍率・軽減の未公開は0にしない。配置／攻撃／身構／回復／防御付与を確認。 | [review-prediction-place](targeted-first/review-prediction-place.json)、[review-prediction-attack](targeted-first/review-prediction-attack.json)、[review-prediction-guard](final-records/review-prediction-guard.json)、[review-prediction-heal](targeted-first/review-prediction-heal.json)、[review-prediction-defense_support](final-records/review-prediction-defense_support.json) | 非公開値の推定はしていない。UI適合の再判定待ち。 |
| R04 | 札詳細の場加算・防御・消滅条件 | 基礎値と現在の一致場加算を分離。guard既定2回、付与先が使用者以外、張り直し、consume／doomedの消滅。記録札に現在場加算なし・閲覧保存不変を確認。 | [review-prediction-guard](final-records/review-prediction-guard.json)、[review-prediction-defense_support](final-records/review-prediction-defense_support.json)、R01消滅詳細 | 明示nullの無制限guard札の描画は未再現。null／欠落の表示分岐は実装済み。 |
| R05 | 同時刻の行動順・本人位置予測 | 公開atごとに同時刻を一群として表示。本人・今／次、位置範囲2〜3等。既存のorder詳細と閲覧非実行を維持。 | [review-order-tie](targeted-second/review-order-tie.json)、[review-order-different](targeted-second/review-order-different.json) | 群内の非公開順は断定しない。 |
| R06 | 移動先の端送り・受入可否 | 移動先viewport内だけ端送り。領域外で停止、元列0を維持。未払い取消可・正式所持取消不可を解放前に表示し、解放と同じ判定を使う。Esc／不可解放でPlan・DTO不変。 | [review-destination](final-caption/review-destination.json)、[review-destination-field](final-caption/review-destination-field.json) | overflowは同じ実ノードの限定寸法でも確認。自然寸法と区別。 |
| R07 | 取得群上限の全操作入口 | 公開group_id／group_limitを一覧・詳細・ドロップへ共用。上限超過はPlan・Comparison・残高・ファイル不変、別群可、取消後再選択可。Core最終拒否も限定回帰で確認。 | [review-preparation](final-caption/review-preparation.json)、selected-regression | UI適合の再判定待ち。 |
| U01 | 余白起点の取得列・手札・場のマウス送り | 初回2102acaの実ノードで余白送り不足を再現してからListViewportで修正。取得列0→140、手札／場0→180。列・札・DTOを模擬物へ交換せず、取消とPlan／DTO不変も確認。 | [review-scroll-prep](targeted-third/review-scroll-prep.json)、[review-scroll-hand](targeted-third/review-scroll-hand.json)、[review-scroll-field](targeted-third/review-scroll-field.json) | FHDの自然状態はoverflow=0。限定実ノードで送り分岐を検査。物理入力は後続。 |
