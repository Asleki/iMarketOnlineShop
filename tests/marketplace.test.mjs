import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCollection,remainingTime,validPreferences} from '../src/market-model.js';
import {stored,store,preferences} from '../src/market-api.js';
import {subtotal,unitPrice} from '../src/market-ui.js';
test('offer collections honor deadlines, product identity and publication dates',()=>{
  const now=Date.parse('2026-10-29T12:00:00Z');
  const products=[{id:'a',published_at:'2026-10-28T00:00:00Z'},{id:'b',published_at:'2026-08-01T00:00:00Z'}];
  const offers=[{kind:'flash-sale',product_ids:['a'],ends_at:'2026-10-29T13:00:00Z'},{kind:'flash-sale',product_ids:['b'],ends_at:'2026-10-29T11:00:00Z'}];
  assert.deepEqual(selectCollection(products,offers,'flash-sales',now).map(p=>p.id),['a']);
  assert.deepEqual(selectCollection(products,offers,'new-arrivals',now).map(p=>p.id),['a']);
  assert.equal(remainingTime('2026-10-29T11:00:00Z',now),'Ended');
  assert.equal(remainingTime('2026-10-29T13:02:03Z',now),'01:02:03');
});
test('five-category requirement rejects duplicates and unknown values without changing rank',()=>{
  const all=['a','b','c','d','e','f'];
  assert.equal(validPreferences(['b','a','c','d'],all),false);
  assert.equal(validPreferences(['b','a','c','d','d'],all),false);
  assert.equal(validPreferences(['b','a','c','d','x'],all),false);
  const choices=['b','a','c','e','d'];assert.equal(validPreferences(choices,all),true);
  assert.deepEqual(choices,['b','a','c','e','d']);
});

test('blocked browser storage keeps this tab usable and invalid preferences recover',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}}});
  try{
    store('onstore.categories.v1',{outdated:true});assert.deepEqual(preferences(),[]);
    store('onstore.categories.v1',['a','b','c','d','e']);assert.deepEqual(preferences(),['a','b','c','d','e']);
    assert.deepEqual(stored('onstore.categories.v1',[]),['a','b','c','d','e']);
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('cart subtotal and displayed prices agree as an offer expires',()=>{
  const product={id:'priced',price_cents:10000};
  const market={offers:[{kind:'flash-sale',product_ids:['priced'],discount_bps:1500,ends_at:new Date(Date.now()+60000).toISOString()}]};
  const items=[{product,quantity:2}];
  assert.equal(unitPrice(product,market),8500);assert.equal(subtotal(items,market),17000);
  market.offers[0].ends_at=new Date(Date.now()-1000).toISOString();
  assert.equal(unitPrice(product,market),10000);assert.equal(subtotal(items,market),20000);
});
