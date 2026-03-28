import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
from security import hash_password
from fastapi import HTTPException

load_dotenv(override=True)

# --- MySQL Connection Config Selection ---
# DB_MODE=REMOTE by default for server safety if not set
DB_MODE = os.getenv('DB_MODE', 'REMOTE').upper()

if DB_MODE == 'REMOTE':
    # Use REMOTE_DB_* if set, otherwise fallback to DB_* (original production variables)
    MYSQL_CONFIG = {
        'host': os.getenv('REMOTE_DB_HOST') or os.getenv('DB_HOST'),
        'user': os.getenv('REMOTE_DB_USER') or os.getenv('DB_USER', 'root'),
        'password': os.getenv('REMOTE_DB_PASSWORD') or os.getenv('DB_PASSWORD', 'root'),
        'database': os.getenv('REMOTE_DB_NAME') or os.getenv('DB_NAME', 'lp_erp'),
        'port': int(os.getenv('REMOTE_DB_PORT') or os.getenv('DB_PORT', 3306)),
        'raise_on_warnings': False
    }
else:
    MYSQL_CONFIG = {
        'host': os.getenv('LOCAL_DB_HOST') or os.getenv('DB_HOST') or 'localhost',
        'user': os.getenv('LOCAL_DB_USER') or os.getenv('DB_USER') or 'root',
        'password': os.getenv('LOCAL_DB_PASSWORD') or os.getenv('DB_PASSWORD') or '',
        'database': os.getenv('LOCAL_DB_NAME') or os.getenv('DB_NAME') or 'lp_erp',
        'port': int(os.getenv('LOCAL_DB_PORT') or os.getenv('DB_PORT') or 3306),
        'raise_on_warnings': False
    }

# Auto-enable SSL for remote connections (Required for Aiven/Render DBs)
if MYSQL_CONFIG['host'] not in ['localhost', '127.0.0.1']:
    MYSQL_CONFIG['ssl_disabled'] = False
    # Some providers might need allow_native_password for older tool compatibility
    MYSQL_CONFIG['auth_plugin'] = 'mysql_native_password'

from mysql.connector import pooling
from logger_config import logger

# Create Pool (up to 5-10 connections)
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="lp_erp_pool",
        pool_size=20,
        pool_reset_session=True,
        **MYSQL_CONFIG
    )
    logger.info("✅ Database connection pool created.")
except Error as e:
    logger.error(f"❌ Failed to create database pool: {e}")
    db_pool = None

def db():
    """Returns a connection from the pool."""
    if not db_pool:
        # Fallback to direct connection if pool failed to initialize
        try:
            return mysql.connector.connect(**MYSQL_CONFIG)
        except Error as e:
            logger.error(f"❌ Direct connection failed: {e}")
            raise HTTPException(status_code=503, detail="Base de datos no disponible")

    try:
        return db_pool.get_connection()
    except Error as e:
        logger.error(f"❌ Pool exhausted or connection error: {e}")
        raise HTTPException(status_code=503, detail="Servidor saturado. Intente de nuevo.")

def col_exists(cur, table: str, col: str) -> bool:
    cur.execute(f"SHOW COLUMNS FROM `{table}` LIKE '{col}'")
    return cur.fetchone() is not None

