import bcrypt

def hash_password(password: str) -> str:
    """Hashes a password using bcrypt, truncating to 72 characters."""
    if not password:
        return None
    # bcrypt requires bytes
    password_bytes = password[:72].encode('utf-8')
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a bcrypt hash."""
    if not hashed_password or not plain_password:
        return False
    try:
        password_bytes = plain_password[:72].encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False
