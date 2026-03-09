from fastapi import APIRouter, Request, HTTPException, Response
from database import db
from typing import List, Optional
from utils import new_folio, today_iso
from schemas import QuoteCreate
import datetime
import os
from services.pdf_service import generate_receipt_pdf

router = APIRouter()

@router.get("/quotes")
def get_quotes(q: Optional[str] = None):
    conn = db()
    cur = conn.cursor(dictionary=True)
    q_clean = (q or "").strip()
    
    if q_clean:
        like = f"%{q_clean}%"
        cur.execute("""
            SELECT id, folio, created_at, vendedor, total, status, customer_id, cliente_nombre
            FROM quotes
            WHERE (cliente_nombre LIKE %s OR folio LIKE %s)
            ORDER BY created_at DESC
            LIMIT 20
        """, (like, like))
    else:
        cur.execute("""
            SELECT id, folio, created_at, vendedor, total, status, customer_id, cliente_nombre
            FROM quotes
            ORDER BY created_at DESC
            LIMIT 20
        """)
    
    rows = cur.fetchall()
    conn.close()
    return rows

@router.get("/quotes/{quote_id}")
def get_quote_detail(quote_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
    q = cur.fetchone()
    if not q:
        conn.close()
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    cur.execute("""
        SELECT ql.*, p.codigo, p.modelo
        FROM quote_lines ql JOIN products p ON p.id=ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()
    conn.close()
    return {"quote": q, "lines": lines}

@router.post("/quotes")
def create_quote(data: dict): # Using dict to accept dynamic payload for all types
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    try:
        # Use frontend-provided amounts to avoid rounding/logic mis-matches
        total = float(data.get("total", 0))
        costo_envio = float(data.get("costo_envio", 0))
        iva_amount = float(data.get("iva_amount", 0))
        
        final_total = total + iva_amount + costo_envio

        # 1) Insert Quote
        cur.execute("""
            INSERT INTO quotes(folio, created_at, vendedor, total, status, cliente_nombre, cliente_tel, cliente_email, descuento_global_val, cp_envio, costo_envio, calle_envio, numero_envio, colonia_envio, referencia_envio, nota_envio)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data.get("folio", f"COT-{int(datetime.datetime.now().timestamp())}"),
            today_iso(),
            data.get("vendedor"),
            final_total,
            data.get("status", "COTIZACION"),
            data.get("cliente_nombre"),
            data.get("cliente_tel"),
            data.get("cliente_email"),
            data.get("descuento_global_val", 0),
            data.get("cp_envio"),
            data.get("costo_envio", 0),
            data.get("calle_envio"),
            data.get("numero_envio"),
            data.get("colonia_envio"),
            data.get("referencia_envio"),
            data.get("nota_envio")
        ))
        quote_id = cur.lastrowid

        # 2) Insert Lines
        lines = data.get("lines", [])
        for ln in lines:
            cur.execute("""
                INSERT INTO quote_lines(quote_id, product_id, cantidad, precio_unit, descuento_val, total_linea)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (
                quote_id,
                ln.get("product_id"),
                ln.get("cantidad"),
                ln.get("precio_unit"),
                ln.get("descuento_manual", 0),
                ln.get("total_linea", 0)
            ))

        # 3) If it's a direct Order creation (not just quote saving)
        if data.get("status") != "COTIZACION":
            tipo_pedido = data.get("tipo", "VENTA_STOCK")
            
            # --- DELIVERY LIMIT CHECK ---
            if tipo_pedido == "VENTA_STOCK":
                entrega_fecha = data.get("entrega_fecha")
                entrega_turno = data.get("entrega_turno")
                if not entrega_fecha or not entrega_turno:
                    raise HTTPException(status_code=400, detail="Venta Stock requiere fecha y turno de entrega")
                
                cur.execute("SELECT COUNT(*) as c FROM deliveries WHERE fecha=%s AND turno=%s", (entrega_fecha, entrega_turno))
                count_deliveries = cur.fetchone()["c"]
                if count_deliveries >= 5:
                    raise HTTPException(status_code=400, detail=f"El turno de la {entrega_turno} para el día {entrega_fecha} ya está lleno (máximo 5).")

            # --- SETUP ORDER VARIABLES ---
            from utils import DEPOSIT_PCT, FAB_DAYS_DEFAULT
            folio_o = data.get("folio").replace("COT", "OP") if "folio" in data else f"ORD-{int(datetime.datetime.now().timestamp())}"
            
            # Default delivery date for non-stock
            entrega_estimada = data.get("entrega_fecha") if tipo_pedido == "VENTA_STOCK" else (datetime.date.today() + datetime.timedelta(days=FAB_DAYS_DEFAULT)).isoformat()
            
            # Extract costs for strict validation
            costo_envio = float(data.get("costo_envio", 0))
            monto_pago = float(data.get("monto_pago", 0))

            if tipo_pedido == "VENTA_STOCK":
                # Strict: The furniture must be paid 100% upfront
                furniture_cost = final_total - costo_envio
                if monto_pago < furniture_cost:
                    raise HTTPException(status_code=400, detail=f"Venta de Stock requiere el pago total del mueble (${furniture_cost:,.2f}). Solo el envío puede quedar pendiente.")
                if monto_pago > furniture_cost and monto_pago < final_total:
                    raise HTTPException(status_code=400, detail=f"El envío a contra-entrega debe pagarse completo o dejarse pendiente completo. Montos válidos: ${furniture_cost:,.2f} o ${final_total:,.2f}")
                
                anticipo_req = furniture_cost
            else:
                # Min deposit for Fabrication and Layaway
                min_deposit_pct = 0.30 if tipo_pedido in ["PEDIDO_FABRICACION", "APARTADO"] else float(DEPOSIT_PCT)
                anticipo_req = round(final_total * min_deposit_pct, 2)
                
                if monto_pago < anticipo_req:
                    raise HTTPException(status_code=400, detail=f"El anticipo mínimo debe ser de ${anticipo_req:,.2f}")

            # 4) Creates the Order with Billing Fields
            cur.execute("""
                INSERT INTO orders(
                    folio, created_at, quote_id, vendedor, total, anticipo_req, anticipo_pagado, saldo, 
                    estatus, entrega_estimada, tipo, nota, iva, 
                    factura_rfc, factura_razon, factura_cp, factura_regimen, factura_uso_cfdi, factura_metodo_pago, factura_forma_pago,
                    cp_envio, costo_envio, calle_envio, numero_envio, colonia_envio, referencia_envio, nota_envio
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                folio_o,
                today_iso(),
                quote_id,
                data.get("vendedor"),
                final_total,
                anticipo_req,
                monto_pago,
                final_total - monto_pago,
                "REGISTRADO",
                entrega_estimada,
                tipo_pedido,
                data.get("notas", ""),
                iva_amount,
                data.get("factura_rfc", ""),
                data.get("factura_razon", ""),
                data.get("factura_cp", ""),
                data.get("factura_regimen", ""),
                data.get("factura_uso_cfdi", ""),
                data.get("factura_metodo_pago", ""),
                data.get("factura_forma_pago", ""),
                data.get("cp_envio"),
                data.get("costo_envio", 0),
                data.get("calle_envio"),
                data.get("numero_envio"),
                data.get("colonia_envio"),
                data.get("referencia_envio"),
                data.get("nota_envio")
            ))
            
            order_id = cur.lastrowid
            
            # 5) Register initial payment if provided
            if monto_pago > 0:
                cur.execute("""
                    INSERT INTO payments(order_id, created_at, metodo, monto, referencia)
                    VALUES (%s,%s,%s,%s,%s)
                """, (order_id, today_iso(), data.get("metodo_pago", "efectivo"), monto_pago, data.get("referencia", "")))

            # 6) If it's VENTA_STOCK, register delivery and deduct stock
            if tipo_pedido == "VENTA_STOCK":
                cur.execute("""
                    INSERT INTO deliveries(order_id, fecha, turno, created_at)
                    VALUES (%s,%s,%s,%s)
                """, (order_id, data.get("entrega_fecha"), data.get("entrega_turno"), today_iso()))
                
                # Deduct stock
                for ln in lines:
                    cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s", (ln.get("cantidad"), ln.get("product_id"), ln.get("cantidad")))

            # 7) If it's APARTADO, deduct stock but no delivery scheduling yet
            if tipo_pedido == "APARTADO":
                for ln in lines:
                    cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s", (ln.get("cantidad"), ln.get("product_id"), ln.get("cantidad")))


            # 8) Notify admin
            from api.notifications import trigger_notification
            trigger_notification(
                role_target="admin",
                type="info",
                title=f"Nuevo {tipo_pedido.replace('_', ' ')}",
                message=f"Se registró {folio_o} por ${final_total:,.2f} (Pagado: ${monto_pago:,.2f})",
                related_order_id=order_id
            )

        conn.commit()
        return {"id": quote_id, "folio": data.get("folio")}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.post("/quotes/{quote_id}/convert")
