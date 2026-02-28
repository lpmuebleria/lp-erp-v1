from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
from database import init_db
from utils import seed_from_excel, BASE_DIR

app = FastAPI(title="LP ERP API v2")

# CORS Configuration for React
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key="LP-ERP-SECRET-CHANGE-ME")

@app.on_event("startup")
def startup_event():
    init_db()
    excel_default = os.path.join(os.path.dirname(__file__), "Muebleria Torreón.xlsx")
    seed_from_excel(excel_default)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0.0-react-ready"}

from fastapi.staticfiles import StaticFiles
from api import auth, products, orders, quotes, dashboard, payments, agenda, config, notifications, promotions, expenses, roles, shipping

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

app.mount("/static", StaticFiles(directory="static"), name="static")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
