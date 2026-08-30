"""
Siembra la tabla `role_permissions` con el mapeo cargo -> categorías
permitidas, tomado de la hoja de Drive "Elite_Nutrition_Categorias_por_Cargo".

Usado por el frontend para restringir qué puede solicitar cada empleado según
su cargo (una vez que el admin se lo asigna en la pantalla de usuarios).
"""
import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

import models
from database import Base, engine, SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("seed_role_permissions")

# Nombre en la hoja de Drive -> valor de CategoryEnum
_CATEGORY_MAP = {
    "Computadores": models.CategoryEnum.COMPUTADORES,
    "Celulares": models.CategoryEnum.CELULARES,
    "Tablets": models.CategoryEnum.TABLETS,
    "Teléfono": models.CategoryEnum.TELEFONO,
    "Impresoras": models.CategoryEnum.IMPRESORAS,
    "Proyectores": models.CategoryEnum.PROYECTORES,
    "Cámaras": models.CategoryEnum.CAMARAS,
    "Micrófonos": models.CategoryEnum.MICROFONOS,
    "Audio": models.CategoryEnum.AUDIO,
    "Trípodes": models.CategoryEnum.TRIPODES,
    "Cables": models.CategoryEnum.CABLES,
}

# cargo -> lista de categorías (nombres tal como aparecen en la hoja de Drive)
CARGO_CATEGORIES: dict[str, list[str]] = {
    "CEO": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Gerente General": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Gerente de Auditoría": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
    "Auditor Interno": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
    "Analista Externo de Mercado": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
    "Analista de Sistemas y Control de Activos Fijos": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Líder de Seguridad": ["Computadores", "Celulares", "Teléfono", "Tablets"],
    "Seguridad": ["Celulares", "Teléfono"],
    "Servicios Generales": ["Celulares", "Teléfono"],
    "Analista Calidad y Servicio al Cliente": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Gerente Cadena de Abastecimiento": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Líder Logístico": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Analista de Bodega": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Analista de Despachos": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Analista Alistamiento": ["Computadores", "Celulares", "Teléfono"],
    "Conductor Logístico Junín": ["Celulares", "Teléfono"],
    "Líder de Proyectos": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Especialista de Compras": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
    "Gerente Tecnología": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Especialista de Procesos": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Analista de Procesos": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Especialista de Datos": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Ingeniero de Sistemas": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Analista de Soporte Técnico": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Especialista de Automatización": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Gerente Gestión Humana": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Especialista Gestión Humana": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Analista de Selección": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Gerente de Contabilidad": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Analista Contable": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Auxiliar Contable": ["Computadores", "Teléfono", "Impresoras"],
    "Tesorería Especialista": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Especialista de Facturación": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Analista de Facturación": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Director Comercial": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Coordinador Comercial": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Líder Canal Mayoristas": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Asesor Comercial Mayorista": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Comercial TAT": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Comercial": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Comercial Punto de Venta": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Comercial y Respond": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Especialista Internacional": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Asesor Comercial Internacional": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Comercial TAT Internacional": ["Computadores", "Celulares", "Teléfono"],
    "Especialista Logístico USA": ["Computadores", "Celulares", "Tablets", "Teléfono"],
    "Asesor de Novedades PQR": ["Computadores", "Celulares", "Teléfono"],
    "Asesor Novedades Transportadoras": ["Computadores", "Celulares", "Teléfono"],
    "Especialista Dropshipping": ["Computadores", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Asesor Comercial Dropshipping": ["Computadores", "Celulares", "Teléfono"],
    "Líder Creativo Marca Personal": ["Computadores", "Cámaras", "Micrófonos", "Audio", "Trípodes", "Cables", "Tablets"],
    "Community Manager Marca Personal": ["Computadores", "Cámaras", "Celulares", "Tablets"],
    "Filmmaker Marca Personal": ["Cámaras", "Micrófonos", "Audio", "Trípodes", "Cables", "Computadores"],
    "Publicista Marca Personal": ["Computadores", "Cámaras", "Tablets", "Celulares"],
    "Editor de Contenido Marca Personal": ["Computadores", "Cámaras", "Tablets", "Celulares"],
    "Gerente de Mercadeo": ["Computadores", "Cámaras", "Celulares", "Tablets", "Teléfono", "Impresoras", "Proyectores"],
    "Coordinador Creativo": ["Computadores", "Cámaras", "Celulares", "Tablets", "Teléfono", "Impresoras"],
    "Director de Contenido": ["Computadores", "Cámaras", "Micrófonos", "Audio", "Trípodes", "Tablets", "Proyectores", "Cables"],
    "Community Manager": ["Computadores", "Cámaras", "Celulares", "Tablets"],
    "Diseñador Gráfico": ["Computadores", "Tablets", "Impresoras", "Proyectores"],
    "Filmmaker": ["Cámaras", "Micrófonos", "Audio", "Trípodes", "Cables", "Computadores"],
    "Trafficker": ["Computadores", "Tablets", "Celulares"],
    "Publicista": ["Computadores", "Cámaras", "Tablets", "Celulares"],
    "Editor de Contenido": ["Computadores", "Tablets", "Cámaras"],
    "Especialista Jurídico": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
    "Asistente General": ["Computadores", "Celulares", "Teléfono", "Impresoras"],
    "Revisoria Fiscal": ["Computadores", "Celulares", "Teléfono", "Impresoras", "Tablets"],
}


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created, updated = 0, 0
        for cargo, categories in CARGO_CATEGORIES.items():
            mapped = [_CATEGORY_MAP[c].value for c in categories if c in _CATEGORY_MAP]
            allowed = ",".join(mapped)

            existing = db.query(models.RolePermission).filter(models.RolePermission.cargo == cargo).first()
            if existing:
                existing.allowed_categories = allowed
                updated += 1
            else:
                db.add(models.RolePermission(cargo=cargo, allowed_categories=allowed))
                created += 1

        db.commit()
        logger.info("Permisos por cargo -> creados: %d, actualizados: %d", created, updated)
    finally:
        db.close()


if __name__ == "__main__":
    main()
