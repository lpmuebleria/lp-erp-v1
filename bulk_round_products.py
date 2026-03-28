import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def calculateRounding(amount):
    if not amount: return 0
    remainder = amount % 10
    if remainder < 1.0:
        return (amount // 10) * 10
    else:
        import math
        return math.ceil(amount / 10) * 10

def bulk_round():
    config = {
        'host': os.getenv('LOCAL_DB_HOST') or os.getenv('DB_HOST') or 'localhost',
        'user': os.getenv('LOCAL_DB_USER') or os.getenv('DB_USER') or 'root',
        'password': os.getenv('LOCAL_DB_PASSWORD') or os.getenv('DB_PASSWORD') or '643643',
        'database': os.getenv('LOCAL_DB_NAME') or os.getenv('DB_NAME') or 'lp_erp',
        'port': int(os.getenv('LOCAL_DB_PORT') or os.getenv('DB_PORT') or 3306),
    }

    try:
        conn = mysql.connector.connect(**config)
        cur = conn.cursor(dictionary=True)

        print("Fetching all products for bulk rounding...")
        cur.execute("SELECT id, codigo, modelo, precio_lista FROM products")
        products = cur.fetchall()

        print(f"Found {len(products)} products. Processing...")
        
        updated_count = 0
        for p in products:
            original_price = float(p['precio_lista'])
            rounded_price = calculateRounding(original_price)
            adjustment = rounded_price - original_price
            
            if adjustment != 0:
                print(f"Rounding {p['codigo']} ({p['modelo']}): {original_price:.2f} -> {rounded_price:.2f} (Adj: {adjustment:.2f})")
                cur.execute(
                    "UPDATE products SET precio_lista = %s, round_adjustment = %s WHERE id = %s",
                    (rounded_price, adjustment, p['id'])
                )
                updated_count += 1
        
        conn.commit()
        print(f"✅ Bulk rounding complete! {updated_count} products updated.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Bulk rounding failed: {e}")

if __name__ == "__main__":
    bulk_round()
