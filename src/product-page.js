import {productDetails,currentUser,request,addToCart,siteURL,getMarket} from './market-api.js';
import {el,link,priceNode,rail} from './market-ui.js';
import {setProductImage} from './media.js';

export async function renderProduct(host,market,id){
  if(!id)throw Error('Choose a product to see its details.');
  const details=await productDetails(id),p=details.product;
  document.title=p.canonical_name+' | onStore';
  const crumbs=el('nav','market-breadcrumbs');crumbs.setAttribute('aria-label','Breadcrumb');crumbs.append(link('Products','search.html'),el('span','','/'),link(p.shop,'shop.html',{shop:p.shop_slug}),el('span','','/'),el('span','',p.canonical_name));
  const layout=el('article','product-detail-layout market-product-detail');
  const gallery=el('section','product-detail-gallery');gallery.setAttribute('aria-label','Product gallery');
  const image=el('img','product-detail-hero');image.width=800;image.height=600;image.loading='eager';
  const setImage=(path,alt)=>setProductImage(image,path?siteURL(path):null,alt);
  setImage(p.main_image,p.canonical_name);gallery.append(image);
  if(p.media.length>1){
    const thumbnails=el('div','product-thumbnails');
    p.media.forEach((m,i)=>{const button=el('button','product-thumbnail');button.type='button';button.setAttribute('aria-label','View image '+(i+1));button.setAttribute('aria-pressed',String(m.path===p.main_image));const thumb=el('img');setProductImage(thumb,siteURL(m.path),m.alt||p.canonical_name+' image '+(i+1));button.append(thumb);button.addEventListener('click',()=>{setImage(m.path,m.alt||p.canonical_name);thumbnails.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});thumbnails.append(button);});gallery.append(thumbnails);
  }
  const info=el('section','product-detail-info');info.append(link(p.shop,'shop.html',{shop:p.shop_slug},'product-store'),el('h1','market-page-title',p.canonical_name),el('p','product-meta',[p.brand,p.department].filter(Boolean).join(' · ')),priceNode(p,market));
  const stock=el('p',p.stock_count===null?'stock-reference':p.stock_count>0?'stock-in':'stock-out',p.stock_count===null?'Property design reference · contact shop':p.stock_count>0?`Available stock: ${p.stock_count}`:'Out of stock');stock.setAttribute('role','status');info.append(stock);
  const actions=el('form','market-buy-actions'),quantity=el('label','market-field','Quantity'),input=el('input');input.name='quantity';input.type='number';input.min=1;input.max=p.stock_count??0;input.value=1;input.step=1;input.required=true;quantity.append(input);
  const add=el('button','button button-primary','Add to cart');add.type='submit';add.disabled=!p.stock_count;const status=el('p','market-status');status.setAttribute('role','status');actions.append(quantity,add,status);if(p.stock_count===null)actions.append(link('Contact shop','contact.html',{shop:p.shop_slug},'button button-secondary'));
  document.addEventListener('onstore:market-updated',()=>{const fresh=market.products.find(item=>item.id===p.id);if(!fresh)return;p.stock_count=fresh.stock_count;stock.textContent=p.stock_count===null?'Property design reference · contact shop':p.stock_count>0?`Available stock: ${p.stock_count}`:'Out of stock';stock.className=p.stock_count===null?'stock-reference':p.stock_count>0?'stock-in':'stock-out';input.max=p.stock_count??0;add.disabled=!p.stock_count;});
  actions.addEventListener('submit',async e=>{e.preventDefault();add.disabled=true;try{await addToCart(p.id,Number(input.value));status.replaceChildren(el('span','','Added to your cart. '),link('View cart','cart.html'));}catch(error){status.textContent=error.message;try{const fresh=await getMarket({force:true}),item=fresh.products.find(x=>x.id===p.id);if(item){p.stock_count=item.stock_count;stock.textContent=item.stock_count>0?`Available stock: ${item.stock_count}`:'Out of stock';stock.className=item.stock_count>0?'stock-in':'stock-out';input.max=item.stock_count??0;}}catch{}}finally{add.disabled=!p.stock_count;}});
  info.append(actions);layout.append(gallery,info);
  const description=el('section','section market-description');description.append(el('h2','','Product description'),el('p','',p.description));
  const seen=new Set([p.description.trim()]);for(const d of p.descriptions||[]){const value=(d.text||'').trim();if(!value||seen.has(value))continue;seen.add(value);description.append(el('h3','',d.type?.replaceAll('_',' ')||'More information'),el('p','',value));}
  const reviews=el('section','section market-reviews');reviews.id='reviews';let current=details.reviews;
  function showReviews(){
    reviews.replaceChildren(el('h2','',`Reviews (${current.count})`));
    if(!current.count)reviews.append(el('p','market-empty','No reviews yet. Be the first to share your experience.'));
    for(const review of current.reviews.slice(0,3)){const article=el('article','market-review');const rating=el('p','',`${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)} · ${review.rating}/5`);article.append(el('h3','',review.username),rating,el('p','',review.body));reviews.append(article);}
    if(current.count>3)reviews.append(el('p','product-meta',`Showing the latest 3 of ${current.count} reviews.`));
    if(currentUser()){
      const form=el('form','market-form'),label=el('label','market-field','Your rating'),rating=el('select');rating.name='rating';for(let i=5;i>=1;i--)rating.append(new Option(i+' stars',i));label.append(rating);
      const bodyLabel=el('label','market-field','Your review'),body=el('textarea');body.name='body';body.required=true;body.maxLength=2000;body.rows=4;bodyLabel.append(body);const submit=el('button','button button-primary','Submit review');submit.type='submit';const result=el('p','market-status');result.setAttribute('role','status');form.append(label,bodyLabel,submit,result);
      form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{current=await request('/products/'+encodeURIComponent(p.id)+'/reviews',{method:'POST',body:{rating:Number(rating.value),body:body.value}});showReviews();}catch(error){result.textContent=error.message;submit.disabled=false;}});reviews.append(form);
    }else reviews.append(link('Sign in to write a review','profile.html',{return:'product.html?id='+encodeURIComponent(p.id)},'button button-secondary'));
  }
  showReviews();host.append(crumbs,layout,description,reviews);
  const related=rail('You may also like',details.related,market,{file:'search.html',params:{department:p.department}});related.classList.remove('shell');host.append(related);
}
