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
--    (si el backend ya arrancó una vez contra esta base, esta tabla puede
--    ya existir -- creada por SQLAlchemy sin default a nivel de base de
--    datos. Por eso forzamos los defaults acá, y el INSERT de abajo no
--    depende de ellos.)
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_warehouses_key ON warehouses (key);
ALTER TABLE warehouses ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE warehouses ALTER COLUMN created_at SET DEFAULT NOW();

-- 2. Sembrado de las 8 bodegas existentes (corrige "Elite Nova" -> "Elite Nutrition")
--    Valores explícitos de is_active/created_at para no depender de un
--    default que la tabla podría no tener si ya existía de antes.
INSERT INTO warehouses (key, name, is_active, created_at) VALUES
    ('elite_nutricion', 'Elite Nutrition', TRUE, NOW()),
    ('estudio', 'Estudio', TRUE, NOW()),
    ('estadio', 'Estadio', TRUE, NOW()),
    ('futupro', 'Futuro Pro', TRUE, NOW()),
    ('junin', 'Junín', TRUE, NOW()),
    ('ee_uu', 'EE.UU', TRUE, NOW()),
    ('lago_verde', 'Lago Verde', TRUE, NOW()),
    ('unicentro', 'Unicentro', TRUE, NOW())
ON CONFLICT (key) DO NOTHING;

-- 3. Tabla puente usuario <-> bodegas (acceso multi-bodega)
CREATE TABLE IF NOT EXISTS user_warehouses (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, warehouse_id)
);

-- 4. Migrar el módulo único que cada usuario tenía hoy hacia la nueva tabla
--    (tiene que correr ANTES de borrar la columna users.module)
--    NOTA: SQLAlchemy guarda el NOMBRE del enum en mayúsculas
--    (ej. ELITE_NUTRICION), no el .value en minúsculas -- por eso el lower().
INSERT INTO user_warehouses (user_id, warehouse_id)
SELECT u.id, w.id
FROM users u
JOIN warehouses w ON w.key = lower(u.module::text)
WHERE u.module IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. assets.module: de enum fijo a texto libre + FK a warehouses.key
ALTER TABLE assets ALTER COLUMN module TYPE VARCHAR USING lower(module::text);
ALTER TABLE assets ALTER COLUMN module SET NOT NULL;
ALTER TABLE assets
    ADD CONSTRAINT fk_assets_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);

-- 6. asset_requests.module: mismo cambio, pero sigue siendo nullable
ALTER TABLE asset_requests ALTER COLUMN module TYPE VARCHAR USING lower(module::text);
ALTER TABLE asset_requests
    ADD CONSTRAINT fk_asset_requests_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);

-- 7. Ya migramos users.module a user_warehouses (paso 4): borrar la columna vieja
ALTER TABLE users DROP COLUMN module;

-- 8. Borrar el tipo enum de Postgres que quedó sin uso (tiene que ir al final,
--    después de que ninguna columna lo referencie)
DROP TYPE IF EXISTS moduleenum;

COMMIT;
