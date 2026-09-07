import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, QrCode, ClipboardCheck, AlertTriangle, UserCheck, Contact, LogOut, Users as UsersIcon, Inbox, PlusCircle, Grid3x3, ScrollText, PackageCheck, ScanLine, Calculator } from 'lucide-react';
import { getCachedUser } from './LoginGate';
import { clearToken } from '../session';
import { getAssetRequests, getAssets } from '../api';
import { useModule } from '../moduleContext';
import logoIcon from '../assets/logo_elite_nova.png';

const Navbar = () => {
  const location = useLocation();
  const currentUser = getCachedUser();
  const { module } = useModule();

  const handleLogout = () => {
    clearToken();
    window.location.href = '/dashboard';
  };

  const isEmpleado = currentUser?.role === 'empleado';
  const isAdmin = currentUser?.role === 'admin';
  const isEncargadoOrAdmin = currentUser?.role === 'encargado' || isAdmin;

  const [stockAlertCount, setStockAlertCount] = useState(0);

  useEffect(() => {
    if (!isEncargadoOrAdmin) return;
    let cancelled = false;

    const check = () => {
      Promise.all([getAssetRequests('pending'), getAssets()])
        .then(([reqs, assets]) => {
          if (cancelled) return;
          const scoped = reqs.filter(r => r.module === module || r.module === null);
          const available = assets.filter(a => a.status === 'available');
          const withStock = scoped.filter(r =>
            r.category_requested
              ? available.some(a => a.category === r.category_requested)
              : available.length > 0
          );
          setStockAlertCount(withStock.length);
        })
        .catch(() => {});
    };

    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [module, isEncargadoOrAdmin]);

  const navItems = [
    { path: '/dashboard', label: isEmpleado ? 'Mi Solicitud' : 'Catálogo', icon: Package, show: true },
    { path: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, show: true },
    { path: '/requests', label: 'Solicitudes', icon: Inbox, show: isEncargadoOrAdmin },
    { path: '/assets/new', label: 'Nuevo Activo', icon: PlusCircle, show: isEncargadoOrAdmin },
    { path: '/qr-codes', label: 'Códigos QR', icon: Grid3x3, show: isEncargadoOrAdmin },
    { path: '/assets/register-by-code', label: 'Registrar por Código', icon: ScanLine, show: isEncargadoOrAdmin },
    { path: '/scanner', label: 'Control Salida', icon: QrCode, show: !isEmpleado },
    { path: '/returns', label: 'Devoluciones', icon: PackageCheck, show: !isEmpleado },
    { path: '/unused', label: 'Sin Uso', icon: AlertTriangle, show: isEncargadoOrAdmin },
    { path: '/assignments', label: 'Asignaciones', icon: UserCheck, show: isEncargadoOrAdmin },
    { path: '/responsibles', label: 'Personal', icon: Contact, show: isEncargadoOrAdmin },
    { path: '/accounting', label: 'Contabilidad', icon: Calculator, show: isAdmin },
    { path: '/users', label: 'Usuarios', icon: UsersIcon, show: isAdmin },
    { path: '/logs', label: 'Logs', icon: ScrollText, show: isAdmin },
  ].filter(item => item.show);

  return (
    <nav className="liquid-glass sticky top-0 z-50 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Top row on mobile: Logo and Logout */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-3" style={{ flexShrink: 0, marginRight: '8px' }}>
          <img src={logoIcon} alt="Elite Nova" style={{ height: '40px', width: 'auto', display: 'block', flexShrink: 0 }} />
        </div>

        {currentUser && (
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="md:hidden flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Navigation Links - horizontally scrollable on mobile & desktop */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 md:pb-0 flex-1 min-w-0 items-center px-1 hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl no-underline transition-all whitespace-nowrap text-sm ${
                isActive
                  ? 'text-white bg-[var(--gold)] font-semibold shadow-[0_0_12px_rgba(176,141,87,0.35)]'
                  : 'text-[var(--text-secondary)] hover:bg-black/5 font-medium'
              }`}
            >
              <Icon size={16} />
              {item.label}
              {item.path === '/requests' && stockAlertCount > 0 && (
                <span
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.9)' : 'var(--warning)',
                    color: isActive ? 'var(--gold)' : 'white',
                    borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                    minWidth: '18px', height: '18px', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                  }}
                >
                  {stockAlertCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Logout button for desktop */}
      {currentUser && (
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="hidden md:flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ml-4 whitespace-nowrap"
        >
          {currentUser.full_name} <LogOut size={16} />
        </button>
      )}
    </nav>
  );
};

export default Navbar;
