"""Rebuild the small TeX/LaTeX logo font (requires fonttools==4.65.0).

Source: public/fonts/KaTeX_Main-Regular.ttf from katex@0.18.7.
Uses the logo offsets from MathJax's BaseMappings TeX/LaTeX macros.
The derived family is renamed; original copyright/OFL metadata is retained.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'public/fonts/KaTeX_Main-Regular.ttf', recalcTimestamp=False)
cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
em = font['head'].unitsPerEm
# Map lowercase a/e to the capital logo glyphs, retaining searchable LaTeX/TeX text.
logo = {
    'T': ('T', 1, 0, -.14),
    'e': ('E', 1, -.5 * font['OS/2'].sxHeight / em, -.115),
    'X': ('X', 1, 0, 0),
    'L': ('L', 1, 0, -.325),
    'a': ('A', .7, .21, -.17),
}
for target, (source, scale, y, kern) in logo.items():
    name = cmap[ord(source)]
    pen = TTGlyphPen(glyph_set)
    glyph_set[name].draw(TransformPen(pen, (scale, 0, 0, scale, 0, round(y * em))))
    glyph = pen.glyph()
    font['glyf'][name] = glyph
    glyph.recalcBounds(font['glyf'])
    width, _ = font['hmtx'][name]
    font['hmtx'][name] = (round(width * scale + kern * em), glyph.xMin)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[ord(target)] = name

options = subset.Options()
options.name_IDs = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text='TeXLa ')
subsetter.subset(font)
for record in font['name'].names:
    if record.nameID in (1, 3, 4, 6, 16):
        record.string = 'MarkdownTeXLogo'.encode(record.getEncoding())
    elif record.nameID in (2, 17):
        record.string = 'Regular'.encode(record.getEncoding())
font['head'].modified = font['head'].created = 3800000000
font.save(root / 'public/fonts/MarkdownTeXLogo.ttf')
