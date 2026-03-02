import os
import markdown
import base64
from weasyprint import HTML

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAIN_DIR = r"C:\Users\Lpmue\.gemini\antigravity\brain\d092a66c-289b-4ae9-9ff8-dd3a854d94c9"
OUTPUT_DIR = os.path.join(BASE_DIR, "docs", "Manuales_Operacion")
LOGO_PATH = os.path.join(BASE_DIR, "api", "static", "img", "logo.png")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Get Logo Base64
logo_b64 = ""
if os.path.exists(LOGO_PATH):
    with open(LOGO_PATH, "rb") as f:
        logo_b64 = f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"

# Common Styles (Matching the Ivory Elegant Catalog)
CSS = """
@page {
    size: a4;
    margin: 25mm 20mm;
    @bottom-right {
        content: "Página " counter(page);
        font-size: 9pt;
        color: #64748b;
    }
}

body {
    font-family: 'Helvetica', Arial, sans-serif;
    color: #1e293b;
    background-color: #faf9f6; /* Ivory Cream */
    line-height: 1.6;
}

header {
    border-bottom: 2px solid #b8860b;
    padding-bottom: 15px;
    margin-bottom: 40px;
    display: table;
    width: 100%;
}

.header-left { display: table-cell; vertical-align: middle; width: 30%; }
.header-right { display: table-cell; vertical-align: middle; text-align: right; }

.logo { max-height: 60px; }

h1 { color: #b8860b; font-size: 24pt; margin: 0; }
h2 { color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; }
h3 { color: #475569; }

p, li { font-size: 11pt; }

code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
.footer { position: fixed; bottom: -10mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: #94a3b8; }
"""

def generate_pdf(md_filename, pdf_name):
    md_path = os.path.join(BRAIN_DIR, md_filename)
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    html_content = markdown.markdown(md_content)

    full_html = f"""
    <html>
    <head><style>{CSS}</style></head>
    <body>
        <header>
            <div class="header-left">
                <img src="{logo_b64}" class="logo">
            </div>
            <div class="header-right">
                <p style="margin:0; font-weight:bold; color:#b8860b;">LP MUEBLERÍA DE JALISCO</p>
                <p style="margin:0; font-size:9pt; color:#64748b;">Manual de Operación ERP</p>
            </div>
        </header>
        
        {html_content}

        <div class="footer">
            LP Mueblería de Jalisco - Software de Gestión V1.0 - 2026
        </div>
    </body>
    </html>
    """

    output_path = os.path.join(OUTPUT_DIR, pdf_name)
    HTML(string=full_html).write_pdf(output_path)
    print(f"Generated: {output_path}")

# Generate the 3 manuals
generate_pdf("Manual_Vendedor.md", "Manual_Vendedor_LP.pdf")
generate_pdf("Manual_Administrador.md", "Manual_Administrador_LP.pdf")
generate_pdf("Manual_Admin_General.md", "Manual_Admin_General_LP.pdf")
