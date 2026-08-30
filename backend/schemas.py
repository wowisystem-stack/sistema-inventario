from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import RoleEnum, AssetStatusEnum, LoanStatusEnum, ModuleEnum, CategoryEnum, ValueSourceEnum, AssignmentStatusEnum

class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    document_id: str
    photo_url: Optional[str] = None
    digital_signature_url: Optional[str] = None
    role: RoleEnum
    module: Optional[ModuleEnum] = None
    cargo: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    module: Optional[ModuleEnum] = None
    cargo: Optional[str] = None
    role: Optional[RoleEnum] = None

class RolePermission(BaseModel):
    id: int
    cargo: str
    allowed_categories: str

    class Config:
        from_attributes = True

class AssetBase(BaseModel):
    unique_code: str
    description: str
    brand_model: str
    photo_url: Optional[str] = None
    status: AssetStatusEnum = AssetStatusEnum.AVAILABLE
    qr_data: str
    module: ModuleEnum = ModuleEnum.ELITE_NUTRICION
    area: Optional[str] = None
    responsible_name: Optional[str] = None
    value: Optional[float] = None
    accessory_1: Optional[str] = None
    accessory_2: Optional[str] = None
    accessory_3: Optional[str] = None
    observations: Optional[str] = None
    appsheet_photo_ref: Optional[str] = None
    category: Optional[CategoryEnum] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None
    estimated_value: Optional[float] = None
    value_source: ValueSourceEnum = ValueSourceEnum.DESCONOCIDO

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    id: int
    class Config:
        from_attributes = True

class AssetUpdate(BaseModel):
    description: Optional[str] = None
    brand_model: Optional[str] = None
    status: Optional[AssetStatusEnum] = None
    module: Optional[ModuleEnum] = None
    area: Optional[str] = None
    responsible_name: Optional[str] = None
    value: Optional[float] = None
    accessory_1: Optional[str] = None
    accessory_2: Optional[str] = None
    accessory_3: Optional[str] = None
    observations: Optional[str] = None
    category: Optional[CategoryEnum] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[datetime] = None

class LoanBase(BaseModel):
    asset_id: int
    borrower_id: int
    reason: Optional[str] = None

class LoanCreate(LoanBase):
    reason: str

class Loan(LoanBase):
    id: int
    approver_id: Optional[int] = None
    status: LoanStatusEnum
    request_date: datetime
    approval_date: Optional[datetime] = None
    checkout_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    observations: Optional[str] = None
    external_id: Optional[str] = None
    condition_status: Optional[str] = None
    security_authorization: Optional[str] = None
    signature_ref: Optional[str] = None
    security_signature_url: Optional[str] = None

    asset: Asset
    borrower: User
    approver: Optional[User] = None

    class Config:
        from_attributes = True

class LoanApproval(BaseModel):
    approver_id: int
    approved: bool

class CheckoutRequest(BaseModel):
    observations: Optional[str] = None

class AssignmentCreate(BaseModel):
    asset_id: int
    user_id: int
    authorized_by_id: Optional[int] = None
    duration_days: int = 90
    notes: Optional[str] = None

class Assignment(BaseModel):
    id: int
    asset_id: int
    user_id: int
    authorized_by_id: Optional[int] = None
    start_date: datetime
    expiration_date: datetime
    status: AssignmentStatusEnum
    notes: Optional[str] = None

    asset: Asset
    user: User
    authorized_by: Optional[User] = None

    class Config:
        from_attributes = True
