from fastapi import APIRouter, Request, HTTPException
from typing import List, Dict, Any
from database import db
from schemas import HRAsistenciaCreate, HRPrestamoCreate, HRNominaCreate, HRComisionCreate
from pydantic import BaseModel

router = APIRouter()

def require_hr_permission(request: Request):
    if request.session.get("is_superadmin"):
        return
    # Here we should verify the matrix for "hr" module
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT role_id FROM users WHERE username=%s", (request.session.get("user"),))
        u = cur.fetchone()
        if u and u["role_id"]:
            cur.execute("SELECT can_view FROM role_permissions WHERE role_id=%s AND modulo='hr'", (u["role_id"],))
            p = cur.fetchone()
            if p and p["can_view"]:
                return
    finally:
        conn.close()
    
    raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere permiso de Recursos Humanos.")

@router.get("/hr/users")
def get_hr_users(request: Request):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT username, nombre_completo, photo_url, sueldo_base, fecha_ingreso, puesto, cumpleanos
            FROM users
            ORDER BY nombre_completo ASC
        """)
        return cur.fetchall()
    finally:
        conn.close()

class HRUserUpdate(BaseModel):
    photo_url: str | None = None
    sueldo_base: float | None = None
    fecha_ingreso: str | None = None
    puesto: str | None = None
    cumpleanos: str | None = None

@router.put("/hr/users/{username}")
def update_hr_user(request: Request, username: str, data: HRUserUpdate):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE users 
            SET photo_url=COALESCE(%s, photo_url), 
                sueldo_base=COALESCE(%s, sueldo_base), 
                fecha_ingreso=COALESCE(%s, fecha_ingreso), 
                puesto=COALESCE(%s, puesto),
                cumpleanos=COALESCE(%s, cumpleanos)
            WHERE username=%s
        """, (data.photo_url, data.sueldo_base, data.fecha_ingreso, data.puesto, data.cumpleanos, username))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.post("/hr/asistencia")
def save_asistencia(request: Request, asistencia: List[HRAsistenciaCreate]):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor()
    try:
        for a in asistencia:
            # Upsert mechanic
            cur.execute("SELECT id FROM hr_asistencia WHERE user_id=%s AND semana=%s", (a.user_id, a.semana))
            ext = cur.fetchone()
            if ext:
                cur.execute("""
                    UPDATE hr_asistencia 
                    SET lunes=%s, martes=%s, miercoles=%s, jueves=%s, viernes=%s, sabado=%s, domingo=%s, horas_extras=%s
                    WHERE id=%s
                """, (a.lunes, a.martes, a.miercoles, a.jueves, a.viernes, a.sabado, a.domingo, a.horas_extras, ext[0]))
            else:
                cur.execute("""
                    INSERT INTO hr_asistencia (user_id, semana, lunes, martes, miercoles, jueves, viernes, sabado, domingo, horas_extras)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (a.user_id, a.semana, a.lunes, a.martes, a.miercoles, a.jueves, a.viernes, a.sabado, a.domingo, a.horas_extras))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.get("/hr/asistencia/{semana}")
def get_asistencia(request: Request, semana: str):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM hr_asistencia WHERE semana=%s", (semana,))
        return cur.fetchall()
    finally:
        conn.close()

@router.post("/hr/nomina")
def save_nomina(request: Request, nomina: List[HRNominaCreate]):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor()
    try:
        for n in nomina:
            cur.execute("SELECT id FROM hr_nomina WHERE user_id=%s AND semana=%s", (n.user_id, n.semana))
            ext = cur.fetchone()
            if ext:
                cur.execute("""
                    UPDATE hr_nomina 
                    SET sueldo_base=%s, pago_horas_extras=%s, deduccion_prestamos=%s, deduccion_faltas=%s, total_pagado=%s, fecha_pago=%s
                    WHERE id=%s
                """, (n.sueldo_base, n.pago_horas_extras, n.deduccion_prestamos, n.deduccion_faltas, n.total_pagado, n.fecha_pago, ext[0]))
                nomina_id = ext[0]
            else:
                cur.execute("""
                    INSERT INTO hr_nomina (user_id, semana, sueldo_base, pago_horas_extras, deduccion_prestamos, deduccion_faltas, total_pagado, fecha_pago)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (n.user_id, n.semana, n.sueldo_base, n.pago_horas_extras, n.deduccion_prestamos, n.deduccion_faltas, n.total_pagado, n.fecha_pago))
                nomina_id = cur.lastrowid
            
            # Mark prestamos as discounted
            cur.execute("UPDATE hr_prestamos SET descontado=1, nomina_id=%s WHERE user_id=%s AND descontado=0", (nomina_id, n.user_id))
            
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.get("/hr/nomina/{semana}")
def get_nomina(request: Request, semana: str):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM hr_nomina WHERE semana=%s", (semana,))
        return cur.fetchall()
    finally:
        conn.close()

