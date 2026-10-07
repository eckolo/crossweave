"""表示変更の影響に関係する既存8検査だけを新しい記録先で実行する。

Godot描画・人の入力の代用ではない。.NETの公開情報・preview/取消・確定・
別プロセス再開／二重精算の契約を照合し、ソース変更中なら成功にしない。
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[6]
APP=ROOT/'apps/crossweave-godot'
OUT=Path(__file__).resolve().parents[1]/'contracts'
OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(APP/'UiProbe'))
from runtime import prepare
dotnet,_,env,lock=prepare(False)
names=['PreviewExpiryDestinationsUseResolvedRecoveryAndPreserveOwner','ActionPredictionDoesNotDrawOrChangeState',
       'UiPublicLabelsAndOwnCatalogueDoNotChangeSaveOrRevealNpcCards','VersionedDtoRoundTripPreservesNextResult',
       'ReturnResendAndTextReadsCannotSettleTwice','OneOfferLimitAndIndividualAndBaseCapsAreAtomic',
       'PreviewCancelAndCompositionDoNotSpendOrCreateUnits','AuthoredDefenseBoundariesMatchOldResolver']
files=[p for f in ['Core/Application','Infrastructure/Application','Tests'] for p in sorted((APP/f).glob('*.cs'))]
hashes={p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
command=[str(dotnet),'test','Tests/Crossweave.Tests.csproj','--no-restore','-m:1','--filter',
         '|'.join('FullyQualifiedName~'+n for n in names),'--logger','trx;LogFileName=selected.trx','--results-directory',str(OUT)]
with (OUT/'run.log').open('w',encoding='utf-8') as log:
    r=subprocess.run(command,cwd=APP,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=240)
changed=[p.relative_to(ROOT).as_posix() for p in files if hashlib.sha256(p.read_bytes()).hexdigest()!=hashes[p.relative_to(ROOT).as_posix()]]
counts=ET.parse(OUT/'selected.trx').getroot().find('{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}ResultSummary/{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}Counters').attrib if (OUT/'selected.trx').exists() else {}
status='passed' if r.returncode==0 and not changed and counts.get('passed')==str(len(names)) else 'failed'
(OUT/'manifest.json').write_text(json.dumps({'status':status,'selected':names,'counts':counts,'source_sha256':hashes,
    'source_changed_during_run':changed,'command':command,'sdk':lock['sdk'],'rendered':False,'new_rules':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('既存契約の限定検査:',status,counts)
sys.exit(0 if status=='passed' else 1)
