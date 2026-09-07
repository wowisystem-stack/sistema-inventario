# Directiva: Módulo de Contabilidad

## Objetivo
Proveer una interfaz de contabilidad y auditoría de activos donde se pueda visualizar el valor total de los activos de la empresa, y filtrarlos por categoría, marca, etc.

## Entradas
- Datos de los activos desde la API (`/assets/`), incluyendo `purchase_price`, `estimated_value`, `value`, `category`, `brand_model`.

## Salidas
- Una nueva pantalla en el Frontend (`Accounting.tsx`).
- Tarjetas resumen con métricas clave (Total de Activos, Valor Total Estimado, Valor Total de Compra).
- Tabla detallada y filtrable por categoría y marca.

## Lógica y Flujo Principal
1. **Petición de Datos**: El Frontend hace un request a `/assets/` para obtener todos los activos.
2. **Cálculos y Agrupaciones**: 
   - Sumarizar los valores (`purchase_price` y/o `estimated_value`) de todos los activos.
   - Agrupar los activos para tener totales por categorías (Computadores, Celulares, etc.).
3. **Filtros UI**: Aplicar controles en la vista para buscar y segmentar la tabla y métricas en tiempo real.

## Restricciones y Casos Borde
- **Activos sin valor**: Algunos activos pueden tener `value = null`. Se deben contabilizar como $0 en las sumas pero visualmente indicar que falta el valor.
- **Rendimiento**: Filtrado y búsqueda en frontend. Si llega a haber problemas de rendimiento a futuro, considerar paginación.
