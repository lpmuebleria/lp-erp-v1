from fastapi import APIRouter, Request, HTTPException
from database import db
from schemas import PaymentCreate, PaymentCancel
from utils import today_iso
from api.notifications import trigger_notification
import datetime

router = APIRouter()

@router.post("/payments")
def create_payment(data: PaymentCreate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    try:
        # 1) Get Order
        cur.execute("SELECT * FROM orders WHERE id=%s", (data.order_id,))
        o = cur.fetchone()
        if not o:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
        saldo_actual = round(float(o["saldo"] or 0), 2)
        if saldo_actual <= 0:
            raise HTTPException(status_code=400, detail="El pedido ya está liquidado")

        monto = round(data.monto, 2)
        if monto > saldo_actual:
            monto = saldo_actual

        # 2) Insert Payment
        cambio = None
        if data.metodo == "efectivo" and data.efectivo_recibido:
            cambio = round(max(0.0, data.efectivo_recibido - monto), 2)

        cur.execute("""
            INSERT INTO payments(order_id, created_at, metodo, monto, referencia, efectivo_recibido, cambio)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            data.order_id,
            today_iso(),
            data.metodo,
            monto,
            data.referencia,
            data.efectivo_recibido,
            cambio
        ))

        # 3) Update Order
        nuevo_anticipo = round(float(o["anticipo_pagado"] or 0) + monto, 2)
        nuevo_saldo = round(saldo_actual - monto, 2)
        nuevo_estatus = o["estatus"]
        
        if nuevo_saldo <= 0.001:
            nuevo_saldo = 0.0
            nuevo_estatus = "LIQUIDADO"

        cur.execute("""
            UPDATE orders SET anticipo_pagado=%s, saldo=%s, estatus=%s WHERE id=%s
        """, (nuevo_anticipo, nuevo_saldo, nuevo_estatus, data.order_id))
        
        conn.commit()

        # Notify Admin
        trigger_notification(
            role_target="admin",
            type="success",
            title="Pago Recibido",
            message=f"Se recibió un pago de ${monto:,.2f} para el pedido {o['folio']} ({data.metodo})",
            related_order_id=data.order_id
        )

        return {"id": data.order_id, "status": nuevo_estatus, "saldo": nuevo_saldo}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/payments")
def get_all_payments():
    # Retorna el historial global de pagos para la vista de Administrador
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT p.*, o.folio, o.vendedor, q.cliente_nombre 
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        LEFT JOIN quotes q ON o.quote_id = q.id
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT 500
    """)
    rows = cur.fetchall()
    conn.close()
    return rows

@router.post("/payments/{payment_id}/cancel")
def cancel_payment(payment_id: int, data: PaymentCancel):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        # 1) Obtener pago
        cur.execute("SELECT * FROM payments WHERE id=%s FOR UPDATE", (payment_id,))
        p = cur.fetchone()
        
        if not p:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        if p["anulado"] == 1:
            raise HTTPException(status_code=400, detail="El pago ya se encuentra anulado")
            
        monto_anular = float(p["monto"])
        order_id = p["order_id"]
        
        # 2) Actualizar pago como anulado
        cur.execute("""
            UPDATE payments 
            SET anulado = 1, motivo_anulacion = %s 
            WHERE id = %s
        """, (data.motivo_anulacion, payment_id))
        
        # 3) Actualizar saldos de la Orden (revertir el pago)
        cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
        o = cur.fetchone()
        
        if o:
            nuevo_anticipo = round(float(o["anticipo_pagado"] or 0) - monto_anular, 2)
            nuevo_saldo = round(float(o["saldo"] or 0) + monto_anular, 2)
            
            # Si se le quita un pago y ahora el saldo es > 0, podría perder el estatus LIQUIDADO
            nuevo_estatus = o["estatus"]
            if nuevo_estatus == "LIQUIDADO" and nuevo_saldo > 0:
                nuevo_estatus = "REGISTRADO" # Lo devolvemos a registrado para que puedan seguir con el flujo
                
            cur.execute("""
                UPDATE orders SET anticipo_pagado=%s, saldo=%s, estatus=%s WHERE id=%s
            """, (nuevo_anticipo, nuevo_saldo, nuevo_estatus, order_id))
            
            # Registrar nota en la orden sobre la cancelación
            cur.execute("""
                INSERT INTO order_notes(order_id, author, content, created_at)
                VALUES (%s, %s, %s, %s)
            """, (order_id, "Sistema", f"Pago de ${monto_anular:,.2f} fue ANULADO. Motivo: {data.motivo_anulacion}", today_iso()))

        conn.commit()

        # Notify Admin
        trigger_notification(
            role_target="admin",
            type="error",
            title="Pago Anulado",
            message=f"Se anuló un pago de ${monto_anular:,.2f} del pedido {o['folio']}. Motivo: {data.motivo_anulacion}",
            related_order_id=order_id
        )

        return {"status": "success", "message": "Pago anulado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

