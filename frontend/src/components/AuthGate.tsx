import { useEffect, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { pingAuth } from '../api';
import { setPassword, clearPassword } from '../auth';

interface AuthGateProps {
  children: ReactNode;
}

const AuthGate = ({ children }: AuthGateProps) => {
  const [status, setStatus] = useState<'checking' | 'authorized' | 'locked'>('checking');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Siempre se intenta primero: si el backend no exige clave (ej. desarrollo
    // local sin APP_PASSWORD configurado), esto pasa directo sin mostrar el gate.
    pingAuth()
      .then(() => setStatus('authorized'))
      .catch(() => {
        clearPassword();
        setStatus('locked');
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setPassword(input);
    pingAuth()
      .then(() => setStatus('authorized'))
      .catch(() => {
        clearPassword();
        setError('Clave incorrecta.');
      })
      .finally(() => setSubmitting(false));
  };

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Verificando acceso...
      </div>
    );
  }

  if (status === 'authorized') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <Lock size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-color)' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>Elite Nutrition</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
          Ingresá la clave de acceso al sistema de inventario.
        </p>
        <input
          type="password"
          className="input-field"
          placeholder="Clave de acceso"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          style={{ marginBottom: '16px' }}
        />
        {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default AuthGate;
