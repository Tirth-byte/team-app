import zipfile
import json

ZIP_PATH = "/Users/tirthpatel/Downloads/test-main.zip"
TARGET_FILE = "test-main/aquasentinel/data/raw/hackathon-backup-2026-06-01.json"

def main():
    try:
        print(f"Opening zip: {ZIP_PATH}")
        with zipfile.ZipFile(ZIP_PATH, 'r') as z:
            if TARGET_FILE not in z.namelist():
                print(f"File {TARGET_FILE} not found in zip.")
                return
                
            print(f"Extracting {TARGET_FILE}...")
            with z.open(TARGET_FILE) as f:
                data_bytes = f.read()
                
            print(f"Read {len(data_bytes)} bytes. Parsing as JSON...")
            try:
                data = json.loads(data_bytes.decode('utf-8', errors='ignore'))
                print("Successfully parsed backup as JSON!")
                
                # Check top-level keys or structure
                if isinstance(data, dict):
                    print("Keys in backup:", list(data.keys()))
                    # Let's search for "mishwa" in all values/docs recursively or directly
                    mishwa_matches = []
                    
                    # We can recursively search dicts/lists for string "mishwa"
                    def search_recursive(obj, path_str=""):
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                search_recursive(v, f"{path_str}.{k}")
                        elif isinstance(obj, list):
                            for idx, item in enumerate(obj):
                                search_recursive(item, f"{path_str}[{idx}]")
                        elif isinstance(obj, str):
                            if "mishwa" in obj.lower() or "hansaliya" in obj.lower():
                                mishwa_matches.append((path_str, obj))
                                
                    search_recursive(data)
                    print(f"Found {len(mishwa_matches)} matches in JSON structure:")
                    for path, val in mishwa_matches[:30]:
                        print(f"  Path: {path} => {val}")
                elif isinstance(data, list):
                    print("Backup is a list of length:", len(data))
                    # search list
                    matches = []
                    for idx, item in enumerate(data):
                        item_str = str(item).lower()
                        if "mishwa" in item_str or "hansaliya" in item_str:
                            matches.append((idx, item))
                    print(f"Found {len(matches)} matches in list:")
                    for idx, item in matches[:30]:
                        print(f"  Index {idx}: {item}")
            except Exception as je:
                print("Error parsing JSON:", je)
                # Try finding mishwa as raw substring
                content = data_bytes.decode('utf-8', errors='ignore').lower()
                print("Raw substring search for 'mishwa' in backup:", "mishwa" in content)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
