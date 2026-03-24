from fastapi import APIRouter, HTTPException
from database import db
from pydantic import BaseModel
from typing import List

router = APIRouter()

class PromotionBase(BaseModel):
    name: str
    discount_pct: float
    is_active: int = 1

class Promotion(PromotionBase):
    id: int

@router.get("/promotions", response_model=List[Promotion])
def get_promotions():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM promotions ORDER BY is_active DESC, name ASC")
        rows = cur.fetchall()
        return rows
    finally:
        conn.close()

@router.post("/promotions", response_model=Promotion)
def create_promotion(data: PromotionBase):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="El nombre de la promoción no puede estar vacío.")

    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            INSERT INTO promotions(name, discount_pct, is_active)
            VALUES (%s, %s, %s)
        """, (data.name.strip(), data.discount_pct, data.is_active))
        promo_id = cur.lastrowid
        conn.commit()
        return {**data.dict(), "id": promo_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/promotions/{promo_id}", response_model=Promotion)
def update_promotion(promo_id: int, data: PromotionBase):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            UPDATE promotions SET name=%s, discount_pct=%s, is_active=%s WHERE id=%s
        """, (data.name, data.discount_pct, data.is_active, promo_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Promoción no encontrada")
        conn.commit()
        return {**data.dict(), "id": promo_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/promotions/{promo_id}")
def delete_promotion(promo_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("DELETE FROM promotions WHERE id=%s", (promo_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Promoción no encontrada")
        conn.commit()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
