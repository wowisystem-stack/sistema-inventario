import { Link, useLocation } from 'react-router-dom';
import { Package, QrCode, ClipboardCheck, AlertTriangle, UserCheck, LogOut, Users as UsersIcon, Inbox, PlusCircle, Grid3x3, ScrollText, PackageCheck } from 'lucide-react';
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
    { path: '/assets/new', label: 'Nuevo Activo', icon: PlusCircle, show: isEncargadoOrAdmin },
    { path: '/qr-codes', label: 'Códigos QR', icon: Grid3x3, show: isEncargadoOrAdmin },
    { path: '/scanner', label: 'Control Salida', icon: QrCode, show: !isEmpleado },
    { path: '/returns', label: 'Devoluciones', icon: PackageCheck, show: !isEmpleado },
    { path: '/unused', label: 'Sin Uso', icon: AlertTriangle, show: isEncargadoOrAdmin },
    { path: '/assignments', label: 'Asignaciones', icon: UserCheck, show: isEncargadoOrAdmin },
    { path: '/users', label: 'Usuarios', icon: UsersIcon, show: isAdmin },
    { path: '/logs', label: 'Logs', icon: ScrollText, show: isAdmin },
  ].filter(item => item.show);

  return (
    <nav className="liquid-glass sticky top-0 z-50 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Top row on mobile: Logo and Logout */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center shadow-[0_4px_14px_rgba(37,99,235,0.4)]">
            <Package size={24} color="white" />
          </div>
          <h1 className="text-xl font-bold m-0 tracking-tight text-[var(--text-primary)]">
            Elite Nutrition
          </h1>
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

      {/* Navigation Links - horizontally scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl no-underline transition-all whitespace-nowrap text-sm ${
                isActive
                  ? 'text-white bg-blue-600 font-semibold shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                  : 'text-[var(--text-secondary)] hover:bg-black/5 font-medium'
              }`}
            >
              <Icon size={16} />
              {item.label}
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
