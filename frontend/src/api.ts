import { getPassword } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type AssetStatus = 'available' | 'loaned' | 'maintenance' | 'assigned';

export const STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Disponible',
  loaned: 'Prestado',
  maintenance: 'Mantenimiento',
  assigned: 'Asignado',
};
export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'checked_out' | 'returned';
export type Role = 'admin' | 'encargado' | 'salida' | 'empleado';
export type Module = 'elite_nutricion' | 'estudio' | 'estadio' | 'futupro';
export type Category =
  | 'computadores' | 'celulares' | 'tablets' | 'camaras' | 'microfonos'
  | 'audio' | 'tripodes' | 'telefono' | 'impresoras' | 'proyectores' | 'cables' | 'otros';
export type ValueSource = 'manual' | 'estimado' | 'desconocido';

export const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);

export const CATEGORY_LABELS: Record<Category, string> = {
  computadores: 'Computadores', celulares: 'Celulares', tablets: 'Tablets',
  camaras: 'Cámaras', microfonos: 'Micrófonos', audio: 'Audio', tripodes: 'Trípodes',
  telefono: 'Teléfono', impresoras: 'Impresoras', proyectores: 'Proyectores',
  cables: 'Cables', otros: 'Otros',
};

export const MODULE_LABELS: Record<Module, string> = {
  elite_nutricion: 'Elite Nutrition',
  estudio: 'Estudio',
  estadio: 'Estadio',
  futupro: 'Futupro',
};

export interface Asset {
  id: number;
  unique_code: string;
  description: string;
  brand_model: string;
  photo_url: string | null;
  status: AssetStatus;
  qr_data: string;
  module: Module;
  area: string | null;
  responsible_name: string | null;
  value: number | null;
  accessory_1: string | null;
  accessory_2: string | null;
  accessory_3: string | null;
  observations: string | null;
  appsheet_photo_ref: string | null;
  category: Category | null;
  purchase_price: number | null;
  purchase_date: string | null;
  estimated_value: number | null;
  value_source: ValueSource;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  document_id: string;
  role: Role;
  module: Module | null;
  cargo: string | null;
}

export interface RolePermission {
  id: number;
  cargo: string;
  allowed_categories: string;
}

export interface Loan {
  id: number;
  asset_id: number;
  borrower_id: number;
  approver_id: number | null;
  reason: string | null;
  status: LoanStatus;
  request_date: string;
  approval_date: string | null;
  checkout_date: string | null;
  return_date: string | null;
  observations: string | null;
  condition_status: string | null;
  asset: Asset;
  borrower: User;
  approver: User | null;
}

export interface VerificationResult {
  asset_code: string;
  asset_description: string;
  status: AssetStatus;
  is_authorized_to_leave: boolean;
  loan_id: number | null;
  borrower_name: string | null;
  borrower_photo: string | null;
  borrower_document_id: string | null;
  borrower_signature: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Password': getPassword(),
    },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Error ${res.status} al llamar ${path}`);
  }
  return res.json();
}

export const pingAuth = () => request<User[]>('/users/');

export const getAssets = (module?: Module) =>
  request<Asset[]>(`/assets/${module ? `?module=${module}` : ''}`);

export interface UnusedAsset {
  id: number;
  unique_code: string;
  description: string;
  brand_model: string;
  module: Module;
  area: string | null;
  days_since_last_use: number | null;
  estimated_value: number | null;
  purchase_price: number | null;
}

export const getUnusedAssets = (module?: Module) =>
  request<UnusedAsset[]>(`/assets/unused${module ? `?module=${module}` : ''}`);

export type AssetUpdate = Partial<{
  description: string;
  brand_model: string;
  status: AssetStatus;
  module: Module;
  area: string;
  responsible_name: string;
  value: number;
  accessory_1: string;
  accessory_2: string;
  accessory_3: string;
  observations: string;
  purchase_price: number;
  purchase_date: string;
}>;

export const updateAsset = (assetId: number, update: AssetUpdate) =>
  request<Asset>(`/assets/${assetId}`, {
    method: 'PUT',
    body: JSON.stringify(update),
  });

export interface Depreciation {
  computable: boolean;
  reason: string | null;
  useful_life_years: number | null;
  book_value: number | null;
  accumulated_depreciation: number | null;
  percent_depreciated: number | null;
}

export const getAssetDepreciation = (assetId: number) =>
  request<Depreciation>(`/assets/${assetId}/depreciation`);

export const uploadAssetPhoto = async (assetId: number, file: File): Promise<Asset> => {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_URL}/assets/${assetId}/photo`, {
    method: 'POST',
    headers: { 'X-App-Password': getPassword() },
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Error ${res.status} al subir la foto`);
  }
  return res.json();
};

export const verifyAsset = (code: string) =>
  request<VerificationResult>(`/assets/verify/${encodeURIComponent(code)}`);

export const getLoans = (statusFilter?: LoanStatus) =>
  request<Loan[]>(`/loans/${statusFilter ? `?status_filter=${statusFilter}` : ''}`);

export const getLoan = (loanId: number) =>
  request<Loan>(`/loans/${loanId}`);

export const getUsers = () => request<User[]>('/users/');

export const updateUser = (userId: number, update: Partial<{ module: Module; cargo: string; role: Role }>) =>
  request<User>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(update) });

export const getRolePermissions = () => request<RolePermission[]>('/role-permissions/');

export const approveLoan = (loanId: number, approverId: number, approved: boolean) =>
  request<Loan>(`/loans/${loanId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approver_id: approverId, approved }),
  });

export const requestLoan = (assetId: number, borrowerId: number, reason: string) =>
  request<Loan>('/loans/request', {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId, borrower_id: borrowerId, reason }),
  });

export const checkoutLoanSecurity = (loanId: number, securitySignatureBase64: string) =>
  request<Loan>(`/loans/${loanId}/checkout-security`, {
    method: 'POST',
    body: JSON.stringify({ security_signature_base64: securitySignatureBase64 }),
  });

export type AssignmentStatus = 'active' | 'expired' | 'revoked';

export interface Assignment {
  id: number;
  asset_id: number;
  user_id: number;
  authorized_by_id: number | null;
  start_date: string;
  expiration_date: string;
  status: AssignmentStatus;
  notes: string | null;
  asset: Asset;
  user: User;
  authorized_by: User | null;
}

export const getAssignments = (statusFilter?: AssignmentStatus) =>
  request<Assignment[]>(`/assignments/${statusFilter ? `?status_filter=${statusFilter}` : ''}`);

export const createAssignment = (assetId: number, userId: number, authorizedById: number | null, durationDays: number, notes: string) =>
  request<Assignment>('/assignments/', {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId, user_id: userId, authorized_by_id: authorizedById, duration_days: durationDays, notes }),
  });

export const renewAssignment = (assignmentId: number, durationDays: number) =>
  request<Assignment>(`/assignments/${assignmentId}/renew?duration_days=${durationDays}`, { method: 'POST' });

export const revokeAssignment = (assignmentId: number) =>
  request<Assignment>(`/assignments/${assignmentId}/revoke`, { method: 'POST' });
