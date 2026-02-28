import os
import datetime
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from database import db

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Constants
APP_NAME = "LP Mueblería de Jalisco"
SLOGAN = "Hecho en Jalisco, hecho para durar"
PHONE_DEFAULT = "8718784462"
DEPOSIT_PCT = 0.50
FAB_DAYS_DEFAULT = 25
QUOTE_VALID_DAYS = 30

def money(x):
    return f"${x:,.2f}"

def today_iso():
    return datetime.datetime.now().strftime("%Y-%m-%d")

def new_folio(prefix: str):
    now = datetime.datetime.now()
    return f"{prefix}-{now.strftime('%Y%m%d-%H%M%S')}"

def get_cfg_for_tamano(cur, tamano: str):
    cur.execute("SELECT * FROM cost_config WHERE tamano=%s", (tamano,))
    row = cur.fetchone()
    if not row:
        return {"maniobras": 0.0, "empaque": 0.0, "comision": 0.0, "garantias": 0.0}
    return {
        "maniobras": float(row["maniobras"] or 0),
        "empaque": float(row["empaque"] or 0),
        "comision": float(row["comision"] or 0),
        "garantias": float(row["garantias"] or 0)
    }

def calcular_precio_producto(cur, costo_fabricacion: float, tamano: str, utilidad_nivel: str) -> float:
    cur.execute("SELECT v FROM settings WHERE k='flete_unitario'")
    row_flete = cur.fetchone()
    flete = float(row_flete["v"]) if row_flete else 0.0

    nivel = (utilidad_nivel or "media").strip().lower()
    cur.execute("SELECT multiplicador FROM utilidad_config WHERE nivel=%s", (nivel,))
    row_mul = cur.fetchone()
    multiplicador = float(row_mul["multiplicador"]) if row_mul else 1.45

    cfg = get_cfg_for_tamano(cur, tamano)
    
    costo_base = float(costo_fabricacion or 0) + flete
    costo_con_utilidad = costo_base * multiplicador
    precio_final = costo_con_utilidad + cfg["maniobras"] + cfg["empaque"] + cfg["comision"] + cfg["garantias"]

    return round(precio_final, 2)

def compute_line_total(precio_unit: float, cantidad: int, desc_tipo: str|None, desc_val: float|None):
    subtotal = precio_unit * cantidad
    if not desc_tipo or desc_val is None:
        return subtotal
    if desc_tipo == "%":
        return max(0.0, subtotal * (1 - (desc_val/100.0)))
    if desc_tipo == "$":
        return max(0.0, subtotal - desc_val)
    return subtotal

def compute_bolsas(cur, quote_id: int):
    cur.execute("SELECT v FROM settings WHERE k='flete_unitario'")
    row_flete = cur.fetchone()
    flete_unitario = float(row_flete["v"]) if row_flete else 0.0

    cur.execute("""
        SELECT ql.*, p.tamano, p.costo_total
        FROM quote_lines ql
        JOIN products p ON p.id = ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()
    cur.execute("SELECT costo_envio FROM quotes WHERE id=%s", (quote_id,))
    q_info = cur.fetchone()
    costo_env = float(q_info["costo_envio"]) if q_info and q_info.get("costo_envio") else 0.0

    bols = {"maniobras": 0.0, "empaque": 0.0, "comision": 0.0, "garantias": 0.0, "costo": 0.0, "venta": 0.0, "muebles": 0.0, "fletes": 0.0, "envios": costo_env}
    for ln in lines:
        cfg = get_cfg_for_tamano(cur, ln["tamano"])
        qty = float(ln["cantidad"] or 0)
        bols["maniobras"] += cfg["maniobras"] * qty
        bols["empaque"] += cfg["empaque"] * qty
        bols["comision"] += cfg["comision"] * qty
        bols["garantias"] += cfg["garantias"] * qty
        bols["muebles"] += float(ln["costo_total"] or 0) * qty
        bols["fletes"] += flete_unitario * qty
        bols["costo"] += float(ln["costo_total"] or 0) * qty
        bols["venta"] += float(ln["total_linea"] or 0)
    bols["utilidad_bruta"] = float(bols["venta"]) - float(bols["costo"]) - \
                            (bols["maniobras"] + bols["empaque"] + bols["comision"] + bols["garantias"] + bols["fletes"])
    return bols

def render_quote_pdf(quote_id: int, out_path: str):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
    q = cur.fetchone()
    cur.execute("""
        SELECT ql.*, p.codigo, p.modelo
        FROM quote_lines ql JOIN products p ON p.id=ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()
    
    cur.execute("SELECT v FROM settings WHERE k='phone'")
    row_phone = cur.fetchone()
    phone = row_phone["v"] if row_phone else PHONE_DEFAULT
    
    cur.execute("SELECT v FROM settings WHERE k='quote_valid_days'")
    row_valid = cur.fetchone()
    valid_days = int(float(row_valid["v"])) if row_valid else QUOTE_VALID_DAYS

    cur.execute("SELECT v FROM settings WHERE k='fab_days_default'")
    row_fab = cur.fetchone()
    fab_days = int(float(row_fab["v"])) if row_fab else FAB_DAYS_DEFAULT
    conn.close()

    c = canvas.Canvas(out_path, pagesize=letter)
    width, height = letter

    y = height - 50
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, APP_NAME)
    y -= 18
    c.setFont("Helvetica", 11)
    c.drawString(50, y, SLOGAN)
    y -= 18
    c.drawString(50, y, f"Tel/WhatsApp: {phone}")
    y -= 24

    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, f"Cotización: {q['folio']}")
    c.setFont("Helvetica", 11)
    c.drawRightString(width-50, y, f"Fecha: {q['created_at'][:10]}")
    y -= 22

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Detalle")
    y -= 12
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "Código")
    c.drawString(110, y, "Descripción")
    c.drawRightString(width-200, y, "Cant.")
    c.drawRightString(width-140, y, "P.Unit")
    c.drawRightString(width-80, y, "Total")
    y -= 10
    c.line(50, y, width-50, y)
    y -= 14
    c.setFont("Helvetica", 9)

    for ln in lines:
        if y < 120:
            c.showPage()
            y = height - 60
        c.drawString(50, y, str(ln["codigo"]))
        c.drawString(110, y, str(ln["modelo"])[:48])
        c.drawRightString(width-200, y, str(ln["cantidad"]))
        c.drawRightString(width-140, y, money(float(ln["precio_unit"])))
        c.drawRightString(width-80, y, money(float(ln["total_linea"])))
        y -= 14

    y -= 8
    c.line(50, y, width-50, y)
    y -= 18
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width-50, y, f"Total: {money(float(q['total']))}")
    y -= 22

    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Tiempo estimado de fabricación: {fab_days} días")
    y -= 14
    c.drawString(50, y, f"Vigencia: {valid_days} días")
    y -= 14
    c.drawString(50, y, "Precios sujetos a cambio sin previo aviso.")
    c.save()

