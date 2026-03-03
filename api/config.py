from fastapi import APIRouter, HTTPException, Request
from typing import List
from database import db
from schemas import UserCreate, UserUpdate
from pydantic import BaseModel

router = APIRouter()

def require_superadmin(request: Request):
    if request.headers.get("x-is-superadmin") == "true":
        return
    if not request.session.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere nivel SuperAdmin.")

class UtilityConfig(BaseModel):
    nivel: str
    multiplicador: float

class CostConfig(BaseModel):
    tamano: str
    maniobras: float
    empaque: float
    comision: float
    garantias: float

@router.get("/config/utility", response_model=List[UtilityConfig])
def get_utility_config():
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM utilidad_config")
    rows = cur.fetchall()
    conn.close()
    return rows

@router.put("/config/utility")
def update_utility_config(data: List[UtilityConfig]):
    conn = db()
    cur = conn.cursor()
    try:
        for item in data:
            cur.execute("""
                UPDATE utilidad_config SET multiplicador=%s WHERE nivel=%s
            """, (item.multiplicador, item.nivel))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/config/costs", response_model=List[CostConfig])
def get_cost_config():
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM cost_config")
    rows = cur.fetchall()
    conn.close()
    return rows

@router.put("/config/costs")
def update_cost_config(data: List[CostConfig]):
    conn = db()
    cur = conn.cursor()
    try:
        for item in data:
            cur.execute("""
                UPDATE cost_config 
                SET maniobras=%s, empaque=%s, comision=%s, garantias=%s 
                WHERE tamano=%s
            """, (item.maniobras, item.empaque, item.comision, item.garantias, item.tamano))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class IvaConfig(BaseModel):
    iva_automatico: bool

@router.get("/config/iva", response_model=IvaConfig)
def get_iva_config():
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT v FROM settings WHERE k='iva_automatico'")
    row = cur.fetchone()
    conn.close()
    val = False
    if row and row['v'] == '1':
        val = True
    return {"iva_automatico": val}

@router.put("/config/iva")
def update_iva_config(data: IvaConfig):
    from utils import calcular_precio_producto
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        val = '1' if data.iva_automatico else '0'
        cur.execute("""
            INSERT INTO settings (k, v) VALUES ('iva_automatico', %s)
            ON DUPLICATE KEY UPDATE v=%s
        """, (val, val))
        
        # Trigger massive price recalculation
        cur.execute("SELECT id, costo_fabrica, tamano, utilidad_nivel FROM products")
        products = cur.fetchall()
        for p in products:
            new_price = calcular_precio_producto(cur, p["costo_fabrica"], p["tamano"], p["utilidad_nivel"])
            cur.execute("UPDATE products SET precio_lista=%s WHERE id=%s", (new_price, p["id"]))
            
        conn.commit()
        return {"status": "success", "message": "Global IVA config updated and prices recalculated."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class GlobalFleteConfig(BaseModel):
    costo: float

@router.get("/config/flete", response_model=GlobalFleteConfig)
def get_global_flete():
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT v FROM settings WHERE k='global_flete_cost'")
    row = cur.fetchone()
    conn.close()
    
    val = 0.0
    if row and row['v']:
        try:
            val = float(row['v'])
        except ValueError:
            pass
            
    return {"costo": val}

@router.put("/config/flete")
def update_global_flete(data: GlobalFleteConfig):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO settings (k, v) VALUES ('global_flete_cost', %s)
            ON DUPLICATE KEY UPDATE v=%s
        """, (str(data.costo), str(data.costo)))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/users")
def get_users(request: Request):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.username, u.rol, u.role_id, u.nombre_completo, u.edad, 
                   u.cumpleanos, u.rfc, r.nombre as role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
        """)
        users = cur.fetchall()
        for u in users:
            if u.get("cumpleanos"):
                u["cumpleanos"] = str(u["cumpleanos"])
        return users
    finally:
        conn.close()

@router.post("/users")
def create_user(request: Request, user: UserCreate):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT username FROM users WHERE username=%s", (user.username,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="El nombre de usuario (ID de Acceso) ya existe.")
            
        # Sanitize optional fields to handle empty strings from frontend
        val_edad = user.edad if user.edad else None
        val_cumple = user.cumpleanos if user.cumpleanos and user.cumpleanos.strip() else None
        val_rfc = user.rfc if user.rfc and user.rfc.strip() else None

        cur.execute("""
            INSERT INTO users 
            (username, pin, password, role_id, nombre_completo, edad, cumpleanos, rfc, rol) 
            VALUES (%s, '0000', %s, %s, %s, %s, %s, %s, %s)
        """, (
            user.username, 
            user.password, 
            user.role_id, 
            user.nombre_completo, 
            val_edad, 
            val_cumple, 
            val_rfc,
            "vendedor" # Legacy fallback
        ))
        conn.commit()
        return {"status": "success", "message": "Usuario/Perfil creado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/users/{username}")
def update_user(request: Request, username: str, user_update: UserUpdate):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT username FROM users WHERE username=%s", (username,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Dynamic update building
        updates = []
        params = []
        if user_update.password:
            updates.append("password=%s")
            params.append(user_update.password)
        if user_update.role_id is not None:
            updates.append("role_id=%s")
            params.append(user_update.role_id)
        if user_update.nombre_completo is not None:
            updates.append("nombre_completo=%s")
            params.append(user_update.nombre_completo)
        if user_update.edad is not None:
            updates.append("edad=%s")
            params.append(user_update.edad)
        if user_update.cumpleanos is not None:
            updates.append("cumpleanos=%s")
            params.append(user_update.cumpleanos)
        if user_update.rfc is not None:
            updates.append("rfc=%s")
            params.append(user_update.rfc)

        if not updates:
             return {"status": "success", "message": "No hay datos que actualizar"}

        params.append(username)
        query = f"UPDATE users SET {', '.join(updates)} WHERE username=%s"
        
        cur.execute(query, tuple(params))
        conn.commit()
        return {"status": "success", "message": "Perfil actualizado."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/users/{username}")
def delete_user(request: Request, username: str):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor()
    try:
        # Prevent self-deletion
        if request.headers.get("x-user-id") == username or request.session.get("user") == username:
            raise HTTPException(status_code=400, detail="Operación bloqueada. No puedes eliminar tu propia cuenta logeada.")

        # Note: Depending on foreign key constraints on quotes/orders (vendedor column), 
        # deleting might fail. But in MVP structure `vendedor` is TEXT not FK.
        cur.execute("DELETE FROM users WHERE username=%s", (username,))
        conn.commit()
        return {"status": "success", "message": f"Usuario {username} dado de baja."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
