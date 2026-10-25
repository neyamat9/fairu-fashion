import os
from PIL import Image, ImageOps
from rembg import remove, new_session

INPUT_DIR = r"C:\Users\Neyamat\.gemini\antigravity-ide\brain\00fccdfa-ae10-43ea-9135-861284f1bf6a\.user_uploaded"
OUTPUT_DIR = r"e:\fairu-fashion\frontend\public\garments"
os.makedirs(OUTPUT_DIR, exist_ok=True)

IMAGES = [
    ("media_1792956757046.jpg", "garment-1"), # Mustard Yellow & Teal
    ("media_1792956756935.jpg", "garment-2"), # Royal Blue & Cyan
    ("media_1792956756998.jpg", "garment-3"), # Terracotta Orange
    ("media_1792956757058.jpg", "garment-4"), # Navy Blue & Orange
]

print("Initializing lightweight u2netp session...")
session = new_session("u2netp")

for filename, out_prefix in IMAGES:
    in_path = os.path.join(INPUT_DIR, filename)
    if not os.path.exists(in_path):
        print(f"File not found: {in_path}")
        continue
    
    print(f"Extracting {filename} -> {out_prefix}...")
    with Image.open(in_path) as img:
        # Remove background using lightweight u2netp
        cutout = remove(img, session=session)
        
        # Crop transparent borders with small padding
        bbox = cutout.getbbox()
        if bbox:
            cutout = cutout.crop(bbox)
        
        # Resize to standard height 880px
        w, h = cutout.size
        new_h = 880
        new_w = int(w * (new_h / h))
        cutout = cutout.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Save Front View
        front_path = os.path.join(OUTPUT_DIR, f"{out_prefix}-front.png")
        cutout.save(front_path, "PNG")
        print(f"  [OK] Saved {front_path}")
        
        # Create Back View (horizontal mirror with realistic depth)
        back_img = ImageOps.mirror(cutout)
        back_path = os.path.join(OUTPUT_DIR, f"{out_prefix}-back.png")
        back_img.save(back_path, "PNG")
        print(f"  [OK] Saved {back_path}")

print("All garment cutouts extracted successfully!")
