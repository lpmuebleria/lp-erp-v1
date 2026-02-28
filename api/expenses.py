from fastapi import APIRouter, HTTPException
from database import db
from schemas import ExpenseCreate
from utils import compute_bolsas, today_iso

router = APIRouter()

@router.get("/expenses/details/{concepto}")
def get_concept_details(concepto: str, start_date: str, end_date: str):
    conn = db()
    cur = conn.cursor(dictionary=True)

    try:
        # 1. Fetch Egresos (Expenses)
        cur.execute("""
            SELECT id, monto, descripcion, fecha, created_at 
            FROM expenses 
            WHERE concepto = %s AND fecha BETWEEN %s AND %s
            ORDER BY fecha DESC, id DESC
        """, (concepto, start_date, end_date))
        egresos = cur.fetchall()

        # 2. Fetch Ingresos (Orders that contributed to this concept)
        # Solo pedidos no cancelados
        cur.execute("""
            SELECT o.id as order_id, o.folio, o.created_at, o.estatus, q.cliente_nombre, q.id as quote_id
            FROM orders o
            JOIN quotes q ON o.quote_id = q.id
            WHERE DATE(o.created_at) BETWEEN %s AND %s
            AND o.estatus != 'CANCELADO'
            ORDER BY o.created_at DESC
        """, (start_date, end_date))
        orders = cur.fetchall()

        ingresos = []
        for o in orders:
            # We calculate the bolsas for this specific order
            bolsas = compute_bolsas(cur, o["quote_id"])
            monto_aportado = bolsas.get(concepto, 0.0)
            
            if monto_aportado > 0:
                ingresos.append({
                    "order_id": o["order_id"],
                    "folio": o["folio"],
                    "cliente_nombre": o["cliente_nombre"],
                    "monto": monto_aportado,
                    "fecha": o["created_at"]
                })

        # Totals
        total_ingresos = sum(item["monto"] for item in ingresos)
        total_egresos = sum(float(item["monto"]) for item in egresos)
        balance_neto = total_ingresos - total_egresos

        return {
            "concepto": concepto,
            "periodo": {"start": start_date, "end": end_date},
            "totales": {
                "ingresos": total_ingresos,
                "egresos": total_egresos,
                "balance": balance_neto
            },
            "ingresos": ingresos,
            "egresos": egresos
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/expenses")
def create_expense(data: ExpenseCreate):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO expenses (concepto, monto, descripcion, fecha, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (data.concepto, data.monto, data.descripcion, data.fecha, today_iso()))
        conn.commit()
        return {"status": "success", "message": "Gasto registrado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
