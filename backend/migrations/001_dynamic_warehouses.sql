-- =====================================================================
-- Migración: bodegas dinámicas + acceso multi-bodega por usuario
-- Ejecutar en el editor SQL de Supabase, en producción.
--
-- Esta versión es IDEMPOTENTE / RESUMIBLE: cada paso primero chequea si
-- ya se aplicó antes de hacer algo, así que es seguro correrla las veces
-- que haga falta, sin importar en qué punto haya quedado un intento
-- anterior (útil porque el editor de Supabase no siempre respeta el
-- BEGIN/COMMIT como una transacción 100% atómica).
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
ALTER TABLE warehouses ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE warehouses ALTER COLUMN created_at SET DEFAULT NOW();

-- 2. Sembrado de las 8 bodegas originales (corrige "Elite Nova" -> "Elite Nutrition").
--    Idempotente por ON CONFLICT: no pisa ni duplica bodegas que ya existan
--    (incluida cualquier bodega de prueba creada a mano, como "Prueba").
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

-- 4. Backfill de users.module -> user_warehouses. Solo corre si la columna
--    users.module todavía existe (si un intento anterior ya la borró, se
--    saltea sin error -- ese backfill ya no se puede rehacer, pero las
--    bodegas quedan asignables a mano desde la pantalla de Usuarios).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'module'
    ) THEN
        INSERT INTO user_warehouses (user_id, warehouse_id)
        SELECT u.id, w.id
        FROM users u
        JOIN warehouses w ON w.key = lower(u.module::text)
        WHERE u.module IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 5. assets.module: de enum fijo a texto libre + FK a warehouses.key.
--    Convierte el tipo solo si todavía no es texto, y además normaliza a
--    minúsculas cualquier valor que haya quedado en mayúsculas por un
--    intento previo a medio terminar (SQLAlchemy guarda ELITE_NUTRICION,
--    no elite_nutricion).
DO $$
BEGIN
    IF (
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'assets' AND column_name = 'module'
    ) <> 'character varying' THEN
        ALTER TABLE assets ALTER COLUMN module TYPE VARCHAR USING lower(module::text);
    END IF;
END $$;

UPDATE assets SET module = lower(module) WHERE module IS NOT NULL AND module <> lower(module);
ALTER TABLE assets ALTER COLUMN module SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_module_warehouse') THEN
        ALTER TABLE assets ADD CONSTRAINT fk_assets_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);
    END IF;
END $$;

-- 6. asset_requests.module: mismo patrón, pero sigue siendo nullable.
DO $$
BEGIN
    IF (
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'asset_requests' AND column_name = 'module'
    ) <> 'character varying' THEN
        ALTER TABLE asset_requests ALTER COLUMN module TYPE VARCHAR USING lower(module::text);
    END IF;
END $$;

UPDATE asset_requests SET module = lower(module) WHERE module IS NOT NULL AND module <> lower(module);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_asset_requests_module_warehouse') THEN
        ALTER TABLE asset_requests ADD CONSTRAINT fk_asset_requests_module_warehouse FOREIGN KEY (module) REFERENCES warehouses(key);
    END IF;
END $$;

-- 7. Borrar la columna vieja de users, solo si todavía existe.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'module'
    ) THEN
        ALTER TABLE users DROP COLUMN module;
    END IF;
END $$;

-- 8. Borrar el tipo enum de Postgres que quedó sin uso (tiene que ir al
--    final, después de que ninguna columna lo referencie). IF EXISTS ya
--    lo hace seguro de repetir.
DROP TYPE IF EXISTS moduleenum;

COMMIT;

-- =====================================================================
-- Verificación (opcional, corré esto después para confirmar):
--   SELECT key, name, is_active FROM warehouses ORDER BY name;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'module'; -- debe dar 0 filas
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'module'; -- debe dar 'character varying'
-- =====================================================================
