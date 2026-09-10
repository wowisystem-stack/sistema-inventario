import os
import sys
from dotenv import load_dotenv

# Asegurar que estamos en el directorio correcto y cargar .env del backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from database import engine
from sqlalchemy import text

def run_migration():
    migration_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'migrations', '001_dynamic_warehouses.sql')
    
    if not os.path.exists(migration_file):
        print(f"Error: No se encontró el archivo de migración en {migration_file}")
        return

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Eliminar BEGIN y COMMIT si existen, ya que SQLAlchemy maneja sus propias transacciones
    sql = sql.replace('BEGIN;', '').replace('COMMIT;', '')

    try:
        with engine.connect() as conn:
            print("Ejecutando script SQL completo...")
            conn.execute(text(sql))
            conn.commit()
            print("Migración completada exitosamente.")
    except Exception as e:
        print(f"Error durante la migración: {e}")

if __name__ == '__main__':
    run_migration()
