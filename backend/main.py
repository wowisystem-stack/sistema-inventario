import os

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

import models, schemas
from database import engine, get_db
from services import qr_generator, biometrics, depreciation, auth as auth_service, audit
from services.asset_classifier import classify_asset

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


def _slugify_username(name: str) -> str:
    import re, unicodedata
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", ".", normalized).strip(".").lower()
    return slug or "usuario"


# --- Endpoints de Autenticación ---
@app.post("/auth/register", response_model=schemas.AuthResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing_email = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Ese correo ya tiene una cuenta")

    # Vincular con un perfil ya importado (mismo documento) que aún no tenga cuenta.
    user = db.query(models.User).filter(
        models.User.document_id == payload.document_id,
        models.User.password_hash.is_(None),
    ).first()

    photo_url = payload.photo_url
    if photo_url and photo_url.startswith("data:image"):
        uploaded = upload_base64_image(photo_url, "inventory-assets", "users/photos", f"{payload.document_id}_photo")
        if uploaded:
            photo_url = uploaded

    signature_url = payload.digital_signature_url
    if signature_url and signature_url.startswith("data:image"):
        uploaded = upload_base64_image(signature_url, "inventory-assets", "users/signatures", f"{payload.document_id}_sig")
        if uploaded:
            signature_url = uploaded

    generated_password = auth_service.generate_password()
    password_hash = auth_service.hash_password(generated_password)

    if user:
        user.full_name = payload.full_name
        user.email = payload.email
        user.photo_url = photo_url or user.photo_url
        user.digital_signature_url = signature_url or user.digital_signature_url
        user.password_hash = password_hash
    else:
        base_username = _slugify_username(payload.full_name)
        username = base_username
        suffix = 1
        while db.query(models.User).filter(models.User.username == username).first():
            suffix += 1
            username = f"{base_username}.{suffix}"

        db_doc = db.query(models.User).filter(models.User.document_id == payload.document_id).first()
        if db_doc:
            raise HTTPException(status_code=400, detail="Ese documento ya tiene una cuenta registrada")

        user = models.User(
            username=username,
            full_name=payload.full_name,
            document_id=payload.document_id,
            email=payload.email,
            photo_url=photo_url,
            digital_signature_url=signature_url,
            role=models.RoleEnum.EMPLEADO,
            password_hash=password_hash,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    audit.log_action(db, user, "user.registered", f"{user.full_name} se registró en el sistema", entity_type="user", entity_id=user.id)
    db.commit()

    token = auth_service.create_token(db, user)
    return schemas.AuthResponse(token=token, user=user, generated_password=generated_password)


@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.password_hash or not auth_service.verify_password(payload.password, user.password_hash):
        audit.log_action(
            db, user, "auth.login_failed", f"Intento de login fallido para {payload.email}",
            entity_type="user", entity_id=user.id if user else None,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    token = auth_service.create_token(db, user)
    audit.log_action(db, user, "auth.login", f"{user.full_name} inició sesión", entity_type="user", entity_id=user.id)
    db.commit()
    return schemas.AuthResponse(token=token, user=user)


@app.get("/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(auth_service.get_current_user)):
    return current_user


# --- Endpoints de Usuarios ---
@app.post("/users/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN)),
):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username ya registrado")

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

    audit.log_action(db, _admin, "user.created", f"{_admin.full_name} creó al usuario {new_user.full_name}", entity_type="user", entity_id=new_user.id)
    db.commit()
    return new_user

@app.get("/users/", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    audit.log_action(db, _admin, "user.updated", f"{_admin.full_name} editó al usuario {user.full_name}", entity_type="user", entity_id=user.id)
    db.commit()
    db.refresh(user)
    return user

@app.get("/role-permissions/", response_model=List[schemas.RolePermission])
def get_role_permissions(db: Session = Depends(get_db)):
    return db.query(models.RolePermission).all()

# --- Endpoints de Activos ---
@app.post("/assets/", response_model=schemas.Asset)
def create_asset(
    asset: schemas.AssetCreate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN, models.RoleEnum.ENCARGADO)),
):
    db_asset = db.query(models.Asset).filter(models.Asset.unique_code == asset.unique_code).first()
    if db_asset:
        raise HTTPException(status_code=400, detail="Activo ya registrado")

    photo_url = asset.photo_url
    if photo_url and photo_url.startswith("data:image"):
        uploaded = upload_base64_image(photo_url, "inventory-assets", "assets/photos", f"{asset.unique_code}_photo")
        if uploaded:
            photo_url = uploaded

    # Generar QR (codifica el unique_code, es lo que lee el Scanner de seguridad)
    qr_base64 = qr_generator.generate_qr_base64(asset.unique_code)

    category = asset.category or classify_asset(asset.description, asset.brand_model)

    new_asset = models.Asset(
        unique_code=asset.unique_code,
        description=asset.description,
        brand_model=asset.brand_model,
        photo_url=photo_url,
        status=asset.status,
        qr_data=qr_base64,
        module=asset.module,
        area=asset.area,
        responsible_name=asset.responsible_name,
        accessory_1=asset.accessory_1,
        accessory_2=asset.accessory_2,
        accessory_3=asset.accessory_3,
        observations=asset.observations,
        category=category,
        purchase_price=asset.purchase_price,
        purchase_date=asset.purchase_date,
        value_source=models.ValueSourceEnum.MANUAL if asset.purchase_price else models.ValueSourceEnum.DESCONOCIDO,
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)

    audit.log_action(db, _user, "asset.created", f"{_user.full_name} creó el activo {new_asset.unique_code} ({new_asset.description})", entity_type="asset", entity_id=new_asset.id)
    db.commit()
    return new_asset

@app.get("/assets/", response_model=List[schemas.Asset])
def get_assets(
    module: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    if current_user.role == models.RoleEnum.EMPLEADO:
        raise HTTPException(status_code=403, detail="Los empleados no tienen acceso al catálogo de activos")

    query = db.query(models.Asset)
    if module:
        try:
            query = query.filter(models.Asset.module == models.ModuleEnum(module))
        except ValueError:
            raise HTTPException(status_code=400, detail="Módulo inválido")
    assets = query.all()

    if current_user.role not in (models.RoleEnum.ADMIN, models.RoleEnum.ENCARGADO):
        for asset in assets:
            asset.value = None
            asset.purchase_price = None
            asset.estimated_value = None

    return assets

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
def update_asset(
    asset_id: int,
    update: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    _user: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN, models.RoleEnum.ENCARGADO)),
):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    for field, value in update.dict(exclude_unset=True).items():
        setattr(asset, field, value)

    if update.purchase_price is not None:
        asset.value_source = models.ValueSourceEnum.MANUAL

    audit.log_action(db, _user, "asset.updated", f"{_user.full_name} editó el activo {asset.unique_code}", entity_type="asset", entity_id=asset.id)
    db.commit()
    db.refresh(asset)
    return asset

@app.post("/assets/{asset_id}/photo", response_model=schemas.Asset)
async def upload_asset_photo(
    asset_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN, models.RoleEnum.ENCARGADO)),
):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado (usar JPEG, PNG o WEBP)")

    import base64
    photo_bytes = await photo.read()
    b64 = base64.b64encode(photo_bytes).decode()
    data_uri = f"data:{photo.content_type};base64,{b64}"

    uploaded_url = upload_base64_image(data_uri, "inventory-assets", "assets/photos", f"{asset.unique_code}_photo")
    asset.photo_url = uploaded_url or data_uri  # si Supabase falla, al menos no se pierde la foto

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
    # Este endpoint lo usará el "Personal de salida" escaneando el QR.
    # El escaneo ocurre ANTES del checkout físico: en ese momento el préstamo
    # ya aprobado todavía está en estado APPROVED (recién pasa a CHECKED_OUT
    # cuando el guardia confirma la salida en /loans/{id}/checkout-security).
    # Por eso hay que autorizar tanto APPROVED como CHECKED_OUT, no solo este último.
    asset = db.query(models.Asset).filter(models.Asset.unique_code == unique_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    active_loan = (
        db.query(models.Loan)
        .filter(
            models.Loan.asset_id == asset.id,
            models.Loan.status.in_([models.LoanStatusEnum.APPROVED, models.LoanStatusEnum.CHECKED_OUT]),
        )
        .order_by(models.Loan.request_date.desc())
        .first()
    )

    return {
        "asset_code": asset.unique_code,
        "asset_description": asset.description,
        "status": asset.status.value,
        "is_authorized_to_leave": active_loan is not None,
        "loan_status": active_loan.status.value if active_loan else None,
        "loan_id": active_loan.id if active_loan else None,
        "borrower_name": active_loan.borrower.full_name if active_loan else None,
        "borrower_photo": active_loan.borrower.photo_url if active_loan else None,
        "borrower_document_id": active_loan.borrower.document_id if active_loan else None,
        "borrower_signature": active_loan.borrower.digital_signature_url if active_loan else None,
    }

# --- Endpoints de Préstamos ---
@app.get("/loans/", response_model=List[schemas.Loan])
def get_loans(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    query = db.query(models.Loan)
    if status_filter:
        try:
            query = query.filter(models.Loan.status == models.LoanStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado de préstamo inválido")

    if current_user.role == models.RoleEnum.EMPLEADO:
        query = query.filter(models.Loan.borrower_id == current_user.id)
    elif current_user.role == models.RoleEnum.ENCARGADO and current_user.module:
        query = query.join(models.Asset).filter(models.Asset.module == current_user.module)

    return query.order_by(models.Loan.request_date.desc()).all()

@app.get("/loans/{loan_id}", response_model=schemas.Loan)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return loan

@app.post("/loans/request", response_model=schemas.Loan)
def request_loan(
    loan_req: schemas.LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    # Verificar si el activo está disponible
    asset = db.query(models.Asset).filter(models.Asset.id == loan_req.asset_id).first()
    if not asset or asset.status != models.AssetStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Activo no disponible para préstamo")

    new_loan = models.Loan(
        asset_id=loan_req.asset_id,
        borrower_id=current_user.id,
        reason=loan_req.reason,
        status=models.LoanStatusEnum.PENDING
    )
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)

    audit.log_action(db, current_user, "loan.requested", f"{current_user.full_name} solicitó el préstamo del activo {asset.unique_code}", entity_type="loan", entity_id=new_loan.id)
    db.commit()
    return new_loan

@app.post("/loans/{loan_id}/approve", response_model=schemas.Loan)
def approve_loan(
    loan_id: int,
    approval: schemas.LoanApproval,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.require_role(models.RoleEnum.ENCARGADO, models.RoleEnum.ADMIN)),
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Préstamo no válido para aprobación")

    loan.approver_id = current_user.id
    loan.approval_date = datetime.utcnow()
    loan.status = models.LoanStatusEnum.APPROVED if approval.approved else models.LoanStatusEnum.REJECTED

    verb = "aprobó" if approval.approved else "rechazó"
    audit.log_action(db, current_user, f"loan.{loan.status.value}", f"{current_user.full_name} {verb} el préstamo #{loan.id}", entity_type="loan", entity_id=loan.id)
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

    audit.log_action(db, None, "loan.checked_out", f"Se registró la salida del préstamo #{loan.id} (activo {loan.asset.unique_code}) con validación biométrica", entity_type="loan", entity_id=loan.id)
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

    audit.log_action(db, None, "loan.checked_out", f"Personal de salida registró la salida del préstamo #{loan.id} (activo {loan.asset.unique_code})", entity_type="loan", entity_id=loan.id)
    db.commit()
    db.refresh(loan)
    return loan

@app.post("/loans/{loan_id}/return", response_model=schemas.Loan)
def return_loan(
    loan_id: int,
    payload: Optional[schemas.LoanReturn] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN, models.RoleEnum.ENCARGADO, models.RoleEnum.SALIDA)),
):
    payload = payload or schemas.LoanReturn()
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != models.LoanStatusEnum.CHECKED_OUT:
        raise HTTPException(status_code=400, detail="Préstamo no válido para devolución")

    loan.status = models.LoanStatusEnum.RETURNED
    loan.return_date = datetime.utcnow()
    loan.asset.status = models.AssetStatusEnum.AVAILABLE
    if payload.observations:
        loan.observations = payload.observations
    if payload.condition_status:
        loan.condition_status = payload.condition_status

    audit.log_action(db, current_user, "loan.returned", f"{current_user.full_name} registró la devolución del activo {loan.asset.unique_code}", entity_type="loan", entity_id=loan.id)
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

    audit.log_action(db, assignment.authorized_by, "assignment.created", f"Se asignó el activo {asset.unique_code} a {assignment.user.full_name}", entity_type="assignment", entity_id=assignment.id)
    db.commit()
    return assignment

@app.post("/assignments/{assignment_id}/renew", response_model=schemas.Assignment)
def renew_assignment(assignment_id: int, duration_days: int = 90, db: Session = Depends(get_db)):
    assignment = db.query(models.AssetAssignment).filter(models.AssetAssignment.id == assignment_id).first()
    if not assignment or assignment.status != models.AssignmentStatusEnum.ACTIVE:
        raise HTTPException(status_code=400, detail="Asignación no válida para renovar")

    assignment.expiration_date = datetime.utcnow() + timedelta(days=duration_days)
    audit.log_action(db, None, "assignment.renewed", f"Se renovó la asignación #{assignment.id} ({assignment.asset.unique_code} — {assignment.user.full_name})", entity_type="assignment", entity_id=assignment.id)
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
    audit.log_action(db, None, "assignment.revoked", f"Se revocó la asignación #{assignment.id} ({assignment.asset.unique_code} — {assignment.user.full_name})", entity_type="assignment", entity_id=assignment.id)
    db.commit()
    db.refresh(assignment)
    return assignment

# --- Endpoints de Solicitudes sin catálogo (el empleado describe qué necesita) ---
@app.post("/asset-requests/", response_model=schemas.AssetRequest)
def create_asset_request(
    payload: schemas.AssetRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    new_request = models.AssetRequest(
        requester_id=current_user.id,
        module=current_user.module,
        category_requested=payload.category_requested,
        description=payload.description,
        status=models.RequestStatusEnum.PENDING,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    audit.log_action(db, current_user, "asset_request.created", f"{current_user.full_name} solicitó un activo: {new_request.description}", entity_type="asset_request", entity_id=new_request.id)
    db.commit()
    return new_request

@app.get("/asset-requests/mine", response_model=List[schemas.AssetRequest])
def get_my_asset_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    return (
        db.query(models.AssetRequest)
        .filter(models.AssetRequest.requester_id == current_user.id)
        .order_by(models.AssetRequest.created_at.desc())
        .all()
    )

@app.get("/asset-requests/", response_model=List[schemas.AssetRequest])
def get_asset_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.require_role(models.RoleEnum.ENCARGADO, models.RoleEnum.ADMIN)),
):
    query = db.query(models.AssetRequest)
    if status_filter:
        try:
            query = query.filter(models.AssetRequest.status == models.RequestStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Estado de solicitud inválido")

    if current_user.role == models.RoleEnum.ENCARGADO and current_user.module:
        query = query.filter(models.AssetRequest.module == current_user.module)

    return query.order_by(models.AssetRequest.created_at.desc()).all()

@app.post("/asset-requests/{request_id}/assign", response_model=schemas.AssetRequest)
def assign_asset_request(
    request_id: int,
    payload: schemas.AssetRequestAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.require_role(models.RoleEnum.ENCARGADO, models.RoleEnum.ADMIN)),
):
    asset_request = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not asset_request or asset_request.status != models.RequestStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Solicitud no válida para asignar")

    asset = db.query(models.Asset).filter(models.Asset.id == payload.asset_id).first()
    if not asset or asset.status != models.AssetStatusEnum.AVAILABLE:
        raise HTTPException(status_code=400, detail="Activo no disponible para asignar")

    new_loan = models.Loan(
        asset_id=asset.id,
        borrower_id=asset_request.requester_id,
        approver_id=current_user.id,
        reason=asset_request.description,
        status=models.LoanStatusEnum.APPROVED,
        approval_date=datetime.utcnow(),
    )
    db.add(new_loan)
    db.flush()

    asset_request.status = models.RequestStatusEnum.ASSIGNED
    asset_request.reviewed_by_id = current_user.id
    asset_request.reviewed_at = datetime.utcnow()
    asset_request.review_notes = payload.notes
    asset_request.resulting_loan_id = new_loan.id

    audit.log_action(
        db, current_user, "asset_request.assigned",
        f"{current_user.full_name} asignó el activo {asset.unique_code} a la solicitud de {asset_request.requester.full_name}",
        entity_type="asset_request", entity_id=asset_request.id,
    )
    db.commit()
    db.refresh(asset_request)
    return asset_request

@app.post("/asset-requests/{request_id}/reject", response_model=schemas.AssetRequest)
def reject_asset_request(
    request_id: int,
    payload: schemas.AssetRequestReject,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.require_role(models.RoleEnum.ENCARGADO, models.RoleEnum.ADMIN)),
):
    asset_request = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not asset_request or asset_request.status != models.RequestStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail="Solicitud no válida para rechazar")

    asset_request.status = models.RequestStatusEnum.REJECTED
    asset_request.reviewed_by_id = current_user.id
    asset_request.reviewed_at = datetime.utcnow()
    asset_request.review_notes = payload.notes

    audit.log_action(
        db, current_user, "asset_request.rejected",
        f"{current_user.full_name} rechazó la solicitud de {asset_request.requester.full_name}",
        entity_type="asset_request", entity_id=asset_request.id,
    )
    db.commit()
    db.refresh(asset_request)
    return asset_request


