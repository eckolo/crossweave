from pathlib import Path
import json,os
R=Path(__file__).resolve().parents[3];E=R/'docs/検証/本編実装/d04b-ui-02/reproduction-20261005';ROOT=E.parent;I='e6619eaf5db58656147154a5aacdb5c7f9eb3995'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for p in [E/'sources.json',R/'docs/作業資料/計画同期/20260927-game-application.json']:
 d=read(p)
 def fix(obj):
  if isinstance(obj,dict):
   for k,v in obj.items():
    if isinstance(v,str) and any(t in v for t in ['計画','同期']):obj[k]=v.replace('62','64')
    else:fix(v)
  elif isinstance(obj,list):
   for v in obj:fix(v)
 fix(d);save(p,d)
for p in [E/'README.md',R/'docs/作業資料/Work/20260927-game-application.md']:
 text=p.read_text(encoding='utf-8-sig').replace('62ファイル','64ファイル').replace('62path','64path').replace('62件','64件');p.write_text(text,encoding='utf-8')
for name in ['README.md','UI対応表.md','確認結果.md','確認入口.md','とりまとめ引継ぎ.md','コード解説.md']:
 p=ROOT/name
 if not p.exists():continue
 text=p.read_text(encoding='utf-8-sig')
 if '<!-- reproduction-20261005 -->' not in text:
  text='<!-- reproduction-20261005 -->\n**最新：D04B-UI-02 合意UI再現修正0.5。依頼全体は未完了。** 同じWork・枝の[今回版](reproduction-20261005/README.md)、[固定実装／証拠](reproduction-20261005/publication.json)、[具体残件と再開条件](reproduction-20261005/必要証拠と残件.md)を先に読む。実装SHA `'+I+'`。以下は過去提出の記録として保全。\n\n'+text
  p.write_text(text,encoding='utf-8')
p=R/'docs/作業資料/Work/20260927-game-application.md';text=p.read_text(encoding='utf-8-sig')
marker='## D04B-UI-02 合意UI再現修正 追補保存（2026-10-05）'
if marker not in text:
 pos=text.index('## 合意UI再現修正 開始')
 section=marker+'\n\n実装SHA `'+I+'`。I1→I2の共通部品・札面・窓・記録分類・本文、I3の撮影時計、I4の取得見出し・数量gapと帰還文言を同じMainへ保存した。57ID・N01〜03・17必要群・37状態を今回版の台帳へ固定。明暗25mode、変更範囲の取得9modeずつ、動き3modeずつ、関連27mode、暗色新規入口／再開2mode、Core17件を確認。古い48modeは不変Core・保存に限定して再利用。\n\n原本画像と合法command保存を通常Push。最終CIも同SHAの依存準備・Core・15mode保存／再開・明暗14modeが成功し、内部3manifestとZIP digestを読戻す。UI独立適合・配布・実機受入は未完了。filler／null合法入力、長い名称等の不足条件、原本の記号登録・公開項目名・追加導線・AA基準の判断は、理由・所有者・再開条件を[今回引継ぎ](../../検証/本編実装/d04b-ui-02/reproduction-20261005/とりまとめ引継ぎ.md)へ返す。他Work起動・送信なし。\n\n'
 text=text[:pos]+section+text[pos:];p.write_text(text,encoding='utf-8')
