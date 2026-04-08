from fastapi import APIRouter, HTTPException
from database import db
from schemas import Promotion, PromotionBase
from typing import List

router = APIRouter()

@router.get("/promotions", response_model=List[Promotion])
def get_promotions():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM promotions ORDER BY is_active DESC, name ASC")
        promos = cur.fetchall()
        
        # Hydrate with category_ids
        for p in promos:
            cur.execute("SELECT category_id FROM promotion_categories WHERE promo_id = %s", (p["id"],))
            p["category_ids"] = [row["category_id"] for row in cur.fetchall()]
        
        return promos
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
            INSERT INTO promotions(name, discount_pct, is_active, type, code)
            VALUES (%s, %s, %s, %s, %s)
        """, (data.name.strip(), data.discount_pct, data.is_active, data.type, data.code))
        promo_id = cur.lastrowid
        
        # Save categories
        for cat_id in data.category_ids:
            cur.execute("INSERT INTO promotion_categories (promo_id, category_id) VALUES (%s, %s)", (promo_id, cat_id))
            
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
            UPDATE promotions 
            SET name=%s, discount_pct=%s, is_active=%s, type=%s, code=%s 
            WHERE id=%s
        """, (data.name, data.discount_pct, data.is_active, data.type, data.code, promo_id))
        
        # Sync categories
        cur.execute("DELETE FROM promotion_categories WHERE promo_id = %s", (promo_id,))
        for cat_id in data.category_ids:
            cur.execute("INSERT INTO promotion_categories (promo_id, category_id) VALUES (%s, %s)", (promo_id, cat_id))
            
        conn.commit()
        return {**data.dict(), "id": promo_id}
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
        # Relationships are CASCADE in DB migration, but let's be explicit if needed or just trust DB
        cur.execute("DELETE FROM promotion_categories WHERE promo_id = %s", (promo_id,))
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
