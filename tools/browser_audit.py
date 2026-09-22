"""Exercise the actual Smoothtato preset editor locally or against its public deployment."""
import functools
import http.server
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
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
        if not page.locator('#code').is_visible():page.locator('summary').first.click()
        page.locator('#code').fill(code);page.locator('#import').click()
        page.wait_for_function('__smooth.chosen.length===38')
        page.locator('#search').fill('')
        page.locator('#filter').select_option('changed')
        assert page.locator('[data-key]').count()==1
        page.locator('#filter').select_option('all')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(ROOT/'examples/portfolio/preview.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile overflow'
        assert not errors,errors
        print('PASS: categories, real presets, custom edits, app-code roundtrip, filters and mobile')
        browser.close()
finally: server.shutdown()
