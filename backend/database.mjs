import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

export function openDatabase(path,root,now) {
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path);
  if(path!==':memory:')chmodSync(path,0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer', shop_slug TEXT,
      address TEXT NOT NULL DEFAULT '{}', categories TEXT NOT NULL DEFAULT '[]',
      browse_seconds INTEGER NOT NULL DEFAULT 0, browse_today INTEGER NOT NULL DEFAULT 0,
      browse_day TEXT NOT NULL, last_activity INTEGER NOT NULL, spent_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,shop_slug TEXT NOT NULL,stock_count INTEGER,published_at TEXT NOT NULL,views INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS offers(id TEXT PRIMARY KEY,shop_slug TEXT,name TEXT NOT NULL,kind TEXT NOT NULL,product_ids TEXT NOT NULL,discount_bps INTEGER NOT NULL,starts_at TEXT,ends_at TEXT,enabled INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),rating INTEGER NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,product_id));
    CREATE TABLE IF NOT EXISTS cart(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL,PRIMARY KEY(user_id,product_id));
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,user_id TEXT,shop_slug TEXT,email TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
  const source=read('api/v1/catalogue.json');
  const inventory=new Map(read('data/commerce/inventory-state.json').entries.map(x=>[x.canonical_id,x]));
  const insert=db.prepare('INSERT OR IGNORE INTO products(id,shop_slug,stock_count,published_at) VALUES(?,?,?,?)');
  for(const p of source.products){
    const row=inventory.get(p.id);
    const quantity=p.record_type==='PROPERTY'?null:Math.max(0,row?.available??0);
    // Import publication time is recorded once; restarting never makes old products new.
    insert.run(p.id,p.shop_slug,quantity,new Date(now).toISOString());
  }
  if(!db.prepare("SELECT 1 FROM metadata WHERE key='offers_seeded'").get()){
    const statement=db.prepare('INSERT OR IGNORE INTO offers(id,shop_slug,name,kind,product_ids,discount_bps,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?)');
    for(const c of read('data/commerce/public-promotions.json').campaigns){
      const scopes=[...new Set(c.target_products.map(p=>p.shop_slug))];
      statement.run(c.campaign_id,scopes.length===1?scopes[0]:null,c.name,c.type==='flash_sale'?'flash-sale':'hot-deal',JSON.stringify(c.target_products.map(p=>p.canonical_id)),c.discount_bps,c.start_utc,c.end_utc);
    }
    db.prepare("INSERT INTO metadata(key,value) VALUES('offers_seeded','1')").run();
  }
  return db;
}

export function transaction(db,work){
  db.exec('BEGIN IMMEDIATE');
  try{const result=work();db.exec('COMMIT');return result;}
  catch(error){db.exec('ROLLBACK');throw error;}
}
