import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,extname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase,transaction} from './database.mjs';
import {marketplace} from './marketplace.mjs';
import {fail,text,currentUser,requireUser,publicUser,throttle,register,checkPassword,setSession,hashToken} from './auth.mjs';

const DEFAULT_ROOT=fileURLToPath(new URL('../',import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
async function readBody(req){
  if(!req.headers['content-type']?.toLowerCase().startsWith('application/json'))fail(415,'Send JSON data.');
  let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>16384)fail(413,'Request is too large.');}
  try{const parsed=JSON.parse(data||'{}');if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();return parsed;}
  catch{fail(400,'Invalid JSON request.');}
}
export async function createApplication({root=DEFAULT_ROOT,dbPath=process.env.ONSTORE_DB_PATH||join(root,'backend/data/onstore.sqlite'),clock=Date.now,secureCookies=process.env.COOKIE_SECURE==='true'}={}){
  const db=openDatabase(dbPath,root,clock()),market=marketplace(db,root,clock);
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try{
      const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);
      if(path.startsWith('/api/marketplace/')){
        const p=path.slice('/api/marketplace'.length),method=req.method;
        if(['POST','PUT','PATCH','DELETE'].includes(method)){
          const origin=req.headers.origin;
          if(origin){let host;try{host=new URL(origin).host;}catch{fail(403,'Invalid request origin.');}if(host!==req.headers.host)fail(403,'Cross-origin writes are not allowed.');}
        }
        const body=['POST','PUT','PATCH'].includes(method)?await readBody(req):{};
        // Resolve identity and counters after asynchronous body parsing, not from a stale request-start snapshot.
        const now=clock(),user=currentUser(db,req,now);
        const ip=req.socket.remoteAddress??'local';
        if(p==='/health'&&method==='GET')return send(200,{ok:true});
        if(p==='/catalogue'&&method==='GET')return send(200,market.catalogue());
        if(p==='/auth/me'&&method==='GET')return send(200,{user:publicUser(db,user)});
        if(p==='/auth/register'&&method==='POST'){
          throttle(db,'register:'+ip,now,15);const account=await register(db,body,now);setSession(db,res,account,now,secureCookies);return send(201,{user:publicUser(db,account)});
        }
        if(p==='/auth/login'&&method==='POST'){
          throttle(db,'login:'+ip,now,40);
          const identifier=text(body.identifier,255),password=body.password;
          if(typeof password!=='string'||password.length>128)fail(401,'Email, username or password is incorrect.');
          const account=db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE').get(identifier,identifier);
          if(!account||!await checkPassword(password,account.password_hash))fail(401,'Email, username or password is incorrect.');
          setSession(db,res,account,now,secureCookies);return send(200,{user:publicUser(db,account)});
        }
        if(p==='/auth/logout'&&method==='POST'){
          const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('onstore_session='))?.slice(16);
          if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));
          res.setHeader('Set-Cookie',`onstore_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies?'; Secure':''}`);return send(200,{ok:true});
        }
        if(p==='/profile'&&method==='PUT'){
          requireUser(user);
          if(!body.address||typeof body.address!=='object'||Array.isArray(body.address))fail(400,'Provide your default address.');
          const address=Object.fromEntries(['full_name','line1','line2','city','region','postal_code','country','phone'].map(k=>[k,text(body.address[k],200)]));
          db.prepare('UPDATE users SET address=? WHERE id=?').run(JSON.stringify(address),user.id);
          return send(200,{user:publicUser(db,db.prepare('SELECT * FROM users WHERE id=?').get(user.id))});
        }
        if(p==='/preferences'&&method==='PUT'){
          requireUser(user);const choices=body.categories;
          if(!Array.isArray(choices)||choices.length<5||choices.length>market.categories.length||new Set(choices).size!==choices.length||!choices.every(c=>market.categories.includes(c)))fail(400,'Choose at least five different product categories.');
          db.prepare('UPDATE users SET categories=? WHERE id=?').run(JSON.stringify(choices),user.id);return send(200,{categories:choices});
        }
        if(p==='/activity'&&method==='POST'){
          requireUser(user);
          const updated=transaction(db,()=>{
            const live=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
            const day=new Date(now).toISOString().slice(0,10),elapsed=Math.floor((now-live.last_activity)/1000);
            const today=live.browse_day===day?live.browse_today:0;
            const credit=elapsed>=30&&elapsed<=90?Math.min(elapsed,60,Math.max(0,1800-today)):0;
            db.prepare('UPDATE users SET browse_seconds=browse_seconds+?,browse_today=?,browse_day=?,last_activity=? WHERE id=?').run(credit,today+credit,day,now,user.id);
            return publicUser(db,db.prepare('SELECT * FROM users WHERE id=?').get(user.id));
          });
          return send(200,{user:updated});
        }
        if(p==='/cart'&&method==='GET'){requireUser(user);return send(200,market.cart(user.id));}
        if(p==='/cart/merge'&&method==='POST'){requireUser(user);return send(200,market.mergeCart(user.id,body.items));}
        let match=p.match(/^\/cart\/items\/([^/]+)$/);
        if(match&&method==='PUT'){requireUser(user);return send(200,market.putCart(user.id,match[1],body.quantity));}
        match=p.match(/^\/products\/([^/]+)\/reviews$/);
        if(match){
          if(method==='GET')return send(200,market.reviews(match[1]));
          if(method==='POST'){
            requireUser(user);market.product(match[1]);const content=text(body.body,2001);
            if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5||!content||content.length>2000)fail(400,'Choose a rating from 1 to 5 and write a review of up to 2,000 characters.');
            const existing=db.prepare('SELECT id FROM reviews WHERE user_id=? AND product_id=?').get(user.id,match[1]);
            db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,created_at=excluded.created_at').run(randomUUID(),user.id,match[1],body.rating,content,new Date(now).toISOString());
            return send(existing?200:201,market.reviews(match[1]));
          }
        }
        match=p.match(/^\/products\/([^/]+)$/);
        if(match&&method==='GET'){
          const product=market.product(match[1]);db.prepare('UPDATE products SET views=views+1 WHERE id=?').run(product.id);
          return send(200,{product,reviews:market.reviews(product.id),related:market.catalogue().products.filter(p=>p.id!==product.id&&(p.department===product.department||p.shop_slug===product.shop_slug)).sort((a,b)=>Number(b.department===product.department)-Number(a.department===product.department)).slice(0,8)});
        }
        if(p.startsWith('/admin/')){
          requireUser(user);if(user.role!=='shop_admin'||!market.shops.some(s=>s.slug===user.shop_slug))fail(403,'Shop administrator access is required.');
          if(p==='/admin/offers'&&method==='GET')return send(200,{offers:db.prepare('SELECT * FROM offers WHERE shop_slug=?').all(user.shop_slug).map(o=>({...o,product_ids:JSON.parse(o.product_ids)}))});
          if(p==='/admin/offers'&&method==='POST')return send(201,{offer:market.saveOffer(user,body)});
          match=p.match(/^\/admin\/offers\/([^/]+)$/);
          if(match&&method==='PUT')return send(200,{offer:market.saveOffer(user,body,match[1])});
          match=p.match(/^\/admin\/products\/([^/]+)\/stock$/);
          if(match&&method==='PUT'){
            const product=market.scopedProduct(user,match[1]);
            if(product.stock_count===null)fail(400,'Property references do not have sellable stock.');
            if(!Number.isInteger(body.quantity)||body.quantity<0||body.quantity>100000)fail(400,'Stock must be a whole number between 0 and 100,000.');
            db.prepare('UPDATE products SET stock_count=? WHERE id=?').run(body.quantity,product.id);return send(200,{product:market.product(product.id)});
          }
          if(p==='/admin/messages'&&method==='GET')return send(200,{messages:db.prepare('SELECT id,email,body,created_at FROM messages WHERE shop_slug=? ORDER BY created_at DESC LIMIT 100').all(user.shop_slug)});
        }
        if(p==='/messages'&&method==='POST'){
          throttle(db,'message:'+ip,now,10);const email=text(body.email||user?.email,255),content=text(body.body,3001),shop=text(body.shop_slug,80)||null;
          if(!/^\S+@\S+\.\S+$/.test(email)||!content||content.length>3000||(shop&&!market.shops.some(s=>s.slug===shop)))fail(400,'Provide a valid email and a message up to 3,000 characters.');
          db.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)').run(randomUUID(),user?.id??null,shop,email,content,new Date(now).toISOString());return send(201,{ok:true});
        }
        fail(404,'This API endpoint does not exist.');
      }
      if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');
      const relative=path==='/'?'index.html':path.replace(/^\//,'');
      if(relative.split('/').some(s=>s.startsWith('.'))||!( /^(index|product|shops|shop|profile|cart|search|deals|contact|citations|admin)\.html$/.test(relative)||/^(src|assets|images|media|data)\//.test(relative)||relative.startsWith('api/v1/')||relative==='site.webmanifest'))fail(404,'Page not found.');
      const filename=resolve(root,relative);if(!filename.startsWith(resolve(root)+'/'))fail(404,'Page not found.');
      let info;try{info=await stat(filename);}catch{fail(404,'Page not found.');}if(!info.isFile())fail(404,'Page not found.');
      res.writeHead(200,{'Content-Type':MIME[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:await readFile(filename));
    }catch(error){
      if(res.headersSent){res.destroy();return;}
      send(error.status||500,{error:error.status?error.message:'The service could not complete this request.'});
      if(!error.status)console.error('onStore request failed:',error.message);
    }
  });
  let closed=false;
  return {server,db,async close(){if(closed)return;closed=true;await new Promise(r=>server.close(()=>r()));db.close();}};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const app=await createApplication();const port=Number(process.env.PORT||3000);
  app.server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`onStore server: http://${process.env.HOST||'127.0.0.1'}:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
