"""
Importación única (one-time) del catálogo de activos del módulo Estudio,
desde la app de AppSheet "Elite Nutrition - Estudio" (app separada de
Pentágono, mismo tipo de estructura: tabla "BD").

Todo lo importado se marca con module=ESTUDIO directamente (no hace falta
heurística: toda esta app es del módulo Estudio). Si el código de un activo
ya existía en Pentágono con una clasificación heurística distinta, se
sobreescribe con datos reales de esta fuente y module=ESTUDIO (upsert por
unique_code).

Requiere backend/.env con APPSHEET_ESTUDIO_APP_ID y APPSHEET_ESTUDIO_ACCESS_KEY.
"""
import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from import_appsheet import (  # noqa: E402
    fetch_table, import_assets, import_loans, BACKEND_DIR,
)

sys.path.insert(0, BACKEND_DIR)
import models  # noqa: E402
from database import Base, engine, SessionLocal  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("import_estudio")

APP_ID = os.environ.get("APPSHEET_ESTUDIO_APP_ID")
ACCESS_KEY = os.environ.get("APPSHEET_ESTUDIO_ACCESS_KEY")


def main():
    if not APP_ID or not ACCESS_KEY:
        logger.error("Faltan APPSHEET_ESTUDIO_APP_ID / APPSHEET_ESTUDIO_ACCESS_KEY en backend/.env")
        sys.exit(1)

    logger.info("Creando/verificando esquema de base de datos...")
    Base.metadata.create_all(bind=engine)

    logger.info("Descargando tabla 'BD' (activos) desde AppSheet Estudio...")
    bd_rows = fetch_table("BD", app_id=APP_ID, access_key=ACCESS_KEY)
    logger.info("Recibidos %d registros de activos.", len(bd_rows))

    logger.info("Descargando tabla 'Prestamos' desde AppSheet Estudio...")
    try:
        loan_rows = fetch_table("Prestamos", app_id=APP_ID, access_key=ACCESS_KEY)
    except Exception as exc:
        logger.warning("No se pudo leer la tabla de préstamos de Estudio (%s); se omite.", exc)
        loan_rows = []
    logger.info("Recibidos %d registros de préstamos.", len(loan_rows))

    db = SessionLocal()
    try:
        asset_stats = import_assets(db, bd_rows, force_module=models.ModuleEnum.ESTUDIO)
        db.commit()
        logger.info("Activos Estudio -> creados: %d, actualizados: %d, sin código (omitidos): %d",
                    asset_stats["created"], asset_stats["updated"], asset_stats["skipped"])

        if loan_rows:
            loan_stats = import_loans(db, loan_rows)
            db.commit()
            logger.info("Préstamos Estudio -> creados: %d, actualizados: %d, sin activo asociado: %d",
                        loan_stats["created"], loan_stats["updated"], loan_stats["skipped_no_asset"])

        total_estudio = db.query(models.Asset).filter(models.Asset.module == models.ModuleEnum.ESTUDIO).count()
        logger.info("Total de activos ahora en módulo Estudio: %d", total_estudio)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    logger.info("Importación de Estudio finalizada correctamente.")


if __name__ == "__main__":
    main()
