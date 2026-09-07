-- Diagnóstico de solo lectura: no modifica nada.
-- Corré esto y pasame el resultado completo de las 7 consultas.

-- 1. Columnas actuales de la tabla users
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

-- 2. ¿Existen ya las tablas nuevas?
SELECT table_name FROM information_schema.tables WHERE table_name IN ('warehouses', 'user_warehouses');

-- 3. Contenido actual de warehouses
SELECT * FROM warehouses ORDER BY id;

-- 4. Contenido actual de user_warehouses
SELECT * FROM user_warehouses;

-- 5. Tipo real de assets.module ahora mismo
SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'module';

-- 6. Tipo real de asset_requests.module ahora mismo
SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'asset_requests' AND column_name = 'module';

-- 7. ¿Sigue existiendo el enum viejo?
SELECT typname FROM pg_type WHERE typtype = 'e';