def _can_access_asset_request(current_user: "models.User", asset_request: "models.AssetRequest") -> bool:
    if current_user.role == models.RoleEnum.ADMIN:
        return True
    if current_user.id == asset_request.requester_id:
        return True
    if current_user.role == models.RoleEnum.ENCARGADO and current_user.module == asset_request.module:
        return True
    return False


@app.get("/asset-requests/{request_id}/comments", response_model=List[schemas.RequestComment])
def get_request_comments(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    asset_request = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not asset_request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if not _can_access_asset_request(current_user, asset_request):
        raise HTTPException(status_code=403, detail="No tenés permiso para ver esta solicitud")

    return (
        db.query(models.RequestComment)
        .filter(models.RequestComment.asset_request_id == request_id)
        .order_by(models.RequestComment.created_at.asc())
        .all()
    )


@app.post("/asset-requests/{request_id}/comments", response_model=schemas.RequestComment)
def create_request_comment(
    request_id: int,
    payload: schemas.RequestCommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_service.get_current_user),
):
    asset_request = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not asset_request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if not _can_access_asset_request(current_user, asset_request):
        raise HTTPException(status_code=403, detail="No tenés permiso para comentar esta solicitud")

    comment = models.RequestComment(
        asset_request_id=request_id,
        author_id=current_user.id,
        message=payload.message,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    audit.log_action(
        db, current_user, "asset_request.commented",
        f"{current_user.full_name} comentó en la solicitud de {asset_request.requester.full_name}",
        entity_type="asset_request", entity_id=asset_request.id,
    )
    db.commit()
    return comment


# --- Endpoints de Auditoría (solo admin) ---
@app.get("/activity-logs/", response_model=List[schemas.ActivityLog])
def get_activity_logs(
    entity_type: Optional[str] = None,
    actor_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth_service.require_role(models.RoleEnum.ADMIN)),
):
    query = db.query(models.ActivityLog)
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    if actor_id:
        query = query.filter(models.ActivityLog.actor_id == actor_id)

    return (
        query.order_by(models.ActivityLog.created_at.desc())
        .offset(offset)
        .limit(min(limit, 200))
        .all()
    )
