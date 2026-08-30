import os
import base64
from supabase import create_client, Client
from datetime import datetime

# Se asume que las variables de entorno están configuradas (p.ej. por Vercel o localmente en .env)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_base64_image(base64_string: str, bucket_name: str, folder: str, filename_prefix: str) -> str:
    """
    Decodifica una imagen en base64 y la sube a Supabase Storage.
    Retorna la URL pública de la imagen.
    """
    if not supabase:
        print("Warning: Supabase credentials not found. Cannot upload image.")
        return None

    # Extraer el contenido base64 si incluye el prefijo data:image/...;base64,
    if "base64," in base64_string:
        header, base64_data = base64_string.split("base64,")
        # Inferir la extensión (generalmente image/png o image/jpeg)
        ext = header.split(";")[0].split("/")[1]
    else:
        base64_data = base64_string
        ext = "png"

    try:
        image_bytes = base64.b64decode(base64_data)
        
        # Generar un nombre de archivo único
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{folder}/{filename_prefix}_{timestamp}.{ext}"
        
        # Subir al bucket
        response = supabase.storage.from_(bucket_name).upload(
            file=image_bytes,
            path=filename,
            file_options={"content-type": f"image/{ext}"}
        )
        
        # Obtener URL pública
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"Error uploading image to Supabase: {e}")
        return None
