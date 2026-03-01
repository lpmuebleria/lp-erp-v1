from fastapi import APIRouter, Request, HTTPException
from database import db
from typing import List, Optional
from schemas import OrderUpdate, OrderNoteCreate

router = APIRouter()

@router.get("/orders")
def get_orders(q: Optional[str] = None, estatus: str = "", tipo: str = "", desde: str = "", hasta: str = "", mueble: str = ""):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    q_clean = (q or "").strip()
    estatus_clean = (estatus or "").strip()
    tipo_clean = (tipo or "").strip()

    sql = """
        SELECT
            o.id, o.folio, o.created_at, o.vendedor,
            o.total, o.anticipo_pagado, o.saldo,
            o.entrega_estimada, o.estatus, o.tipo, o.nota, o.estatus_solicitado,
            o.cp_envio, o.costo_envio,
            q.cliente_nombre,
            (SELECT content FROM order_notes WHERE order_id = o.id ORDER BY id DESC LIMIT 1) as ultima_nota
        FROM orders o
        LEFT JOIN quotes q ON q.id = o.quote_id
        WHERE 1=1
    """
    params = []

    if q_clean:
        sql += " AND (o.folio LIKE %s OR IFNULL(q.cliente_nombre,'') LIKE %s)"
        like = f"%{q_clean}%"
        params.extend([like, like])
    
    if estatus_clean:
        sql += " AND o.estatus = %s"
        params.append(estatus_clean)
        
    if tipo_clean:
        sql += " AND o.tipo = %s"
        params.append(tipo_clean)

    if desde:
        sql += " AND date(o.created_at) >= %s"
        params.append(desde)
    
    if hasta:
        sql += " AND date(o.created_at) <= %s"
        params.append(hasta)
        
    if mueble:
        sql += " AND o.id IN (SELECT quote_id FROM quote_lines ql JOIN products p ON p.id=ql.product_id WHERE p.modelo LIKE %s)"
        params.append(f"%{mueble}%")

    sql += " ORDER BY o.created_at DESC LIMIT 200"
    
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    conn.close()
    return rows

@router.get("/orders/export")
def export_orders(format: str = "excel", q: Optional[str] = None, estatus: str = "", tipo: str = "", desde: str = "", hasta: str = "", mueble: str = ""):
    from fastapi.responses import StreamingResponse, Response
    import datetime

    # Fetch filtered data
    data = get_orders(q, estatus, tipo, desde, hasta, mueble)
    
    if not data:
        raise HTTPException(status_code=404, detail="No hay datos para exportar")

    if format == "pdf":
        from jinja2 import Environment, FileSystemLoader
        import os

        # Helper to decide badge classes
        def get_status_class(st):
            st = (st or "").upper()
            if st == "ENTREGADO": return "entregado"
            if st == "LIQUIDADO": return "liquidado"
            if st == "REGISTRADO": return "registrado"
            if st == "EN FABRICACIÓN": return "fabricacion"
            if st == "LISTO ENTREGA": return "listo"
            if st == "CANCELADO": return "cancelado"
            return "default"

        # Prep data for template
        for row in data:
            if isinstance(row["created_at"], str):
                # If it's a string like "2026-02-22T18:16:08", convert to "22/02/2026"
                try:
                    dt = datetime.datetime.fromisoformat(row["created_at"].replace('Z', '+00:00'))
                    row["fecha_str"] = dt.strftime("%d/%m/%Y")
                except:
                    row["fecha_str"] = row["created_at"].split()[0]
            else:
                row["fecha_str"] = row["created_at"].strftime("%d/%m/%Y")
            row["status_class"] = get_status_class(row["estatus"])

        filters_dict = {
            "q": q, "estatus": estatus, "mueble": mueble, "desde": desde, "hasta": hasta
        }
        has_filters = any(filters_dict.values())

        context = {
            "orders": data,
            "total_count": len(data),
            "sum_total": sum(r["total"] for r in data),
            "sum_saldo": sum(r["saldo"] for r in data),
            "filters": filters_dict,
            "has_filters": has_filters,
            "fecha_generacion": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }

        from utils import get_image_b64
        context["logo_b64"] = get_image_b64('logo.jpg') or get_image_b64('logo.png') or get_image_b64('logo.jpeg')
        context["fb_b64"] = get_image_b64('Facebook_logo.png')
        context["ig_b64"] = get_image_b64('Instagram_icon.png')
        context["wa_b64"] = get_image_b64('whatsapp_icon.png')

        env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')))
        template = env.get_template('orders_report.html')
        html_out = template.render(context)

        from weasyprint import HTML
        
        pdf = HTML(string=html_out).write_pdf()
        
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": 'inline; filename="reporte_pedidos.pdf"'}
        )
    
    else:
        import pandas as pd
        from io import BytesIO
        
        # Process for Excel
        df = pd.DataFrame(data)
        
        # Select and rename columns for clarity
        cols_map = {
            "folio": "Folio",
            "created_at": "Fecha",
            "vendedor": "Vendedor",
            "cliente_nombre": "Cliente",
            "total": "Total",
            "anticipo_pagado": "Anticipo",
            "saldo": "Saldo",
            "entrega_estimada": "Entrega",
            "estatus": "Estado",
            "tipo": "Tipo"
        }
        
        # Make timestamp timezone naive manually before excel export to avoid timezone issues
        def make_naive(val):
            if isinstance(val, (datetime.datetime, pd.Timestamp)):
                if val.tzinfo is not None:
                    return val.replace(tzinfo=None)
            return val

        if 'created_at' in df.columns:
            df['created_at'] = df['created_at'].apply(make_naive)
        
        # Filter to only existing columns in map
        df = df[list(cols_map.keys())].rename(columns=cols_map)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Pedidos')
            
            # Access the openpyxl worksheet to adjust column widths
            worksheet = writer.sheets['Pedidos']
            for i, col in enumerate(df.columns):
                # Find the maximum length of the content in this column
                max_len = max(
                    df[col].astype(str).map(len).max(),  # Max length of data
                    len(str(col))  # Length of the header
                ) + 2  # Add some padding
                
                # set_column in xlsxwriter vs column_dimensions in openpyxl
                column_letter = chr(65 + i) # A, B, C...
                worksheet.column_dimensions[column_letter].width = max_len

        output.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename="reporte_pedidos.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/orders/{order_id}")
