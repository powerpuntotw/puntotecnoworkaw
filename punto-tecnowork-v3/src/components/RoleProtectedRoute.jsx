import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AccessService } from '../services/AccessService';

/**
 * src/components/RoleProtectedRoute.jsx
 * Guarda de ruta que valida la autenticación y el rol del usuario.
 * Reutiliza la lógica de carga y validación de sesión del sistema actual.
 * 
 * @param {string[]} allowedRoles - Lista de roles permitidos (ej. ['admin', 'local'])
 */
export const RoleProtectedRoute = ({ allowedRoles }) => {
    const { user, dbUser, loading } = useAuth();

    // 1. Estado de carga: Preservar el comportamiento visual actual
    if (loading || (user && !dbUser)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // 2. No autenticado: Redirigir a landing/login
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // 3. Autenticado pero sin rol permitido: Redirigir al dashboard base
    // Usamos AccessService para centralizar la lógica de chequeo de roles
    const hasAccess = allowedRoles.some(role => AccessService.isRole(dbUser, role));
    
    if (!hasAccess) {
        // Redirigimos al dashboard propio del usuario si intenta entrar a una zona prohibida
        return <Navigate to="/dashboard" replace />;
    }

    // 4. Acceso permitido
    return <Outlet />;
};
