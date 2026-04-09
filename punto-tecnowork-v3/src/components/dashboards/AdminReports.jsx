import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, DollarSign, Package, MapPin } from 'lucide-react';

export const AdminReports = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, avgTicket: 0, activeLocals: 0 });
    const [dailyData, setDailyData] = useState([]);
    const [localData, setLocalData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const ordersRes = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders', [Query.limit(1000)]
            );
            const orders = ordersRes.documents;

            // Solo las entregadas cuentan como facturación real
            const delivered = orders.filter(o => o.status === 'entregado');
            const revenue = delivered.reduce((sum, o) => sum + (o.total_price || 0), 0);
            const avgTicket = delivered.length > 0 ? revenue / delivered.length : 0;

            setStats({
                totalOrders: orders.length,
                totalRevenue: revenue,
                avgTicket,
                activeLocals: new Set(orders.map(o => o.location_id).filter(Boolean)).size
            });

            // Gráfico diario: últimos 7 días ordenados cronológicamente
            const daily = {};
            delivered.forEach(o => {
                const d = new Date(o.$createdAt).toLocaleDateString('es-AR');
                const ts = new Date(o.$createdAt).setHours(0,0,0,0); // para ordenar
                if (!daily[d]) daily[d] = { date: d, orders: 0, revenue: 0, _ts: ts };
                daily[d].orders++;
                daily[d].revenue += o.total_price || 0;
            });
            const sortedDaily = Object.values(daily)
                .sort((a, b) => a._ts - b._ts)  // cronológico ascendente
                .slice(-7)
                .map(({ _ts, ...rest }) => rest); // quitar _ts antes de setear
            setDailyData(sortedDaily);

            // Facturación por sucursal: solo entregadas
            const locals = {};
            delivered.forEach(o => {
                const n = o.location_name || 'Sin sucursal';
                if (!locals[n]) locals[n] = { name: n, revenue: 0 };
                locals[n].revenue += o.total_price || 0;
            });
            setLocalData(Object.values(locals));

            // Estado de TODAS las órdenes (para el pie chart)
            const sm = {};
            orders.forEach(o => {
                const s = o.status || 'pendiente';
                if (!sm[s]) sm[s] = { name: s, value: 0 };
                sm[s].value++;
            });
            setStatusData(Object.values(sm));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAnalytics(); }, []);
    const COLORS = ['#EB1C24', '#0093D8', '#FFC905', '#A4CC39', '#9CA3AF'];
    const tt = { backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Reportes e Inteligencia</h1>
                    <p className="text-gray-400 mt-2">Facturación basada en órdenes <span className="text-success font-semibold">entregadas</span>.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-gray-300 text-sm"><Calendar size={16}/> Fechas</button>
                    <button className="flex items-center gap-2 bg-primary/20 text-primary-glow px-3 py-2 rounded-xl font-bold text-sm"><Download size={16}/> CSV</button>
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Órdenes Totales', value: stats.totalOrders,                       icon: Package,    color: 'text-primary'    },
                    { label: 'Facturado',        value: `$${stats.totalRevenue.toLocaleString('es-AR', { hour12: false })}`, icon: DollarSign, color: 'text-success', sub: 'solo entregadas' },
                    { label: 'Ticket Promedio',  value: `$${stats.avgTicket.toFixed(0)}`,          icon: TrendingUp, color: 'text-yellow-400', sub: 'entregadas' },
                    { label: 'Sucursales',       value: stats.activeLocals,                       icon: MapPin,     color: 'text-secondary'  },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-card/50 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-glow">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-500 text-xs sm:text-sm">{kpi.label}</span>
                            <kpi.icon size={16} className={kpi.color}/>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white">{loading ? '...' : kpi.value}</div>
                        {kpi.sub && <p className="text-[9px] text-gray-600 mt-1 uppercase tracking-widest">{kpi.sub}</p>}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card/50 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-glow">
                    <h3 className="text-base font-bold text-white mb-1">Ingresos por Día</h3>
                    <p className="text-[10px] text-gray-600 mb-4 uppercase tracking-widest">Solo órdenes entregadas</p>
                    <div className="h-56 sm:h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false}/><XAxis dataKey="date" stroke="#666" fontSize={9} tickLine={false} axisLine={false}/><YAxis stroke="#666" fontSize={9} tickLine={false} axisLine={false}/><Tooltip contentStyle={tt}/><Line type="monotone" dataKey="revenue" stroke="#A4CC39" strokeWidth={2} dot={{ r: 3, fill: '#A4CC39' }}/></LineChart></ResponsiveContainer></div>
                </div>
                <div className="bg-card/50 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-glow">
                    <h3 className="text-base font-bold text-white mb-4">Estado de Órdenes</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="h-44 w-full sm:w-1/2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px' }}/></PieChart></ResponsiveContainer></div>
                        <div className="space-y-2 w-full sm:w-1/2">{statusData.map((s, idx) => (<div key={idx} className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}/><span className="text-gray-400 capitalize">{s.name}: <strong className="text-white">{s.value}</strong></span></div>))}</div>
                    </div>
                </div>
                <div className="bg-card/50 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-glow lg:col-span-2">
                    <h3 className="text-base font-bold text-white mb-1">Facturación por Sucursal</h3>
                    <p className="text-[10px] text-gray-600 mb-4 uppercase tracking-widest">Solo órdenes entregadas</p>
                    <div className="h-56 sm:h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={localData}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false}/><XAxis dataKey="name" stroke="#666" fontSize={9} tickLine={false} axisLine={false}/><YAxis stroke="#666" fontSize={9} tickLine={false} axisLine={false}/><Tooltip contentStyle={tt}/><Bar dataKey="revenue" fill="#0093D8" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div>
                </div>
            </div>
        </div>
    );
};
