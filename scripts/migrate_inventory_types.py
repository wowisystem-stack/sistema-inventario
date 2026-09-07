"""
Migración:
1. Agrega los nuevos módulos ('JUNIN', 'EE_UU', 'LAGO_VERDE', 'UNICENTRO') al enum de módulos en Postgres.
2. Crea el enum 'inventorytypeenum' y añade la columna 'inventory_type' a la tabla 'assets'.

Uso: python scripts/migrate_inventory_types.py
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
logger = logging.getLogger("migrate_inventory_types")

PG_URL = os.environ.get("DATABASE_URL")

if not PG_URL:
    logger.error("Falta DATABASE_URL en backend/.env")
    sys.exit(1)

NEW_MODULES = ["JUNIN", "EE_UU", "LAGO_VERDE", "UNICENTRO"]
INVENTORY_TYPES = ["ACTIVOS", "PUBLICITARIO", "MUEBLES"]

engine = create_engine(PG_URL, pool_pre_ping=True, isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    # 1. Agregar nuevos módulos
    enum_type_row = conn.execute(
        text(
            """
            SELECT t.typname
            FROM pg_type t
            JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE e.enumlabel = 'ELITE_NUTRICION'
            GROUP BY t.typname
            """
        )
    ).fetchone()

    if enum_type_row:
        enum_type = enum_type_row[0]
        logger.info(f"Tipo enum de módulo detectado: {enum_type}")
        
        for module in NEW_MODULES:
            already_exists = conn.execute(
                text(
                    """
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = :enum_type AND e.enumlabel = :new_value
                    """
                ),
                {"enum_type": enum_type, "new_value": module},
            ).fetchone()

            if already_exists:
                logger.info(f"El valor '{module}' ya existe en {enum_type}.")
            else:
                conn.execute(text(f"ALTER TYPE {enum_type} ADD VALUE '{module}'"))
                logger.info(f"Valor '{module}' agregado a {enum_type}.")
    else:
        logger.error("No se encontró el tipo enum de módulo.")

    # 2. Crear InventoryTypeEnum si no existe
    inventory_enum_exists = conn.execute(
        text("SELECT 1 FROM pg_type WHERE typname = 'inventorytypeenum'")
    ).fetchone()

    if not inventory_enum_exists:
        logger.info("Creando tipo enum inventorytypeenum...")
        labels = ", ".join([f"'{t}'" for t in INVENTORY_TYPES])
        conn.execute(text(f"CREATE TYPE inventorytypeenum AS ENUM ({labels})"))
    else:
        logger.info("El tipo enum inventorytypeenum ya existe.")

    # 3. Agregar la columna inventory_type a assets si no existe
    col_exists = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='assets' AND column_name='inventory_type'
            """
        )
    ).fetchone()

    if not col_exists:
        logger.info("Agregando columna inventory_type a la tabla assets...")
        # Por defecto es ACTIVOS
        conn.execute(text("ALTER TABLE assets ADD COLUMN inventory_type inventorytypeenum DEFAULT 'ACTIVOS'"))
        
        # Crear indice opcionalmente
        conn.execute(text("CREATE INDEX ix_assets_inventory_type ON assets (inventory_type)"))
        logger.info("Columna inventory_type agregada correctamente.")
    else:
        logger.info("La columna inventory_type ya existe en assets.")

    logger.info("Migración completada.")
