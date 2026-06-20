import os
import sqlite3
import shutil
import re
import json

HISTORY_PATHS = [
    "/Users/tirthpatel/Library/Application Support/Google/Chrome/Default/History",
    "/Users/tirthpatel/Library/Application Support/BraveSoftware/Brave-Browser/Default/History",
    "/Users/tirthpatel/Library/Application Support/Arc/User Data/Default/History",
    "/Users/tirthpatel/Library/Application Support/Microsoft Edge/Default/History",
    "/Users/tirthpatel/Library/Application Support/com.operasoftware.Opera/History"
]

def query_history(db_path):
    if not os.path.exists(db_path):
        return []
    
    temp_path = db_path + ".temp"
    try:
        shutil.copyfile(db_path, temp_path)
    except Exception as e:
        print(f"Error copying {db_path}: {e}")
        return []
        
    urls = []
    try:
        conn = sqlite3.connect(temp_path)
        cursor = conn.cursor()
        cursor.execute("SELECT url FROM urls WHERE url LIKE '%wa.me%' OR url LIKE '%whatsapp.com/send%'")
        rows = cursor.fetchall()
        urls = [r[0] for r in rows]
        conn.close()
    except Exception as e:
        print(f"Error reading SQLite db {db_path}: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return urls

def main():
    print("Searching browser histories for WhatsApp links...")
    all_urls = set()
    for path in HISTORY_PATHS:
        urls = query_history(path)
        if urls:
            print(f"Found {len(urls)} WhatsApp links in: {path}")
            for u in urls:
                all_urls.add(u)
                
    print(f"Total unique visited WhatsApp URLs: {len(all_urls)}")
    
    # Extract numbers
    numbers = set()
    for url in all_urls:
        # Match digits in url after wa.me/ or inside send?phone=
        # E.g. https://wa.me/919974202309?text=...
        # E.g. https://api.whatsapp.com/send/?phone=919358518089&text=...
        matches = re.findall(r'\d+', url)
        for m in matches:
            if len(m) >= 10:  # Valid phone numbers are at least 10 digits
                numbers.add(m)
                
    numbers_list = list(numbers)
    print(f"Extracted {len(numbers_list)} unique phone numbers (>= 10 digits).")
    
    output_path = "/Users/tirthpatel/Downloads/team-app-main/scratch/visited_wa_numbers.json"
    with open(output_path, "w") as f:
        json.dump(numbers_list, f, indent=2)
    print(f"Saved phone numbers to {output_path}")

if __name__ == "__main__":
    main()
