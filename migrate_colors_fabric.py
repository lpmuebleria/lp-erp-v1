import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "muebleria_db")
        )
        cur = conn.cursor()

        print("Adding fabric_id to colors table...")
        # Check if column exists first
        cur.execute("SHOW COLUMNS FROM colors LIKE 'fabric_id'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE colors ADD COLUMN fabric_id INT")
            cur.execute("ALTER TABLE colors ADD CONSTRAINT fk_colors_fabric FOREIGN KEY (fabric_id) REFERENCES fabrics(id) ON DELETE CASCADE")
            print("Column fabric_id added successfully.")
        else:
            print("Column fabric_id already exists.")

        conn.commit()
        cur.close()
        conn.close()
        print("Migration complete!")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
