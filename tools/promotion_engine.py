#!/usr/bin/env python3
"""C4 simulated promotions: event-ledger source, static public projection.

Local CLI is NOT authenticated admin access. Production admin must enforce real
roles, time, optimistic concurrency and approval at an authenticated server.
"""
from __future__ import annotations
import argparse, fcntl, json, os, tempfile, uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'data/commerce'
EVENTS=BASE/'promotion-events.jsonl'
STATE=BASE/'promotion-state.json'
PUBLIC=BASE/'public-promotions.json'
LOCK=BASE/'.promotions.lock'
TYPES={'regular_discount','host_sale','flash_sale','black_friday','free_shipping','new_arrivals'}
DISCOUNTS={'regular_discount','host_sale','flash_sale','black_friday'}
SHOP_TYPES={'regular_discount','host_sale'}
MARKET_TYPES=TYPES-SHOP_TYPES
RULES={'schema':'onstore.promotion-rules.v2','environment':'simulation',
       'currency_base':'USD','discount_cap_bps':5000,'stacking':'best_eligible_only',
       'free_shipping_requires_c5':True,'opening_receipts_not_new_arrivals':True}

def now():return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
def dt(value):
    if not isinstance(value,str) or not value.endswith('Z'):raise ValueError('UTC date must end Z')
    try:return datetime.fromisoformat(value.replace('Z','+00:00'))
    except Exception as e:raise ValueError('Invalid UTC time') from e

