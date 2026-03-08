from database import db
from security import verify_password, hash_password
import sys

conn = db()
cur = conn.cursor(dictionary=True)

try:
    cur.execute("SELECT username, password FROM users WHERE username IN ('Peniche', 'admin', 'vendedor')")
    users = cur.fetchall()
    
    for u in users:
        print(f"User: {u['username']}")
        # Let's test against common passwords they might use or just reset it to '123' or 'admin' 
        # just to see if we can identify what it was.
        
        # We will just forcefully reset Peniche and admin to 'admin123' so they can log back in.
        new_pwd = hash_password("admin123")
        cur.execute("UPDATE users SET password=%s WHERE username=%s", (new_pwd, u['username']))
        print(f"  -> Reset password for {u['username']} to 'admin123'")

    conn.commit()
    print("Passwords have been reset successfully.")

finally:
    conn.close()
