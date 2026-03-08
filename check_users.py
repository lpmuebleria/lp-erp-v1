from database import db
import json

conn = db()
cur = conn.cursor(dictionary=True)
try:
    print("--- ROLES ---")
    cur.execute("SELECT * FROM roles")
    print(json.dumps(cur.fetchall(), indent=2, default=str))

    print("--- USERS ---")
    cur.execute("SELECT u.username, u.role_id, r.is_superadmin FROM users u LEFT JOIN roles r ON u.role_id = r.id")
    print(json.dumps(cur.fetchall(), indent=2, default=str))
finally:
    conn.close()
