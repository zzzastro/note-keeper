import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import JWTClaimsError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import database
import models

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(db: Session, user_id: int) -> str:
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    db_token = models.RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_token)
    db.commit()
    return raw


def verify_refresh_token(db: Session, raw_token: str) -> models.RefreshToken:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    db_token = (
        db.query(models.RefreshToken)
        .filter(models.RefreshToken.token_hash == token_hash)
        .first()
    )
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if db_token.is_used:
        revoke_all_tokens(db, db_token.user_id)
        raise HTTPException(status_code=401, detail="Refresh token already used — all tokens revoked")
    if db_token.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=401, detail="Refresh token expired")
    return db_token


def rotate_refresh_token(db: Session, raw_token: str) -> str:
    db_token = verify_refresh_token(db, raw_token)
    db_token.is_used = True
    db.flush()
    return create_refresh_token(db, db_token.user_id)


def revoke_all_tokens(db: Session, user_id: int) -> None:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.token_version += 1
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.is_used == False,
    ).update({"is_used": True})
    db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(database.get_db),
) -> models.User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        token_version = int(payload.get("ver", -1))
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except (JWTError, JWTClaimsError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if token_version != user.token_version:
        raise HTTPException(status_code=401, detail="Token has been invalidated")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
