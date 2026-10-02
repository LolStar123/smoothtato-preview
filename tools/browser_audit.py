"""Exercise the actual Smoothtato preset editor locally or against its public deployment."""
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
        page.goto(os.environ.get('AUDIT_URL',f'http://127.0.0.1:{server.server_port}'),wait_until='networkidle')
        page.wait_for_function('window.__smooth?.ready')
        assert page.evaluate('__smooth.total')==68
        assert page.evaluate('__smooth.chosen.length')==11
        page.locator('[data-preset="blackout"]').click()
        assert page.evaluate('__smooth.chosen.length')==37
        page.locator('#search').fill('rain')
        assert page.locator('[data-key="rain"]').count()==1
        page.locator('[data-key="rain"]').check()
        with page.expect_download() as dl:page.locator('#export').click()
        code=Path(dl.value.path()).read_text()
        assert code.startswith('STATO1-')
        page.locator('#restore').click()
        assert page.evaluate('__smooth.chosen.length')==0
        if not page.locator('#code').is_visible():page.locator('details').filter(has=page.locator('#code')).locator('summary').click()
        page.locator('#code').fill(code);page.locator('#import').click()
        page.wait_for_function('__smooth.chosen.length===38')
        page.locator('#search').fill('')
        page.locator('#filter').select_option('changed')
        assert page.locator('[data-key]').count()==1
        page.locator('[data-preset="safe"]').click()
        page.locator('#filter').select_option('enabled')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(ROOT/'examples/portfolio/preview.png'))
        page.screenshot(path=str(QA/'desktop.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile overflow'
        group=page.locator('#group option').nth(1).inner_text()
        page.locator('#search').fill('')
        page.locator('#filter').select_option('all')
        page.locator('#group').select_option(label=group)
        assert page.locator('.group-title').count()==1
        page.locator('#filter').select_option('enabled')
        page.locator('#group').select_option('')
        page.screenshot(path=str(QA/'mobile.png'),full_page=True)
        page.locator('#group').select_option('')
        page.locator('#search').fill('rain')
        page.locator('[data-key="rain"]').focus();page.keyboard.press('Space')
        assert page.locator('[data-key="rain"]').evaluate('(el)=>el===document.activeElement')
        assert page.locator('[data-key="rain"]').evaluate('(el)=>getComputedStyle(el).outlineWidth')=='2px'
        before=page.evaluate('__smooth.chosen')
        page.locator('#compare').click()
        assert page.locator('#compare').get_attribute('aria-pressed')=='true'
        assert page.evaluate('__smooth.chosen')==before
        page.locator('#compare').click()
        page.emulate_media(reduced_motion='no-preference')
        page.locator('[data-preset="blackout"]').click()
        assert page.locator('.bloom').evaluate('(el)=>getComputedStyle(el).opacity')=='0'
        assert page.locator('.bloom').evaluate('(el)=>getComputedStyle(el).animationName')=='none'
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('.particle').first.evaluate('(el)=>getComputedStyle(el).animationName')=='none'
        if not page.locator('#code').is_visible():page.locator('details').filter(has=page.locator('#code')).locator('summary').click()
        page.locator('#code').fill('broken-code');page.locator('#import').click()
        assert 'STATO1' in page.locator('#status').inner_text()
        assert page.evaluate('__smooth.chosen.length')==37
        page.screenshot(path=str(QA/'invalid-code.png'),full_page=True)
        page.route('**/data/settings.json',lambda route:route.abort())
        page.reload(wait_until='networkidle')
        assert 'could not load' in page.locator('#status').inner_text()
        assert page.locator('#export').is_disabled()
        page.screenshot(path=str(QA/'settings-error.png'),full_page=True)
        assert not errors,errors
        print('PASS: categories, real presets, custom edits, app-code roundtrip, filters and mobile')
        browser.close()
finally: server.shutdown()
