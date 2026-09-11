# INFORME DE AVANCE DE PROYECTO
**Proyecto:** Sistema Integral de Control de Activos e Inventario  
**Fecha:** 11 de septiembre de 2026  
**Estado:** En Despliegue  

---

## 1. Resumen Ejecutivo
El presente proyecto tiene como objetivo desarrollar e implementar una plataforma digital integral para la trazabilidad y administración del inventario físico de la empresa. El sistema busca erradicar los cuellos de botella administrativos, mitigar el riesgo de pérdida de equipos y optimizar el uso del capital mediante la digitalización de los procesos de asignación y control.

A la fecha, el desarrollo core de la plataforma ha concluido y el sistema se encuentra desplegado en su entorno de producción, operando bajo una arquitectura de accesos basados en roles y validaciones mediante códigos QR.

## 2. Problemáticas Resueltas
El diseño de la plataforma aborda y soluciona las siguientes fricciones operativas detectadas en el modelo tradicional:

* **Trazabilidad deficiente:** Se elimina el rastreo manual de equipos (hojas de cálculo o papel).
* **Pérdida y sustracción de equipos:** Se mitiga el riesgo de salida de activos sin autorización oficial de las instalaciones.
* **Desperdicio de recursos financieros:** Se previene la compra duplicada de equipos al brindar visibilidad sobre el inventario "ocioso" o almacenado sin uso.
* **Desorden logístico en multisedes:** Se elimina la mezcla de inventarios entre distintos departamentos o bodegas.

## 3. Módulos y Funcionalidades Entregadas

Durante este ciclo de desarrollo, se completó la implementación de las siguientes capacidades clave:

**A. Etiquetado y Escaneo Ágil (Códigos QR)**
* Generación automatizada de códigos QR únicos para cada activo físico.
* Módulo de escaneo integrado compatible con dispositivos móviles, que permite visualizar la hoja de vida completa del equipo en tiempo real.

**B. Gestión Centralizada de Préstamos y Asignaciones**
* Portal de autogestión donde los empleados solicitan equipos formalmente.
* Flujo de aprobación digital para los encargados, dejando un registro auditable de quién posee el activo y la fecha programada de retorno.

**C. Módulo de Seguridad y Control de Salida**
* Implementación del rol específico de "Seguridad/Salida".
* Validación instantánea en portería: al escanear el equipo, el sistema cruza la base de datos para confirmar si el portador cuenta con el "Pase de Salida" aprobado, bloqueando sustracciones irregulares.

**D. Inteligencia Financiera y Depreciación**
* Módulo de detección de "Activos Sin Uso" que alerta sobre equipos inactivos por periodos prolongados (ej. > 180 días).
* Herramientas contables para cálculo de depreciación y estimación de valor del hardware a través del tiempo.

**E. Arquitectura Multi-Bodega (Multisede)**
* Partición de datos que asegura que cada Encargado gestione exclusivamente el inventario de su área de responsabilidad.
* Visión consolidada y métricas globales habilitadas únicamente para el nivel directivo (Administradores).

## 4. Próximos Pasos y Recomendaciones
* **Capacitación:** Iniciar el ciclo de inducción con los líderes de departamento (Encargados) y personal de seguridad.
* **Etiquetado Físico:** Proceder con la impresión masiva de los códigos QR generados por el sistema y su posterior adhesión al inventario físico.
* **Monitoreo en Producción:** Acompañamiento técnico durante la primera semana de uso intensivo para garantizar la adopción correcta del flujo de préstamos.
