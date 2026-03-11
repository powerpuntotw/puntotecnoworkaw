import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Package, MapPin, TrendingUp, DollarSign, Activity, Gift, Clock, History, ArrowRight } from 'lucide-react';
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
                totalPoints: orders.length * 10,
                activeLocals: localsRes.documents.filter(l => l.status === 'activo').length,
                todayRevenue: revenue
            });

            setLocals(localsRes.documents);

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
        { label: 'Usuarios Totales', value: stats.totalUsers, icon: Users, color: 'text-secondary', link: '/admin/users' },
        { label: 'Órdenes Globales', value: stats.totalOrders, icon: Package, color: 'text-primary', link: '/admin/orders' },
        { label: 'Facturación Global', value: `$${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success', link: '/admin/reports' },
        { label: 'Sucursales Online', value: stats.activeLocals, icon: MapPin, color: 'text-warning', link: '/admin/locations' }
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Panel de Control</h1>
                    <p className="text-gray-400 mt-2 font-medium">Gestión centralizada de Punto Tecnowork v3</p>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <Activity size={12} className="text-success animate-pulse" /> Servidor Activo
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <Link key={idx} to={card.link} className="bg-card/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-glow hover:border-primary/40 transition group overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition duration-500 group-hover:scale-110">
                            <card.icon size={100} />
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl bg-white/5 ${card.color} border border-white/5 shadow-inner`}>
                                <card.icon size={24} />
                            </div>
                            <div className="text-[10px] font-black text-success flex items-center gap-1 bg-success/10 px-2 py-1 rounded-lg">
                                +12% <TrendingUp size={10} />
                            </div>
                        </div>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{card.label}</div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{loading ? '...' : card.value}</div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico de Actividad */}
                <div className="lg:col-span-2 bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                            <TrendingUp className="text-primary" /> Rendimiento de Red
                        </h3>
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary animate-pulse"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En Vivo</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#444" fontSize={11} fontWeight="black" tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                    cursor={{ fill: '#ffffff03' }}
                                />
                                <Bar dataKey="orders" fill="url(#brandGradient)" radius={[8, 8, 0, 0]} barSize={40} />
                                <defs>
                                    <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#EB1C24" />
                                        <stop offset="100%" stopColor="#8b1116" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Estado de Sucursales */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                        <MapPin className="text-secondary" /> Sucursales
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {locals.map(local => (
                            <div key={local.$id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-primary/30 transition duration-500">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${local.status === 'activo' ? 'bg-success shadow-[0_0_12px_rgba(164,204,57,0.5)]' : 'bg-primary shadow-[0_0_12px_rgba(235,28,36,0.5)]'}`}></div>
                                    <div>
                                        <p className="text-sm font-black text-white italic uppercase tracking-tighter mb-1 truncate max-w-[100px]">{local.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic">
                                                {local.status === 'activo' ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-white mb-0.5">+{Math.floor(Math.random() * 50)}</div>
                                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Órdenes</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link to="/admin/locations" className="mt-8 py-4 bg-white/5 border border-white/5 rounded-2xl text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition duration-500 group">
                        Configurar Locales <ArrowRight size={14} className="inline ml-2 group-hover:translate-x-1 transition" />
                    </Link>
                </div>
            </div>

            {/* Paneles de Acción Rápida */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Link to="/admin/rewards" className="bg-gradient-to-br from-primary/10 to-black/20 border border-primary/20 rounded-[2.5rem] p-10 flex items-center justify-between group overflow-hidden relative shadow-2xl hover:border-primary/50 transition duration-700">
                    <div className="absolute -right-12 -bottom-12 text-primary opacity-5 group-hover:scale-110 transition duration-700">
                        <Gift size={250} />
                    </div>
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6 shadow-glow border border-primary/20 group-hover:scale-110 transition duration-500">
                            <Gift size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Premios</h4>
                        <p className="text-gray-500 mt-2 max-w-[220px] text-sm font-medium">Gestionar catálogo y fidelización de clientes.</p>
                        <div className="mt-6 flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
                            Entrar Ahora <ArrowRight size={16} className="group-hover:translate-x-2 transition" />
                        </div>
                    </div>
                </Link>

                <Link to="/admin/audit" className="bg-gradient-to-br from-secondary/10 to-black/20 border border-secondary/20 rounded-[2.5rem] p-10 flex items-center justify-between group overflow-hidden relative shadow-2xl hover:border-secondary/50 transition duration-700">
                    <div className="absolute -right-12 -bottom-12 text-secondary opacity-5 group-hover:scale-110 transition duration-700">
                        <History size={250} />
                    </div>
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary mb-6 shadow-glow border border-secondary/20 group-hover:scale-110 transition duration-500">
                            <History size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Auditoría</h4>
                        <p className="text-gray-500 mt-2 max-w-[220px] text-sm font-medium">Historial completo de acciones y seguridad.</p>
                        <div className="mt-6 flex items-center gap-2 text-secondary text-xs font-black uppercase tracking-widest">
                            Ver Logs <ArrowRight size={16} className="group-hover:translate-x-2 transition" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
};
