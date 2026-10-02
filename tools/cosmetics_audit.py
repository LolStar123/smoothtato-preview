"""Exercise the real cosmetics catalogue and combined profile locally or publicly."""
import functools
import http.server
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output/qa'
QA.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'examples/portfolio')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(**({'channel':'chrome'} if os.name=='nt' else {}))
        page=browser.new_page(viewport={'width':1280,'height':1000},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(os.environ.get('AUDIT_URL',f'http://127.0.0.1:{server.server_port}/cosmetics/'),wait_until='networkidle')
        page.wait_for_function('window.__mtx?.ready')
        assert page.evaluate('__mtx.total')==1489
        assert page.locator('#catalogue .effect').count()==24
        page.locator('#search').fill('arc')
        assert 0<page.evaluate('__mtx.filtered')<1489
        page.locator('#catalogue .effect').first.click()
        page.locator('#add').click()
        assert page.locator('#loadout-count').inner_text()=='1'
        with page.expect_download() as dl:page.locator('#export').click()
        code=Path(dl.value.path()).read_text()
        assert code.startswith('STATO1-')
        page.locator('#import-code').fill(code) if page.locator('#import-code').is_visible() else page.locator('summary').first.click()
        page.locator('#import-code').fill(code);page.locator('#import').click()
        page.wait_for_function('document.querySelector("#status").textContent.startsWith("Loaded")')
        assert page.locator('#preview img').evaluate('(e)=>e.complete&&e.naturalWidth>0')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(ROOT/'examples/portfolio/cosmetics/preview.png'))
        page.screenshot(path=str(QA/'cosmetics-desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_function('document.querySelectorAll("#catalogue .effect").length===8')
        assert page.locator('#catalogue .effect').count()==8
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile overflow'
        page.locator('#catalogue [data-key]').first.click()
        assert page.locator('#effect-title').bounding_box()['y'] < 500
        page.locator('.back-to-catalogue').click()
        page.wait_for_function('document.querySelector("#catalogue").getBoundingClientRect().top < 100')
        page.screenshot(path=str(QA/'cosmetics-mobile.png'),full_page=True)
        decoded=page.evaluate("""async(code)=>{
            const {decode}=await import('../model.mjs');
            const settings=await (await fetch('../data/settings.json')).json();
            return decode(code,settings);
        }""",code)
        assert decoded['mode']=='safe' and len(decoded['categories'])==11
        assert len(decoded['skins'])==1
        before=page.evaluate('__mtx.chosen')
        page.locator('#import-code').fill('broken-code');page.locator('#import').click()
        assert 'STATO1' in page.locator('#status').inner_text()
        assert page.evaluate('__mtx.chosen')==before
        bad=page.evaluate("""async()=>{
            const {encode}=await import('../model.mjs');
            const settings=await (await fetch('../data/settings.json')).json();
            return encode('normal',[],settings,['unknown-effect']);
        }""")
        page.locator('#import-code').fill(bad);page.locator('#import').click()
        page.wait_for_function('document.querySelector("#status").textContent.includes("outside this catalogue")')
        assert page.evaluate('__mtx.chosen')==before
        page.screenshot(path=str(QA/'cosmetics-import-error.png'),full_page=True)
        page.goto(page.url.split('/cosmetics/')[0]+'/',wait_until='networkidle')
        page.wait_for_function('window.__smooth?.ready')
        assert page.evaluate('__smooth.chosen.length')==11
        assert '1 cosmetic effects' in page.locator('#profile-summary').inner_text()
        with page.expect_download() as dl:page.locator('#export').click()
        assert Path(dl.value.path()).read_text()==code
        page.locator('#restore').click()
        assert '1 cosmetic effects' in page.locator('#profile-summary').inner_text()
        page.locator('a[href="cosmetics/"]').click()
        page.wait_for_function('window.__mtx?.ready')
        assert page.evaluate('__mtx.chosen')==before
        assert '0 graphics changes' in page.locator('#profile-summary').inner_text()
        page.locator('#catalogue .effect').first.focus();page.keyboard.press('Enter')
        assert page.locator('#effect-title').evaluate('(el)=>el===document.activeElement')
        assert page.locator('#effect-title').evaluate('(el)=>getComputedStyle(el).outlineWidth')=='2px'
        page.locator('.back-to-catalogue').click()
        page.locator('#next-bottom').click()
        assert 'page 2' in page.locator('#count').inner_text()
        assert page.locator('#count').evaluate('(el)=>el===document.activeElement')
        page.locator('#search').fill('zzzz-no-such-effect')
        assert 'No effects match' in page.locator('#catalogue').inner_text()
        page.screenshot(path=str(QA/'cosmetics-empty.png'),full_page=True)
        page.route('**/data/catalogue.json',lambda route:route.abort())
        page.reload(wait_until='networkidle')
        assert 'could not load' in page.locator('#status').inner_text()
        assert page.locator('#add').is_disabled()
        page.screenshot(path=str(QA/'cosmetics-load-error.png'),full_page=True)
        assert not errors,errors
        print('PASS: full catalogue, search, selection, real preview, STATO1 export/import and mobile')
        browser.close()
finally: server.shutdown()
