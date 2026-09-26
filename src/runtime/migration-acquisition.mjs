// Called only AFTER the original save has passed the legacy validator.
import {copy} from './common.mjs';
import {initializePossessions,mapLegacySelections,basicRef} from './possessions.mjs';
import {planFor,draftFor,pendingRef} from './preparation.mjs';
import {resolve,syncReferences} from './items.mjs';
import {engineVersion,economyVersion,migrationID} from './versions.mjs';
export function migrateAcquisition(d,source){
  const s=d.session,e=s.economy,oldDraft=copy(d.draft);
  initializePossessions(e,'migrated');
  s.au.deck=mapLegacySelections(s.au.deck,'card');e.aq.equipped=mapLegacySelections(e.aq.equipped,'passive');
  if(s.game){
    const state=s.game.state,counts={};
    for(const card of Object.values(state.cards).filter(c=>c.origin==='P'&&c.birth==='initial')){
      const old=card.selection_id||'base:'+card.type;
      if(old.startsWith('base:')){const base=old.slice(5),i=counts[base]||0;counts[base]=i+1;
        card.selection_id=mapLegacySelections(Array(i+1).fill(old),'card')[i];
      }else card.selection_id=old;
    }
    state.economy_version=economyVersion;state.ah.equipped=copy(e.aq.equipped);
    state.ah.equipment_entries=e.aq.equipped.map(id=>resolve(e,id,'passive'));
  }
  e.runtime_version=economyVersion;d.schema='CW-M1-save-2';d.engine_version=engineVersion;
  d.acquisition_migration={id:migrationID,source_engine:source.engine_version,source_schema:source.schema,
    source_revision:source.revision,legacy_draft:oldDraft,review_required:oldDraft?.dirty===true};
  if(oldDraft){
    let plan=planFor(s);
    if(oldDraft.dirty){
      const old=oldDraft.plan;plan.migration_review='legacy_draft_requires_review';
      plan.acquire=[...old.next_preparation.learn.map(basicRef),...(old.candidate===null?[]:[old.candidate])];
      plan.composition.deck=mapLegacySelections(old.next_preparation.deck,'card').map(id=>id==='$purchase'?pendingRef(old.candidate):id);
      plan.composition.equipment=old.next_preparation.equipment.map(id=>id==='$purchase'?pendingRef(old.candidate):
        id.startsWith('base:')&&old.next_preparation.learn.includes(id.slice(5))?pendingRef(basicRef(id.slice(5))):mapLegacySelections([id],'passive')[0]);
    }
    d.draft=draftFor(s,plan,oldDraft.based_on_revision);
  }
  syncReferences(d);return d;
}
