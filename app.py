from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

import mysql.connector
from mysql.connector import Error
import os
import datetime
import math

import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

APP_NAME = "LP Mueblería de Jalisco"
SLOGAN = "Hecho en Jalisco, hecho para durar"
PHONE = "8718784462"

QUOTE_VALID_DAYS = 30
FAB_DAYS_DEFAULT = 25
DEPOSIT_PCT = 0.50

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "lp_erp.sqlite")
EXCEL_DEFAULT = os.path.join(BASE_DIR, "Muebleria Torreón.xlsx")


# --- MySQL Connection Config ---
MYSQL_CONFIG = {
    'user': 'root',
    'password': '643643',
    'host': 'Lugo7',
    'database': 'lp_erp',
    'port': 3306,
    'raise_on_warnings': False
}

def db():
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        raise

def col_exists(cur, table: str, col: str) -> bool:
    cur.execute(f"SHOW COLUMNS FROM `{table}` LIKE '{col}'")
    return cur.fetchone() is not None


def migrate_products(cur):
    # Campos comerciales por producto (si la BD ya existía)
    if not col_exists(cur, "products", "stock"):
        cur.execute("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "maniobras"):
        cur.execute("ALTER TABLE products ADD COLUMN maniobras REAL NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "empaque"):
        cur.execute("ALTER TABLE products ADD COLUMN empaque REAL NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "comision"):
        cur.execute("ALTER TABLE products ADD COLUMN comision REAL NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "garantias"):
        cur.execute("ALTER TABLE products ADD COLUMN garantias REAL NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "utilidad_nivel"):
        cur.execute("ALTER TABLE products ADD COLUMN utilidad_nivel TEXT NOT NULL DEFAULT 'media'")


def migrate_quotes(cur):
    # Para búsqueda por nombre y captura en cotización
    if not col_exists(cur, "quotes", "cliente_nombre"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_nombre TEXT")
    if not col_exists(cur, "quotes", "cliente_tel"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_tel TEXT")
    if not col_exists(cur, "quotes", "cliente_email"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_email TEXT")

def migrate_orders(cur):
    # Para tipo de pedido / venta
    if not col_exists(cur, "orders", "tipo"):
        cur.execute("ALTER TABLE orders ADD COLUMN tipo TEXT NOT NULL DEFAULT 'VENTA_STOCK'")
            # Apartados: control de vencimiento y prórrogas (admin)
    if not col_exists(cur, "orders", "apartado_vence"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_vence TEXT NOT NULL DEFAULT ''")

    if not col_exists(cur, "orders", "apartado_prorroga_dias"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_prorroga_dias INTEGER NOT NULL DEFAULT 0")

    if not col_exists(cur, "orders", "apartado_liberado"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_liberado INTEGER NOT NULL DEFAULT 0")

def migrate_payments(cur):
    if not col_exists(cur, "payments", "anulado"):
        cur.execute("ALTER TABLE payments ADD COLUMN anulado INTEGER NOT NULL DEFAULT 0")

    if not col_exists(cur, "payments", "motivo_anulacion"):
        cur.execute("ALTER TABLE payments ADD COLUMN motivo_anulacion TEXT NOT NULL DEFAULT ''")
    
    # Nota simple ligada al pedido
    if not col_exists(cur, "orders", "nota"):
        cur.execute("ALTER TABLE orders ADD COLUMN nota TEXT NOT NULL DEFAULT ''")

    # Estatus solicitado por vendedor (requiere autorización admin)
    if not col_exists(cur, "orders", "estatus_solicitado"):
        cur.execute("ALTER TABLE orders ADD COLUMN estatus_solicitado TEXT NOT NULL DEFAULT ''")

def init_db():
    conn = db()
    cur = conn.cursor(dictionary=True)

    # 1) Crear tablas base (uno por uno)
    tables = [
        """CREATE TABLE IF NOT EXISTS products(
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo VARCHAR(255) UNIQUE NOT NULL,
            modelo TEXT NOT NULL,
            tamano VARCHAR(255) NOT NULL, -- Chico/Mediano/Grande
            precio_lista DECIMAL(15,2) NOT NULL,
            costo_total DECIMAL(15,2) NOT NULL,
            activo INT NOT NULL DEFAULT 1
        )""",
        """CREATE TABLE IF NOT EXISTS utilidad_config(
            nivel VARCHAR(255) PRIMARY KEY,      -- baja/media/alta
            multiplicador DECIMAL(15,2) NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS cost_config(
            tamano VARCHAR(255) PRIMARY KEY,
            maniobras DECIMAL(15,2) NOT NULL,
            empaque DECIMAL(15,2) NOT NULL,
            comision DECIMAL(15,2) NOT NULL,
            garantias DECIMAL(15,2) NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS settings(
            k VARCHAR(255) PRIMARY KEY,
            v TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS customers(
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre TEXT NOT NULL,
            telefono VARCHAR(255),
            direccion TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS quotes(
            id INT AUTO_INCREMENT PRIMARY KEY,
            folio VARCHAR(255) UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            customer_id INT,
            vendedor TEXT NOT NULL,
            descuento_global_tipo VARCHAR(20),
            descuento_global_val DECIMAL(15,2),
            total DECIMAL(15,2) NOT NULL,
            notas TEXT,
            status VARCHAR(100) NOT NULL DEFAULT 'COTIZACION',
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )""",
        """CREATE TABLE IF NOT EXISTS quote_lines(
            id INT AUTO_INCREMENT PRIMARY KEY,
            quote_id INT NOT NULL,
            product_id INT NOT NULL,
            cantidad INT NOT NULL,
            precio_unit DECIMAL(15,2) NOT NULL,
            descuento_tipo VARCHAR(20), -- % or $
            descuento_val DECIMAL(15,2),
            total_linea DECIMAL(15,2) NOT NULL,
            FOREIGN KEY(quote_id) REFERENCES quotes(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )""",
        """CREATE TABLE IF NOT EXISTS orders(
            id INT AUTO_INCREMENT PRIMARY KEY,
            folio VARCHAR(255) UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            quote_id INT,
            customer_id INT,
            vendedor TEXT NOT NULL,
            total DECIMAL(15,2) NOT NULL,
            anticipo_req DECIMAL(15,2) NOT NULL,
            anticipo_pagado DECIMAL(15,2) NOT NULL DEFAULT 0,
            saldo DECIMAL(15,2) NOT NULL,
            estatus VARCHAR(100) NOT NULL DEFAULT 'Registrado',
            entrega_estimada TEXT NOT NULL,
            tipo VARCHAR(100) NOT NULL DEFAULT 'VENTA_STOCK',
            nota TEXT NOT NULL,
            FOREIGN KEY(quote_id) REFERENCES quotes(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )""",
        """CREATE TABLE IF NOT EXISTS payments(
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            created_at TEXT NOT NULL,
            metodo VARCHAR(100) NOT NULL, -- efectivo/debito/credito/transferencia
            monto DECIMAL(15,2) NOT NULL,
            referencia VARCHAR(255),
            efectivo_recibido DECIMAL(15,2),
            cambio DECIMAL(15,2),
            anulado INT NOT NULL DEFAULT 0,
            motivo_anulacion TEXT NOT NULL,                      
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )""",
        """CREATE TABLE IF NOT EXISTS deliveries(
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            fecha VARCHAR(20) NOT NULL,
            turno VARCHAR(20) NOT NULL, -- MANANA / TARDE
            created_at TEXT NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id)   
        )""",
        """CREATE TABLE IF NOT EXISTS users(
            username VARCHAR(255) PRIMARY KEY,
            pin VARCHAR(20) NOT NULL,
            rol VARCHAR(50) NOT NULL, -- admin/vendedor
            password VARCHAR(255)
        )"""
    ]
    for sql in tables:
        cur.execute(sql)

    # 2) Migraciones (ALTER TABLE seguros)
    migrate_orders(cur)
    migrate_products(cur)
    migrate_quotes(cur)
    migrate_payments(cur)

    # 2.1) Migración segura users.password (por si tu BD vieja no lo traía)
    if not col_exists(cur, "users", "password"):
        cur.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255)")

    # 2.2) Asegurar valores por defecto en productos existentes (solo si existen columnas)
    if col_exists(cur, "products", "stock"):
        cur.execute("UPDATE products SET stock = 0 WHERE stock IS NULL")
    if col_exists(cur, "products", "maniobras"):
        cur.execute("UPDATE products SET maniobras = 0 WHERE maniobras IS NULL")
    if col_exists(cur, "products", "empaque"):
        cur.execute("UPDATE products SET empaque = 0 WHERE empaque IS NULL")
    if col_exists(cur, "products", "comision"):
        cur.execute("UPDATE products SET comision = 0 WHERE comision IS NULL")
    if col_exists(cur, "products", "garantias"):
        cur.execute("UPDATE products SET garantias = 0 WHERE garantias IS NULL")
    if col_exists(cur, "products", "utilidad_nivel"):
        cur.execute("UPDATE products SET utilidad_nivel = 'media' WHERE utilidad_nivel IS NULL")

    # 3) Seeds básicos (si no existen)
    cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('baja',1.30)")
    cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('media',1.45)")
    cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('alta',1.60)")

    # Settings default
    defaults = {
        "deposit_pct": str(DEPOSIT_PCT),
        "fab_days_default": str(FAB_DAYS_DEFAULT),
        "quote_valid_days": str(QUOTE_VALID_DAYS),
        "phone": PHONE,
        "flete_unitario": "1200",
    }
    for k, v in defaults.items():
        cur.execute("INSERT IGNORE INTO settings(k,v) VALUES (%s,%s)", (k, v))

    # Usuarios default (con password para admin)
    cur.execute("INSERT IGNORE INTO users(username,pin,rol,password) VALUES ('admin','9999','admin','admin123')")
    cur.execute("INSERT IGNORE INTO users(username,pin,rol,password) VALUES ('vendedor','1234','vendedor',NULL)")
    cur.execute("UPDATE users SET password='admin123' WHERE username='admin' AND (password IS NULL OR password='')")

    conn.commit()
    conn.close()


# --- App / Templates / Middleware (DEBE ir antes de usar @app...) ---
app = FastAPI(title="LP ERP V1")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
print(">>> BASE_DIR =", BASE_DIR)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
app.add_middleware(SessionMiddleware, secret_key="LP-ERP-SECRET-CHANGE-ME")


def seed_from_excel(excel_path: str):
    if not os.path.exists(excel_path):
        return
    conn = db()
    cur = conn.cursor(dictionary=True)
    # do not reseed if products exist
    cur.execute("SELECT COUNT(*) c FROM products")
    res_existing = cur.fetchone()
    existing = res_existing["c"] if res_existing else 0
    if existing > 0:
        conn.close()
        return

    costos = pd.read_excel(excel_path, sheet_name="Costos Muebles")
    # cost config table from Datos sheet
    datos_raw = pd.read_excel(excel_path, sheet_name="Datos", header=None)
    # locate header row containing 'Gastos fijos de mueble'
    header_row = None
    for i in range(len(datos_raw)):
        if str(datos_raw.iloc[i,0]).strip().lower() == "gastos fijos de mueble":
            header_row = i
            break
    if header_row is not None:
        cfg = datos_raw.iloc[header_row:header_row+4, 0:5].copy()
        cfg.columns = ["label","maniobras","empaque","comision","garantias"]
        cfg = cfg.iloc[1:]  # drop header
        for _,r in cfg.iterrows():
            tam = str(r["label"]).strip()
            cur.execute(
                "REPLACE INTO cost_config(tamano, maniobras, empaque, comision, garantias) VALUES (%s,%s,%s,%s,%s)",
                (tam, float(r["maniobras"]), float(r["empaque"]), float(r["comision"]), float(r["garantias"]))
            )

    # seed products with generated codes
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

def money(x):
    return f"${x:,.2f}"

def today_iso():
    return datetime.datetime.now().strftime("%Y-%m-%d")

def new_folio(prefix: str):
    # prefix like COT or PED
    now = datetime.datetime.now()
    return f"{prefix}-{now.strftime('%Y%m%d-%H%M%S')}"
def calcular_precio_producto(
    cur,
    costo_fabricacion: float,
    tamano: str,
    utilidad_nivel: str
) -> float:
    """
    Precio final =
        ((costo_fabricacion + flete_unitario) * multiplicador_utilidad)
        + maniobras + empaque + comision + garantias
    """

    # 1) flete_unitario desde settings (default 0 si falta)
    cur.execute("SELECT v FROM settings WHERE k='flete_unitario'")
    row_flete = cur.fetchone()
    flete = float(row_flete["v"]) if row_flete else 0.0

    # 2) multiplicador desde utilidad_config (default 1.45 si falta)
    nivel = (utilidad_nivel or "media").strip().lower()
    cur.execute(
        "SELECT multiplicador FROM utilidad_config WHERE nivel=%s",
        (nivel,)
    )
    row_mul = cur.fetchone()
    multiplicador = float(row_mul["multiplicador"]) if row_mul else 1.45

    # 3) indirectos por tamaño desde cost_config (default 0 si falta)
    t = (tamano or "").strip()
    cur.execute(
        "SELECT maniobras, empaque, comision, garantias FROM cost_config WHERE tamano=%s",
        (t,)
    )
    row_ind = cur.fetchone()

    if row_ind:
        maniobras = float(row_ind["maniobras"] or 0)
        empaque = float(row_ind["empaque"] or 0)
        comision = float(row_ind["comision"] or 0)
        garantias = float(row_ind["garantias"] or 0)
    else:
        maniobras = empaque = comision = garantias = 0.0

    # 4) cálculo final
    costo_base = float(costo_fabricacion or 0) + flete
    costo_con_utilidad = costo_base * multiplicador
    precio_final = costo_con_utilidad + maniobras + empaque + comision + garantias

    # Redondeo a 2 decimales
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

def compute_bolsas(cur, quote_id: int):
    # returns totals for maniobras/empaque/comision/garantias and utilidad estimada (sin indirectos por ahora)
    cur.execute("""
        SELECT ql.*, p.tamano, p.costo_total
        FROM quote_lines ql
        JOIN products p ON p.id = ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()
    bols = {"maniobras": 0.0, "empaque": 0.0, "comision": 0.0, "garantias": 0.0, "costo": 0.0, "venta": 0.0}
    for ln in lines:
        cfg = get_cfg_for_tamano(cur, ln["tamano"])
        # treat these as per-piece expenses
        qty = float(ln["cantidad"] or 0)
        bols["maniobras"] += cfg["maniobras"] * qty
        bols["empaque"] += cfg["empaque"] * qty
        bols["comision"] += cfg["comision"] * qty
        bols["garantias"] += cfg["garantias"] * qty
        bols["costo"] += float(ln["costo_total"] or 0) * qty
        bols["venta"] += float(ln["total_linea"] or 0)
    bols["utilidad_bruta"] = float(bols["venta"]) - float(bols["costo"]) - (
        float(bols["maniobras"]) + float(bols["empaque"]) + float(bols["comision"]) + float(bols["garantias"])
    )
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
    phone = row_phone["v"] if row_phone else ""
    
    cur.execute("SELECT v FROM settings WHERE k='quote_valid_days'")
    row_valid = cur.fetchone()
    valid_days = int(float(row_valid["v"])) if row_valid else 30

    cur.execute("SELECT v FROM settings WHERE k='fab_days_default'")
    row_fab = cur.fetchone()
    fab_days = int(float(row_fab["v"])) if row_fab else 25
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
    phone = row_phone["v"] if row_phone else ""
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


@app.on_event("startup")
def startup():
    init_db()
    seed_from_excel(EXCEL_DEFAULT)
# -------------------------
# LOGIN / LOGOUT
# -------------------------

def is_logged(request: Request):
    return bool(request.session.get("user"))

def require_login(request: Request, role: str | None = None):
    if not is_logged(request):
        return RedirectResponse("/login", status_code=303)
    if role and request.session.get("role") != role:
        return RedirectResponse("/login", status_code=303)
    return None

@app.get("/login", response_class=HTMLResponse)
def login_get(request: Request):
    if is_logged(request):
        return RedirectResponse("/", status_code=303)
    return templates.TemplateResponse("login.html", {"request": request, "error": None})

@app.post("/login")
def login_post(
    request: Request,
    mode: str = Form(...),   # admin o pin
    username: str = Form(""),
    password: str = Form(""),
    pin: str = Form(""),
):
    conn = db()
    cur = conn.cursor(dictionary=True)

    if mode == "admin":
        cur.execute(
            "SELECT * FROM users WHERE username=%s AND rol='admin'",
            (username.strip(),)
        )
        u = cur.fetchone()

        pwd = ""
        if u:
            try:
                pwd = u["password"] if ("password" in u.keys()) else ""
            except Exception:
                pwd = ""

        if (not u) or ((pwd or "") != password):
            conn.close()
            return templates.TemplateResponse(
                "login.html",
                {"request": request, "error": "Usuario o contraseña incorrectos."}
            )

        request.session["user"] = u["username"]
        request.session["role"] = "admin"
        conn.close()
        return RedirectResponse("/", status_code=303)

    if mode == "pin":
        cur.execute(
            "SELECT * FROM users WHERE pin=%s AND rol='vendedor'",
            (pin.strip(),)
        )
        u = cur.fetchone()

        if not u:
            conn.close()
            return templates.TemplateResponse(
                "login.html",
                {"request": request, "error": "PIN incorrecto."}
            )

        request.session["user"] = u["username"]
        request.session["role"] = "vendedor"
        conn.close()
        return RedirectResponse("/vendedor/nueva", status_code=303)

    conn.close()
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": "Modo inválido."}
    )

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    guard = require_login(request)
    if guard: return guard

    role = request.session.get("role", "")
    user = request.session.get("user", "")

    metrics = None

    if role == "admin":
        conn = db()
        cur = conn.cursor(dictionary=True)

        today = datetime.date.today().isoformat()
        month_start = datetime.date.today().replace(day=1).isoformat()

        cur.execute(
            "SELECT total, anticipo_pagado FROM orders WHERE date(created_at)=date(%s)",
            (today,)
        )
        rows_day = cur.fetchall()

        cur.execute(
            "SELECT total, anticipo_pagado FROM orders WHERE date(created_at) BETWEEN date(%s) AND date(%s)",
            (month_start, today)
        )
        rows_month = cur.fetchall()

        ventas_hoy = sum(float(r["total"]) for r in rows_day)
        anticipos_hoy = sum(float(r["anticipo_pagado"]) for r in rows_day)

        ventas_mes = sum(float(r["total"]) for r in rows_month)
        anticipos_mes = sum(float(r["anticipo_pagado"]) for r in rows_month)

        cur.execute("""
            SELECT estatus, COUNT(*) cnt
            FROM orders
            GROUP BY estatus
        """)
        estatus_rows = cur.fetchall()

        pedidos_por_estatus = {r["estatus"]: int(r["cnt"]) for r in estatus_rows}

        cur.execute(
            "SELECT COUNT(*) c FROM quotes WHERE date(created_at)=date(%s)",
            (today,)
        )
        cot_hoy_row = cur.fetchone()
        cot_hoy = cot_hoy_row["c"] if cot_hoy_row else 0

        utilidad_bruta_mes = 0.0
        cur.execute("""
            SELECT quote_id FROM orders
            WHERE date(created_at) BETWEEN date(%s) AND date(%s)
        """, (month_start, today))
        qids = cur.fetchall()

        for r in qids:
            b = compute_bolsas(cur, r["quote_id"])
            utilidad_bruta_mes += float(b.get("utilidad_bruta", 0.0))

        conn.close()

        metrics = {
            "today": today,
            "ventas_hoy": ventas_hoy,
            "anticipos_hoy": anticipos_hoy,
            "ventas_mes": ventas_mes,
            "anticipos_mes": anticipos_mes,
            "cot_hoy": int(cot_hoy),
            "utilidad_bruta_mes": utilidad_bruta_mes,
            "pedidos_por_estatus": pedidos_por_estatus,
        }

    return templates.TemplateResponse("home.html", {
        "request": request,
        "role": role,
        "user": user,
        "metrics": metrics,
        "money": money,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "DEPOSIT_PCT": DEPOSIT_PCT,
        "FAB_DAYS_DEFAULT": FAB_DAYS_DEFAULT,
        "QUOTE_VALID_DAYS": QUOTE_VALID_DAYS,
    "active": "dashboard",
    })

@app.get("/venta", response_class=HTMLResponse)
def venta_get(request: Request, q: str = ""):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    user = request.session.get("user", "")

    q_clean = (q or "").strip()
    results = []

    if q_clean:
        conn = db()
        cur = conn.cursor(dictionary=True)

        # Si parece folio (contiene "COT-"), busca por folio exacto o parcial
        if "COT" in q_clean.upper():
            like = f"%{q_clean}%"
            cur.execute("""
                SELECT id, folio, created_at, vendedor, total, status, customer_id
                FROM quotes
                WHERE folio LIKE %s
                ORDER BY created_at DESC
                LIMIT 20
            """, (like,))
            results = cur.fetchall()
                
        else:
            like = f"%{q_clean}%"
            cur.execute("""
                SELECT id, folio, created_at, vendedor, total, status, customer_id, cliente_nombre
                FROM quotes
                WHERE (cliente_nombre LIKE %s OR folio LIKE %s)
                ORDER BY created_at DESC
                LIMIT 20
            """, (like, like))
            results = cur.fetchall()


        conn.close()

    return templates.TemplateResponse("venta.html", {
        "request": request,
        "role": role,
        "user": user,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "venta",
        "q": q_clean,
        "results": results,
        "money": money,
    })

@app.get("/venta/nueva", response_class=HTMLResponse)
def venta_directa_form(request: Request):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    products = cur.execute("""
        SELECT id, codigo, modelo, tamano, precio_lista, stock, activo
        FROM products
        WHERE activo=1
        ORDER BY modelo ASC
    """).fetchall()

    conn.close()

    return templates.TemplateResponse("venta_directa.html", {
        "request": request,
        "products": products,
        "money": money,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
        "active": "venta",
    })

@app.post("/venta/crear")
async def venta_directa_crear(
    request: Request,
    cliente_nombre: str = Form(...),
    cliente_tel: str = Form(...),
    cliente_email: str = Form(""),
    descuento: float = Form(0.0),
    nota: str = Form(""),
):
    guard = require_login(request)
    if guard:
        return guard

    vendedor = request.session.get("user", "") or "vendedor"

    cliente_nombre = (cliente_nombre or "").strip()
    cliente_tel = (cliente_tel or "").strip()
    cliente_email = (cliente_email or "").strip()
    nota = (nota or "").strip()

    try:
        descuento = float(descuento or 0)
    except Exception:
        descuento = 0.0

    form = await request.form()

    conn = db()
    cur = conn.cursor(dictionary=True)

    prods = cur.execute("""
        SELECT id, precio_lista
        FROM products
        WHERE activo=1
    """).fetchall()

    lineas = []
    subtotal = 0.0

    for p in prods:
        pid = int(p["id"])
        key = f"qty_{pid}"
        qty_raw = (form.get(key) or "0").strip()

        try:
            qty = int(qty_raw)
        except Exception:
            qty = 0

        if qty <= 0:
            continue

        precio = float(p["precio_lista"] or 0)
        importe = precio * qty

        lineas.append((pid, qty, precio, importe))
        subtotal += importe

    if not lineas:
        conn.close()
        return RedirectResponse("/venta/nueva", status_code=303)

    total = subtotal - descuento
    if total < 0:
        total = 0.0

    total = round(total, 2)

    anticipo_req = round(total * float(DEPOSIT_PCT), 2)
    anticipo_pagado = 0.0
    saldo = round(total - anticipo_pagado, 2)

    created_at = datetime.datetime.now().isoformat(timespec="seconds")

    # Crear cotización interna
    folio_q = "VDQ-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    cur.execute("""
        INSERT INTO quotes(folio, created_at, vendedor, total, status, cliente_nombre, cliente_tel, cliente_email)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        folio_q,
        created_at,
        vendedor,
        total,
        "PEDIDO",
        cliente_nombre,
        cliente_tel,
        cliente_email
    ))
    quote_id = cur.lastrowid

    # Insertar líneas
    for pid, qty, precio, importe in lineas:
        cur.execute("""
            INSERT INTO quote_lines(
                quote_id,
                product_id,
                cantidad,
                precio_unit,
                descuento_tipo,
                descuento_val,
                total_linea
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            quote_id,
            pid,
            qty,
            precio,
            None,
            None,
            importe
        ))

    # Crear pedido
    folio_o = "VD-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    cur.execute("""
    INSERT INTO orders(
        folio,
        created_at,
        quote_id,
        vendedor,
        total,
        anticipo_req,
        anticipo_pagado,
        saldo,
        estatus,
        entrega_estimada,
        tipo,
        nota
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""", (
    folio_o,
    created_at,
    quote_id,
    vendedor,
    total,
    anticipo_req,
    anticipo_pagado,
    saldo,
    "REGISTRADO",
    "",            # entrega_estimada requerida por la BD
    "VENTA_STOCK",
    nota
))

    order_id = cur.lastrowid

    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/venta/convertir")
def convertir_a_pedido(request: Request, quote_id: int = Form(...)):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    # 1) Obtener cotización
    cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
    q = cur.fetchone()
    if not q:
        conn.close()
        return RedirectResponse("/venta", status_code=303)

    q = dict(q)

    # 2) Datos base del pedido (por ahora sin pago)
    total = float(q["total"])
    anticipo_req = total * DEPOSIT_PCT
    anticipo_pagado = 0.0
    saldo = total

    folio = new_folio("PED")
    created_at = datetime.datetime.now().isoformat(timespec="seconds")
    entrega = (datetime.date.today() + datetime.timedelta(days=FAB_DAYS_DEFAULT)).isoformat()

    # 3) Insertar pedido
    cur.execute(
        """INSERT INTO orders(
            folio,created_at,quote_id,customer_id,vendedor,total,
            anticipo_req,anticipo_pagado,saldo,entrega_estimada,tipo,estatus
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            folio,
            created_at,
            int(quote_id),
            None,
            q["vendedor"],
            total,
            anticipo_req,
            anticipo_pagado,
            saldo,
            entrega,
            "VENTA_STOCK",
            "Registrado",
        )
    )

    oid = cur.lastrowid

    # 4) Marcar cotización como PEDIDO
    cur.execute("UPDATE quotes SET status='PEDIDO' WHERE id=%s", (quote_id,))

    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{oid}", status_code=303)

@app.get("/inventario", response_class=HTMLResponse)
def inventario(request: Request, q: str = ""):
    guard = require_login(request)
    if guard: 
        return guard

    role = request.session.get("role", "")
    conn = db()
    cur = conn.cursor(dictionary=True)

    q_clean = (q or "").strip()
    if q_clean:
        like = f"%{q_clean}%"
        cur.execute("""
            SELECT * FROM products
            WHERE (codigo LIKE %s OR modelo LIKE %s)
            ORDER BY activo DESC, codigo
            LIMIT 200
        """, (like, like))
        rows = cur.fetchall()
    else:
        cur.execute("""
            SELECT * FROM products
            ORDER BY activo DESC, codigo
            LIMIT 200
        """)
        rows = cur.fetchall()

    conn.close()
    return templates.TemplateResponse("inventario.html", {
        "request": request,
        "rows": rows,
        "q": q_clean,
        "role": role,
        "money": money,
        "APP_NAME": APP_NAME,
        "user": request.session.get("user",""),
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "inventario",
    })

from fastapi.responses import HTMLResponse
from fastapi import Request

@app.get("/pedidos", response_class=HTMLResponse)
def pedidos_get(request: Request, q: str = "", estatus: str = "", tipo: str = ""):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    user = request.session.get("user", "")

    q_clean = (q or "").strip()
    estatus_clean = (estatus or "").strip()
    tipo_clean = (tipo or "").strip()

    conn = db()
    cur = conn.cursor(dictionary=True)

    if q_clean:
        like = f"%{q_clean}%"
        cur.execute("""
            SELECT
                o.id, o.folio, o.created_at, o.vendedor,
                o.total, o.anticipo_pagado, o.saldo,
                o.entrega_estimada, o.estatus, o.tipo, o.nota, o.estatus_solicitado,
                q.cliente_nombre
            FROM orders o
            LEFT JOIN quotes q ON q.id = o.quote_id
            WHERE (
                o.folio LIKE %s
                OR IFNULL(q.cliente_nombre,'') LIKE %s
            )
            AND (%s = '' OR o.estatus = %s)
            AND (%s = '' OR o.tipo = %s)
            ORDER BY o.created_at DESC
            LIMIT 200
        """, (like, like, estatus_clean, estatus_clean, tipo_clean, tipo_clean))
        rows = cur.fetchall()
    else:
        cur.execute("""
            SELECT
                o.id, o.folio, o.created_at, o.vendedor,
                o.total, o.anticipo_pagado, o.saldo,
                o.entrega_estimada, o.estatus, o.tipo, o.nota, o.estatus_solicitado,
                q.cliente_nombre
            FROM orders o
            LEFT JOIN quotes q ON q.id = o.quote_id
            WHERE 1=1
            AND (%s = '' OR o.estatus = %s)
            AND (%s = '' OR o.tipo = %s)
            ORDER BY o.created_at DESC
            LIMIT 200
        """, (estatus_clean, estatus_clean, tipo_clean, tipo_clean))
        rows = cur.fetchall()

    conn.close()

    return templates.TemplateResponse("pedidos.html", {
        "request": request,
        "rows": rows,
        "q": q_clean,
        "estatus": estatus_clean,
        "tipo": tipo_clean,
        "money": money,
        "role": role,
        "user": user,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "pedidos",
    })

@app.get("/agenda", response_class=HTMLResponse)
def agenda_get(request: Request, fecha: str = ""):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    # Fecha por defecto = hoy (YYYY-MM-DD)
    if not (fecha or "").strip():
        fecha = datetime.date.today().isoformat()

    cur.execute("""
        SELECT
            d.id,
            d.fecha,
            d.turno,
            d.created_at,
            o.id as order_id,
            o.folio,
            o.estatus,
            o.tipo,
            o.total,
            o.saldo,
            q.cliente_nombre,
            q.cliente_tel
        FROM deliveries d
        JOIN orders o ON o.id = d.order_id
        LEFT JOIN quotes q ON q.id = o.quote_id
        WHERE d.fecha = %s
        ORDER BY d.turno ASC, d.created_at ASC
    """, (fecha,))
    rows = cur.fetchall()

    # Conteos por turno para mostrar cupos
    cur.execute("SELECT COUNT(*) c FROM deliveries WHERE fecha=%s AND turno='MANANA'", (fecha,))
    row_man = cur.fetchone()
    man = row_man["c"] if row_man else 0

    cur.execute("SELECT COUNT(*) c FROM deliveries WHERE fecha=%s AND turno='TARDE'", (fecha,))
    row_tar = cur.fetchone()
    tar = row_tar["c"] if row_tar else 0

    conn.close()

    return templates.TemplateResponse("agenda.html", {
        "request": request,
        "fecha": fecha,
        "rows": rows,
        "manana_count": man,
        "tarde_count": tar,
        "money": money,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
        "active": "agenda",
    })

@app.post("/pedido/{order_id}/agendar")
def agendar_post(
    request: Request,
    order_id: int,
    fecha: str = Form(...),
    turno: str = Form(...),
):
    guard = require_login(request)
    if guard:
        return guard

    fecha = (fecha or "").strip()
    turno = (turno or "").strip().upper()

    if turno not in {"MANANA", "TARDE"}:
        return RedirectResponse(f"/pedido/{order_id}/agendar", status_code=303)

    conn = db()
    cur = conn.cursor(dictionary=True)

    o = cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,)).fetchone()
    if not o:
        conn.close()
        return RedirectResponse("/pedidos", status_code=303)

    o = dict(o)

    # Reglas de negocio (por ahora)
    if o["tipo"] != "VENTA_STOCK" or float(o["saldo"] or 0) > 0:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    if (o.get("entrega_estimada") or "").strip():
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Límite por turno
    cur.execute(
        "SELECT COUNT(*) c FROM deliveries WHERE fecha=%s AND turno=%s",
        (fecha, turno)
    )
    c = cur.fetchone()
    cupos = int(c["c"] or 0)

    if cupos >= 5:
        conn.close()
        # por ahora solo regresamos al formulario (luego ponemos mensaje bonito)
        return RedirectResponse(f"/pedido/{order_id}/agendar", status_code=303)

    created_at = datetime.datetime.now().isoformat(timespec="seconds")

    # Insertar delivery
    cur.execute(
        "INSERT INTO deliveries(order_id, fecha, turno, created_at) VALUES (%s,%s,%s,%s)",
        (order_id, fecha, turno, created_at)
    )

    # Guardar texto en pedido (simple)
    entrega_texto = f"{fecha} {turno}"
    cur.execute(
        "UPDATE orders SET entrega_estimada=%s, estatus=%s WHERE id=%s",
        (entrega_texto, "PROGRAMADO", order_id)
    )

    conn.commit()
    conn.close()

    return RedirectResponse("/agenda?fecha=" + fecha, status_code=303)

@app.get("/config/comercial", response_class=HTMLResponse)
def config_comercial_get(request: Request):
    guard = require_login(request, "admin")
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    # flete_unitario
    cur.execute("SELECT v FROM settings WHERE k='flete_unitario'")
    row = cur.fetchone()
    flete_unitario = row["v"] if row else "0"

    # cost_config (Chico/Mediano/Grande)
    cur.execute("SELECT * FROM cost_config ORDER BY tamano")
    cost_rows = cur.fetchall()

    # utilidad_config (baja/media/alta)
    cur.execute("SELECT * FROM utilidad_config ORDER BY nivel")
    util_rows = cur.fetchall()

    conn.close()

    return templates.TemplateResponse("config_comercial.html", {
        "request": request,
        "flete_unitario": flete_unitario,
        "cost_rows": cost_rows,
        "util_rows": util_rows,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "user": request.session.get("user",""),
        "active": "config_comercial",
    })


@app.post("/config/comercial")
def config_comercial_post(
    request: Request,
    flete_unitario: float = Form(0.0),

    # Chico
    maniobras_chico: float = Form(0.0),
    empaque_chico: float = Form(0.0),
    comision_chico: float = Form(0.0),
    garantias_chico: float = Form(0.0),

    # Mediano
    maniobras_mediano: float = Form(0.0),
    empaque_mediano: float = Form(0.0),
    comision_mediano: float = Form(0.0),
    garantias_mediano: float = Form(0.0),

    # Grande
    maniobras_grande: float = Form(0.0),
    empaque_grande: float = Form(0.0),
    comision_grande: float = Form(0.0),
    garantias_grande: float = Form(0.0),

    # Utilidad
    mult_baja: float = Form(1.30),
    mult_media: float = Form(1.45),
    mult_alta: float = Form(1.60),
):
    guard = require_login(request, "admin")
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    # settings
    cur.execute("REPLACE INTO settings(k,v) VALUES ('flete_unitario',%s)", (str(flete_unitario),))

    # cost_config (por tamaño)
    cur.execute("REPLACE INTO cost_config(tamano, maniobras, empaque, comision, garantias) VALUES (%s,%s,%s,%s,%s)",
                ("Chico", maniobras_chico, empaque_chico, comision_chico, garantias_chico))
    cur.execute("REPLACE INTO cost_config(tamano, maniobras, empaque, comision, garantias) VALUES (%s,%s,%s,%s,%s)",
                ("Mediano", maniobras_mediano, empaque_mediano, comision_mediano, garantias_mediano))
    cur.execute("REPLACE INTO cost_config(tamano, maniobras, empaque, comision, garantias) VALUES (%s,%s,%s,%s,%s)",
                ("Grande", maniobras_grande, empaque_grande, comision_grande, garantias_grande))

    # utilidad_config
    cur.execute("REPLACE INTO utilidad_config(nivel, multiplicador) VALUES (%s,%s)", ("baja", mult_baja))
    cur.execute("REPLACE INTO utilidad_config(nivel, multiplicador) VALUES (%s,%s)", ("media", mult_media))
    cur.execute("REPLACE INTO utilidad_config(nivel, multiplicador) VALUES (%s,%s)", ("alta", mult_alta))

    conn.commit()
    conn.close()

    return RedirectResponse("/config/comercial", status_code=303)

@app.get("/producto/nuevo", response_class=HTMLResponse)
def nuevo_producto(request: Request):
    guard = require_login(request, "admin")
    if guard:
        return guard

    return templates.TemplateResponse("producto_form.html", {
        "request": request,
        "producto": None
    })


@app.get("/producto/{product_id}/editar", response_class=HTMLResponse)
def editar_producto(request: Request, product_id: int):
    guard = require_login(request, "admin")
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM products WHERE id=%s", (product_id,))
    producto = cur.fetchone()
    conn.close()

    return templates.TemplateResponse("producto_form.html", {
        "request": request,
        "producto": producto
    })

@app.get("/vendedor/nueva", response_class=HTMLResponse)
def nueva(request: Request):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM products WHERE activo=1 ORDER BY codigo LIMIT 50"
    )
    products = cur.fetchall()
    conn.close()

    return templates.TemplateResponse("nueva.html", {
        "request": request,
        "products": products,
        "money": money,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "venta",
    })

@app.post("/vendedor/cotizar")
def crear_cotizacion(
    request: Request,
    vendedor: str = Form("Vendedor"),
    cliente_nombre: str = Form(...),
    cliente_tel: str = Form(...),
    cliente_email: str = Form(""),
    codigo: str = Form(...),
    cantidad: int = Form(1),
    descuento_tipo: str = Form(""),
    descuento_val: float = Form(0.0),
):
    conn = db()
    cur = conn.cursor(dictionary=True)

    # 1) Validar producto
    cur.execute(
        "SELECT * FROM products WHERE codigo=%s AND activo=1",
        (codigo.strip(),)
    )
    p = cur.fetchone()

    if not p:
        conn.close()
        return RedirectResponse("/vendedor/nueva", status_code=303)

    # 2) Calcular totales
    precio_unit = float(p["precio_lista"])
    desc_tipo = descuento_tipo if descuento_tipo in ["%", "$"] else None
    desc_val = float(descuento_val) if desc_tipo else None
    total_linea = compute_line_total(precio_unit, int(cantidad), desc_tipo, desc_val)

    # 3) Crear cotización
    folio = new_folio("COT")
    created_at = datetime.datetime.now().isoformat(timespec="seconds")

    cur.execute(
        """INSERT INTO quotes(
            folio,created_at,vendedor,total,
            cliente_nombre,cliente_tel,cliente_email
        ) VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            folio,
            created_at,
            vendedor,
            total_linea,
            cliente_nombre.strip(),
            cliente_tel.strip(),
            (cliente_email or "").strip(),
        )
    )
    qid = cur.lastrowid

    # 4) Línea de cotización
    cur.execute(
        """INSERT INTO quote_lines(
            quote_id,product_id,cantidad,precio_unit,
            descuento_tipo,descuento_val,total_linea
        ) VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            qid,
            p["id"],
            int(cantidad),
            precio_unit,
            desc_tipo,
            desc_val,
            total_linea,
        )
    )

    conn.commit()
    conn.close()

    return RedirectResponse(f"/cotizacion/{qid}", status_code=303)

@app.get("/cotizacion/{quote_id}", response_class=HTMLResponse)
def ver_cotizacion(request: Request, quote_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
    q = cur.fetchone()
    q = dict(q) if q else None  # ✅ IMPORTANTE: para que el template pueda usar q.get(...)

    cur.execute("""
        SELECT ql.*, p.codigo, p.modelo
        FROM quote_lines ql JOIN products p ON p.id=ql.product_id
        WHERE ql.quote_id=%s
    """, (quote_id,))
    lines = cur.fetchall()

    conn.close()

    return templates.TemplateResponse("cotizacion.html", {
        "request": request,
        "q": q,
        "lines": lines,
        "money": money,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "venta",
    })

@app.get("/cotizacion/{quote_id}/pdf")
def cotizacion_pdf(quote_id: int):
    out = os.path.join(BASE_DIR, f"cotizacion_{quote_id}.pdf")
    render_quote_pdf(quote_id, out)
    return FileResponse(out, media_type="application/pdf", filename=os.path.basename(out))

@app.post("/cotizacion/{quote_id}/convertir")
def convertir_a_pedido(
    quote_id: int,
    cliente_nombre: str = Form(...),
    cliente_tel: str = Form(""),
    cliente_email: str = Form(""),
    metodo: str = Form(...),
    monto: float = Form(...),
    referencia: str = Form(""),
    efectivo_recibido: float = Form(0.0),
):
    metodo = metodo.lower()
    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM quotes WHERE id=%s", (quote_id,))
    q = cur.fetchone()
    if not q:
        conn.close()
        return RedirectResponse("/", status_code=303)

    # Crear cliente
    cur.execute(
        "INSERT INTO customers(nombre, telefono) VALUES (%s,%s)",
        (cliente_nombre, cliente_tel),
    )
    cid = cur.lastrowid

    # Guardar datos del cliente en la cotización
    cur.execute("""
        UPDATE quotes
        SET customer_id=%s, cliente_nombre=%s, cliente_tel=%s, cliente_email=%s, status='PEDIDO'
        WHERE id=%s
    """, (cid, cliente_nombre, cliente_tel, cliente_email, quote_id))

    total = float(q["total"])
    anticipo_req = total * DEPOSIT_PCT
    anticipo_pagado = float(monto)

    if anticipo_pagado + 1e-9 < anticipo_req:
        conn.close()
        return RedirectResponse(f"/cotizacion/{quote_id}", status_code=303)

    saldo = total - anticipo_pagado
    entrega = (datetime.date.today() + datetime.timedelta(days=FAB_DAYS_DEFAULT)).isoformat()
    folio = new_folio("PED")
    created_at = datetime.datetime.now().isoformat(timespec="seconds")

    cur.execute(
        """INSERT INTO orders(
            folio,created_at,quote_id,customer_id,vendedor,total,
            anticipo_req,anticipo_pagado,saldo,entrega_estimada,tipo,estatus
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            folio,
            created_at,
            quote_id,
            cid,
            q["vendedor"],
            total,
            anticipo_req,
            anticipo_pagado,
            saldo,
            entrega,
            "FABRICACION",
            "EN FABRICACIÓN",
        ),
    )

    oid = cur.lastrowid

    cambio = None
    if metodo == "efectivo":
        cambio = max(0.0, float(efectivo_recibido) - anticipo_pagado)

    cur.execute(
        """INSERT INTO payments(order_id,created_at,metodo,monto,referencia,efectivo_recibido,cambio)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            oid,
            created_at,
            metodo,
            anticipo_pagado,
            referencia,
            float(efectivo_recibido) if metodo == "efectivo" else None,
            cambio,
        ),
    )

    conn.commit()
    conn.close()
    return RedirectResponse(f"/pedido/{oid}", status_code=303)

@app.get("/pedido/{order_id}", response_class=HTMLResponse)
def ver_pedido(request: Request, order_id: int):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        """
        SELECT o.*, q.cliente_nombre, q.cliente_tel
        FROM orders o
        LEFT JOIN quotes q ON q.id = o.quote_id
        WHERE o.id=%s
        """,
        (order_id,)
    )
    o = cur.fetchone()

    if not o:
        conn.close()
        return RedirectResponse("/venta", status_code=303)

    o = dict(o)
    cur.execute(
    "SELECT * FROM payments WHERE order_id=%s ORDER BY id DESC",
    (order_id,)
)
    payments = cur.fetchall()
    
        # ---- Cálculo de vencimiento para apartados ----
    hoy = datetime.date.today()
    vence = None
    dias_restantes = None
    vencido = False

    if (o.get("tipo") or "").strip().upper() == "APARTADO":
        if o.get("apartado_vence"):
            try:
                fecha_base = datetime.date.fromisoformat(o["apartado_vence"])
                dias_prorroga = int(o.get("apartado_prorroga_dias") or 0)
                vence = fecha_base + datetime.timedelta(days=dias_prorroga)
                dias_restantes = (vence - hoy).days
                vencido = dias_restantes < 0
            except Exception:
                pass

    conn.close()

    return templates.TemplateResponse("pedido.html", {
    "request": request,
    "o": o,
    "payments": payments,
    "vence": vence,
    "dias_restantes": dias_restantes,
    "vencido": vencido,
    "money": money,
    "DEPOSIT_PCT": DEPOSIT_PCT,
    "APP_NAME": APP_NAME,
    "SLOGAN": SLOGAN,
    "PHONE": PHONE,
    "role": request.session.get("role", ""),
    "user": request.session.get("user", ""),
})

@app.get("/pedido/{order_id}/agendar", response_class=HTMLResponse)
def agendar_get(request: Request, order_id: int):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    if not o:
        conn.close()
        return RedirectResponse("/pedidos", status_code=303)

    o = dict(o)

    # Validaciones básicas
    if o["tipo"] != "VENTA_STOCK" or float(o["saldo"] or 0) > 0:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    if o["entrega_estimada"]:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    conn.close()

    return templates.TemplateResponse("agendar.html", {
        "request": request,
        "o": o,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
    })

@app.post("/pedido/{order_id}/estatus")
def cambiar_estatus_pedido(
    request: Request,
    order_id: int,
    estatus: str = Form(...),
):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    if role != "admin":
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT estatus, saldo FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    if not o:
        conn.close()
        return RedirectResponse("/venta", status_code=303)

    estatus_in = (estatus or "").strip().upper()
    estatus_actual = ((o["estatus"] or "").strip().upper())

    # saldo a centavos
    saldo_actual = round(float(o["saldo"] or 0), 2)

    allowed = {"REGISTRADO", "EN FABRICACIÓN", "LISTO PARA ENTREGA", "LIQUIDADO", "ENTREGADO", "CANCELADO"}
    if estatus_in not in allowed:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    if estatus_actual == "ENTREGADO":
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Bloqueo: ENTREGADO solo si saldo = 0.00
    if estatus_in == "ENTREGADO" and saldo_actual > 0.00:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    cur.execute("UPDATE orders SET estatus=%s WHERE id=%s", (estatus_in, order_id))
    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/pedido/{order_id}/pagar")
def registrar_pago(
    request: Request,
    order_id: int,
    metodo: str = Form(...),
    monto: float = Form(...),
    referencia: str = Form(""),
    efectivo_recibido: float = Form(0.0),
):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    if not o:
        conn.close()
        return RedirectResponse("/venta", status_code=303)

    o = dict(o)

    # saldo a centavos
    saldo_actual = round(float(o.get("saldo", 0) or 0), 2)
    anticipo_pagado_actual = round(float(o.get("anticipo_pagado", 0) or 0), 2)

    # Si ya está liquidado, no aceptar pagos
    if saldo_actual <= 0.00:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Validar monto
    monto = round(float(monto or 0), 2)
    if monto <= 0.00:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # No permitir pagar más del saldo
    if monto > saldo_actual:
        monto = saldo_actual

    # Si después del recorte queda en 0, no registrar nada
    if monto <= 0.00:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Cambio si es efectivo
    cambio = None
    if metodo == "efectivo":
        efectivo_recibido = round(float(efectivo_recibido or 0), 2)
        cambio = round(max(0.0, efectivo_recibido - monto), 2)
    else:
        efectivo_recibido = None

    created_at = datetime.datetime.now().isoformat(timespec="seconds")
    cur.execute(
        """INSERT INTO payments(order_id,created_at,metodo,monto,referencia,efectivo_recibido,cambio)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (order_id, created_at, metodo, monto, referencia, efectivo_recibido, cambio)
    )

    nuevo_anticipo_pagado = round(anticipo_pagado_actual + monto, 2)
    nuevo_saldo = round(saldo_actual - monto, 2)

    nuevo_estatus = o["estatus"]
    nuevo_tipo = o.get("tipo", "") or ""

    if nuevo_saldo <= 0.000001:
        nuevo_saldo = 0.0
        nuevo_estatus = "LIQUIDADO"

        # Regla: si era APARTADO y ya quedó liquidado -> convertir a VENTA_STOCK
        if (nuevo_tipo or "").strip().upper() == "APARTADO":
            nuevo_tipo = "VENTA_STOCK"

    cur.execute(
        "UPDATE orders SET anticipo_pagado=%s, saldo=%s, estatus=%s, tipo=%s WHERE id=%s",
        (nuevo_anticipo_pagado, nuevo_saldo, nuevo_estatus, nuevo_tipo, order_id)
    )

    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/pago/{payment_id}/anular")
def anular_pago(request: Request, payment_id: int):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    if role != "admin":
        return RedirectResponse("/pedidos", status_code=303)

    conn = db()
    cur = conn.cursor(dictionary=True)

    # Traer pago
    cur.execute(
        "SELECT * FROM payments WHERE id=%s",
        (payment_id,)
    )
    p = cur.fetchone()

    if not p:
        conn.close()
        return RedirectResponse("/pedidos", status_code=303)

    p = dict(p)

    # Si ya está anulado, no hacer nada
    if int(p.get("anulado", 0)) == 1:
        conn.close()
        return RedirectResponse(f"/pedido/{p['order_id']}", status_code=303)

    order_id = p["order_id"]

    # Marcar pago como anulado
    cur.execute(
        "UPDATE payments SET anulado=1, motivo_anulacion='Anulado por admin' WHERE id=%s",
        (payment_id,)
    )

    # Recalcular totales del pedido (solo pagos no anulados)
    cur.execute(
        "SELECT SUM(monto) as total FROM payments WHERE order_id=%s AND anulado=0",
        (order_id,)
    )
    pagos_validos = cur.fetchone()

    total_pagado = float(pagos_validos["total"] or 0)

    cur.execute(
        "SELECT total FROM orders WHERE id=%s",
        (order_id,)
    )
    o = cur.fetchone()

    total_pedido = float(o["total"] or 0)

    nuevo_saldo = round(total_pedido - total_pagado, 2)

    nuevo_estatus = "LIQUIDADO" if nuevo_saldo == 0 else "REGISTRADO"

    cur.execute(
        "UPDATE orders SET anticipo_pagado=%s, saldo=%s, estatus=%s WHERE id=%s",
        (total_pagado, nuevo_saldo, nuevo_estatus, order_id)
    )

    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/pedido/{order_id}/nota")
def guardar_nota_pedido(request: Request, order_id: int, nota: str = Form("")):
    user = require_login(request)
    nota = (nota or "").strip()

    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("UPDATE orders SET nota=%s WHERE id=%s", (nota, order_id))
    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.get("/pedido/{order_id}/pdf")
def pedido_pdf(order_id: int):
    out = os.path.join(BASE_DIR, f"pedido_{order_id}.pdf")
    render_receipt_pdf(order_id, out)
    return FileResponse(out, media_type="application/pdf", filename=os.path.basename(out))

@app.get("/apartados", response_class=HTMLResponse)
def apartados_get(request: Request, q: str = "", estatus: str = ""):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    user = request.session.get("user", "")

    q_clean = (q or "").strip()
    estatus_clean = (estatus or "").strip()

    conn = db()
    cur = conn.cursor(dictionary=True)

    where = ["o.tipo='APARTADO'"]
    params = []

    if q_clean:
        like = f"%{q_clean}%"
        where.append("(o.folio LIKE %s OR IFNULL(q.cliente_nombre,'') LIKE %s)")
        params.extend([like, like])

    if estatus_clean:
        where.append("o.estatus = %s")
        params.append(estatus_clean)

    sql = f"""
        SELECT
            o.id, o.folio, o.created_at, o.vendedor,
            o.total, o.anticipo_pagado, o.saldo,
            o.entrega_estimada, o.estatus, o.tipo, o.nota,
            q.cliente_nombre, q.cliente_tel
        FROM orders o
        LEFT JOIN quotes q ON q.id = o.quote_id
        WHERE {" AND ".join(where)}
        ORDER BY o.created_at DESC
        LIMIT 200
    """
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()

    conn.close()

    return templates.TemplateResponse("apartados.html", {
        "request": request,
        "rows": rows,
        "q": q_clean,
        "estatus": estatus_clean,
        "money": money,
        "role": role,
        "user": user,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "active": "apartados",
    })

@app.get("/apartados/nuevo", response_class=HTMLResponse)
def apartados_nuevo_get(request: Request):
    guard = require_login(request)
    if guard:
        return guard

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT id, codigo, modelo, tamano, precio_lista, stock, activo
        FROM products
        WHERE activo=1
        ORDER BY modelo ASC
    """)
    products = cur.fetchall()

    conn.close()

    return templates.TemplateResponse("apartado_nuevo.html", {
        "request": request,
        "products": products,
        "money": money,
        "APP_NAME": APP_NAME,
        "SLOGAN": SLOGAN,
        "PHONE": PHONE,
        "role": request.session.get("role", ""),
        "user": request.session.get("user", ""),
        "active": "apartados",
    })

@app.post("/apartados/crear")
async def apartados_crear(
    request: Request,
    cliente_nombre: str = Form(...),
    cliente_tel: str = Form(...),
    cliente_email: str = Form(""),
    descuento: float = Form(0.0),
    nota: str = Form(""),
):
    guard = require_login(request)
    if guard:
        return guard

    vendedor = request.session.get("user", "") or "vendedor"

    cliente_nombre = (cliente_nombre or "").strip()
    cliente_tel = (cliente_tel or "").strip()
    cliente_email = (cliente_email or "").strip()
    nota = (nota or "").strip()

    try:
        descuento = float(descuento or 0)
    except Exception:
        descuento = 0.0

    form = await request.form()

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT id, precio_lista
        FROM products
        WHERE activo=1
    """)
    prods = cur.fetchall()

    lineas = []
    subtotal = 0.0

    for p in prods:
        pid = int(p["id"])
        key = f"qty_{pid}"
        qty_raw = (form.get(key) or "0").strip()

        try:
            qty = int(qty_raw)
        except Exception:
            qty = 0

        if qty <= 0:
            continue

        precio = float(p["precio_lista"] or 0)
        importe = precio * qty

        lineas.append((pid, qty, precio, importe))
        subtotal += importe

    if not lineas:
        conn.close()
        return RedirectResponse("/apartados/nuevo", status_code=303)

    total = subtotal - descuento
    if total < 0:
        total = 0.0
    total = round(total, 2)

    # Regla de negocio: mínimo 30% para apartar
    anticipo_req = round(total * 0.30, 2)
    anticipo_pagado = 0.0
    saldo = round(total - anticipo_pagado, 2)

    created_at = datetime.datetime.now().isoformat(timespec="seconds")

    # Vencimiento: 30 días naturales (por ahora lo guardamos en la nota)
    vence = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
    nota_final = (nota + f" | Vence: {vence}").strip(" |")

    # Crear cotización interna
    folio_q = "APQ-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    cur.execute("""
        INSERT INTO quotes(folio, created_at, vendedor, total, status, cliente_nombre, cliente_tel, cliente_email)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        folio_q,
        created_at,
        vendedor,
        total,
        "PEDIDO",
        cliente_nombre,
        cliente_tel,
        cliente_email
    ))
    quote_id = cur.lastrowid

    # Insertar líneas
    for pid, qty, precio, importe in lineas:
        cur.execute("""
            INSERT INTO quote_lines(
                quote_id,
                product_id,
                cantidad,
                precio_unit,
                descuento_tipo,
                descuento_val,
                total_linea
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            quote_id,
            pid,
            qty,
            precio,
            None,
            None,
            importe
        ))

        # Descontar stock (apartado de exhibición)
    for pid, qty, precio, importe in lineas:
        cur.execute(
        "UPDATE products SET stock = IFNULL(stock,0) - %s WHERE id=%s",
        (qty, pid)
    )

    # Crear pedido APARTADO
    folio_o = "AP-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    cur.execute("""
    INSERT INTO orders(
        folio,
        created_at,
        quote_id,
        vendedor,
        total,
        anticipo_req,
        anticipo_pagado,
        saldo,
        estatus,
        entrega_estimada,
        tipo,
        nota,
        apartado_vence
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""", (
    folio_o,
    created_at,
    quote_id,
    vendedor,
    total,
    anticipo_req,
    anticipo_pagado,
    saldo,
    "APARTADO",
    "",
    "APARTADO",
    nota_final,
    vence
))
    order_id = cur.lastrowid

    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/pedido/{order_id}/autorizar-estatus")
def autorizar_cambio_estatus(request: Request, order_id: int):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    if role != "admin":
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT saldo, estatus_solicitado FROM orders WHERE id=%s", (order_id,))
    o = cur.fetchone()
    if not o:
        conn.close()
        return RedirectResponse("/pedidos", status_code=303)

    estatus_solicitado = (o["estatus_solicitado"] or "").strip()
    if not estatus_solicitado:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    allowed = {"Registrado", "EN FABRICACIÓN", "LISTO PARA ENTREGA", "LIQUIDADO", "ENTREGADO", "CANCELADO"}
    if estatus_solicitado not in allowed:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Bloqueo: no permitir autorizar ENTREGADO si hay saldo pendiente
    saldo_actual = float(o["saldo"] or 0)
    if estatus_solicitado == "ENTREGADO" and saldo_actual > 0.000001:
        conn.close()
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    # Aplicar estatus y limpiar solicitud
    cur.execute(
        "UPDATE orders SET estatus=%s, estatus_solicitado='' WHERE id=%s",
        (estatus_solicitado, order_id)
    )
    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.post("/pedido/{order_id}/solicitar-estatus")
def solicitar_cambio_estatus(request: Request, order_id: int, estatus_solicitado: str = Form(...)):
    guard = require_login(request)
    if guard:
        return guard

    role = request.session.get("role", "")
    # Solo vendedor (o no-admin) debe solicitar
    if role == "admin":
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)

    estatus_solicitado = (estatus_solicitado or "").strip()

    allowed = {"EN FABRICACIÓN", "LISTO PARA ENTREGA", "ENTREGADO", "CANCELADO"}
    if estatus_solicitado not in allowed:
        return RedirectResponse(f"/pedido/{order_id}", status_code=303)    

    conn = db()
    cur = conn.cursor(dictionary=True)

    # Guardar solicitud
    cur.execute(
        "UPDATE orders SET estatus_solicitado=%s WHERE id=%s",
        (estatus_solicitado, order_id)
    )
    conn.commit()
    conn.close()

    return RedirectResponse(f"/pedido/{order_id}", status_code=303)

@app.get("/admin/resumen", response_class=HTMLResponse)
def admin_resumen(request: Request, desde: str = None, hasta: str = None):
    if not desde:
        desde = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
    if not hasta:
        hasta = datetime.date.today().isoformat()
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT o.*, c.nombre cliente
        FROM orders o LEFT JOIN customers c ON c.id=o.customer_id
        WHERE date(o.created_at) BETWEEN date(%s) AND date(%s)
        ORDER BY o.created_at DESC
    """, (desde, hasta))
    rows = cur.fetchall()

    total_ventas = sum(float(r["total"]) for r in rows)
    total_anticipo = sum(float(r["anticipo_pagado"]) for r in rows)
    # bolsas aggregate
    bols_tot = {"maniobras":0.0,"empaque":0.0,"comision":0.0,"garantias":0.0,"utilidad_bruta":0.0}
    for r in rows:
        qid = r["quote_id"]
        b = compute_bolsas(cur, qid)
        for k in bols_tot:
            bols_tot[k] += b.get(k,0.0)
    conn.close()
    return templates.TemplateResponse("admin_resumen.html", {
        "request": request,
        "rows": rows,
        "desde": desde, "hasta": hasta,
        "total_ventas": total_ventas,
        "total_anticipo": total_anticipo,
        "bols_tot": bols_tot,
        "money": money
    })
