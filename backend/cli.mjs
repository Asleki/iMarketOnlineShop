import {createApplication} from './server.mjs';
import {register} from './auth.mjs';
const [command,username,email,shop]=process.argv.slice(2);
if(command!=='create-admin'||!username||!email||!shop||!process.env.ONSTORE_ADMIN_PASSWORD){
  console.error('Usage: ONSTORE_ADMIN_PASSWORD=<local-secret> node backend/cli.mjs create-admin <username> <email> <shop-slug>');process.exit(1);
}
const app=await createApplication();
try{
  const payload=app.db.prepare('SELECT 1 FROM products WHERE shop_slug=?').get(shop);
  if(!payload)throw Error('Unknown shop slug.');
  const user=await register(app.db,{username,email,password:process.env.ONSTORE_ADMIN_PASSWORD},Date.now());
  app.db.prepare("UPDATE users SET role='shop_admin',shop_slug=? WHERE id=?").run(shop,user.id);
  console.log('Shop administrator created for '+shop+'. No password was recorded in source control.');
}finally{await app.close();}