p=E/'コード解説.md';text=p.read_text(encoding='utf-8-sig')
extra='''\n## 実部品と採取時計の追補\n\n原本のCSSは横6pxも指定するが、現Edgeで有効な`scrollbar-width: thin`は実寸10pxだった。原本を採るheadless起動の既定`--hide-scrollbars`は解除し、実track・thumbと両端・入力の画像を得た。Godotも縦横10px、thumb余白2pxと角3、原本のlight/darkの色へ揃えた。取得のgutterを外寸内へ予約し、探索の横バーは場と手札の同じScrollContainerを使う。自然FHDでoverflow0と、同じ実一覧の外寸を限定したoverflowの二系列を分ける。\n\n原本の表示・操作行は20px checkboxとfractionalな行送りである。GodotのVBoxが各行を整数へ丸める累積を避け、同じ実CheckBoxの横にLabelを置いて行位置を共通値から計算した。値変更のsignalは旧処理のまま。OptionButtonは150/220/320の既存値を維持し、別の模擬窓を描かず実PopupMenuのfont・paper・selected・矢印を整える。選択値と取得先・quickの規則は変えない。\n\n押下中にhoverしているButtonはGodot4.7の`hover_pressed`も使う。normal／hover／pressedの三つだけを上書きすると、押下中に標準の白い面が残る。透明なkeyboard focus輪郭と、面のhover色を分ける理由はここにある。\n\n取得見出しは通常24px、数量strongだけ20px。数量の位置は見出しの実幅＋gap12で決める。「所持」「編成」へ取得見出しと同じ固定幅を使うと48pxの差が生じる。これは表示の配置で、数値や枠の計算を変えない。\n\n静止比較は取得Tweenが着地してからFramePostDrawで撮る。動き検査はノード探索とhover待機を時計開始前へ出し、入力後の最初の実描画から500msと着地後まで保存する。入力時刻、Tween開始・終了、採取時刻を別に記録した。最初の8枚は途中までだったため旧列を保全して採り直し、静止画を移動途中の証拠に読み替えない。描画読出しやPNG圧縮の負荷を物理入力・GPU性能の合格にしない。\n\nWindowsクラウドのWASAPI出力端点が無いと、実描画が成功していてもengine ERRORが残る。隔離UI確認の起動だけ`--audio-driver Dummy`を指定し、他のERRORは引続き失敗にする。実ゲームのaudio設定は変えず、音の受入は後続のまま。CIのjob successに加え、内部manifest・source hash・ZIP digestを確認する。Windows checkoutのCRLFだけによるhash差も、raw hashとGit blobからのCRLF hashを別々に保持して照合した。\n'''
if '## 実部品と採取時計の追補' not in text:p.write_text(text+extra,encoding='utf-8')
p=E/'確認入口.md';text=p.read_text(encoding='utf-8-sig')
if '## 最終追加採取' not in text:p.write_text(text+'\n## 最終追加採取\n\n取得だけの最終追補は`preparation-light-final`／`preparation-dark-final`の9mode、探索の連続時計は`settled-light`／`settled-dark`を読む。バー／端送りは`repro-bars-prep,hand,field`と`repro-edges-prep,hand,field`。`related-final`の27modeは変更に関連する入力・取消・保存・再開の範囲。`startup-dark-final`は新規の暗色入口と別プロセス再開2mode。すべて元のMain.tscnと実FileGameSessionの専用slotである。\n\n[ID別の等倍切出し](id-comparisons.json)は元画像の画素を移動・補間しない。実DOMと実Controlの文字・rectを一緒に記録した。差分数値は適合判定ではない。[公開する証拠と保全した途中試行](publication-policy.json)を分け、旧失敗や未取得を成功へ埋めない。\n',encoding='utf-8')
V=E/'verification';V.mkdir(exist_ok=True)
(V/'README.md').write_text('''# 採取・台帳補助の保存版\n\nここは実行した担当用補助コードの保存版。元の実行位置は`apps/crossweave-godot/.tools/`、原本読み取り用checkoutは同じ配下の`ui-original`（72d0eb58）、固定レビューは`fixed-ui-review`（8b535c2f）。各補助は元位置からの相対rootを使用し、当時の既定Node/Python/Edgeパスを含む。再採取する担当は元位置へコピーし、既定開発環境と固定原本を用意して新しい出力先で実行する。\n\n通常の本編検査入口は今回版の確認入口にある`UiProbe/verify.py`。合法fixtureは通常Gitへ保存済みで、原本を任意改変する必要はない。localhostや拒否経路は使っていない。担当・CIの準備手順であり、遊ぶ利用者への導入・ビルド要求ではない。\n\n原本採取は合法Campaign・MemoryStore・公開commandを使う。fixture接続は二つの識別タグだけを既存C#形式へ合わせ、登録数値を変えない。`build_reproduction_report.py`→`coverage_receipt.py`→`id_crops.py`→`preservation_receipt.py`の順に台帳・部品状態・等倍画素・保全を照合する。CIは`cloud_receipt.py`でZIP digestと実内部3manifestを確認する。\n''',encoding='utf-8')
print('documents updated')
