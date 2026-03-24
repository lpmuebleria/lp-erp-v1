from fastapi import APIRouter, Request, HTTPException
from database import db
from typing import List, Optional
import datetime

router = APIRouter()

@router.get("/agenda")
def get_agenda(fecha: Optional[str] = None):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        if not (fecha or "").strip():
            fecha = datetime.date.today().isoformat()
            
        cur.execute("""
            SELECT 
                d.id, d.fecha, d.turno, d.created_at,
                o.id as order_id, o.folio, o.estatus, o.total, o.saldo,
                q.cliente_nombre, q.cliente_tel
            FROM deliveries d
            JOIN orders o ON o.id = d.order_id
            LEFT JOIN quotes q ON q.id = o.quote_id
            WHERE d.fecha = %s
            ORDER BY d.turno ASC, d.created_at ASC
        """, (fecha,))
        rows = cur.fetchall()
        
        # Counts
        cur.execute("SELECT turno, COUNT(*) as c FROM deliveries WHERE fecha = %s GROUP BY turno", (fecha,))
        counts = {r['turno']: r['c'] for r in cur.fetchall()}
        
        return {"events": rows, "counts": counts, "fecha": fecha}
    finally:
        conn.close()

@router.post("/agenda")
def create_event(order_id: int, fecha: str, turno: str):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    try:
        # 1) Validation
        cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
        o = cur.fetchone()
        if not o: raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
        if o["tipo"] != "VENTA_STOCK" or float(o["saldo"] or 0) > 0:
             raise HTTPException(status_code=400, detail="Solo se pueden agendar ventas de stock liquidadas")
             
        # 2) Slot Check
        cur.execute("SELECT COUNT(*) as c FROM deliveries WHERE fecha=%s AND turno=%s", (fecha, turno.upper()))
        if cur.fetchone()['c'] >= 5:
             raise HTTPException(status_code=400, detail="El turno seleccionado ya está lleno")
             
        # 3) Insert
        cur.execute("""
            INSERT INTO deliveries(order_id, fecha, turno, created_at)
            VALUES (%s,%s,%s,%s)
        """, (order_id, fecha, turno.upper(), datetime.datetime.now().isoformat(timespec="seconds")))
        
        cur.execute("UPDATE orders SET estatus='PROGRAMADO', entrega_estimada=%s WHERE id=%s", (f"{fecha} {turno}", order_id))
        
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
