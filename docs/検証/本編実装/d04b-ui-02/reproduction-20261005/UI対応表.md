# 57差異・N・R対応表

基準2026-10-04.1／UI8b535c2f／原本72d0eb58。修正SHA `c761cbf4950a750b5b337e1bc9926528b87be54a`。**修正提出は独立UI適合を意味しない。**

全path/blob・原本locator・同状態対・期待／実績は[JSON](UI対応表.json)へ。RとNは57差異に重なるため、件数へ単純加算しない。

| ID | 今回の変更・実績 | 残件 |
|---|---|---|
| V-C01 文字のfont・weight・行組 | 用途別size/line-height、実Yu Gothic UI 400/600、Georgia＋Yu Minchoを採取して選択。末行にもline boxを確保。現在の実font名・term幅は各report、過去OS/AAはU-C01へ残す。 | DEC-UI-04：書体faceの誤解決、行高、末行、位置は修正。過去のOS/AAが未記録で、現固定原寸対のAA/丸め残差を自動許容しない。 担当 UI改善。再開 判定された文字領域のmetrics/line placement/AA方法を同じ本編で修正し、読む順と原寸対を追補。 |
| V-C02 配色の名前空間を一本化 | 取得cp／探索cw／共通navのlight-dark tokenを分ける。shaderのTexture二重乗算を除き、paletteとalphaを実ノードへ記録。 | 独立適合未判定 |
| V-C03 共通ナビの図記号・色・字寸法 | 既存BookOpen/Menu SVG、20px記号・18px文字・f2f5e9/a8b9a5/角5へ。右上実rectはrecords1679,5,152,56、menu1839,5,56,56。 | 独立適合未判定 |
| V-C04 ボタンのhover・pressed・focus・disabled | 通常・hover・押下・keyboard focus-visible・selected・disabledを役割別themeへ。押下中もhover色を保持し、keyboard輪郭は別面。部品状態の実画像を結ぶ。 | 独立適合未判定 |
| V-C05 外枠と1px内側座標 | 外側1920×1080、1px枠、内側origin1,1と1918×1078を一つの座標系へ。 | 独立適合未判定 |
| V-C06 標準スクロールバーの残存 | 原本実測の縦横10px／thumb直交余白2／角3／標準UI三角。縦track fcfcfc/2c2c2c、thumb 8b8b8b/9f9f9f、hover 636363/d1d1d1、横は探索line/透明track。CSS height6よりthinの実寸が優先。 | 独立適合未判定 |
| V-P01 三領域の開始位置と行高 | 見出し32＋gap8＋grid開始、padding16／gap20／grid2へ。先頭tile実rectをPNGとnodesへ固定。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P02 取得欄・所持欄の囲い範囲 | 取得底2、所持の左右1／底4、編成inset1の面をgridから描く。見出しを囲いの外へ。 | 独立適合未判定 |
| V-P03 タブの選択表現 | 64px連続帯、角0、active315849/on-activefffef5の札・心得タブ。 | 独立適合未判定 |
| V-P04 共通取得札の枠・角 | 2px枠内を含む352×80、角5、内側76を札・心得・移動像で共用。 | 独立適合未判定 |
| V-P05 札の操作側が外枠に食い込む | 操作領域278,2,72,76、枠内区切りと右側角を共通面へ。 | 独立適合未判定 |
| V-P06 編成済みの外すまで主操作色 | 編成済みの枠58754a、外すはf5f7eeのsecondary。取得／編成と別の色。 | 独立適合未判定 |
| V-P07 メタ行の記号・文字・数量 | 既存Layers/ScrollText/Check/Lightbulb/Grid2X2、18px、gap6、数量右寄せ。公開数量とロックは維持。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。／DEC-UI-02：取得メタは原本layoutがit.attributeを読む一方、公開札詳細はattrを持ち、原本の該当実画像では属性文字が空。Godotは既存公開attrを表示している。 担当 UI改善（UI adapter）、公開名を変える契約判断が必要ならゲームバランス検討。再開 固定された表示対応へ同じ札面だけ修正し、取得/編成/詳細とDTO不変を確認。 |
| V-P08 未払いの斜線・色・時計 | 未払い専用の金茶破線と135deg斜線、独立した右下Clock3。価格の上に時計を重ねない。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P09 取得元の跡を文章化 | 同寸法placeholder、中央ArrowRight、底3px。正式取得・群の消去条件を既存公開応答に従う。 | 独立適合未判定 |
| V-P10 空き枠・候補なしの形 | 352×80の空枠・候補なし・取得完了部品と20/28の文言。合法な空編成取消に加え、通常探索で資金を得て全5群を取得した空状態を同じ原本とGodotで採取。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P11 財布の現在・未払い予測 | 現在財布Lightbulbと24px値、変更後をClock3・点線tokenへ。無効案は—を保つ。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P12 取得フッターと固定操作 | 64px e9eee0帯／上線、Undo2、角0、戻す／確認する22px。上限・容量は見出し／確認表へ。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P13 取得窓の面・余白・境界 | 取得詳細・確認・変換を960×820の共用frame、header64/body24/footer72、境界・影・暗幕へ。 | 独立適合未判定 |
| V-P14 一括確認が改行Labelへ平坦化 | 中央財布36px、取得価格・移動先、数量差分、容量の二列、変更心得のfoldへ。R02の公開値と原子確定を保持。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-P15 取得詳細の位置・価格・修飾構造不足 | 取得所在の三領域とClock3、実公開price_units、112pxラベル列、公開修飾fold。深いコピーの前に説明を付ける。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。／DEC-UI-05：前版の本文詳細/任意本文の読了して閉じる、未公開予測補足、Windows保存・診断・復旧に原本の一対一の窓/footerがない。固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、そのA06部品にロック/解除/変換見積の入口がなく、ST-P08の同状態窓は未取得。Godotの既確認ロック/見積/変換・保存機能を保全している。 担当 UI改善。規則・共通契約の意味を変える場合だけゲームバランス検討。再開 固定対応へ表示だけ移し、本文読了/ロック/見積/変換/保存拒否/復旧と関連使用先を限定確認。 |
| V-E01 探索の手札・場・本人帯の縦位置 | field上413／hand上688／本人帯983。内側の行とgap20から一つの座標系で配置。 | 独立適合未判定 |
| V-E02 探索背景の前景色かぶせ | 既存night-tideのcoverと下方e8edd933 wash。画像そのものは変更しない。 | 独立適合未判定 |
| V-E03 場の帯の線・透明度 | 場帯border0、e9eed81a、radius8。受入可否枠は別描画層。 | 独立適合未判定 |
| V-E04 札面の角・線と絵面gradient | 1px線、角6/7、150deg多stop gradientを札の共用面へ。shaderは既存textureのalphaだけをmask。 | 独立適合未判定 |
| V-E05 札・主体の図記号をUnicode置換 | 能力・対象・操作の既存Lucide SVGを再利用。札絵の64px glyphは原本art(cards)の既存字形。地形は原本bundleのMountain未登録／小さいfallbackと基準のSVG指示が食い違うためUI判断を残す。 | DEC-UI-01：基準は既存SVGを要求するが固定原本vendorの30件subsetにMountain/Store/LayoutGrid/Check/Clock3/Inbox/Plus/Undo2等が登録されず、実画像では未描画かfallback。Godotは基準の既存SVGを使った。原本不備を無断で承認済み差異へしない。 担当 UI改善。再開 UI指定の同じ既存定義とlocatorへ該当IDだけ合わせ、関連原寸対を再提出。 |
| V-E06 属性badgeの枠を欠く | 属性badge16/24、1px線、角4、左右4pxの元面を再現。 | 独立適合未判定 |
| V-E07 空の場札のcaption高さ | 空の場は下端の短いstrong caption。通常札名48pxの空白を増やさない。 | 独立適合未判定 |
| V-E08 予測／消費ラベルの位置と背景 | 予測／消費は右上4px・paper・padding6・角3のbadge。下段48/24/28のcaptionは保持。 | 独立適合未判定 |
| V-E09 離れる場札の警告色 | 離れる場札はdanger943c25、予測とlinkedの重ね順を保持。消滅先は公開応答だけから読む。 | 独立適合未判定 |
| V-E10 主体と本人のバーを横2本へ変更 | 余力／隠蔽は上下4＋2＋4px、後者alpha.6、18px能力行。本人・相手の公開差分を残す。 | 独立適合未判定 |
| V-E11 主体の通常枠・選択枠・hover | 通常枠transparent／選択は内側2px・target SVGとsoftcaption。潜水服282×176／上8を保全。 | 独立適合未判定 |
| V-E12 本人帯の幅・内容密度 | 本人400px、手札18px、公開山札・状況は既存入口へ。帯を未承認幅へ拡張しない。 | 独立適合未判定 |
| V-E13 札の下の操作枠を固定拡張 | 操作56px／18px／左右16／内容幅／gap8、選択札中心から追従して画面端へclamp。 | 独立適合未判定 |
| V-E14 関係線が直線矢印へ変わる | 可視範囲へclipした縦端点をcubicBezier2px／alpha.5で結ぶ。新しい矢印を付けない。 | 独立適合未判定 |
| V-E15 行動順の顔・余白・次のbadge | 40px顔22px／群間16px・群内2px、先行›と現在／次のsoftlabel、底2px。R05の公開群と本人位置を保持。 | 独立適合未判定 |
| V-W01 探索詳細の文字・表組・余白 | header64/body16/見出し20/本文18×1.6、max-content ledger列と別段落。R03/R04の公開値を残す。 | DEC-UI-05：前版の本文詳細/任意本文の読了して閉じる、未公開予測補足、Windows保存・診断・復旧に原本の一対一の窓/footerがない。固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、そのA06部品にロック/解除/変換見積の入口がなく、ST-P08の同状態窓は未取得。Godotの既確認ロック/見積/変換・保存機能を保全している。 担当 UI改善。規則・共通契約の意味を変える場合だけゲームバランス検討。再開 固定対応へ表示だけ移し、本文読了/ロック/見積/変換/保存拒否/復旧と関連使用先を限定確認。 |
| V-W02 pinと閉じるの形 | 56×56のPin SVG・active背景、cj close/backは既存18px SVG、cw closeは原本×文字。機能の180/160ms・pinを維持。 | DEC-UI-03：原本#cw-useは180msでtransient予測を開く。root内の空白離脱はpointeroverがleaveTimerを無条件取消するため閉じず、root外離脱で160ms閉鎖。Godotは窓外の空白で160ms閉鎖。基準文言と現行実挙動が食い違う。 担当 UI改善。再開 決定した一つの挙動へ共通hoverだけ合わせ、同じ合法fixtureのenter/内側leave/root外leave/pin/クリックと非実行を限定再確認。 |
| V-W03 窓の面と影・区切り | paper、1px線、角8、header境界、detailの14px影。本文へ白い別面を足さない。 | 独立適合未判定 |
| V-W04 反対端窓の座標系・縦基準 | 原本placeEdgeWindowのanchor.y、内側寸法、本人帯上端、左右反対端・clampを共用。 | DEC-UI-03：原本#cw-useは180msでtransient予測を開く。root内の空白離脱はpointeroverがleaveTimerを無条件取消するため閉じず、root外離脱で160ms閉鎖。Godotは窓外の空白で160ms閉鎖。基準文言と現行実挙動が食い違う。 担当 UI改善。再開 決定した一つの挙動へ共通hoverだけ合わせ、同じ合法fixtureのenter/内側leave/root外leave/pin/クリックと非実行を限定再確認。 |
| V-W05 共通窓・親子窓が固定座標 | trigger/avoid/placeWindowを共用し、親を維持したpair520×480／gap16。探索utilityは原本のhidden anchorと避ける帯に従う。 | 独立適合未判定 |
| V-W06 記録タブ・列・区分を省略 | 相手・環境／札の二タブ、初期構成の表、観測区分・獲得記録。最小公開投影で分類し、私有構成を推定しない。 | 独立適合未判定 |
| V-W07 記録札詳細で直前の親が消える | 対象構成を札詳細の直前の親として配置し、一覧の原位置は戻るまで維持する。553/1089の孫窓と戻りを実入力で確認。cjの値列は右端・18px/1.6・行間9へ分離し、空一覧へ追加文言を作らない。親scrollの基準／原本差は具体残件へ。 | DEC-UI-06：同じ合法踏破済み保存の自然overflowで、原本は親を597px送った後、札詳細と戻るで0pxへ戻る。本編は実親scrollを保持した。採取補助の最初のNode再参照誤りも保全し、最終記録は生きた実ControlとDTO/byte不変を確認。未取得の全scroll量という曖昧な残件へ置かず、実際の基準/原本の食い違いへ限定。 担当 UI改善。再開 決定された一つの挙動へ記録の表示だけ合わせ、同じ自然overflow/親子/戻るを再採取する。 |
| V-W08 メニューが2列から縦1列へ | 2列×56pxのmenu、既存追加操作がある場合だけ12件pager。中断・再訪など前版の機能を保持。 | 独立適合未判定 |
| V-W09 表示・操作設定の元UIを省略 | 表示の実CheckBoxと減動、探索の既存操作項目・20px checkbox・90×38選択部品。DTOへ設定を足さない。 | 独立適合未判定 |
| V-W10 山札・履歴・案内を単一本文へ | 山札表・親子詳細、履歴の実行別行、案内の見出し・18×1.6段落、本文履歴。元データを単一の長いLabelへ平坦化しない。 | DEC-UI-05：前版の本文詳細/任意本文の読了して閉じる、未公開予測補足、Windows保存・診断・復旧に原本の一対一の窓/footerがない。固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、そのA06部品にロック/解除/変換見積の入口がなく、ST-P08の同状態窓は未取得。Godotの既確認ロック/見積/変換・保存機能を保全している。 担当 UI改善。規則・共通契約の意味を変える場合だけゲームバランス検討。再開 固定対応へ表示だけ移し、本文読了/ロック/見積/変換/保存拒否/復旧と関連使用先を限定確認。 |
| V-H01 探索先の詳細が題名から離れる | 探索先32px見出しの実幅の直後に詳細、left40/bottom36/width840の本文とgap12。 | 独立適合未判定 |
| V-H02 本文・帰還背景のgradientを近似 | 既存背景とflowの縦・横多stop gradientを一度だけ適用。本文窓内面も別stop。 | 独立適合未判定 |
| V-H03 帰還要約の文字階層 | returnViewのbaseline整列、着想20／数値Georgia32／計12、余力20と素材18、見出し24。三帰還を合法状態で撮影。 | 独立適合未判定 |
| V-H04 本文窓の内面・余白・行間 | 本文20/34と末行line box、句点・禁則、原本文字・読了IDを維持。既存読了操作と本文領域の重なりを避ける。 | DEC-UI-05：前版の本文詳細/任意本文の読了して閉じる、未公開予測補足、Windows保存・診断・復旧に原本の一対一の窓/footerがない。固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、そのA06部品にロック/解除/変換見積の入口がなく、ST-P08の同状態窓は未取得。Godotの既確認ロック/見積/変換・保存機能を保全している。 担当 UI改善。規則・共通契約の意味を変える場合だけゲームバランス検討。再開 固定対応へ表示だけ移し、本文読了/ロック/見積/変換/保存拒否/復旧と関連使用先を限定確認。 |
| V-H05 開始画面の配置と書体 | plain paper、中央crossweave28serif／tracking2、header24、下端中央の既存新規・再開・診断・復旧群。 | DEC-UI-05：前版の本文詳細/任意本文の読了して閉じる、未公開予測補足、Windows保存・診断・復旧に原本の一対一の窓/footerがない。固定原本のCW-M1-public-0.6ではowned入口をcollectionへ送るが、そのA06部品にロック/解除/変換見積の入口がなく、ST-P08の同状態窓は未取得。Godotの既確認ロック/見積/変換・保存機能を保全している。 担当 UI改善。規則・共通契約の意味を変える場合だけゲームバランス検討。再開 固定対応へ表示だけ移し、本文読了/ロック/見積/変換/保存拒否/復旧と関連使用先を限定確認。 |
| V-S01 通知・保存中表示の位置 | 通常notice中央top72と取得runtime notice左右24/top76、公開保存状態。成功・拒否・不明とworker待機を保全。 | 独立適合未判定 |
| V-D01 受入先枠・ラベルを全列へ広げる | 受入先の内側破線・可否ラベルと短い述語。R06/R07の共有条件、領域外停止。 | 独立適合未判定 |
| V-D02 ドラッグ元と像の透明度・影 | 取得元alpha.3／探索手札.6、不可像.75、同じ札面とshadow、掴み点を維持。 | 独立適合未判定 |
| V-D03 ホールドcueの形と位置 | 32px ring、pointer＋20,−20の吹出し、既存移動label12/18、実120ms cue。短クリックの連続原画像を追加。 | 独立適合未判定 |
| V-D04 端送り速度と閾値 | 原本と同じ取得22px/7px、探索64px/16pxのframe送り。pointer内の実手札／場だけを送り、領域外は停止。dropの受入条件は別判定として維持。1論理秒の実時刻・frame数・端の上限を採取。 | 独立適合未判定 |
| V-D05 移動・イベントの表示タイミング | 200ms CSS ease-out、event260ms送り／1300ms維持／2800ms終了、通常・減動を連続FramePostDrawで採取。 | 独立適合未判定 |
