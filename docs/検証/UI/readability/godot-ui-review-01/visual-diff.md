# ID別判定 — 固定aabfefab/提出0ec63342

状態と根拠は今回の独立判定。解消は当該差異の範囲であり、全画面合格数ではありません。具体path/blob・IDcrop・元source/取得限界は[判定.json](dark-recheck-20261006/判定.json)へ対応します。

| ID | 状態 | 今回の根拠/未確認理由 | 本編修正・次の条件 |
| --- | --- | --- | --- |
| V-C01 | 要修正 | 取得札titleの上端3px補正は確認。暗色字面boxは原本[14,52,38,19]／現在[14,52,38,18]。一方、詳細の最初の行は原本y123／現在y119、見出しはy248／y242、次見出しはy382／y365。役割別のmetric差が残る。 | 一律のbaseline=-3だけで終了せず、title/meta/heading/body/table/serifごとにline box・margin・weightを対応。寸法とwrapが一致した領域だけAA残差をDEC04へ。 |
| V-C02 | 要修正 | 通常暗色・OS非連動は固定コードと通常経路で確認。cw-drawerの最終面は#202820、cj-shellは#1d2b27。cj-button通常#2b3d34をcj-paper#192a22へ一律変換する処理、空場面のalpha、gradient、hub/scene/returnのfooter透明化が残る。 | cp/cw/cj/navの変数名だけでなく、最終selector・状態・使用先ごとに値を割当てる。通常・hover・selected・disabled・影・alpha・gradientを全使用先へ結ぶ。暗色採否の再質問は不要。 |
| V-C03 | 解消（当該差異の範囲） | 暗色cropでbook-open20、文字18、共通navの寸法・通常面を確認。原本の記録buttonはhover、現在はnormalの対であり、その画素色差だけを通常色の不一致とは判定しない。 | 現在の共通nav構造を維持。hover/focus等の全フラグ比較はC04/U-V06、本文字面はC01へ。 |
| V-C04 | 未確認 | 提出ID領域[1,980,391,1079]には対象focus buttonが含まれない。原寸currentとnodesは取得、対応reference原寸はcontent空。既存状態検査や制御コードを、未読のfocus外観一致へ拡張しない。 | 原本の該当focus画素を同じ許可済み手段で取得可能になった時、部品ID・pointer・hover/pressed/focus/disabled/selected・倍率を揃えて再開。別経路・別部品による代用は未実施。 |
| V-C05 | 解消（当該差異の範囲） | 1920×1080外枠、内側1918×1078、1px内側原点、10px角のclipを固定コード・暗色領域で確認。外枠の幾何条件だけの判定。 | 枠色のselector差はC02、個々の窓角丸はW03として修正。外枠の条件を維持し、全UIの色一致とは扱わない。 |
| V-C06 | 要修正 | offer領域は両者rect[17,121,376,220]、scroll0、content348/viewport220。10px thinは確認。hover thumbの同列実測は原本y15〜136／現在y18〜139で、長さ122は同じだが上端3px差。 | 同じoverflow/scroll/hoverでtrack・arrow・gutterの内側位置を修正。CSSの横6px宣言を現在Edge実測のthin10pxへ機械的に置換する判定とは分け、縦横・normal/hover/drag・端を対応。 |
| V-P01 | 原本判断待ち | 三領域の開始位置、16padding/20gapと先頭tile19/415/1170・y123は暗色で維持。見出しのStore/LayoutGridは未登録用途の採用待ち。Storeの資料nodeは見出しでなくfooterを指す。 | 幾何を維持し、H11-11/13を実際の見出し・確認見出しへ結び直して個別判断。文字C01、長名称U-V01は別残件。 |
| V-P02 | 解消（当該差異の範囲） | 取得欄の底線、所持/編成のgrid以降の囲い範囲を暗色cropと原寸で確認。 | 現在の囲い範囲を維持。色・破線・scrollの残差はC02/P08/C06へ。 |
| V-P03 | 解消（当該差異の範囲） | 64pxの連続した角なし選択帯と暗色active #c6d9ba／ink #193224を確認。 | 選択帯を維持。本文字面C01と操作フラグC04を独立して確認。 |
| V-P04 | 解消（当該差異の範囲） | 352×80、2px外枠、5px角、76px内側の通常札を暗色領域で確認。 | 幾何を維持。長い登録名・未払いは別状態としてU-V01/P08へ。 |
| V-P05 | 解消（当該差異の範囲） | 右72×76と外枠内側2px、操作側の区切り・insetを暗色通常札で確認。 | 操作側の寸法を維持。hover/disabledの一括合格はしない。 |
| V-P06 | 解消（当該差異の範囲） | 編成枠と副操作『外す』の面が分離され、全体を主操作色へ塗る差異は解消。 | 暗色build線#809c6bと副操作#293b2dを用途別に維持。Check採用はH11-02、字面はC01へ。 |
| V-P07 | 原本判断待ち | 公開attrのA/C/D等の表示と数量右寄せはDEC02条件に沿う。ScrollText/Check/Grid2X2の未登録用途の採用は未了。 | DTO名・保存形式を変えずpublic detail.attrを表示adapterで読む。H11-01〜03の実用途・原本画素・候補を揃えて個別回答へ。 |
| V-P08 | 要修正 | 135degの斜線方向は補完。破線の上端は原本[6..11],[16..21]…の10px周期、現在[6..8],[12..15]…の6px周期で異なる。Clock資料はwallet nodeを引用し、札右下用途に一致しない。 | 破線dash/gapと角端・金茶#dbbd78を実画素へ合わせる。H11-04のnodeを札右下[666,178,18,18]等の同用途へ訂正し、人の個別採用後に反映。 |
| V-P09 | 解消（当該差異の範囲） | 取得元の同寸placeholder、中央arrow、薄い面と下端線・角を暗色pending原寸で確認。 | placeholderを文章へ戻さず、同寸の跡を維持。字面・未払いの他差異へ合格を拡張しない。 |
| V-P10 | 原本判断待ち | 空枠352×80と5px角・破線の復元は確認。Plus/Inbox/CircleCheckが原本空欄から可視記号へ変わる用途は未採用。 | H11-07〜09で空枠／候補なし／完了を別状態にし、原本の実画素と候補のsize/stroke/alphaを提示して個別判断。 |
| V-P11 | 原本判断待ち | 現在値と未払い予測値・財布の数値は同fixtureに対応。Clock3追加はH11-05のwalletとfooterの2使用先を区別する必要がある。 | 元の数値・支払予測を変えず、walletとfooterの原寸/nodeを別々に結ぶ。点線tokenと字面の差はP12/C01へ。 |
| V-P12 | 要修正 | 64pxの帯は復元したが、金茶footer tokenの枠・角・文字の行組とUndo2/Storeの追加を無条件一致にはできない。原本footer tokenは約45.86×41・角4、現在の表示と用途別対応が必要。 | 同じfooter支払値・数量でtokenのline box/dash/角を合わせる。Undo2の実20px用途とH11-05のfooterを対応し、未採用記号は個別回答へ。 |
| V-P13 | 原本判断待ち | 960×820・header64/footer72と通常offerの全幅操作は確認。合法owned対では原本の全幅『外す』に対し、現在は外す/ロック/変換の3操作と説明が追加。機能の存在と配置了承は別。 | 既存面・区切り条件を維持。owned追加操作はH13のA/B配置と合法状態を先に整え、機能を削除せず人の個別判断後に指定配置へ。 |
| V-P14 | 要修正 | fundedの5取得行・36px残高・価格/移動先/容量の復元は確認。一方、invalid確認の原本runtimeReviewBodyはproblemsだけを返すが、現在は0/—のwalletを追加。cp-problemsは原本角0、現在は角5。 | 合法invalid比較で原本の早期returnと四角い警告面を再現。fundedの各行・折畳み・価格は維持。H11-11/13は確認見出しを別用途に結ぶ。 |
| V-P15 | 要修正 | 所在/価格/112px facts/修飾折畳みは補完。pending64×48は原本[1351,219,64,48]／現在[1339,219,64,48]で12px左へずれる。現在の破線描画は角が四角く、原本角6と異なる。H11-06は詳細tokenでなく背景の札clockを引用。 | cp-location幅910の右端へtokenを戻し、角6を破線にも適用。同用途node[1362,234,18,18]等と候補を結ぶ。ownedの追加条件はDEC05/ST-P08へ。 |
| V-E01 | 解消（当該差異の範囲） | field上413、hand上688、本人帯983とgap20の配置を暗色領域で確認。 | 縦配置を維持。font/空場/透過・scroll状態は別IDへ。 |
| V-E02 | 要修正 | 同じ背景素材のcover位置は補完。暗色washの対応は宣言#e8edd933を単一変換#182a2755にするだけでは成立しない。空場の明るさと前景色の差が残る。 | 最終CSSのdark alpha・layer順・cover位置を用い、探索背景と空場の合成を同状態画素で確認。既存背景を描き直さない。 |
| V-E03 | 解消（当該差異の範囲） | 場の帯のborder0・radius8・低alphaの構造を暗色で確認。 | 帯の構造を維持。合成色の全一致はC02/E02/E07の確認後。 |
| V-E04 | 要修正 | 150deg式は補完したが、絵面の4点RGBは原本[52,69,48],[50,68,57],[52,69,53],[49,68,62]／現在[53,69,48],[49,67,62],[51,68,55],[47,66,69]。方向宣言だけで一致にできない。 | 同じ248px札面でstops・色・alpha・投影長・補間を最終CSSへ合わせる。手札/場/ghostの全使用先へ結び、単一画素総差を許容率にしない。 |
| V-E05 | 原本判断待ち | 登録30定義は現在42定義中の対応30とベクトル一致。Swords/HeartPulseは復元され、新承認不要。ただし実itemIcon使用先の描画は別確認。Mountain要求の原本は未登録△fallback、現在Triangle64であり同一定義ではない。 | 登録定義を維持し、attack/healの実使用先を示す。H11-15/16は原本△/現在Triangle/候補Mountainを用途別の実画素と箱・線幅で比較して個別判断。 |
| V-E06 | 解消（当該差異の範囲） | 属性badgeの1px枠・4px角・左右余白と16/24の形を暗色で確認。 | 公開属性と枠を維持。文字C01とR04の未取得合法状態へ拡張しない。 |
| V-E07 | 要修正 | 空場の短いcaptionへの修正は確認。中央faceは原本RGB[22,41,43]／現在[76,94,92]で大きな透過差があり、下端角も原本と異なる。caption背景は両者[32,40,32]。 | 空場の独立background #20282050を用途別に適用し、face/captionの合成と角を合わせる。通常札gradientの流用で空場を塗らない。 |
| V-E08 | 解消（当該差異の範囲） | 右上の短い『使用後に場から離れる』と通常paper面・3px角への修正を暗色で確認。consumeとdata-changedを区別した固定コードを維持。 | この予測ラベルを維持。追加公開補足のrouteはH13、文字C01とR01合法状態は別残件。 |
| V-E09 | 未確認 | 固定DrawTileはchanged→dangerをconsumeより独立して適用。提出のselected手札/linked場のフラグ差とR01-filler未取得があり、danger枠の同状態全使用先は未成立。 | 合法filler/期限切れとsafety/doomedを混ぜず、public changed・pointer・selected/linked/consumeを揃えた原寸/nodesで確認。R01の契約入力は既存担当へ。 |
| V-E10 | 要修正 | 4px＋2pxgap＋4pxの上下全幅バーへの復元は確認。数値と下段の配置・字面は原本との差が残り、バーの復元だけで主体帯全体を解消にしない。 | バー寸法を維持し、18/24の数値・delta16/22・space-betweenと上下位置を役割別実測で合わせる。C01との変更影響を本人帯にも返す。 |
| V-E11 | 解消（当該差異の範囲） | 主体の通常透明枠、選択時2px内側とsoft captionの構造を暗色で確認。 | 選択枠の条件を維持。未登録地形・全hoverフラグはE05/E15/C04として残す。 |
| V-E12 | 要修正 | self400pxと手札数表示は維持。本人帯の下段の文字位置に原本y48／現在y52の差が見え、C01の用途別行組と合わせて修正が必要。 | 24/10/24の行組と最下帯72を保ち、下段を原本の位置・baselineへ合わせる。補助公開情報を新配置として黙って承認しない。 |
| V-E13 | 解消（当該差異の範囲） | 選択札に追従する56px操作枠、80px級の内容幅、gap8とtipを暗色で確認。tipの色は実原本のcw-paperであり、旧lightから『白固定』を要求しない。 | 追従・寸法を維持。preview hoverの追加採用はDEC03、focusはC04として分ける。 |
| V-E14 | 解消（当該差異の範囲） | 縦端点を結ぶcubicBezier、stroke2、opacity.5、矢印追加なしの線を暗色で確認。 | 線の幾何を維持。入力/選択フラグが違う対で全状態一致を主張しない。 |
| V-E15 | 原本判断待ち | 40px順番button・16gap・同群2gapは維持。H11比較の現在側は△の12px文字を22×22箱に描き、候補側はMountain SVG12×12・stroke2。主体のTriangle SVG64とは描画手段も用途も異なる。 | H11-16に文字12/箱22と候補SVG12の字面/線幅/余白、製品の40pxbutton内の実箱への対応を返す。原本△実画素を結び、主体64と独立判断。 |
| V-W01 | 要修正 | 詳細panelの両rect[1383,487,520,480]は同じ。原本bodyはcontent446/viewport414でscrollbarあり、現在はcontent377/page377でなし。見出しy差4/6/17pxと高さ差が積み上がる。以前の数値幅1pxは修正されたが行組の差は残る。 | 18/1.6、h3 20、margin、Fact/ledger/Paragraphの行boxとwrapを用途別に合わせる。スクロールの有無が同じ内容で一致するまでAA免除しない。 |
| V-W02 | 解消（当該差異の範囲） | pin16pxと56×56、固定時activeへの補完を暗色で確認。Pinは登録済み定義。 | pinとcloseの既存寸法/固定状態を維持。全hover/focus/disabledはU-V06、字面はC01へ。 |
| V-W03 | 要修正 | ID提出領域は対象窓を含まないが、同じ指定sourceのW01原寸/nodesでは最終cw-drawer面#202820とborder#697767を確認。原本radius9に対し固定WindowFrameは8。宣言#202820e6を最終面と取り違えない。 | cw窓の角9とshadow0 4px 14px #0005を最終selectorへ合わせ、W03領域を実対象窓へ対応。背景/blurの未確認は維持し、cj共通窓へ一括適用しない。 |
| V-W04 | 解消（当該差異の範囲） | IDcropは対象窓を含まないため単独一致証拠にはしない。同じ指定sourceの原本/current nodesでdetail-panel[1383,487,520,480]を照合し、反対端と本人帯上の座標条件を確認。 | 座標条件を維持。root内外寿命はDEC03、fontによるscroll・面はW01/W03へ。 |
| V-W05 | 解消（当該差異の範囲） | 記録の原本/現在で親520×480・右子520×480・gap16、親位置を保つ配置を確認。 | 位置と親子構造を維持。headerのback/closeと追加routeはDEC05、リスト面/字面はW06/C01へ。 |
| V-W06 | 要修正 | タブ・観測区分・親子・公開境界とgap8は補完。normal行の原本bg #2b3d34に対し現在の画素とcj-paper変換が異なる。測点RGB[43,61,52]／[29,46,38]。文字位置/表行にも差が残る。 | .cj-button通常/hover/selectedの最終値を別に適用し、表のheading/行gapとfontを対応。現在未公開の札を既知記録へ混入しない。DEC06のkeepを修正後も維持。 |
| V-W07 | 解消（当該差異の範囲） | 親を左、札詳細を右へ残す構造とscrollPositionsの保持を確認。公開projectionは旧c761と同blob。DEC06の意図keep/clampを正とし、原本実測の0リセットを採用条件にしない。 | 親選択とpane別scrollを保持、新font/content変更後のmaxへclamp。表示操作はcommand0・revision/save/RNG不変の条件を維持。 |
| V-W08 | 解消（当該差異の範囲） | 2列×56pxのメニュー構造を暗色cropで確認。Windowsの中断/終了等の追加文言・routeはH13の未回答。 | 2列を維持。cj-buttonの面はC02、追加routeの個別指定はDEC05。構造一致を新文言採用へ拡張しない。 |
| V-W09 | 解消（当該差異の範囲） | 『動きを抑える』18px checkboxと元操作の選択構造を暗色で確認。N03機能は既存200ms/抑制0と提出motion条件の範囲。 | checkboxと公開設定経路を維持。dropdown popup・focus/selectedの全フラグを未確認から除外しない。 |
| V-W10 | 要修正 | 山札等のtableと登録記号定義は復元。提出領域でheader/最初のbutton行のtopは原本140/167付近に対し現在150/179付近へずれる。登録Swords/HeartPulseの存在だけで実使用先の描画を確認済みにしない。 | 表と見出しのmargin/line boxを修正し、attack/healの実itemIcon用途を同状態で提示。親子/公開値/scroll境界を変えない。 |
| V-H01 | 解消（当該差異の範囲） | 左summary内の題名と詳細buttonの隣接gap8を暗色領域で確認。 | 隣接配置を維持。hoverと文字の差はC04/C01、背景はH02へ。 |
| V-H02 | 要修正 | multi-stopのコード補完を確認。ただしbackdrop.cssはhub/scene/returnのcj-fixed-footerをtransparent・shadow noneに上書きする。現在は#283d2eの64px帯を描き、本文下端の原寸と異なる。 | screen/stateを含む最終cascadeへ合わせてfooterを透明にし、本文自身の90degと背景0/90deg・stops/alphaを各scene/三帰還結果へ対応。背景を作り直さない。 |
| V-H03 | 解消（当該差異の範囲） | 帰還金額32px Georgia/serif、label/総額の分離、items18pxとgap8の階層を暗色で確認。 | 階層を維持。三帰還の全body、背景H02、font AA C01の残件を別に保持。 |
| V-H04 | 原本判断待ち | 本文の20/1.7、24paddingと最大幅の構造は補完。暗色字面は最初の行でx/y各1px・高さ1pxの残差があり、autoRead後revision/読了状態とM1の明示操作は一致の対象を分ける。 | 元の初期documentと同表示範囲でmetricsを揃える。Windows本文完了routeはH13の比較/個別回答後、公開receipt・保存意味を維持した表示配置だけへ。 |
| V-H05 | 解消（当該差異の範囲） | 通常overrideなしのstart原寸で中央28px serifと下64px操作帯、暗色表示を確認。NormalThemeIsDark(false/true)ともtrueのコード条件と通常home/explore/returnのprobeを照合。 | 開始構造とOS非連動を維持。追加Windows入口/保存routeはDEC05/U-V04、全字形はC01として分ける。 |
| V-S01 | 未確認 | current単行/多行/保存中PNGとnodes・実保存probeは取得。reference単行/多行/保存失敗PNGの3件はcontent空。同文言nodesだけを実原寸画素の代用にしない。複数行white-space/高さ・全保存文言の外観一致は未確認。 | 同じ固定原本PNGを許可済み個別取得で読めた時に再開。別経路・生成・別文言は未実施。busy command1/revision0→1の機能と、0commandの閲覧通知を分ける。 |
| V-D01 | 未確認 | allowed/blockedの幅・線指定は補完。領域に上端2px程度の候補差が見えるが、pointer/selected/linked/dragフラグを揃えた確定実測が不足。色/ghostの変更影響も残る。 | 指定された同source/nodeでpointerと受入列・allowed/blockedを照合し、枠のinset・短い述語の差を確定して修正。合法キャンセル/確定の公開・保存条件を別に維持。 |
| V-D02 | 未確認 | 元opacity.3・ghost1/不可.75の制御は固定コードで確認。提出対にはselected手札/場などフラグの差があり、暗色ghostの面/影/全不可状態の同条件画素一致は未確認。 | 同じgesture/pointer/合法先・cancel/blockedでnodeと画素を揃える。ghostにC02/E04修正を波及し、command0取消と1commitの意味を維持。 |
| V-D03 | 未確認 | 通常145/157/169/182ms、抑制129/146/162/178/195msの9進行cropと2取消cropを読み、進捗環と取消消失を確認。公開modeはPending→Idle、cue120/hold220。原本の同elapsed進行画素・影/maskとの対は未成立。 | 原本32px環・label top34・12/18・pointer(+20,-20)を同elapsedで対応。取得した新probeの公開view/save/RNG非破壊条件を維持。論理時計の成立を物理時間適合にしない。 |
| V-D04 | 解消（当該差異の範囲） | c761とaabのAutoScroll本文はSHA256 3155aafe486fc6ba35542a2b1d5e74c4fc30aea6b155e93e60e37f53617ea9ffで同一。取得22/7・探索64/16とclampの既存論理条件を再利用。 | 論理閾値/stepを維持。新しい全interactionログや物理frame時間を確認したとはしない。色/ghost/scrollbar残件は別判定。 |
| V-D05 | 解消（当該差異の範囲） | AnimateAcquisition/RememberAcquisitionの既存本文と200ms ease-outを維持。通常/抑制motion提出で進行/取消を別に確認。既存live-event/減衰条件を機能の範囲で再利用。 | 動きを抑える経路と元タイミングを維持。cueの原寸/物理時間はD03/U-V08、色とfontの全適合は別。 |
