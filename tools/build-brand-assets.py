"""Rebuild derivatives: Python 3, Pillow, fontTools, vtracer and Inkscape.
Keep the five source logo PNG/WebP files unchanged. See docs/BRAND_ASSETS.md.
"""
from pathlib import Path
import json, hashlib, shutil, subprocess, tempfile
from xml.sax.saxutils import escape
from PIL import Image, ImageOps, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import vtracer

ROOT = Path(__file__).resolve().parents[1]
FONT = Path('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf')
tt = TTFont(FONT)
glyphs = tt.getGlyphSet()
cmap = tt.getBestCmap()
units = tt['head'].unitsPerEm
shops = json.loads((ROOT/'data/shops.json').read_text())

def vector_text(text, color, height=160):
    pen = SVGPathPen(glyphs)
    x = 0
    for ch in text:
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, (1,0,0,1,x,0)))
        x += tt['hmtx'][name][0]
    scale = (height-40)/units
    width = round(x*scale+40)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"><path fill="{color}" transform="translate(20 {height-32}) scale({scale} {-scale})" d="{pen.getCommands()}"/></svg>'

def svg_raster(svg, png):
    subprocess.run(['inkscape',str(svg),'--export-type=png','--export-filename='+str(png)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def save_raster(im, path):
    if path.suffix == '.webp': im.save(path,lossless=True,method=6)
    else: im.save(path)

def icon_canvas(im, size=512):
    canvas=Image.new('RGBA',(size,size),'white')
    im=im.copy().convert('RGBA')
    im.thumbnail((int(size*.84),int(size*.84)),Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,((size-im.width)//2,(size-im.height)//2))
    return canvas

records=[]
for shop in shops:
    slug=shop['slug']; folder=ROOT/'images/brands'/slug
    folder.mkdir(parents=True,exist_ok=True)
    prefix=folder/slug
    if shop['logoUrl']:
        source=ROOT/shop['logoUrl']
        logo=Image.open(source).convert('RGBA')
        png=Path(str(prefix)+'-logo.png')
        if not png.exists():
            export=logo.copy(); export.thumbnail((1024,1024),Image.Resampling.LANCZOS); export.save(png,optimize=True)
        # Trace is a vector derivative, never a replacement for source artwork.
        trace_input=folder/'trace-input.png'
        small=logo.copy(); small.thumbnail((512,512),Image.Resampling.LANCZOS); small.save(trace_input)
        svg=Path(str(prefix)+'-logo.svg')
        vtracer.convert_image_to_svg_py(str(trace_input),str(svg),colormode='color',hierarchical='stacked',mode='spline',filter_speckle=8,color_precision=5,layer_difference=32,corner_threshold=60,length_threshold=5,max_iterations=10,splice_threshold=45,path_precision=2)
        trace_input.unlink()
        icon=icon_canvas(logo)
        kind='approved-leaf-symbol' if slug=='nexagreen' else 'retained-original'
    else:
        # Deliberately a temporary initial, not a newly invented merchant logo.
        svg=Path(str(prefix)+'-initial.svg')
        glyph=vector_text(shop['name'][0],'#175dbf',400)
        svg.write_text(glyph)
        tmp=Path(str(prefix)+'-initial.png'); svg_raster(svg,tmp)
        initial=Image.open(tmp).convert('RGBA')
        icon=icon_canvas(initial)
        save_raster(icon,Path(str(prefix)+'-initial.webp'))
        kind='temporary-initial'
    icon.save(Path(str(prefix)+'-icon.png'))
    save_raster(icon,Path(str(prefix)+'-icon.webp'))
    icon.save(Path(str(prefix)+'-favicon.ico'),sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
    icon.resize((180,180),Image.Resampling.LANCZOS).save(Path(str(prefix)+'-apple-touch-icon.png'))
    for mode,color in [('light','#10223e'),('dark','#eff5ff')]:
        svg=Path(str(prefix)+f'-wordmark-{mode}.svg')
        svg.write_text(vector_text(shop['name'],color))
        png=Path(str(prefix)+f'-wordmark-{mode}.png'); svg_raster(svg,png)
        save_raster(Image.open(png),Path(str(prefix)+f'-wordmark-{mode}.webp'))
    social=Image.new('RGB',(1200,630),'#f7f9fc')
    tile=icon.resize((300,300),Image.Resampling.LANCZOS)
    social.paste(tile,(450,65),tile)
    name=Image.open(Path(str(prefix)+'-wordmark-light.png')).convert('RGBA')
    name.thumbnail((1060,130),Image.Resampling.LANCZOS)
    social.paste(name,((1200-name.width)//2,405),name)
    draw=ImageDraw.Draw(social)
    caption='Foods & Beverages' if slug=='nexagreen' else 'onStore'
    font=ImageFont.truetype(str(FONT),28)
    draw.text((600,565),caption,font=font,fill='#536276',anchor='mm')
    social.save(Path(str(prefix)+'-social.png'))
    shop['brandAssets']={
        'status':kind,
        'icon':f'images/brands/{slug}/{slug}-icon.webp',
        'favicon':f'images/brands/{slug}/{slug}-favicon.ico',
        'appleTouchIcon':f'images/brands/{slug}/{slug}-apple-touch-icon.png',
        'wordmarkLight':f'images/brands/{slug}/{slug}-wordmark-light.svg',
        'wordmarkDark':f'images/brands/{slug}/{slug}-wordmark-dark.svg',
        'social':f'images/brands/{slug}/{slug}-social.png'
    }
    for path in sorted(folder.iterdir()):
        b=path.read_bytes()
        records.append({'path':str(path.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(ROOT/'data/shops.json').write_text(json.dumps(shops,indent=2)+ '\n')
(ROOT/'data/brand-assets.json').write_text(json.dumps({'schemaVersion':1,'assets':records},indent=2)+'\n')
print(f'Built {len(records)} brand assets for {len(shops)} shops')
