-- =====================================================================
-- Migración: bodegas dinámicas + acceso multi-bodega por usuario
-- Ejecutar UNA VEZ en el editor SQL de Supabase, en producción.
--
-- Antes de correrla, confirmá el nombre del tipo enum con:
--   SELECT typname FROM pg_type WHERE typtype = 'e';
-- Se espera "moduleenum" (nombre por defecto de SQLAlchemy, ya que
-- models.py nunca le pasó name= a Enum(ModuleEnum)). Si es distinto,
-- ajustá la línea final DROP TYPE antes de ejecutar.
--
-- IMPORTANTE: el backend nuevo (el que reemplaza ModuleEnum por la
-- tabla warehouses) tiene que desplegarse AL MISMO TIEMPO que esta
-- migración corre. El código viejo no puede correr contra este
-- esquema nuevo, ni el código nuevo contra el esquema viejo.
-- =====================================================================
BEGIN;

-- 1. Tabla de bodegas
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_warehouses_key ON warehouses (key);

-- 2. Sembrado de las 8 bodegas existentes (corrige "Elite Nova" -> "Elite Nutrition")
INSERT INTO warehouses (key, name) VALUES
    ('elite_nutricion', 'Elite Nutrition'),
    ('estudio', 'Estudio'),
    ('estadio', 'Estadio'),
    ('futupro', 'Futuro Pro'),
    ('junin', 'Junín'),
    ('ee_uu', 'EE.UU'),
    ('lago_verde', 'Lago Verde'),
    ('unicentro', 'Unicentro')
ON CONFLICT (key) DO NOTHING;

-- 3. Tabla puente usuario <-> bodegas (acceso multi-bodega)
CREATE TABLE IF NOT EXISTS user_warehouses (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, warehouse_id)
);

-- 4. Migrar el módulo único que cada usuario tenía hoy hacia la nueva tabla
--    (tiene que correr ANTES de borrar la columna users.module)
INSERT INTO user_warehouses (user_id, warehouse_id)
SELECT u.id, w.id
FROM users u
JOIN warehouses w ON w.key = u.module::text
WHERE u.module IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. assets.module: de enum fijo a texto libre + FK a warehouses.key
ALTER TABLE assets ALTER COLUMN module TYPE VARCHAR USING module::text;
ALTER TABLE assets ALTER COLUMN module SET NOT NULL;
ALTER TABLE assets
    ADD CONSTRAINT fk_assets_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);

-- 6. asset_requests.module: mismo cambio, pero sigue siendo nullable
ALTER TABLE asset_requests ALTER COLUMN module TYPE VARCHAR USING module::text;
ALTER TABLE asset_requests
    ADD CONSTRAINT fk_asset_requests_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);

-- 7. Ya migramos users.module a user_warehouses (paso 4): borrar la columna vieja
ALTER TABLE users DROP COLUMN module;

-- 8. Borrar el tipo enum de Postgres que quedó sin uso (tiene que ir al final,
--    después de que ninguna columna lo referencie)
DROP TYPE IF EXISTS moduleenum;

COMMIT;
