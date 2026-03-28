import sqlite3
import os

db_path = 'database.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM settings WHERE k IN ('comision_msi_banco_pct', 'comision_debito_pct', 'interes_msi_pct')")
    rows = cur.fetchall()
    for r in rows:
        print(f"{r['k']}: {r['v']}")
    conn.close()
else:
    print("Database not found")
