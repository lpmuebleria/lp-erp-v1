from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from database import db
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from io import BytesIO
import os
import datetime
import base64

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, "api", "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def get_image_base64(path):
    try:
        with open(path, "rb") as image_file:
            ext = path.split('.')[-1].lower()
            mime = 'image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png'
            encoded = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:{mime};base64,{encoded}"
    except Exception as e:
        print(f"Error loading image {path}:", e)
        return ""

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

        # Fix deadlock: Resolve HTTP URLs to actual local file paths for xhtml2pdf to read directly
        UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
        for p in products:
            if p['imagen_url'] and p['imagen_url'].startswith('http://localhost:8000/static/uploads/'):
                filename = p['imagen_url'].split('/')[-1]
                p['local_image_path'] = os.path.join(UPLOAD_DIR, filename).replace('\\', '/')
            else:
                p['local_image_path'] = None

        if not products:
            raise HTTPException(status_code=400, detail="No hay productos marcados para el catálogo.")

        # Prepare parameters
        show_stock = include_stock.lower() == "true"
        current_date = datetime.datetime.now().strftime("%d/%m/%Y")

        # Load Branding Images as Base64
        logo_path = "C:/Users/Lpmue/OneDrive/Desktop/Muebleria/marketing/LP Mueblería Jalisco logo.jpeg"
        social_path = "C:/Users/Lpmue/OneDrive/Desktop/Muebleria/marketing/Redes sociales.png"
        
        logo_b64 = get_image_base64(logo_path)
        socials_b64 = get_image_base64(social_path)

        # Load Jinja Template
        template = env.get_template("catalog.html")
        html_out = template.render(
            products=products,
            show_stock=show_stock,
            current_date=current_date,
            logo_b64=logo_b64,
            socials_b64=socials_b64,
            base_url="http://localhost:8000" # fallback if required for static resolution
        )

        # Generate PDF with xhtml2pdf
        result = BytesIO()
        pisa_status = pisa.CreatePDF(
            BytesIO(html_out.encode("utf-8")),
            dest=result,
            encoding='UTF-8'
        )

        if pisa_status.err:
            raise Exception("Error generando el PDF")

        pdf_file = result.getvalue()

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
