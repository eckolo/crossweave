"""Push・本文読戻しの実施済み結果を最終資料へ反映する。

描画・機能・巨大保全台帳1本文の未確認は残す。取得経路は変更しない。
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
r=read(OUT/'document-publication-readback.json')
p=read(OUT/'publication.json');p.update({'status':'本編候補・資料を同枝へ通常FF保存済み。コード9全文／資料84全文・全85path/blob・親/tree/HEAD一致。開始保全台帳1本文のcontent空を未了として保持。',
    'payload_commit':r['payload_commit'],'payload_tree':r['payload_tree'],'remote_head':r['head'],
    'readback':'document-publication-readback.json','full_texts_received':84,'full_texts_unread':r['unread'],
    'formal_ui_approval':False,'functional_tests_executed':0,'new_rendering':False,
    'receipt_metadata_commit':'この最終票を含む後続コミットは最終応答とGitHub履歴で固定。自己参照SHAは書かない。'})
save(OUT/'publication.json',p)
res=read(OUT/'results.json');res['status']='修正候補・資料はGitHub保存提出。必要描画／機能検査と保全台帳1本文の読戻しが未了で、今回依頼全体は未完了。';res['payload_commit']=r['payload_commit'];res['readback']='document-publication-readback.json';save(OUT/'results.json',res)
n=read(OUT/'必要群と残件.json');n['new_blockers']=[x for x in n['new_blockers'] if x['id']!='GitHub通常保存／読戻し'];n['new_blockers'].append({'id':'開始時保全台帳の全文読戻し1件','reason':'start-state.json約3.8MB。通常GitHub fetch_fileのcontent空。tree/blob一致を全文受領に代用しない。','next_owner':'本Work','required':'同じ通常取得が成立する条件。別取得方法は具体理由／範囲／影響を示し明示承認後のみ。','alternate_prepared_or_tried':False});save(OUT/'必要群と残件.json',n)
for name in ['README.md','とりまとめ引継ぎ.md','確認結果.md','保存前レビュー.md']:
    path=OUT/name;s=path.read_text(encoding='utf-8')
    s=s.replace('資料保存は進行中','資料保存はe80d418eへ完了（84本文一致、保全台帳1本文のcontent空は未了）')
    s=s.replace('資料の保存は進行中','資料の保存はe80d418eへ完了（84本文一致、保全台帳1本文のcontent空は未了）')
    s=s.replace('資料の保存は進行中です','資料の保存はe80d418eへ完了（84本文一致、保全台帳1本文のcontent空は未了）です')
    s=s.replace('GitHub提出も未完了で、受領済みとはしない。','本編候補a01c5c27・資料e80d418eを保存。とりまとめ受領未確認。')
    s += '\n## 保存結果の最終追記\n\n本編候補 `a01c5c2762de1cfce602f4547818b29dc3d13e10`、資料 `e80d418e6b07629fe5a7cb98a9255d91af3717e7` をGitHubプラグインで同枝へ通常FF保存。コード9全文・資料84全文・85path/blobと親/tree/HEADを照合。開始時保全台帳1本文は通常取得content空で未了、別経路未試行。旧キャンセルは履歴で、現在Push承認待ちではない。今回依頼全体・UI適合・配布・実機・人の試遊・M1は未完了。サンドボックス内描画停止の理由は[説明](サンドボックス内の描画停止理由.md)へ。\n'
    path.write_text(s,encoding='utf-8',newline='\n')
w=ROOT/'docs/作業資料/Work/20260927-game-application.md';s=w.read_text(encoding='utf-8');s=s.replace('本編候補a01c5c27をGitHub保存・コード全文読戻し済み、資料保存中。','本編候補a01c5c27・資料e80d418eをGitHub保存。必要検査と開始時保全台帳1本文の読戻しが未了。');s=s.replace('資料保存は進行中','資料保存はe80d418eへ完了、保全台帳1本文のcontent空は未了');s=s.replace('資料保存は進行中','資料保存はe80d418eへ完了');s=s.replace('資料の保存は進行中','資料の保存はe80d418eへ完了');s += '\n### 2026-10-07 保存結果の最終追記\n\n本編候補a01c5c27・資料e80d418eを同枝へ通常FF保存。コード9全文・資料84全文・85path/blob・親/tree/HEAD一致。約3.8MBの開始保全台帳1本文は通常取得content空、別経路未試行。必要な描画／機能検査とこの1本文読戻しが未了。UI適合・配布・実機・人の試遊・M1は未完了。詳細は今回publication.jsonと途中引継ぎ。\n';w.write_text(s,encoding='utf-8',newline='\n')
print('本編a01c5c27／資料e80d418eの保存結果を反映。未了を保持。')
