#!/usr/bin/env python3
"""onStore C1: append-only logical SKU assignments; immutable canonical identifiers.

Ledger is authoritative; sku-registry.json is a replaceable materialized view.
All commands affect ONLY onStore's own data/commerce directory. No NoveGeo edits.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import uuid
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parent.parent
COMMERCE = ROOT / 'data' / 'commerce'
CODES_FILE = COMMERCE / 'shop-codes.json'
LEDGER = COMMERCE / 'sku-events.jsonl'
SNAPSHOT = COMMERCE / 'sku-registry.json'
LOCK = COMMERCE / '.sku-registry.lock'
CATALOGUE = ROOT / 'api' / 'v1' / 'catalogue.json'
SKU_RE = re.compile(r'^OS-([A-Z]{3})-([0-9]{6,})$')
CANONICAL_RE = re.compile(r'^(?:NCP|NRE)-[0-9]{6}-[0-9]$')
VARIANT_RE = re.compile(r'^[a-z0-9][a-z0-9._-]{0,63}$')
REF_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def load_json(path):
    with path.open(encoding='utf-8') as f:
        return json.load(f)


def config():
    data = load_json(CODES_FILE)
    if data.get('schema') != 'onstore.shop-codes.v1' or data.get('sequence_min_width') != 6:
        raise ValueError('Invalid SKU configuration schema')
    entries = data.get('shops')
    if not isinstance(entries, list) or not entries:
        raise ValueError('Shop-code registry missing')
    codes = {entry['slug']: entry['code'] for entry in entries}
    if len(codes) != len(entries) or len(set(codes.values())) != len(codes):
        raise ValueError('Duplicate shop slug or SKU prefix')
    if not all(re.fullmatch('[A-Z]{3}', code) for code in codes.values()):
        raise ValueError('Invalid SKU prefix')
    shops = load_json(ROOT / 'data' / 'shops.json')
    if {s['slug'] for s in shops} != set(codes):
        raise ValueError('Shop list differs from the approved SKU prefixes')
    return codes


def catalogue():
    data = load_json(CATALOGUE)
    if data.get('schema') != 'onstore.catalogue.v1' or not isinstance(data.get('products'), list):
        raise ValueError('Unexpected onStore catalogue schema')
    return data['products']


@contextmanager
def locked():
    COMMERCE.mkdir(parents=True, exist_ok=True)
    with LOCK.open('a+b') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.' + path.name + '-', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, path)
        dir_fd = os.open(str(path.parent), os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def read_events():
    if not LEDGER.is_file():
        raise ValueError('SKU registry not initialized. Run the C1 installer.')
    items = []
    for i, line in enumerate(LEDGER.read_text(encoding='utf-8').splitlines(), 1):
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f'SKU ledger corrupt at line {i}: {exc}') from exc
        if not isinstance(obj, dict):
            raise ValueError(f'SKU ledger event {i} is not an object')
        items.append(obj)
    return items


def replay(events, codes):
    entries = []
    by_sku = {}
    seen_canonical = set()
    seen_merchant_ref = set()
    seen_merchant_id = set()
    sequences = {slug: 0 for slug in codes}
    for i, event in enumerate(events, 1):
        kind = event.get('event_type')
        sku = event.get('sku')
        if kind == 'sku_assigned':
            slug = event.get('shop_slug')
            if slug not in codes:
                raise ValueError(f'Unknown SKU shop at event {i}')
            match = SKU_RE.fullmatch(str(sku))
            if not match or match.group(1) != codes[slug]:
                raise ValueError(f'Invalid shop-specific SKU at event {i}')
            seq = match.group(2)
            if not isinstance(event.get('sequence'), int) or int(seq) != event['sequence'] or seq != f"{event['sequence']:06d}":
                raise ValueError(f'Invalid SKU sequence at event {i}')
            if event['sequence'] != sequences[slug] + 1:
                raise ValueError(f'Out-of-order/reused shop SKU sequence at event {i}')
            sequences[slug] = event['sequence']
            if sku in by_sku:
                raise ValueError(f'Duplicate SKU at event {i}')
            canonical_id = event.get('canonical_id')
            merchant_id = event.get('merchant_item_id')
            variant = event.get('variant_key')
            if not VARIANT_RE.fullmatch(str(variant)):
                raise ValueError(f'Invalid variant at event {i}')
            if canonical_id is not None and not CANONICAL_RE.fullmatch(str(canonical_id)):
                raise ValueError(f'Invalid canonical ID at event {i}')
            if not canonical_id and not merchant_id:
                raise ValueError(f'Unlinked SKU at event {i}')
            if merchant_id:
                if not isinstance(merchant_id, str) or not merchant_id.startswith('MI-') or merchant_id in seen_merchant_id:
                    raise ValueError(f'Invalid or duplicate merchant identity at event {i}')
                seen_merchant_id.add(merchant_id)
            merchant_ref = event.get('merchant_ref')
            if merchant_ref is not None:
                if not REF_RE.fullmatch(str(merchant_ref)) or (slug, merchant_ref) in seen_merchant_ref:
                    raise ValueError(f'Invalid or duplicate merchant reference at event {i}')
                seen_merchant_ref.add((slug, merchant_ref))
            if canonical_id:
                key = (slug, canonical_id, variant)
                if key in seen_canonical:
                    raise ValueError(f'Duplicate canonical-product/variant assignment at event {i}')
                seen_canonical.add(key)
            status = event.get('status')
            if status not in ('registered', 'draft'):
                raise ValueError(f'Invalid SKU registration status at event {i}')
            if not event.get('created_utc') or not isinstance(event.get('name_snapshot'), str):
                raise ValueError(f'Incomplete assignment at event {i}')
            entry = {k: event.get(k) for k in ('sku', 'shop_slug', 'sequence', 'canonical_id', 'merchant_item_id', 'merchant_ref', 'variant_key', 'name_snapshot', 'status', 'created_utc')}
            entries.append(entry)
            by_sku[sku] = entry
        elif kind == 'canonical_linked':
            if sku not in by_sku:
                raise ValueError(f'Unknown linked SKU at event {i}')
            entry = by_sku[sku]
            canonical_id = event.get('canonical_id')
            if not CANONICAL_RE.fullmatch(str(canonical_id)):
                raise ValueError(f'Invalid canonical link at event {i}')
            if entry['canonical_id'] is not None:
                raise ValueError(f'SKU already canonical-linked at event {i}')
            key = (entry['shop_slug'], canonical_id, entry['variant_key'])
            if key in seen_canonical:
                raise ValueError(f'Duplicate canonical link at event {i}')
            entry['canonical_id'] = canonical_id
            seen_canonical.add(key)
        else:
            raise ValueError(f'Unknown SKU event type at line {i}')
    return {
        'schema': 'onstore.sku-registry.v1',
        'source': 'sku-events.jsonl (authoritative)',
        'shop_sequences': {slug: {'code': codes[slug], 'last_issued': sequences[slug], 'next_sequence': sequences[slug] + 1} for slug in codes},
        'item_count': len(entries),
        'items': entries
    }


def encoded_snapshot(snapshot):
    return (json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def commit(events, codes):
    snapshot = replay(events, codes)
    # Single authoritative ledger atomic replacement, followed by derived cache.
    atomic_write(LEDGER, (''.join(json.dumps(evt, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n' for evt in events)).encode('utf-8'))
    atomic_write(SNAPSHOT, encoded_snapshot(snapshot))
    return snapshot


def load_state(codes, *, repair=False):
    events = read_events()
    computed = replay(events, codes)
    if not SNAPSHOT.is_file() or SNAPSHOT.read_bytes() != encoded_snapshot(computed):
        if not repair:
            raise ValueError('SKU snapshot out of sync with authoritative ledger. Run: python tools/sku_registry.py repair')
        atomic_write(SNAPSHOT, encoded_snapshot(computed))
    return events, computed


def catalogue_index():
    found = {}
    for p in catalogue():
        key = (p.get('shop_slug'), p.get('id'))
        if key in found or not CANONICAL_RE.fullmatch(str(key[1])):
            raise ValueError(f'Duplicate or invalid catalogue product: {key}')
        found[key] = p
    return found


def assign_event(slug, seq, codes, canonical_id, name, variant='default', merchant_id=None, merchant_ref=None, status='draft'):
    if not name or not name.strip():
        raise ValueError('A product name is required for a new item')
    return {
        'schema': 'onstore.sku-event.v1', 'event_type': 'sku_assigned',
        'sku': f'OS-{codes[slug]}-{seq:06d}', 'shop_slug': slug, 'sequence': seq,
        'canonical_id': canonical_id, 'merchant_item_id': merchant_id,
        'merchant_ref': merchant_ref, 'variant_key': variant,
        'name_snapshot': name.strip(), 'status': status, 'created_utc': now()
    }


def verify(codes, snapshot):
    index = catalogue_index()
    linked = {(e['shop_slug'], e['canonical_id']) for e in snapshot['items'] if e['canonical_id'] and e['variant_key'] == 'default'}
    missing = sorted(set(index) - linked)
    if missing:
        raise ValueError(f'{len(missing)} catalogue products lack default SKU assignments; first: {missing[0]}. Run sync --apply.')
    print(f"PASS: {snapshot['item_count']} unique SKU assignments across {len(codes)} shops")
    print(f'PASS: all {len(index)} current catalogue products linked; stable NCP/NRE identifiers preserved')
    print('PASS: shop-specific counters, permanent sequences and merchant identities validated')


def cmd_add(args, codes):
    with locked():
        events, snapshot = load_state(codes, repair=True)
        slug = args.shop
        if slug not in codes:
            raise ValueError('Unknown shop slug: ' + slug)
        variant = args.variant
        if not VARIANT_RE.fullmatch(variant):
            raise ValueError('Variant must be 1–64 lowercase letters, numbers, dot, underscore or hyphen')
        canonical_id = args.canonical_id
        merchant_id = None
        merchant_ref = args.merchant_ref
        if canonical_id:
            if not CANONICAL_RE.fullmatch(canonical_id):
                raise ValueError('Invalid NCP/NRE identifier format')
            if merchant_ref:
                raise ValueError('--merchant-ref is for merchant-created items only')
            for e in snapshot['items']:
                if (e['shop_slug'], e['canonical_id'], e['variant_key']) == (slug, canonical_id, variant):
                    raise ValueError('Product/variant already assigned as ' + e['sku'])
            current = catalogue_index().get((slug, canonical_id))
            name = args.name or (current or {}).get('canonical_name')
            if not name:
                raise ValueError('New canonical product not in current catalogue: supply --name')
            status = 'registered' if current and variant == 'default' else 'draft'
        else:
            if not args.name:
                raise ValueError('Merchant-created items require --name')
            if merchant_ref and not REF_RE.fullmatch(merchant_ref):
                raise ValueError('Merchant reference must be 1–128 safe ASCII characters')
            for e in snapshot['items']:
                if e['shop_slug'] != slug or not e['merchant_item_id']:
                    continue
                if merchant_ref and e['merchant_ref'] == merchant_ref:
                    raise ValueError('Merchant reference already registered as ' + e['sku'])
                if not merchant_ref and e['name_snapshot'].casefold() == args.name.strip().casefold() and e['variant_key'] == variant:
                    raise ValueError('Merchant item name/variant already registered as ' + e['sku'] + '; supply a unique merchant reference if distinct')
            name = args.name
            status = 'draft'
            merchant_id = 'MI-' + uuid.uuid4().hex
        seq = snapshot['shop_sequences'][slug]['next_sequence']
        event = assign_event(slug, seq, codes, canonical_id, name, variant, merchant_id, merchant_ref, status)
        if args.dry_run:
            print('DRY RUN: ' + event['sku'] + ' — ' + name + ' (' + status + '); no changes')
            return
        commit(events + [event], codes)
        print('ADDED: ' + event['sku'] + ' — ' + name + ' (' + status + ')')
        if status == 'draft':
            print('NOTE: Draft SKU is not published or available for checkout; product approval, pricing and stock come later.')


def cmd_link(args, codes):
    with locked():
        events, snapshot = load_state(codes, repair=True)
        if not CANONICAL_RE.fullmatch(args.canonical_id):
            raise ValueError('Invalid canonical NCP/NRE ID')
        item = next((e for e in snapshot['items'] if e['sku'] == args.sku), None)
        if not item or item['canonical_id'] is not None or not item['merchant_item_id']:
            raise ValueError('SKU must be an unlinked merchant-created item')
        key = (item['shop_slug'], args.canonical_id, item['variant_key'])
        if any((e['shop_slug'], e['canonical_id'], e['variant_key']) == key for e in snapshot['items']):
            raise ValueError('Canonical product/variant already has a SKU in that shop')
        event = {'schema': 'onstore.sku-event.v1', 'event_type': 'canonical_linked', 'sku': args.sku, 'canonical_id': args.canonical_id, 'created_utc': now()}
        if args.dry_run:
            print('DRY RUN: link ' + args.sku + ' to ' + args.canonical_id)
            return
        commit(events + [event], codes)
        print('LINKED: ' + args.sku + ' → ' + args.canonical_id + '; SKU unchanged')


def cmd_sync(args, codes):
    with locked():
        events, snapshot = load_state(codes, repair=True)
        idx = catalogue_index()
        allocated = {(e['shop_slug'], e['canonical_id'], e['variant_key']) for e in snapshot['items'] if e['canonical_id']}
        seqs = {slug: x['last_issued'] for slug, x in snapshot['shop_sequences'].items()}
        to_add = []
        for key, p in idx.items():
            slug, canonical_id = key
            if slug not in codes:
                raise ValueError('New shop requires an approved shop-code assignment first: ' + slug)
            if (slug, canonical_id, 'default') in allocated:
                continue
            seqs[slug] += 1
            to_add.append(assign_event(slug, seqs[slug], codes, canonical_id, p['canonical_name'], status='registered'))
        if not to_add:
            print('PASS: catalogue synced; no unregistered products')
            return
        print(f"PENDING: {len(to_add)} new catalogue SKU(s) — " + ', '.join(e['sku'] for e in to_add[:10]))
        if not args.apply:
            print('READ ONLY: run sync --apply to assign permanent SKUs')
            return
        commit(events + to_add, codes)
        print(f'ADDED: {len(to_add)} new catalogue SKU(s); no existing assignments changed')


def main():
    ap = argparse.ArgumentParser(description='onStore C1 SKU registry — never edit canonical NCP/NRE data')
    sub = ap.add_subparsers(dest='command', required=True)
    sub.add_parser('verify', help='Validate SKU ledger, snapshot and catalogue links')
    sub.add_parser('repair', help='Regenerate derived snapshot safely from ledger')
    sub.add_parser('list', help='List shop counts, next available sequences')
    p = sub.add_parser('sync', help='Preview new catalogue products; --apply assigns missing SKUs')
    p.add_argument('--apply', action='store_true')
    p = sub.add_parser('add', help='Register new canonical/merchant product or variant without reassigning existing SKUs')
    p.add_argument('--shop', required=True, help='Approved shop slug')
    p.add_argument('--canonical-id', help='Optional NCP/NRE ID if canonical identity exists')
    p.add_argument('--name', help='Required for merchant-created product or new canonical product')
    p.add_argument('--variant', default='default', help='Immutable variant key, default=default')
    p.add_argument('--merchant-ref', help='Optional unique merchant reference to prevent repeated registration')
    p.add_argument('--dry-run', action='store_true', help='Preview next SKU without writing')
    p = sub.add_parser('link', help='Attach later-approved canonical NCP/NRE ID to merchant item; SKU unchanged')
    p.add_argument('--sku', required=True)
    p.add_argument('--canonical-id', required=True)
    p.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    try:
        codes = config()
        if args.command == 'add':
            cmd_add(args, codes)
        elif args.command == 'link':
            cmd_link(args, codes)
        elif args.command == 'sync':
            cmd_sync(args, codes)
        else:
            with locked():
                _, state = load_state(codes, repair=(args.command == 'repair'))
                if args.command == 'verify':
                    verify(codes, state)
                elif args.command == 'repair':
                    print('PASS: SKU snapshot exactly matches the authoritative event ledger')
                else:
                    for slug, meta in state['shop_sequences'].items():
                        count = sum(i['shop_slug'] == slug for i in state['items'])
                        print(f'{slug:24s}  {count:6d} SKUs  next=OS-{meta["code"]}-{meta["next_sequence"]:06d}')
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
