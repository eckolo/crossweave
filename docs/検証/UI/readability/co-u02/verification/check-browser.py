"""In-memory Chromium component checks; no URL navigation, real runtime, or storage."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, subprocess, os
base=Path(__file__).resolve().parent.parent
html=subprocess.check_output(['node','-e','process.stdout.write(require(process.argv[1]).html)',str(base/'verification/build-browser.cjs')],text=True)
checks=[]
def passed(name):checks.append({'name':name,'pass':True})
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1100,'height':900}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.wait_for_selector('.cw-draft');page.set_default_timeout(2500)
 def click(s):page.locator(s).first.click()
 def idle():page.wait_for_function('app.session && !app.session.state().pending')
 passed('async public preparation mounts without page errors')
 click('[data-action="nav-skills"]');click('.cw-scroll [data-detail="base:PS02"]');click('[data-action="learning"]');idle()
 assert page.evaluate('app.session.state().view.display_data.home.economy.unspent_units')==300
 passed('edit and preview keep current money unchanged')
 click('[data-action="review"]');page.evaluate('delay=200;failWrite=true');click('[data-action="commit"]')
 assert page.locator('[data-action="commit"]').is_disabled()
 assert page.evaluate('app.session.state().view.display_data.home.economy.unspent_units')==300
 passed('pending commit disables duplicate input and retains current value')
 idle();assert page.evaluate('app.session.state().canRetry')
 before=page.evaluate('JSON.stringify(app.session.state().draft)');click('[data-action="retry"]');idle()
 assert page.evaluate('app.session.state().view.display_data.home.economy.unspent_units')==500
 assert page.evaluate('JSON.stringify(calls[0])===JSON.stringify(calls[1])')
 passed('save failure retains draft; screen retry uses identical command')
 for w in [1024,736,600,320]:
  page.locator('#host').evaluate('(e,w)=>e.style.width=w+"px"',w)
  click('[data-action="nav-offers"]');page.locator('.cw-scroll [data-detail]').filter(has_text='軽い踏ん張り').click();page.wait_for_timeout(30)
  assert page.evaluate('''()=>{const g=document.querySelector('.cw-game').getBoundingClientRect(),r=document.querySelector('.cw-popup').getBoundingClientRect();return r.left>=g.left-1&&r.right<=g.right+1&&r.bottom<=g.bottom+1}''')
  page.locator('.cw-game').press('Escape')
 passed('new preparation detail fits all four parent widths')
 # Separate export channel; never render the private document as game data.
 click('[data-global="menu"]')
 with page.expect_download() as dl:click('[data-global="export"]')
 assert dl.value.suggested_filename=='crossweave-save.json'
 assert 'private_field' not in page.locator('[data-stage]').inner_text()
 passed('save export is separate from public drawing data')
 page.evaluate('boot("startup")');click('[data-global="open"]')
 page.wait_for_function('startCalls.length===1');assert page.evaluate('startCalls[0].method')=='open'
 assert '保存がありません' in page.locator('[data-message]').inner_text()
 passed('missing save does not trigger new game')
 click('[data-global="menu"]');page.locator('[data-import-document]').fill('{broken');click('[data-global="import"]')
 assert page.locator('[data-import-document]').input_value()=='{broken'
 page.locator('[data-import-document]').fill('{"schema":"OLD"}');click('[data-global="import"]')
 page.wait_for_function('startCalls.length===2');assert page.locator('[data-import-document]').input_value()=='{"schema":"OLD"}'
 passed('invalid and unsupported import retain the input on screen')
 page.evaluate('boot("scene")');page.wait_for_selector('[data-text-id="required"]');page.wait_for_timeout(80)
 assert page.evaluate('calls.length')==0
 passed('available text headings alone create no read record')
 # Open offscreen programmatically without scrolling it into the actual viewport.
 page.evaluate('document.body.style.marginTop="1200px";document.querySelector("[data-text-id=required]").click()');page.wait_for_timeout(80)
 assert page.evaluate('calls.length')==0
 page.locator('[data-displayed-text]').scroll_into_view_if_needed();page.wait_for_function('calls.length===1');idle()
 assert page.evaluate('calls[0].payload.displayed_text_ids')==['required']
 assert page.evaluate('calls[0].payload.advance') is False
 passed('only opened and viewport-visible body is recorded; optional remains unread')
 click('[data-scene-action="continue"]');idle();page.wait_for_selector('.cw-exploration')
 assert page.evaluate('calls[1].payload.displayed_text_ids')==['required']
 passed('continue reuses only actually displayed text IDs')
 page.evaluate('document.body.style.marginTop="0";window.scrollTo(0,0)')
 click('[data-zone="hand"]');click('[data-preview="0"]');idle();click('[data-play="0"]');idle()
 assert page.evaluate('calls.at(-1).payload.choice')=={'card_id':'c1','target':'field1'}
 passed('exploration passes the selected current legal choice to preview and execute')
 page.evaluate('boot("scene")');page.wait_for_selector('[data-text-id="required"]');page.evaluate('failWrite=true');click('[data-text-id="required"]');page.wait_for_function('app.session.state().canRetry')
 click('[data-global="retry"]');idle();page.wait_for_timeout(100)
 assert page.evaluate('calls.length')==2
 assert page.evaluate('JSON.stringify(calls[0])===JSON.stringify(calls[1])')
 passed('failed visible-text annotation retry does not make a new transaction')
 assert not errors,errors
 report={'trial_id':'CW-M1-UI-001','group':'in-memory-browser-components','engine':'Chromium '+b.version,'count':len(checks),'result':'pass','checks':checks,'page_errors':errors,'limits':['Injected contract doubles, not real Campaign or IndexedDB.','file URL navigation was administrator-blocked; no navigation retry or persistent-origin claim.','Input supplied directly for isolated component rendering.','No user acceptance or physical device test.']}
 b.close()
(base/'verification/browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(len(checks),'browser component checks PASS')
