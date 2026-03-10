import { Outlet, NavLink } from 'react-router';
import { Home, FileText, Gift, LogOut, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MainLayout = () => {
    const { user, dbUser, logout } = useAuth();

    const role = dbUser?.user_type || 'client';

    // Different navigation links based on user role
    const getNavLinks = () => {
        const links = [
            { to: '/dashboard', icon: <Home size={20} />, label: 'Inicio' },
        ];

        if (role === 'client') {
            links.push({ to: '/orders/new', icon: <FileText size={20} />, label: 'Nueva Orden' });
            links.push({ to: '/rewards', icon: <Gift size={20} />, label: 'Recompensas' });
        } else if (role === 'local') {
            links.push({ to: '/local/orders', icon: <FileText size={20} />, label: 'Panel de Órdenes' });
        } else if (role === 'admin') {
            links.push({ to: '/admin/overview', icon: <FileText size={20} />, label: 'Reportes Globales' });
            links.push({ to: '/admin/locations', icon: <Home size={20} />, label: 'Gestión Locales' });
        }

        links.push({ to: '/tickets', icon: <Ticket size={20} />, label: 'Soporte' });

        return links;
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar minimalista con Glassmorphism */}
            <aside className="w-20 lg:w-64 border-r border-white/5 bg-card/50 backdrop-blur-md flex flex-col justify-between py-6 transition-all">
                <div>
                    <div className="px-4 lg:px-8 mb-10 flex items-center justify-center lg:justify-start">
                        {/* Aquí luego irá el Main Logo que traeremos de los settings */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            P
                        </div>
                        <span className="hidden lg:block ml-3 font-semibold text-lg tracking-wide">Tecnowork</span>
                    </div>

                    <nav className="flex flex-col gap-2 px-3">
                        {getNavLinks().map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `flex items-center p-3 rounded-xl transition-all ${isActive
                                        ? 'bg-primary/20 text-primary-glow shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                <div className="flex justify-center w-full lg:w-auto lg:justify-start lg:mr-3">
                                    {link.icon}
                                </div>
                                <span className="hidden lg:block font-medium">{link.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="px-3">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center lg:justify-start p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut size={20} className="lg:mr-3 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                        <span className="hidden lg:block font-medium">Cerrar Sesión</span>
                    </button>
                    <div className="mt-6 px-4 hidden lg:block text-xs text-gray-500">
                        Powered by Punto Tecnowork v3
                    </div>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Superior */}
                <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur flex items-center justify-end px-8">
                    <div className="flex items-center gap-4 border border-white/10 px-4 py-1.5 rounded-full bg-card">
                        <span className="text-sm font-medium text-gray-300">Hola, {user?.name || 'Usuario'}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-primary-glow font-bold">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                </header>

                {/* Área Scrollable del Outlet */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
