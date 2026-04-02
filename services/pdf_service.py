import os
from jinja2 import Environment, FileSystemLoader
from fastapi import HTTPException
from logger_config import logger

# Absolute path to templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "api", "templates")

def generate_receipt_pdf(context: dict, template_name: str = 'receipt.html') -> bytes:
    """
    Renders receipt.html with context and generates a PDF using WeasyPrint.
    Imports WeasyPrint locally to avoid startup crashes if it fails to load.
    """
    try:
        from weasyprint import HTML
    except ImportError:
        logger.error("❌ Error: WeasyPrint is not installed or failed to load.")
        raise HTTPException(status_code=500, detail="El motor de generación de PDF no está disponible.")

    try:
        # Add logos to context if not present
        from utils import get_image_b64 # Fallback to utils if not in security
        context.setdefault("logo_b64", get_image_b64('logo.jpg') or get_image_b64('logo.png') or get_image_b64('logo.jpeg'))
        context.setdefault("fb_b64", get_image_b64('Facebook_logo.png'))
        context.setdefault("ig_b64", get_image_b64('Instagram_icon.png'))
        context.setdefault("wa_b64", get_image_b64('whatsapp_icon.png'))

        # Setup Jinja2
        env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
        template = env.get_template(template_name)
        html_out = template.render(context)
        
        # Generate PDF
        pdf_bytes = HTML(string=html_out).write_pdf()
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"❌ Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {str(e)}")
