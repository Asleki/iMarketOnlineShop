import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {createApplication} from '../server.mjs';

test('persistent marketplace service protects customer data and shop-owned writes', async t => {
  const folder=mkdtempSync(join(tmpdir(),'onstore-api-'));
  let now=Date.parse('2026-10-29T12:00:00Z');
  const app=await createApplication({dbPath:join(folder,'test.sqlite'),clock:()=>now});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${app.server.address().port}`;
  async function call(path,{method='GET',body,cookie,origin}={}) {
    const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;if(origin)headers.Origin=origin;
    const res=await fetch(base+'/api/marketplace'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const data=await res.json();return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0],headers:res.headers};
  }
  try {
    const market=(await call('/catalogue')).data;
    assert.equal(market.products.length,210);assert.equal(market.shops.length,7);
    const product=market.products.find(p=>p.stock_count>0&&p.shop_slug==='click-n-get');
    const property=market.products.find(p=>p.record_type==='PROPERTY');
    const categories=market.categories.slice(0,5);
    let alice,bob;
    await t.test('registration hashes passwords, starts at level zero and ignores privilege injection',async()=>{
      alice=await call('/auth/register',{method:'POST',body:{username:'AliceTest',email:'alice@example.test',password:'very-long-password',role:'shop_admin'}});
      assert.equal(alice.status,201);assert.ok(alice.headers.get('set-cookie').includes('HttpOnly'));
      assert.equal(alice.data.user.role,'customer');assert.equal(alice.data.user.membership.level,0);
      assert.ok(!JSON.stringify(alice.data).includes('password'));
      const row=app.db.prepare('SELECT password_hash FROM users WHERE username=?').get('AliceTest');
      assert.notEqual(row.password_hash,'very-long-password');
      assert.equal((await call('/auth/register',{method:'POST',body:{username:'alicetest',email:'other@example.test',password:'very-long-password'}})).status,409);
      bob=await call('/auth/register',{method:'POST',body:{username:'BobTest',email:'bob@example.test',password:'very-long-password'}});
      assert.equal(bob.status,201);
    });
    await t.test('username and email login work; wrong passwords and cross-origin mutations fail',async()=>{
      assert.equal((await call('/auth/login',{method:'POST',body:{identifier:'ALICETEST',password:'wrong-password'}})).status,401);
      assert.equal((await call('/auth/login',{method:'POST',body:{identifier:'alice@example.test',password:'very-long-password'}})).status,200);
      assert.equal((await call('/auth/login',{method:'POST',body:{identifier:'AliceTest',password:'very-long-password'}})).status,200);
      assert.equal((await call('/profile',{method:'PUT',cookie:alice.cookie,origin:'https://evil.example',body:{address:{city:'Wrong'}}})).status,403);
      assert.equal((await call('/profile',{method:'PUT',body:{address:{city:'Wrong'}}})).status,401);
    });
    await t.test('preferences require five unique known departments and profiles stay isolated',async()=>{
      assert.equal((await call('/preferences',{method:'PUT',cookie:alice.cookie,body:{categories:categories.slice(0,4)}})).status,400);
      assert.equal((await call('/preferences',{method:'PUT',cookie:alice.cookie,body:{categories:Array(5).fill(categories[0])}})).status,400);
      assert.equal((await call('/preferences',{method:'PUT',cookie:alice.cookie,body:{categories:[...categories,'unknown']}})).status,400);
      assert.equal((await call('/preferences',{method:'PUT',cookie:alice.cookie,body:{categories}})).status,200);
      assert.deepEqual((await call('/auth/me',{cookie:alice.cookie})).data.user.categories,categories);
      await call('/profile',{method:'PUT',cookie:alice.cookie,body:{address:{line1:'Private home',city:'Harare',country:'ZW'},membership:{points:99999},user_id:bob.data.user.id}});
      assert.equal((await call('/auth/me',{cookie:bob.cookie})).data.user.address.line1,undefined);
      assert.equal((await call('/auth/me',{cookie:alice.cookie})).data.user.membership.points,0);
    });
    await t.test('cart validates stock and quantities and cannot access another customer cart',async()=>{
      for(const quantity of [-1,1.5,100001])assert.equal((await call('/cart/items/'+product.id,{method:'PUT',cookie:alice.cookie,body:{quantity}})).status,400);
      assert.equal((await call('/cart/items/'+product.id,{method:'PUT',cookie:alice.cookie,body:{quantity:product.stock_count+1}})).status,409);
      assert.equal((await call('/cart/items/'+property.id,{method:'PUT',cookie:alice.cookie,body:{quantity:1}})).status,409);
      assert.equal((await call('/cart/items/'+product.id,{method:'PUT',cookie:alice.cookie,body:{quantity:2}})).status,200);
      assert.equal((await call('/cart',{cookie:alice.cookie})).data.items[0].quantity,2);
      assert.equal((await call('/cart',{cookie:bob.cookie})).data.items.length,0);
      await call('/cart/merge',{method:'POST',cookie:alice.cookie,body:{items:[{id:product.id,quantity:1}]}});
      assert.equal((await call('/cart',{cookie:alice.cookie})).data.items[0].quantity,3);
    });
    await t.test('reviews start empty, are unique per account, count correctly and display at most three',async()=>{
      assert.equal((await call('/products/'+product.id+'/reviews')).data.count,0);
      assert.equal((await call('/products/'+product.id+'/reviews',{method:'POST',body:{rating:5,body:'Nice'}})).status,401);
      assert.equal((await call('/products/'+product.id+'/reviews',{method:'POST',cookie:alice.cookie,body:{rating:6,body:'Nice'}})).status,400);
      assert.equal((await call('/products/'+product.id+'/reviews',{method:'POST',cookie:alice.cookie,body:{rating:5,body:'Useful product'}})).status,201);
      await call('/products/'+product.id+'/reviews',{method:'POST',cookie:alice.cookie,body:{rating:4,body:'Updated review'}});
      assert.equal((await call('/products/'+product.id+'/reviews')).data.count,1);
      for(let i=0;i<4;i++){
        const u=await call('/auth/register',{method:'POST',body:{username:'Reviewer'+i,email:`r${i}@example.test`,password:'very-long-password'}});
        await call('/products/'+product.id+'/reviews',{method:'POST',cookie:u.cookie,body:{rating:4,body:'Review number '+i}});
      }
      const reviews=(await call('/products/'+product.id+'/reviews')).data;
      assert.equal(reviews.count,5);assert.equal(reviews.reviews.length,3);
      assert.equal((await call('/auth/me',{cookie:alice.cookie})).data.user.membership.review_points,5);
    });
    await t.test('only scoped shop admins can set stock and absolute offer deadlines',async()=>{
      app.db.prepare("UPDATE users SET role='shop_admin',shop_slug=? WHERE id=?").run(product.shop_slug,alice.data.user.id);
      const body={name:'Weekend offer',kind:'flash-sale',product_ids:[product.id],discount_bps:1500,starts_at:new Date(now-1000).toISOString(),ends_at:new Date(now+3600000).toISOString()};
      assert.equal((await call('/admin/offers',{method:'POST',cookie:bob.cookie,body})).status,403);
      const other=market.products.find(p=>p.shop_slug!==product.shop_slug&&p.stock_count>0);
      assert.equal((await call('/admin/offers',{method:'POST',cookie:alice.cookie,body:{...body,product_ids:[other.id]}})).status,403);
      assert.equal((await call('/admin/offers',{method:'POST',cookie:alice.cookie,body:{...body,ends_at:new Date(now-2000).toISOString()}})).status,400);
      const offer=await call('/admin/offers',{method:'POST',cookie:alice.cookie,body});assert.equal(offer.status,201);
      assert.ok((await call('/catalogue')).data.offers.some(o=>o.id===offer.data.offer.id));
      now+=3601000;
      assert.ok(!(await call('/catalogue')).data.offers.some(o=>o.id===offer.data.offer.id));
      assert.equal((await call('/admin/products/'+other.id+'/stock',{method:'PUT',cookie:alice.cookie,body:{quantity:0}})).status,403);
      assert.equal((await call('/admin/products/'+product.id+'/stock',{method:'PUT',cookie:alice.cookie,body:{quantity:0}})).status,200);
      assert.equal((await call('/cart/items/'+product.id,{method:'PUT',cookie:alice.cookie,body:{quantity:1}})).status,409);
    });
    await t.test('overlapping slow heartbeat bodies cannot double-credit activity or exceed the daily cap',async()=>{
      dbSetup();
      function dbSetup(){app.db.prepare('UPDATE users SET browse_seconds=1790,browse_today=1790,browse_day=?,last_activity=? WHERE id=?').run(new Date(now).toISOString().slice(0,10),now-60000,alice.data.user.id);}
      const pending=[],requests=[];
      for(let i=0;i<8;i++)pending.push(new Promise((resolve,reject)=>{
        const req=httpRequest(base+'/api/marketplace/activity',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'2',Cookie:alice.cookie}},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(raw)}));});
        req.on('error',reject);req.flushHeaders();req.write('{');requests.push(req);
      }));
      await new Promise(r=>setTimeout(r,50));for(const req of requests)req.end('}');
      const responses=await Promise.all(pending);assert.ok(responses.every(r=>r.status===200));
      const row=app.db.prepare('SELECT browse_seconds,browse_today FROM users WHERE id=?').get(alice.data.user.id);
      assert.equal(row.browse_seconds,1800);assert.equal(row.browse_today,1800);
    });
    await t.test('private server files are never served; activity is capped and logout revokes sessions',async()=>{
      for(const path of ['/backend/database.mjs','/.git/config','/.env','/backend/data/test.sqlite'])assert.equal((await fetch(base+path)).status,404);
      await call('/activity',{method:'POST',cookie:bob.cookie,body:{seconds:999999,points:99999}});
      now+=60000;await call('/activity',{method:'POST',cookie:bob.cookie,body:{}});
      assert.ok((await call('/auth/me',{cookie:bob.cookie})).data.user.membership.browsing_points<=1);
      await call('/auth/logout',{method:'POST',cookie:bob.cookie,body:{}});
      assert.equal((await call('/auth/me',{cookie:bob.cookie})).data.user,null);
    });
    await t.test('publication timestamps and data survive reopening SQLite',async()=>{
      const before=app.db.prepare('SELECT published_at FROM products WHERE id=?').get(product.id).published_at;
      assert.equal(typeof before,'string');
      await app.close();
      const reopened=await createApplication({dbPath:join(folder,'test.sqlite'),clock:()=>now});
      assert.equal(reopened.db.prepare('SELECT published_at FROM products WHERE id=?').get(product.id).published_at,before);
      assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE product_id=?').get(product.id).n,5);
      await reopened.close();
    });
  } finally {await app.close();rmSync(folder,{recursive:true,force:true});}
});
