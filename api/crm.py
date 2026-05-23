from fastapi import APIRouter, Request, HTTPException
from database import db
from typing import List, Optional, Dict, Any
from schemas import CRMCampagnaCreate, CRMProspectoCreate, CRMProspectoUpdate
from pydantic import BaseModel

router = APIRouter()

def clean_empty_strings(val: Optional[str]) -> Optional[str]:
    if val is None or not str(val).strip():
        return None
    return val
# --- Campaigns Endpoints ---

@router.get("/crm/campanas")
def get_campanas(active_only: bool = True):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM crm_campanas"
        if active_only:
            query += " WHERE activo = 1"
        query += " ORDER BY created_at DESC"
        cur.execute(query)
        return cur.fetchall()
    finally:
        conn.close()

@router.post("/crm/campanas")
def create_campana(campana: CRMCampagnaCreate):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO crm_campanas(
                nombre_campana, responsable, tipo_campana, tipo_campana_otro, 
                enfoque, enfoque_otro, monto_invertido, interacciones_obtenidas
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            campana.nombre_campana, campana.responsable, campana.tipo_campana, campana.tipo_campana_otro,
            campana.enfoque, campana.enfoque_otro, campana.monto_invertido, campana.interacciones_obtenidas
        ))
        conn.commit()
        return {"status": "success", "id_campana": cur.lastrowid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/crm/campanas/{id_campana}")
def update_campana(id_campana: int, campana: CRMCampagnaCreate):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE crm_campanas 
            SET nombre_campana=%s, responsable=%s, tipo_campana=%s, tipo_campana_otro=%s, 
                enfoque=%s, enfoque_otro=%s, monto_invertido=%s, interacciones_obtenidas=%s
            WHERE id_campana=%s
        """, (
            campana.nombre_campana, campana.responsable, campana.tipo_campana, campana.tipo_campana_otro,
            campana.enfoque, campana.enfoque_otro, campana.monto_invertido, campana.interacciones_obtenidas,
            id_campana
        ))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/crm/campanas/{id_campana}")
def delete_campana(request: Request, id_campana: int):
    # Only superadmin
    if not request.session.get("is_superadmin") and request.headers.get("x-is-superadmin") != "true":
        raise HTTPException(status_code=403, detail="Permiso denegado. Se requiere ser Administrador General.")
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE crm_campanas SET activo=0 WHERE id_campana=%s", (id_campana,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/crm/campanas/evaluacion")
def evaluate_campanas():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM crm_prospectos p WHERE p.campana_id = c.id_campana) as prospectos_reales,
                (SELECT COUNT(*) FROM crm_prospectos p WHERE p.campana_id = c.id_campana AND p.estatus = 'Cerrado - Vendido') as numero_ventas,
                (SELECT COALESCE(SUM(p.monto_venta), 0) FROM crm_prospectos p WHERE p.campana_id = c.id_campana AND p.estatus = 'Cerrado - Vendido') as monto_ventas
            FROM crm_campanas c
            WHERE c.activo = 1
            ORDER BY c.created_at DESC
        """)
        rows = cur.fetchall()
        
        evaluation = []
        for r in rows:
            monto_inv = float(r["monto_invertido"] or 0)
            interacciones = int(r["interacciones_obtenidas"] or 0)
            prospectos = int(r["prospectos_reales"] or 0)
            ventas = int(r["numero_ventas"] or 0)
            monto_vta = float(r["monto_ventas"] or 0)
            
            # Calculates
            costo_inter = round(monto_inv / interacciones, 2) if interacciones > 0 else 0.0
            costo_prosp = round(monto_inv / prospectos, 2) if prospectos > 0 else 0.0
            cac = round(monto_inv / ventas, 2) if ventas > 0 else 0.0
            roi = round(((monto_vta - monto_inv) / monto_inv) * 100, 2) if monto_inv > 0 else 0.0
            tasa_conv_leads = round((prospectos / interacciones) * 100, 2) if interacciones > 0 else 0.0
            tasa_conv_ventas = round((ventas / prospectos) * 100, 2) if prospectos > 0 else 0.0
            
            evaluation.append({
                **r,
                "costo_por_interaccion": costo_inter,
                "costo_por_prospecto": costo_prosp,
                "costo_por_adquisicion": cac,
                "roi": roi,
                "tasa_conv_leads": tasa_conv_leads,
                "tasa_conv_ventas": tasa_conv_ventas
            })
            
        return evaluation
    finally:
        conn.close()

# --- Prospects Endpoints ---

