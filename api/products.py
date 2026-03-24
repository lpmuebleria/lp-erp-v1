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
    try:
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
        return rows
    finally:
        conn.close()

@router.get("/products/next-code")
def get_next_code(is_madre: int = 0):
    conn = db()
    cur = conn.cursor()
    try:
        prefix = "LPM" if is_madre == 1 else "LP"
        # We need to find the max numeric part for codes starting with exactly the prefix (and not the other one)
        # For LP, we must exclude LPM
        if is_madre == 0:
            cur.execute("SELECT codigo FROM products WHERE codigo LIKE 'LP%' AND codigo NOT LIKE 'LPM%'")
        else:
            cur.execute("SELECT codigo FROM products WHERE codigo LIKE 'LPM%'")
        
        rows = cur.fetchall()
        max_num = 0
        for (code,) in rows:
            try:
                # Extract digits from the end
                import re
                match = re.search(r'\d+$', code)
                if match:
                    num = int(match.group())
                    if num > max_num:
                        max_num = num
            except:
                continue
        
        next_num = max_num + 1
        return {"next_code": f"{prefix}{next_num:04d}"}
    finally:
        conn.close()

@router.get("/products/{product_id}", response_model=Product)
def get_product(product_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM products WHERE id=%s", (product_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        # If is_madre, fetch allowed fabrics and colors (Both IDs and Names)
        if row.get("is_madre"):
            cur.execute("""
                SELECT f.id, f.name FROM fabrics f 
                JOIN product_fabrics pf ON f.id = pf.fabric_id 
                WHERE pf.product_id = %s
            """, (product_id,))
            fabrics = cur.fetchall()
            row["allowed_fabric_names"] = [f["name"] for f in fabrics]
            row["allowed_fabric_ids"] = [f["id"] for f in fabrics]
            
            cur.execute("""
                SELECT c.id, c.name FROM colors c 
                JOIN product_colors pc ON c.id = pc.color_id 
                WHERE pc.product_id = %s
            """, (product_id,))
            colors = cur.fetchall()
            row["allowed_color_names"] = [c["name"] for c in colors]
            row["allowed_color_ids"] = [c["id"] for c in colors]
        else:
            row["allowed_fabric_names"] = []
            row["allowed_fabric_ids"] = []
            row["allowed_color_names"] = []
            row["allowed_color_ids"] = []

        return row
    finally:
        conn.close()

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
            INSERT INTO products (codigo, modelo, tamano, precio_lista, costo_total, costo_fabrica, flete, maniobras, empaque, comision, garantias, utilidad_nivel, activo, stock, imagen_url, in_catalog, is_madre)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            data.in_catalog,
            data.is_madre
        ))
        product_id = cur.lastrowid

        # Insert fabrics/colors if is_madre
        if data.is_madre:
            for f_id in data.allowed_fabric_ids:
                cur.execute("INSERT INTO product_fabrics (product_id, fabric_id) VALUES (%s, %s)", (product_id, f_id))
            for c_id in data.allowed_color_ids:
                cur.execute("INSERT INTO product_colors (product_id, color_id) VALUES (%s, %s)", (product_id, c_id))
        
        conn.commit()

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
            SET codigo=%s, modelo=%s, tamano=%s, precio_lista=%s, costo_total=%s, costo_fabrica=%s, flete=%s, maniobras=%s, empaque=%s, comision=%s, garantias=%s, utilidad_nivel=%s, activo=%s, stock=%s, imagen_url=%s, in_catalog=%s, is_madre=%s
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
            data.is_madre,
            product_id
        ))

        # Sync fabrics/colors if is_madre (or even if not, to clean up)
        cur.execute("DELETE FROM product_fabrics WHERE product_id=%s", (product_id,))
        cur.execute("DELETE FROM product_colors WHERE product_id=%s", (product_id,))
        
        if data.is_madre:
            for f_id in data.allowed_fabric_ids:
                cur.execute("INSERT INTO product_fabrics (product_id, fabric_id) VALUES (%s, %s)", (product_id, f_id))
            for c_id in data.allowed_color_ids:
                cur.execute("INSERT INTO product_colors (product_id, color_id) VALUES (%s, %s)", (product_id, c_id))
        
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
async def upload_image(request: Request, file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    
    # CASE 1: Cloudinary is configured
    if cloud_name and cloud_name.strip() and cloud_name != "None":
        try:
            # Upload directly to Cloudinary
            result = cloudinary.uploader.upload(
                file.file,
                folder="lp_erp_inventory",
                resource_type="image"
            )
            return {"url": result.get("secure_url")}
        except Exception as e:
            logger.error(f"Error uploading to Cloudinary: {e}")
            # Fallthrough to local if Cloudinary fails? 
            # For now, let's keep it separate or just proceed to local if it fails.
            pass

    # CASE 2: Local Storage Fallback
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".jpg" # Fallback extension
            
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Build local URL. 
        # We use the request host to make it absolute so frontend can see it.
        base_url = str(request.base_url).rstrip("/")
        # If running behind a proxy (like Render), base_url might be http but we need https
        if request.headers.get("x-forwarded-proto") == "https":
            base_url = base_url.replace("http://", "https://")
            
        local_url = f"{base_url}/static/uploads/{unique_filename}"
        return {"url": local_url}
    except Exception as e:
        logger.error(f"Error saving image locally: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la imagen: {str(e)}")

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
