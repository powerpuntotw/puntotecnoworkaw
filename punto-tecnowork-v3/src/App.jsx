import { Routes, Route } from 'react-router';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoutes';
import { MainLayout } from './components/Layout';
import { DashboardIndex } from './components/DashboardIndex';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { AdminLocations } from './components/dashboards/AdminLocations';
import { AdminUsers } from './components/dashboards/AdminUsers';
import { Landing } from './pages/Landing';
import { NewOrderFlow } from './pages/NewOrderFlow';
import { RewardsCatalog } from './pages/RewardsCatalog';
import { TicketsSystem } from './pages/TicketsSystem';
import { AuthCallback } from './components/AuthCallback';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Rutas Públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Landing />} />
          {/* Callback handling */}
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Route>

        {/* Rutas Protegidas (Requieren Sesión) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Index redirige/renderiza según el ROL (Local, Admin, Client) */}
            <Route path="/dashboard" element={<DashboardIndex />} />

            {/* Vistas Específicas de Cliente */}
            <Route path="/orders/new" element={<NewOrderFlow />} />
            <Route path="/rewards" element={<RewardsCatalog />} />

            {/* Administrador */}
            <Route path="/admin/overview" element={<AdminDashboard />} />
            <Route path="/admin/locations" element={<AdminLocations />} />
            <Route path="/admin/users" element={<AdminUsers />} />

            {/* Sistema Unificado de Soport/Chat */}
            <Route path="/tickets" element={<TicketsSystem />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
