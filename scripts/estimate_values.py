"""
Clasifica por categoría y calcula un valor estimado de referencia (COP) para
los activos que no tienen `purchase_price` cargado manualmente.

Es una aproximación heurística por categoría + palabras clave de marca —
NO es un avalúo oficial. Se marca `value_source = ESTIMADO` para que la UI
siempre lo muestre con la aclaración correspondiente.
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
from services.asset_classifier import classify_asset

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("estimate_values")

# Precios de referencia muy aproximados en COP (2026), por categoría.
_DEFAULT_BY_CATEGORY: dict[models.CategoryEnum, float] = {
    models.CategoryEnum.COMPUTADORES: 2_000_000,
    models.CategoryEnum.CELULARES: 1_000_000,
    models.CategoryEnum.TABLETS: 800_000,
    models.CategoryEnum.CAMARAS: 2_000_000,
    models.CategoryEnum.MICROFONOS: 500_000,
    models.CategoryEnum.AUDIO: 800_000,
    models.CategoryEnum.TRIPODES: 200_000,
    models.CategoryEnum.TELEFONO: 150_000,
    models.CategoryEnum.IMPRESORAS: 1_000_000,
    models.CategoryEnum.PROYECTORES: 1_500_000,
    models.CategoryEnum.CABLES: 50_000,
    models.CategoryEnum.OTROS: 100_000,
}

# Palabras clave de marca/modelo que ajustan el valor por defecto de la categoría.
_BRAND_OVERRIDES: list[tuple[models.CategoryEnum, str, float]] = [
    (models.CategoryEnum.COMPUTADORES, "macbook", 6_000_000),
    (models.CategoryEnum.COMPUTADORES, "apple", 6_000_000),
    (models.CategoryEnum.COMPUTADORES, "dell", 2_200_000),
    (models.CategoryEnum.COMPUTADORES, "hp", 1_800_000),
    (models.CategoryEnum.COMPUTADORES, "lenovo", 1_800_000),
    (models.CategoryEnum.COMPUTADORES, "asus", 2_000_000),
    (models.CategoryEnum.CELULARES, "iphone", 2_500_000),
    (models.CategoryEnum.CELULARES, "samsung", 1_300_000),
    (models.CategoryEnum.TABLETS, "ipad", 2_000_000),
    (models.CategoryEnum.CAMARAS, "gopro", 1_500_000),
    (models.CategoryEnum.CAMARAS, "dji", 3_000_000),
    (models.CategoryEnum.CAMARAS, "sony", 4_000_000),
    (models.CategoryEnum.COMPUTADORES, "teclado", 80_000),
    (models.CategoryEnum.COMPUTADORES, "mouse", 60_000),
    (models.CategoryEnum.AUDIO, "airpods", 900_000),
]


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", text.lower()).strip()


def estimate_value(category: "models.CategoryEnum", description: str | None, brand_model: str | None) -> float:
    combined = _normalize(f"{description or ''} {brand_model or ''}")
    for cat, keyword, price in _BRAND_OVERRIDES:
        if cat == category and keyword in combined:
            return price
    return _DEFAULT_BY_CATEGORY.get(category, 100_000)


def main():
    db = SessionLocal()
    try:
        assets = db.query(models.Asset).all()
        classified, estimated = 0, 0
        for asset in assets:
            category = classify_asset(asset.description, asset.brand_model)
            asset.category = category
            classified += 1

            if asset.purchase_price:
                asset.value_source = models.ValueSourceEnum.MANUAL
            else:
                asset.estimated_value = estimate_value(category, asset.description, asset.brand_model)
                asset.value_source = models.ValueSourceEnum.ESTIMADO
                estimated += 1

        db.commit()
        logger.info("Clasificados %d activos, valor estimado asignado a %d.", classified, estimated)

        from collections import Counter
        counts = Counter(a.category.value for a in assets)
        for cat, count in counts.most_common():
            logger.info("  %s -> %d", cat, count)
    finally:
        db.close()


if __name__ == "__main__":
    main()
