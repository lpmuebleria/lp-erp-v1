import os
import mysql.connector
from database import MYSQL_CONFIG
from security import verify_password
import sys

def debug_login():
    if len(sys.argv) < 3:
        print("Uso: python debug_login.py <username> <password>")
        return

    username = sys.argv[1]
    password = sys.argv[2]

    print("--- DIAGNÓSTICO DE LOGIN ---")
    print(f"Host configurado: {MYSQL_CONFIG['host']}")
    print(f"Puerto: {MYSQL_CONFIG['port']}")
    print(f"Base de Datos: {MYSQL_CONFIG['database']}")
    print(f"Usuario DB: {MYSQL_CONFIG['user']}")
    
    try:
        config = MYSQL_CONFIG.copy()
        if config['host'] not in ['localhost', '127.0.0.1']:
            config['ssl_disabled'] = False
            config['auth_plugin'] = 'mysql_native_password'
            
        print("\n1. Intentando conexión a MySQL...")
        conn = mysql.connector.connect(**config)
        cur = conn.cursor(dictionary=True)
        print("✅ Conexión exitosa.")

        print(f"\n2. Buscando usuario '{username}'...")
        cur.execute("SELECT username, password FROM users WHERE username=%s", (username,))
        user = cur.fetchone()

        if not user:
            print(f"❌ ERROR: El usuario '{username}' NO existe en esta base de datos.")
        else:
            print(f"✅ Usuario encontrado.")
            db_hash = user['password']
            print(f"Hash en DB: {db_hash[:20]}...")
            
            print("\n3. Verificando contraseña...")
            is_valid = verify_password(password, db_hash)
            
            if is_valid:
                print("✅ ¡ÉXITO! La contraseña es CORRECTA.")
            else:
                print("❌ ERROR: La contraseña NO coincide con el hash de la base de datos.")
                print(f"Contraseña probada (primeros 3 chars): {password[:3]}...")

        conn.close()
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {e}")

if __name__ == "__main__":
    debug_login()
