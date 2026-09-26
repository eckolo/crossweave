// Fixture preparation only. No browser, IndexedDB, MemoryStore or game replay.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validateDocument} from '../../src/runtime/validate.mjs';
import {canonical,copy} from '../../src/runtime/common.mjs';
import {planFor,draftFor,preview} from '../../src/runtime/preparation-legacy.mjs';
import {syncReferences} from '../../src/runtime/items.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const destination=path.join(root,'docs/検証/接続条件/co-d04a/generated');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const conditions=json('docs/検証/接続条件/co-d03r/conditions.json');
for(const [p,h]of Object.entries(conditions.source_sha256))assert.equal(sha(read(p)),h,p);
const expected={...conditions.fixture_sha256};
for(const row of json('docs/検証/接続条件/co-d03r/save-manifest.json'))expected['docs/検証/接続条件/co-d03r/'+row.path]=row.encoded_sha256;
const paths={
  natural:'test/runtime/d03-natural-home.json.br.b64',
  departed:'docs/検証/接続条件/co-d03r/departed.save.json.br.b64',
  returned:'docs/検証/接続条件/co-d03/migrated_return.save.json.br.b64',
  purchased:'docs/検証/接続条件/co-d03/purchased_home.save.json.br.b64',
  oldest:'docs/検証/接続条件/co-d02/saves/home.save.json.gz',
  reviewed:'docs/検証/接続条件/co-d03r/migrated_review.save.json.br.b64'
};
const inputs={},rows=[];
for(const [name,p]of Object.entries(paths)){
  const b=read(p);assert.equal(sha(b),expected[p],p);
  const raw=p.endsWith('.gz')?zlib.gunzipSync(b):zlib.brotliDecompressSync(Buffer.from(b.toString().trim(),'base64'));
  const d=JSON.parse(raw);validateDocument(d);inputs[name]=d;
  rows.push({name,source:p,source_sha256:sha(b),raw_sha256:sha(raw),document_sha256:sha(canonical(d)),schema:d.schema,engine:d.engine_version,phase:d.session.phase,revision:d.revision});
}
// Reuse the exact D03R learnedSource + old dirty refund draft recipe.
// This is a derived boundary fixture, not an additional natural playthrough.
const old=copy(inputs.natural),learn=planFor(old.session);
learn.next_preparation.learn=['PS01'];learn.next_preparation.equipment=['base:PS01'];
const learned=preview(old.session,learn);assert(learned.ok);old.session=learned.next;
const cancel=planFor(old.session);cancel.retain_learning=[];cancel.cancel_learning=['PS01'];cancel.next_preparation.equipment=[];
old.draft=draftFor(old.session,cancel,old.revision);syncReferences(old);validateDocument(old);
inputs.dirty=old;
assert.deepEqual(inputs.reviewed.acquisition_migration.legacy_draft,old.draft);
assert.deepEqual(inputs.reviewed.session,validateDocument(old).session);
rows.push({name:'dirty',source:paths.natural,recipe:'test/runtime/d03r.test.mjs: learnedSource + old dirty refund draft',document_sha256:sha(canonical(old)),schema:old.schema,engine:old.engine_version,phase:old.session.phase,revision:old.revision,derived_fixture:true,archived_draft_matches_published_reviewed:true});
delete inputs.reviewed;
const manifest={schema:'CW-M1-D04A-inputs-1',runtime_commit:'442af718d30b30284cf5ac976eb7421992d94dfd',baseline_commit:'9d5dd304dee942965b9f1dd62368bee9f3c9e670',runtime_sha256:Object.fromEntries(Object.entries(conditions.source_sha256).filter(([p])=>p.startsWith('src/'))),inputs:rows,scope:'decode and validate existing fixed sources; derive the existing dirty-draft boundary only; no persistence checks'};
fs.mkdirSync(destination,{recursive:true});
fs.writeFileSync(path.join(destination,'inputs.json'),JSON.stringify({manifest,inputs})+'\n');
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'prepared_not_browser_tested',node:process.version,source_files_verified:Object.keys(conditions.source_sha256).length,source_fixtures:rows.length-1,derived_fixtures:1,inputs_sha256:sha(read('docs/検証/接続条件/co-d04a/generated/inputs.json')),output:path.relative(root,destination),indexeddb_checks:0},null,2));
