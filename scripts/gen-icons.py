#!/usr/bin/env python3
"""Generate DRILL PWA icons (192/512/maskable/apple-touch)."""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

BG = (11, 11, 12)      # #0b0b0c
VOLT = (212, 255, 46)  # #d4ff2e
OUT = Path(__file__).resolve().parent.parent / "public"

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def draw_wordmark(size: int, padding_frac: float = 0.06) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    text = "DRILL"
    pad = int(size * padding_frac)
    max_w = size - 2 * pad
    max_h = int(size * 0.42)

    # binary search a font size that fits both width and height
    lo, hi = 10, size
    chosen = lo
    while lo <= hi:
        mid = (lo + hi) // 2
        f = font(mid)
        bbox = d.textbbox((0, 0), text, font=f)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if w <= max_w and h <= max_h:
            chosen = mid
            lo = mid + 1
        else:
            hi = mid - 1

    f = font(chosen)
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - w) // 2 - bbox[0]
    y = (size - h) // 2 - bbox[1]
    d.text((x, y), text, font=f, fill=VOLT)

    # accent: small volt line above the wordmark
    line_y = y - int(size * 0.04)
    line_w = int(w * 0.4)
    line_x = (size - line_w) // 2
    d.rectangle(
        [line_x, line_y - max(2, size // 96), line_x + line_w, line_y],
        fill=VOLT,
    )
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # Standard any-purpose icons: tight padding
    draw_wordmark(192, padding_frac=0.06).save(OUT / "icon-192.png", optimize=True)
    draw_wordmark(512, padding_frac=0.06).save(OUT / "icon-512.png", optimize=True)
    # Maskable: needs ~20% safe zone — pad heavier so the wordmark
    # survives circular/squircle masking on Android.
    draw_wordmark(512, padding_frac=0.22).save(
        OUT / "icon-maskable-512.png", optimize=True
    )
    # iOS apple-touch-icon
    draw_wordmark(180, padding_frac=0.06).save(OUT / "apple-touch-icon.png", optimize=True)
    # Favicon (32x32)
    draw_wordmark(32, padding_frac=0.04).save(OUT / "favicon.png", optimize=True)
    print("icons written:")
    for p in OUT.glob("*.png"):
        print(f"  {p.name}  ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
