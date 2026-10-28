"""Governed approved merchant asset validator; never rebuild or overwrite selected art.
Use archived per-shop generators only in a separate human-reviewed workspace.
"""
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
shops=json.loads((ROOT/'data/shops.json').read_text())
manifest=json.loads((ROOT/'data/brand-assets.json').read_text())['assets']
assert len(shops)==7 and len(manifest)==98
for record in manifest:
    p=ROOT/record['path']
    assert p.is_file(),p
    data=p.read_bytes()
    assert len(data)==record['bytes'] and hashlib.sha256(data).hexdigest()==record['sha256'],p
for shop in shops:
    s=shop['slug']
    assert shop['logoUrl']==f'images/brands/{s}/{s}-logo.webp'
    assert shop['brandAssets']['status']=='approved-new-logo'
    assert len(list((ROOT/'images/brands'/s).iterdir()))==14
print('PASS: all seven approved brand kits, 98 recorded assets. No files regenerated.')
