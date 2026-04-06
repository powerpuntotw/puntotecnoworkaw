import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, MapPin, TrendingUp, DollarSign, Activity, Gift, History, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router';

// Misma lógica que AdminLocations: online si last_active_at fue hace < 180s
const isOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    return (Date.now() - new Date(lastActiveAt).getTime()) / 1000 < 180;
};

const timeAgo = (lastActiveAt) => {
    if (!lastActiveAt) return 'sin conexión';
    const diff = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 1000);
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
    return `hace ${Math.floor(diff / 3600)}h`;
};

export const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, totalOrders: 0, totalRevenue: 0, onlineLocals: 0 });
    const [chartData, setChartData] = useState([]);
    const [locals, setLocals] = useState([]);
    // Tick cada 30s para recalcular online/offline sin refetch completo
    const [, setTick] = useState(0);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [usersRes, ordersRes, localsRes] = await Promise.all([
                databases.listDocuments(dbId, 'users', [Query.limit(1)]),
                databases.listDocuments(dbId, 'orders', [Query.limit(1000)]),
                databases.listDocuments(dbId, 'printing_locations', [Query.limit(100)])
            ]);
            const orders = ordersRes.documents;
            const locs = localsRes.documents;

            const revenue = orders
                .filter(o => o.status === 'entregado')
                .reduce((sum, o) => sum + (o.total_price || 0), 0);

            setLocals(locs);
            setStats({
                totalUsers: usersRes.total,
                totalOrders: ordersRes.total,
                totalRevenue: revenue,
                onlineLocals: locs.filter(l => isOnline(l.last_active_at)).length,
            });

            const daily = {};
            orders.slice(-50).forEach(o => {
                const date = new Date(o.$createdAt).toLocaleDateString([], { weekday: 'short' });
                daily[date] = (daily[date] || 0) + 1;
            });
            setChartData(Object.entries(daily).map(([name, orders]) => ({ name, orders })));
        } catch (error) {
            console.error("Error fetching admin dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    // Refrescar last_active_at cada 30s para mantener el estado de conexión actualizado
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'printing_locations', [Query.limit(100)]
                );
                setLocals(res.documents);
                setStats(prev => ({
                    ...prev,
                    onlineLocals: res.documents.filter(l => isOnline(l.last_active_at)).length
                }));
                setTick(t => t + 1);
            } catch { }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const KPI_CARDS = [
        { label: 'Usuarios Totales',      value: stats.totalUsers,                          icon: Users,      color: 'text-secondary',  link: '/admin/users' },
        { label: 'Órdenes Globales',      value: stats.totalOrders,                         icon: Package,    color: 'text-primary',    link: '/admin/orders' },
        { label: 'Facturado (entregado)', value: `$${stats.totalRevenue.toLocaleString('es-AR', { hour12: false })}`, icon: DollarSign, color: 'text-success',    link: '/admin/reports' },
        { label: 'Locales Conectados',    value: `${stats.onlineLocals}/${locals.length}`,  icon: Wifi,       color: 'text-secondary',  link: '/admin/locations' }
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Panel de Control</h1>
                    <p className="text-gray-400 mt-2 font-medium">Gestión centralizada de Punto Tecnowork</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <Activity size={12} className="text-success animate-pulse" /> Servidor Activo
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <Link key={idx} to={card.link} className="bg-card/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-glow hover:border-primary/40 transition group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition duration-500">
                            <card.icon size={100} />
                        </div>
                        <div className="flex justify-between items-start mb-5">
                            <div className={`p-3 rounded-2xl bg-white/5 ${card.color} border border-white/5`}>
                                <card.icon size={22} />
                            </div>
                            <TrendingUp size={14} className="text-success opacity-50" />
                        </div>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{loading ? '...' : card.value}</div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                            <TrendingUp className="text-primary" /> Actividad de Órdenes
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary animate-pulse"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En Vivo</span>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        {chartData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-600 text-sm">Sin datos de órdenes aún</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', fontSize: '12px' }} cursor={{ fill: '#ffffff03' }} />
                                    <Bar dataKey="orders" fill="url(#brandGradient)" radius={[6, 6, 0, 0]} barSize={36} />
                                    <defs>
                                        <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EB1C24" />
                                            <stop offset="100%" stopColor="#8b1116" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Panel de sucursales con estado de conexión real */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2 flex items-center gap-3">
                        <MapPin className="text-secondary" /> Sucursales
                    </h3>
                    {/* Resumen de conexión */}
                    {locals.length > 0 && (
                        <p className="text-[10px] text-gray-500 mb-5 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${stats.onlineLocals > 0 ? 'bg-success animate-pulse' : 'bg-gray-600'}`} />
                            {stats.onlineLocals > 0
                                ? `${stats.onlineLocals} de ${locals.length} conectado(s) ahora`
                                : 'Ningún local conectado ahora'}
                        </p>
                    )}
                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                        {locals.length === 0 ? (
                            <div className="text-center py-8 text-gray-600 text-sm">Sin sucursales creadas</div>
                        ) : locals.map(local => {
                            const online = isOnline(local.last_active_at);
                            const lastSeen = timeAgo(local.last_active_at);
                            return (
                                <div key={local.$id} className={`flex items-center justify-between p-4 rounded-2xl border transition ${online ? 'bg-success/5 border-success/15' : 'bg-white/5 border-white/5'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Indicador de conexión — basado en heartbeat real */}
                                        {online
                                            ? <Wifi size={14} className="text-success shrink-0" />
                                            : <WifiOff size={14} className="text-gray-600 shrink-0" />
                                        }
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white italic uppercase tracking-tight truncate max-w-[100px]">{local.name}</p>
                                            <p className={`text-[9px] font-bold uppercase ${online ? 'text-success' : 'text-gray-600'}`}>
                                                {online ? 'Conectado' : lastSeen}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Badge apertura */}
                                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${local.is_open ? 'text-success bg-success/10' : 'text-gray-500 bg-white/5'}`}>
                                        {local.is_open ? 'Abierto' : 'Cerrado'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <Link to="/admin/locations" className="mt-6 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition group">
                        Ver detalles <ArrowRight size={12} className="inline ml-1 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Link to="/admin/rewards" className="bg-gradient-to-br from-primary/10 to-black/20 border border-primary/20 rounded-[2.5rem] p-10 flex items-center justify-between group overflow-hidden relative shadow-2xl hover:border-primary/50 transition duration-700">
                    <div className="absolute -right-12 -bottom-12 text-primary opacity-5 group-hover:scale-110 transition duration-700"><Gift size={200} /></div>
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-5 border border-primary/20"><Gift size={28} /></div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Premios</h4>
                        <p className="text-gray-500 mt-2 text-sm">Gestionar catálogo de fidelización.</p>
                        <div className="mt-5 flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">Entrar <ArrowRight size={14} className="group-hover:translate-x-1 transition" /></div>
                    </div>
                </Link>
                <Link to="/admin/audit" className="bg-gradient-to-br from-secondary/10 to-black/20 border border-secondary/20 rounded-[2.5rem] p-10 flex items-center justify-between group overflow-hidden relative shadow-2xl hover:border-secondary/50 transition duration-700">
                    <div className="absolute -right-12 -bottom-12 text-secondary opacity-5 group-hover:scale-110 transition duration-700"><History size={200} /></div>
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary mb-5 border border-secondary/20"><History size={28} /></div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Auditoría</h4>
                        <p className="text-gray-500 mt-2 text-sm">Historial de acciones y seguridad.</p>
                        <div className="mt-5 flex items-center gap-2 text-secondary text-xs font-black uppercase tracking-widest">Ver Logs <ArrowRight size={14} className="group-hover:translate-x-1 transition" /></div>
                    </div>
                </Link>
            </div>
        </div>
    );
};
