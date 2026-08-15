from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

path = Path(r"E:\kmoretti-github\Ech0\web\public\maskable-icon.png")
with Image.open(path) as source:
    image = source.convert("RGBA")

width, height = image.size
scale = 4
radius = round(min(width, height) * 0.12 * scale)
mask = Image.new("L", (width * scale, height * scale), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    (0, 0, width * scale - 1, height * scale - 1),
    radius=radius,
    fill=255,
)
mask = mask.resize((width, height), Image.Resampling.LANCZOS)
image.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
image.save(path, format="PNG")