def init_db():
    """Initializes the database schema. Handled by startup_event in main.py."""
    conn = None
    try:
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
                costo_fabrica DECIMAL(15,2) DEFAULT 0,
                flete DECIMAL(15,2) NOT NULL DEFAULT 0,
                maniobras DECIMAL(15,2) DEFAULT 0,
                empaque DECIMAL(15,2) DEFAULT 0,
                comision DECIMAL(15,2) DEFAULT 0,
                garantias DECIMAL(15,2) DEFAULT 0,
                utilidad_nivel VARCHAR(100) DEFAULT 'media',
                activo INT NOT NULL DEFAULT 1,
                imagen_url TEXT,
                in_catalog INT NOT NULL DEFAULT 1,
                is_madre INT NOT NULL DEFAULT 0,
                round_adjustment DECIMAL(15,2) DEFAULT 0
            )""",
            """CREATE TABLE IF NOT EXISTS fabrics(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS colors(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS product_fabrics(
                product_id INT NOT NULL,
                fabric_id INT NOT NULL,
                PRIMARY KEY (product_id, fabric_id)
            )""",
            """CREATE TABLE IF NOT EXISTS product_colors(
                product_id INT NOT NULL,
                color_id INT NOT NULL,
                PRIMARY KEY (product_id, color_id)
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
                cp_envio VARCHAR(20) DEFAULT NULL,
                costo_envio DECIMAL(15,2) DEFAULT NULL,
                calle_envio TEXT,
                numero_envio VARCHAR(100),
                colonia_envio TEXT,
                referencia_envio TEXT,
                nota_envio TEXT,
                round_adjustment DECIMAL(15,2) DEFAULT 0,
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
                round_adjustment DECIMAL(15,2) DEFAULT 0,
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
                cp_envio VARCHAR(20) DEFAULT NULL,
                costo_envio DECIMAL(15,2) DEFAULT NULL,
                calle_envio TEXT,
                numero_envio VARCHAR(100),
                colonia_envio TEXT,
                referencia_envio TEXT,
                nota_envio TEXT,
                round_adjustment DECIMAL(15,2) DEFAULT 0,
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
            """CREATE TABLE IF NOT EXISTS roles(
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                is_superadmin BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS role_permissions(
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                modulo VARCHAR(50) NOT NULL,
                can_view BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            )""",
            """CREATE TABLE IF NOT EXISTS users(
                username VARCHAR(255) PRIMARY KEY,
                pin VARCHAR(20) NOT NULL,
                rol VARCHAR(50) NOT NULL, -- legacy
                password VARCHAR(255),
                role_id INT,
                nombre_completo VARCHAR(200),
                edad INT,
                cumpleanos DATE,
                rfc VARCHAR(20)
            )""",
            """CREATE TABLE IF NOT EXISTS order_notes(
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                author VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )""",
            """CREATE TABLE IF NOT EXISTS notifications(
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_target VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read INT NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                related_order_id INT
            )""",
            """CREATE TABLE IF NOT EXISTS promotions(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                discount_pct DECIMAL(5,2) NOT NULL,
                is_active INT NOT NULL DEFAULT 1
            )""",
            """CREATE TABLE IF NOT EXISTS shipping_zones(
                name VARCHAR(100) PRIMARY KEY,
                costo DECIMAL(15,2) NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS shipping_costs(
                id INT AUTO_INCREMENT PRIMARY KEY,
                cp VARCHAR(20) NOT NULL UNIQUE,
                colonia TEXT NOT NULL,
                municipio VARCHAR(100) NOT NULL,
                zona_name VARCHAR(100) NOT NULL,
                FOREIGN KEY (zona_name) REFERENCES shipping_zones(name) ON UPDATE CASCADE
            )"""
        ]
        for sql in tables:
            cur.execute(sql)

        # Migrations (Refactored logic from app.py)
        _migrate(cur)

        # Seeds
        cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('baja',1.30)")
        cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('media',1.45)")
        cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('alta',1.60)")
        cur.execute("INSERT IGNORE INTO utilidad_config(nivel,multiplicador) VALUES ('especial',1.20)")

        # Seed global settings
        cur.execute("INSERT IGNORE INTO settings(k,v) VALUES ('global_flete_cost', '0')")

        # Seed cost_config
        cur.execute("INSERT IGNORE INTO cost_config(tamano,maniobras,empaque,comision,garantias) VALUES ('Chico', 200, 50, 200, 150)")
        cur.execute("INSERT IGNORE INTO cost_config(tamano,maniobras,empaque,comision,garantias) VALUES ('Mediano', 225, 50, 200, 150)")
        cur.execute("INSERT IGNORE INTO cost_config(tamano,maniobras,empaque,comision,garantias) VALUES ('Grande', 250, 50, 300, 200)")
        
        # Seed bank interests
        cur.execute("INSERT IGNORE INTO settings(k,v) VALUES ('comision_debito_pct', '3.0')")
        cur.execute("INSERT IGNORE INTO settings(k,v) VALUES ('interes_msi_pct', '15.0')")
        cur.execute("INSERT IGNORE INTO settings(k,v) VALUES ('comision_msi_banco_pct', '18.0')")

        # Seed roles if empty
        cur.execute("SELECT COUNT(*) as c FROM roles")
        if cur.fetchone()['c'] == 0:
            cur.execute("INSERT INTO roles (nombre, is_superadmin) VALUES ('Administrador General', 1)")
            super_id = cur.lastrowid
            cur.execute("INSERT INTO roles (nombre, is_superadmin) VALUES ('Gerente / Admin C1', 0)")
            admin_c1_id = cur.lastrowid
            cur.execute("INSERT INTO roles (nombre, is_superadmin) VALUES ('Vendedor', 0)")
            vendedor_id = cur.lastrowid

            # Seed users if they don't exist
            cur.execute("INSERT IGNORE INTO users(username,pin,rol,password,role_id,nombre_completo) VALUES ('admin','9999','admin',%s, %s, 'Administrador Central')", (hash_password('admin123'), super_id))
            cur.execute("INSERT IGNORE INTO users(username,pin,rol,password,role_id,nombre_completo) VALUES ('vendedor','1234','vendedor',NULL, %s, 'Vendedor Mostrador')", (vendedor_id,))
        
            # Seed base permissions for these roles
            roles_to_seed = [
                (super_id, True), # Admin General
                (admin_c1_id, False), # Gerente
                (vendedor_id, False) # Vendedor
            ]
            modulos_base = ["dashboard", "inventory", "sales", "orders", "quotes", "apartados", "payments", "agenda", "settings"]
            for r_id, is_super in roles_to_seed:
                for mod in modulos_base:
                    # Superadmins get '1' (True), others '1' by default for now or '0' depending on preference.
                    # Based on screenshots, it seems Gerente had everything green and Vendedor some.
                    # Let's give Gerente and Admin everything, and Vendedor almost everything as a safe start.
                    can_v = 1 if (is_super or r_id == admin_c1_id) else (1 if mod in ["inventory", "sales", "quotes", "apartados"] else 0)
                    cur.execute("INSERT IGNORE INTO role_permissions (role_id, modulo, can_view) VALUES (%s, %s, %s)", (r_id, mod, can_v))

        # --- HEALING / MIGRATION (Runs every startup for existing data) ---
        # 1. Ensure existing users have a role_id based on their legacy 'rol' column if it's NULL
        cur.execute("SELECT id FROM roles WHERE nombre = 'Administrador General' LIMIT 1")
        res_admin = cur.fetchone()
        if res_admin:
            cur.execute("UPDATE users SET role_id = %s WHERE rol = 'admin' AND role_id IS NULL", (res_admin['id'],))
        
        cur.execute("SELECT id FROM roles WHERE nombre = 'Vendedor' LIMIT 1")
        res_vend = cur.fetchone()
        if res_vend:
            cur.execute("UPDATE users SET role_id = %s WHERE rol = 'vendedor' AND role_id IS NULL", (res_vend['id'],))

        conn.commit()
    except Exception as e:
        print(f"❌ Error during database initialization: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn and conn.is_connected():
            conn.close()

def _migrate(cur):
    # products
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
        cur.execute("ALTER TABLE products ADD COLUMN utilidad_nivel VARCHAR(255) NOT NULL DEFAULT 'media'")
    if not col_exists(cur, "products", "imagen_url"):
        cur.execute("ALTER TABLE products ADD COLUMN imagen_url TEXT")
    if not col_exists(cur, "products", "costo_fabrica"):
        cur.execute("ALTER TABLE products ADD COLUMN costo_fabrica DECIMAL(15,2) NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "flete"):
        cur.execute("ALTER TABLE products ADD COLUMN flete DECIMAL(15,2) NOT NULL DEFAULT 0")
    if not col_exists(cur, "products", "in_catalog"):
        cur.execute("ALTER TABLE products ADD COLUMN in_catalog INT NOT NULL DEFAULT 1")
    if not col_exists(cur, "products", "round_adjustment"):
        cur.execute("ALTER TABLE products ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")

    # quotes
    if not col_exists(cur, "quotes", "cliente_nombre"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_nombre TEXT")
    if not col_exists(cur, "quotes", "cliente_tel"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_tel TEXT")
    if not col_exists(cur, "quotes", "cliente_email"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cliente_email TEXT")
    if not col_exists(cur, "quotes", "cp_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN cp_envio VARCHAR(20) DEFAULT NULL")
    if not col_exists(cur, "quotes", "costo_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN costo_envio DECIMAL(15,2) DEFAULT NULL")
    if not col_exists(cur, "quotes", "calle_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN calle_envio TEXT")
    if not col_exists(cur, "quotes", "numero_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN numero_envio VARCHAR(100)")
    if not col_exists(cur, "quotes", "colonia_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN colonia_envio TEXT")
    if not col_exists(cur, "quotes", "referencia_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN referencia_envio TEXT")
    if not col_exists(cur, "quotes", "nota_envio"):
        cur.execute("ALTER TABLE quotes ADD COLUMN nota_envio TEXT")
    if not col_exists(cur, "quotes", "round_adjustment"):
        cur.execute("ALTER TABLE quotes ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")

    # orders
    if not col_exists(cur, "orders", "tipo"):
        cur.execute("ALTER TABLE orders ADD COLUMN tipo VARCHAR(255) NOT NULL DEFAULT 'VENTA_STOCK'")
    if not col_exists(cur, "orders", "apartado_vence"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_vence VARCHAR(255) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "apartado_prorroga_dias"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_prorroga_dias INTEGER NOT NULL DEFAULT 0")
    if not col_exists(cur, "orders", "apartado_liberado"):
        cur.execute("ALTER TABLE orders ADD COLUMN apartado_liberado INTEGER NOT NULL DEFAULT 0")
    if not col_exists(cur, "orders", "nota"):
        cur.execute("ALTER TABLE orders ADD COLUMN nota VARCHAR(1000) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "estatus_solicitado"):
        cur.execute("ALTER TABLE orders ADD COLUMN estatus_solicitado VARCHAR(255) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "entrega_promesa"):
        cur.execute("ALTER TABLE orders ADD COLUMN entrega_promesa VARCHAR(255) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "cp_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN cp_envio VARCHAR(20) DEFAULT NULL")
    if not col_exists(cur, "orders", "costo_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN costo_envio DECIMAL(15,2) DEFAULT NULL")
    if not col_exists(cur, "orders", "calle_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN calle_envio TEXT")
    if not col_exists(cur, "orders", "numero_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN numero_envio VARCHAR(100)")
    if not col_exists(cur, "orders", "colonia_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN colonia_envio TEXT")
    if not col_exists(cur, "orders", "referencia_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN referencia_envio TEXT")
    if not col_exists(cur, "orders", "nota_envio"):
        cur.execute("ALTER TABLE orders ADD COLUMN nota_envio TEXT")
    if not col_exists(cur, "orders", "round_adjustment"):
        cur.execute("ALTER TABLE orders ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")
    
    # Billing / Facturacion
    if not col_exists(cur, "orders", "factura_rfc"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_rfc VARCHAR(50) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_razon"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_razon VARCHAR(255) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_cp"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_cp VARCHAR(10) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_regimen"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_regimen VARCHAR(100) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_uso_cfdi"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_uso_cfdi VARCHAR(100) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_metodo_pago"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_metodo_pago VARCHAR(50) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "factura_forma_pago"):
        cur.execute("ALTER TABLE orders ADD COLUMN factura_forma_pago VARCHAR(50) NOT NULL DEFAULT ''")
    if not col_exists(cur, "orders", "iva"):
        cur.execute("ALTER TABLE orders ADD COLUMN iva DECIMAL(15,2) NOT NULL DEFAULT 0")

    if not col_exists(cur, "quotes", "is_apartado_quote"):
        cur.execute("ALTER TABLE quotes ADD COLUMN is_apartado_quote BOOLEAN DEFAULT FALSE")
    
    # payments
    if not col_exists(cur, "payments", "anulado"):
        cur.execute("ALTER TABLE payments ADD COLUMN anulado INTEGER NOT NULL DEFAULT 0")
    if not col_exists(cur, "payments", "motivo_anulacion"):
        cur.execute("ALTER TABLE payments ADD COLUMN motivo_anulacion VARCHAR(1000) NOT NULL DEFAULT ''")
    if not col_exists(cur, "payments", "comision_bancaria"):
        cur.execute("ALTER TABLE payments ADD COLUMN comision_bancaria DECIMAL(15,2) NOT NULL DEFAULT 0")

    # quote_lines
    if not col_exists(cur, "quote_lines", "tipo_precio"):
        cur.execute("ALTER TABLE quote_lines ADD COLUMN tipo_precio VARCHAR(20) DEFAULT 'contado'")
    if not col_exists(cur, "quote_lines", "tela"):
        cur.execute("ALTER TABLE quote_lines ADD COLUMN tela TEXT")
    if not col_exists(cur, "quote_lines", "color"):
        cur.execute("ALTER TABLE quote_lines ADD COLUMN color TEXT")
    if not col_exists(cur, "quote_lines", "round_adjustment"):
        cur.execute("ALTER TABLE quote_lines ADD COLUMN round_adjustment DECIMAL(15,2) DEFAULT 0")

    # products
    if not col_exists(cur, "products", "is_madre"):
        cur.execute("ALTER TABLE products ADD COLUMN is_madre INT NOT NULL DEFAULT 0")

    # users
    if not col_exists(cur, "users", "password"):
        cur.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255)")
    if not col_exists(cur, "users", "role_id"):
        cur.execute("ALTER TABLE users ADD COLUMN role_id INT")
    if not col_exists(cur, "users", "nombre_completo"):
        cur.execute("ALTER TABLE users ADD COLUMN nombre_completo VARCHAR(200)")
    if not col_exists(cur, "users", "edad"):
        cur.execute("ALTER TABLE users ADD COLUMN edad INT")
    if not col_exists(cur, "users", "cumpleanos"):
        cur.execute("ALTER TABLE users ADD COLUMN cumpleanos DATE")
    if not col_exists(cur, "users", "rfc"):
        cur.execute("ALTER TABLE users ADD COLUMN rfc VARCHAR(20)")

    # new tables
    cur.execute("SHOW TABLES LIKE 'order_notes'")
    if not cur.fetchone():
        cur.execute("""
            CREATE TABLE order_notes(
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                author VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id)
            )
        """)
        
    cur.execute("SHOW TABLES LIKE 'notifications'")
    if not cur.fetchone():
        cur.execute("""
            CREATE TABLE notifications(
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_target VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read INT NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                related_order_id INT
            )
        """)
        
    cur.execute("SHOW TABLES LIKE 'promotions'")
    if not cur.fetchone():
        cur.execute("""
            CREATE TABLE promotions(
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                discount_pct DECIMAL(5,2) NOT NULL,
                is_active INT NOT NULL DEFAULT 1
            )
        """)

    # Refactor shipping_costs table if it still has the old 'zona' column
    if col_exists(cur, "shipping_costs", "zona"):
        # drop it so the seed script runs and recreates clean
        cur.execute("DROP TABLE shipping_costs")
        # Ensure zones table exists
        cur.execute("""CREATE TABLE IF NOT EXISTS shipping_zones(
            name VARCHAR(100) PRIMARY KEY,
            costo DECIMAL(15,2) NOT NULL
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS shipping_costs(
            id INT AUTO_INCREMENT PRIMARY KEY,
            cp VARCHAR(20) NOT NULL UNIQUE,
            colonia TEXT NOT NULL,
            municipio VARCHAR(100) NOT NULL,
            zona_name VARCHAR(100) NOT NULL,
            FOREIGN KEY (zona_name) REFERENCES shipping_zones(name) ON UPDATE CASCADE
        )""")

    # Ensure defaults
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

    # Migrate old statuses
    cur.execute("UPDATE orders SET estatus='EN FABRICACIÓN' WHERE estatus='PROCESO'")
    cur.execute("UPDATE orders SET estatus='LISTO ENTREGA' WHERE estatus='LISTO'")
