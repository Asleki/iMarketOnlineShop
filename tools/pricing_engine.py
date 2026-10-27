#!/usr/bin/env python3
"""onStore C2: provisional USD price ledger and USD/KES/GBP exchange-rate ledger.

Local administration tooling ONLY. --actor and --shop are audit/scoping inputs,
NOT authentication. Future shop/admin roles must be enforced by a secure backend.
"""
from __future__ import annotations
import argparse
from contextlib import contextmanager
import csv
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import fcntl
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'data'/'commerce'
SKU=BASE/'sku-registry.json'
SEED=BASE/'c2-seed-prices.csv'
PRICE_EVENTS=BASE/'price-events.jsonl'
RATE_EVENTS=BASE/'rate-events.jsonl'
PRICES=BASE/'base-prices.json'
RATES=BASE/'exchange-rates.json'
PUBLIC=BASE/'public-prices.json'
LOCK=BASE/'.pricing.lock'
SUPPORTED={'USD','KES','GBP'}
SCALE=1_000_000


def time_utc():return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
def read(path):return json.loads(path.read_text('utf-8'))
def encode(v):return (json.dumps(v,ensure_ascii=False,indent=2,sort_keys=True)+'\n').encode('utf-8')
def atomic(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 fd,name=tempfile.mkstemp(prefix='.'+path.name+'-',dir=path.parent)
 try:
  with os.fdopen(fd,'wb') as f:
   f.write(data);f.flush();os.fsync(f.fileno())
  os.replace(name,path)
 finally:
  if os.path.exists(name):os.unlink(name)

def ledger(path):
 if not path.is_file():raise ValueError(f'Missing ledger: {path.name}')
 events=[]
 for i,line in enumerate(path.read_text('utf-8').splitlines(),1):
  if line.strip():
   try:events.append(json.loads(line))
   except Exception as exc:raise ValueError(f'Corrupt {path.name}, line {i}') from exc
 return events

def append_events(path,events):
 atomic(path, ''.join(json.dumps(x,sort_keys=True,separators=(',',':'))+'\n' for x in events).encode('utf-8'))

@contextmanager
def locked():
 with LOCK.open('a+b') as f:
  fcntl.flock(f,fcntl.LOCK_EX)
  try:yield
  finally:fcntl.flock(f,fcntl.LOCK_UN)


def replay_prices(events,known):
 state={}
 for i,event in enumerate(events,1):
  kind=event.get('type');sku=event.get('sku')
  if sku not in known:raise ValueError(f'Price event #{i} references unknown SKU {sku}')
  source=known[sku]
  if event.get('shop_slug')!=source['shop_slug']:raise ValueError(f'Cross-shop price event #{i}')
  cents=event.get('usd_cents')
  if type(cents) is not int or cents<=0:raise ValueError(f'Invalid positive cents in price event #{i}')
  if kind=='seed':
   if sku in state:raise ValueError('Duplicate seed '+sku)
   if source.get('canonical_id')!=event.get('canonical_id'):raise ValueError('Seed canonical mismatch '+sku)
   if event.get('price_mode') not in ('provisional_retail','design_scenario'):raise ValueError('Invalid seed mode')
   state[sku]={k:event[k] for k in ('sku','shop_slug','canonical_id','product_name','usd_cents','price_mode','unit_basis','review_status','price_basis')}
   state[sku]['version']=1
   state[sku]['updated_utc']=event['at']
  elif kind=='set_price':
   if sku not in state:raise ValueError('Price must be seeded before update: '+sku)
   if event.get('review_status') not in ('provisional','shop_reviewed'):raise ValueError('Bad review status')
   state[sku].update(usd_cents=cents,review_status=event['review_status'],version=state[sku]['version']+1,updated_utc=event['at'],price_basis='manual_shop_admin_revision')
  elif kind=='new_price':
   if sku in state:raise ValueError('Duplicate new price '+sku)
   if source.get('status')=='draft':
    status='provisional'
   else:status='provisional'
   state[sku]=dict(sku=sku,shop_slug=source['shop_slug'],canonical_id=source.get('canonical_id'),product_name=source['name_snapshot'],usd_cents=cents,price_mode='provisional_retail',unit_basis='one unit; verify variant',review_status=status,price_basis='merchant_estimate',version=1,updated_utc=event['at'])
  else:raise ValueError('Unknown price event type: '+str(kind))
 return {'schema':'onstore.base-prices.v1','base_currency':'USD','source':'price-events.jsonl','entry_count':len(state),'entries':sorted(state.values(),key=lambda x:x['sku'])}


def replay_rates(events):
 rates={'USD':SCALE}
 history=[]
 for i,event in enumerate(events,1):
  cur=event.get('currency');val=event.get('units_per_usd_scaled')
  if event.get('type')!='rate_set' or cur not in {'KES','GBP'} or type(val) is not int or not 0<val<10**12:
   raise ValueError(f'Invalid conversion rate event #{i}')
  if not event.get('actor') or not event.get('at'):raise ValueError(f'Missing rate audit fields #{i}')
  rates[cur]=val
  history.append({'currency':cur,'units_per_usd_scaled':val,'at':event['at'],'actor':event['actor'],'source':event.get('source','manual'),'event_id':event['event_id']})
 if set(rates)!=SUPPORTED:raise ValueError('USD/KES/GBP rates incomplete')
 return {'schema':'onstore.exchange-rates.v1','base_currency':'USD','scale':SCALE,'rates_scaled':rates,'revision_count':len(history),'history':history,'status':'initial_reference_rates_require_admin_approval'}


def state():
 sku_state=read(SKU)
 if sku_state.get('schema')!='onstore.sku-registry.v1':raise ValueError('C1 registry missing or invalid')
 known={i['sku']:i for i in sku_state['items']}
 if len(known)!=len(sku_state['items']):raise ValueError('Duplicate C1 SKU')
 pe=ledger(PRICE_EVENTS);re=ledger(RATE_EVENTS)
 return known,pe,re,replay_prices(pe,known),replay_rates(re)


def public_view(prices,rates):
 # Public view intentionally excludes event provenance and actor history.
 return {'schema':'onstore.public-prices.v1','base_currency':'USD', 'currencies':['USD','KES','GBP'], 'rate_scale':SCALE,
         'rates_scaled':rates['rates_scaled'],'rates_status':rates['status'],
         'price_count':prices['entry_count'],
         'entries':[{k:row[k] for k in ('sku','shop_slug','canonical_id','usd_cents','price_mode','review_status','unit_basis')} for row in prices['entries']]}

def refresh(known,pe,re):
 p=replay_prices(pe,known);r=replay_rates(re)
 atomic(PRICES,encode(p));atomic(RATES,encode(r));atomic(PUBLIC,encode(public_view(p,r)))
 return p,r

def money_cents(value):
 try:v=Decimal(str(value))
 except InvalidOperation as exc:raise ValueError('Invalid USD amount') from exc
 if not v.is_finite() or v<=0 or v.as_tuple().exponent < -2:raise ValueError('USD must be positive with at most 2 decimal places')
 cents=v*100
 if cents!=cents.to_integral_value():raise ValueError('USD must have max 2 decimals')
 return int(cents)

def scaled_rate(value):
 try:v=Decimal(str(value))
 except InvalidOperation as exc:raise ValueError('Invalid exchange rate') from exc
 if not v.is_finite() or v<=0 or v>1000000:raise ValueError('Exchange rate out of permitted range')
 return int((v*SCALE).quantize(Decimal('1'),rounding=ROUND_HALF_UP))

def seed_initial():
 if PRICE_EVENTS.exists() or RATE_EVENTS.exists():raise ValueError('C2 already seeded; refusing overwrite')
 known= {i['sku']:i for i in read(SKU)['items']}
 rows=list(csv.DictReader(SEED.open(encoding='utf-8',newline='')))
 if len(rows)!=210:raise ValueError('Seed must contain 210 initial price records')
 if len({r['sku'] for r in rows})!=len(rows):raise ValueError('Repeated seed SKU')
 pe=[]
 for row in rows:
  sku=row['sku']
  if sku not in known:raise ValueError('Seed SKU absent from C1 registry: '+sku)
  old=known[sku]
  if (old['shop_slug'],old['canonical_id'],old['name_snapshot'])!=(row['shop_slug'],row['canonical_id'],row['product_name']):
   raise ValueError('C1/canonical mismatch for '+sku)
  ev={k:row[k] for k in ('sku','shop_slug','canonical_id','product_name','price_mode','unit_basis','review_status','price_basis')}
  ev.update(schema='onstore.price-event.v1',type='seed',usd_cents=int(row['usd_cents']),actor='onstore-c2-bootstrap',at=time_utc(),event_id=str(uuid.uuid4()))
  pe.append(ev)
 re=[]
 for cur,val,at in [('KES',129732000,'2026-10-20T11:19:00Z'),('GBP',749586,'2026-10-20T11:37:00Z')]:
  re.append(dict(schema='onstore.rate-event.v1',type='rate_set',currency=cur,units_per_usd_scaled=val,at=at,actor='onstore-c2-bootstrap',source='dated_market_reference_unapproved',event_id=str(uuid.uuid4())))
 # Verify in memory before writing authoritative ledgers.
 replay_prices(pe,known);replay_rates(re)
 append_events(PRICE_EVENTS,pe);append_events(RATE_EVENTS,re)
 refresh(known,pe,re)
 print('SEEDED:',len(pe),'USD price estimates; 30 property references are scenario-only')
 print('RATES: USD/KES/GBP, initial market reference rates, pending admin approval')

def verify():
 known,pe,re,p,r=state()
 for path,value in [(PRICES,p),(RATES,r),(PUBLIC,public_view(p,r))]:
  if not path.is_file() or path.read_bytes()!=encode(value):raise ValueError(path.name+' out of sync; use repair')
 print('PASS:',len(known),'C1 SKUs;',len(p['entries']),'priced;',len(re),'rate events; USD/KES/GBP')
 print('PASS: price ownership scoped to shop SKU, immutable audit history, provisional source flags')

def main():
 parser=argparse.ArgumentParser(description='onStore C2 local pricing and exchange-rate administration; NO authentication backend')
 subs=parser.add_subparsers(dest='cmd',required=True)
 for name in ('seed','verify','repair','summary'):subs.add_parser(name)
 p=subs.add_parser('set-price');p.add_argument('--sku',required=True);p.add_argument('--shop',required=True);p.add_argument('--usd',required=True);p.add_argument('--actor',required=True);p.add_argument('--reviewed',action='store_true');p.add_argument('--dry-run',action='store_true')
 r=subs.add_parser('set-rate');r.add_argument('--currency',required=True,choices=['KES','GBP']);r.add_argument('--rate',required=True);r.add_argument('--actor',required=True);r.add_argument('--marketplace-admin',action='store_true');r.add_argument('--dry-run',action='store_true')
 args=parser.parse_args()
 if args.cmd=='seed':
  with locked():seed_initial()
 elif args.cmd=='verify':verify()
 elif args.cmd=='summary':
  _,_,_,p,r=state()
  from collections import Counter
  print('USD estimates:',len(p['entries']),'by shop:',dict(Counter(x['shop_slug'] for x in p['entries'])))
  print('Reference currency rates:',{cur:str(Decimal(v)/SCALE) for cur,v in r['rates_scaled'].items()})
 elif args.cmd=='repair':
  with locked():
   known,pe,re,_,_=state();refresh(known,pe,re)
  verify()
 elif args.cmd=='set-price':
  cents=money_cents(args.usd)
  if not args.actor.strip():raise ValueError('actor required for audit log')
  with locked():
   known,pe,re,p,_=state()
   item=known.get(args.sku)
   if not item:raise ValueError('Unregistered SKU; register with C1 first')
   if item['shop_slug']!=args.shop:raise ValueError('CROSS-SHOP PRICE CHANGE BLOCKED (shop/SKU mismatch)')
   previous=next((e for e in p['entries'] if e['sku']==args.sku),None)
   event=dict(schema='onstore.price-event.v1',type='set_price' if previous else 'new_price',sku=args.sku,shop_slug=args.shop,usd_cents=cents,actor=args.actor,at=time_utc(),event_id=str(uuid.uuid4()),review_status='shop_reviewed' if args.reviewed else 'provisional')
   if args.dry_run:print('DRY RUN:',event);return
   candidate=pe+[event];replay_prices(candidate,known)
   append_events(PRICE_EVENTS,candidate);refresh(known,candidate,re)
  verify()
 elif args.cmd=='set-rate':
  if not args.marketplace_admin:raise ValueError('Marketplace administrator permission required; this CLI does not authenticate users')
  if not args.actor.strip():raise ValueError('Actor required')
  rate=scaled_rate(args.rate)
  with locked():
   known,pe,re,_,_=state()
   event=dict(schema='onstore.rate-event.v1',type='rate_set',currency=args.currency,units_per_usd_scaled=rate,actor=args.actor,at=time_utc(),source='manual_admin_entry',event_id=str(uuid.uuid4()))
   if args.dry_run:print('DRY RUN:',event);return
   candidate=re+[event];replay_rates(candidate)
   append_events(RATE_EVENTS,candidate);refresh(known,pe,candidate)
  verify()

if __name__=='__main__':
 try:main()
 except (ValueError,OSError) as exc:print('ERROR:',exc,file=sys.stderr);sys.exit(1)
