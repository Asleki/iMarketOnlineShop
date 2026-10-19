#!/usr/bin/env python3
"""Generate PNG/WebP/ICO asset variants deterministically from approved SVG brand masters."""
from pathlib import Path
from io import BytesIO
from xml.etree import ElementTree
import cairosvg
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
BRAND=ROOT/'assets'/'brand'
def render_svg(stem,width):
    p=BRAND/(stem+'.svg')
    root=ElementTree.parse(p).getroot()
    assert root.tag.endswith('svg'),p
    return Image.open(BytesIO(cairosvg.svg2png(url=str(p),output_width=width))).convert('RGBA')
def save(stem,png_sizes,webp_sizes):
    for px in png_sizes:
        img=render_svg(stem,px)
        img.save(BRAND/f'{stem}-{px}.png','PNG',optimize=True)
    for px in webp_sizes:
        img=render_svg(stem,px)
        img.save(BRAND/f'{stem}-{px}.webp','WEBP',lossless=True,method=6)
save('onstore-mark',[32,64,180,192,256,512],[64,128,256,512])
save('nexagreen-mark',[64,128,256,512],[64,128,256,512])
for stem in ['onstore-wordmark-on-light','onstore-wordmark-on-dark']:
    save(stem,[640,1200],[320,640,1200])
render_svg('onstore-mark',256).save(BRAND/'onstore-favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
canvas=Image.new('RGB',(1200,630),'#10223E')
bag=render_svg('onstore-mark',340)
word=render_svg('onstore-wordmark-on-dark',625)
canvas.paste(bag,(88,140),bag)
canvas.paste(word,(475,150),word)
canvas.save(BRAND/'onstore-social-1200x630.png','PNG',optimize=True)
print('PASS: onStore and NexaGreen PNG, WebP, multi-size favicon ICO and social image variants generated')
