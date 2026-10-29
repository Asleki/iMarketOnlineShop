import {currentUser,signIn,signOut,request,loadSession,siteURL,preferences} from './market-api.js';
import {el,link,field} from './market-ui.js';
import {chooseCategories} from './preferences.js';
export async function renderProfile(host,market){
  host.replaceChildren();const user=currentUser();document.title='Your profile | onStore';
  host.append(el('h1','market-page-title',user?'Welcome '+user.username:'Your onStore account'));
  if(!user){
    const tabs=el('div','market-tabs'),form=el('form','market-form');
    let mode=new URLSearchParams(location.search).get('mode')==='register'?'register':'login';
    for(const [name,value] of [['Sign In','login'],['Register','register']]){const button=el('button','button button-secondary',name);button.type='button';button.addEventListener('click',()=>{mode=value;renderForm();});tabs.append(button);}
    function renderForm(){
      form.replaceChildren();const title=el('h2','',mode==='login'?'Sign in':'Create your account');form.append(title);
      if(mode==='register')form.append(field('Username','username',{required:true,autocomplete:'username',maxLength:30}),field('Email','email',{type:'email',required:true,autocomplete:'email',maxLength:255}));
      else form.append(field('Email or username','identifier',{required:true,autocomplete:'username',maxLength:255}));
      const password=field('Password','password',{type:'password',required:true,autocomplete:mode==='register'?'new-password':'current-password',maxLength:128});password.querySelector('input').minLength=mode==='register'?10:1;form.append(password);
      if(mode==='register')form.append(el('p','product-meta','Use at least 10 characters for your password.'));
      const submit=el('button','button button-primary',mode==='login'?'Sign In':'Create account');submit.type='submit';const status=el('p','market-status');status.setAttribute('role','alert');form.append(submit,status);
      form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{const body=Object.fromEntries(new FormData(form));await signIn(mode,body);const destination=new URLSearchParams(location.search).get('return');if(destination?.startsWith('product.html?id=')){location.href=siteURL('product.html',{id:new URLSearchParams(destination.split('?')[1]).get('id')});return;}await renderProfile(host,market);}catch(error){status.textContent=error.message;submit.disabled=false;}};
    }
    renderForm();host.append(tabs,form);return;
  }
  const member=el('section','market-profile-card');member.append(el('h2','','Your membership'));
  const level=el('div','market-member-level');if(user.membership.level>0){const shield=el('img','shop-verification-icon');shield.alt='';shield.width=40;shield.height=40;shield.src=siteURL('images/verification/'+user.membership.tier.toLowerCase()+'.webp');level.append(shield);}
  level.append(el('strong','',`Level ${user.membership.level} · ${user.membership.tier}`));member.append(level,el('p','',`${user.membership.points} points`));
  if(user.membership.next){const progress=el('progress');progress.value=user.membership.points;progress.max=user.membership.next.points;progress.setAttribute('aria-label','Progress toward '+user.membership.next.tier);member.append(progress,el('p','product-meta',`${user.membership.next.points-user.membership.points} points to ${user.membership.next.tier}`));}
  member.append(el('p','product-meta','Earn points from active browsing and reviews. Spending points are credited only after completed purchases.'));
  const identity=el('section','market-profile-card');identity.append(el('h2','','Account details'),el('p','',user.username),el('p','',user.email));
  const prefs=el('section','market-profile-card');prefs.append(el('h2','','Your categories'));const choices=el('p','',preferences().join(' · ')||'Choose your favourite categories.');const edit=el('button','button button-secondary','Edit categories');edit.type='button';edit.addEventListener('click',async()=>{await chooseCategories();choices.textContent=preferences().join(' · ');});prefs.append(choices,edit);
  const address=el('section','market-profile-card');address.append(el('h2','','Default delivery address'));const form=el('form','market-form market-address-form');
  for(const [label,name,autocomplete] of [['Full name','full_name','name'],['Address line 1','line1','address-line1'],['Address line 2','line2','address-line2'],['City','city','address-level2'],['Region','region','address-level1'],['Postal code','postal_code','postal-code'],['Country','country','country-name'],['Phone','phone','tel']])form.append(field(label,name,{value:user.address[name]||'',autocomplete,maxLength:200}));
  const save=el('button','button button-primary','Save address');save.type='submit';const status=el('p','market-status');status.setAttribute('role','status');form.append(save,status);address.append(form);
  form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{await request('/profile',{method:'PUT',body:{address:Object.fromEntries(new FormData(form))}});await loadSession({force:true});status.textContent='Your default address is saved.';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}});
  const grid=el('div','market-profile-grid');grid.append(member,identity,prefs,address);host.append(grid);
  if(user.role==='shop_admin')host.append(link('Manage shop','admin.html',{},'button button-secondary'));
  const logout=el('button','button button-secondary','Sign out');logout.type='button';logout.addEventListener('click',async()=>{try{await signOut();await renderProfile(host,market);}catch(error){status.textContent=error.message;}});host.append(logout);
}
