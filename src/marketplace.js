import {renderHeader,renderFooter} from './shared.js';
import {getMarket,loadSession,preferences,siteURL,cartItems,setCart,request,currentUser,startActivity,now} from './market-api.js';
import {el,link,card,rail,shopCard,message,priceNode,money,subtotal,currencyReady,updateCountdowns,field} from './market-ui.js';
import {selectCollection,validPreferences,activeOffer} from './market-model.js';
import {chooseCategories} from './preferences.js';
import {initHero} from './hero.js';
import {connectFeaturedProducts} from './catalogue-ui.js';
import {renderProfile} from './profile.js';
import {renderProduct} from './product-page.js';
import {renderAdmin} from './shop-admin.js';

const params=new URLSearchParams(location.search);
let cartTotalListener=null;
async function shell(){
  renderHeader(document.querySelector('#site-header'));renderFooter(document.querySelector('#site-footer'));
  const market=await currencyReady();await loadSession();startActivity();setInterval(updateCountdowns,1000);
  let refreshing=false;
  async function refreshMarket(){if(refreshing||document.hidden||!market.backend)return;refreshing=true;try{const next=await getMarket({force:true});if(next.backend){Object.assign(market,next);document.dispatchEvent(new Event('onstore:market-updated'));}}catch{/* Keep the last available catalogue during interruptions. */}finally{refreshing=false;}}
  setInterval(refreshMarket,30000);document.addEventListener('visibilitychange',refreshMarket);return market;
}
function heading(host,title,eyebrow){if(eyebrow)host.append(el('p','eyebrow',eyebrow));host.append(el('h1','market-page-title',title));document.title=title+' | onStore';}
function pageError(error){const host=document.querySelector('#page-content')||document.querySelector('#home-offers');message(host,error.message||'This page is currently unavailable.',true);host.append(link('Explore products','search.html',{},'button button-primary'));}
export async function startHome(){
  try{
    const hero=initHero().catch(()=>message(document.querySelector('#hero-slider'),'Featured products are temporarily unavailable.'));
    const market=await shell();await hero;connectFeaturedProducts();
    function offers(){
      const host=document.querySelector('#home-offers');
      const flash=market.offers.filter(o=>o.kind==='flash-sale'&&activeOffer(o,now()));
      const deadline=flash.map(o=>o.ends_at).filter(Boolean).sort()[0];
      host.replaceChildren(...[['Hot deals','hot-deals'],['New arrivals','new-arrivals'],['Flash sales','flash-sales']].map(([title,kind])=>rail(title,selectCollection(market.products,market.offers,kind,now()),market,{params:{kind},deadline:kind==='flash-sales'?deadline:undefined})));
    }
    offers();document.addEventListener('onstore:offers-expired',offers);document.addEventListener('onstore:market-updated',offers);
    if(!validPreferences(preferences(),market.categories))await chooseCategories({required:true});
    function recommendations(){const host=document.querySelector('#category-products');host.replaceChildren(...preferences().slice(0,5).map(category=>rail(category,market.products.filter(p=>p.department===category),market,{file:'search.html',params:{department:category}})));}
    recommendations();document.addEventListener('onstore:preferences-changed',recommendations);document.addEventListener('onstore:market-updated',recommendations);
    document.querySelector('#change-categories').addEventListener('click',()=>chooseCategories());
  }catch(error){pageError(error);}
}
function renderShops(host,market){heading(host,'Our shops','Find your next favourite');const grid=el('div','shop-grid');grid.append(...market.shops.map(shopCard));host.append(grid);}
function renderSearch(host,market){
  heading(host,'Explore products');
  const controls=el('form','catalogue-controls');controls.setAttribute('role','search');
  const search=field('Search products','q',{type:'search',value:params.get('q')||''});const input=search.querySelector('input');input.placeholder='Name, brand or product ID';
  const shopLabel=el('label','market-field','Shop'),shop=el('select');shop.name='shop';shop.append(new Option('All shops',''));for(const s of market.shops)shop.append(new Option(s.name,s.slug));shop.value=params.get('shop')||'';shopLabel.append(shop);
  const catLabel=el('label','market-field','Category'),category=el('select');category.name='department';category.append(new Option('All categories',''));for(const c of market.categories)category.append(new Option(c,c));category.value=params.get('department')||'';catLabel.append(category);
  controls.append(search,shopLabel,catLabel);const count=el('p','market-status');count.setAttribute('role','status');const grid=el('div','product-grid'),more=el('button','button button-primary','Load more products');more.type='button';let visible=24;
  function render(reset=true){
    if(reset)visible=24;const q=input.value.trim().toLocaleLowerCase();
    const products=market.products.filter(p=>(!shop.value||p.shop_slug===shop.value)&&(!category.value||p.department===category.value)&&(!q||[p.canonical_name,p.id,p.brand,p.department,p.description].some(v=>String(v??'').toLocaleLowerCase().includes(q))));
    grid.replaceChildren(...products.slice(0,visible).map(p=>card(p,market)));if(!products.length)grid.append(el('p','market-empty','No products match. Try another search or category.'));
    count.textContent=`${products.length} products found · ${Math.min(visible,products.length)} shown`;more.hidden=visible>=products.length;
    history.replaceState({},'',siteURL('search.html',{q:input.value.trim(),shop:shop.value,department:category.value}));
  }
  controls.addEventListener('submit',e=>{e.preventDefault();render();});input.addEventListener('input',()=>render());shop.addEventListener('change',()=>render());category.addEventListener('change',()=>render());more.addEventListener('click',()=>{visible+=24;render(false);});host.append(controls,count,grid,more);render();
}
function renderDeals(host,market){
  const names={'hot-deals':'Hot deals','new-arrivals':'New arrivals','flash-sales':'Flash sales'},kind=Object.hasOwn(names,params.get('kind'))?params.get('kind'):'hot-deals';
  const scope=params.get('shop'),shop=scope?market.shops.find(s=>s.slug===scope):null;if(scope&&!shop)throw Error('Shop not found.');
  heading(host,names[kind]+(shop?' at '+shop.name:''));const nav=el('nav','market-tabs');nav.setAttribute('aria-label','Collections');for(const [value,title] of Object.entries(names)){const a=link(title,'deals.html',{kind:value,shop:scope});if(value===kind)a.setAttribute('aria-current','page');nav.append(a);}host.append(nav);
  const grid=el('div','product-grid');
  function render(){const products=selectCollection(market.products.filter(p=>!scope||p.shop_slug===scope),market.offers,kind,now());grid.replaceChildren(...products.map(p=>card(p,market)));if(!products.length)message(grid,kind==='flash-sales'?'There are no flash sales right now. Check back for more offers.':'There are no products in this collection right now.');}
  host.append(grid);render();document.addEventListener('onstore:offers-expired',render);document.addEventListener('onstore:market-updated',render);
}
function renderShop(host,market){
  const shop=market.shops.find(s=>s.slug===params.get('shop'));if(!shop)throw Error('Shop not found.');
  const products=market.products.filter(p=>p.shop_slug===shop.slug),hero=el('section','shop-home-hero');
  const image=el('img','shop-home-logo');image.src=siteURL(shop.logoUrl);image.alt=shop.name+' logo';
  const copy=el('div');copy.append(el('p','eyebrow','An onStore shop'),el('h1','',shop.name),el('p','',shop.description));hero.append(image,copy);
  const nav=el('nav','market-tabs');nav.setAttribute('aria-label',shop.name+' navigation');
  for(const [text,id] of [['Products','shop-products'],['About','shop-about'],['Contact','shop-contact']]){const a=el('a','',text);a.href='#'+id;nav.append(a);}
  const filter=el('label','market-field','Category'),select=el('select');select.append(new Option('All categories',''));for(const c of [...new Set(products.map(p=>p.department))])select.append(new Option(c,c));filter.append(select);
  const hot=el('div');
  function renderOffers(){const offerProducts=selectCollection(market.products.filter(p=>p.shop_slug===shop.slug),market.offers,'hot-deals',now());const section=rail('Hot deals at '+shop.name,offerProducts,market,{file:'deals.html',params:{kind:'hot-deals',shop:shop.slug}});section.classList.remove('shell');hot.replaceChildren(section);}
  renderOffers();document.addEventListener('onstore:offers-expired',renderOffers);document.addEventListener('onstore:market-updated',renderOffers);
  const section=el('section','section');section.id='shop-products';section.append(el('h2','','Trending products'));const grid=el('div','product-grid');section.append(filter,grid);
  const render=()=>{const selected=selectCollection(market.products.filter(p=>p.shop_slug===shop.slug),market.offers,'trending').filter(p=>!select.value||p.department===select.value);grid.replaceChildren(...selected.map(p=>card(p,market)));};select.addEventListener('change',render);document.addEventListener('onstore:market-updated',render);render();
  const about=el('section','section');about.id='shop-about';about.append(el('h2','','About '+shop.name),el('p','',shop.description));
  const contact=el('section','section');contact.id='shop-contact';contact.append(el('h2','','Contact '+shop.name),link('Send a message','contact.html',{shop:shop.slug},'button button-secondary'));
  host.append(hero,nav,hot,section,about,contact);document.title=shop.name+' | onStore';
}
async function renderCart(host,market){
  if(cartTotalListener)for(const event of ['onstore:currency-changed','onstore:offers-expired','onstore:market-updated'])document.removeEventListener(event,cartTotalListener);
  host.replaceChildren();heading(host,'Your cart');const rows=el('div','market-cart-list'),summary=el('aside','market-cart-summary');host.append(rows,summary);
  const status=el('p','market-status');status.setAttribute('role','status');host.append(status);
  const items=await cartItems();
  if(!items.length){message(rows,'Your cart is empty. Find something you love.');summary.append(link('Explore products','search.html',{},'button button-primary'));return;}
  for(const item of items){
    const p=item.product,row=el('article','market-cart-row'),image=el('img');image.src=siteURL(p.main_image||'images/placeholder.webp');image.alt=p.canonical_name;image.width=100;image.height=100;
    const copy=el('div');copy.append(link(p.canonical_name,'product.html',{id:p.id}),el('p','product-store',p.shop),priceNode(p,market));
    if(p.stock_count===null||item.quantity>p.stock_count)copy.append(el('p','stock-out','Stock has changed. Please update your quantity.'));
    const qty=field('Quantity','quantity',{type:'number',value:String(item.quantity)}),input=qty.querySelector('input');input.min=0;input.max=Math.max(p.stock_count??0,item.quantity);input.step=1;
    input.addEventListener('change',async()=>{try{await setCart(p.id,Number(input.value));await renderCart(host,market);}catch(e){status.textContent=e.message;input.value=String(item.quantity);}});
    const remove=el('button','button button-secondary','Remove');remove.type='button';remove.addEventListener('click',async()=>{try{await setCart(p.id,0);await renderCart(host,market);}catch(e){status.textContent=e.message;}});
    row.append(image,copy,qty,remove);rows.append(row);
  }
  const calculateTotal=()=>subtotal(items,market);
  const value=el('strong','market-total',money(calculateTotal(),market));summary.append(el('h2','','Subtotal'),value,link('Continue shopping','search.html',{},'button button-primary'),link('Manage delivery address','profile.html'));
  cartTotalListener=()=>{value.textContent=money(calculateTotal(),market);};for(const event of ['onstore:currency-changed','onstore:offers-expired','onstore:market-updated'])document.addEventListener(event,cartTotalListener);
}
function renderContact(host,market){
  const shop=market.shops.find(s=>s.slug===params.get('shop'));heading(host,shop?'Contact '+shop.name:'Contact onStore');
  const form=el('form','market-form');const email=field('Your email','email',{type:'email',value:currentUser()?.email||'',required:true,autocomplete:'email',maxLength:255});
  const label=el('label','market-field','Message'),body=el('textarea');body.name='body';body.required=true;body.maxLength=3000;body.rows=6;label.append(body);
  const submit=el('button','button button-primary','Send message');submit.type='submit';const status=el('p','market-status');status.setAttribute('role','status');form.append(email,label,submit,status);
  form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{await request('/messages',{method:'POST',body:{email:form.elements.email.value,body:body.value,shop_slug:shop?.slug}});status.textContent='Your message has been received.';body.value='';}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}});host.append(form);
}
function renderCitations(host){heading(host,'Citations & attribution');host.append(el('p','','Product images and descriptions are drawn from the supplied NoveGeo catalogue records. Property imagery represents design references.'),el('p','','The seven merchant identities use the approved onStore branding release. Names and marks identify their respective shops.'),el('p','','onStore brings these shops into one marketplace. For questions about a product or its information, contact the relevant shop.'),link('Contact onStore','contact.html',{},'button button-secondary'));}
async function startPage(){
  try{const market=await shell(),host=document.querySelector('#page-content');host.replaceChildren();const page=document.body.dataset.page;
    const routes={shops:()=>renderShops(host,market),shop:()=>renderShop(host,market),search:()=>renderSearch(host,market),deals:()=>renderDeals(host,market),profile:()=>renderProfile(host,market),product:()=>renderProduct(host,market,params.get('id')),cart:()=>renderCart(host,market),contact:()=>renderContact(host,market),citations:()=>renderCitations(host),admin:()=>renderAdmin(host,market)};
    await routes[page]?.();
  }catch(error){pageError(error);}
}
if(document.body.dataset.page&&document.body.dataset.page!=='home')startPage();
