import datetime
from database import db
from logger_config import logger

def seed_from_excel(file_path: str):
    """
    Seeds the products table from an Excel file.
    Imports pandas and openpyxl locally to prevent crashes if they are missing or corrupt.
    """
    try:
        import pandas as pd
    except ImportError:
        logger.error("❌ Error: Pandas is not installed. Skipping Excel seed.")
        return

    if not os.path.exists(file_path):
        logger.warning(f"⚠️ Warning: Seed file {file_path} not found.")
        return

    try:
        logger.info(f"Reading Excel: {file_path}")
        df = pd.read_excel(file_path)
        
        expected_cols = ['codigo', 'modelo', 'tamano', 'precio_lista', 'costo_total', 'costo_fabrica', 'flete']
        for col in expected_cols:
            if col not in df.columns:
                logger.warning(f"⚠️ Warning: Column {col} missing in Excel. Skipping.")
                return

        conn = db()
        cur = conn.cursor()
        
        for _, row in df.iterrows():
            try:
                # Basic columns
                codigo = str(row['codigo'])
                modelo = str(row['modelo']) if 'modelo' in df.columns else ""
                tamano = str(row['tamano']) if 'tamano' in df.columns else "Chico"
                precio_lista = float(row['precio_lista']) if 'precio_lista' in df.columns else 0.0
                costo_total = float(row['costo_total']) if 'costo_total' in df.columns else 0.0
                costo_fabrica = float(row['costo_fabrica']) if 'costo_fabrica' in df.columns else 0.0
                flete = float(row['flete']) if 'flete' in df.columns else 0.0
                
                # Extended columns
                stock = int(row['stock']) if 'stock' in df.columns else 0
                activo = int(row['activo']) if 'activo' in df.columns else 1
                in_catalog = int(row['in_catalog']) if 'in_catalog' in df.columns else 1
                imagen_url = str(row['imagen_url']) if 'imagen_url' in df.columns and pd.notna(row['imagen_url']) else None

                cur.execute("""
                    INSERT INTO products (codigo, modelo, tamano, precio_lista, costo_total, costo_fabrica, flete, stock, activo, in_catalog, imagen_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    modelo=VALUES(modelo), tamano=VALUES(tamano), 
                    precio_lista=VALUES(precio_lista), costo_total=VALUES(costo_total),
                    costo_fabrica=VALUES(costo_fabrica), flete=VALUES(flete),
                    stock=VALUES(stock), activo=VALUES(activo), in_catalog=VALUES(in_catalog),
                    imagen_url=IFNULL(VALUES(imagen_url), products.imagen_url)
                """, (codigo, modelo, tamano, precio_lista, costo_total, costo_fabrica, flete, stock, activo, in_catalog, imagen_url))
            except Exception as e:
                logger.error(f"Error seeding row {row.get('codigo', 'unknown')}: {e}")
        
        conn.commit()
        conn.close()
        logger.info("✅ Excel seeding finished successfully.")
        
    except Exception as e:
        logger.error(f"❌ Critical error during Excel seeding: {e}")
