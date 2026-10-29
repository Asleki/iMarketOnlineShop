import {randomBytes,randomUUID,scrypt as callbackScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(callbackScrypt);
export const hashToken=token=>createHash('sha256').update(token).digest('hex');
export function fail(status,message){const error=new Error(message);error.status=status;throw error;}
export const text=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
export async function hashPassword(password){
  const salt=randomBytes(16).toString('hex');
  return salt+':'+(await scrypt(password,salt,64)).toString('hex');
}
export async function checkPassword(password,hash){
  const [salt,key]=hash.split(':');
  const candidate=await scrypt(password,salt,64);
  return key?.length===128&&timingSafeEqual(candidate,Buffer.from(key,'hex'));
}
export function currentUser(db,req,now){
  const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('onstore_session='));
  if(!cookie)return null;
  const token=cookie.slice('onstore_session='.length);
  if(!/^[a-f0-9]{64}$/.test(token))return null;
  return db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=? AND expires_at>?').get(hashToken(token),now)??null;
}
export function requireUser(user){if(!user)fail(401,'Please sign in to continue.');return user;}
export function publicUser(db,user){
  if(!user)return null;
  const count=db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id=?').get(user.id).n;
  const browsing_points=Math.floor(user.browse_seconds/60),review_points=count*5,spending_points=Math.floor(user.spent_cents/100);
  const points=browsing_points+review_points+spending_points;
  const levels=[['Starter',0],['Bronze',100],['Silver',500],['Gold',1500],['Diamond',5000]];
  const level=levels.findLastIndex(x=>points>=x[1]);
  return {id:user.id,username:user.username,email:user.email,role:user.role,shop_slug:user.shop_slug,address:JSON.parse(user.address),categories:JSON.parse(user.categories),membership:{level,tier:levels[level][0],points,browsing_points,review_points,spending_points,next:levels[level+1]?{tier:levels[level+1][0],points:levels[level+1][1]}:null}};
}
export function throttle(db,key,now,limit=20){
  const row=db.prepare('SELECT * FROM rate_limits WHERE key=?').get(key);
  if(row&&row.reset_at>now&&row.count>=limit)fail(429,'Too many requests. Please try again later.');
  if(!row||row.reset_at<=now)db.prepare('INSERT OR REPLACE INTO rate_limits(key,count,reset_at) VALUES(?,1,?)').run(key,now+15*60000);
  else db.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);
  db.prepare('DELETE FROM rate_limits WHERE reset_at<?').run(now-15*60000);
}
export async function register(db,body,now){
  const username=text(body.username,31),email=text(body.email,255).toLowerCase(),password=body.password;
  if(!/^[a-zA-Z0-9_]{3,30}$/.test(username)||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)fail(400,'Use a valid email, a 3–30 character username, and a password of 10–128 characters.');
  const hash=await hashPassword(password);
  const id=randomUUID();
  try{db.prepare('INSERT INTO users(id,username,email,password_hash,browse_day,last_activity,created_at) VALUES(?,?,?,?,?,?,?)').run(id,username,email,hash,new Date(now).toISOString().slice(0,10),now,new Date(now).toISOString());}
  catch(e){if(String(e.message).includes('UNIQUE'))fail(409,'That username or email is already registered.');throw e;}
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}
export function setSession(db,res,user,now,secure){
  const token=randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token),user.id,now+7*86400000);
  res.setHeader('Set-Cookie',`onstore_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure?'; Secure':''}`);
}
