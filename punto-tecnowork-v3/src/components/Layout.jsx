import { Outlet, NavLink, useNavigate } from 'react-router';
import { Home, FileText, Gift, LogOut, Ticket, Users, MapPin, BarChart3, Settings, MessageSquare, Palette, History, UserCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

export const MainLayout = () => {
    const { user, dbUser, logout, isProfileComplete } = useAuth();
    const { platformName, logoMain, getLogoUrl } = useBranding();
    const navigate = useNavigate();

    const role = dbUser?.user_type || 'client';
    const profileComplete = isProfileComplete();
    const displayName = platformName || 'Punto Tecnowork';
    const logoUrl = logoMain ? getLogoUrl(logoMain) : null;

    const getNavLinks = () => {
        const links = [{ to: '/dashboard', icon: <Home size={20} />, label: 'Inicio' }];

        if (role === 'client') {
            links.push({ to: '/orders/new', icon: <FileText size={20} />, label: 'Nueva Orden' });
            links.push({ to: '/rewards', icon: <Gift size={20} />, label: 'Recompensas' });
            links.push({ to: '/history', icon: <History size={20} />, label: 'Historial' });
        } else if (role === 'local') {
            links.push({ to: '/local/orders', icon: <FileText size={20} />, label: 'Órdenes' });
            links.push({ to: '/local/customers', icon: <Users size={20} />, label: 'Clientes' });
            links.push({ to: '/local/prices', icon: <DollarSign size={20} />, label: 'Precios' });
            links.push({ to: '/local/redeems', icon: <Ticket size={20} />, label: 'Canjes' });
        } else if (role === 'admin') {
            links.push({ to: '/admin/users', icon: <Users size={20} />, label: 'Usuarios' });
            links.push({ to: '/admin/locations', icon: <MapPin size={20} />, label: 'Locales' });
            links.push({ to: '/admin/orders', icon: <FileText size={20} />, label: 'Órdenes' });
            links.push({ to: '/admin/rewards', icon: <Gift size={20} />, label: 'Premios' });
            links.push({ to: '/admin/reports', icon: <BarChart3 size={20} />, label: 'Reportes' });
            links.push({ to: '/admin/maintenance', icon: <Settings size={20} />, label: 'Mantenimiento' });
            links.push({ to: '/admin/branding', icon: <Palette size={20} />, label: 'Branding' });
            links.push({ to: '/admin/audit', icon: <History size={20} />, label: 'Auditoría' });
        }

        links.push({ to: '/profile', icon: <UserCircle size={20} />, label: 'Perfil' });
        links.push({ to: '/tickets', icon: <MessageSquare size={20} />, label: 'Soporte' });

        return links;
    };

    const ALWAYS_ENABLED = ['/profile', '/dashboard'];
    const isLinkEnabled = (to) => profileComplete || ALWAYS_ENABLED.includes(to);

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <aside className="w-20 lg:w-64 border-r border-white/5 bg-card/50 backdrop-blur-md flex flex-col justify-between py-6 transition-all">
                <div>
                    {/* Logo header */}
                    <div className="px-4 lg:px-8 mb-10 flex items-center justify-center lg:justify-start">
                        {logoUrl ? (
                            <img src={logoUrl} className="w-10 h-10 object-contain rounded-xl" alt={displayName} />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(235,28,36,0.5)] text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="hidden lg:block ml-3 font-semibold text-lg tracking-wide">
                            {displayName}
                        </span>
                    </div>

                    <nav className="flex flex-col gap-2 px-3">
                        {getNavLinks().map((link) => {
                            const enabled = isLinkEnabled(link.to);
                            if (!enabled) {
                                return (
                                    <div
                                        key={link.to}
                                        title="Completá tu perfil para acceder"
                                        className="flex items-center p-3 rounded-xl text-gray-600 cursor-not-allowed opacity-40 select-none"
                                    >
                                        <div className="flex justify-center w-full lg:w-auto lg:justify-start lg:mr-3">
                                            {link.icon}
                                        </div>
                                        <span className="hidden lg:block font-medium">{link.label}</span>
                                    </div>
                                );
                            }
                            return (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) =>
                                        `flex items-center p-3 rounded-xl transition-all ${isActive
                                            ? 'bg-primary/20 text-primary-glow shadow-[inset_0_0_12px_rgba(235,28,36,0.2)]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <div className="flex justify-center w-full lg:w-auto lg:justify-start lg:mr-3">
                                        {link.icon}
                                    </div>
                                    <span className="hidden lg:block font-medium">{link.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer sidebar */}
                <div className="px-3">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center lg:justify-start p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut size={20} className="lg:mr-3 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                        <span className="hidden lg:block font-medium">Cerrar Sesión</span>
                    </button>

                    {/* Powered by — visible en desktop, icono en mobile */}
                    <div className="mt-4 flex items-center justify-center lg:justify-start gap-2 px-3">
                        {logoUrl ? (
                            <img src={logoUrl} className="w-5 h-5 object-contain opacity-40" alt="" />
                        ) : (
                            <div className="w-5 h-5 rounded bg-gradient-hero opacity-40 flex items-center justify-center text-[8px] font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="hidden lg:block text-xs text-gray-600">
                            Powered by {displayName}
                        </span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur flex items-center justify-end px-8">
                    <div className="flex items-center gap-4 border border-white/10 px-4 py-1.5 rounded-full bg-card">
                        <span className="text-sm font-medium text-gray-300">Hola, {user?.name || 'Usuario'}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-primary-glow font-bold">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                </header>

                {/* Banner perfil incompleto */}
                {!profileComplete && (
                    <div className="mx-4 mt-4 flex items-center gap-4 bg-warning/10 border border-warning/30 rounded-2xl px-6 py-4">
                        <AlertTriangle className="text-warning shrink-0" size={22} />
                        <div className="flex-1">
                            <p className="text-warning font-bold text-sm">Completá tu perfil para usar la aplicación</p>
                            <p className="text-warning/70 text-xs mt-0.5">Necesitamos tus datos para procesar pedidos. El resto de las funciones estarán disponibles una vez que completes la información.</p>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="shrink-0 bg-warning text-black font-bold text-xs px-4 py-2 rounded-xl hover:bg-warning/80 transition"
                        >
                            Completar ahora
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
