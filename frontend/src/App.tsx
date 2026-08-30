import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthGate from './components/AuthGate';
import IdentityGate from './components/IdentityGate';
import { ModuleProvider } from './moduleContext';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Approvals from './pages/Approvals';
import UnusedAssets from './pages/UnusedAssets';
import Assignments from './pages/Assignments';
import Users from './pages/Users';
import Register from './pages/Register';
import SecurityExitPass from './pages/SecurityExitPass';
import './index.css';

function App() {
  return (
    <AuthGate>
      <IdentityGate>
        <ModuleProvider>
          <BrowserRouter>
            <div className="app-layout">
              <Navbar />
              <main className="page-container">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/approvals" element={<Approvals />} />
                  <Route path="/unused" element={<UnusedAssets />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/security-exit/:id" element={<SecurityExitPass />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ModuleProvider>
      </IdentityGate>
    </AuthGate>
  );
}

export default App;
