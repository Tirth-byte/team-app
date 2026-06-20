import os
import sqlite3

AQUASENTINEL_DIR = "/Users/tirthpatel/Downloads/Aquasentinel"

def inspect_db(db_path):
    print(f"\nFound SQLite Database: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print("Tables in database:", tables)
        
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table});")
            columns = [c[1] for c in cursor.fetchall()]
            print(f"Table '{table}' columns: {columns}")
            
            # Fetch first 5 rows
            cursor.execute(f"SELECT * FROM {table} LIMIT 5;")
            rows = cursor.fetchall()
            print(f"First 5 rows of '{table}':")
            for r in rows:
                print("  ", r)
                
            # Search table for "mishwa"
            cursor.execute(f"SELECT * FROM {table};")
            all_rows = cursor.fetchall()
            mishwa_rows = []
            for r in all_rows:
                r_str = str(r).lower()
                if "mishwa" in r_str or "hansaliya" in r_str or "hansiya" in r_str:
                    mishwa_rows.append(r)
            if mishwa_rows:
                print(f"Found {len(mishwa_rows)} matches in '{table}':")
                for r in mishwa_rows:
                    print("  ", r)
        conn.close()
    except Exception as e:
        print("Error reading SQLite DB:", e)

def main():
    if not os.path.exists(AQUASENTINEL_DIR):
        print(f"Directory {AQUASENTINEL_DIR} does not exist.")
        return
    print(f"Scanning directory: {AQUASENTINEL_DIR}...")
    for root, dirs, files in os.walk(AQUASENTINEL_DIR):
        for file in files:
            if file.endswith(".db") or file.endswith(".sqlite") or file.endswith(".sqlite3"):
                inspect_db(os.path.join(root, file))
    print("Scan complete.")

if __name__ == "__main__":
    main()
