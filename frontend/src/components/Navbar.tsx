import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, QrCode, ClipboardCheck, AlertTriangle, UserCheck, LogOut, Users as UsersIcon } from 'lucide-react';
import { useModule } from '../moduleContext';
import { getUsers, MODULE_LABELS, type Module, type User } from '../api';
import { getCurrentUserId, clearCurrentUserId } from '../identity';

const Navbar = () => {
  const location = useLocation();
  const { module, setModule } = useModule();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const id = getCurrentUserId();
    if (id === null) return;
    getUsers().then((users) => {
      const found = users.find(u => u.id === id) ?? null;
      setCurrentUser(found);
      // Un empleado con módulo asignado queda fijado a ese módulo.
      if (found && found.role === 'empleado' && found.module) {
        setModule(found.module);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchUser = () => {
    clearCurrentUserId();
    window.location.reload();
  };

  const moduleLocked = currentUser?.role === 'empleado' && !!currentUser.module;

  const navItems = [
    { path: '/dashboard', label: 'Catálogo', icon: Package },
    { path: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck },
    { path: '/scanner', label: 'Control Salida', icon: QrCode },
    { path: '/unused', label: 'Sin Uso', icon: AlertTriangle },
    { path: '/assignments', label: 'Asignaciones', icon: UserCheck },
    { path: '/users', label: 'Usuarios', icon: UsersIcon },
  ];

  return (
    <nav className="liquid-glass" style={{
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          background: 'var(--accent-color)', 
          padding: '8px', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
        }}>
          <Package size={24} color="white" />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Elite Nutrition</h1>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.15)' : 'none'
              }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <select
        value={module}
        onChange={(e) => setModule(e.target.value as Module)}
        disabled={moduleLocked}
        title={moduleLocked ? 'Tu módulo está fijado por tu perfil' : undefined}
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          color: 'white',
          border: '1px solid var(--surface-border)',
          borderRadius: '12px',
          padding: '8px 12px',
          fontFamily: 'inherit',
          fontWeight: 500,
          cursor: moduleLocked ? 'not-allowed' : 'pointer',
          backdropFilter: 'blur(10px)',
          opacity: moduleLocked ? 0.6 : 1,
        }}
      >
        {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
          <option key={m} value={m}>{MODULE_LABELS[m]}</option>
        ))}
      </select>

      {currentUser && (
        <button
          onClick={handleSwitchUser}
          title="Cambiar usuario"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent',
            border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem',
            fontFamily: 'inherit', marginLeft: '12px',
          }}
        >
          {currentUser.full_name} <LogOut size={14} />
        </button>
      )}
    </nav>
  );
};

export default Navbar;
