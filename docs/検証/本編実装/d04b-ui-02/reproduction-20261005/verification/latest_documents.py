"""最新追補だけ更新し、旧提出の本文と同期入力を保全する。"""
from pathlib import Path
import report_io
import json,re,subprocess
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';ROOT=E.parent
I='572bb9a59b914345830df5c18f910a1deb6af2bc'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
for name in ['README.md','UI対応表.md','確認結果.md','確認入口.md','とりまとめ引継ぎ.md','コード解説.md']:
 p=ROOT/name;text=p.read_text(encoding='utf-8-sig');first,rest=text.split('\n\n',1)
 first=re.sub(r'実装SHA `[^`]+`',f'実装SHA `{I}`',first)
 p.write_text(first+'\n\n'+rest,encoding='utf-8')
p=R/'docs/作業資料/Work/20260927-game-application.md';text=p.read_text(encoding='utf-8-sig')
text=re.sub(r'最新状態：.*?\n\n','最新状態：**D04B-UI-02 合意UI再現修正（0.5）は未完了・修正と証拠提出、固定判断待ち**。57外観差・N01〜03・17必要群の対応／不足を同じWork・枝で保存。UI判断と合法入力の残件は今回引継ぎに担当・理由・再開条件を明記。UI適合・配布・実機受入を自己完了にしない。\n\n',text,count=1,flags=re.S)
begin='## D04B-UI-02 合意UI再現修正 追補保存（2026-10-05）';end='## 合意UI再現修正 開始（2026-10-05）'
section=f'''{begin}

固定実装SHA `{I}`。共通部品・取得／探索の札面・詳細／確認・最小の記録公開投影・本文を同じMainで修正。最後に共通cj窓の配色、親menuと戻り、非表示headerの配置、記録表の行高・列幅・タブ・矢印・帰還後文言、現在予約の間隔を修正した。原寸対・57ID/N/R/Uの修正path/blob・17群・37状態・日本語教材は[今回版](../../検証/本編実装/d04b-ui-02/reproduction-20261005/README.md)へ固定。

明暗25modeと取得9modeずつの既確認を保全し、共通16mode明暗・影響8mode明色・関連入力／保存の限定追補を採取。検査ごとのsource hash差と再利用範囲を結果へ記録し、古い画像を最終全ソース一致としない。最終CIは固定IのCore17件、保存／再開15mode、明暗16modeと内部manifest／artifact digestを[読戻し](../../検証/本編実装/d04b-ui-02/reproduction-20261005/ci-readback.json)で確認する。

通常Push・GitHub読戻しの固定成果と全変更path/blobは[publication.json](../../検証/本編実装/d04b-ui-02/reproduction-20261005/publication.json)。依頼内の未解消は[具体残件と再開条件](../../検証/本編実装/d04b-ui-02/reproduction-20261005/必要証拠と残件.md)と[原本判断への返却](../../検証/本編実装/d04b-ui-02/reproduction-20261005/原本判断への返却.json)。filler/nullと長名の合法入力、固定原本／基準の記号・属性・hover・親scroll・追加導線・AA条件を既存担当の判断待ちとして残す。他Work起動・送信なし。

'''
text=text[:text.index(begin)]+section+text[text.index(end):];p.write_text(text,encoding='utf-8')
p=E/'確認入口.md';text=p.read_text(encoding='utf-8-sig')
marker='## 共通窓・記録表の最終確認'
if marker not in text:
 text+=f'''
{marker}

実装 `{I}`。`common-light-complete`／`common-dark-complete`は共通16mode。明色の最後の字体・予約間隔差は`common-light-followup`の8modeを優先する。`repro-record-memory`は通常commandで得た踏破済み保存の自然overflow、`repro-checkbox-states`は表示窓の通常・hover・押下・keyboard focus・選択。親menuは実Panelと実Buttonを残し、子closeで親へ戻る確認を含む。

同じslotで`interaction,resume`を別プロセスへ渡し、`related-common-final`で表示・予測・取消・保存の影響を限定確認する。以前の`related-final`27modeは不変Core・保存契約と変更外の部品に限定して再利用する。描画待ちの失敗trialは`common-light-final`と`records-correction-light`に残す。静止窓で自然FramePostDrawが来ない検査は、標準ForceDrawによる実描画へ変更した。製品の更新処理、画像の合成・補間、物理入力の合格は追加していない。
'''
 p.write_text(text,encoding='utf-8')
p=E/'コード解説.md';text=p.read_text(encoding='utf-8-sig');marker='## 共通窓の継承と自然overflow'
if marker not in text:
 text+='''
## 共通窓の継承と自然overflow

`WindowFrame`は画面phaseだけで色を選ばない。同じ探索上でも、札詳細・操作はcw、記録・menu・表示はcj、取得詳細はcpである。`journeyWindowStyle`は窓を作る間だけの表示contextで、Renderの最初と最後で解除する。取得中に開く共通窓へ、取得専用20px文字を混ぜない。`CommonWindowRect`は保存値ではなく実parent Panelのrectから原本の520×480・gap16のpairを作る。menuの実操作は残り、子closeは親へ戻る。検査補助CloseDetailが全窓を閉じたい場合も、親の実closeへもう一度入力する。

原本journeyは探索と取得中にheaderをhiddenにし、source検索はその非表示headerへ当たる。この場合のanchorはnullとなる。可視common navの座標で代用すると、原本の左中央17,300が右上寄りへ移る。PlaceWindowでは同じ非表示条件だけを表示判断として反映し、utilityのavoidや詳細の反対端配置は維持する。

記録本文の外側はborderの内側にあるScrollContainer、padding16はその内側に置く。表は単一Control内へheader43.296875px／row55.796875pxを積み、55%の名称列と残り列を割り当てる。VBoxへDividerも一行として入れるとseparationが二重に付き、実親送りが790pxになっていた。修正後は598pxで、原本597pxの自然overflowと対にした。親と子の戻りでこの598pxを保持することは確認したが、現固定原本は0へ戻るため、保持基準との食い違いはUI判断として明記する。

現在予約の行は主体ごと、予測後だけ同時刻を群にする。表示のgroup化は公開予約を使い、未来の同時刻順を作らない。顔40pxと文字の自然幅・群間16pxを同じlineへ確保し、先行›のpaddingと主体までのgapを分ける。R05の本人位置とCoreの予約処理は変更しない。

静止窓で次の自然FramePostDrawが来ず停止した試行があった。隔離検査はsignalへ先に接続し、標準RenderingServer.ForceDrawをmain threadで呼んで実Viewportの完了を受ける。採取時刻とPNG保存時間は別に保つ。原因を特定できていない停止試行は削除せず、UI・保存成功へ読み替えない。
'''
 p.write_text(text,encoding='utf-8')
print('latest documents fixed',I)
