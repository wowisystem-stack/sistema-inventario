import os
import json
import base64
import logging
from io import BytesIO
from PIL import Image
import google.generativeai as genai

logger = logging.getLogger("ai_estimator")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY no está configurada.")

def estimate_asset_value(base64_image: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("La API Key de Gemini no está configurada en el servidor.")
        
    try:
        # Remover el encabezado si viene como data URL
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
            
        image_data = base64.b64decode(base64_image)
        image = Image.open(BytesIO(image_data))
        
        # Reducir el tamaño de la imagen para optimizar
        image.thumbnail((1024, 1024))
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = (
            "Eres un experto avaluador de inventario y activos de oficina/tecnología. "
            "Analiza la siguiente imagen de un activo y estima lo siguiente:\n"
            "1. description: Una descripción corta y precisa del artículo (ej. 'Monitor Curvo', 'Silla Ergonómica').\n"
            "2. brand_model: La marca y modelo visible o deducible (ej. 'Samsung Odyssey G5', 'Herman Miller Aeron'). Si no es visible, infiere la marca si es obvia o pon ''.\n"
            "3. estimated_price_cop: El valor de mercado actual aproximado en Pesos Colombianos (COP) como un número entero. "
            "Piensa en cuánto costaría usado/nuevo en el mercado actual de Colombia. (Ej. 1500000).\n"
            "\n"
            "Responde ÚNICAMENTE con un objeto JSON válido con las claves: description, brand_model, estimated_price_cop.\n"
            "No incluyas markdown (como ```json o ```). Solo el objeto JSON crudo."
        )
        
        # Llamar al modelo de Gemini
        response = model.generate_content([prompt, image])
        
        text = response.text.strip()
        # Limpiar markdown si el modelo no sigue la instrucción estrictamente
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
            
        data = json.loads(text)
        
        return {
            "description": data.get("description", ""),
            "brand_model": data.get("brand_model", ""),
            "estimated_price_cop": data.get("estimated_price_cop")
        }
        
    except Exception as e:
        logger.error(f"Error al estimar valor con IA: {e}")
        raise ValueError(f"No se pudo estimar el valor del activo. Detalle: {str(e)}")
