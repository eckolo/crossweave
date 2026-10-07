"""実施済み保存だけを記録する。未検証・旧キャンセルの履歴は保持する。"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[6]
OUT=Path(__file__).resolve().parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
receipt=read(OUT/'code-publication-readback.json')
pub=read(OUT/'publication.json')
pub.update({'user_push_authorization':'push自体は問題ない（2026-10-07の本会話）',
    'status':'本編9ファイルを同枝へ通常FF保存、コード全文・blob・親/tree/HEAD読戻し一致。資料の保存は進行中。',
    'code_commit':receipt['commit'],'code_tree':receipt['tree'],'code_readback':'code-publication-readback.json',
    'commit_created':True,'ref_update_attempted':True,'remote_head':receipt['head'],
    'previous_cancel_preserved':True,'retry':'Push承認を受領、同じGitHubプラグインで実施。外部での検査実行はしない。'})
save(OUT/'publication.json',pub)
results=read(OUT/'results.json');results['status']='本編候補をGitHub保存・読戻し済み。資料保存中。今回依頼全体と必要検査は未完了。'
results['code_commit']=receipt['commit'];results['code_readback']='code-publication-readback.json';save(OUT/'results.json',results)
replacements={
 '9コードファイル':'9コードファイル',
 'GitHub提出も未完了で、受領済みとはしない。':'本編候補a01c5c27をGitHub保存・コード全文読戻し済み。資料の保存は進行中、とりまとめ受領は未確認。',
 'GitHub成果コミットは未作成・未公開':'本編成果コミットa01c5c27は保存・コード全文読戻し済み、資料保存は進行中',
 'ローカル成果の通常FF保存と本文/blob・親/tree/HEAD読戻しは保存要求への明示承認後に同じプラグインで再開する。':'利用者のPush承認を受領し、同じプラグインで本編9ファイルを通常FF保存・全文/blob・親/tree/HEAD読戻し一致。旧キャンセルは履歴。資料保存も同じ枝へ進める。',
 '通常FF保存／本文・blob・親/tree/HEAD読戻しは同じプラグインの保存要求への明示承認後に再開する。':'Push承認を受領し本編a01c5c27の通常FF保存／全文・blob・親/tree/HEAD読戻しを完了。資料保存へ継続。',
 '同じプラグイン／同枝の通常FF保存要求への明示承認後に再開する。':'Push承認を受領し本編a01c5c27の保存・コード全文読戻しを完了。資料の保存は進行中。',
 '必要検査の環境前提とGitHub保存要求の承認待ち。':'必要検査の環境前提待ち。本編候補a01c5c27をGitHub保存・コード全文読戻し済み、資料保存中。',
 'GitHub保存要求3件は利用者キャンセル。commit/tree/ref更新は未試行、HEADは0ec63342のまま。':'旧GitHub保存要求3件のキャンセルを保持。利用者のPush承認後、本編候補a01c5c27を通常FF保存・コード全文読戻し済み。',
 'Push・成果コミット本文/blob・親/tree/HEAD読戻しは未了。':'本編9ファイルのPush・成果コミット全文/blob・親/tree/HEAD読戻しは完了。資料の保存は進行中。',
 'GitHub保存：最初の3つのコード保存要求がキャンセルで返り、commit/tree/ref更新は未試行。現在の枝HEADは0ec63342のままです。':'GitHub保存：最初の3要求キャンセルは履歴。Push承認後、本編候補a01c5c27を通常FF保存し、コード全文/blob・親/tree/HEADの一致を確認。資料保存は進行中です。'
}
for p in [OUT/'README.md',OUT/'とりまとめ引継ぎ.md',OUT/'保存前レビュー.md',ROOT/'docs/作業資料/Work/20260927-game-application.md']:
    s=p.read_text(encoding='utf-8')
    for a,b in replacements.items():s=s.replace(a,b)
    p.write_text(s,encoding='utf-8',newline='\n')
print('本編a01c5c27の保存・全文読戻し状態を更新。資料保存は進行中。')
