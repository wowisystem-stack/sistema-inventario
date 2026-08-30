import os
import subprocess
import sys

def deploy_to_vercel():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    print(f"Iniciando despliegue en Vercel para {frontend_dir}...")
    
    try:
        print("Ejecutando comando: npx vercel --yes --prod")
        # En Windows, usar shell=True facilita la resolución de npx
        result = subprocess.run(
            "npx vercel --yes --prod",
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            shell=True
        )
        
        if result.returncode == 0:
            print("Despliegue completado con éxito.")
            print(result.stdout)
        else:
            print("Error durante el despliegue:")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    deploy_to_vercel()
