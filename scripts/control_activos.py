import requests
import json
import os
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_simulation():
    print("Iniciando simulación del sistema de Control de Activos...")
    
    # 1. Crear Usuarios
    print("\n[+] Creando usuarios...")
    admin = {"username": "admin1", "full_name": "Administrador Global", "document_id": "111", "role": "admin"}
    empleado = {"username": "emp1", "full_name": "Empleado Test", "document_id": "222", "role": "empleado"}
    encargado = {"username": "enc1", "full_name": "Encargado Aprobador", "document_id": "333", "role": "encargado"}
    
    users_created = []
    for u in [admin, empleado, encargado]:
        resp = requests.post(f"{BASE_URL}/users/", json=u)
        if resp.status_code == 200:
            users_created.append(resp.json())
            print(f"  Usuario creado: {u['username']}")
        else:
            print(f"  Error creando {u['username']}: {resp.text}")
            # Asumimos que ya existe
            resp = requests.get(f"{BASE_URL}/users/")
            users_created = resp.json()
            break

    # 2. Crear un Activo
    print("\n[+] Registrando un nuevo activo...")
    import time
    asset_code = f"MAC-{int(time.time())}"
    asset_data = {
        "unique_code": asset_code,
        "description": "MacBook Pro 16",
        "brand_model": "Apple 2023",
        "qr_data": "placeholder"
    }
    resp = requests.post(f"{BASE_URL}/assets/", json=asset_data)
    if resp.status_code == 200:
        asset = resp.json()
        print(f"  Activo registrado: {asset['unique_code']}")
    else:
        print(f"  Error registrando activo: {resp.text}")
        sys.exit(1)

    # 3. Solicitar Préstamo
    print("\n[+] Empleado solicita préstamo del activo...")
    emp_id = next(u["id"] for u in users_created if u["username"] == "emp1")
    loan_req = {
        "asset_id": asset["id"],
        "borrower_id": emp_id,
        "reason": "Trabajo remoto fin de semana"
    }
    resp = requests.post(f"{BASE_URL}/loans/request", json=loan_req)
    if resp.status_code == 200:
        loan = resp.json()
        print(f"  Solicitud de préstamo creada (ID: {loan['id']}) - Estado: {loan['status']}")
    else:
        print(f"  Error solicitando préstamo: {resp.text}")
        sys.exit(1)

    # 4. Aprobar Préstamo
    print("\n[+] Encargado aprueba el préstamo...")
    enc_id = next(u["id"] for u in users_created if u["username"] == "enc1")
    approval_data = {
        "approver_id": enc_id,
        "approved": True
    }
    resp = requests.post(f"{BASE_URL}/loans/{loan['id']}/approve", json=approval_data)
    if resp.status_code == 200:
        loan = resp.json()
        print(f"  Préstamo aprobado (ID: {loan['id']}) - Estado: {loan['status']}")
    else:
        print(f"  Error aprobando préstamo: {resp.text}")
        sys.exit(1)

    # 5. Check-out (Simular subida de imágenes)
    print("\n[+] Realizando Check-out (Validación biométrica simulada)...")
    
    # Crear imágenes falsas
    with open("../.tmp/fake_face.png", "wb") as f:
        f.write(b"fake_image_data")
    with open("../.tmp/fake_id.png", "wb") as f:
        f.write(b"fake_image_data")
        
    with open("../.tmp/fake_face.png", "rb") as f_face, open("../.tmp/fake_id.png", "rb") as f_id:
        files = {
            "face_image": ("fake_face.png", f_face, "image/png"),
            "id_image": ("fake_id.png", f_id, "image/png")
        }
        resp = requests.post(f"{BASE_URL}/loans/{loan['id']}/checkout", files=files)
        
    if resp.status_code == 200:
        loan = resp.json()
        print(f"  Check-out exitoso. El activo ha sido entregado. Estado Préstamo: {loan['status']}")
    else:
        print(f"  Error en Check-out: {resp.text}")
        sys.exit(1)
        
    # 6. Salida de Portería (Escaneo de QR)
    print("\n[+] Escaneando QR en portería (Control de Salida)...")
    resp = requests.get(f"{BASE_URL}/assets/verify/{asset['unique_code']}")
    if resp.status_code == 200:
        verify = resp.json()
        print(f"  Resultado de Portería: {verify}")
        if verify["is_authorized_to_leave"]:
            print("  [OK] Salida permitida: El activo tiene un préstamo autorizado.")
        else:
            print("  [X] Salida denegada.")
    else:
        print(f"  Error en Portería: {resp.text}")
        
    # 7. Retorno del Activo
    print("\n[+] Empleado devuelve el activo...")
    resp = requests.post(f"{BASE_URL}/loans/{loan['id']}/return")
    if resp.status_code == 200:
        loan = resp.json()
        print(f"  Devolución exitosa. Estado: {loan['status']}")
    else:
        print(f"  Error devolviendo activo: {resp.text}")

if __name__ == "__main__":
    if not os.path.exists("../.tmp"):
        os.makedirs("../.tmp")
    run_simulation()
