"""
Migración única (one-time): agrega el valor 'pending_registration' al enum
de estado de activos en Postgres (Supabase), necesario para el flujo de
generación masiva de códigos QR.

Postgres no permite agregar valores a un enum dentro de una transacción
normal (ALTER TYPE ... ADD VALUE debe correr en autocommit).

Uso: python scripts/migrate_add_pending_status.py
"""
import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("migrate_add_pending_status")

PG_URL = os.environ.get("DATABASE_URL")

if not PG_URL:
    logger.error("Falta DATABASE_URL en backend/.env")
    sys.exit(1)

NEW_VALUE = "PENDING_REGISTRATION"

engine = create_engine(PG_URL, pool_pre_ping=True, isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    # El modelo SQLAlchemy no fija un nombre explícito para el enum de status,
    # así que se detecta el nombre real ya creado en Postgres (para no asumir
    # 'assetstatusenum' a ciegas si en algún momento cambió).
    enum_type_row = conn.execute(
        text(
            """
            SELECT t.typname
            FROM pg_type t
            JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE e.enumlabel = 'AVAILABLE'
            GROUP BY t.typname
            """
        )
    ).fetchone()

    if not enum_type_row:
        logger.error("No se encontró el tipo enum de status de activos en la base (¿ya migraste antes con otro nombre?)")
        sys.exit(1)

    enum_type = enum_type_row[0]
    logger.info(f"Tipo enum detectado: {enum_type}")

    already_exists = conn.execute(
        text(
            """
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = :enum_type AND e.enumlabel = :new_value
            """
        ),
        {"enum_type": enum_type, "new_value": NEW_VALUE},
    ).fetchone()

    if already_exists:
        logger.info(f"El valor '{NEW_VALUE}' ya existe en {enum_type}, nada que hacer.")
    else:
        conn.execute(text(f"ALTER TYPE {enum_type} ADD VALUE '{NEW_VALUE}'"))
        logger.info(f"Valor '{NEW_VALUE}' agregado a {enum_type} correctamente.")
