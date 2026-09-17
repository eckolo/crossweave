from pathlib import Path
from playwright.sync_api import sync_playwright
import json,subprocess
base=Path(__file__).resolve().parent.parent;out=base/'verification';screens=out/'screenshots';screens.mkdir(exist_ok=True)
fragment=subprocess.check_output(['node','-e',"process.stdout.write(require(process.argv[1]).build({testing:true,standalone:false}))",str(base/'build-layout.cjs')],text=True)
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 version=b.version
 page=b.new_page(viewport={'width':1100,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for w in [1024,736,600,320]:
  page.set_content('<html lang="ja"><meta charset="utf-8"><style>body{margin:0}.host{width:'+str(w)+'px;max-width:100%}</style><div class="host">'+fragment+'</div></html>')
  page.wait_for_timeout(60)
  def check(label,popup=False):
   d=page.evaluate('''()=>{const g=document.querySelector('.cw-game').getBoundingClientRect();const els=[...document.querySelectorAll('.cw-workspace,.cw-main,.cw-draft,.cw-footer,.cw-popup,.cw-return')];return {width:g.width,height:g.height,docOverflow:document.documentElement.scrollWidth>innerWidth,children:els.map(e=>{const r=e.getBoundingClientRect();return {cls:e.className,inside:r.left>=g.left-1&&r.right<=g.right+1&&r.top>=g.top-1&&r.bottom<=g.bottom+1,scrollable:e.scrollHeight>e.clientHeight+1}})}}''')
   assert not d['docOverflow'],d
   assert all(x['inside'] for x in d['children']),d
   records.append({'width':w,'case':label,'pass':True,'geometry':d})
  check('return')
  page.locator('[data-action="ack"]').click()
  check('preparation')
  last=page.locator('.cw-scroll [data-detail]').last;last.scroll_into_view_if_needed();last.click()
  assert page.locator('.cw-popup').is_visible();check('last-card-detail')
  page.locator('[data-action="pin"]').click();page.locator('.cw-game').press('Escape')
  page.locator('[data-action="nav-skills"]').click();page.locator('.cw-scroll [data-detail="base:PS02"]').click();page.locator('[data-action="learning"]').click()
  page.locator('[data-action="review"]').click();page.locator('[data-action="commit"]').scroll_into_view_if_needed();check('comparison-confirm-reachable')
  # Resize without reinitializing the response, draft, or open window.
  before=page.evaluate('JSON.stringify([document.getElementById("crossweave-growth-001").__test.plan,document.getElementById("crossweave-growth-001").__test.win])')
  for narrow in [320,736,w]:
   page.locator('.host').evaluate('(e,w)=>e.style.width=w+"px"',narrow);page.wait_for_timeout(50)
   assert page.evaluate('JSON.stringify([document.getElementById("crossweave-growth-001").__test.plan,document.getElementById("crossweave-growth-001").__test.win])')==before
  records.append({'width':w,'case':'resize-keeps-draft-and-window','pass':True})
  page.screenshot(path=str(screens/f'parent-{w}-comparison.png'),full_page=True)
  page.locator('[data-action="commit"]').click()
  assert page.evaluate('document.getElementById("crossweave-growth-001").__test.view.display_data.home.economy.unspent_units')==500
  records.append({'width':w,'case':'confirmation-click','pass':True})
  page.locator('[data-action="nav-offers"]').click();page.locator('.cw-scroll [data-detail]').filter(has_text='軽い踏ん張り').click()
  page.locator('[data-action="candidate"]').scroll_into_view_if_needed();check('affix-detail-action-reachable')
  page.screenshot(path=str(screens/f'parent-{w}-detail.png'),full_page=True)
 # Full BC sequence from the published instructions, with real DOM clicks.
 page.set_content('<html lang="ja"><meta charset="utf-8"><style>body{margin:0}.host{width:1024px}</style><div class="host">'+fragment+'</div></html>')
 def click(s):page.locator(s).first.click()
 click('[data-action="ack"]');click('[data-action="nav-skills"]');click('.cw-scroll [data-detail="base:PS02"]');click('[data-action="learning"]')
 click('[data-action="nav-offers"]');page.locator('.cw-scroll [data-detail]').filter(has_text='軽い踏ん張り').click();click('[data-action="candidate"]')
 click('[data-action="nav-deck"]');click('.cw-scroll [data-detail="base:h"]');click('[data-action="deck-remove"]');click('.cw-scroll [data-detail="$purchase"]');click('[data-action="deck-add"]')
 click('[data-action="review"]');click('[data-action="commit"]')
 state=page.evaluate('document.getElementById("crossweave-growth-001").__test.view.display_data.home')
 assert state['economy']['unspent_units']==100 and len(state['owned'])==6
 click('[data-action="nav-owned"]');page.locator('.cw-scroll [data-detail]').filter(has_text='借り札の守り').click();click('[data-action="quote"]');click('[data-action="convert"]')
 state=page.evaluate('document.getElementById("crossweave-growth-001").__test.view.display_data.home')
 assert state['economy']['unspent_units']==150 and len(state['owned'])==5
 records.append({'case':'BC-return-cancel-purchase-deck-compare-confirm-convert','pass':True,'unspent_units':150,'owned_count':5})
 assert not errors,errors
 b.close()
report={'trial_id':'CW-M1-UI-001','group':'rendering-of-UI-G-001-v0.1.1','engine':'Chromium '+version,'input':'layout-input.json (BC/empty projection; not full fixtures.json)','result':'pass','count':len(records),'records':records,'page_errors':errors,'limitations':['Headless desktop Chromium; no user/device acceptance.','No real Campaign/storage/network.','These widths are exact component-parent widths; narrow height620 remains vertically scrollable in shorter host viewports.','Old 28 checks were not rerun.']} 
(out/'layout-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(report['engine'],report['count'],'PASS')
