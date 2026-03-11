import { useAuth } from '../context/AuthContext';
import { ClientDashboard } from './dashboards/ClientDashboard';
import { LocalDashboard } from './dashboards/LocalDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';

export const DashboardIndex = () => {
    const { user, dbUser, loading } = useAuth();

    if (loading) {
        return <div className="animate-pulse flex space-x-4">Cargando perfil...</div>;
    }

    const role = dbUser?.user_type || 'client';

    switch (role) {
        case 'local':
            return <LocalDashboard user={user} dbUser={dbUser} locationId={dbUser?.location_id} />;
        case 'admin':
            return <AdminDashboard user={user} dbUser={dbUser} />;
        case 'client':
        default:
            return <ClientDashboard user={user} dbUser={dbUser} />;
    }
};
