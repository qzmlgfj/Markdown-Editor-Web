"""Build the browser WOFF2 copies of the bundled document fonts.

Requires fonttools and its Brotli Python dependency. PDF embedding continues
to use the original TTF/OTF files in public/fonts.
"""

from pathlib import Path

from fontTools.ttLib import TTFont


root = Path(__file__).resolve().parents[1] / "public" / "fonts"
sources = sorted([*root.glob("Noto*.otf"), *root.glob("Noto*.ttf"), *root.glob("Lato*.ttf")])

for source in sources:
    target = source.with_suffix(".woff2")
    font = TTFont(source)
    font.flavor = "woff2"
    font.save(target)
    print(f"{source.name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
