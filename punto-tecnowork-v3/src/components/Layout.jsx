import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Home, FileText, Gift, LogOut, Ticket, Users, MapPin, BarChart3, Settings, MessageSquare, Palette, History, UserCircle, DollarSign, AlertTriangle, Sun, Moon, Menu, X, Bell, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { databases, client, withRetry, ConnectionMonitor } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Link } from 'react-router';

function useAppwriteRealtime(channels, handler, deps = []) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    const unsubsRef = useRef([]);
    const retryTimerRef = useRef(null);

    const subscribe = useCallback(() => {
        unsubsRef.current.forEach(fn => { try { fn(); } catch { } });
        unsubsRef.current = [];
        if (!ConnectionMonitor.isOnline) return;
        unsubsRef.current = channels.map(ch =>
            client.subscribe(ch, (response) => handlerRef.current(response))
        );
    }, [channels.join('|')]);

    useEffect(() => {
        subscribe();
        const unsub = ConnectionMonitor.subscribe((isOnline) => {
            clearTimeout(retryTimerRef.current);
            if (isOnline) retryTimerRef.current = setTimeout(subscribe, 2000);
        });
        const onVisible = () => {
            if (!document.hidden && ConnectionMonitor.isOnline) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = setTimeout(subscribe, 1000);
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            unsubsRef.current.forEach(fn => { try { fn(); } catch { } });
            unsub();
            document.removeEventListener('visibilitychange', onVisible);
            clearTimeout(retryTimerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscribe, ...deps]);
}

const playAlert = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch { }
};

export const MainLayout = () => {
    const { user, dbUser, logout, isProfileComplete } = useAuth();
    const { platformName, logoMain, logoLight, logoDark, getLogoUrl } = useBranding();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [isOffline, setIsOffline] = useState(!ConnectionMonitor.isOnline);
    useEffect(() => {
        const unsub = ConnectionMonitor.subscribe((online) => setIsOffline(!online));
        return unsub;
    }, []);

    const [unreadCount, setUnreadCount] = useState(0);
    const [showSupportAlert, setShowSupportAlert] = useState(false);
    const [latestTicketSubject, setLatestTicketSubject] = useState('');
    const isOnTicketsPage = location.pathname === '/tickets';
    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (!dbUser) return;
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const isAdmin = dbUser.user_type === 'admin';
        const loadInitial = async () => {
            try {
                const queries = [Query.equal('status', 'open'), Query.orderDesc('$createdAt'), Query.limit(20)];
                if (!isAdmin) queries.push(Query.equal('client_id', user.$id));
                const res = await withRetry(() => databases.listDocuments(dbId, 'tickets', queries));
                setUnreadCount(res.documents.length);
                if (res.documents.length > 0) setLatestTicketSubject(res.documents[0].subject);
                initialLoadDone.current = true;
            } catch { }
        };
        loadInitial();
    }, [dbUser?.user_type]);

    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    useAppwriteRealtime(
        dbUser ? [`databases.${dbId}.collections.tickets.documents`] : [],
        (response) => {
            if (!initialLoadDone.current) return;
            if (!response.events.some(e => e.includes('.create'))) return;
            const t = response.payload;
            const isAdmin = dbUser?.user_type === 'admin';
            if (!isAdmin && t.client_id !== user?.$id) return;
            setUnreadCount(prev => prev + 1);
            setLatestTicketSubject(t.subject);
            if (!isOnTicketsPage) { setShowSupportAlert(true); playAlert(); }
        },
        [!!dbUser]
    );

    useAppwriteRealtime(
        dbUser ? [`databases.${dbId}.collections.messages.documents`] : [],
        (response) => {
            if (!initialLoadDone.current) return;
            if (!response.events.some(e => e.includes('.create'))) return;
            const msg = response.payload;
            if (msg.sender_id === user?.$id) return;
            if (!isOnTicketsPage) {
                setShowSupportAlert(true);
                setLatestTicketSubject(prev => prev || 'Nuevo mensaje de soporte');
                playAlert();
            }
        },
        [!!dbUser]
    );

    useEffect(() => {
        if (isOnTicketsPage) setShowSupportAlert(false);
    }, [isOnTicketsPage]);

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
            // Vista propia del operador: catálogo de referencia + canjes pendientes
            links.push({ to: '/local/rewards', icon: <Gift size={20} />, label: 'Premios' });
        } else if (role === 'admin') {
            links.push({ to: '/admin/users', icon: <Users size={20} />, label: 'Usuarios' });
            links.push({ to: '/admin/locations', icon: <MapPin size={20} />, label: 'Locales' });
            links.push({ to: '/admin/orders', icon: <FileText size={20} />, label: 'Órdenes' });
            links.push({ to: '/admin/rewards', icon: <Gift size={20} />, label: 'Premios' });
            // Admin puede ver el catálogo tal como lo ven los clientes
            links.push({ to: '/rewards', icon: <Gift size={20} />, label: 'Ver Catálogo' });
            links.push({ to: '/admin/reports', icon: <BarChart3 size={20} />, label: 'Reportes' });
            links.push({ to: '/admin/maintenance', icon: <Settings size={20} />, label: 'Mantenimiento' });
            links.push({ to: '/admin/branding', icon: <Palette size={20} />, label: 'Branding' });
            links.push({ to: '/admin/audit', icon: <History size={20} />, label: 'Auditoría' });
        }
        links.push({ to: '/profile', icon: <UserCircle size={20} />, label: 'Perfil' });
        links.push({
            to: '/tickets',
            icon: (
                <span className="relative inline-flex">
                    <MessageSquare size={20} />
                    {unreadCount > 0 && !isOnTicketsPage && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </span>
            ),
            label: 'Soporte'
        });
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

            {/* ====== SIDEBAR ====== */}
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
                        {unreadCount > 0 && !isOnTicketsPage && (
                            <Link to="/tickets"
                                className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary animate-pulse hover:bg-primary/20 transition">
                                <Bell size={16} />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            </Link>
                        )}
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

                {isOffline && (
                    <div className="mx-3 sm:mx-4 mt-3 flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
                        <WifiOff size={16} className="text-gray-400 shrink-0 animate-pulse" />
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-300 font-black text-sm uppercase tracking-tight">Sin conexión a internet</p>
                            <p className="text-gray-500 text-xs">Los datos mostrados pueden no ser actuales. Reconectando...</p>
                        </div>
                        <Wifi size={14} className="text-gray-600 shrink-0" />
                    </div>
                )}

                {showSupportAlert && !isOnTicketsPage && (
                    <div className="mx-3 sm:mx-4 mt-3 flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                            <MessageSquare size={16} className="text-primary animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-primary font-black text-sm uppercase tracking-tight">Nuevo mensaje de soporte</p>
                            {latestTicketSubject && (
                                <p className="text-primary/70 text-xs truncate">{latestTicketSubject}</p>
                            )}
                        </div>
                        <Link to="/tickets" onClick={() => setShowSupportAlert(false)}
                            className="shrink-0 bg-primary text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-primary-glow transition whitespace-nowrap shadow-glow">
                            Ver ahora
                        </Link>
                        <button onClick={() => setShowSupportAlert(false)}
                            className="shrink-0 p-1.5 text-primary/50 hover:text-primary transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

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

            {/* ====== BOTTOM NAV mobile ====== */}
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
