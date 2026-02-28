from database import db
try:
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SHOW TABLES LIKE 'order_notes'")
    table_exists = cur.fetchone()
    print(f"Table 'order_notes' exists: {table_exists is not None}")
    
    if table_exists:
        cur.execute("SELECT * FROM order_notes")
        rows = cur.fetchall()
        print(f"Total rows in order_notes: {len(rows)}")
        for r in rows:
            print(r)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
