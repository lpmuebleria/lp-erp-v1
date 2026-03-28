import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def migrate():
    config = {
        'host': os.getenv('LOCAL_DB_HOST') or os.getenv('DB_HOST') or 'localhost',
        'user': os.getenv('LOCAL_DB_USER') or os.getenv('DB_USER') or 'root',
        'password': os.getenv('LOCAL_DB_PASSWORD') or os.getenv('DB_PASSWORD') or '643643',
        'database': os.getenv('LOCAL_DB_NAME') or os.getenv('DB_NAME') or 'lp_erp',
        'port': int(os.getenv('LOCAL_DB_PORT') or os.getenv('DB_PORT') or 3306),
    }

    try:
        conn = mysql.connector.connect(**config)
        cur = conn.cursor()

        print("Adding round_adjustment to products...")
        try:
            cur.execute("ALTER TABLE products ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")
        except Exception as e:
            print(f"Skipped / Already exists: {e}")

        print("Adding round_adjustment to quotes...")
        try:
            cur.execute("ALTER TABLE quotes ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")
        except Exception as e:
            print(f"Skipped / Already exists: {e}")

        print("Adding round_adjustment to quote_lines...")
        try:
            cur.execute("ALTER TABLE quote_lines ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")
        except Exception as e:
            print(f"Skipped / Already exists: {e}")

        print("Adding round_adjustment to orders...")
        try:
            cur.execute("ALTER TABLE orders ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")
        except Exception as e:
            print(f"Skipped / Already exists: {e}")

        conn.commit()
        print("✅ Migration successful!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
