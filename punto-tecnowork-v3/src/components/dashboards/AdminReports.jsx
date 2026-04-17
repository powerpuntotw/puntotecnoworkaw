import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, DollarSign, Package, MapPin, Loader2, Filter, ChevronDown } from 'lucide-react';
import { AnalyticsService } from '../../lib/analyticsService';
import toast from 'react-hot-toast';

export const AdminReports = () => {
    const [loading, setLoading] = useState(true);
    const [rangeType, setRangeType] = useState('7d'); // '7d', 'month', 'custom'
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, avgTicket: 0, activeLocals: 0 });
    const [dailyData, setDailyData] = useState([]);
    const [localData, setLocalData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [showCustom, setShowCustom] = useState(false);

    const loadData = useCallback(async (start, end) => {
        try {
            setLoading(true);
            const data = await AnalyticsService.getReportData(start, end);
            setStats(data.stats);
            setDailyData(data.dailyData);
            setLocalData(data.localData);
            setStatusData(data.statusData);
        } catch (error) {
            toast.error("Error al cargar reportes");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const now = new Date();
        let start, end = now;

        if (rangeType === '7d') {
            start = new Date();
            start.setDate(now.getDate() - 6);
            loadData(start, end);
        } else if (rangeType === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            loadData(start, end);
        }
        // 'custom' se maneja por un botón de aplicar separado o cuando cambian los inputs
    }, [rangeType, loadData]);

    const handleApplyCustom = () => {
        if (!customDates.start || !customDates.end) {
            toast.error("Selecciona ambas fechas");
            return;
        }
        const s = new Date(customDates.start + 'T00:00:00');
        const e = new Date(customDates.end + 'T23:59:59');
        loadData(s, e);
    };

    const COLORS = ['#EB1C24', '#0093D8', '#FFC905', '#A4CC39', '#9CA3AF'];
    const tooltipStyle = { 
        backgroundColor: '#111', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '12px', 
        fontSize: '12px',
        color: '#fff'
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header y Filtros */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter bg-gradient-hero bg-clip-text text-transparent">Reportes e Inteligencia</h1>
                    <p className="text-gray-400 mt-2 font-medium">Análisis de facturación y volumen de operaciones.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    {[
                        { id: '7d', label: '7 Días' },
                        { id: 'month', label: 'Mes Actual' },
                        { id: 'custom', label: 'Personalizado' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => {
                                setRangeType(btn.id);
                                if (btn.id !== 'custom') setShowCustom(false);
                                else setShowCustom(!showCustom);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${
                                (rangeType === btn.id) 
                                ? 'bg-primary text-white shadow-glow' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {btn.id === 'custom' && <Calendar size={14} />}
                            {btn.label}
                            {btn.id === 'custom' && <ChevronDown size={14} className={`transition-transform ${showCustom ? 'rotate-180' : ''}`} />}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button className="p-2 text-gray-500 hover:text-white transition opacity-50 cursor-not-allowed" title="Próximamente">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Custom Range Popover (Simple inline) */}
            {showCustom && rangeType === 'custom' && (
                <div className="bg-card/50 border border-white/10 p-4 rounded-2xl flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Desde</label>
                        <input 
                            type="date" 
                            value={customDates.start}
                            onChange={e => setCustomDates({...customDates, start: e.target.value})}
                            className="bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary transition"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Hasta</label>
                        <input 
                            type="date" 
                            value={customDates.end}
                            onChange={e => setCustomDates({...customDates, end: e.target.value})}
                            className="bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary transition"
                        />
                    </div>
                    <button 
                        onClick={handleApplyCustom}
                        className="bg-primary/20 text-primary px-4 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-primary/30 transition flex items-center gap-2"
                    >
                        <Filter size={14} /> Aplicar Filtro
                    </button>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Órdenes', value: stats.totalOrders, icon: Package, color: 'text-primary', sub: 'Volumen total' },
                    { label: 'Facturado', value: `$${stats.totalRevenue.toLocaleString('es-AR')}`, icon: DollarSign, color: 'text-success', sub: 'Solo entregadas' },
                    { label: 'Ticket Prom.', value: `$${stats.avgTicket.toFixed(0)}`, icon: TrendingUp, color: 'text-yellow-400', sub: 'Promedio' },
                    { label: 'Sucursales', value: stats.activeLocals, icon: MapPin, color: 'text-secondary', sub: 'Con operación' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-card/50 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-glow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/5 transition-colors" />
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-none">{kpi.label}</span>
                            <kpi.icon size={18} className={`${kpi.color} opacity-80`} />
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter">
                            {loading ? <Loader2 className="animate-spin text-gray-700 h-8 w-8" /> : kpi.value}
                        </div>
                        <p className="text-[9px] text-gray-600 mt-2 uppercase font-black tracking-widest">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Gráficos Principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingresos por Día */}
                <div className="bg-card/50 border border-white/10 rounded-[2rem] p-6 shadow-glow">
                    <div className="mb-6">
                        <h3 className="text-base font-black text-white uppercase italic italic tracking-tighter">Tendencia de Ingresos</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">Facturación por día (Entregados)</p>
                    </div>
                    <div className="h-64 sm:h-72">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-700"><Loader2 className="animate-spin" /></div>
                        ) : dailyData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-xs uppercase font-black tracking-widest">Sin datos en este rango</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false}/>
                                    <XAxis dataKey="date" stroke="#444" fontSize={9} tickLine={false} axisLine={false} tick={{ fontWeight: 800 }} />
                                    <YAxis stroke="#444" fontSize={9} tickLine={false} axisLine={false} tick={{ fontWeight: 800 }} />
                                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#ffffff10' }} strokeWidth={2}/>
                                    <Line 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#A4CC39" 
                                        strokeWidth={4} 
                                        dot={{ r: 4, fill: '#A4CC39', strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#fff', stroke: '#A4CC39', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Estado de Órdenes */}
                <div className="bg-card/50 border border-white/10 rounded-[2rem] p-6 shadow-glow">
                    <div className="mb-6">
                        <h3 className="text-base font-black text-white uppercase italic italic tracking-tighter">Mix de Estados</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">Distribución de volumen total</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-8 h-full min-h-[250px]">
                        <div className="h-56 w-full sm:w-1/2">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-gray-700"><Loader2 className="animate-spin" /></div>
                            ) : statusData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-600 text-xs uppercase font-black tracking-widest">Sin datos</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={statusData} 
                                            innerRadius={60} 
                                            outerRadius={85} 
                                            paddingAngle={8} 
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="space-y-3 w-full sm:w-1/2">
                            {statusData.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-glow" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-white italic">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Facturación por Sucursal */}
                <div className="bg-card/50 border border-white/10 rounded-[2rem] p-6 shadow-glow lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="text-base font-black text-white uppercase italic italic tracking-tighter">Ranking por Sucursal</h3>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">Facturación neta (Puntos de venta activos)</p>
                    </div>
                    <div className="h-64 sm:h-72">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-700"><Loader2 className="animate-spin" /></div>
                        ) : localData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-600 text-xs uppercase font-black tracking-widest">Sin datos de sucursales</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={localData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false}/>
                                    <XAxis dataKey="name" stroke="#444" fontSize={9} tickLine={false} axisLine={false} tick={{ fontWeight: 800 }} />
                                    <YAxis stroke="#444" fontSize={9} tickLine={false} axisLine={false} tick={{ fontWeight: 800 }} />
                                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff05' }} />
                                    <Bar dataKey="revenue" fill="#0093D8" radius={[10, 10, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
