from fastapi import APIRouter, HTTPException, Request
import json
from database import db
from schemas import RoleCreate, RolePermissionBulk

router = APIRouter()

def require_superadmin(request: Request):
    # Check both the session flag and a fallback on the role name just in case session storage is flaky
    if not request.session.get("is_superadmin") and request.session.get("role") != "Administrador General":
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
            cur.execute("SELECT modulo, can_view, sub_permissions FROM role_permissions WHERE role_id=%s", (r["id"],))
            perms = cur.fetchall()
            # parse json sub_permissions
            for p in perms:
                p["can_view"] = bool(p["can_view"])
                if p["sub_permissions"]:
                    try:
                        p["sub_permissions"] = json.loads(p["sub_permissions"])
                    except:
                        p["sub_permissions"] = {}
                else:
                    p["sub_permissions"] = {}
            r["permissions"] = perms
            
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
        
        # Default all modules to hidden for a safety-first approach with empty sub_permissions
        modulos = ["dashboard", "inventory", "sales", "orders", "quotes", "apartados", "payments", "agenda"]
        for mod in modulos:
            cur.execute(
                "INSERT INTO role_permissions (role_id, modulo, can_view, sub_permissions) VALUES (%s, %s, %s, '{}')", 
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
            # Prepare json string if given
            sub_perms_str = json.dumps(p.sub_permissions) if p.sub_permissions is not None else '{}'
            
            # Upsert mechanic logic for permissions
            cur.execute("SELECT id FROM role_permissions WHERE role_id=%s AND modulo=%s", (role_id, p.modulo))
            ext = cur.fetchone()
            if ext:
                # If sub_permissions was explicitly passed, update it, otherwise preserve existing
                if p.sub_permissions is not None:
                    cur.execute("UPDATE role_permissions SET can_view=%s, sub_permissions=%s WHERE id=%s", (p.can_view, sub_perms_str, ext["id"]))
                else:
                    cur.execute("UPDATE role_permissions SET can_view=%s WHERE id=%s", (p.can_view, ext["id"]))
            else:
                cur.execute("INSERT INTO role_permissions (role_id, modulo, can_view, sub_permissions) VALUES (%s, %s, %s, %s)", 
                            (role_id, p.modulo, p.can_view, sub_perms_str))

        conn.commit()
        return {"status": "success", "message": "Matriz de permisos actualizada"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
