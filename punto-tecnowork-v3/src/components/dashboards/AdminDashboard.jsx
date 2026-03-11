import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Package, MapPin, TrendingUp, DollarSign, Activity, Gift, Clock } from 'lucide-react';
import { Link } from 'react-router';

export const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        totalPoints: 0,
        activeLocals: 0,
        todayRevenue: 0
    });
    const [chartData, setChartData] = useState([]);
    const [locals, setLocals] = useState([]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Fetch Totals
            const [usersRes, ordersRes, localsRes] = await Promise.all([
                databases.listDocuments(dbId, 'users', [Query.limit(1)]),
                databases.listDocuments(dbId, 'orders', [Query.limit(1000)]),
                databases.listDocuments(dbId, 'printing_locations', [Query.limit(100)])
            ]);

            const orders = ordersRes.documents;
            const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            
            setStats({
                totalUsers: usersRes.total,
                totalOrders: ordersRes.total,
                totalPoints: orders.length * 10, // Placeholder calculation
                activeLocals: localsRes.documents.filter(l => l.is_open).length,
                todayRevenue: revenue
            });

            setLocals(localsRes.documents);

            // Chart data: Orders by day (last 7 days)
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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const KPI_CARDS = [
        { label: 'Usuarios Totales', value: stats.totalUsers, icon: Users, color: 'text-primary', link: '/admin/users' },
        { label: 'Órdenes Globales', value: stats.totalOrders, icon: Package, color: 'text-secondary', link: '/admin/orders' },
        { label: 'Facturación Global', value: `$${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success', link: '/admin/reports' },
        { label: 'Sucursales Online', value: stats.activeLocals, icon: MapPin, color: 'text-warning', link: '/admin/locations' }
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-hero bg-clip-text text-transparent">Panel Principal</h1>
                    <p className="text-gray-400 mt-2">Bienvenido al centro de mando de Punto Tecnowork.</p>
                </div>
                <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-gray-400">
                    <Activity size={14} className="text-success animate-pulse" /> Sistema Operativo
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <Link key={idx} to={card.link} className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-glow hover:border-primary/50 transition transform hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-white/5 ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <TrendingUp size={16} className="text-success opacity-50" />
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{card.label}</div>
                        <div className="text-3xl font-black text-white">{loading ? '...' : card.value}</div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico de Actividad */}
                <div className="lg:col-span-2 bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glow">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-white italic">Producción Semanal</h3>
                        <span className="text-xs text-primary-glow font-bold underline cursor-pointer">Ver detalle completo</span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px', fontSize: '12px' }}
                                    cursor={{ fill: '#ffffff05' }}
                                />
                                <Bar dataKey="orders" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Estado de Sucursales */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-glow overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6">Red Operativa</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {locals.map(local => (
                            <div key={local.$id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl group hover:bg-white/10 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${local.is_open ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                    <div className="truncate max-w-[120px]">
                                        <p className="text-sm font-bold text-white truncate">{local.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                                            {local.last_active_at ? new Date(local.last_active_at).toLocaleTimeString() : 'Inactivo'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary-glow">24 Ord</p>
                                    <p className="text-[9px] text-gray-600 uppercase">Actividad</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link to="/admin/locations" className="mt-6 block text-center text-xs font-bold text-gray-500 hover:text-white transition group">
                        Administrar Sucursales <ArrowRight size={12} className="inline ml-1 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </div>

            {/* Bottom Section: Recent Alerts/Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-8 flex items-center justify-between group cursor-pointer overflow-hidden relative">
                    <div className="absolute -right-10 -bottom-10 text-primary opacity-5 group-hover:scale-110 transition duration-700">
                        <Gift size={200} />
                    </div>
                    <div className="relative">
                        <h4 className="text-xl font-bold text-white">Catálogo de Premios</h4>
                        <p className="text-gray-400 mt-2 max-w-[200px]">Gestiona las recompensas y puntos de fidelidad.</p>
                        <Link to="/admin/rewards" className="mt-4 inline-flex items-center gap-2 text-primary-glow font-bold text-sm">
                            Ir al Panel <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="hidden sm:block">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-glow shadow-glow underline decoration-double">
                            <Gift size={32} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-secondary/10 to-transparent border border-secondary/20 rounded-3xl p-8 flex items-center justify-between group cursor-pointer overflow-hidden relative">
                    <div className="absolute -right-10 -bottom-10 text-secondary opacity-5 group-hover:scale-110 transition duration-700">
                        <History size={200} />
                    </div>
                    <div className="relative">
                        <h4 className="text-xl font-bold text-white">Registro de Auditoría</h4>
                        <p className="text-gray-400 mt-2 max-w-[200px]">Control total sobre los cambios del sistema.</p>
                        <Link to="/admin/audit" className="mt-4 inline-flex items-center gap-2 text-secondary font-bold text-sm">
                            Ver Logs <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="hidden sm:block">
                        <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary shadow-glow underline decoration-double">
                            <History size={32} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simplified imports if not present
import { ArrowRight, History } from 'lucide-react';
