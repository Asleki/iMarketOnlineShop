import {validPreferences} from './market-model.js';
const root=new URL('../',import.meta.url);
let marketPromise,sessionPromise,user=null,offset=0;
const memoryStorage=new Map();
export const siteURL=(file='index.html',params={})=>{const url=new URL(file,root);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v);return url.href;};
export const now=()=>Date.now()+offset;
export const currentUser=()=>user;
export function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??memoryStorage.get(key)??fallback;}catch{return memoryStorage.get(key)??fallback;}}
export function store(key,value){memoryStorage.set(key,value);try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Preserve this tab's choices even when persistent browser storage is unavailable. */}}
export async function request(path,{method='GET',body}={}){
  const response=await fetch(new URL('api/marketplace'+path,root),{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  let data;try{data=await response.json();}catch{throw Error('This service is currently unavailable. Please try again later.');}
  if(!response.ok)throw Error(data.error||'This request could not be completed.');return data;
}
async function json(path){const r=await fetch(new URL(path,root));if(!r.ok)throw Error('The catalogue could not be loaded.');return r.json();}
async function staticMarket(){
  const [catalogue,shops,prices,inventory,promotions]=await Promise.all(['api/v1/catalogue.json','data/shops.json','data/commerce/public-prices.json','data/commerce/inventory-state.json','data/commerce/public-promotions.json'].map(json));
  const stocks=new Map(inventory.entries.map(p=>[p.canonical_id,p])),priceMap=new Map(prices.entries.map(p=>[p.canonical_id,p.usd_cents]));
  const products=catalogue.products.map(p=>({...p,price_cents:priceMap.get(p.id),stock_count:p.record_type==='PROPERTY'?null:stocks.get(p.id)?.available??0,published_at:stocks.get(p.id)?.first_arrival_utc||catalogue.generated_utc,views:0}));
  return {backend:false,server_now:new Date().toISOString(),products,shops,categories:[...new Set(products.map(p=>p.department))].sort(),rates_scaled:prices.rates_scaled,rate_scale:prices.rate_scale,offers:promotions.campaigns.map(c=>({id:c.campaign_id,name:c.name,kind:c.type==='flash_sale'?'flash-sale':'hot-deal',starts_at:c.start_utc,ends_at:c.end_utc,discount_bps:c.discount_bps,product_ids:c.target_products.map(p=>p.canonical_id)}))};
}
export async function getMarket({force=false}={}){
  if(!marketPromise||force)marketPromise=(async()=>{let data;try{data=await request('/catalogue');}catch{data=await staticMarket();}offset=Date.parse(data.server_now)-Date.now();return data;})();
  return marketPromise;
}
function sessionChanged(next){user=next;document.dispatchEvent(new CustomEvent('onstore:session-changed',{detail:user}));}
export async function loadSession({force=false}={}){
  if(!sessionPromise||force)sessionPromise=(async()=>{
    const market=await getMarket();let next=null;
    if(market.backend){try{next=(await request('/auth/me')).user;}catch{/* A failed session request never creates a local authenticated identity. */}}
    sessionChanged(next);return next;
  })();return sessionPromise;
}
export function preferences(){const choices=user?.categories?.length>=5?user.categories:stored('onstore.categories.v1',[]);return Array.isArray(choices)?choices.filter(c=>typeof c==='string'):[];}
export async function savePreferences(choices){
  const market=await getMarket();if(!validPreferences(choices,market.categories))throw Error('Choose at least five different categories.');
  if(user){await request('/preferences',{method:'PUT',body:{categories:choices}});user={...user,categories:choices};}
  store('onstore.categories.v1',choices);document.dispatchEvent(new Event('onstore:preferences-changed'));return choices;
}
export async function signIn(mode,body){
  if(!(await getMarket()).backend)throw Error('Account services are currently unavailable. Please try again later.');
  const result=await request('/auth/'+mode,{method:'POST',body});
  sessionChanged(result.user);sessionPromise=Promise.resolve(user);
  const guest=stored('onstore.guest-cart.v1',[]);
  if(Array.isArray(guest)&&guest.length){try{await request('/cart/merge',{method:'POST',body:{items:guest}});store('onstore.guest-cart.v1',[]);}catch{/* Keep guest items until a later successful merge; do not silently discard them. */}}
  if(user.categories.length<5&&validPreferences(stored('onstore.categories.v1',[]),(await getMarket()).categories))await savePreferences(stored('onstore.categories.v1',[]));
  if(user.categories.length>=5)store('onstore.categories.v1',user.categories);
  document.dispatchEvent(new Event('onstore:cart-updated'));return user;
}
export async function signOut(){await request('/auth/logout',{method:'POST',body:{}});sessionChanged(null);sessionPromise=Promise.resolve(null);document.dispatchEvent(new Event('onstore:cart-updated'));}
export async function cartItems(){
  if(user)return (await request('/cart')).items;
  const market=await getMarket(),items=stored('onstore.guest-cart.v1',[]);
  return (Array.isArray(items)?items:[]).filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=100000).map(x=>({...x,product:market.products.find(p=>p.id===x.id)})).filter(x=>x.product);
}
export async function setCart(id,quantity){
  if(!Number.isInteger(quantity)||quantity<0||quantity>100000)throw Error('Choose a valid quantity.');
  if(user)await request('/cart/items/'+encodeURIComponent(id),{method:'PUT',body:{quantity}});
  else{
    const market=await getMarket(),product=market.products.find(p=>p.id===id);if(!product)throw Error('Product not found.');
    if(quantity>0&&(product.stock_count===null||quantity>product.stock_count))throw Error('The requested quantity is unavailable.');
    const items=(await cartItems()).filter(x=>x.id!==id).map(({id,quantity})=>({id,quantity}));if(quantity)items.push({id,quantity});store('onstore.guest-cart.v1',items);
  }
  document.dispatchEvent(new Event('onstore:cart-updated'));
}
export async function addToCart(id,quantity=1){const existing=(await cartItems()).find(x=>x.id===id)?.quantity??0;return setCart(id,existing+quantity);}
export async function productDetails(id){
  const market=await getMarket();if(market.backend)return request('/products/'+encodeURIComponent(id));
  const product=market.products.find(p=>p.id===id);if(!product)throw Error('Product not found.');
  return {product,reviews:{count:0,reviews:[]},related:market.products.filter(p=>p.id!==id&&(p.shop_slug===product.shop_slug||p.department===product.department)).slice(0,8)};
}
export function startActivity(){
  let lastInput=Date.now();for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,()=>{lastInput=Date.now();},{passive:true});
  setInterval(async()=>{if(user&&!document.hidden&&Date.now()-lastInput<90000){try{const data=await request('/activity',{method:'POST',body:{}});sessionChanged(data.user);}catch{/* Keep browsing available during transient service failures. */}}},60000);
}
