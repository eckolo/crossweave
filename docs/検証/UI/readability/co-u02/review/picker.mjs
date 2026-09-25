import {checkpoints, createCheckpoint} from './checkpoints.mjs';
import {loadDocument} from './source.mjs';

// All controls in this module are outside the game frame. The production
// launcher, rendering, session and persistence modules are unchanged.
export function mountReview(host, {ui, prepare = id => createCheckpoint(id, loadDocument), cases=checkpoints, initial=null, updateURL=true} = {}) {
  const select = host.querySelector('[data-review-case]');
  const open = host.querySelector('[data-review-open]');
  const status = host.querySelector('[data-review-status]');
  const root = host.querySelector('#crossweave-journey');
  const win = host.ownerDocument.defaultView;
  for (const item of cases) {
    const option = host.ownerDocument.createElement('option');
    option.value = item.id; option.textContent = item.label; select.append(option);
  }
  let app = null, current = null, pending = false, disposed = false;
  function busy(value) {
    pending = value; select.disabled = value; open.disabled = value;
    root.inert = value; host.setAttribute('aria-busy', String(value));
  }
  async function show(id) {
    if (pending || disposed) return false;
    if (!cases.some(item => item.id === id)) {
      status.textContent = '指定された場面はありません。場面を選んで開いてください。';
      return false;
    }
    busy(true); status.textContent = '場面を読み込んでいます…';
    try {
      const prepared = await prepare(id);
      if (disposed) return false;
      // Complete the public read before replacing the currently working UI.
      const session = ui.makeSession(prepared.controller, {reopen:() => prepared.Campaign.open({slot_id:prepared.slot_id})});
      const refreshed = await session.refresh({preserveLocal:false});
      if (disposed || !refreshed.ok) { session.dispose(); if (disposed) return false; throw Error('checkpoint_read_failed'); }
      app?.dispose();
      app = ui.mountJourney(root, {...prepared, session, storageMode:'ephemeral'});
      const ready = await app.ready;
      if (disposed) return false;
      if (!ready.ok) throw Error('checkpoint_mount_failed');
      if (prepared.checkpoint.navigate) {
        for(const destination of [prepared.checkpoint.navigate].flat()){
        const button = root.querySelector('[data-j="' + destination + '"]');
        if (!button || button.disabled) throw Error('checkpoint_navigation_missing');
        button.click();
        }
      }
      if (root.dataset.screen !== prepared.checkpoint.screen) throw Error('checkpoint_screen_changed');
      current = id; select.value = id;
      if(updateURL){const url = new URL(win.location.href); url.searchParams.set('case', id);
      win.history.replaceState(null, '', url);}
      status.textContent = cases.find(item => item.id === id).label + 'から操作できます。';
      return true;
    } catch {
      if (!disposed) {
        select.value = current || id;
        status.textContent = 'この場面を開けませんでした。接続を確認して、もう一度開いてください。';
      }
      return false;
    } finally { if (!disposed) busy(false); }
  }
  const choose = () => show(select.value);
  select.addEventListener('change', choose); open.addEventListener('click', choose);
  const first = initial || new URL(win.location.href).searchParams.get('case') || 'offers';
  const ready = show(first);
  return {ready, show, get app(){return app;}, state:() => ({current, pending}), dispose(){
    disposed = true; select.removeEventListener('change', choose); open.removeEventListener('click', choose); app?.dispose();
  }};
}
