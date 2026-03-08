from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from database import init_db
from services.excel_service import seed_from_excel
from utils import BASE_DIR
from logger_config import logger

app = FastAPI(title="LP ERP API v2")


# CORS Configuration for React
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Add production URLs from environment variable (comma separated)
frontend_urls = os.getenv("FRONTEND_URL", "https://lp-erp-v1.vercel.app,https://lpmuebleria.vercel.app")
for url in frontend_urls.split(","):
    if url.strip():
        origins.append(url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app", # Permite subdominios de Vercel (previews)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "LP-ERP-FALLBACK-SECRET-REPLACE-IN-PROD"))

from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse
from starlette.requests import Request

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "message": "Datos de entrada inválidos", "detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": "Ha ocurrido un error inesperado en el servidor"},
    )

@app.on_event("startup")
def startup_event():
    # 1. Initialize Database (Resilient)
    try:
        init_db()
        logger.info("✅ Database initialized successfully.")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")

    # 2. Seed from Excel (Resilient)
    try:
        excel_default = os.path.join(os.path.dirname(__file__), "Muebleria Torreón.xlsx")
        if os.path.exists(excel_default):
            seed_from_excel(excel_default)
            logger.info(f"✅ Seeding from {os.path.basename(excel_default)} completed.")
        else:
            logger.warning(f"ℹ️ Info: Seed file not found at {excel_default}. Skipping...")
    except Exception as e:
        logger.error(f"❌ Seeding from Excel failed: {e}")


from fastapi.staticfiles import StaticFiles
from api import auth, products, orders, quotes, dashboard, payments, agenda, config, notifications, promotions, expenses, roles, shipping, catalog

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(quotes.router, prefix="/api", tags=["Quotes"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(shipping.router, prefix="/api", tags=["Shipping"])
app.include_router(agenda.router, prefix="/api", tags=["Agenda"])
app.include_router(config.router, prefix="/api", tags=["Config"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(promotions.router, prefix="/api", tags=["Promotions"])
app.include_router(expenses.router, prefix="/api", tags=["Expenses"])
app.include_router(roles.router, prefix="/api", tags=["Roles"])
app.include_router(catalog.router, prefix="/api", tags=["Catalog"])

app.mount("/static", StaticFiles(directory="static"), name="static")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
