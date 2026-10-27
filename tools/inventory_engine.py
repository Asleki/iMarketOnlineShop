#!/usr/bin/env python3
"""onStore C3 — SIMULATION-ONLY inventory event ledger, keyed by permanent C1 SKUs.
No real stock claims, sales, permissions, external APIs, checkout or live storefront changes.

Authoritative: inventory-events.jsonl. Materialized cache: inventory-state.json.
A marketplace-level auth backend and verified stock receipts are required before production use.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parent.parent
COMMERCE = ROOT / 'data' / 'commerce'
SKU_REGISTRY = COMMERCE / 'sku-registry.json'
CATALOGUE = ROOT / 'api' / 'v1' / 'catalogue.json'
LEDGER = COMMERCE / 'inventory-events.jsonl'
SNAPSHOT = COMMERCE / 'inventory-state.json'
LOCK = COMMERCE / '.inventory.lock'
SCHEMA = 'onstore.inventory-event.v1'
ALLOWED_MODE = {'bulk_simulated', 'vehicle_model_simulated', 'property_reference'}
EVENTS = {'inventory_registered', 'stock_received', 'reservation_placed', 'reservation_released', 'sale_completed', 'return_received', 'stock_damaged'}


def utc():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def read_json(path):
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def atomic(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.' + path.name + '-')
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(body)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, path)
        d = os.open(str(path.parent), os.O_RDONLY)
        try:
            os.fsync(d)
        finally:
            os.close(d)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')


@contextmanager
def locked():
    COMMERCE.mkdir(parents=True, exist_ok=True)
    with LOCK.open('a+b') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def sources():
    c1 = read_json(SKU_REGISTRY)
    if c1.get('schema') != 'onstore.sku-registry.v1':
        raise ValueError('C1 SKU Registry unavailable')
    rows = c1.get('items')
    if not isinstance(rows, list) or len({i['sku'] for i in rows}) != len(rows):
        raise ValueError('Invalid or duplicate C1 SKU records')
    cat = read_json(CATALOGUE)
    if cat.get('schema') != 'onstore.catalogue.v1':
        raise ValueError('Unsupported catalogue schema')
    canonical = {p['id']: p for p in cat['products']}
    if len(canonical) != len(cat['products']):
        raise ValueError('Duplicate catalogue identities')
    for row in rows:
        prod = canonical.get(row.get('canonical_id'))
        if prod and prod['shop_slug'] != row['shop_slug']:
            raise ValueError('C1 SKU shop does not match canonical catalogue: ' + row['sku'])
    return {i['sku']:i for i in rows}, canonical


def classify(row, canonical):
    product = canonical.get(row.get('canonical_id'))
    if row['shop_slug'] == 'soko-properties' or (product and product['record_type'] == 'PROPERTY'):
        return 'property_reference'
    if row['shop_slug'] == 'autogiant-motors' and product and product['department'] == 'Vehicles':
        return 'vehicle_model_simulated'
    return 'bulk_simulated'


def seeded_quantity(row, mode, canonical):
    # C3.1 policy: 30 simulated units per initial sellable product.
    # This is demonstration inventory, NEVER proof of actual delivered goods.
    # Property design references and unapproved/unlinked draft SKUs have no stock.
    if mode == 'property_reference' or row.get('status') == 'draft' or not row.get('canonical_id') or row.get('sequence', 0) > 30:
        return 0
    # Vehicles are model-level simulated units, not VIN-backed cars. No real
    # reservations or checkout are permitted until unique-unit control exists.
    return 30


def threshold_for(row, mode):
    if mode != 'bulk_simulated':
        return 0
    return 7 if row['shop_slug'] == 'nexagreen' else 2


def qty(event, *, strictly_positive=True):
    value = event.get('quantity')
    if type(value) is not int or (value <= 0 if strictly_positive else value < 0):
        raise ValueError('Inventory quantity must be a positive integer')
    return value


def read_events():
    if not LEDGER.is_file():
        raise ValueError('C3 not initialized; run installer')
    data = []
    for number, line in enumerate(LEDGER.read_text('utf-8').splitlines(), 1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError as err:
            raise ValueError(f'Inventory ledger invalid at line {number}') from err
        if not isinstance(event, dict):
            raise ValueError(f'Inventory ledger line {number} must be object')
        data.append(event)
    return data


def replay(events, c1, canonical):
    by_sku = {}
    by_ref = {}
    receipt_refs = set()
    return_refs = set()
    ids = set()
    for line_no, event in enumerate(events, 1):
        kind = event.get('type')
        sku = event.get('sku')
        if kind not in EVENTS or sku not in c1:
            raise ValueError(f'Unsupported inventory event/SKU at line {line_no}')
        if event.get('schema') != SCHEMA or event.get('shop_slug') != c1[sku]['shop_slug']:
            raise ValueError(f'Invalid schema or cross-shop inventory event #{line_no}')
        if event.get('environment') != 'simulation' or not event.get('actor') or not event.get('at'):
            raise ValueError(f'Unverified provenance or environment at event #{line_no}')
        eid = event.get('event_id')
        if not isinstance(eid, str) or eid in ids:
            raise ValueError(f'Duplicate/missing event ID at line {line_no}')
        ids.add(eid)
        if kind == 'inventory_registered':
            if sku in by_sku:
                raise ValueError('Duplicate inventory registration for ' + sku)
            mode = event.get('stock_mode')
            if mode not in ALLOWED_MODE or mode != classify(c1[sku], canonical):
                raise ValueError('Invalid inventory policy for ' + sku)
            threshold = event.get('low_stock_threshold')
            if type(threshold) is not int or threshold < 0:
                raise ValueError('Invalid threshold')
            by_sku[sku] = dict(sku=sku, shop_slug=event['shop_slug'], canonical_id=c1[sku].get('canonical_id'),
                               stock_mode=mode, low_stock_threshold=threshold, on_hand=0, reserved=0,
                               sold_total=0, returned_total=0, damaged_total=0, received_total=0,
                               first_arrival_utc=None, last_restock_utc=None, last_movement_utc=None,
                               reservations={}, event_count=1)
            continue
        if sku not in by_sku:
            raise ValueError('Movement before inventory registration: ' + sku)
        state = by_sku[sku]
        if state['stock_mode'] == 'property_reference':
            raise ValueError('Cannot assign stock to a property design reference')
        amount = qty(event)
        state['event_count'] += 1
        if kind == 'stock_received':
            # Model-level quantities may exceed one IN THE SIMULATOR only.
            # Production physical vehicles require VIN-backed unit controls.
            batch = event.get('batch_ref')
            if not isinstance(batch,str) or not batch.strip() or (sku,batch) in receipt_refs:
                raise ValueError('Missing/duplicate receipt batch reference')
            receipt_refs.add((sku,batch))
            state['on_hand'] += amount
            state['received_total'] += amount
            state['first_arrival_utc'] = state['first_arrival_utc'] or event['at']
            state['last_restock_utc'] = event['at']
        elif kind == 'reservation_placed':
            ref = event.get('reservation_ref')
            if not isinstance(ref, str) or not ref.strip() or (sku, ref) in by_ref:
                raise ValueError('Missing/duplicate reservation reference')
            if amount > state['on_hand'] - state['reserved']:
                raise ValueError('Insufficient available stock for reservation')
            state['reserved'] += amount
            state['reservations'][ref] = {'reserved':amount,'released':0,'sold':0}
            by_ref[(sku, ref)] = True
        elif kind in ('reservation_released','sale_completed'):
            ref = event.get('reservation_ref')
            existing = state['reservations'].get(ref)
            if not existing or amount > existing['reserved'] - existing['released'] - existing['sold']:
                raise ValueError('Cannot complete/release more than reservation balance')
            state['reserved'] -= amount
            if kind == 'sale_completed':
                state['on_hand'] -= amount
                state['sold_total'] += amount
                existing['sold'] += amount
            else:
                existing['released'] += amount
        elif kind == 'return_received':
            if amount > state['sold_total'] - state['returned_total']:
                raise ValueError('Returns cannot exceed net sold units')
            return_ref = event.get('return_ref')
            if not isinstance(return_ref,str) or not return_ref.strip() or (sku,return_ref) in return_refs:
                raise ValueError('Missing/duplicate return reference')
            return_refs.add((sku,return_ref))
            state['returned_total'] += amount
            state['on_hand'] += amount
        elif kind == 'stock_damaged':
            if amount > state['on_hand'] - state['reserved']:
                raise ValueError('Damage adjustment exceeds available stock')
            if not event.get('reason'):
                raise ValueError('Damage reason required')
            state['damaged_total'] += amount
            state['on_hand'] -= amount
        state['last_movement_utc'] = event['at']
    result = []
    for sku in sorted(by_sku):
        row = by_sku[sku]
        available = row['on_hand'] - row['reserved']
        if available < 0:
            raise ValueError('Negative available inventory')
        mode = row['stock_mode']
        if mode == 'property_reference':
            status = 'reference_only'
        elif row['received_total'] == 0:
            status = 'not_received'
        elif available == 0:
            status = 'out_of_stock'
        elif available <= row['low_stock_threshold']:
            status = 'low_stock'
        else:
            status = 'in_stock'
        row['available'] = available if mode != 'property_reference' else None
        row['availability_status'] = status
        # First-arrival timestamps are durable. A future UI may derive an age
        # in days at read time; never persist time-dependent flags in the ledger cache.
        del row['reservations']  # internal reservation audit remains in event ledger
        result.append(row)
    return dict(schema='onstore.inventory-state.v1', environment='simulation',
                publication_status='not_real_stock_do_not_use_for_checkout', source='inventory-events.jsonl',
                item_count=len(result), entries=result)


def materialize(events, c1, canonical):
    snap = replay(events,c1,canonical)
    atomic(LEDGER, (''.join(json.dumps(e,sort_keys=True,separators=(',',':'))+'\n' for e in events)).encode('utf-8'))
    atomic(SNAPSHOT,encode(snap))
    return snap


def event(kind, row, actor, **extra):
    return dict(schema=SCHEMA, type=kind, sku=row['sku'], shop_slug=row['shop_slug'], environment='simulation',
                actor=actor, at=utc(), event_id=str(uuid.uuid4()), **extra)


def initialize():
    if LEDGER.exists() or SNAPSHOT.exists():
        raise ValueError('C3 already initialized; refusing to overwrite inventory history')
    c1, canonical=sources()
    if len(c1) < 210:
        raise ValueError('Expected C1 to contain at least 210 initial SKUs')
    events=[]
    count=0
    for sku in sorted(c1):
        row=c1[sku]
        mode=classify(row,canonical)
        events.append(event('inventory_registered',row,'onstore-c3-simulation-bootstrap', stock_mode=mode,low_stock_threshold=threshold_for(row,mode)))
        num=seeded_quantity(row,mode,canonical)
        if num:
            events.append(event('stock_received',row,'onstore-c3-simulation-bootstrap',quantity=num,batch_ref='SIM-OPEN-'+sku,reason='simulated_initial_stock_not_real'))
            count+=1
    snap=replay(events,c1,canonical)
    materialize(events,c1,canonical)
    print(f'SEEDED: {len(c1)} SKU inventory records; {count} simulated stock receipts; {sum(v["stock_mode"]=="property_reference" for v in snap["entries"])} property design references')
    print('WARNING: All stock quantities and arrival dates are SIMULATED; no real-world availability asserted.')


def verify():
    c1,canonical=sources()
    events=read_events()
    snap=replay(events,c1,canonical)
    if not SNAPSHOT.exists() or SNAPSHOT.read_bytes() != encode(snap):
        raise ValueError('Inventory snapshot inconsistent with authoritative event ledger; run repair')
    if {i['sku'] for i in snap['entries']} != set(c1):
        raise ValueError('Inventory not synchronized with C1 SKU Registry; run sync')
    initial_receipts = [e for e in events if e['type']=='stock_received' and e.get('batch_ref','').startswith('SIM-OPEN-')]
    if len(initial_receipts) != 180 or any(e['quantity'] != 30 for e in initial_receipts):
        raise ValueError('Expected 180 original 30-unit opening receipts; do not install with incompatible C3 seeds')
    print(f'PASS: {len(snap["entries"])} inventory SKUs, {len(events)} immutable event records, simulation only')
    print('PASS: property reference restrictions, vehicle model simulation, stock math and arrival metadata')


def summary():
    c1,canonical=sources()
    snap=replay(read_events(),c1,canonical)
    from collections import Counter
    print('Inventory modes:',dict(Counter(x['stock_mode'] for x in snap['entries'])))
    print('Availability:',dict(Counter(x['availability_status'] for x in snap['entries'])))
    print('Source: SIMULATED opening stock and SIMULATED receipt dates, not physical inventory.')


def main():
    ap=argparse.ArgumentParser(description='C3 simulation-only inventory. CLI is NOT authenticated shop administration.')
    sub=ap.add_subparsers(dest='cmd',required=True)
    for cmd in ('init','verify','repair','sync','summary'):
        sub.add_parser(cmd)
    rec=sub.add_parser('receive',help='Record a SIMULATED stock receipt')
    rec.add_argument('--sku',required=True);rec.add_argument('--shop',required=True)
    rec.add_argument('--quantity',required=True,type=int);rec.add_argument('--batch',required=True)
    rec.add_argument('--actor',required=True);rec.add_argument('--simulated',action='store_true')
    rec.add_argument('--dry-run',action='store_true')
    res=sub.add_parser('reserve',help='Simulate stock reservation')
    res.add_argument('--sku',required=True);res.add_argument('--shop',required=True)
    res.add_argument('--quantity',required=True,type=int);res.add_argument('--reservation',required=True)
    res.add_argument('--actor',required=True);res.add_argument('--simulated',action='store_true')
    res.add_argument('--dry-run',action='store_true')
    release=sub.add_parser('release',help='Simulate releasing reserved stock')
    release.add_argument('--sku',required=True);release.add_argument('--shop',required=True)
    release.add_argument('--quantity',required=True,type=int);release.add_argument('--reservation',required=True)
    release.add_argument('--actor',required=True);release.add_argument('--simulated',action='store_true')
    sold=sub.add_parser('sale',help='Simulate sale from an existing reservation only')
    sold.add_argument('--sku',required=True);sold.add_argument('--shop',required=True)
    sold.add_argument('--quantity',required=True,type=int);sold.add_argument('--reservation',required=True)
    sold.add_argument('--actor',required=True);sold.add_argument('--simulated',action='store_true')
    sold.add_argument('--dry-run',action='store_true')
    ret=sub.add_parser('return',help='Simulate inspected return to stock')
    ret.add_argument('--sku',required=True);ret.add_argument('--shop',required=True)
    ret.add_argument('--quantity',required=True,type=int);ret.add_argument('--return-ref',required=True)
    ret.add_argument('--actor',required=True);ret.add_argument('--simulated',action='store_true')
    damage=sub.add_parser('damage',help='Simulate damaged stock adjustment')
    damage.add_argument('--sku',required=True);damage.add_argument('--shop',required=True)
    damage.add_argument('--quantity',required=True,type=int);damage.add_argument('--reason',required=True)
    damage.add_argument('--actor',required=True);damage.add_argument('--simulated',action='store_true')
    args=ap.parse_args()
    if args.cmd == 'init':
        with locked():initialize()
        verify();return
    if args.cmd == 'verify':verify();return
    if args.cmd == 'summary':summary();return
    with locked():
        c1,canonical=sources()
        events=read_events()
        snap=replay(events,c1,canonical)
        if args.cmd == 'repair':
            atomic(SNAPSHOT,encode(snap))
        elif args.cmd == 'sync':
            known={v['sku'] for v in snap['entries']}
            additions=[event('inventory_registered', row,'onstore-c3-sku-sync',stock_mode=classify(row,canonical),low_stock_threshold=threshold_for(row,classify(row,canonical))) for sku,row in sorted(c1.items()) if sku not in known]
            if additions:
                events+=additions;materialize(events,c1,canonical)
            print(f'SYNC: {len(additions)} new SKU records; no stock quantities invented.')
        else:
            if not args.simulated:
                raise ValueError('Explicit --simulated required; C3 does not accept real-world stock receipts')
            if args.quantity <= 0:
                raise ValueError('Quantity must be positive')
            row=c1.get(args.sku)
            if not row or row['shop_slug'] != args.shop:
                raise ValueError('CROSS-SHOP INVENTORY CHANGE BLOCKED: SKU/shop mismatch')
            if args.sku not in {i['sku'] for i in snap['entries']}:
                raise ValueError('Unregistered inventory SKU; first run sync')
            if not args.actor.strip():
                raise ValueError('Audit actor must be supplied')
            names={'receive':'stock_received','reserve':'reservation_placed','release':'reservation_released','sale':'sale_completed','return':'return_received','damage':'stock_damaged'}
            extra={'quantity':args.quantity}
            if args.cmd=='receive':extra['batch_ref']=args.batch.strip()
            if args.cmd in ('reserve','release','sale'):extra['reservation_ref']=args.reservation.strip()
            if args.cmd=='return':extra['return_ref']=args.return_ref.strip()
            if args.cmd=='damage':extra['reason']=args.reason.strip()
            proposed=event(names[args.cmd],row,args.actor,**extra)
            candidate=events+[proposed]
            replay(candidate,c1,canonical)  # all invariants before persisting
            if getattr(args,'dry_run',False):
                print('DRY RUN: event validated, nothing written:',json.dumps(proposed,sort_keys=True))
                return
            materialize(candidate,c1,canonical)
            print('SUCCESS: recorded SIMULATED',args.cmd,'for',row['sku'],'quantity',args.quantity)
    verify()


if __name__=='__main__':
    try:
        main()
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print('ERROR:',str(exc),file=sys.stderr)
        sys.exit(1)
