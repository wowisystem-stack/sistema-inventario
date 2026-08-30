"""
Migración única (one-time) de todos los datos de la base SQLite local
(backend/inventory.db) hacia Postgres en Supabase (DATABASE_URL en backend/.env).

Copia en orden seguro por FKs: users -> assets -> loans -> asset_assignments ->
role_permissions, preservando los IDs originales, y al final ajusta las
secuencias de Postgres para que los próximos inserts no choquen con los IDs
migrados.
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
from sqlalchemy.orm import sessionmaker

import models
from models import Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("migrate_to_supabase")

SQLITE_URL = f"sqlite:///{os.path.join(BACKEND_DIR, 'inventory.db')}"
PG_URL = os.environ.get("DATABASE_URL")

if not PG_URL:
    logger.error("Falta DATABASE_URL en backend/.env")
    sys.exit(1)

sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
pg_engine = create_engine(PG_URL, pool_pre_ping=True)

SqliteSession = sessionmaker(bind=sqlite_engine)
PgSession = sessionmaker(bind=pg_engine)

# Orden de migración respetando FKs.
MODELS_IN_ORDER = [
    models.User,
    models.Asset,
    models.Loan,
    models.AssetAssignment,
    models.RolePermission,
]


def copy_table(sqlite_db, pg_db, model):
    table = model.__table__
    columns = [c.name for c in table.columns]
    rows = sqlite_db.execute(table.select()).mappings().all()

    if not rows:
        logger.info("  %s: sin filas, nada que copiar.", table.name)
        return 0

    pg_db.execute(table.delete())  # idempotente: limpia antes de reinsertar
    for row in rows:
        values = {col: row[col] for col in columns}
        pg_db.execute(table.insert().values(**values))
    pg_db.commit()
    logger.info("  %s: %d filas copiadas.", table.name, len(rows))
    return len(rows)


def reset_sequence(pg_db, model):
    table = model.__table__
    pk = list(table.primary_key.columns)[0].name
    seq_name = f"{table.name}_{pk}_seq"
    try:
        pg_db.execute(
            text(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX({pk}) FROM {table.name}), 1))")
        )
        pg_db.commit()
    except Exception as exc:
        logger.warning("  No se pudo resetear la secuencia de %s: %s", table.name, exc)
        pg_db.rollback()


def main():
    logger.info("Creando esquema en Postgres (Supabase) si no existe...")
    Base.metadata.create_all(bind=pg_engine)

    sqlite_db = SqliteSession()
    pg_db = PgSession()
    try:
        totals = {}
        for model in MODELS_IN_ORDER:
            logger.info("Copiando tabla %s...", model.__tablename__)
            totals[model.__tablename__] = copy_table(sqlite_db, pg_db, model)

        logger.info("Ajustando secuencias de autoincremento en Postgres...")
        for model in MODELS_IN_ORDER:
            reset_sequence(pg_db, model)

        logger.info("Migración completa: %s", totals)
    finally:
        sqlite_db.close()
        pg_db.close()


if __name__ == "__main__":
    main()
