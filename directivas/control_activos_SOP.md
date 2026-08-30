# Directiva: Sistema de Control de Inventarios y Activos Fijos

## Objetivo
Desarrollar un sistema de control externo robusto para los activos físicos de Elite Nutrition (equipos de cómputo, celulares, cámaras, micrófonos, cables, etc.). El objetivo explícito es impedir la salida no autorizada de dispositivos y mantener un registro preciso de los préstamos al personal.

## Arquitectura y Componentes
1. **Gestión de Activos**: 
   - Registro con código único, descripción, marca/modelo y fotografía.
   - Generación de Código QR único por activo para control de salida.
2. **Sistema de Préstamos**:
   - Asignación basada en el rol del colaborador.
   - Flujo de préstamo: captura de quién entrega, quién recibe, documento de identidad, firma digital, fecha y observaciones.
   - **Autovalidación y Solicitudes**: Las solicitudes de préstamo de activos se envían automáticamente al encargado para que verifique el motivo y autorice.
3. **Validación de Identidad**:
   - Módulo de validación de rostro (Facial Recognition) y escaneo de Cédula (Document ID) para mayor seguridad en la entrega.
4. **Control de Salidas (QR)**:
   - Vista especializada para el rol "Personal de Salida", que permite escanear el código QR del activo y verificar las boletas de autorización correspondientes antes de permitir que el activo abandone las instalaciones.
5. **Roles Identificados**:
   - Administrador global.
   - Personal de salida (Seguridad/Portería).
   - Encargado/Aprobador.
   - Empleado/Solicitante.

## Lógica y Flujo Principal
1. **Solicitud**: Empleado solicita un activo. Se requiere ingresar el motivo.
2. **Autorización**: El Encargado revisa el motivo y aprueba o rechaza la solicitud.
3. **Entrega (Check-out)**:
   - Validar identidad del empleado mediante rostro y cédula.
   - Registro de firmas y observaciones.
4. **Salida Física**: Personal de salida escanea QR del dispositivo y el sistema valida si tiene un préstamo activo y autorizado.
5. **Devolución (Check-in)**: Registro del retorno del activo, actualizando su estado a disponible.

## Restricciones y Casos Borde
1. **Validación Biométrica**: Asegurar el manejo adecuado de las imágenes (rostro y cédula) cumpliendo con políticas de privacidad.
2. **Firma y Trazabilidad**: Todo movimiento (aprobación, entrega, devolución) debe registrar al usuario que ejecutó la acción y la marca de tiempo (timestamp).
3. **Errores de Validación**: Si la validación facial falla, debe existir un flujo alternativo manual (con contraseña u otra verificación) supervisado por el administrador.
4. **Memoria de Errores**: Todo error detectado en la ejecución de los scripts actualizará esta sección para prevenir futuros fallos.
   - **Importación desde AppSheet (2026-08-27)**: Se migró el catálogo real (tabla `BD`, 1794 activos) y el historial de préstamos (tabla `Préstamos`, 122 registros) vía la API REST de AppSheet (`scripts/import_appsheet.py`). Credenciales en `backend/.env` (`APPSHEET_APP_ID`, `APPSHEET_ACCESS_KEY`), no versionar.
     - 14 registros de `Préstamos` no tenían un `Código` que coincidiera con ningún activo de `BD` y se omitieron (posibles errores de tipeo en el origen).
     - El estado final de un activo se calcula ordenando sus préstamos por `Fecha de Entrega` y tomando el último; si dos movimientos del mismo activo caen el mismo día, el orden entre ellos no está garantizado y puede producir un estado desactualizado. Revisar manualmente los activos con movimientos same-day si el estado no cuadra.
     - Algunos usuarios quedaron duplicados por variaciones de tildes/mayúsculas en "Prestamo A (Nombre Completo)" (ej. "Óscar Andrés..." vs "Oscar Andres..."), ya que el emparejamiento de usuario es por nombre exacto. Pendiente: normalizar y fusionar antes de usar este dato para reportes de auditoría por persona.
     - El campo `Foto` de AppSheet es una ruta relativa dentro del storage de la app (ej. `BD_Images/818603.Foto.215022.jpg`), no una URL pública. Se guardó tal cual en `Asset.appsheet_photo_ref`; falta resolverla a una URL descargable para mostrarla en el frontend.
     - `Loan.reason` (motivo de la solicitud) no existe en el historial de AppSheet, así que los préstamos importados quedan con `reason = NULL`. El campo se mantiene obligatorio para solicitudes nuevas creadas desde la app.
