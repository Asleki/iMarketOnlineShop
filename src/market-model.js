export function validPreferences(choices,categories){return Array.isArray(choices)&&choices.length>=5&&choices.length<=categories.length&&new Set(choices).size===choices.length&&choices.every(c=>categories.includes(c));}
export function activeOffer(offer,now=Date.now()){return offer.enabled!==0&&(!offer.starts_at||Date.parse(offer.starts_at)<=now)&&(!offer.ends_at||Date.parse(offer.ends_at)>now);}
export function selectCollection(products,offers,kind,now=Date.now()){
  if(kind==='new-arrivals')return products.filter(p=>Number.isFinite(Date.parse(p.published_at))&&Date.parse(p.published_at)<=now&&now-Date.parse(p.published_at)<=30*86400000).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
  if(kind==='trending')return [...products].sort((a,b)=>(b.views||0)-(a.views||0));
  const eligible=offers.filter(o=>activeOffer(o,now)&&(kind!=='flash-sales'||o.kind==='flash-sale'));
  const ids=new Set(eligible.flatMap(o=>o.product_ids));return products.filter(p=>ids.has(p.id));
}
export function remainingTime(end,now=Date.now()){
  const seconds=Math.ceil((Date.parse(end)-now)/1000);
  if(!Number.isFinite(seconds)||seconds<=0)return 'Ended';
  const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}
