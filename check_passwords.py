from database import db
from security import verify_password
import json

conn = db()
cur = conn.cursor(dictionary=True)

try:
    cur.execute("SELECT username, password FROM users")
    users = cur.fetchall()
    
    defaults = ["1234", "123456", "admin", "admin123", "password", "0000"]
    
    for u in users:
        print(f"User: {u['username']}")
        matched = False
        if not u['password']:
            print("  -> Password is NULL")
            continue
            
        for pd in defaults:
            if verify_password(pd, u['password']):
                print(f"  -> MATCHED! Password is: {pd}")
                matched = True
                break
        
        if not matched:
            print("  -> Password is unknown.")

finally:
    conn.close()