def get_order_detail(order_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT o.*, q.cliente_nombre, q.cliente_tel
        FROM orders o
        LEFT JOIN quotes q ON q.id = o.quote_id
        WHERE o.id=%s
    """, (order_id,))
    o = cur.fetchone()
    if not o:
        conn.close()
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    cur.execute("SELECT * FROM payments WHERE order_id=%s ORDER BY id DESC", (order_id,))
    payments = cur.fetchall()

    # Fetch lines from quote
    cur.execute("""
        SELECT ql.*, p.codigo, p.modelo, p.tamano
        FROM quote_lines ql JOIN products p ON p.id=ql.product_id
        WHERE ql.quote_id=%s
    """, (o["quote_id"],))
    lines = cur.fetchall()

    conn.close()
    return {"order": o, "payments": payments, "lines": lines}

@router.patch("/orders/{order_id}")
async def update_order(order_id: int, data: OrderUpdate, request: Request):
    # Retrieve role from request - we'll assume it's passed or handled via headers/auth in actual implementation
    # For now, we'll check the 'X-Role' header if present, or default to admin for simplicity in tests
    role = request.headers.get("X-Role", "vendedor") 
    
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    cur.execute("SELECT folio, vendedor FROM orders WHERE id=%s", (order_id,))
    o_info = cur.fetchone()
    if not o_info:
        conn.close()
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    updates = []
    params = []
    
    if data.estatus is not None:
        if data.estatus.upper() == "ENTREGADO":
            cur.execute("SELECT saldo FROM orders WHERE id=%s", (order_id,))
            oCheck = cur.fetchone()
            if oCheck and round(float(oCheck["saldo"]), 2) > 0:
                conn.close()
                raise HTTPException(status_code=400, detail="El pedido no está liquidado, no se puede cambiar a ENTREGADO")
                
        if role == "admin":
            updates.append("estatus = %s")
            params.append(data.estatus)
            updates.append("estatus_solicitado = ''") # Clear any pending request
        else:
            # Vendedor can only "solicit"
            updates.append("estatus_solicitado = %s")
            params.append(data.estatus)
            
            from api.notifications import trigger_notification
            trigger_notification(
                "admin", "warning", "Autorización Solicitada", 
                f"El vendedor {o_info['vendedor']} solicitó cambiar el pedido {o_info['folio']} a {data.estatus}", 
                order_id
            )
            
    if data.nota is not None:
        updates.append("nota = %s")
        params.append(data.nota)
        
    if data.entrega_estimada is not None:
        updates.append("entrega_estimada = %s")
        params.append(data.entrega_estimada)

    if data.entrega_promesa is not None:
        if role == "admin":
            updates.append("entrega_promesa = %s")
            params.append(data.entrega_promesa)
        # Vendedores cannot change entrega_promesa
    
    if hasattr(data, "cp_envio") and data.cp_envio is not None:
        updates.append("cp_envio = %s")
        params.append(data.cp_envio)
        
    if hasattr(data, "costo_envio") and data.costo_envio is not None:
        updates.append("costo_envio = %s")
        params.append(data.costo_envio)
        
    if not updates:
        conn.close()
        return {"message": "No changes"}
        
    sql = f"UPDATE orders SET {', '.join(updates)} WHERE id = %s"
    params.append(order_id)
    
    cur.execute(sql, tuple(params))
    conn.commit()
    conn.close()
    return {"status": "success"}

@router.post("/orders/{order_id}/authorize")
def authorize_order_status(order_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    cur.execute("SELECT folio, estatus_solicitado FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    if not o or not o["estatus_solicitado"]:
        conn.close()
        raise HTTPException(status_code=400, detail="No hay cambio de estatus pendiente")
        
    new_status = o["estatus_solicitado"]
    cur.execute("UPDATE orders SET estatus=%s, estatus_solicitado='' WHERE id=%s", (new_status, order_id))
    
    from api.notifications import trigger_notification
    trigger_notification(
        "vendedor", "success", "Cambio Autorizado", 
        f"Se autorizó el cambio a {new_status} para el pedido {o['folio']}", 
        order_id
    )
    
    conn.commit()
    conn.close()
    return {"status": "success", "new_status": new_status}

@router.get("/orders/{order_id}/notes")
def get_order_notes(order_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM order_notes WHERE order_id=%s ORDER BY id DESC", (order_id,))
    notes = cur.fetchall()
    conn.close()
    return notes

@router.post("/orders/{order_id}/notes")
def add_order_note(order_id: int, data: OrderNoteCreate):
    from utils import today_iso
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        INSERT INTO order_notes(order_id, author, content, created_at)
        VALUES (%s, %s, %s, %s)
    """, (order_id, data.author, data.content, today_iso()))
    conn.commit()
    conn.close()
    return {"status": "success"}

