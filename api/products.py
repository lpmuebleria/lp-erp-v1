from fastapi import APIRouter, Request, HTTPException, UploadFile, File
import shutil
import os
import uuid
from typing import List, Optional
from database import db
from schemas import Product, ProductCreate
from utils import money
from api.notifications import trigger_notification

router = APIRouter()


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

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        print(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la imagen: {str(e)}")

    return {"url": f"http://localhost:8000/static/uploads/{filename}"}
