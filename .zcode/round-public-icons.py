from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(r"E:\kmoretti-github\Ech0\web\public")
TARGETS = [
    "Ech0.png",
    "rEch0.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "web-app-manifest-192x192.png",
    "web-app-manifest-512x512.png",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon-96x96.png",
]


def rounded_mask(size: tuple[int, int]) -> Image.Image:
    width, height = size
    scale = 4
    radius = round(min(width, height) * 0.12 * scale)
    mask = Image.new("L", (width * scale, height * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, width * scale - 1, height * scale - 1),
        radius=radius,
        fill=255,
    )
    return mask.resize(size, Image.Resampling.LANCZOS)


def round_image(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    image.putalpha(ImageChops.multiply(alpha, rounded_mask(image.size)))
    return image


for name in TARGETS:
    path = ROOT / name
    with Image.open(path) as source:
        rounded = round_image(source)
        rounded.save(path, format="PNG")

with Image.open(ROOT / "favicon-96x96.png") as source:
    rounded = round_image(source)
    rounded.save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
