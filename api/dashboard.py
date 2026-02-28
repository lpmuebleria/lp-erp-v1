from fastapi import APIRouter, Request
from database import db
from schemas import DashboardMetrics
from utils import compute_bolsas
import datetime

router = APIRouter()

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics():
    conn = db()
    cur = conn.cursor(dictionary=True)

    today = datetime.date.today().isoformat()
    month_start = datetime.date.today().replace(day=1).isoformat()

    # Daily sales
    cur.execute(
        "SELECT total, anticipo_pagado FROM orders WHERE date(created_at)=date(%s)",
        (today,)
    )
    rows_day = cur.fetchall()

    # Monthly sales
    cur.execute(
        "SELECT total, anticipo_pagado FROM orders WHERE date(created_at) BETWEEN date(%s) AND date(%s)",
        (month_start, today)
    )
    rows_month = cur.fetchall()

    ventas_hoy = sum(float(r["total"] or 0) for r in rows_day)
    anticipos_hoy = sum(float(r["anticipo_pagado"] or 0) for r in rows_day)
    ventas_mes = sum(float(r["total"] or 0) for r in rows_month)
    anticipos_mes = sum(float(r["anticipo_pagado"] or 0) for r in rows_month)

    # Status summary
    cur.execute("SELECT estatus, COUNT(*) cnt FROM orders GROUP BY estatus")
    estatus_rows = cur.fetchall()
    pedidos_por_estatus = {r["estatus"]: int(r["cnt"]) for r in estatus_rows}

    # Quotes today
    cur.execute("SELECT COUNT(*) c FROM quotes WHERE date(created_at)=date(%s)", (today,))
    cot_hoy_row = cur.fetchone()
    cot_hoy = cot_hoy_row["c"] if cot_hoy_row else 0

    # Financial bags for the month
    bolsas_mes_total = {"maniobras": 0.0, "empaque": 0.0, "comision": 0.0, "garantias": 0.0, "muebles": 0.0, "fletes": 0.0, "envios": 0.0, "utilidad_bruta": 0.0}
    cur.execute("""
        SELECT quote_id FROM orders
        WHERE date(created_at) BETWEEN date(%s) AND date(%s)
        AND estatus != 'CANCELADO'
    """, (month_start, today))
    qids = cur.fetchall()

    for r in qids:
        b = compute_bolsas(cur, r["quote_id"])
        for k in bolsas_mes_total:
            bolsas_mes_total[k] += float(b.get(k, 0.0))

    utilidad_bruta_mes = bolsas_mes_total["utilidad_bruta"]

    conn.close()

    return {
        "today": today,
        "ventas_hoy": ventas_hoy,
        "anticipos_hoy": anticipos_hoy,
        "ventas_mes": ventas_mes,
        "anticipos_mes": anticipos_mes,
        "cot_hoy": int(cot_hoy),
        "utilidad_bruta_mes": utilidad_bruta_mes,
        "pedidos_por_estatus": pedidos_por_estatus,
        "bolsas_mes": bolsas_mes_total
    }
