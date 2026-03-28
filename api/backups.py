import os
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from scripts.backup_db import create_backup, BACKUP_DIR
from logger_config import logger
from database import DB_MODE

router = APIRouter()

@router.get("/backups")
def list_backups():
    """Returns a list of available database backups."""
    if not os.path.exists(BACKUP_DIR):
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
def download_backup(filename: str):
    """Downloads a specific backup file."""
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
def trigger_manual_backup(background_tasks: BackgroundTasks):
    """Triggers a backup manually as a background task."""
    background_tasks.add_task(create_backup)
    return {"message": "Proceso de respaldo iniciado en segundo plano."}

async def backup_scheduler():
    """
    Background loop that runs the backup every 12 hours.
    Only active if DB_MODE is REMOTE (Demo/Production).
    """
    if DB_MODE != 'REMOTE':
        logger.info("ℹ️ Backup Scheduler disabled (Local Mode).")
        return

    logger.info("🚀 Backup Scheduler started (12h cycle).")
    
    while True:
        try:
            # Initial wait? Or run immediately?
            # Let's wait 1 hour after startup to avoid overloading during initialization
            await asyncio.sleep(60 * 60) 
            
            logger.info("⏰ Scheduled backup task starting...")
            filename = create_backup()
            if filename:
                logger.info(f"✅ Scheduled backup completed: {filename}")
            else:
                logger.error("❌ Scheduled backup failed.")
            
            # Wait 12 hours for the next one
            await asyncio.sleep(12 * 60 * 60)
            
        except asyncio.CancelledError:
            logger.info("🛑 Backup Scheduler cancelled.")
            break
        except Exception as e:
            logger.error(f"❌ Error in backup scheduler: {e}")
            await asyncio.sleep(60 * 5) # Retry after 5 mins if error

import datetime
