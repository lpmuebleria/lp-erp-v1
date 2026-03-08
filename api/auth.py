from fastapi import APIRouter, Request, HTTPException, Form
import json
from database import db
from schemas import LoginRequest
from security import verify_password

router = APIRouter()

@router.post("/login")
def login(request: Request, login_data: LoginRequest):
    conn = db()
    cur = conn.cursor(dictionary=True)

    try:
        cur.execute("""
            SELECT u.*, r.nombre as role_name, r.is_superadmin 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.username=%s
        """, (login_data.username.strip(),))

        u = cur.fetchone()

        if not u or not verify_password(login_data.password, u["password"]):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

        # Load permissions for this user's role
        permissions = {}
        if u["is_superadmin"]:
            # Superadmin has implicit access to everything
            permissions = {
                "dashboard": {"can_view": True},
                "inventory": {"can_view": True},
                "sales": {"can_view": True},
                "orders": {"can_view": True},
                "quotes": {"can_view": True},
                "apartados": {"can_view": True},
                "payments": {"can_view": True},
                "agenda": {"can_view": True},
                "settings": {"can_view": True}
            }
        elif u["role_id"]:
            # Fetch custom matrix
            cur.execute("SELECT modulo, can_view, sub_permissions FROM role_permissions WHERE role_id=%s", (u["role_id"],))
            perms = cur.fetchall()
            for p in perms:
                sub_perms = {}
                if p["sub_permissions"]:
                    try:
                        sub_perms = json.loads(p["sub_permissions"])
                    except:
                        pass
                
                permissions[p["modulo"]] = {
                    "can_view": bool(p["can_view"]),
                    "sub_permissions": sub_perms
                }
            # Hardcode settings off for non-superadmins just in case
            permissions["settings"] = {"can_view": False, "sub_permissions": {}}
        else:
            # Fallback legacy safety
            permissions = {
                "inventory": {"can_view": True},
                "sales": {"can_view": True}
            }

        # Store session
        request.session["user"] = u["username"]
        request.session["role"] = u["role_name"] or u["rol"]
        request.session["is_superadmin"] = bool(u.get("is_superadmin"))

        return {
            "user": u["username"], 
            "role": u["role_name"] or u["rol"],
            "nombre_completo": u.get("nombre_completo", ""),
            "is_superadmin": bool(u.get("is_superadmin")),
            "permissions": permissions
        }

    finally:
        conn.close()

@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return {"status": "logged out"}
