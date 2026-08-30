# Directiva: Despliegue en Vercel

## Objetivo
Desplegar la aplicación (Frontend) en Vercel para permitir su visualización en línea.

## Arquitectura y Componentes
1. **Frontend**: Aplicación Vite ubicada en el directorio `frontend/`.
2. **Plataforma de Hosting**: Vercel.
3. **Automatización**: Uso de script en Python para invocar el Vercel CLI y gestionar el despliegue de forma automática.

## Lógica y Flujo Principal
1. **Verificación**: Asegurar que estamos apuntando al directorio `frontend`.
2. **Despliegue**: Ejecutar el comando de despliegue de Vercel apuntando al directorio `frontend`.
3. **Salida**: Retornar la URL de producción.

## Restricciones y Casos Borde
1. **Autenticación**: Vercel CLI requiere estar autenticado. Si falla por falta de login, el script fallará y se requerirá configuración manual (login) o proveer `VERCEL_TOKEN`.
2. **Configuración de Proyecto**: La primera vez, Vercel pide confirmar configuraciones (nombre de proyecto, directorio, etc.). Para evitar pausas, se deben pasar flags como `--yes` o `--confirm`.
3. **Memoria de Errores**: Todo error detectado actualizará esta sección.
   - **Nota**: No dejar variables sin usar (ej. `error` en un catch). Porque causa el error `TS6133` y falla el build en Vercel por la comprobación estricta de TypeScript. En su lugar, asegurar que el código no tenga variables huérfanas (ej. usando `_error` o vaciando el parámetro).
