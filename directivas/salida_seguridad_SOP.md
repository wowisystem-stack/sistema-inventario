# Directiva: Registro de Usuarios y Salida de Seguridad (Pentágono)

## Objetivo
Definir el flujo de registro de empleados con validación biométrica (foto y firma) y la lógica de validación de salida de activos por el equipo de seguridad (Pentágono).

## 1. Registro de Usuarios
Todo empleado que vaya a solicitar activos debe estar registrado con los siguientes datos obligatorios:
- **Nombres completos** (`full_name`)
- **Correo electrónico** (`email` - *Nuevo campo*)
- **Número de documento de identidad** (`document_id`)
- **Fotografía del rostro** (`photo_url` - *Nuevo campo*)
- **Firma digital** (`digital_signature_url` - *Nuevo campo*)

**Lógica de captura:**
- El frontend debe utilizar la API web de la cámara para capturar la foto.
- El frontend debe utilizar un canvas para capturar la firma digital y guardarla como imagen (Base64/URL).

## 2. Solicitud y Desbloqueo del Código QR
- Cuando un usuario solicita un activo (y es aprobado por el encargado), el estado del préstamo pasa a `APPROVED`.
- En este estado, el código QR del activo se considera **"Desbloqueado"** para su salida.

## 3. Escaneo en Salida de Seguridad (Pentágono)
El personal de seguridad (rol `SALIDA` - Pentágono) opera la garita de control.
- **Acción:** Pentágono escanea el QR del activo físico que el empleado intenta sacar.
- **Validación del Sistema:**
  - El sistema busca si el activo tiene un préstamo en estado `APPROVED`.
  - Si no lo tiene, muestra una alerta en rojo: "Salida no autorizada".
  - Si lo tiene, se genera un **Documento de Salida Flexible**.
- **Documento de Salida Flexible:**
  - Debe mostrar en pantalla los datos del empleado (Foto, Nombre, Cédula) para cotejo visual.
  - Debe mostrar los detalles del activo (Foto, Código, Descripción, Accesorios).
  - Debe incluir la firma digital del empleado que solicitó.
  - **Firma de Pentágono:** El guardia de seguridad debe tener un botón para "Confirmar Salida", lo cual estampa la firma del guardia en el documento digital y pasa el préstamo al estado `CHECKED_OUT`.
- **Trazabilidad:** Este documento generado queda como comprobante histórico en el sistema.

## 4. Restricciones y Casos Borde (Auto-Corrección)
*(Espacio reservado para fallos descubiertos durante la implementación)*
- *Nota:* Asegurar que la cámara funcione en dispositivos móviles para el registro del empleado.
- *Nota:* La firma debe ser procesada en formato estándar (PNG) para garantizar su inmutabilidad en los reportes (PDFs o vistas de comprobante).
