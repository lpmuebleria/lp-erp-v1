from database import db
import mysql.connector

conn = db()
cur = conn.cursor()

try:
    # Check if column already exists
    cur.execute("SHOW COLUMNS FROM role_permissions LIKE 'sub_permissions'")
    res = cur.fetchone()
    if not res:
        print("Adding `sub_permissions` JSON column to `role_permissions` table...")
        cur.execute("ALTER TABLE role_permissions ADD COLUMN sub_permissions JSON NULL")
        
        # Populate with empty {}
        cur.execute("UPDATE role_permissions SET sub_permissions = '{}'")
        conn.commit()
        print("Migration successful.")
    else:
        print("Column `sub_permissions` already exists.")
except mysql.connector.Error as err:
    print(f"Error: {err}")
    conn.rollback()
finally:
    conn.close()
