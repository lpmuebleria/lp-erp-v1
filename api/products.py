from fastapi import APIRouter, Request, HTTPException, UploadFile, File
import pandas as pd
import io
from fastapi.responses import StreamingResponse
from logger_config import logger
import shutil
import os
import uuid
import cloudinary
import cloudinary.uploader
from typing import List, Optional
from database import db
from schemas import Product, ProductCreate
from utils import money
from api.notifications import trigger_notification

router = APIRouter()

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


@router.get("/products/template")
def download_template():
    """Generates a template Excel for product import."""
    try:
        cols = ['codigo', 'modelo', 'tamano', 'precio_lista', 'costo_total', 'costo_fabrica', 'flete', 'maniobras', 'empaque', 'comision', 'garantias', 'utilidad_nivel', 'activo', 'stock', 'imagen_url', 'in_catalog']
        # Sample data
        data = [{
            'codigo': 'PROD001',
            'modelo': 'Sofa Cama Luxury',
            'tamano': 'King Size',
            'precio_lista': 5500.00,
            'costo_total': 3200.00,
            'costo_fabrica': 2800.00,
            'flete': 400.00,
            'maniobras': 50.00,
            'empaque': 100.00,
            'comision': 0.05,
            'garantias': 0.02,
            'utilidad_nivel': 0.30,
            'activo': True,
            'stock': 10,
            'imagen_url': 'https://example.com/image.jpg',
            'in_catalog': True
        }]
        
        df = pd.DataFrame(data, columns=cols) # Ensure all columns are present even if sample data is partial
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Productos')
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=plantilla_inventario_lp.xlsx"}
        )
    except Exception as e:
        logger.error(f"Error generating template: {e}") 
        raise HTTPException(status_code=500, detail="Error al generar la plantilla")


@router.get("/products", response_model=List[Product])
def get_products(q: Optional[str] = None):
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
    else:
        cur.execute("""
            SELECT * FROM products
            ORDER BY activo DESC, codigo
            LIMIT 200
        """)
    
    rows = cur.fetchall()
    conn.close()
    return rows

@router.get("/products/{product_id}", response_model=Product)
def get_product(product_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM products WHERE id=%s", (product_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return row

@router.post("/products")
def create_product(data: ProductCreate):
    # Validation against whitespace-only strings
    if not data.codigo.strip():
        raise HTTPException(status_code=400, detail="El código del producto no puede estar vacío.")
    if not data.modelo.strip():
        raise HTTPException(status_code=400, detail="El modelo del producto no puede estar vacío.")
    if not data.tamano.strip():
        raise HTTPException(status_code=400, detail="El tamaño del producto no puede estar vacío.")

    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO products (codigo, modelo, tamano, precio_lista, costo_total, costo_fabrica, flete, maniobras, empaque, comision, garantias, utilidad_nivel, activo, stock, imagen_url, in_catalog)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.codigo.strip(),
            data.modelo.strip(),
            data.tamano.strip(),
            data.precio_lista,
            data.costo_total,
            data.costo_fabrica,
            data.flete,
            data.maniobras,
            data.empaque,
            data.comision,
            data.garantias,
            data.utilidad_nivel,
            data.activo,
            data.stock,
            data.imagen_url,
            data.in_catalog
        ))
        conn.commit()
        product_id = cur.lastrowid

        # Notify Admin
        trigger_notification(
            role_target="admin",
            type="info",
            title="Nuevo Producto",
            message=f"Se agregó el modelo {data.modelo} ({data.codigo})",
        )

        return {"id": product_id, "status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductCreate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            UPDATE products 
            SET codigo=%s, modelo=%s, tamano=%s, precio_lista=%s, costo_total=%s, costo_fabrica=%s, flete=%s, maniobras=%s, empaque=%s, comision=%s, garantias=%s, utilidad_nivel=%s, activo=%s, stock=%s, imagen_url=%s, in_catalog=%s
            WHERE id=%s
        """, (
            data.codigo,
            data.modelo,
            data.tamano,
            data.precio_lista,
            data.costo_total,
            data.costo_fabrica,
            data.flete,
            data.maniobras,
            data.empaque,
            data.comision,
            data.garantias,
            data.utilidad_nivel,
            data.activo,
            data.stock,
            data.imagen_url,
            data.in_catalog,
            product_id
        ))
        
        # Trigger auto-update for orders if stock becomes available
        if data.stock > 0:
            cur.execute("""
                UPDATE orders o
                JOIN quote_lines ql ON o.quote_id = ql.quote_id
                SET o.estatus = 'LISTO ENTREGA'
                WHERE ql.product_id = %s AND o.estatus = 'EN FABRICACIÓN'
            """, (product_id,))
            
            # Fetch affected orders to notify
            cur.execute("""
                SELECT o.id, o.folio, o.vendedor FROM orders o
                JOIN quote_lines ql ON o.quote_id = ql.quote_id
                WHERE ql.product_id = %s AND o.estatus = 'LISTO ENTREGA'
            """, (product_id,))
            updated_orders = cur.fetchall()
            
            from api.notifications import trigger_notification
            for uo in updated_orders:
                msg = f"El pedido {uo['folio']} pasó a LISTO ENTREGA automáticamente (Ha llegado stock del mueble {data.modelo})"
                trigger_notification("admin", "success", "Pedido Listo p/ Entrega", msg, uo['id'])
                if uo['vendedor']:
                    trigger_notification("vendedor", "success", "Pedido Listo p/ Entrega", msg, uo['id'])
            
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    try:
        # Upload directly to Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder="lp_erp_inventory",
            resource_type="image"
        )
        return {"url": result.get("secure_url")}
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo subir la imagen a la nube: {str(e)}")

@router.post("/products/import")
async def import_products(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx o .xls)")

    # Save temporary file
    temp_path = os.path.join(UPLOAD_DIR, f"import_{uuid.uuid4()}_{file.filename}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Call seed service
        from services.excel_service import seed_from_excel
        seed_from_excel(temp_path)
        
        return {"status": "success", "message": "Productos importados correctamente"}
    except Exception as e:
        logger.error(f"Error importing excel: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el Excel: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
