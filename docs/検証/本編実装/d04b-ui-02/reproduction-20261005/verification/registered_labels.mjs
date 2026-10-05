// 既存登録から得られる名前の境界。合法な保存／取得済み状態の代用にはしない。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),original=path.join(here,'ui-original'),repo=path.resolve(here,'../../..');
const {default:C}=await import(pathToFileURL(path.join(original,'src/content/m1.mjs')));
const {variants,compileCard}=await import(pathToFileURL(path.join(original,'src/runtime/affixes.mjs')));
const rows=[];
for(const kind of ['card']){
 const bases=kind==='card'?Object.keys(C.cards).filter(k=>C.cards[k].affix_allowlist):Object.keys(C.rules.learning.bases);
 for(const base of bases)for(const b of variants(kind,base)){
  const d=compileCard(b);rows.push({kind,base,key:b.key,affixes:b.affixes,name:d.name,characters:[...d.name].length});
 }
}
rows.sort((a,b)=>b.characters-a.characters||a.key.localeCompare(b.key));
fs.writeFileSync(path.join(repo,'docs/検証/本編実装/d04b-ui-02/reproduction-20261005/registered-label-boundary.json'),JSON.stringify({source:'72d0eb58c7e3d04759f1ab56a939d1dff20a46b2',method:'既存variants/compileCardのみ。登録や数値の編集なし。',count:rows.length,longest:rows.slice(0,24),all:rows,not_a_legal_render_fixture:true,remaining:'登録可能な名前と、M1の合法command・取得／旧保存経由でその札を表示できることは別。長い名称の実状態は既存担当の入口・全入口境界を受領して同じWorkで採取する。'},null,2)+'\n');console.log(JSON.stringify({count:rows.length,longest:rows.slice(0,4)}));