@router.post("/hr/prestamos")
def add_prestamo(request: Request, prestamo: HRPrestamoCreate):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO hr_prestamos (user_id, monto, motivo, fecha)
            VALUES (%s, %s, %s, %s)
        """, (prestamo.user_id, prestamo.monto, prestamo.motivo, prestamo.fecha))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.get("/hr/prestamos")
def get_prestamos(request: Request, user_id: str | None = None, pending_only: bool = False):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        query = "SELECT p.*, u.nombre_completo FROM hr_prestamos p JOIN users u ON p.user_id = u.username WHERE 1=1"
        params = []
        if user_id:
            query += " AND p.user_id=%s"
            params.append(user_id)
        if pending_only:
            query += " AND p.descontado=0"
        
        cur.execute(query, params)
        return cur.fetchall()
    finally:
        conn.close()

@router.get("/hr/birthdays")
def get_upcoming_birthdays(request: Request):
    # Available to dashboard as well
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT username, nombre_completo, photo_url, cumpleanos
            FROM users
            WHERE cumpleanos IS NOT NULL
        """)
        users = cur.fetchall()
        # In real logic we could filter by next 7 days in python
        import datetime
        today = datetime.date.today()
        upcoming = []
        for u in users:
            if u["cumpleanos"]:
                b_date = u["cumpleanos"]
                # Create birthday date for current year
                try:
                    this_year_bday = b_date.replace(year=today.year)
                except ValueError: # leap year 29 feb
                    this_year_bday = b_date.replace(year=today.year, day=28)
                
                # If birthday already passed this year, look at next year
                if this_year_bday < today:
                    try:
                        this_year_bday = this_year_bday.replace(year=today.year + 1)
                    except ValueError:
                        this_year_bday = this_year_bday.replace(year=today.year + 1, day=28)
                
                days_until = (this_year_bday - today).days
                if days_until <= 30: # Next 30 days
                    u["days_until"] = days_until
                    upcoming.append(u)
        
        upcoming.sort(key=lambda x: x["days_until"])
        return upcoming
    finally:
        conn.close()

# COMISIONES
@router.post("/hr/comisiones")
def save_comisiones(request: Request, data: List[HRComisionCreate]):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor()
    try:
        for c in data:
            cur.execute("SELECT id FROM hr_comisiones WHERE user_id=%s AND mes=%s", (c.user_id, c.mes))
            ext = cur.fetchone()
            if ext:
                cur.execute("UPDATE hr_comisiones SET monto_bono=%s, monto_comision=%s, fecha_pago=%s WHERE id=%s", (c.monto_bono, c.monto_comision, c.fecha_pago, ext[0]))
            else:
                cur.execute("INSERT INTO hr_comisiones (user_id, mes, monto_bono, monto_comision, fecha_pago) VALUES (%s, %s, %s, %s, %s)", (c.user_id, c.mes, c.monto_bono, c.monto_comision, c.fecha_pago))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.get("/hr/comisiones/{mes}")
def get_comisiones(request: Request, mes: str):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM hr_comisiones WHERE mes=%s", (mes,))
        return cur.fetchall()
    finally:
        conn.close()

from fastapi.responses import StreamingResponse
import io
import urllib.request
from PIL import Image, ImageDraw, ImageFont

@router.get("/hr/birthday/generate/{username}")
def generate_birthday_image(request: Request, username: str):
    require_hr_permission(request)
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT nombre_completo, photo_url FROM users WHERE username=%s", (username,))
        u = cur.fetchone()
        if not u:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        import os
        from utils import BASE_DIR
        template_path = os.path.join(BASE_DIR, "static", "plantilla_cumple.jpg")
        
        # If no template, we just return an error so the user knows where to put it
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail="Falta la imagen base en: static/plantilla_cumple.jpg")
            
        template = Image.open(template_path).convert("RGBA")
        
        if u["photo_url"]:
            try:
                # Use urllib to avoid missing requests module
                req = urllib.request.Request(u["photo_url"], headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    photo = Image.open(io.BytesIO(response.read())).convert("RGBA")
                # Example crop/resize - you may need to adjust these to fit exactly
                photo = photo.resize((530, 420)) 
                # Example coordinates for pasting
                template.paste(photo, (90, 180), photo) 
            except Exception as e:
                print(f"Error loading user photo: {e}")
        
        # Draw text
        draw = ImageDraw.Draw(template)
        try:
            # Using default windows fonts if running locally
            font = ImageFont.truetype("arialbd.ttf", 55)
        except:
            font = ImageFont.load_default()
            
        name = u["nombre_completo"].upper() if u["nombre_completo"] else "NUESTRO EQUIPO"
        # Center text approx - needs adjustment
        # draw.text((100, 650), name, font=font, fill=(212, 175, 55)) # Gold color
        
        buf = io.BytesIO()
        template.convert("RGB").save(buf, format="JPEG")
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/jpeg", headers={
            "Content-Disposition": f"attachment; filename=cumple_{username}.jpg"
        })
    finally:
        conn.close()
