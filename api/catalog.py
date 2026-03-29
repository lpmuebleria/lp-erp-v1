from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from database import db
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from io import BytesIO
import os
import datetime
import base64

from utils import get_image_b64, calculate_rounding
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class PublicProduct(BaseModel):
    codigo: str
    modelo: str
    tamano: str
    precio_lista: float
    precio_msi: float
    stock: int
    imagen_url: Optional[str]
    is_offer: int

@router.get("/catalog/products", response_model=List[PublicProduct])
def get_public_catalog():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        # Fetch Interes MSI
        try:
            cur.execute("SELECT v FROM settings WHERE k='interes_msi_pct'")
            row_int = cur.fetchone()
            interes_msi_pct = float(row_int["v"]) if row_int and row_int["v"] else 15.0
        except:
            interes_msi_pct = 15.0

        cur.execute("""
            SELECT codigo, modelo, tamano, precio_lista, stock, imagen_url, is_offer
            FROM products 
            WHERE in_catalog = 1 AND activo = 1
            ORDER BY modelo ASC
        """)
        products = cur.fetchall()
        for p in products:
            p['precio_lista'] = float(p['precio_lista'] or 0)
            raw_msi = p['precio_lista'] * (1 + interes_msi_pct / 100)
            p['precio_msi'] = calculate_rounding(raw_msi)
        
        return products
    finally:
        conn.close()

@router.get("/catalog/categories")
def get_catalog_categories():
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT tamano FROM products WHERE in_catalog = 1 AND activo = 1")
        rows = cur.fetchall()
        return [r[0] for r in rows if r[0]]
    finally:
        conn.close()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, "api", "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

from pydantic import BaseModel

class CatalogCommentConfig(BaseModel):
    comentarios: str

@router.get("/catalog/comments", response_model=CatalogCommentConfig)
def get_catalog_comments():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT v FROM settings WHERE k='comentarios_catalogo'")
        row = cur.fetchone()
        val = row['v'] if row and row['v'] else ""
        return {"comentarios": val}
    finally:
        conn.close()

@router.put("/catalog/comments")
def update_catalog_comments(data: CatalogCommentConfig):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO settings (k, v) VALUES ('comentarios_catalogo', %s)
            ON DUPLICATE KEY UPDATE v=%s
        """, (data.comentarios, data.comentarios))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/catalog/pdf")
def generate_catalog_pdf(include_stock: str = "false"):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT v FROM settings WHERE k='comentarios_catalogo'")
        row_comment = cur.fetchone()
        comentarios_catalogo = row_comment["v"] if row_comment and row_comment["v"] else ""

        # Fetch Interes MSI for calculation
        try:
            cur.execute("SELECT v FROM settings WHERE k='interes_msi_pct'")
            row_int = cur.fetchone()
            interes_msi_pct = float(row_int["v"]) if row_int and row_int["v"] else 15.0
        except:
            interes_msi_pct = 15.0

        # Fetch products marked for catalog and active
        cur.execute("""
            SELECT codigo, modelo, precio_lista, stock, imagen_url 
            FROM products 
            WHERE in_catalog = 1 AND activo = 1
            ORDER BY modelo ASC
        """)
        products = cur.fetchall()
        for p in products:
            p['precio_lista'] = float(p['precio_lista'] or 0)
            # Calculate rounded MSI
            raw_msi = p['precio_lista'] * (1 + interes_msi_pct / 100)
            p['precio_msi'] = calculate_rounding(raw_msi)
        
        # We can close the connection now as we have the data
        cur.close()
        conn.close()
        conn = None # Set to None to avoid double closing in finally

        for p in products:
            img_url = p.get('imagen_url')
            if not img_url:
                p['b64'] = None
            else:
                p['b64'] = get_image_b64(img_url)

        if not products:
            raise HTTPException(status_code=400, detail="No hay productos marcados para el catálogo.")

        # Prepare parameters
        show_stock = include_stock.lower() == "true"
        current_date = datetime.datetime.now().strftime("%d/%m/%Y")

        # Load Branding Images as Base64 from api/static/img
        logo_b64 = get_image_b64('logo.jpg') or get_image_b64('logo.png') or get_image_b64('logo.jpeg')
        fb_b64 = get_image_b64('Facebook_logo.png')
        ig_b64 = get_image_b64('Instagram_icon.png')
        wa_b64 = get_image_b64('whatsapp_icon.png')

        # Load Jinja Template
        template = env.get_template("catalog.html")
        html_out = template.render(
            products=products,
            show_stock=show_stock,
            current_date=current_date,
            logo_b64=logo_b64,
            fb_b64=fb_b64,
            ig_b64=ig_b64,
            wa_b64=wa_b64,
            comentarios_catalogo=comentarios_catalogo,
            interes_msi_pct=interes_msi_pct,
            base_url="http://localhost:8000" 
        )

        pdf_file = HTML(string=html_out).write_pdf()

        return Response(
            content=pdf_file,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Catalogo_Muebleria_Torreon_{current_date.replace('/','-')}.pdf"
            }
        )
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"FAILED CATALOG GENERATION: {e}")
        raise HTTPException(status_code=500, detail=str(err_msg))
    finally:
        if conn:
            conn.close()