def read(path):return json.loads(path.read_text('utf-8'))
def encode(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def atom(path,b):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.'+path.name)
    try:
        with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
@contextmanager
def locked():
    BASE.mkdir(parents=True,exist_ok=True)
    with LOCK.open('ab') as f:
        fcntl.flock(f,fcntl.LOCK_EX)
        try:yield
        finally:fcntl.flock(f,fcntl.LOCK_UN)

def sources():
    reg=read(BASE/'sku-registry.json');pr=read(BASE/'base-prices.json');inv=read(BASE/'inventory-state.json');shops=read(ROOT/'data/shops.json')
    if (reg.get('schema'),pr.get('schema'),inv.get('schema'))!=('onstore.sku-registry.v1','onstore.base-prices.v1','onstore.inventory-state.v1'):
        raise ValueError('C1/C2/C3 required')
    def unique(rows):
        idx={r['sku']:r for r in rows}
        if len(idx)!=len(rows):raise ValueError('Duplicate SKU in source')
        return idx
    sr=unique(reg['items']);sp=unique(pr['entries']);si=unique(inv['entries'])
    if not set(sp)<=set(sr) or not set(sr)<=set(si):raise ValueError('SKU sources inconsistent')
    return {s['slug'] for s in shops},sr,sp,si

def eligible(sku,shop,skus,prices,inventory):
    row=skus.get(sku);pr=prices.get(sku);inv=inventory.get(sku)
    return bool(row and pr and inv and row['shop_slug']==shop and row.get('status')=='registered'
            and row.get('canonical_id') and pr.get('usd_cents',0)>0
            and pr.get('price_mode')!='design_scenario'
            and inv.get('stock_mode') in ('bulk_simulated','vehicle_model_simulated'))

def check(c,shops,skus,prices,inventory):
    if c.get('environment')!='simulation' or c.get('status') not in {'draft','active','paused','cancelled'}:raise ValueError('Simulation-only status required')
    if c.get('type') not in TYPES:raise ValueError('Unknown campaign type')
    scope=c.get('owner_scope');shop=c.get('shop_slug')
    if scope=='shop':
        if shop not in shops or c['type'] not in SHOP_TYPES:raise ValueError('Invalid shop scope/type')
    elif scope=='marketplace':
        if shop is not None or c['type'] not in MARKET_TYPES:raise ValueError('Invalid marketplace scope/type')
    else:raise ValueError('Invalid owner scope')
    if not isinstance(c.get('name'),str) or not 1<=len(c['name'].strip())<=90:raise ValueError('Invalid name')
    bps=c.get('discount_bps')
    if c['type'] in DISCOUNTS:
        if type(bps)!=int or not 1<=bps<=RULES['discount_cap_bps']:raise ValueError('Discount must be 0.01 to 50%')
    elif bps is not None:raise ValueError('Non-discount cannot define percent')
    if c['type']=='free_shipping':
        if type(c.get('minimum_cart_usd_cents'))!=int or c['minimum_cart_usd_cents']<0:raise ValueError('Invalid shipping threshold')
        if c['status']=='active':raise ValueError('Free shipping requires C5 before activation')
    elif c.get('minimum_cart_usd_cents') is not None:raise ValueError('Invalid shipping field')
    if c['type']=='new_arrivals':
        if type(c.get('arrival_window_days'))!=int or not 1<=c['arrival_window_days']<=90:raise ValueError('Invalid arrival window')
        if c['status']=='active':raise ValueError('New arrivals require verified non-seed arrival provenance')
    elif c.get('arrival_window_days') is not None:raise ValueError('Invalid arrival field')
    targets=c.get('target_skus')
    if not isinstance(targets,list) or len(targets)!=len(set(targets)) or any(not isinstance(x,str) for x in targets):raise ValueError('Invalid unique targets')
    for sku in targets:
        if sku not in skus or sku not in prices or sku not in inventory:raise ValueError('Unknown C1/C2/C3 SKU: '+sku)
        if scope=='shop' and skus[sku]['shop_slug']!=shop:raise ValueError('Cross-shop target denied: '+sku)
        if not eligible(sku,skus[sku]['shop_slug'],skus,prices,inventory):raise ValueError('SKU not eligible for demo offer: '+sku)
    if c['status']=='active' and (c['type'] not in DISCOUNTS or not targets):raise ValueError('Active demo discounts require eligible target SKUs')
    start,end=c.get('start_utc'),c.get('end_utc')
    if (start is None)!=(end is None):raise ValueError('Both schedule endpoints required')
    if start is not None:
        s,e=dt(start),dt(end)
        if e<=s:raise ValueError('End must be later than start')
    if c['type']=='flash_sale' and c['status']=='active' and (start is None or end is None):raise ValueError('Flash Sale requires timed end')

def new_event(kind,cid,actor,**extra):
    return {'schema':'onstore.promotion-event.v2','event_id':str(uuid.uuid4()),'type':kind,
            'environment':'simulation','campaign_id':cid,'actor':actor,'at':now(),**extra}

def replay(events,shops,skus,prices,inventory):
    campaigns={};seen=set()
    for n,ev in enumerate(events,1):
        if ev.get('schema')!='onstore.promotion-event.v2' or ev.get('environment')!='simulation' or not ev.get('actor'):raise ValueError('Invalid audit event '+str(n))
        eid=ev.get('event_id');cid=ev.get('campaign_id')
        if not eid or eid in seen or not isinstance(cid,str) or not cid.startswith('C4-'):raise ValueError('Duplicate or invalid event ID')
        dt(ev.get('at'));seen.add(eid)
        if ev['type']=='created':
            if cid in campaigns:raise ValueError('Duplicate campaign')
            c=dict(ev['campaign']);c.update(campaign_id=cid,revision=1,created_utc=ev['at'],updated_utc=ev['at'])
            check(c,shops,skus,prices,inventory);campaigns[cid]=c
        elif ev['type']=='updated':
            old=campaigns.get(cid)
            if old is None:raise ValueError('Update for missing campaign')
            if ev.get('expected_revision')!=old['revision']:raise ValueError('Stale revision')
            if ev.get('owner_scope')!=old['owner_scope'] or ev.get('shop_slug')!=old['shop_slug']:raise ValueError('Cross-shop update denied')
            allowed={'name','status','discount_bps','target_skus','start_utc','end_utc','minimum_cart_usd_cents','arrival_window_days'}
            changes=ev.get('changes')
            if not isinstance(changes,dict) or not changes or set(changes)-allowed:raise ValueError('Invalid edits')
            c={**old,**changes,'revision':old['revision']+1,'updated_utc':ev['at']}
            if old['status']=='cancelled' and c['status']!='cancelled':raise ValueError('Cancelled campaigns cannot reactivate')
            check(c,shops,skus,prices,inventory);campaigns[cid]=c
        else:raise ValueError('Unrecognized audit event')
    rows=sorted(campaigns.values(),key=lambda c:c['campaign_id'])
    return {'schema':'onstore.promotion-state.v2','environment':'simulation','campaign_count':len(rows),
            'event_count':len(events),'rules':RULES,'campaigns':rows}

def public_view(state,skus,prices,inventory):
    out=[]
    for c in state['campaigns']:
        if c['status']!='active' or c['type'] not in DISCOUNTS:continue
        targets=[]
        for sku in c['target_skus']:
            if not eligible(sku,skus[sku]['shop_slug'],skus,prices,inventory) or inventory[sku].get('available',0)<=0:continue
            targets.append({'shop_slug':skus[sku]['shop_slug'],'canonical_id':skus[sku]['canonical_id']})
        if not targets:continue
        out.append({'campaign_id':c['campaign_id'],'type':c['type'],'name':c['name'],
                    'discount_bps':c['discount_bps'],'start_utc':c['start_utc'],
                    'end_utc':c['end_utc'],'target_products':targets})
    return {'schema':'onstore.public-promotions.v2','environment':'simulation','stacking':'best_eligible_only',
            'campaign_count':len(out),'campaigns':out}

def events_read():
    if not EVENTS.is_file():raise ValueError('Missing C4 ledger')
    ev=[]
    for n,line in enumerate(EVENTS.read_text('utf-8').splitlines(),1):
        if line.strip():
            try:ev.append(json.loads(line))
            except Exception as e:raise ValueError('Invalid JSONL '+str(n)) from e
    return ev

def persist(events,src):
    st=replay(events,*src)
    view=public_view(st,src[1],src[2],src[3])
    atom(EVENTS,(''.join(json.dumps(x,sort_keys=True,separators=(',',':'))+'\n' for x in events)).encode())
    atom(STATE,encode(st));atom(PUBLIC,encode(view))
    return st

def defaults(src):
    shops,skus,prices,inv=src
    byshop={shop:sorted([sku for sku in skus if eligible(sku,shop,skus,prices,inv) and inv[sku].get('available',0)>0]) for shop in shops}
    seed=[];now_dt=datetime.now(timezone.utc).replace(microsecond=0)
    for shop in sorted(shops):
        tag=shop.upper().replace('-','')[:8]
        for typ,bps in [('regular_discount',1000),('host_sale',1200)]:
            picks=byshop[shop][:4] if typ=='regular_discount' else byshop[shop][4:7]
            active=(typ=='regular_discount' and bool(picks)) or (typ=='host_sale' and shop=='nexagreen' and bool(picks))
            c=dict(environment='simulation',name='Shop Offers' if typ=='regular_discount' else 'Host Sale',
                   type=typ,owner_scope='shop',shop_slug=shop,status='active' if active else 'draft',
                   discount_bps=bps,target_skus=picks if active else [],start_utc=None,end_utc=None,
                   minimum_cart_usd_cents=None,arrival_window_days=None)
            seed.append(new_event('created',f'C4-{tag}-{typ.upper().replace("_","-")}-001','c4-demo-seed',campaign=c))
    eligible_byshop={x:y for x,y in byshop.items() if y}
    picks=[v[7] if len(v)>7 else v[-1] for v in eligible_byshop.values()]
    configs=[('flash_sale','Flash Sale',1500,None,None,'active',picks,
              now_dt.isoformat().replace('+00:00','Z'),(now_dt+timedelta(hours=24)).isoformat().replace('+00:00','Z')),
             ('black_friday','Black Friday',2000,None,None,'draft',[],None,None),
             ('free_shipping','Free Shipping',None,7500,None,'draft',[],None,None),
             ('new_arrivals','New Arrivals',None,None,14,'draft',[],None,None)]
    for typ,name,bps,minimum,days,status,picks,start,end in configs:
        seed.append(new_event('created','C4-MKT-'+typ.upper().replace('_','-')+'-001','c4-demo-seed',campaign={
            'environment':'simulation','name':name,'type':typ,'owner_scope':'marketplace',
            'shop_slug':None,'status':status,'discount_bps':bps,'target_skus':picks,
            'minimum_cart_usd_cents':minimum,'arrival_window_days':days,'start_utc':start,'end_utc':end}))
    return seed

def initialize():
    with locked():
        if any(p.exists() for p in (EVENTS,STATE,PUBLIC)):raise ValueError('Existing C4 state; refuse overwrite')
        src=sources();st=persist(defaults(src),src)
        return st

def verify():
    src=sources();ev=events_read();st=replay(ev,*src)
    if read(STATE)!=st or read(PUBLIC)!=public_view(st,*src[1:]):raise ValueError('Promotion derived cache mismatch')
    if any(c['type']=='free_shipping' and c['status']=='active' for c in st['campaigns']):raise ValueError('Unverified shipping offer')
    if any(c['type']=='new_arrivals' and c['status']=='active' for c in st['campaigns']):raise ValueError('Opening stock incorrectly advertised new')
    print(f"PASS: C4 {st['campaign_count']} campaigns, {sum(x['status']=='active' for x in st['campaigns'])} active demos, {st['event_count']} audited events")
    return st

def percent(raw):
    try:v=Decimal(str(raw))*100
    except (InvalidOperation,ValueError):raise ValueError('Invalid percent')
    if not v.is_finite() or v!=v.to_integral_value() or not 1<=v<=5000:raise ValueError('Discount must be 0.01 to 50.00%')
    return int(v)

def cents(raw):
    try:v=Decimal(str(raw))*100
    except (InvalidOperation,ValueError):raise ValueError('Invalid USD amount')
    if not v.is_finite() or v!=v.to_integral_value() or not 0<=v<=10**12:raise ValueError('Invalid USD amount')
    return int(v)

def main():
    p=argparse.ArgumentParser(description='C4 SIMULATION ONLY — CLI claims are NOT authenticated admin rights')
    sub=p.add_subparsers(dest='cmd',required=True)
    for name in ('seed','verify','summary','list','refresh'):sub.add_parser(name)
    e=sub.add_parser('edit');e.add_argument('--campaign-id',required=True);e.add_argument('--shop');e.add_argument('--marketplace',action='store_true');e.add_argument('--actor',required=True)
    e.add_argument('--percent');e.add_argument('--status',choices=['draft','active','paused','cancelled']);e.add_argument('--sku',action='append',dest='skus')
    e.add_argument('--start-utc');e.add_argument('--end-utc');e.add_argument('--name');e.add_argument('--dry-run',action='store_true')
    a=p.parse_args()
    if a.cmd=='seed':
        st=initialize();print('SEEDED:',st['campaign_count'],'simulation campaign templates');return
    if a.cmd=='verify':verify();return
    if a.cmd in ('summary','list'):
        st=verify()
        for c in st['campaigns']:
            if a.cmd=='list':print(c['campaign_id'],c['status'],c['shop_slug'] or 'MARKET',c['name'],str(c['discount_bps'])+' bps')
        if a.cmd=='summary':
            from collections import Counter
            print('Campaign statuses:',dict(Counter(x['status'] for x in st['campaigns'])))
            print('Demo offers only. Local CLI is NOT authenticated Shop/Admin access.')
        return
    if a.cmd=='refresh':
        with locked():
            src=sources();st=replay(events_read(),*src)
            atom(STATE,encode(st));atom(PUBLIC,encode(public_view(st,*src[1:])))
            print('REFRESHED: C4 derived public promotion projection')
        return
    if bool(a.shop)==bool(a.marketplace):raise ValueError('Exactly one scope required, NOT authentication')
    change={}
    for cli,key,fn in [('percent','discount_bps',percent),('status','status',str),('skus','target_skus',list),('start_utc','start_utc',str),('end_utc','end_utc',str),('name','name',str)]:
        val=getattr(a,cli)
        if val is not None:change[key]=fn(val)
    if not change:raise ValueError('No fields specified')
    with locked():
        src=sources();ev=events_read();st=replay(ev,*src)
        c=next((v for v in st['campaigns'] if v['campaign_id']==a.campaign_id),None)
        if not c:raise ValueError('Unknown campaign')
        scope='marketplace' if a.marketplace else 'shop'
        if c['owner_scope']!=scope or c['shop_slug']!=a.shop:raise ValueError('Cross-shop or marketplace editing refused')
        ev2=new_event('updated',a.campaign_id,a.actor,owner_scope=scope,shop_slug=a.shop,expected_revision=c['revision'],changes=change)
        st2=replay(ev+[ev2],*src)
        if a.dry_run:print('DRY RUN valid; no files changed')
        else:persist(ev+[ev2],src);print('UPDATED:',a.campaign_id,'revision',c['revision']+1,'SIMULATION only')

if __name__=='__main__':
    try:main()
    except (ValueError,OSError) as ex:print('ERROR:',ex);raise SystemExit(1)
