// Every entry point uses the canonical product page; there is no product modal.
import {getMarket,siteURL} from './market-api.js';
export async function openFeaturedProduct(detail){
  const market=await getMarket();
  const product=market.products.find(p=>p.canonical_name===detail?.name&&p.shop_slug===detail?.shop);
  if(product)window.location.href=siteURL('product.html',{id:product.id});
}
export function connectFeaturedProducts(){
  document.addEventListener('onstore:open-product',event=>openFeaturedProduct(event.detail));
  document.documentElement.dataset.onstoreCatalogueReady='true';
  document.dispatchEvent(new Event('onstore:catalogue-ready'));
}