@router.get("/crm/prospectos")
def get_prospectos(estatus: Optional[str] = None, search: Optional[str] = None):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT p.*, c.nombre_campana 
            FROM crm_prospectos p 
            LEFT JOIN crm_campanas c ON p.campana_id = c.id_campana
            WHERE 1=1
        """
        params = []
        if estatus:
            query += " AND p.estatus = %s"
            params.append(estatus)
        if search:
            query += " AND p.nombre_cliente LIKE %s"
            params.append(f"%{search}%")
            
        query += " ORDER BY p.created_at DESC"
        cur.execute(query, params)
        return cur.fetchall()
    finally:
        conn.close()

def validate_prospect_rules(prospect_data: dict):
    estatus = prospect_data.get("estatus")
    objecion = prospect_data.get("objecion_principal")
    objecion_otro = prospect_data.get("objecion_otro")
    monto_venta = prospect_data.get("monto_venta")
    
    if estatus == 'Cerrado - Perdido':
        if not objecion or not objecion.strip():
            raise HTTPException(status_code=400, detail="Es obligatorio seleccionar la objeción principal al perder un prospecto.")
        if objecion == 'Otro' and (not objecion_otro or not objecion_otro.strip()):
            raise HTTPException(status_code=400, detail="Por favor especifica la razón de objeción manual.")
            
    if estatus == 'Cerrado - Vendido':
        if monto_venta is None or float(monto_venta) < 0:
            raise HTTPException(status_code=400, detail="Es obligatorio registrar un monto de venta válido y mayor o igual a cero al cerrar un prospecto.")

@router.post("/crm/prospectos")
def create_prospecto(request: Request, prospecto: CRMProspectoCreate):
    validate_prospect_rules(prospecto.dict())
    
    # Get current user
    user_id = request.headers.get("x-user-id") or request.session.get("user") or "Sistema"
    
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO crm_prospectos(
                nombre_cliente, telefono, origen, origen_otro, 
                producto_interes, producto_interes_otro, estatus, 
                objecion_principal, objecion_otro, notas_vendedora, 
                vendedor, campana_id, monto_venta
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            prospecto.nombre_cliente, prospecto.telefono, prospecto.origen, clean_empty_strings(prospecto.origen_otro),
            prospecto.producto_interes, clean_empty_strings(prospecto.producto_interes_otro), prospecto.estatus,
            clean_empty_strings(prospecto.objecion_principal), clean_empty_strings(prospecto.objecion_otro), clean_empty_strings(prospecto.notas_vendedora),
            user_id, prospecto.campana_id, prospecto.monto_venta
        ))
        conn.commit()
        return {"status": "success", "id_prospecto": cur.lastrowid}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/crm/prospectos/{id_prospecto}")
def update_prospecto(id_prospecto: int, prospecto: CRMProspectoUpdate):
    validate_prospect_rules(prospecto.dict())
    
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE crm_prospectos 
            SET nombre_cliente=%s, telefono=%s, origen=%s, origen_otro=%s, 
                producto_interes=%s, producto_interes_otro=%s, estatus=%s, 
                objecion_principal=%s, objecion_otro=%s, notas_vendedora=%s, 
                campana_id=%s, monto_venta=%s
            WHERE id_prospecto=%s
        """, (
            prospecto.nombre_cliente, prospecto.telefono, prospecto.origen, clean_empty_strings(prospecto.origen_otro),
            prospecto.producto_interes, clean_empty_strings(prospecto.producto_interes_otro), prospecto.estatus,
            clean_empty_strings(prospecto.objecion_principal), clean_empty_strings(prospecto.objecion_otro), clean_empty_strings(prospecto.notas_vendedora),
            prospecto.campana_id, prospecto.monto_venta, id_prospecto
        ))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/crm/prospectos/{id_prospecto}")
def delete_prospecto(id_prospecto: int):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM crm_prospectos WHERE id_prospecto=%s", (id_prospecto,))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- CRM Stats & Analytics ---

@router.get("/crm/stats")
def get_crm_stats():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        # Totals
        cur.execute("SELECT COUNT(*) as c FROM crm_prospectos")
        total_prospects = cur.fetchone()["c"] or 0
        
        cur.execute("SELECT COUNT(*) as c FROM crm_prospectos WHERE estatus='Cerrado - Vendido'")
        total_ventas = cur.fetchone()["c"] or 0

        cur.execute("SELECT COUNT(*) as c FROM crm_prospectos WHERE estatus='Cerrado - Perdido'")
        total_perdidos = cur.fetchone()["c"] or 0
        
        # Conversion rate (won vs total closed/processed leads)
        conversion_rate = 0.0
        if total_prospects > 0:
            conversion_rate = round((total_ventas / total_prospects) * 100, 2)
            
        # Status distribution
        cur.execute("SELECT estatus, COUNT(*) as cantidad FROM crm_prospectos GROUP BY estatus")
        status_dist = cur.fetchall()
        
        # Origin distribution
        cur.execute("SELECT origen, origen_otro, COUNT(*) as cantidad FROM crm_prospectos GROUP BY origen, origen_otro")
        origin_dist = cur.fetchall()
        
        # Objections distribution (For lost only)
        cur.execute("""
            SELECT objecion_principal, objecion_otro, COUNT(*) as cantidad 
            FROM crm_prospectos 
            WHERE estatus = 'Cerrado - Perdido'
            GROUP BY objecion_principal, objecion_otro
        """)
        objections_dist = cur.fetchall()
        
        # Product interest distribution
        cur.execute("SELECT producto_interes, producto_interes_otro, COUNT(*) as cantidad FROM crm_prospectos GROUP BY producto_interes, producto_interes_otro")
        products_dist = cur.fetchall()
        
        # Weekly performance (last 4 weeks)
        cur.execute("""
            SELECT 
                DATE_FORMAT(created_at, '%Y-%u') as semana,
                COUNT(*) as leads,
                SUM(CASE WHEN estatus = 'Cerrado - Vendido' THEN 1 ELSE 0 END) as ventas,
                SUM(CASE WHEN estatus = 'Cerrado - Vendido' THEN monto_venta ELSE 0 END) as ingresos
            FROM crm_prospectos
            GROUP BY semana
            ORDER BY semana DESC
            LIMIT 4
        """)
        weekly_perf = cur.fetchall()

        return {
            "total_prospects": total_prospects,
            "total_ventas": total_ventas,
            "total_perdidos": total_perdidos,
            "conversion_rate": conversion_rate,
            "status_dist": status_dist,
            "origin_dist": origin_dist,
            "objections_dist": objections_dist,
            "products_dist": products_dist,
            "weekly_perf": weekly_perf
        }
    finally:
        conn.close()
