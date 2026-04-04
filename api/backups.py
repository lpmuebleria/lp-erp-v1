import os
import asyncio
import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from scripts.backup_db import create_backup, BACKUP_DIR
from logger_config import logger
from database import DB_MODE
from api.config import require_superadmin
from fastapi import Request

router = APIRouter()

@router.get("/backups")
def list_backups(request: Request):
    """Returns a list of available database backups."""
    require_superadmin(request)
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        return []
    
    files = []
    for f in os.listdir(BACKUP_DIR):
        path = os.path.join(BACKUP_DIR, f)
        if os.path.isfile(path):
            stats = os.stat(path)
            files.append({
                "filename": f,
                "size": stats.st_size,
                "created_at": datetime.datetime.fromtimestamp(stats.st_ctime).isoformat()
            })
    
    # Sort by newest first
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files

@router.get("/backups/download/{filename}")
def download_backup(filename: str, request: Request):
    """Downloads a specific backup file."""
    require_superadmin(request)
    # Security: Prevent directory traversal
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(BACKUP_DIR, safe_filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/sql"
    )

@router.post("/backups/trigger")
def trigger_manual_backup(background_tasks: BackgroundTasks, request: Request):
    """Triggers a backup manually as a background task."""
    require_superadmin(request)
    logger.info("🖱️ Manual backup triggered by user.")
    background_tasks.add_task(create_backup)
    return {"message": "Proceso de respaldo iniciado en segundo plano."}

async def backup_scheduler():
    """
    Background loop that runs the backup every 12 hours.
    Now active in both LOCAL and REMOTE modes.
    """
    logger.info(f"🚀 Backup Scheduler started (Cycle: 12h, Mode: {DB_MODE}).")
    
    while True:
        try:
            # Initial wait to avoid running exactly at startup if multiple restarts happen
            # Wait 30 minutes after startup
            await asyncio.sleep(30 * 60) 
            
            logger.info("⏰ Scheduled backup task starting...")
            filename = create_backup()
            if filename:
                logger.info(f"✅ Scheduled backup completed: {filename}")
            else:
                logger.error("❌ Scheduled backup failed. Check logs for details.")
            
            # Wait 12 hours for the next one
            await asyncio.sleep(12 * 60 * 60)
            
        except asyncio.CancelledError:
            logger.info("🛑 Backup Scheduler cancelled.")
            break
        except Exception as e:
            logger.error(f"❌ Error in backup scheduler: {e}")
            await asyncio.sleep(60 * 5) # Retry after 5 mins if error
