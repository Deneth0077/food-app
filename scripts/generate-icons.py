import os
from PIL import Image

src_path = r"C:\Users\chath\.gemini\antigravity-ide\brain\01f47bb8-3523-4690-9f4c-83ab92a51e75\media__1781323814675.jpg"
public_dir = "public"

if not os.path.exists(src_path):
    print(f"Source image not found: {src_path}")
    exit(1)

print("Opening source image...")
im = Image.open(src_path)

# Ensure output directory exists
os.makedirs(public_dir, exist_ok=True)

# Define sizes to generate
# (output_filename, width, height, format)
targets = [
    ("logo.png", 512, 512, "PNG"),
    ("icon-512x512.png", 512, 512, "PNG"),
    ("icon-192x192.png", 192, 192, "PNG"),
    ("apple-touch-icon.png", 180, 180, "PNG"),
]

for filename, w, h, fmt in targets:
    out_path = os.path.join(public_dir, filename)
    print(f"Generating {out_path} ({w}x{h})...")
    # Resize with LANCZOS resampling (which is high quality)
    resized = im.resize((w, h), Image.Resampling.LANCZOS)
    resized.save(out_path, fmt)

# Generate favicon.ico (32x32)
favicon_path = os.path.join(public_dir, "favicon.ico")
print(f"Generating {favicon_path} (32x32)...")
resized_favicon = im.resize((32, 32), Image.Resampling.LANCZOS)
resized_favicon.save(favicon_path, format="ICO", sizes=[(32, 32)])

print("Icon generation complete!")
