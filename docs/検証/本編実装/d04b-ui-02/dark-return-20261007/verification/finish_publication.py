"""Push・本文読戻しの実施済み結果を最終資料へ反映する。

Python標準のPath／JSONによる資料更新で、Godot・C#/.NETの実行処理ではない。
読戻し票→保存結果→依存票の順で読む。実施済み票だけを記録し、描画・機能・
巨大保全台帳1本文の未確認は残す。通信や検査、取得経路の変更は行わない。
票の読取り・変換が失敗すれば例外で止まり、成功の記録を補作しない。
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
r=read(OUT/'document-publication-readback.json')
p=read(OUT/'publication.json');p.update({'status':'本編候補・資料を同枝へ通常FF保存済み。コード9全文／資料84全文・全85path/blob・親/tree/HEAD一致。開始保全台帳1本文のcontent空を未了として保持。',
    'payload_commit':r['payload_commit'],'payload_tree':r['payload_tree'],'remote_head_at_payload_readback':r['head'],
    'readback':'document-publication-readback.json','full_texts_received':84,'full_texts_unread':r['unread'],
    'formal_ui_approval':False,'functional_tests_executed':0,'new_rendering':False,
    'receipt_metadata_commit':'この最終票を含む後続コミットは最終応答とGitHub履歴で固定。自己参照SHAは書かない。'})
p.pop('remote_head',None)
m=read(OUT/'metadata-publication-readback.json')
if not all(x['full_text_match'] for x in m['full_texts']):
    raise ValueError('保存結果票の本文照合が未成立。成功として記録しない。')
p.update({'metadata_commit':m['commit'],'metadata_tree':m['tree'],
    'remote_head_at_metadata_readback':m['head_at_readback'],
    'metadata_readback':'metadata-publication-readback.json',
    'local_git_head':m['local_git_head'],
    'local_git_metadata_advanced':False})
save(OUT/'publication.json',p)
res=read(OUT/'results.json')
res.update({'status':'修正候補・資料はGitHub保存提出。必要描画／機能検査と保全台帳1本文の読戻しが未了で、今回依頼全体は未完了。',
    'payload_commit':r['payload_commit'],'readback':'document-publication-readback.json',
    'metadata_readback':'metadata-publication-readback.json'})
save(OUT/'results.json',res)
n=read(OUT/'必要群と残件.json')
# 同じ票を再反映しても依存項目を重複させず、未了を消さない。
n['new_blockers']=[x for x in n['new_blockers'] if x['id'] not in
    {'GitHub通常保存／読戻し','開始時保全台帳の全文読戻し1件'}]
n['new_blockers'].append({'id':'開始時保全台帳の全文読戻し1件',
    'reason':'start-state.json約3.8MB。通常GitHub fetch_fileのcontent空。tree/blob一致を全文受領に代用しない。',
    'next_owner':'本Work',
    'required':'同じ通常取得が成立する条件。別取得方法は具体理由／範囲／影響を示し明示承認後のみ。',
    'alternate_prepared_or_tried':False})
save(OUT/'必要群と残件.json',n)
print('保存結果票に基づきJSONを更新。Markdownは既存説明を維持、追記を重複しない。未了を保持。')
