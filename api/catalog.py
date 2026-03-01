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



@router.get("/catalog/pdf")
def generate_catalog_pdf(include_stock: str = "false"):
    try:
        conn = db()
        cur = conn.cursor(dictionary=True)
        # Fetch products marked for catalog and active
        cur.execute("""
            SELECT codigo, modelo, precio_lista, stock, imagen_url 
            FROM products 
            WHERE in_catalog = 1 AND activo = 1
            ORDER BY modelo ASC
        """)
        products = cur.fetchall()
        conn.close()

        # Fix deadlock: Resolve HTTP URLs to actual local file paths
        UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
        for p in products:
            if p['imagen_url'] and p['imagen_url'].startswith('http://localhost:8000/static/uploads/'):
                filename = p['imagen_url'].split('/')[-1]
                p['local_image_path'] = "file:///" + os.path.join(UPLOAD_DIR, filename).replace('\\', '/')
            else:
                p['local_image_path'] = None

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
