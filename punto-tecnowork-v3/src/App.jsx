import { Routes, Route } from 'react-router';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoutes';
import { MainLayout } from './components/Layout';
import { DashboardIndex } from './components/DashboardIndex';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { AdminLocations } from './components/dashboards/AdminLocations';
import { AdminUsers } from './components/dashboards/AdminUsers';
import { AdminOrders } from './components/dashboards/AdminOrders';
import { AdminRewards } from './components/dashboards/AdminRewards';
import { AdminMaintenance } from './components/dashboards/AdminMaintenance';
import { AdminBranding } from './components/dashboards/AdminBranding';
import { AdminReports } from './components/dashboards/AdminReports';
import { AdminAudit } from './components/dashboards/AdminAudit';
import { LocalDashboard } from './components/dashboards/LocalDashboard';
import { LocalOrders } from './components/dashboards/LocalOrders';
import { LocalCustomers } from './components/dashboards/LocalCustomers';
import { LocalPrices } from './components/dashboards/LocalPrices';
import { LocalRedeems } from './components/dashboards/LocalRedeems';
import { ClientHistory } from './components/dashboards/ClientHistory';
import { UserProfile } from './components/dashboards/UserProfile';
import { Landing } from './pages/Landing';
import { NewOrderFlow } from './pages/NewOrderFlow';
import { RewardsCatalog } from './pages/RewardsCatalog';
import { TicketsSystem } from './pages/TicketsSystem';
import { CompleteProfile } from './pages/CompleteProfile';
import { Toaster } from 'react-hot-toast';

function App() {
    const { dbUser } = useAuth();
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
                    <Route path="/complete-profile" element={<CompleteProfile />} />
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
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/rewards" element={<AdminRewards />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/maintenance" element={<AdminMaintenance />} />
            <Route path="/admin/branding" element={<AdminBranding />} />
            <Route path="/admin/audit" element={<AdminAudit />} />

            {/* Local */}
            <Route path="/local/overview" element={<LocalDashboard locationId={dbUser?.location_id} />} />
            <Route path="/local/orders" element={<LocalOrders locationId={dbUser?.location_id} />} />
            <Route path="/local/customers" element={<LocalCustomers locationId={dbUser?.location_id} />} />
            <Route path="/local/prices" element={<LocalPrices locationId={dbUser?.location_id} />} />
            <Route path="/local/redeems" element={<LocalRedeems locationId={dbUser?.location_id} />} />

            {/* Cliente / Común */}
            <Route path="/history" element={<ClientHistory />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/tickets" element={<TicketsSystem />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
