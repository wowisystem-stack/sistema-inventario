import os
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_mock_transcriptions() -> list:
    """Carga 3 transcripciones de prueba para validar el parseo."""
    return [
        {
            "id": "doc_001",
            "content": "Soy el Operario de Planta. Le reporto al Jefe de Producción. Mi trabajo diario incluye hacer el inventario, revisar los insumos y reportar fallas en la maquinaria."
        },
        {
            "id": "doc_002",
            "content": "Soy el Jefe de Producción. Le reporto al Gerente General. Mi responsabilidad es orquestar a los operarios, asegurar la cuota mensual de producción y solicitar mantenimiento."
        },
        {
            "id": "doc_003",
            "content": "Soy el Especialista de Calidad. Le reporto al Gerente General. Mi labor es hacer auditorías de producto, diligenciar el formato de calidad y detener la línea si hay defectos."
        }
    ]

def process_to_agent_schema(transcriptions: list) -> list:
    """Procesa el texto a JSON estructurado. En producción usará un LLM con Prompt Caching."""
    agents = []
    
    # Mock de extracción basada en palabras clave para la validación inicial
    for t in transcriptions:
        if "Operario de Planta" in t['content']:
            agents.append({
                "role_id": "OP-01",
                "name": "Agente Operario",
                "role": "Operario de Planta",
                "reports_to": "Jefe de Producción",
                "daily_processes": ["Hacer el inventario", "Revisar los insumos", "Reportar fallas en la maquinaria"]
            })
        elif "Jefe de Producción" in t['content']:
            agents.append({
                "role_id": "JP-01",
                "name": "Agente Jefe Prod",
                "role": "Jefe de Producción",
                "reports_to": "Gerente General",
                "daily_processes": ["Orquestar a los operarios", "Asegurar la cuota mensual", "Solicitar mantenimiento"]
            })
        elif "Especialista de Calidad" in t['content']:
            agents.append({
                "role_id": "QA-01",
                "name": "Agente Calidad",
                "role": "Especialista de Calidad",
                "reports_to": "Gerente General",
                "daily_processes": ["Hacer auditorías de producto", "Diligenciar formato de calidad", "Detener línea ante defectos"]
            })
            
    return agents

def save_agents_config(agents: list, output_path: str):
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(agents, f, indent=4, ensure_ascii=False)
    logging.info(f"Configuración de {len(agents)} agentes guardada exitosamente en {output_path}")

def main():
    # Establecer rutas
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(base_dir, "backend", "knowledge_base", "agents_config.json")
    
    # Crear carpetas si no existen
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Ejecutar ETL de IA
    logging.info("Iniciando Ingestión de Mundo (Módulo IA)...")
    transcriptions = load_mock_transcriptions()
    
    logging.info("Parseando roles y extrayendo detalles de procesos...")
    agents = process_to_agent_schema(transcriptions)
    
    # Validación automatizada: verificar que se parsearon 3 roles
    if len(agents) != 3:
        logging.error(f"Error de Parseo: Se esperaban 3 roles, se obtuvieron {len(agents)}")
        exit(1)
        
    save_agents_config(agents, output_path)
    logging.info("Módulo de ingestión finalizado correctamente.")
    
if __name__ == "__main__":
    main()
