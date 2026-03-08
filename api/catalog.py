from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from database import db
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from io import BytesIO
import os
import datetime
import base64

from utils import get_image_b64

router = APIRouter()

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
    cur.execute("SELECT v FROM settings WHERE k='comentarios_catalogo'")
    row = cur.fetchone()
    conn.close()
    val = row['v'] if row and row['v'] else ""
    return {"comentarios": val}

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
    try:
        conn = db()
        cur = conn.cursor(dictionary=True)
        
        # Fetch PDF Catalog Comments first
        cur.execute("SELECT v FROM settings WHERE k='comentarios_catalogo'")
        row_comment = cur.fetchone()
        comentarios_catalogo = row_comment["v"] if row_comment and row_comment["v"] else ""

        # Fetch products marked for catalog and active
        cur.execute("""
            SELECT codigo, modelo, precio_lista, stock, imagen_url 
            FROM products 
            WHERE in_catalog = 1 AND activo = 1
            ORDER BY modelo ASC
        """)
        products = cur.fetchall()
        
        conn.close()

        # Fix deadlock: Resolve URLs/Paths to actual local file paths for WeasyPrint
        UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads").replace('\\', '/')
        for p in products:
            img_url = p.get('imagen_url')
            if not img_url:
                p['local_image_path'] = None
                continue
            
            # Case 1: Full localhost URL
            if img_url.startswith(('http://localhost:8000/static/uploads/', 'http://127.0.0.1:8000/static/uploads/')):
                filename = img_url.split('/')[-1]
                p['local_image_path'] = f"file:///{UPLOAD_DIR}/{filename}"
            # Case 2: Relative path starting with /static/uploads/
            elif img_url.startswith('/static/uploads/'):
                filename = img_url.split('/')[-1]
                p['local_image_path'] = f"file:///{UPLOAD_DIR}/{filename}"
            # Case 3: Just the filename
            elif not img_url.startswith('http'):
                p['local_image_path'] = f"file:///{UPLOAD_DIR}/{img_url}"
            else:
                p['local_image_path'] = img_url # External URL, WeasyPrint will try to fetch it

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
            base_url="http://localhost:8000" # fallback if required for static resolution
        )

        # Generate PDF with WeasyPrint
        pdf_file = HTML(string=html_out).write_pdf()

        # Send as response
        return Response(
            content=pdf_file,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Catalogo_Muebleria_Torreon_{current_date.replace('/','-')}.pdf"
            }
        )
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