def render_receipt_pdf(order_id: int, out_path: str):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    qid = o["quote_id"]
    cur.execute("SELECT * FROM quotes WHERE id=%s", (qid,))
    q = cur.fetchone()
    cur.execute("""
        SELECT ql.*, p.codigo, p.modelo
        FROM quote_lines ql JOIN products p ON p.id=ql.product_id
        WHERE ql.quote_id=%s
    """, (qid,))
    lines = cur.fetchall()
    cur.execute("SELECT v FROM settings WHERE k='phone'")
    row_phone = cur.fetchone()
    phone = row_phone["v"] if row_phone else PHONE_DEFAULT
    conn.close()

    c = canvas.Canvas(out_path, pagesize=letter)
    width, height = letter
    y = height - 50
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, APP_NAME)
    y -= 18
    c.setFont("Helvetica", 11)
    c.drawString(50, y, SLOGAN)
    y -= 18
    c.drawString(50, y, f"Tel/WhatsApp: {phone}")
    y -= 24

    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, f"Pedido: {o['folio']}")
    c.setFont("Helvetica", 11)
    c.drawRightString(width-50, y, f"Fecha: {o['created_at'][:10]}")
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Estatus: {o['estatus']} | Entrega estimada: {o['entrega_estimada']}")
    y -= 18

    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "Código")
    c.drawString(110, y, "Descripción")
    c.drawRightString(width-200, y, "Cant.")
    c.drawRightString(width-140, y, "P.Unit")
    c.drawRightString(width-80, y, "Total")
    y -= 10
    c.line(50, y, width-50, y)
    y -= 14
    c.setFont("Helvetica", 9)

    for ln in lines:
        if y < 150:
            c.showPage()
            y = height - 60
        c.drawString(50, y, str(ln["codigo"]))
        c.drawString(110, y, str(ln["modelo"])[:48])
        c.drawRightString(width-200, y, str(ln["cantidad"]))
        c.drawRightString(width-140, y, money(float(ln["precio_unit"])))
        c.drawRightString(width-80, y, money(float(ln["total_linea"])))
        y -= 14

    y -= 8
    c.line(50, y, width-50, y)
    y -= 18
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width-50, y, f"Total: {money(float(o['total']))}")
    y -= 16
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width-50, y, f"Anticipo (50%): {money(float(o['anticipo_req']))}")
    y -= 16
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(width-50, y, f"Saldo (contra entrega): {money(float(o['saldo']))}")
    y -= 22

    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Precios sujetos a cambio sin previo aviso.")
    c.save()

def seed_from_excel(excel_path: str):
    if not os.path.exists(excel_path):
        return
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT COUNT(*) c FROM products")
    res_existing = cur.fetchone()
    if res_existing and res_existing["c"] > 0:
        conn.close()
        return

    costos = pd.read_excel(excel_path, sheet_name="Costos Muebles")
    datos_raw = pd.read_excel(excel_path, sheet_name="Datos", header=None)
    
    header_row = None
    for i in range(len(datos_raw)):
        if str(datos_raw.iloc[i,0]).strip().lower() == "gastos fijos de mueble":
            header_row = i
            break
            
    if header_row is not None:
        cfg = datos_raw.iloc[header_row:header_row+4, 0:5].copy()
        cfg.columns = ["label","maniobras","empaque","comision","garantias"]
        cfg = cfg.iloc[1:]
        for _,r in cfg.iterrows():
            tam = str(r["label"]).strip()
            cur.execute(
                "REPLACE INTO cost_config(tamano, maniobras, empaque, comision, garantias) VALUES (%s,%s,%s,%s,%s)",
                (tam, float(r["maniobras"]), float(r["empaque"]), float(r["comision"]), float(r["garantias"]))
            )

    for idx, r in costos.iterrows():
        modelo = str(r["Modelo"]).strip()
        tamano = str(r["Tipo de mueble"]).strip()
        precio = float(r["Precio Venta Sugerido"])
        costo_total = float(r["Costo Total"])
        codigo = f"LP{idx+1:04d}"
        cur.execute(
            "INSERT INTO products(codigo, modelo, tamano, precio_lista, costo_total) VALUES (%s,%s,%s,%s,%s)",
            (codigo, modelo, tamano, precio, costo_total)
        )
    conn.commit()
    conn.close()
