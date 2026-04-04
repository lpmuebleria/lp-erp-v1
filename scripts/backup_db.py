import os
import subprocess
import datetime
from dotenv import load_dotenv
from logger_config import logger

# Try to import MYSQL_CONFIG from database.py to ensure we use identical credentials
try:
    from database import MYSQL_CONFIG
    DB_USER = MYSQL_CONFIG['user']
    DB_PASS = MYSQL_CONFIG['password']
    DB_NAME = MYSQL_CONFIG['database']
    DB_HOST = MYSQL_CONFIG['host']
    DB_PORT = MYSQL_CONFIG.get('port', 3306)
except ImportError:
    # Fallback to local .env loading if running standalone
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    DB_USER = os.getenv('DB_USER') or os.getenv('REMOTE_DB_USER') or 'root'
    DB_PASS = os.getenv('DB_PASSWORD') or os.getenv('REMOTE_DB_PASSWORD') or ''
    DB_NAME = os.getenv('DB_NAME') or os.getenv('REMOTE_DB_NAME') or 'lp_erp'
    DB_HOST = os.getenv('DB_HOST') or os.getenv('REMOTE_DB_HOST') or 'localhost'
    DB_PORT = os.getenv('DB_PORT') or os.getenv('REMOTE_DB_PORT') or 3306

# Support for custom mysqldump path in Windows or particular server setups
# We will evaluate it dynamically inside create_backup to ensure fresh reads without restart.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

def create_backup():
    """Generates a SQL dump and compresses it."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"backup_{DB_NAME}_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    # Make sure we read from .env if updated
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
    MYSQLDUMP_EXE = os.getenv('MYSQLDUMP_PATH', 'mysqldump')

    logger.info(f"🚀 Starting backup for {DB_NAME}...")
    
    # Dump Command
    try:
        # Note: 'mysqldump' must be installed in the system/container
        command = [
            MYSQLDUMP_EXE,
            f'--user={DB_USER}',
            f'--password={DB_PASS}',
            f'--host={DB_HOST}',
            f'--port={str(DB_PORT)}',
            '--column-statistics=0', # Often needed for newer mysqldump vs older servers
            DB_NAME
        ]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            result = subprocess.run(command, stdout=f, stderr=subprocess.PIPE, text=True)
            
        if result.returncode == 0:
            logger.info(f"✅ Backup created successfully: {filename}")
            _rotate_backups()
            return filename
        else:
            logger.error(f"❌ Error creating backup: {result.stderr}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return None
                
    except FileNotFoundError:
        logger.error(f"❌ 'mysqldump' not found at '{MYSQLDUMP_EXE}'. Check environment configuration.")
        if os.path.exists(filepath):
            os.remove(filepath)
        return None
    except Exception as e:
        logger.error(f"❌ Critical error during backup: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return None

def _rotate_backups():
    """Keeps only the last 7 days of backups for demo server storage efficiency."""
    logger.info("🧹 Cleaning up old backups (7-day retention)...")
    now = datetime.datetime.now()
    retention_days = 7
    
    for f in os.listdir(BACKUP_DIR):
        file_path = os.path.join(BACKUP_DIR, f)
        if os.path.isfile(file_path):
            file_age = now - datetime.datetime.fromtimestamp(os.path.getctime(file_path))
            if file_age.days > retention_days:
                os.remove(file_path)
                logger.info(f"🗑️ Deleted old backup: {f}")

if __name__ == "__main__":
    # Test execution
    res = create_backup()
    if res:
        print(f"Success: {res}")
    else:
        print("Failed. Check app.log for details.")
