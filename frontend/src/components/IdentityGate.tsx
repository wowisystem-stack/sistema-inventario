import { useState, useEffect, type ReactNode } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getUsers, type User } from '../api';
import { getCurrentUserId, setCurrentUserId } from '../identity';

interface IdentityGateProps {
  children: ReactNode;
}

const IdentityGate = ({ children }: IdentityGateProps) => {
  const [ready, setReady] = useState(getCurrentUserId() !== null);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ready]);

  if (ready) return <>{children}</>;

  const handleSubmit = () => {
    if (!selected) return;
    setCurrentUserId(Number(selected));
    setReady(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <UserIcon size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-color)' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>¿Quién sos?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
          Elegí tu nombre para poder solicitar y hacer seguimiento de tus activos.
        </p>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : error ? (
          <p style={{ color: 'var(--danger-color)' }}>{error}</p>
        ) : (
          <>
            <select className="input-field" value={selected} onChange={(e) => setSelected(e.target.value)} style={{ marginBottom: '16px' }}>
              <option value="">Seleccionar...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={!selected}>
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default IdentityGate;
