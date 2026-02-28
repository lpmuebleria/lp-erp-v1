from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List
from database import db
from schemas import ShippingCostCreate, ShippingCostUpdate

router = APIRouter()

@router.get("/shipping/lookup/{cp}")
def lookup_shipping(cp: str):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT sc.id, sc.cp, sc.colonia, sc.municipio, sc.zona_name as zona, sz.costo 
            FROM shipping_costs sc
            JOIN shipping_zones sz ON sc.zona_name = sz.name
            WHERE sc.cp = %s
        """, (cp.strip(),))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="CP_NOT_FOUND")
        return result
    finally:
        conn.close()

@router.get("/shipping")
def list_shipping():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT sc.id, sc.cp, sc.colonia, sc.municipio, sc.zona_name as zona, sz.costo 
            FROM shipping_costs sc
            JOIN shipping_zones sz ON sc.zona_name = sz.name
            ORDER BY sc.cp ASC
        """)
        return cur.fetchall()
    finally:
        conn.close()

@router.post("/shipping")
def create_shipping(data: ShippingCostCreate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM shipping_costs WHERE cp = %s", (data.cp,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Este Código Postal ya existe")
            
        # Ensure the zone exists
        cur.execute("SELECT name FROM shipping_zones WHERE name = %s", (data.zona,))
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="La zona especificada no existe")

        cur.execute(
            """INSERT INTO shipping_costs (cp, colonia, municipio, zona_name) 
               VALUES (%s, %s, %s, %s)""",
            (data.cp.strip(), data.colonia, data.municipio, data.zona)
        )
        conn.commit()
        return {"status": "success", "id": cur.lastrowid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/shipping/{cp}")
def update_shipping(cp: str, data: ShippingCostUpdate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        updates = []
        vals = []
        if data.colonia is not None:
            updates.append("colonia=%s")
            vals.append(data.colonia)
        if data.municipio is not None:
            updates.append("municipio=%s")
            vals.append(data.municipio)
        if data.zona is not None:
            updates.append("zona_name=%s")
            vals.append(data.zona)
            
        if not updates:
            return {"status": "ok"}
            
        vals.append(cp.strip())
        
        cur.execute(f"UPDATE shipping_costs SET {','.join(updates)} WHERE cp=%s", tuple(vals))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="CP no encontrado para actualizar")
            
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/shipping/{cp}")
def delete_shipping(cp: str):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM shipping_costs WHERE cp = %s", (cp.strip(),))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- ZONES CRUD ---

@router.get("/shipping/zones")
def list_shipping_zones():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM shipping_zones ORDER BY name ASC")
        return cur.fetchall()
    finally:
        conn.close()

from pydantic import BaseModel
class ZoneCreate(BaseModel):
    name: str
    costo: float

@router.post("/shipping/zones")
def create_shipping_zone(data: ZoneCreate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM shipping_zones WHERE name = %s", (data.name,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Esta Zona ya existe")
            
        cur.execute("INSERT INTO shipping_zones (name, costo) VALUES (%s, %s)", (data.name.strip(), data.costo))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/shipping/zones/{name}")
def update_shipping_zone(name: str, data: ZoneCreate):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE shipping_zones SET costo = %s WHERE name = %s", (data.costo, name))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/shipping/zones/{name}")
def delete_shipping_zone(name: str):
    conn = db()
    cur = conn.cursor()
    try:
        # Check if CPs are using this zone
        cur.execute("SELECT COUNT(*) FROM shipping_costs WHERE zona_name = %s", (name,))
        if cur.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="No puedes eliminar esta zona porque hay Códigos Postales asignados a ella")
            
        cur.execute("DELETE FROM shipping_zones WHERE name = %s", (name,))
        conn.commit()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
