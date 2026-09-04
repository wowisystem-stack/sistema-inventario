import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { getUsers, MODULE_LABELS, type User } from '../api';
import UserEditModal from '../components/UserEditModal';
import UserProfileCard from '../components/UserProfileCard';

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    getUsers().then(setUsers).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="header">
        <div>
          <h1 className="title">Usuarios</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Asigná módulo y cargo a cada persona para que solo vea los activos que le corresponden al pedir un préstamo.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger-color)' }}>Error: {error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {users.map((u) => (
            <div key={u.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <UserProfileCard
                user={u}
                subtitle={`${u.role} · ${u.module ? MODULE_LABELS[u.module] : 'sin módulo'} · ${u.cargo || 'sin cargo'}`}
              />
              <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setEditingUser(u)}>
                <Pencil size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => setUsers(users.map(u => (u.id === updated.id ? updated : u)))}
        />
      )}
    </div>
  );
};

export default Users;
