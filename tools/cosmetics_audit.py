"""Exercise the complete commute calculator locally or against its public deployment."""
import functools
import http.server
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'examples/portfolio/cosmetics')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(**({'channel':'chrome'} if os.name=='nt' else {}))
        page=browser.new_page(viewport={'width':1280,'height':1000},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(os.environ.get('AUDIT_URL',f'http://127.0.0.1:{server.server_port}'),wait_until='networkidle')
        page.wait_for_function('window.__mtx?.ready')
        assert page.evaluate('__mtx.total')==1489
        assert page.locator('#catalogue .effect').count()==36
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
        page.screenshot(path=str(ROOT/'examples/portfolio/preview.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile overflow'
        page.locator('#catalogue [data-key]').first.click()
        assert page.locator('#effect-title').bounding_box()['y'] < 500
        page.locator('.back-to-catalogue').click()
        page.wait_for_function('document.querySelector("#catalogue").getBoundingClientRect().top < 100')
        assert not errors,errors
        print('PASS: full catalogue, search, selection, real preview, STATO1 export/import and mobile')
        browser.close()
finally: server.shutdown()
