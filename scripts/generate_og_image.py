from PIL import Image

def generate_og_image():
    # 1. Create a 1200x630 canvas with a white background
    canvas_width = 1200
    canvas_height = 630
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (255, 255, 255, 255))
    
    # 2. Open the source logo (600x600 black logo with transparent background)
    logo = Image.open("public/og-image.png")
    
    # 3. Resize logo to 400x400 to fit nicely with padding
    logo_size = 400
    logo_resized = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # 4. Center the logo on the canvas
    x = (canvas_width - logo_size) // 2
    y = (canvas_height - logo_size) // 2
    
    # 5. Paste the logo onto the canvas using its alpha channel as a mask
    canvas.paste(logo_resized, (x, y), logo_resized)
    
    # 6. Save as PNG and JPEG (some tools prefer JPEG)
    # Save as PNG with compression
    canvas.save("public/og-image.png", "PNG", optimize=True)
    print("Open Graph image generated successfully at public/og-image.png (1200x630)")

if __name__ == "__main__":
    generate_og_image()
