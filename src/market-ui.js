import {siteURL,now,getMarket} from './market-api.js';
import {selectedCurrency,formattedMoney,convertedMinor} from './commerce-prices.js';
import {setProductImage} from './media.js';
import {activeOffer,remainingTime} from './market-model.js';

export function el(tag,cls='',text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
export function link(text,file,params={},cls=''){const node=el('a',cls,text);node.href=siteURL(file,params);return node;}
export const productURL=product=>siteURL('product.html',{id:product.id});
export function message(host,text,error=false){host.replaceChildren(el('p',error?'market-status market-error':'market-status',text));}
export function bestOffer(product,market){return market.offers.filter(o=>o.product_ids.includes(product.id)&&activeOffer(o,now())).sort((a,b)=>b.discount_bps-a.discount_bps)[0]??null;}
export function unitPrice(product,market){const base=product.price_cents,offer=bestOffer(product,market);return offer&&base?Math.round(base*(10000-offer.discount_bps)/10000):base;}
export function subtotal(items,market){return items.reduce((sum,item)=>sum+(unitPrice(item.product,market)||0)*item.quantity,0);}
export function money(cents,market){if(!Number.isSafeInteger(cents))return 'Price on request';const currency=selectedCurrency();return formattedMoney(convertedMinor(cents,market.rates_scaled[currency],market.rate_scale),currency);}
export function priceNode(product,market){
  const host=el('div','market-price');
  function update(){
    const offer=bestOffer(product,market),nodes=[];
    if(offer){nodes.push(el('s','market-original-price',money(product.price_cents,market)));}
    nodes.push(el('strong','product-price',money(unitPrice(product,market),market)));
    if(offer)nodes.push(el('span','onstore-promotion-badge',`−${offer.discount_bps/100}%`));
    host.replaceChildren(...nodes);
  }
  update();document.addEventListener('onstore:currency-changed',update);document.addEventListener('onstore:offers-expired',update);document.addEventListener('onstore:market-updated',update);
  // Event listeners are removed when their owning cards leave the DOM.
  const observer=new MutationObserver(()=>{if(!host.isConnected){document.removeEventListener('onstore:currency-changed',update);document.removeEventListener('onstore:offers-expired',update);document.removeEventListener('onstore:market-updated',update);observer.disconnect();}});
  queueMicrotask(()=>{if(host.isConnected)observer.observe(document.body,{childList:true,subtree:true});});
  return host;
}
export function card(product,market){
  const article=el('article','product-card');
  const anchor=el('a','product-card-button');anchor.href=productURL(product);anchor.setAttribute('aria-label','View details for '+product.canonical_name);
  const visual=el('div','product-photo'),image=el('img');image.width=350;image.height=270;setProductImage(image,product.main_image?siteURL(product.main_image):null,product.canonical_name);visual.append(image);
  const flash=market.offers.filter(o=>o.kind==='flash-sale'&&o.ends_at&&o.product_ids.includes(product.id)&&activeOffer(o,now())).sort((a,b)=>Date.parse(a.ends_at)-Date.parse(b.ends_at))[0];
  if(flash)visual.append(countdown(flash.ends_at));
  const body=el('div','product-card-body');body.append(el('p','product-store',product.shop),el('h3','',product.canonical_name),priceNode(product,market),el('p','product-meta',product.department),el('span','product-card-action','View details →'));
  anchor.append(visual,body);article.append(anchor);return article;
}
export function countdown(end){const node=el('span','market-countdown');node.setAttribute('aria-label','Sale time remaining');node.dataset.deadline=end;node.textContent=remainingTime(end,now());return node;}
export function updateCountdowns(){
  for(const node of document.querySelectorAll('[data-deadline]')){
    const text=remainingTime(node.dataset.deadline,now());node.textContent=text;
    if(text==='Ended'&&!node.dataset.expired){node.dataset.expired='true';document.dispatchEvent(new Event('onstore:offers-expired'));}
  }
}
export function rail(title,products,market,{file='deals.html',params={},deadline}={}){
  const section=el('section','section shell market-rail');
  const heading=el('div','section-heading'),copy=el('div');copy.append(el('h2','',title));if(deadline)copy.append(countdown(deadline));
  heading.append(copy,link('View all →',file,params,'market-view-all'));
  const strip=el('div','market-carousel');strip.setAttribute('aria-label',title+' products');strip.tabIndex=0;
  strip.append(...products.slice(0,12).map(p=>card(p,market)));
  if(!products.length)strip.append(el('p','market-empty','There are no offers in this collection right now. Explore more products.'));
  const controls=el('div','market-rail-controls');
  for(const [label,direction,symbol] of [['Previous products',-1,'←'],['Next products',1,'→']]){const button=el('button','market-arrow',symbol);button.type='button';button.setAttribute('aria-label',label);button.addEventListener('click',()=>strip.scrollBy({left:direction*strip.clientWidth*.8,behavior:'smooth'}));controls.append(button);}
  section.append(heading,strip,controls);return section;
}
export function shopCard(shop){
  const anchor=link('', 'shop.html',{shop:shop.slug},'shop-card shop-card-link');
  const icon=el('div','shop-icon'),image=el('img','shop-logo');image.alt=shop.name+' logo';image.loading='lazy';image.src=siteURL(shop.logoUrl);icon.append(image);
  image.addEventListener('error',()=>icon.replaceChildren(el('span','',shop.name.charAt(0))),{once:true});
  const badge=el('span','shop-verification');badge.setAttribute('role','img');badge.setAttribute('aria-label','Verification level: '+shop.verificationLevel);
  const shield=el('img','shop-verification-icon');shield.alt='';shield.width=34;shield.height=34;shield.src=siteURL('images/verification/'+shop.verificationLevel+'.webp');badge.append(shield);
  anchor.append(icon,el('h3','shop-name',shop.name),badge);return anchor;
}
export function field(label,name,{type='text',value='',required=false,autocomplete,maxLength}={}){
  const wrapper=el('label','market-field',label),input=el('input');input.name=name;input.type=type;input.value=value;input.required=required;if(autocomplete)input.autocomplete=autocomplete;if(maxLength)input.maxLength=maxLength;wrapper.append(input);return wrapper;
}
export async function currencyReady(){const {reloadPricing}=await import('./commerce-prices.js');try{await reloadPricing();}catch{/* The market payload still contains the validated conversion table. */}return getMarket();}
