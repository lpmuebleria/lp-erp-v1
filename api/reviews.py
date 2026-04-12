from fastapi import APIRouter, HTTPException
from typing import List
from database import db
from schemas import Review, ReviewCreate
import re
from better_profanity import profanity

router = APIRouter()

# Cargar base de groserías (mantenemos esto para el scoring en rojo)
profanity.load_censor_words()

def calculate_quality_score(text: str, calificacion: int):
    score = 100
    low_text = text.lower()
    
    # 0. Spam o Groserías Graves -> Muerte súbita
    if re.search(r"http[s]?://|www\.", low_text) or profanity.contains_profanity(text):
        return 0

    # 1. Penalización por longitud
    if len(text.strip()) < 10:
        score -= 40
        
    # 2. Penalización por informalidad extrema (k, q)
    if re.search(r'\bk\b|\bq\b', low_text):
        score -= 30
            
    # 3. Penalización por gritos
    if text.isupper() and len(text) > 5:
        score -= 30
        
    # 4. Letras repetidas o patrones extraños (gibberish)
    if re.search(r"(.)\1{3,}", low_text) or re.search(r"[bcdfghjklmnpqrstvwxyz]{4,}", low_text):
        score -= 50

    return max(0, min(100, score))

def clean_text_safe(text: str):
    """
    Limpieza segura: Solo formato, NO cambia palabras.
    """
    # 1. Quitar exceso de signos
    text = re.sub(r'([!?.]){2,}', r'\1', text)
    
    # 2. Quitar letras repetidas excesivas (ej: holaaaaaa -> holaa)
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)
    
    # 3. Quitar espacios dobles
    text = re.sub(r'\s+', ' ', text)
    
    # 4. Capitalización básica
    text = text.strip()
    if text.isupper():
        text = text.capitalize()
    if text:
        text = text[0].upper() + text[1:]
        
    return text

@router.get("/catalog/products/{product_id}/reviews", response_model=List[Review])
def get_product_reviews(product_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT id, product_id, cliente_nombre, calificacion, comentario, fecha 
            FROM product_reviews 
            WHERE product_id = %s AND is_approved = 1
            ORDER BY fecha DESC
        """, (product_id,))
        return cur.fetchall()
    finally:
        conn.close()

@router.post("/catalog/products/{product_id}/reviews", response_model=Review)
def submit_review(product_id: int, review: ReviewCreate):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            INSERT INTO product_reviews (product_id, cliente_nombre, calificacion, comentario, is_approved)
            VALUES (%s, %s, %s, %s, 0)
        """, (product_id, review.cliente_nombre, review.calificacion, review.comentario))
        conn.commit()
        
        review_id = cur.lastrowid
        cur.execute("SELECT * FROM product_reviews WHERE id = %s", (review_id,))
        return cur.fetchone()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/admin/reviews", response_model=List[dict])
def get_all_reviews_admin():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT r.*, p.modelo as product_modelo
            FROM product_reviews r
            JOIN products p ON r.product_id = p.id
            ORDER BY r.is_approved ASC, r.fecha DESC
        """)
        reviews = cur.fetchall()
        
        for rev in reviews:
            score = calculate_quality_score(rev['comentario'], rev['calificacion'])
            rev['calidad_score'] = score
            
            # Clasificación visual simplificada
            if score >= 80:
                rev['gravedad'] = 'green'
                rev['gravedad_razon'] = 'Excelente'
            elif score >= 40:
                rev['gravedad'] = 'yellow'
                rev['gravedad_razon'] = 'Calidad media'
            else:
                rev['gravedad'] = 'red'
                rev['gravedad_razon'] = 'Calidad baja o inapropiado'
                
        unapproved = [r for r in reviews if not r['is_approved']]
        approved = [r for r in reviews if r['is_approved']]
        unapproved.sort(key=lambda x: x['calidad_score'], reverse=True)
        
        return unapproved + approved
    finally:
        conn.close()

@router.put("/admin/reviews/{review_id}/text")
def update_review_text(review_id: int, update_data: dict):
    """
    Endpoint para edición manual del comentario.
    """
    if "comentario" not in update_data:
        raise HTTPException(status_code=400, detail="Falta el campo comentario")
        
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE product_reviews SET comentario = %s WHERE id = %s", (update_data["comentario"], review_id))
        conn.commit()
        return {"message": "Comentario actualizado"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/admin/reviews/{review_id}/optimize")
def optimize_review(review_id: int):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT comentario FROM product_reviews WHERE id = %s", (review_id,))
        rev = cur.fetchone()
        if not rev:
            raise HTTPException(status_code=404, detail="Reseña no encontrada")
            
        cleaned = clean_text_safe(rev['comentario'])
        
        # Guardamos el texto optimizado pero NO aprobamos todavía
        cur.execute("UPDATE product_reviews SET comentario = %s WHERE id = %s", (cleaned, review_id))
        conn.commit()
        
        return {"message": "Reseña optimizada (formato corregido)", "cleaned_text": cleaned}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/admin/reviews/approve-all-green")
def approve_all_green():
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, comentario, calificacion FROM product_reviews WHERE is_approved = 0")
        pending = cur.fetchall()
        ids_to_approve = [p['id'] for p in pending if calculate_quality_score(p['comentario'], p['calificacion']) >= 85]
        
        if ids_to_approve:
            format_strings = ','.join(['%s'] * len(ids_to_approve))
            cur.execute(f"UPDATE product_reviews SET is_approved = 1 WHERE id IN ({format_strings})", tuple(ids_to_approve))
            conn.commit()
            return {"message": f"Se aprobaron {len(ids_to_approve)} reseñas"}
        return {"message": "No hay reseñas automáticas pendientes"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/admin/reviews/{review_id}/approve")
def approve_review(review_id: int):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE product_reviews SET is_approved = 1 WHERE id = %s", (review_id,))
        conn.commit()
        return {"message": "Reseña aprobada"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/admin/reviews/{review_id}")
def delete_review(review_id: int):
    conn = db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM product_reviews WHERE id = %s", (review_id,))
        conn.commit()
        return {"message": "Reseña eliminada"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
