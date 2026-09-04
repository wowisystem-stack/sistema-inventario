import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthGate from './components/AuthGate';
import LoginGate, { getCachedUser } from './components/LoginGate';
import { ModuleProvider } from './moduleContext';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Approvals from './pages/Approvals';
import UnusedAssets from './pages/UnusedAssets';
import Assignments from './pages/Assignments';
import Users from './pages/Users';
import Register from './pages/Register';
import SecurityExitPass from './pages/SecurityExitPass';
import Requests from './pages/Requests';
import Returns from './pages/Returns';
import AddAsset from './pages/AddAsset';
import QRCodes from './pages/QRCodes';
import ActivityLogs from './pages/ActivityLogs';
import ModuleSelector from './components/ModuleSelector';
import './index.css';

function AppShell() {
  const currentUser = getCachedUser();
  const isEmpleado = currentUser?.role === 'empleado';

  return (
    <div className="app-layout">
      <Navbar />
      <main className="page-container">
        {!isEmpleado && <ModuleSelector />}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/assets/new" element={<AddAsset />} />
          <Route path="/qr-codes" element={<QRCodes />} />
          <Route path="/unused" element={<UnusedAssets />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/users" element={<Users />} />
          <Route path="/logs" element={<ActivityLogs />} />
          <Route path="/security-exit/:id" element={<SecurityExitPass />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <LoginGate>
                <ModuleProvider>
                  <AppShell />
                </ModuleProvider>
              </LoginGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}

export default App;
