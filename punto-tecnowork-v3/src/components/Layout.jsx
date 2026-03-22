import { Outlet, NavLink, useNavigate } from 'react-router';
import { Home, FileText, Gift, LogOut, Ticket, Users, MapPin, BarChart3, Settings, MessageSquare, Palette, History, UserCircle, DollarSign, AlertTriangle, Sun, Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';

export const MainLayout = () => {
    const { user, dbUser, logout, isProfileComplete } = useAuth();
    const { platformName, logoMain, logoLight, logoDark, getLogoUrl } = useBranding();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const role = dbUser?.user_type || 'client';
    const profileComplete = isProfileComplete();
    const displayName = platformName || 'Punto Tecnowork';
    const logoUrl = logoMain ? getLogoUrl(logoMain) : null;
    const footerLogo1Url = logoLight ? getLogoUrl(logoLight) : null;
    const footerLogo2Url = logoDark ? getLogoUrl(logoDark) : null;

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
    const allLinks = getNavLinks();
    const bottomLinks = [...allLinks.slice(0, 4), allLinks.find(l => l.to === '/profile')].filter(Boolean);

    const NavItem = ({ link, onClick }) => {
        const enabled = isLinkEnabled(link.to);
        if (!enabled) return (
            <div title="Completá tu perfil para acceder"
                className="flex items-center gap-3 p-3 rounded-xl text-gray-600 cursor-not-allowed opacity-40 select-none">
                {link.icon}
                <span className="font-medium">{link.label}</span>
            </div>
        );
        return (
            <NavLink to={link.to} onClick={onClick}
                className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-xl transition-all ${isActive
                        ? 'bg-primary/20 text-primary-glow'
                        : 'text-gray-400 hover:text-foreground hover:bg-white/5'
                    }`
                }>
                {link.icon}
                <span className="font-medium">{link.label}</span>
            </NavLink>
        );
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">

            {/* ====== SIDEBAR — solo visible en lg+ ====== */}
            <aside className="hidden lg:flex w-64 border-r border-white/5 bg-card/50 backdrop-blur-md flex-col py-6 transition-all shrink-0">
                <div className="px-8 mb-6 flex items-center shrink-0">
                    {logoUrl ? (
                        <img src={logoUrl} className="w-10 h-10 object-contain rounded-xl" alt={displayName} />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center font-bold text-xl text-white">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="ml-3 font-semibold text-lg tracking-wide">{displayName}</span>
                </div>
                {/* nav con scroll — fix para que Cerrar Sesión siempre sea visible */}
                <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-0.5">
                    {allLinks.map(link => <NavItem key={link.to} link={link} />)}
                </nav>
                <div className="px-3 pt-4 border-t border-white/5 shrink-0">
                    <button onClick={logout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                    <div className="mt-3 px-2 flex items-center gap-2">
                        <span className="text-xs text-gray-600 mr-1">Powered by</span>
                        {footerLogo1Url && <img src={footerLogo1Url} alt="" className="h-5 w-auto object-contain opacity-50 hover:opacity-100 transition" />}
                        {footerLogo2Url && <img src={footerLogo2Url} alt="" className="h-5 w-auto object-contain opacity-50 hover:opacity-100 transition" />}
                        {!footerLogo1Url && !footerLogo2Url && <span className="text-xs text-gray-600">{displayName}</span>}
                    </div>
                </div>
            </aside>

            {/* ====== MAIN ====== */}
            <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                <header className="h-14 sm:h-16 border-b border-white/5 bg-background/80 backdrop-blur flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0">
                    <button onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400">
                        <Menu size={18} />
                    </button>
                    <div className="lg:hidden flex items-center gap-2">
                        {logoUrl ? (
                            <img src={logoUrl} className="w-7 h-7 object-contain rounded-lg" alt="" />
                        ) : (
                            <div className="w-7 h-7 rounded-lg bg-gradient-hero flex items-center justify-center text-xs font-bold text-white">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <span className="font-semibold text-sm">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                        <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition text-gray-400 hover:text-primary">
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <div className="flex items-center gap-2 sm:gap-3 border border-white/10 px-3 py-1.5 rounded-full bg-card">
                            <span className="text-xs sm:text-sm font-medium text-gray-300 hidden xs:block">
                                Hola, {user?.name?.split(' ')[0] || 'Usuario'}
                            </span>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-primary-glow font-bold text-sm">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {!profileComplete && (
                    <div className="mx-3 sm:mx-4 mt-3 flex items-start sm:items-center gap-3 bg-warning/10 border border-warning/30 rounded-2xl px-4 sm:px-6 py-3 sm:py-4">
                        <AlertTriangle className="text-warning shrink-0 mt-0.5 sm:mt-0" size={20} />
                        <div className="flex-1 min-w-0">
                            <p className="text-warning font-bold text-sm">Completá tu perfil para usar la aplicación</p>
                            <p className="text-warning/70 text-xs mt-0.5 hidden sm:block">Necesitamos tus datos para procesar pedidos.</p>
                        </div>
                        <button onClick={() => navigate('/profile')}
                            className="shrink-0 bg-warning text-black font-bold text-xs px-3 sm:px-4 py-2 rounded-xl hover:bg-warning/80 transition whitespace-nowrap">
                            Completar
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 pb-20 lg:pb-8">
                    <Outlet />
                </div>
            </main>

            {/* ====== DRAWER MOBILE ====== */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative w-72 max-w-[85vw] bg-background border-r border-white/10 flex flex-col h-full z-10 shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                {logoUrl ? (
                                    <img src={logoUrl} className="w-8 h-8 object-contain rounded-lg" alt="" />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center font-bold text-sm text-white">
                                        {displayName.charAt(0)}
                                    </div>
                                )}
                                <span className="font-semibold">{displayName}</span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                            {allLinks.map(link => (
                                <NavItem key={link.to} link={link} onClick={() => setMobileMenuOpen(false)} />
                            ))}
                        </nav>
                        <div className="p-3 border-t border-white/5 space-y-3 shrink-0">
                            <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition">
                                <LogOut size={20} />
                                <span className="font-medium">Cerrar Sesión</span>
                            </button>
                            <div className="flex items-center gap-2 px-3">
                                <span className="text-xs text-gray-600">Powered by</span>
                                {footerLogo1Url && <img src={footerLogo1Url} alt="" className="h-4 w-auto object-contain opacity-60" />}
                                {footerLogo2Url && <img src={footerLogo2Url} alt="" className="h-4 w-auto object-contain opacity-60" />}
                                {!footerLogo1Url && !footerLogo2Url && <span className="text-xs text-gray-600">{displayName}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== BOTTOM NAV — solo mobile ====== */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 py-2">
                {bottomLinks.map(link => {
                    const enabled = isLinkEnabled(link.to);
                    if (!enabled) return (
                        <div key={link.to} className="flex flex-col items-center gap-1 px-3 py-1 opacity-30 cursor-not-allowed">
                            {link.icon}
                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">{link.label}</span>
                        </div>
                    );
                    return (
                        <NavLink key={link.to} to={link.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive
                                    ? 'text-primary bg-primary/10'
                                    : 'text-gray-500 hover:text-foreground'
                                }`
                            }>
                            {link.icon}
                            <span className="text-[9px] font-bold uppercase tracking-wide">{link.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};
