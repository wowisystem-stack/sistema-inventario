"""
Crea (o actualiza a ADMIN) el usuario maestro del sistema. Genera una
contraseña aleatoria y la imprime en texto plano UNA sola vez -- guardarla,
no queda registrada en ningún otro lugar.
"""
import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

import models
from database import SessionLocal
from services import auth as auth_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("seed_master_admin")

MASTER_EMAIL = "desarrollo.pentagono@gmail.com"


def main():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == MASTER_EMAIL).first()
        password = auth_service.generate_password()
        password_hash = auth_service.hash_password(password)

        if user:
            user.role = models.RoleEnum.ADMIN
            user.password_hash = password_hash
            logger.info("Usuario maestro existente actualizado a ADMIN.")
        else:
            username = "desarrollo.pentagono"
            suffix = 1
            base = username
            while db.query(models.User).filter(models.User.username == username).first():
                suffix += 1
                username = f"{base}.{suffix}"

            user = models.User(
                username=username,
                full_name="Administrador Maestro",
                document_id="MASTER-ADMIN",
                email=MASTER_EMAIL,
                role=models.RoleEnum.ADMIN,
                password_hash=password_hash,
            )
            db.add(user)
            logger.info("Usuario maestro creado.")

        db.commit()
        db.refresh(user)

        print("=" * 60)
        print(f"USUARIO MAESTRO: {MASTER_EMAIL}")
        print(f"CONTRASEÑA (guardar ahora, no se vuelve a mostrar): {password}")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
