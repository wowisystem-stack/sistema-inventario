"""
Reclasifica el campo `Asset.module` de los activos ya importados, a partir del
texto libre en `Asset.area`, con una heurística simple (case/acento-insensible):

  - contiene "estadio" o "palco"      -> ESTADIO
  - contiene "futupro" o "futu pro"   -> FUTUPRO
  - contiene "estudio" o "tiktok"     -> ESTUDIO
  - cualquier otro caso (o sin área)  -> ELITE_NUTRICION (default)

Es una aproximación: se espera que el admin corrija manualmente, desde la
pantalla de edición de activos, los casos mal clasificados.
"""
import os
import re
import sys
import unicodedata
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

import models
from database import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("backfill_modules")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return text.lower()


def classify(area: str | None) -> "models.ModuleEnum":
    if not area:
        return models.ModuleEnum.ELITE_NUTRICION
    norm = normalize(area)
    if "estadio" in norm or "palco" in norm:
        return models.ModuleEnum.ESTADIO
    if "futupro" in norm or "futu pro" in norm:
        return models.ModuleEnum.FUTUPRO
    if "estudio" in norm or "tiktok" in norm:
        return models.ModuleEnum.ESTUDIO
    return models.ModuleEnum.ELITE_NUTRICION


def main():
    db = SessionLocal()
    try:
        assets = db.query(models.Asset).all()
        counts: dict[str, int] = {}
        for asset in assets:
            module = classify(asset.area)
            asset.module = module
            counts[module.value] = counts.get(module.value, 0) + 1
        db.commit()
        logger.info("Reclasificación completa sobre %d activos.", len(assets))
        for module, count in sorted(counts.items(), key=lambda kv: -kv[1]):
            logger.info("  %s -> %d", module, count)
    finally:
        db.close()


if __name__ == "__main__":
    main()
