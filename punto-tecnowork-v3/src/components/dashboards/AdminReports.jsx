import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, Download, Loader2, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';

export const AdminReports = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        avgTicket: 0,
        activeLocals: 0
    });
    const [dailyData, setDailyData] = useState([]);
    const [localData, setLocalData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Fetch Orders
            const ordersRes = await databases.listDocuments(dbId, 'orders', [Query.limit(1000)]);
            const orders = ordersRes.documents;

            // Calculate totals
            const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const activeLocals = new Set(orders.map(o => o.location_id)).size;

            setStats({
                totalOrders: orders.length,
                totalRevenue: revenue,
                avgTicket: orders.length > 0 ? (revenue / orders.length) : 0,
                activeLocals: activeLocals
            });

            // Process daily data (simplified for now)
            const daily = {};
            orders.forEach(o => {
                const date = new Date(o.$createdAt).toLocaleDateString();
                if (!daily[date]) daily[date] = { date, orders: 0, revenue: 0 };
                daily[date].orders += 1;
                daily[date].revenue += o.total_amount || 0;
            });
            setDailyData(Object.values(daily).slice(-7));

            // Process local data
            const locals = {};
            orders.forEach(o => {
                const name = o.location_name || 'Desconocido';
                if (!locals[name]) locals[name] = { name, revenue: 0 };
                locals[name].revenue += o.total_amount || 0;
            });
            setLocalData(Object.values(locals));

            // Process status data
            const statusMap = {};
            orders.forEach(o => {
                const s = o.status || 'pendiente';
                if (!statusMap[s]) statusMap[s] = { name: s, value: 0 };
                statusMap[s].value += 1;
            });
            setStatusData(Object.values(statusMap));

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const COLORS = ['#6366f1', '#a855f7', '#fbbf24', '#22c55e', '#f87171'];

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Reportes e Inteligencia</h1>
                    <p className="text-gray-400 mt-2">Analítica avanzada del rendimiento del sistema.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-gray-300 hover:text-white transition">
                        <Calendar size={18} /> Rango de Fechas
                    </button>
                    <button className="flex items-center gap-2 bg-primary/20 text-primary-glow px-4 py-2 rounded-xl font-bold hover:bg-primary/30 transition">
                        <Download size={18} /> CSV
                    </button>
                </div>
            </div>

            {/* KPI Grill */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Volumen Órdenes', value: stats.totalOrders, icon: Package, color: 'text-primary' },
                    { label: 'Facturación Total', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
                    { label: 'Ticket Promedio', value: `$${stats.avgTicket.toFixed(0)}`, icon: TrendingUp, color: 'text-warning' },
                    { label: 'Locales Activos', value: stats.activeLocals, icon: MapPin, color: 'text-secondary' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 text-sm font-medium">{kpi.label}</span>
                            <kpi.icon size={20} className={kpi.color} />
                        </div>
                        <div className="text-2xl font-black text-white">{loading ? '...' : kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tendencia Temporal */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-6">Tendencia de Ingresos</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                                itemStyle={{ color: '#6366f1' }}
                            />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Distribución por Estado */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6">Estado de Órdenes</h3>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 ml-4">
                            {statusData.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span className="text-gray-400 capitalize">{s.name}: {s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Comparativa por Sucursal */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow h-[400px] lg:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-6">Facturación por Sucursal</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={localData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                            <Bar dataKey="revenue" fill="#a855f7" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
