import os
import zipfile

DOWNLOADS_DIR = "/Users/tirthpatel/Downloads"

def search_zip(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            namelist = z.namelist()
            for name in namelist:
                name_lower = name.lower()
                # Check for files that might be backups
                if "contact" in name_lower or "backup" in name_lower or "db" in name_lower or name_lower.endswith(".csv") or name_lower.endswith(".json"):
                    if "node_modules" not in name_lower and ".next" not in name_lower:
                        print(f"Zip: {file_path} | Found interesting file: {name}")
                        # If it's a small text file, try reading and searching for mishwa
                        if z.getinfo(name).file_size < 1024 * 1024:
                            try:
                                with z.open(name) as f:
                                    content = f.read().decode('utf-8', errors='ignore')
                                    if "mishwa" in content.lower() or "hansaliya" in content.lower():
                                        print(f"  --> MATCH found in file content of {name}!")
                            except:
                                pass
    except Exception as e:
        print(f"Error reading zip {file_path}: {e}")

def main():
    print("Searching ZIP files in Downloads...")
    for file in os.listdir(DOWNLOADS_DIR):
        if file.endswith(".zip"):
            full_path = os.path.join(DOWNLOADS_DIR, file)
            search_zip(full_path)
    print("ZIP scan complete.")

if __name__ == "__main__":
    main()
