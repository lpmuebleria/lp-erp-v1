from database import db
import json

conn = db()
cur = conn.cursor(dictionary=True)

try:
    print("--- ROLES ---")
    cur.execute("SELECT * FROM roles")
    roles = cur.fetchall()
    print(json.dumps(roles, indent=2, default=str))

    print("--- USERS ---")
    cur.execute("SELECT username, rol, role_id, nombre_completo FROM users")
    users = cur.fetchall()
    print(json.dumps(users, indent=2, default=str))
finally:    
    conn.close()
