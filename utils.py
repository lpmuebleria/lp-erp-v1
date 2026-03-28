import datetime
import base64
import os
from database import db
import math

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

def calculate_rounding(amount: float) -> float:
    if not amount: return 0.0
    remainder = amount % 10
    if remainder < 1.0:
        return float((amount // 10) * 10)
    else:
        return float(math.ceil(amount / 10) * 10)

def calculate_bank_commission(cur, metodo: str, monto: float) -> float:
    if not metodo or not monto:
        return 0.0
    
    try:
        # Normalize method name (Greedy keyword match)
        mn = str(metodo).lower().replace("_", " ").strip()
        is_msi = "meses sin intereses" in mn or mn == "msi"
        is_any_card = is_msi or "tarjeta" in mn or mn in ["debito", "credito", "td", "tc"]
        
        # Get card base rate (typically 3%)
        cur.execute("SELECT v FROM settings WHERE k='comision_debito_pct'")
        res_card = cur.fetchone()
        card_rate = float(res_card["v"]) if res_card and res_card["v"] else 3.0

        if is_msi:
            # MSI: Bank financing rate (e.g. 18%) + Card base rate (3%) = 21% total
            cur.execute("SELECT v FROM settings WHERE k='comision_msi_banco_pct'")
            res_msi = cur.fetchone()
            msi_rate = float(res_msi["v"]) if res_msi and res_msi["v"] else 18.0
            
            total_rate = card_rate + msi_rate
            return round(float(monto) * (total_rate / 100.0), 2)
        elif is_any_card:
            return round(float(monto) * (card_rate / 100.0), 2)
        
        return 0.0
    except Exception:
        return 0.0

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

    return calculate_rounding(precio_final)

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
    cur.execute("SELECT k, v FROM settings WHERE k IN ('flete_unitario', 'comision_debito_pct', 'comision_msi_banco_pct', 'iva_automatico')")
    setts = {r["k"]: r["v"] for r in cur.fetchall()}
    flete_unitario = float(setts.get("flete_unitario", 0.0))
    comm_debito_pct = float(setts.get("comision_debito_pct", 0.0))
    comm_msi_pct = float(setts.get("comision_msi_banco_pct", 0.0))
    iva_auto = int(setts.get("iva_automatico", 1))

    cur.execute("""
        SELECT ql.*, p.tamano, p.costo_fabrica
        FROM quote_lines ql
        JOIN products p ON p.id = ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()
    
    # Try to find associated order for IVA, Envios and Bank Fees
    cur.execute("SELECT id, iva, costo_envio FROM orders WHERE quote_id=%s LIMIT 1", (quote_id,))
    order_info = cur.fetchone()
    
    costo_env = 0.0
    comision_tarjeta = 0.0
    comision_msi = 0.0

    if not order_info:
        # Fallback to quote info if no order yet
        cur.execute("SELECT costo_envio FROM quotes WHERE id=%s", (quote_id,))
        q_info = cur.fetchone()
        costo_env = float(q_info["costo_envio"]) if q_info and q_info.get("costo_envio") else 0.0
    else:
        costo_env = float(order_info["costo_envio"] or 0)
        # Sum bank commissions from payments by splitting debit vs msi
        cur.execute("SELECT metodo, monto, comision_bancaria FROM payments WHERE order_id=%s AND anulado=0", (order_info["id"],))
        payments = cur.fetchall()
        
        # Determine if order is MSI (if any line is MSI)
        cur.execute("SELECT COUNT(*) as c FROM quote_lines WHERE quote_id=%s AND tipo_precio='msi'", (quote_id,))
        is_msi_order = (cur.fetchone()["c"] > 0)

        for p in payments:
            mn = p["metodo"].lower().replace("_", " ").strip() if p["metodo"] else ""
            saved_comm = float(p["comision_bancaria"] or 0.0)
            monto_abono = float(p["monto"])

            is_msi = "meses sin intereses" in mn or mn == "msi"
            is_any_card = is_msi or "tarjeta" in mn or mn in ["debito", "credito", "td", "tc"]

            # All installment plans (MSI) go to MSI bag (they include terminal 3% + bank 18% = 21% total)
            if is_msi:
                comision_msi += saved_comm
            # All normal cards (Debit/Credit) go to 'comision_tarjeta'
            elif is_any_card:
                comision_tarjeta += saved_comm
            elif is_msi_order and mn == 'transferencia':
                 pass

    bols = {
        "maniobras": 0.0, "empaque": 0.0, "comision": 0.0, "garantias": 0.0, 
        "costo": 0.0, "venta": 0.0, "muebles": 0.0, "fletes": 0.0, 
        "envios": costo_env, "iva": 0.0, "comision_tarjeta": comision_tarjeta, "comision_msi": comision_msi
    }
    for ln in lines:
        cfg = get_cfg_for_tamano(cur, ln["tamano"])
        qty = float(ln["cantidad"] or 0)
        bols["maniobras"] += cfg["maniobras"] * qty
        bols["empaque"] += cfg["empaque"] * qty
        bols["comision"] += cfg["comision"] * qty
        bols["garantias"] += cfg["garantias"] * qty
        bols["muebles"] += float(ln["costo_fabrica"] or 0) * qty
        bols["fletes"] += flete_unitario * qty
        bols["costo"] += float(ln["costo_fabrica"] or 0) * qty
        bols["venta"] += float(ln["total_linea"] or 0)
    
    # IVA Calculation (16% of sale, extracted if automatic)
    if iva_auto:
        bols["iva"] = bols["venta"] - (bols["venta"] / 1.16)
    else:
        bols["iva"] = bols["venta"] * 0.16

    # Final Utility calculation: 
    # Venta - IVA - Bank Fees - Costo Fabrica - Config Costs (Maniobras etc) - Fletes - Envios
    bols["utilidad_bruta"] = (
        bols["venta"] - bols["iva"] - bols["comision_tarjeta"] - bols["comision_msi"] - 
        bols["muebles"] - (bols["maniobras"] + bols["empaque"] + bols["comision"] + bols["garantias"] + bols["fletes"])
    )
    return bols

def get_image_path(filename):
    """Returns the absolute path for an image in static/img."""
    return os.path.join(BASE_DIR, "api", "static", "img", filename)
