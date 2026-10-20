"""Render sourced product-brand logos and generated category artwork as WebP."""
from pathlib import Path
from io import BytesIO
import json, hashlib, urllib.request, time
from PIL import Image, ImageDraw, ImageOps
import cairosvg
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'data/discovery-artwork-plan.json').read_text())
records=[]; pending=[]
def fetch(url):
    error=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'onStore-artwork-build/1.0 (source-preserving brand conversion)'})
            with urllib.request.urlopen(req,timeout=60) as response: return response.read()
        except Exception as exc:
            error=exc; time.sleep(2*(attempt+1))
    raise error
def image_from(data,fmt):
    if fmt=='svg':
        data=cairosvg.svg2png(bytestring=data,output_width=1200)
    return Image.open(BytesIO(data)).convert('RGBA')
for group in ['brands','categories']:
    for item in plan[group]:
        if item.get('sourcePath'):
            p=ROOT/item['sourcePath']
            if not p.exists():
                pending.append(item['name']);continue
            source=p.read_bytes()
        else:
            source=fetch(item['sourceUrl'])
        im=image_from(source,item.get('sourceFormat','png'))
        if group=='brands':
            contained=ImageOps.contain(im,(440,400),Image.Resampling.LANCZOS)
            output=Image.new('RGBA',(512,512),(255,255,255,255))
            output.alpha_composite(contained,((512-contained.width)//2,(512-contained.height)//2))
            path=Path('images/product-brands')/(item['slug']+'-logo.webp')
            output.save(ROOT/path,format='WEBP',lossless=True,method=6)
        else:
            output=im.convert('RGB')
            output.thumbnail((1024,768),Image.Resampling.LANCZOS)
            folder='images/categories' if item['scope']=='catalogue-department' else 'images/property-types'
            path=Path(folder)/(item['slug']+'.webp')
            output.save(ROOT/path,format='WEBP',quality=90,method=6)
        b=(ROOT/path).read_bytes()
        with Image.open(ROOT/path) as decoded:
            decoded.load()
            assert decoded.format=='WEBP'
            assert decoded.width>=256 and decoded.height>=200
        record={k:v for k,v in item.items() if k not in ['sourcePath']}
        record.update({'path':str(path),'width':output.width,'height':output.height,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'sourceSha256':hashlib.sha256(source).hexdigest()})
        records.append(record)
        print('PASS',path)
manifest={'schema':'onstore.discovery-artwork.v1','brands':[r for r in records if r.get('scope') is None],'categories':[r for r in records if r.get('scope')=='catalogue-department'],'propertyTypes':[r for r in records if r.get('scope')=='property-type'],'pending':pending,'propertiesHaveBrands':False}
if plan.get('requireComplete'):
    assert len(manifest['brands'])==21
    assert len(manifest['categories'])==27
    assert len(manifest['propertyTypes'])==3
    assert not pending,pending
(ROOT/'data/discovery-artwork.json').write_text(json.dumps(manifest,indent=2)+'\n')
for group,key in [('brands','brands'),('categories','categories')]:
    chosen=manifest[key]
    cols=4; cellw=300; cellh=240
    sheet=Image.new('RGB',(cols*cellw,((len(chosen)+cols-1)//cols)*cellh),'#f7f9fc')
    draw=ImageDraw.Draw(sheet)
    for i,item in enumerate(chosen):
        thumb=Image.open(ROOT/item['path']).convert('RGBA')
        thumb.thumbnail((280,195),Image.Resampling.LANCZOS)
        x=(i%cols)*cellw+(cellw-thumb.width)//2;y=(i//cols)*cellh+10
        sheet.paste(thumb,(x,y),thumb)
        draw.text(((i%cols)*cellw+10,(i//cols)*cellh+213),item['name'],fill='#10223e')
    if chosen:sheet.save(ROOT/('docs/'+group+'-artwork-preview.jpg'),quality=85)
print('Verified',len(records),'WebP files; pending',len(pending))
