import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read = p => JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const sku=read('data/commerce/sku-registry.json');
const stock=read('data/commerce/inventory-state.json');
const catalogue=read('api/v1/catalogue.json');
assert.equal(stock.schema,'onstore.inventory-state.v1');
assert.equal(stock.environment,'simulation');
assert.equal(stock.publication_status,'not_real_stock_do_not_use_for_checkout');
assert.equal(stock.item_count,sku.item_count);
assert.equal(stock.entries.length,sku.items.length);
assert.equal(new Set(stock.entries.map(e=>e.sku)).size,stock.item_count);
assert.deepEqual(new Set(stock.entries.map(e=>e.sku)),new Set(sku.items.map(e=>e.sku)));
const policies = new Map(catalogue.products.map(p=>[p.id,p]));
for(const e of stock.entries){
 const c1=sku.items.find(s=>s.sku===e.sku);
 assert.ok(c1);
 assert.equal(e.shop_slug,c1.shop_slug);
 assert.equal(e.canonical_id,c1.canonical_id);
 assert.ok(Number.isSafeInteger(e.on_hand)&&e.on_hand>=0);
 assert.ok(Number.isSafeInteger(e.reserved)&&e.reserved>=0);
 assert.ok(e.on_hand>=e.reserved);
 assert.equal(e.on_hand,e.received_total+e.returned_total-e.sold_total-e.damaged_total);
 if(e.stock_mode==='property_reference'){
   assert.equal(e.shop_slug,'soko-properties');
   assert.equal(e.on_hand,0);assert.equal(e.available,null);
   assert.equal(e.first_arrival_utc,null);assert.equal(e.last_restock_utc,null);
   assert.equal(e.availability_status,'reference_only');
 }else{
   assert.equal(e.available,e.on_hand-e.reserved);
   if(e.received_total>0){assert.ok(e.first_arrival_utc); assert.ok(e.last_restock_utc);}
 }
 if(e.stock_mode==='vehicle_model_simulated'){
   assert.equal(policies.get(e.canonical_id)?.department,'Vehicles');
   // Vehicle models carry synthetic stock; actual unit identities require VIN validation at production.
 }
}
const baseline=stock.entries.filter(e=>e.canonical_id&&e.stock_mode==='property_reference').length;
const vehicles=stock.entries.filter(e=>e.canonical_id&&e.stock_mode==='vehicle_model_simulated').length;
assert.equal(baseline,30,'Thirty original design references are never sold as physical stock');
assert.equal(vehicles,20,'Twenty vehicle models require VIN-based real-stock implementation');
const ledger=readFileSync(new URL('../data/commerce/inventory-events.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);
assert.ok(ledger.length>=stock.item_count);
const opening=ledger.filter(e=>e.type==='stock_received' && String(e.batch_ref||'').startsWith('SIM-OPEN-'));
assert.equal(opening.length,180,'180 non-property initial stock receipts');
assert.ok(opening.every(e=>e.quantity===30),'Exactly 30 simulated opening units per non-property SKU');
assert.equal(new Set(opening.map(e=>e.sku)).size,180);
assert.ok(ledger.every(e=>e.environment==='simulation'));
assert.equal(new Set(ledger.map(e=>e.event_id)).size,ledger.length);
console.log(`PASS: C3 ${stock.item_count} SKUs, ${ledger.length} ledger events, simulation-only stock; 30 property references, 20 vehicle models; 30 simulated units each`);
