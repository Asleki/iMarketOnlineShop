import {getMarket,preferences,savePreferences} from './market-api.js';
import {validPreferences} from './market-model.js';
import {el} from './market-ui.js';

export async function chooseCategories({required=false}={}){
  const market=await getMarket(),selected=[...preferences()].filter(c=>market.categories.includes(c));
  const dialog=el('dialog','category-dialog');dialog.setAttribute('aria-labelledby','category-dialog-title');
  const form=el('form'),title=el('h2','', 'Make onStore yours');title.id='category-dialog-title';
  const info=el('p','', 'Choose at least five categories you love. Your first five choices lead your homepage.');
  const options=el('div','category-options'),count=el('p','market-status');count.setAttribute('role','status');
  const error=el('p','market-error');error.setAttribute('role','alert');
  const submit=el('button','button button-primary','Explore onStore');submit.type='submit';
  const buttons=[];
  function update(){
    submit.disabled=!validPreferences(selected,market.categories);
    count.textContent=selected.length+' selected · '+Math.max(0,5-selected.length)+' more needed';
    for(const {button,category} of buttons){const index=selected.indexOf(category);button.setAttribute('aria-pressed',String(index>=0));button.textContent=(index>=0?(index+1)+'. ':'')+category;}
  }
  for(const category of market.categories){
    const button=el('button','category-choice',category);button.type='button';
    button.addEventListener('click',()=>{const index=selected.indexOf(category);if(index<0)selected.push(category);else selected.splice(index,1);update();});
    buttons.push({button,category});options.append(button);
  }
  form.append(title,info,options,count,error,submit);
  if(!required){const cancel=el('button','button button-secondary','Cancel');cancel.type='button';cancel.addEventListener('click',()=>dialog.close());form.append(cancel);}
  dialog.append(form);document.body.append(dialog);
  if(required)dialog.addEventListener('cancel',event=>event.preventDefault());
  update();dialog.showModal();
  return new Promise(resolve=>{
    dialog.addEventListener('close',()=>{dialog.remove();resolve();},{once:true});
    form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await savePreferences(selected);dialog.close();}catch(e){error.textContent=e.message;update();}});
  });
}
