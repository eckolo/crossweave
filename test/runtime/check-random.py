"""Exact AH string seed comparison; no old battle or comparison is rerun."""
import json,random,subprocess,hashlib,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
js="""import {seedState,MT} from './src/runtime/random.mjs';
const rows=[];
for(const seed of [0,1,2,4294967297])for(const actor of ['P','V0','E1','V1'])for(const purpose of ['initial','allocation','generation','selection','target']){
 const text=`crossweave:AH1:${seed}:${actor}|${purpose}`, state=await seedState(text), mt=new MT(state), ints=Array.from({length:12},()=>mt.uint()),floats=Array.from({length:4},()=>mt.random()),deck=Array.from({length:12},(_,i)=>i);mt.shuffle(deck);
 const restored=new MT(mt.state()),continued=Array.from({length:12},()=>restored.uint()); rows.push({text,state,ints,floats,deck,continued});}
console.log(JSON.stringify(rows));"""
rows=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=root))
for row in rows:
    r=random.Random(row['text'])
    assert row['state']==list(r.getstate()[1]),row['text']+' state'
    assert row['ints']==[r.getrandbits(32) for _ in range(12)],row['text']+' uint'
    assert row['floats']==[r.random() for _ in range(4)],row['text']+' random'
    deck=list(range(12));r.shuffle(deck);assert row['deck']==deck,row['text']+' shuffle'
    assert row['continued']==[r.getrandbits(32) for _ in range(12)],row['text']+' continuation'
print(json.dumps({'schema':'CW-M1-A-001-rng-1','ok':True,'python':sys.version.split()[0], 'streams':len(rows),'seeds':[0,1,2,4294967297],
                  'checks_per_stream':['625-word initial state','12 uint32','4 double draws','12-card rejection shuffle','12 restored continuation uint32'],
                  'vectors_sha256':hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest()},indent=2))
