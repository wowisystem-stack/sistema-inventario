import secrets
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db

TOKEN_TTL_DAYS = 30


def generate_password() -> str:
    """Contraseña aleatoria ultra-segura, generada por el sistema (no la elige el usuario)."""
    return secrets.token_urlsafe(12)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(db: Session, user: "models.User") -> str:
    token = secrets.token_urlsafe(32)
    auth_token = models.AuthToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=TOKEN_TTL_DAYS),
    )
    db.add(auth_token)
    db.commit()
    return token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> "models.User":
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    token = authorization.removeprefix("Bearer ").strip()
    auth_token = db.query(models.AuthToken).filter(models.AuthToken.token == token).first()
    if not auth_token or auth_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada")

    return auth_token.user


def require_role(*roles: "models.RoleEnum"):
    def dependency(current_user: "models.User" = Depends(get_current_user)) -> "models.User":
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="No tenés permiso para esta acción")
        return current_user

    return dependency
