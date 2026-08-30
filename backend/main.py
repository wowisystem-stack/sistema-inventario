import os

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

import models, schemas
from database import engine, get_db
from services import qr_generator, biometrics, depreciation

load_dotenv()

# Crear tablas en BD
models.Base.metadata.create_all(bind=engine)

APP_PASSWORD = os.environ.get("APP_PASSWORD")


def verify_password(x_app_password: Optional[str] = Header(default=None)):
    # Si no hay APP_PASSWORD configurado (ej. desarrollo local), no se exige clave.
    if APP_PASSWORD and x_app_password != APP_PASSWORD:
        raise HTTPException(status_code=401, detail="Clave de acceso inválida")


app = FastAPI(
    title="Control de Inventario y Activos",
    dependencies=[Depends(verify_password)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Para desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from supabase_client import upload_base64_image

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username ya registrado")
    
    # Procesar imágenes si vienen en base64
    user_dict = user.dict()
    if user_dict.get("photo_url") and user_dict["photo_url"].startswith("data:image"):
        url = upload_base64_image(user_dict["photo_url"], "inventory-assets", "users/photos", f"{user.username}_photo")
        if url: user_dict["photo_url"] = url
            
    if user_dict.get("digital_signature_url") and user_dict["digital_signature_url"].startswith("data:image"):
        url = upload_base64_image(user_dict["digital_signature_url"], "inventory-assets", "users/signatures", f"{user.username}_sig")
        if url: user_dict["digital_signature_url"] = url

    new_user = models.User(**user_dict)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

@app.get("/role-permissions/", response_model=List[schemas.RolePermission])
def get_role_permissions(db: Session = Depends(get_db)):
    return db.query(models.RolePermission).all()

# --- Endpoints de Activos ---
@app.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.unique_code == asset.unique_code).first()
    if db_asset:
        raise HTTPException(status_code=400, detail="Activo ya registrado")
        
    # Generar QR
    qr_base64 = qr_generator.generate_qr_base64(asset.unique_code)
    
    new_asset = models.Asset(
        unique_code=asset.unique_code,
        description=asset.description,
        brand_model=asset.brand_model,
        photo_url=asset.photo_url,
        status=asset.status,
        qr_data=qr_base64,
        module=asset.module,
        area=asset.area,
        responsible_name=asset.responsible_name,
        value=asset.value,
        accessory_1=asset.accessory_1,
        accessory_2=asset.accessory_2,
        accessory_3=asset.accessory_3,
        observations=asset.observations,
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@app.get("/assets/", response_model=List[schemas.Asset])
def get_assets(module: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Asset)
    if module:
        try:
            query = query.filter(models.Asset.module == models.ModuleEnum(module))
        except ValueError:
            raise HTTPException(status_code=400, detail="Módulo inválido")
    return query.all()

UNUSED_THRESHOLD_DAYS = 180

@app.get("/assets/unused", response_model=List[dict])
def get_unused_assets(module: Optional[str] = None, db: Session = Depends(get_db)):
    threshold = datetime.utcnow() - timedelta(days=UNUSED_THRESHOLD_DAYS)
    query = db.query(models.Asset).filter(models.Asset.status == models.AssetStatusEnum.AVAILABLE)
    if module:
        try:
            query = query.filter(models.Asset.module == models.ModuleEnum(module))
        except ValueError:
            raise HTTPException(status_code=400, detail="Módulo inválido")

    results = []
    for asset in query.all():
        last_loan = (
            db.query(models.Loan)
            .filter(models.Loan.asset_id == asset.id)
            .order_by(models.Loan.request_date.desc())
            .first()
        )
        last_activity = None
        if last_loan:
            last_activity = last_loan.return_date or last_loan.checkout_date or last_loan.request_date

        is_unused = last_loan is None or (last_activity is not None and last_activity < threshold)
        if not is_unused:
            continue

        days_since = (datetime.utcnow() - last_activity).days if last_activity else None
        results.append({
            "id": asset.id,
            "unique_code": asset.unique_code,
            "description": asset.description,
            "brand_model": asset.brand_model,
            "module": asset.module.value,
            "area": asset.area,
            "days_since_last_use": days_since,
            "estimated_value": asset.estimated_value,
            "purchase_price": asset.purchase_price,
        })

    results.sort(key=lambda r: r["days_since_last_use"] if r["days_since_last_use"] is not None else 10**9, reverse=True)
    return results

@app.put("/assets/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: int, update: schemas.AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    for field, value in update.dict(exclude_unset=True).items():
        setattr(asset, field, value)

    if update.purchase_price is not None:
        asset.value_source = models.ValueSourceEnum.MANUAL

    db.commit()
    db.refresh(asset)
    return asset

@app.post("/assets/{asset_id}/photo", response_model=schemas.Asset)
async def upload_asset_photo(asset_id: int, photo: UploadFile = File(...), db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado (usar JPEG, PNG o WEBP)")

    import base64
    photo_bytes = await photo.read()
    b64 = base64.b64encode(photo_bytes).decode()
    asset.photo_url = f"data:{photo.content_type};base64,{b64}"

    db.commit()
    db.refresh(asset)
    return asset

@app.get("/assets/{asset_id}/depreciation", response_model=dict)
def get_asset_depreciation(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    return depreciation.calculate_depreciation(asset)

@app.get("/assets/verify/{unique_code}", response_model=dict)
def verify_asset_status(unique_code: str, db: Session = Depends(get_db)):
    # Este endpoint lo usará el "Personal de salida" escaneando el QR
    asset = db.query(models.Asset).filter(models.Asset.unique_code == unique_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    # Buscar si tiene un préstamo activo
    active_loan = db.query(models.Loan).filter(
        models.Loan.asset_id == asset.id,
        models.Loan.status == models.LoanStatusEnum.CHECKED_OUT
    ).first()
    
    return {
        "asset_code": asset.unique_code,
        "asset_description": asset.description,
        "status": asset.status.value,
        "is_authorized_to_leave": active_loan is not None,
        "loan_id": active_loan.id if active_loan else None,
        "borrower_name": active_loan.borrower.full_name if active_loan else None,
        "borrower_photo": active_loan.borrower.photo_url if active_loan else None,
        "borrower_document_id": active_loan.borrower.document_id if active_loan else None,
        "borrower_signature": active_loan.borrower.digital_signature_url if active_loan else None,
    }

# --- Endpoints de Préstamos ---
@app.get("/loans/", response_model=List[schemas.Loan])
def get_loans(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Loan)
    if status_filter:
        try:
            query = query.filter(models.Loan.status == models.LoanStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado de préstamo inválido")
    return query.order_by(models.Loan.request_date.desc()).all()

@app.get("/loans/{loan_id}", response_model=schemas.Loan)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return loan

@app.post("/loans/request", response_model=schemas.Loan)
def request_loan(loan_req: schemas.LoanCreate, db: Session = Depends(get_db)):
    # Verificar si el activo está disponible
    asset = db.query(models.Asset).filter(models.Asset.id == loan_req.asset_id).first()
    if not asset or asset.status != models.AssetStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Activo no disponible para préstamo")
        
    new_loan = models.Loan(
        asset_id=loan_req.asset_id,
        borrower_id=loan_req.borrower_id,
        reason=loan_req.reason,
        status=models.LoanStatusEnum.PENDING
    )
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)
    return new_loan

@app.post("/loans/{loan_id}/approve", response_model=schemas.Loan)
def approve_loan(loan_id: int, approval: schemas.LoanApproval, db: Session = Depends(get_db)):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Préstamo no válido para aprobación")
        
    loan.approver_id = approval.approver_id
    loan.approval_date = datetime.utcnow()
    loan.status = models.LoanStatusEnum.APPROVED if approval.approved else models.LoanStatusEnum.REJECTED
    
    db.commit()
    db.refresh(loan)
    return loan

@app.post("/loans/{loan_id}/checkout", response_model=schemas.Loan)
async def checkout_loan(
    loan_id: int, 
    face_image: UploadFile = File(...), 
    id_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail="Préstamo no aprobado para salida")

    # Leer bytes
    face_bytes = await face_image.read()
    id_bytes = await id_image.read()
    
    # Validar biométricamente
    is_valid = biometrics.validate_face_and_id(face_bytes, id_bytes)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Validación biométrica fallida")
        
    # Actualizar préstamo y activo
    loan.status = models.LoanStatusEnum.CHECKED_OUT
    loan.checkout_date = datetime.utcnow()
    loan.asset.status = models.AssetStatusEnum.LOANED
    
    db.commit()
    db.refresh(loan)
    return loan

from pydantic import BaseModel
class SecurityCheckoutRequest(BaseModel):
    security_signature_base64: str

@app.post("/loans/{loan_id}/checkout-security", response_model=schemas.Loan)
def checkout_loan_security(loan_id: int, request: SecurityCheckoutRequest, db: Session = Depends(get_db)):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.APPROVED:
        raise HTTPException(status_code=400, detail="Préstamo no aprobado o no válido para salida de seguridad")

    # Subir firma del guardia (Pentágono)
    sig_url = upload_base64_image(request.security_signature_base64, "inventory-assets", "security/signatures", f"loan_{loan_id}_security_sig")
    if sig_url:
        loan.security_signature_url = sig_url

    loan.status = models.LoanStatusEnum.CHECKED_OUT
    loan.checkout_date = datetime.utcnow()
    loan.asset.status = models.AssetStatusEnum.LOANED
    
    db.commit()
    db.refresh(loan)
    return loan

@app.post("/loans/{loan_id}/return", response_model=schemas.Loan)
def return_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Préstamo no válido para devolución")
        
    loan.status = models.LoanStatusEnum.RETURNED
    loan.return_date = datetime.utcnow()
    loan.asset.status = models.AssetStatusEnum.AVAILABLE

    db.commit()
    db.refresh(loan)
    return loan

# --- Endpoints de Asignaciones Temporales Autorizadas (líderes) ---
@app.get("/assignments/", response_model=List[schemas.Assignment])
def get_assignments(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.AssetAssignment)
    if status_filter:
        try:
            query = query.filter(models.AssetAssignment.status == models.AssignmentStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado de asignación inválido")
    return query.order_by(models.AssetAssignment.expiration_date.asc()).all()

@app.post("/assignments/", response_model=schemas.Assignment)
def create_assignment(payload: schemas.AssignmentCreate, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == payload.asset_id).first()
    if not asset or asset.status != models.AssetStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Activo no disponible para asignar")

    assignment = models.AssetAssignment(
        asset_id=payload.asset_id,
        user_id=payload.user_id,
        authorized_by_id=payload.authorized_by_id,
        expiration_date=datetime.utcnow() + timedelta(days=payload.duration_days),
        notes=payload.notes,
        status=models.AssignmentStatusEnum.ACTIVE,
    )
    asset.status = models.AssetStatusEnum.ASSIGNED

    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@app.post("/assignments/{assignment_id}/renew", response_model=schemas.Assignment)
def renew_assignment(assignment_id: int, duration_days: int = 90, db: Session = Depends(get_db)):
    assignment = db.query(models.AssetAssignment).filter(models.AssetAssignment.id == assignment_id).first()
    if not assignment or assignment.status != models.AssignmentStatusEnum.ACTIVE:
        raise HTTPException(status_code=400, detail="Asignación no válida para renovar")

    assignment.expiration_date = datetime.utcnow() + timedelta(days=duration_days)
    db.commit()
    db.refresh(assignment)
    return assignment

@app.post("/assignments/{assignment_id}/revoke", response_model=schemas.Assignment)
def revoke_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(models.AssetAssignment).filter(models.AssetAssignment.id == assignment_id).first()
    if not assignment or assignment.status != models.AssignmentStatusEnum.ACTIVE:
        raise HTTPException(status_code=400, detail="Asignación no válida para revocar")

    assignment.status = models.AssignmentStatusEnum.REVOKED
    assignment.asset.status = models.AssetStatusEnum.AVAILABLE
    db.commit()
    db.refresh(assignment)
    return assignment
