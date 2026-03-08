import os
from database import db
from logger_config import logger

def fix_missing_permissions():
    """
    Este script repara la base de datos agregando los permisos faltantes 
    para los roles que ya existen en el sistema (especialmente en producción).
    """
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    modulos = ["dashboard", "inventory", "sales", "orders", "quotes", "apartados", "payments", "agenda", "settings"]
    
    try:
        # 1. Obtener todos los roles
        cur.execute("SELECT id, nombre, is_superadmin FROM roles")
        roles = cur.fetchall()
        
        print(f"--- Iniciando reparación de permisos ---")
        
        roles_procesados = 0
        permisos_creados = 0
        
        for r in roles:
            role_id = r['id']
            is_super = bool(r['is_superadmin'])
            
            for mod in modulos:
                # Verificar si ya tiene el permiso
                cur.execute("SELECT id FROM role_permissions WHERE role_id=%s AND modulo=%s", (role_id, mod))
                if not cur.fetchone():
                    # Si no existe, lo creamos
                    # Superadmins y Admin General tienen todo. Otros bajo lógica básica.
                    can_v = 1 if (is_super or "Administrador" in r['nombre'] or "Gerente" in r['nombre']) else (1 if mod in ["inventory", "sales", "quotes", "apartados"] else 0)
                    
                    cur.execute(
                        "INSERT INTO role_permissions (role_id, modulo, can_view) VALUES (%s, %s, %s)",
                        (role_id, mod, can_v)
                    )
                    permisos_creados += 1
            
            roles_procesados += 1
            
        conn.commit()
        print(f"✅ Reparación completada.")
        print(f"   - Roles procesados: {roles_procesados}")
        print(f"   - Permisos nuevos creados: {permisos_creados}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error durante la reparación: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_missing_permissions()
