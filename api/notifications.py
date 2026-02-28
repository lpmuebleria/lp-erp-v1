from fastapi import APIRouter, HTTPException
from database import db
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from utils import today_iso

router = APIRouter()

class NotificationResponse(BaseModel):
    id: str # Can be string for dynamic ones
    type: str # 'info', 'warning', 'success', 'error'
    title: str
    message: str
    is_read: int
    created_at: str
    related_order_id: Optional[int] = None
    role_target: str

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(role: str):
    conn = db()
    cur = conn.cursor(dictionary=True)
    
    notifications = []
    
    # 1. Fetch persistent unread notifications for this role
    cur.execute("""
        SELECT * FROM notifications 
        WHERE role_target = %s AND is_read = 0 
        ORDER BY id DESC
    """, (role,))
    
    db_notes = cur.fetchall()
    for row in db_notes:
        notifications.append({
            "id": str(row["id"]),
            "type": row["type"],
            "title": row["title"],
            "message": row["message"],
            "is_read": row["is_read"],
            "created_at": row["created_at"],
            "related_order_id": row["related_order_id"],
            "role_target": row["role_target"]
        })
        
    # 2. Dynamic Notifications (calculated on the fly)
    
    # 2a. Expiring orders (Pedidos por vencer) - For both Admin and Vendedor
    # Check if `entrega_promesa` is set and close to today.
    # Exclude ENTREGADO and CANCELADO
    cur.execute("""
        SELECT id, folio, entrega_promesa, estatus, vendedor FROM orders 
        WHERE estatus NOT IN ('ENTREGADO', 'CANCELADO') AND entrega_promesa != ''
    """)
    active_orders = cur.fetchall()
    
    today = datetime.now()
    
    for o in active_orders:
        try:
            promesa_date = datetime.strptime(o["entrega_promesa"], "%Y-%m-%d")
            delta = (promesa_date - today).days
            
            # Role matching: admin sees all, vendedor sees only theirs
            if role == "admin" or (role == "vendedor" and o["vendedor"]): # Assuming any vendor sees this for now, though ideally it's matched to their username
                
                if delta < 0:
                    notifications.append({
                        "id": f"dyn_late_{o['id']}",
                        "type": "error",
                        "title": "Entrega Retrasada",
                        "message": f"El pedido {o['folio']} tiene entrega retrasada ({o['entrega_promesa']}). Estatus: {o['estatus']}",
                        "is_read": 0,
                        "created_at": today_iso(),
                        "related_order_id": o["id"],
                        "role_target": role
                    })
                elif delta <= 2:
                    notifications.append({
                        "id": f"dyn_exp_{o['id']}",
                        "type": "warning",
                        "title": "Pedido por Vencer",
                        "message": f"El pedido {o['folio']} debe entregarse pronto ({o['entrega_promesa']}).",
                        "is_read": 0,
                        "created_at": today_iso(),
                        "related_order_id": o["id"],
                        "role_target": role
                    })
        except ValueError:
            pass # Ignore invalid dates
            
    # 2b. Pendings auths (Admin only)
    if role == "admin":
        cur.execute("SELECT id, folio, estatus_solicitado FROM orders WHERE estatus_solicitado != ''")
        auths = cur.fetchall()
        for a in auths:
            notifications.append({
                "id": f"dyn_auth_{a['id']}",
                "type": "warning",
                "title": "Autorización Pendiente",
                "message": f"El pedido {a['folio']} solicitó cambio a {a['estatus_solicitado']}",
                "is_read": 0,
                "created_at": today_iso(),
                "related_order_id": a["id"],
                "role_target": "admin"
            })

    conn.close()
    
    # Sort dynamic + static by descending date roughly (dynamic has today_iso())
    # The actual sorting is already somewhat fine since db is descending
    return notifications

@router.patch("/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    if notif_id.startswith("dyn_"):
        return {"status": "success", "note": "Dynamic notifications are informational and dismissed by clearing condition"}
        
    try:
        n_id = int(notif_id)
        conn = db()
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET is_read = 1 WHERE id = %s", (n_id,))
        conn.commit()
        conn.close()
    except ValueError:
        pass
        
    return {"status": "success"}

def trigger_notification(role_target: str, type: str, title: str, message: str, related_order_id: Optional[int] = None):
    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO notifications (role_target, type, title, message, created_at, related_order_id)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (role_target, type, title, message, today_iso(), related_order_id))
    conn.commit()
    conn.close()