def convert_quote_to_order(quote_id: int, request: Request, data: dict):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
        q = cur.fetchone()
        if not q:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        from utils import DEPOSIT_PCT, FAB_DAYS_DEFAULT, today_iso
        import datetime
        
        folio_o = "ORD-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        total = q["total"]
        vendedor = q["vendedor"]
        
        # Data from request
        cliente_nombre = data.get("cliente_nombre", q["cliente_nombre"])
        cliente_tel = data.get("cliente_tel", q["cliente_tel"])
        cliente_email = data.get("cliente_email", q["cliente_email"])
        metodo = data.get("metodo", "efectivo")
        monto_anticipo = float(data.get("monto", 0))
        referencia = data.get("referencia", "")
        entrega = (datetime.date.today() + datetime.timedelta(days=FAB_DAYS_DEFAULT)).isoformat()

        # 1) Update Quote Status and Info
        cur.execute("""
            UPDATE quotes SET status='PEDIDO', cliente_nombre=%s, cliente_tel=%s, cliente_email=%s
            WHERE id=%s
        """, (cliente_nombre, cliente_tel, cliente_email, quote_id))

        # 2) Create Order
        cur.execute("""
            INSERT INTO orders(folio, created_at, quote_id, vendedor, total, anticipo_req, anticipo_pagado, saldo, estatus, entrega_estimada, tipo, cp_envio, costo_envio, calle_envio, numero_envio, colonia_envio, referencia_envio, nota_envio)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            folio_o,
            today_iso(),
            quote_id,
            vendedor,
            total,
            round(total * 0.5, 2), # Default 50%
            monto_anticipo,
            total - monto_anticipo,
            "REGISTRADO",
            entrega,
            "VENTA_DIRECTA",
            q.get("cp_envio"),
            q.get("costo_envio", 0),
            q.get("calle_envio"),
            q.get("numero_envio"),
            q.get("colonia_envio"),
            q.get("referencia_envio"),
            q.get("nota_envio")
        ))
        order_id = cur.lastrowid

        # 3) Register Payment if any
        if monto_anticipo > 0:
            cur.execute("""
                INSERT INTO payments(order_id, created_at, metodo, monto, referencia)
                VALUES (%s,%s,%s,%s,%s)
            """, (order_id, today_iso(), metodo, monto_anticipo, referencia))

        # Notify admin
        from api.notifications import trigger_notification
        trigger_notification(
            role_target="admin",
            type="info",
            title="Nuevo Pedido (Conversión)",
            message=f"Se convirtió la cotización a pedido {folio_o} por ${total:,.2f} (Anticipo: ${monto_anticipo:,.2f})",
            related_order_id=order_id
        )

        conn.commit()
        return {"status": "success", "order_id": order_id, "folio": folio_o}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/quotes/{quote_id}/pdf")
def generate_quote_pdf(quote_id: int, is_order: str = "false"):
    conn = db()
    cur = conn.cursor(dictionary=True, buffered=True)
    
    try:
        # First check if it's an order (migrated quote)
        if is_order.lower() == 'true':
            cur.execute("SELECT * FROM orders WHERE id=%s LIMIT 1", (quote_id,))
            order_info = cur.fetchone()
        else:
            cur.execute("SELECT * FROM orders WHERE quote_id=%s ORDER BY id DESC LIMIT 1", (quote_id,))
            order_info = cur.fetchone()
            if not order_info:
                cur.execute("SELECT * FROM orders WHERE id=%s LIMIT 1", (quote_id,))
                order_info = cur.fetchone()
        
        # If not an order, it might just be a quote
        if not order_info:
            cur.execute("SELECT * FROM quotes WHERE id=%s LIMIT 1", (quote_id,))
            q = cur.fetchone()
            if not q:
                raise HTTPException(status_code=404, detail="Registro no encontrado")
            
            # Fetch lines purely from quote
            cur.execute("""
                SELECT ql.*, p.codigo, p.modelo 
                FROM quote_lines ql 
                JOIN products p ON p.id=ql.product_id 
                WHERE ql.quote_id=%s
            """, (quote_id,))
            lines = cur.fetchall()
            
            context = {
                "cliente_nombre": q["cliente_nombre"] or "Público General",
                "cliente_tel": q["cliente_tel"] or "N/A",
                "cliente_email": q["cliente_email"] or "N/A",
                "folio": q["folio"],
                "fecha": q["created_at"].split()[0] if isinstance(q["created_at"], str) else q["created_at"].strftime('%d/%m/%Y'),
                "vendedor": q["vendedor"],
                "tipo_clase": "cotizacion",
                "tipo_display": "Cotización",
                "lineas": lines,
                "status": "COTIZACION",
                "sum_desc_manual": sum((l.get("descuento_val") or 0) for l in lines),
                "descuento_global_val": q.get("descuento_global_val") or 0,
                "total": q["total"],
                "costo_envio": q.get("costo_envio") or 0,
                "calle_envio": q.get("calle_envio") or "",
                "numero_envio": q.get("numero_envio") or "",
                "colonia_envio": q.get("colonia_envio") or "",
                "referencia_envio": q.get("referencia_envio") or "",
                "nota_envio": q.get("nota_envio") or ""
            }
            
        else:
            # It's an order
            # Always base the lines off the initial quote (for now) or add a new table for order_lines. 
            # In our schema, quote_lines act as order_lines once converted.
            q_id_to_use = order_info["quote_id"] if order_info["quote_id"] else quote_id
            
            cur.execute("""
                SELECT ql.*, p.codigo, p.modelo 
                FROM quote_lines ql 
                JOIN products p ON p.id=ql.product_id 
                WHERE ql.quote_id=%s
            """, (q_id_to_use,))
            lines = cur.fetchall()

            tipo = order_info["tipo"]
            tipo_map = {
                "VENTA_STOCK": {"display": "Venta Stock", "class": "venta"},
                "PEDIDO_FABRICACION": {"display": "Pedido Fab.", "class": "fabricacion"},
                "APARTADO": {"display": "Apartado", "class": "apartado"}
            }
            
            # Additional logic to try to fetch quote data if the client info is missing on the order table 
            # (though our prompt says orders don't have client info directly in schema, normally they're linked via quote/customer_id)
            cur.execute("SELECT cliente_nombre, cliente_tel, cliente_email, descuento_global_val FROM quotes WHERE id=%s LIMIT 1", (q_id_to_use,))
            parent_quote = cur.fetchone() or {}

            context = {
                "cliente_nombre": parent_quote.get("cliente_nombre") or "Público General",
                "cliente_tel": parent_quote.get("cliente_tel") or "N/A",
                "cliente_email": parent_quote.get("cliente_email") or "N/A",
                "folio": order_info["folio"],
                "fecha": order_info["created_at"].split()[0] if isinstance(order_info["created_at"], str) else order_info["created_at"].strftime('%d/%m/%Y'),
                "vendedor": order_info["vendedor"],
                "tipo_clase": tipo_map.get(tipo, {}).get("class", "cotizacion"),
                "tipo_display": tipo_map.get(tipo, {}).get("display", "Orden"),
                "lineas": lines,
                "status": tipo,
                "sum_desc_manual": sum((l.get("descuento_val") or 0) for l in lines),
                "descuento_global_val": parent_quote.get("descuento_global_val") or 0,
                "total": order_info["total"],
                "costo_envio": order_info.get("costo_envio") or 0,
                "calle_envio": order_info.get("calle_envio") or "",
                "numero_envio": order_info.get("numero_envio") or "",
                "colonia_envio": order_info.get("colonia_envio") or "",
                "referencia_envio": order_info.get("referencia_envio") or "",
                "nota_envio": order_info.get("nota_envio") or "",
                "anticipo_pagado": order_info["anticipo_pagado"],
                "saldo": order_info["saldo"],
                "entrega_estimada": order_info.get("entrega_estimada") or "",
                "factura_rfc": order_info.get("factura_rfc") or "",
                "factura_razon": order_info.get("factura_razon") or "",
                "factura_cp": order_info.get("factura_cp") or "",
                "factura_regimen": order_info.get("factura_regimen") or "",
                "factura_uso_cfdi": order_info.get("factura_uso_cfdi") or "",
                "factura_metodo_pago": order_info.get("factura_metodo_pago") or "",
                "factura_forma_pago": order_info.get("factura_forma_pago") or ""
            }
        # Use the isolated PDF service
        pdf = generate_receipt_pdf(context)
        
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={context['folio']}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
