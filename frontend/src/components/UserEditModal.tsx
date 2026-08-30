import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { updateUser, getRolePermissions, MODULE_LABELS, type User, type Module, type Role } from '../api';

interface UserEditModalProps {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador', encargado: 'Encargado', salida: 'Personal de Salida', empleado: 'Empleado',
};

const UserEditModal = ({ user, onClose, onSaved }: UserEditModalProps) => {
  const [module, setModule] = useState<Module | ''>(user.module ?? '');
  const [cargo, setCargo] = useState(user.cargo ?? '');
  const [role, setRole] = useState<Role>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargoOptions, setCargoOptions] = useState<string[]>([]);

  useEffect(() => {
    getRolePermissions().then((perms) => setCargoOptions(perms.map(p => p.cargo).sort())).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await updateUser(user.id, {
        module: module || undefined,
        cargo: cargo || undefined,
        role,
      });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '24px',
    }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user.full_name}</h2>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Rol</div>
            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Módulo</div>
            <select className="input-field" value={module} onChange={(e) => setModule(e.target.value as Module)}>
              <option value="">Sin asignar (ve todos los módulos)</option>
              {(Object.keys(MODULE_LABELS) as Module[]).map(m => (
                <option key={m} value={m}>{MODULE_LABELS[m]}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Cargo (define qué categorías de activos puede solicitar)
            </div>
            <select className="input-field" value={cargo} onChange={(e) => setCargo(e.target.value)}>
              <option value="">Sin asignar (ve todas las categorías de su módulo)</option>
              {cargoOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserEditModal;
