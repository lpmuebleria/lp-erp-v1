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
                cur.execute("""
                    INSERT INTO products (codigo, modelo, tamano, precio_lista, costo_total, costo_fabrica, flete)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    modelo=VALUES(modelo), tamano=VALUES(tamano), 
                    precio_lista=VALUES(precio_lista), costo_total=VALUES(costo_total),
                    costo_fabrica=VALUES(costo_fabrica), flete=VALUES(flete)
                """, (
                    str(row['codigo']),
                    str(row['modelo']),
                    str(row['tamano']),
                    float(row['precio_lista']),
                    float(row['costo_total']),
                    float(row['costo_fabrica']),
                    float(row['flete'])
                ))
            except Exception as e:
                logger.error(f"Error seeding row {row['codigo']}: {e}")
        
        conn.commit()
        conn.close()
        logger.info("✅ Excel seeding finished successfully.")
        
    except Exception as e:
        logger.error(f"❌ Critical error during Excel seeding: {e}")
