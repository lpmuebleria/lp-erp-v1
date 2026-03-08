from fastapi import APIRouter, HTTPException, Request
from database import db
from schemas import RoleCreate, RolePermissionBulk

router = APIRouter()

def require_superadmin(request: Request):
    if not request.session.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere nivel SuperAdmin.")

@router.get("/roles")
def get_roles(request: Request):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM roles ORDER BY id ASC")
        roles = cur.fetchall()
        
        # Load permissions block for each
        for r in roles:
            cur.execute("SELECT modulo, can_view FROM role_permissions WHERE role_id=%s", (r["id"],))
            r["permissions"] = cur.fetchall()
            
        return roles
    finally:
        conn.close()

@router.post("/roles")
def create_role(request: Request, role: RoleCreate):
    require_superadmin(request)
    
    if not role.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre del nivel de acceso no puede estar vacío.")

    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO roles (nombre, is_superadmin) VALUES (%s, %s)", (role.nombre.strip(), role.is_superadmin))
        new_id = cur.lastrowid
        
        # Default all modules to hidden for a safety-first approach
        modulos = ["dashboard", "inventory", "sales", "orders", "quotes", "apartados", "payments", "agenda", "settings"]
        for mod in modulos:
            cur.execute(
                "INSERT INTO role_permissions (role_id, modulo, can_view) VALUES (%s, %s, %s)", 
                (new_id, mod, False)
            )
            
        conn.commit()
        return {"status": "success", "id": new_id, "message": "Nivel de acceso creado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/roles/{role_id}/permissions")
def update_role_permissions(request: Request, role_id: int, data: RolePermissionBulk):
    require_superadmin(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("SELECT is_superadmin FROM roles WHERE id=%s", (role_id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Rol no existe")
            
        if r["is_superadmin"]:
            raise HTTPException(status_code=400, detail="Los permisos de SuperAdmin no se pueden alterar.")
            
        # Iterate and update each given permission
        for p in data.permissions:
            # Upsert mechanic logic for permissions
            cur.execute("SELECT id FROM role_permissions WHERE role_id=%s AND modulo=%s", (role_id, p.modulo))
            ext = cur.fetchone()
            if ext:
                cur.execute("UPDATE role_permissions SET can_view=%s WHERE id=%s", (p.can_view, ext["id"]))
            else:
                cur.execute("INSERT INTO role_permissions (role_id, modulo, can_view) VALUES (%s, %s, %s)", 
                            (role_id, p.modulo, p.can_view))

        conn.commit()
        return {"status": "success", "message": "Matriz de permisos actualizada"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
