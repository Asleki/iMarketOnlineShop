"""Browser journeys against a temporary local backend. Requires Playwright + Chromium."""
import asyncio,json,os,socket,subprocess,tempfile,time,urllib.request,uuid
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('ONSTORE_BROWSER_EVIDENCE','/tmp/onstore-browser-evidence'));OUT.mkdir(parents=True,exist_ok=True)

async def journeys(base,env):
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=await browser.new_context(viewport={'width':1440,'height':1000})
        page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(base,wait_until='networkidle')
        dialog=page.locator('.category-dialog');await expect(dialog).to_be_visible()
        submit=dialog.get_by_role('button',name='Explore onStore');await expect(submit).to_be_disabled()
        for i in range(4):await dialog.locator('.category-choice').nth(i).click()
        await expect(submit).to_be_disabled();await dialog.locator('.category-choice').nth(4).click();await expect(submit).to_be_enabled()
        await page.screenshot(path=str(OUT/'desktop-category-picker.png'))
        await submit.click();await expect(dialog).to_have_count(0)
        assert await page.locator('#shops,#shop-grid').count()==0
        assert await page.locator('#hero-slider .featured-photo').count()==1
        assert await page.locator('#category-products .market-rail').count()==5
        await page.reload(wait_until='networkidle');assert await page.locator('.category-dialog').count()==0
        await page.screenshot(path=str(OUT/'desktop-home.png'),full_page=True)
        await page.locator('#home-offers .product-card a').first.click();await page.wait_for_url('**/product.html?id=*')
        product_url=page.url;await expect(page.locator('.market-product-detail h1')).to_be_visible()
        assert await page.locator('#product-details').count()==0
        thumbs=page.locator('.product-thumbnail')
        if await thumbs.count()>1:
            before=await page.locator('.product-detail-hero').get_attribute('src');await thumbs.nth(1).click();assert before!=await page.locator('.product-detail-hero').get_attribute('src')
        await expect(page.locator('.stock-in')).to_be_visible();await page.get_by_role('button',name='Add to cart',exact=True).click();await expect(page.get_by_role('link',name='View cart',exact=True)).to_be_visible()
        await page.get_by_role('link',name='View cart',exact=True).click();await page.wait_for_url('**/cart.html');await expect(page.locator('.market-cart-row')).to_have_count(1)
        await page.goto(base+'/profile.html?mode=register',wait_until='networkidle')
        suffix=uuid.uuid4().hex[:8];username='Customer'+suffix;password='Browser-test-only-'+suffix
        await page.locator('input[name=username]').fill(username);await page.locator('input[name=email]').fill(suffix+'@example.test');await page.locator('input[name=password]').fill(password)
        await page.get_by_role('button',name='Create account',exact=True).click();await expect(page.get_by_role('heading',name='Welcome '+username)).to_be_visible()
        await expect(page.locator('#onstore-greeting')).to_have_text('Welcome '+username)
        await expect(page.get_by_text('Level 0 · Starter',exact=True)).to_be_visible()
        await page.locator('input[name=line1]').fill('Testing address');await page.locator('input[name=city]').fill('Harare');await page.get_by_role('button',name='Save address',exact=True).click();await expect(page.get_by_text('Your default address is saved.',exact=True)).to_be_visible()
        await page.reload(wait_until='networkidle');await expect(page.locator('input[name=line1]')).to_have_value('Testing address')
        await page.goto(base+'/cart.html',wait_until='networkidle');await expect(page.locator('.market-cart-row')).to_have_count(1)
        await page.goto(product_url,wait_until='networkidle');await page.locator('textarea[name=body]').fill('Helpful product for this browser test.');await page.get_by_role('button',name='Submit review',exact=True).click();await expect(page.get_by_role('heading',name='Reviews (1)',exact=True)).to_be_visible()
        await page.screenshot(path=str(OUT/'desktop-product.png'),full_page=True)
        await page.goto(base+'/shops.html',wait_until='networkidle');await expect(page.locator('.shop-card')).to_have_count(7)
        await page.locator('.shop-card').filter(has_text='Joy Totes').click();await page.wait_for_url('**/shop.html?shop=joy-totes');await expect(page.locator('.shop-home-hero h1')).to_have_text('Joy Totes')
        await page.locator('.market-rail .market-view-all').first.click();await page.wait_for_url('**/deals.html?kind=hot-deals&shop=joy-totes')
        assert await page.locator('.product-card .product-store').count()>0
        assert all(name=='Joy Totes' for name in await page.locator('.product-card .product-store').all_inner_texts())
        await page.go_back(wait_until='networkidle')
        await page.locator('.product-card a').first.click();await page.wait_for_url('**/product.html?id=*');await expect(page.locator('.product-detail-hero')).to_be_visible()
        await page.locator('#header-product-search').fill('phones');await page.locator('.commerce-search-submit').click();await page.wait_for_url('**/search.html?q=phones');assert await page.locator('.product-card').count()>0
        await page.goto(base+'/profile.html',wait_until='networkidle');await page.get_by_role('button',name='Sign out',exact=True).click();await expect(page.locator('#onstore-greeting')).to_have_text('Hello, Guest')
        await page.locator('input[name=identifier]').fill(username);await page.locator('input[name=password]').fill(password);await page.locator('.market-form').get_by_role('button',name='Sign In',exact=True).click();await expect(page.get_by_role('heading',name='Welcome '+username)).to_be_visible()
        # A locally provisioned administrator can set one real persistent deadline, but only for its own shop.
        admin_context=await browser.new_context();admin=await admin_context.new_page();admin.on('pageerror',lambda e:errors.append(str(e)))
        await admin.goto(base+'/profile.html',wait_until='networkidle');await admin.locator('input[name=identifier]').fill('BrowserManager');await admin.locator('input[name=password]').fill(env['ONSTORE_ADMIN_PASSWORD']);await admin.locator('.market-form').get_by_role('button',name='Sign In',exact=True).click();await expect(admin.get_by_role('link',name='Manage shop',exact=True)).to_be_visible();await admin.get_by_role('link',name='Manage shop',exact=True).click()
        await admin.locator('input[name=name]').fill('Browser flash sale');await admin.locator('select[name=kind]').select_option('flash-sale');await admin.locator('input[name=discount]').fill('15');await admin.locator('select[name=products]').select_option(index=0)
        end=await admin.evaluate("new Date(Date.now()+120000).toISOString().slice(0,16)");await admin.locator('input[name=ends_at]').fill(end)
        await admin.get_by_role('button',name='Save offer',exact=True).click();await expect(admin.get_by_text('Offer saved. Its deadline is shared by all visitors.',exact=True)).to_be_visible()
        await page.goto(base+'/deals.html?kind=flash-sales',wait_until='networkidle');await expect(page.locator('.market-countdown').first).to_be_visible()
        deadline=await page.locator('.market-countdown').first.get_attribute('data-deadline');await page.reload(wait_until='networkidle');assert deadline==await page.locator('.market-countdown').first.get_attribute('data-deadline')
        await page.locator('.product-card a').first.click();await page.wait_for_url('**/product.html?id=*');flash_url=page.url
        flash_id=flash_url.split('id=')[1]
        cart_response=await page.request.get(base+'/api/marketplace/cart');cart_data=await cart_response.json()
        for item in cart_data['items']:
            if item['id']!=flash_id:
                response=await page.request.put(base+'/api/marketplace/cart/items/'+item['id'],data={'quantity':0});assert response.status==200
        response=await page.request.put(base+'/api/marketplace/cart/items/'+flash_id,data={'quantity':1});assert response.status==200
        await page.goto(base+'/cart.html',wait_until='networkidle');before_total=await page.locator('.market-total').inner_text()
        await page.evaluate("const realNow=Date.now;Date.now=()=>realNow()+300000;document.dispatchEvent(new Event('onstore:offers-expired'))")
        after_total=await page.locator('.market-total').inner_text();assert before_total!=after_total
        assert after_total==await page.locator('.market-cart-row .product-price').inner_text()
        await admin.locator('input[name=quantity]').fill('0');await admin.get_by_role('button',name='Save stock',exact=True).click();await expect(admin.get_by_text('Stock updated.',exact=True)).to_be_visible()
        await page.goto(flash_url,wait_until='networkidle');await expect(page.locator('.stock-out')).to_have_text('Out of stock');await expect(page.get_by_role('button',name='Add to cart',exact=True)).to_be_disabled()
        mobile_context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=1)
        mobile=await mobile_context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
        await mobile.goto(base,wait_until='networkidle');modal=mobile.locator('.category-dialog');await expect(modal).to_be_visible()
        for i in range(5):await modal.locator('.category-choice').nth(i).click()
        await modal.get_by_role('button',name='Explore onStore').click();await expect(modal).to_have_count(0)
        assert await mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1')
        await mobile.screenshot(path=str(OUT/'mobile-home.png'),full_page=True)
        await mobile.locator('#home-offers .product-card a').first.click();await expect(mobile.locator('.market-product-detail h1')).to_be_visible()
        await mobile.screenshot(path=str(OUT/'mobile-product.png'),full_page=True)
        assert not errors,errors
        result={'status':'PASS','journeys':['five-category onboarding and persistence','unchanged homepage hero','home rails and personalized categories','canonical detail links/gallery','guest cart and account merge','signup/login/logout and header greeting','persisted default address','review count and submission','shops and shop homepage','global search','admin absolute flash deadline across reload','admin stock update and out-of-stock state','mobile onboarding and product page'],'page_errors':errors,'screenshots':str(OUT)}
        (OUT/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
        await browser.close()

with tempfile.TemporaryDirectory(prefix='onstore-browser-') as temp:
    env=os.environ.copy();env['ONSTORE_DB_PATH']=str(Path(temp)/'test.sqlite');env['ONSTORE_ADMIN_PASSWORD']='Browser-only-'+uuid.uuid4().hex
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    env['PORT']=str(port);env['HOST']='127.0.0.1';log=open(OUT/'server.log','w')
    server=subprocess.Popen(['node','backend/server.mjs'],cwd=ROOT,env=env,stdout=log,stderr=log)
    base='http://127.0.0.1:'+str(port)
    try:
        for _ in range(100):
            try:urllib.request.urlopen(base+'/api/marketplace/health',timeout=1);break
            except Exception:time.sleep(.1)
        subprocess.run(['node','backend/cli.mjs','create-admin','BrowserManager','browser-manager@example.test','click-n-get'],cwd=ROOT,env=env,check=True,stdout=subprocess.DEVNULL)
        asyncio.run(journeys(base,env))
    finally:server.terminate();server.wait(timeout=10);log.close()
