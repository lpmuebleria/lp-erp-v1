import os
import logging
from logging.handlers import RotatingFileHandler

# Ensure logs directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

def setup_logging():
    """Sets up global logging configuration."""
    logger = logging.getLogger("lp_erp")
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 1. Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Rotating File Handler (10MB per file, max 5 files)
    file_path = os.path.join(LOGS_DIR, "app.log")
    file_handler = RotatingFileHandler(
        file_path, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    logger.info("🚀 Logging system initialized.")
    return logger

# Create a default instance
logger = setup_logging()
