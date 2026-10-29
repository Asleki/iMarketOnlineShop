import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fail,text} from './auth.mjs';
import {transaction} from './database.mjs';

export function marketplace(db,root,clock){
  const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
  const source=read('api/v1/catalogue.json'),shops=read('data/shops.json'),prices=read('data/commerce/public-prices.json');
  const priceMap=new Map(prices.entries.map(p=>[p.canonical_id,p.usd_cents]));
  const sourceMap=new Map(source.products.map(p=>[p.id,p]));
  const categories=[...new Set(source.products.map(p=>p.department))].sort((a,b)=>a.localeCompare(b));
  const activeOffers=()=>db.prepare('SELECT * FROM offers WHERE enabled=1').all().filter(o=>(!o.starts_at||Date.parse(o.starts_at)<=clock())&&(!o.ends_at||Date.parse(o.ends_at)>clock())).map(o=>({...o,product_ids:JSON.parse(o.product_ids)}));
  function product(id){
    const original=sourceMap.get(id),row=db.prepare('SELECT * FROM products WHERE id=?').get(id);
    if(!original||!row)fail(404,'Product not found.');
    return {...original,...row,price_cents:priceMap.get(id)??null};
  }
  function catalogue(){return {backend:true,server_now:new Date(clock()).toISOString(),products:source.products.map(p=>product(p.id)),shops,categories,rates_scaled:prices.rates_scaled,rate_scale:prices.rate_scale,offers:activeOffers()};}
  function reviews(id){product(id);return {count:db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE product_id=?').get(id).n,reviews:db.prepare('SELECT reviews.id,rating,body,reviews.created_at,username FROM reviews JOIN users ON users.id=reviews.user_id WHERE product_id=? ORDER BY reviews.created_at DESC,reviews.rowid DESC LIMIT 3').all(id)};}
  function cart(userId){return {items:db.prepare('SELECT product_id,quantity FROM cart WHERE user_id=?').all(userId).map(row=>({id:row.product_id,quantity:row.quantity,product:product(row.product_id)}))};}
  function quantity(value){if(!Number.isInteger(value)||value<0||value>100000)fail(400,'Quantity must be a whole number between 0 and 100,000.');return value;}
  function putCart(userId,id,value){
    const q=quantity(value),p=product(id);
    if(q===0)db.prepare('DELETE FROM cart WHERE user_id=? AND product_id=?').run(userId,id);
    else {
      if(p.stock_count===null||p.stock_count<q)fail(409,p.stock_count===null?'Contact the shop about this property reference.':'The requested quantity is unavailable.');
      db.prepare('INSERT INTO cart VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity').run(userId,id,q);
    }
    return cart(userId);
  }
  function mergeCart(userId,items){
    if(!Array.isArray(items)||items.length>210)fail(400,'Invalid cart.');
    const seen=new Set();
    for(const item of items){quantity(item.quantity);product(item.id);if(seen.has(item.id))fail(400,'Duplicate cart product.');seen.add(item.id);}
    return transaction(db,()=>{
      const adjustments=[];
      for(const item of items){
        const p=product(item.id),existing=db.prepare('SELECT quantity FROM cart WHERE user_id=? AND product_id=?').get(userId,item.id)?.quantity??0;
        const q=Math.min(p.stock_count??0,existing+item.quantity);
        if(q!==existing+item.quantity)adjustments.push(item.id);
        putCart(userId,item.id,q);
      }
      return {...cart(userId),adjustments};
    });
  }
  function scopedProduct(user,id){const p=product(id);if(p.shop_slug!==user.shop_slug)fail(403,'This product belongs to another shop.');return p;}
  function saveOffer(user,body,id=null){
    const name=text(body.name,100),kind=body.kind,ids=body.product_ids;
    if(!name||!['hot-deal','flash-sale'].includes(kind)||!Array.isArray(ids)||!ids.length||ids.length>210||new Set(ids).size!==ids.length||!Number.isInteger(body.discount_bps)||body.discount_bps<1||body.discount_bps>5000)fail(400,'Provide a name, products, and a discount between 0.01% and 50%.');
    for(const pid of ids){const p=scopedProduct(user,pid);if(p.stock_count===null)fail(400,'Property references cannot join these offers.');}
    const starts=body.starts_at?Date.parse(body.starts_at):clock(),ends=body.ends_at?Date.parse(body.ends_at):null;
    if(!Number.isFinite(starts)||(ends!==null&&(!Number.isFinite(ends)||ends<=starts||ends<=clock()))||(kind==='flash-sale'&&ends===null))fail(400,'Flash sales need a valid future end time after their start.');
    if(id){const old=db.prepare('SELECT shop_slug FROM offers WHERE id=?').get(id);if(!old)fail(404,'Offer not found.');if(old.shop_slug!==user.shop_slug)fail(403,'This offer belongs to another shop.');}
    const offer={id:id??randomUUID(),shop_slug:user.shop_slug,name,kind,product_ids:ids,discount_bps:body.discount_bps,starts_at:new Date(starts).toISOString(),ends_at:ends===null?null:new Date(ends).toISOString(),enabled:body.enabled===false?0:1};
    db.prepare('INSERT INTO offers VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,product_ids=excluded.product_ids,discount_bps=excluded.discount_bps,starts_at=excluded.starts_at,ends_at=excluded.ends_at,enabled=excluded.enabled').run(offer.id,offer.shop_slug,offer.name,offer.kind,JSON.stringify(ids),offer.discount_bps,offer.starts_at,offer.ends_at,offer.enabled);
    return offer;
  }
  return {catalogue,product,reviews,cart,putCart,mergeCart,scopedProduct,saveOffer,categories,shops,activeOffers};
}
