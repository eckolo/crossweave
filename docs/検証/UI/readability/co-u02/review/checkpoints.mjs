// Review setup only. Import unchanged design fixtures into the design-owned
// MemoryStore, then use public commands. Never use this entry for player saves.
import {createCampaign} from '../../../../../../src/runtime/campaign.mjs';
import {MemoryStore} from '../../../../../../test/runtime/support.mjs';

export const checkpoints = Object.freeze([
  {id:'carried', label:'撤退後・候補の持越し', fixture:'offers-home', screen:'return', departThenWithdraw:true, withdraw:true, outcome:'withdrawal'},
  {id:'offers', label:'購入候補・編成と比較', fixture:'offers-home', screen:'offers', navigate:'offers'},
  {id:'owned', label:'所持・ロック・変換', fixture:'purchased-home', screen:'owned', navigate:['offers','owned']},
  {id:'converted', label:'変換後の拠点', fixture:'converted-home', screen:'hub'},
  {id:'return-d03', label:'帰還から取得へ', fixture:'migrated-return', screen:'return'},
  {id:'explore-d03', label:'D58の探索・予測・記録', fixture:'purchased-exploring', screen:'explore', advanceIfPaused:true},
  {id:'hub', label:'出発前', fixture:'home', screen:'hub'},
  {id:'deck', label:'札組', fixture:'home', screen:'deck', navigate:'deck'},
  {id:'skills', label:'心得', fixture:'home', screen:'skills', navigate:'skills'},
  {id:'explore', label:'探索中', fixture:'entry', screen:'explore', advance:true},
  {id:'entry', label:'出発直後の本文', fixture:'entry', screen:'scene'},
  {id:'port', label:'探索途中の本文', fixture:'port', screen:'scene'},
  {id:'clear', label:'踏破後', fixture:'return', screen:'return', outcome:'clear'},
  {id:'withdrawal', label:'撤退後', fixture:'entry', screen:'return', withdraw:true, outcome:'withdrawal'},
  {id:'defeat', label:'緊急脱出後', fixture:'second-return', screen:'return', outcome:'defeat'}
].map(Object.freeze));

export async function createCheckpoint(id, loadDocument) {
  const checkpoint = checkpoints.find(item => item.id === id);
  if (!checkpoint) throw Error('unknown_checkpoint');
  const document = await loadDocument(checkpoint.fixture);
  const storage = new MemoryStore();
  const Campaign = createCampaign({storage});
  const slot_id = 'ui-review-' + crypto.randomUUID();
  const controller = await Campaign.importSave({slot_id, document, request_id:crypto.randomUUID()});
  const commands = [];
  async function execute(type, payload) {
    const view = controller.inspect();
    const command = {type, payload, request_id:crypto.randomUUID(),
      expected_revision:view.meta.revision, view_token:view.meta.view_token};
    const result = await controller.execute(command);
    if (result.display_data.error) throw Object.assign(Error('checkpoint_command_failed'), result.display_data.error);
    commands.push(command);
  }
  if (checkpoint.advance || checkpoint.advanceIfPaused && controller.inspect().display_data.scene?.paused) {
    const scene = controller.inspect().display_data.scene;
    if (!scene.paused) throw Error('checkpoint_scene_changed');
    // Omission means "all main text was displayed" in Campaign. Explicitly
    // send none: this is setup, not a player's read receipt.
    await execute('continue_scene', {scene_id:scene.id, advance:true, displayed_text_ids:[]});
  }
  if (checkpoint.departThenWithdraw) await execute('depart', {case_id:controller.inspect().display_data.case.id});
  if (checkpoint.withdraw) await execute('withdraw', {});
  const data = controller.inspect().display_data;
  const screen = data.phase === 'return' ? 'return' : data.scene?.paused ? 'scene' : data.phase === 'exploring' ? 'explore' : 'hub';
  if (screen !== (checkpoint.navigate ? 'hub' : checkpoint.screen) ||
      (checkpoint.outcome && data.return_receipt?.outcome !== checkpoint.outcome)) throw Error('checkpoint_state_changed');
  return {checkpoint, Campaign, controller, slot_id, commands, storage, title:'夜潮の排水路'};
}
