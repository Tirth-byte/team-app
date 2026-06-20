import os
import zipfile

CERT_DIR = "/Users/tirthpatel/Downloads/certificates"
CERT_ZIP = "/Users/tirthpatel/Downloads/certificates.zip"

def search_text(text, file_name):
    text_lower = text.lower()
    if "mishwa" in text_lower or "hansaliya" in text_lower or "hansiya" in text_lower or "141744" in text_lower:
        print(f"Match found in file name/content: {file_name}")

def search_directory():
    if not os.path.exists(CERT_DIR):
        print(f"Directory {CERT_DIR} does not exist.")
        return
    print(f"Scanning directory: {CERT_DIR}...")
    for root, dirs, files in os.walk(CERT_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            search_text(file, full_path)
            # Try reading content if it's text/json/csv
            ext = os.path.splitext(file)[1].lower()
            if ext in [".txt", ".json", ".csv"]:
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        search_text(f.read(), full_path)
                except:
                    pass

def search_zip():
    if not os.path.exists(CERT_ZIP):
        print(f"Zip {CERT_ZIP} does not exist.")
        return
    print(f"Scanning zip: {CERT_ZIP}...")
    try:
        with zipfile.ZipFile(CERT_ZIP, 'r') as z:
            for name in z.namelist():
                search_text(name, f"ZIP:{name}")
                if name.endswith(".json") or name.endswith(".csv") or name.endswith(".txt"):
                    try:
                        with z.open(name) as f:
                            search_text(f.read().decode('utf-8', errors='ignore'), f"ZIP:{name}")
                    except:
                        pass
    except Exception as e:
        print("Error reading ZIP:", e)

def main():
    search_directory()
    search_zip()
    print("Certificates scan complete.")

if __name__ == "__main__":
    main()
