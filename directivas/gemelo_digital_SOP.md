# Directiva: Gemelo Digital Corporativo (Arquitectura MiroFish)

## Objetivo
Construir un entorno de simulación empresarial y gobernanza de conocimiento para Elite Nutrition S.A.S. & FutuPro S.A.S. El sistema convertirá los 70 cargos en Agentes de IA interactivos, permitiendo interactuar con la documentación, así como predecir el impacto de decisiones corporativas en tiempo real.

## Arquitectura y Componentes
Adoptaremos un Monorepo con 3 grandes bloques:

1. **Ingestión (Módulo IA)**: `scripts/agent_builder.py` para procesar la documentación original y generar JSON/YAML definiendo roles, jerarquías y procesos de los agentes.
2. **Backend (Python)**: Usaremos FastAPI (`backend/main.py`), un Motor de Simulación basado en inteligencia de enjambre (Swarm) y una Base de Conocimiento (GraphRAG) que valida accesos con RBAC.
3. **Frontend (Node.js/Vue)**: Aplicación híbrida que alojará el Dashboard de Simulación, el Portal RAG del Empleado y la Vista Administrador interactiva.
4. **Módulo de Administración**: Endpoints CRUD en el backend para manejar roles/organigramas que se comunican con el editor de organigrama del frontend.

## Restricciones, Casos Borde y Estrategia de Costos
1. **Prompt Caching**: Exigido para toda simulación para mantener un caché del contexto estático. Pagar únicamente por los tokens generados/nuevos en cada iteración.
2. **GraphRAG**: Extracción puntual del conocimiento. Prohibido inyectar manuales de 50 páginas completos en los prompts.
3. **Despertar Selectivo**: Agentes no afectados por la "Inyección de Variable" deben mantenerse en modo dormido obligatoriamente para ahorrar computo.
4. **Protección RAG (RBAC)**: Validar incondicionalmente el nivel del cargo de quien solicita el documento. Nadie debe ver activos que superen su jerarquía o departamento.
5. **Memoria de Errores**: Todo error lógico detectado en Python (backend/scripts) generará una parada en la que el agente parcheará el código y documentará el límite o trampa conocida debajo de esta sección.

## Pasos Operativos
1. Setup de directorios raíz y ambiente virtual (.tmp, directivas, scripts, backend, frontend).
2. Construir e iterar `scripts/agent_builder.py`.
3. Desarrollar la capa Backend.
4. Desarrollar la capa Frontend.
5. Ejecutar la validación final automatizada y manual.
