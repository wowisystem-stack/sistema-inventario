import { Link, useLocation } from 'react-router-dom';
import { Package, QrCode, ClipboardCheck, AlertTriangle, UserCheck, LogOut, Users as UsersIcon, Inbox } from 'lucide-react';
import { getCachedUser } from './LoginGate';
import { clearToken } from '../session';

const Navbar = () => {
  const location = useLocation();
  const currentUser = getCachedUser();

  const handleLogout = () => {
    clearToken();
    window.location.href = '/dashboard';
  };

  const isEmpleado = currentUser?.role === 'empleado';
  const isAdmin = currentUser?.role === 'admin';
  const isEncargadoOrAdmin = currentUser?.role === 'encargado' || isAdmin;

  const navItems = [
    { path: '/dashboard', label: isEmpleado ? 'Mi Solicitud' : 'Catálogo', icon: Package, show: true },
    { path: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, show: true },
    { path: '/requests', label: 'Solicitudes', icon: Inbox, show: isEncargadoOrAdmin },
    { path: '/scanner', label: 'Control Salida', icon: QrCode, show: !isEmpleado },
    { path: '/unused', label: 'Sin Uso', icon: AlertTriangle, show: isEncargadoOrAdmin },
    { path: '/assignments', label: 'Asignaciones', icon: UserCheck, show: isEncargadoOrAdmin },
    { path: '/users', label: 'Usuarios', icon: UsersIcon, show: isAdmin },
  ].filter(item => item.show);

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

      {currentUser && (
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: 'inherit', marginLeft: '12px',
            padding: '8px 12px',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
        >
          {currentUser.full_name} <LogOut size={16} />
        </button>
      )}
    </nav>
  );
};

export default Navbar;
