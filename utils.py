import datetime
import base64
import os
from database import db

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_image_b64(filename):
    """Reads an image from local paths or URLs and returns its base64 representation."""
    if not filename:
        return ""
    
    # Clean filename if it's a full localhost URL or has paths
    clean_filename = filename
    if "localhost:8000" in filename:
        clean_filename = filename.split("/")[-1]
    elif filename.startswith("http") and ("cloudinary" not in filename):
        # Also handle other potential local-bound URLs that just need the filename
        clean_filename = filename.split("/")[-1]
    
    # 1. Handle Remote URLs (True remote like Cloudinary)
    if filename.startswith(("http://", "https://")) and "localhost" not in filename:
        try:
            import requests
            resp = requests.get(filename, timeout=5)
            if resp.status_code == 200:
                content_type = resp.headers.get('content-type', 'image/jpeg')
                encoded_string = base64.b64encode(resp.content).decode()
                return f"data:{content_type};base64,{encoded_string}"
        except Exception as e:
            print(f"Error fetching remote image {filename}: {e}")
        # Even if remote fetch fails, try local if it looks like a filename
        if "/" not in clean_filename:
             pass 
        else:
            return ""

    # 2. Handle Local Files
    # Search paths: api/static/img, static/uploads, static
    search_paths = [
        os.path.join(BASE_DIR, "api", "static", "img", clean_filename),
        os.path.join(BASE_DIR, "static", "uploads", clean_filename),
        os.path.join(BASE_DIR, "static", clean_filename),
        os.path.join(BASE_DIR, clean_filename)
    ]
    
    for filepath in search_paths:
        if os.path.exists(filepath):
            try:
                with open(filepath, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode()
                ext = os.path.splitext(clean_filename)[1][1:].lower()
                if not ext: ext = 'jpeg'
                if ext == 'jpg': ext = 'jpeg'
                return f"data:image/{ext};base64,{encoded_string}"
            except Exception as e:
                print(f"Error reading local image {filepath}: {e}")
    
    return ""

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

    cur.execute("SELECT v FROM settings WHERE k='iva_automatico'")
    row_iva = cur.fetchone()
    iva_automatico = True if (row_iva and row_iva["v"] == '1') else False

    nivel = (utilidad_nivel or "media").strip().lower()
    cur.execute("SELECT multiplicador FROM utilidad_config WHERE nivel=%s", (nivel,))
    row_mul = cur.fetchone()
    multiplicador = float(row_mul["multiplicador"]) if row_mul else 1.45

    cfg = get_cfg_for_tamano(cur, tamano)
    
    costo_base = float(costo_fabricacion or 0) + flete
    costo_con_utilidad = costo_base * multiplicador
    precio_final = costo_con_utilidad + cfg["maniobras"] + cfg["empaque"] + cfg["comision"] + cfg["garantias"]

    if iva_automatico:
        precio_final = precio_final * 1.16

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

def get_image_path(filename):
    """Returns the absolute path for an image in static/img."""
    return os.path.join(BASE_DIR, "api", "static", "img", filename)
