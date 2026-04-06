import { useState, useEffect, useRef } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Loader2, Package, CheckCircle2, TrendingUp, DollarSign, Clock, Activity, Star } from 'lucide-react';

export const LocalDashboard = ({ locationId }) => {
    const [loading, setLoading] = useState(true);
    const [locationName, setLocationName] = useState('');
    const [stats, setStats] = useState({
        todayOrders: 0, todayRevenue: 0,
        pending: 0, processing: 0, ready: 0, delivered: 0,
        weeklyRevenue: 0, totalPointsEarned: 0
    });
    const heartbeatRef = useRef(null);

    useEffect(() => {
        if (!locationId) return;
        const sendHeartbeat = async () => {
            try {
                await databases.updateDocument(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID, 'printing_locations', locationId,
                    { last_active_at: new Date().toISOString() }
                );
            } catch { }
        };
        const handleVisibility = () => {
            if (document.hidden) clearInterval(heartbeatRef.current);
            else { sendHeartbeat(); heartbeatRef.current = setInterval(sendHeartbeat, 180000); }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, 180000);
        return () => { document.removeEventListener('visibilitychange', handleVisibility); clearInterval(heartbeatRef.current); };
    }, [locationId]);

    const fetchStats = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [locRes, ordersRes] = await Promise.all([
                databases.getDocument(dbId, 'printing_locations', locationId),
                databases.listDocuments(dbId, 'orders', [
                    Query.equal('location_id', locationId), Query.limit(500)
                ])
            ]);
            setLocationName(locRes.name);
            const orders = ordersRes.documents;
            const today = new Date().toLocaleDateString();
            const todayOrders = orders.filter(o => new Date(o.$createdAt).toLocaleDateString() === today);
            setStats({
                todayOrders: todayOrders.length,
                todayRevenue: todayOrders.reduce((s, o) => s + (o.total_price || 0), 0),
                pending:    orders.filter(o => o.status === 'pendiente').length,
                processing: orders.filter(o => o.status === 'en_proceso').length,
                ready:      orders.filter(o => o.status === 'listo').length,
                delivered:  orders.filter(o => o.status === 'entregado').length,
                weeklyRevenue: orders.reduce((s, o) => s + (o.total_price || 0), 0),
                // Puntos reales: suma de points_earned de órdenes entregadas
                totalPointsEarned: orders
                    .filter(o => o.status === 'entregado')
                    .reduce((s, o) => s + (o.points_earned || 0), 0)
            });
        } catch (error) {
            console.error('Error fetching local stats:', error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, [locationId]);

    if (!locationId) return (
        <div className="text-center py-20 text-gray-500">
            <Activity size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-sm">Sin sucursal asignada</p>
            <p className="text-xs mt-2 text-gray-600">Contactá al administrador para que te asigne una sucursal.</p>
        </div>
    );

    const KPI_CARDS = [
        { label: 'Órdenes Hoy',    value: stats.todayOrders,                         icon: Package,      color: 'text-primary' },
        { label: 'Ingresos Hoy',   value: `$${stats.todayRevenue.toLocaleString('es-AR', { hour12: false })}`,  icon: DollarSign,   color: 'text-success' },
        { label: 'Pendientes',     value: stats.pending,                              icon: Clock,        color: 'text-yellow-400' },
        { label: 'Imprimiendo',    value: stats.processing,                           icon: Loader2,      color: 'text-secondary', spin: true },
        { label: 'Listas',         value: stats.ready,                                icon: CheckCircle2, color: 'text-success' },
        { label: 'Entregadas',     value: stats.delivered,                            icon: CheckCircle2, color: 'text-gray-400' },
        { label: 'Pts. Generados', value: stats.totalPointsEarned.toLocaleString('es-AR', { hour12: false }),   icon: Star,         color: 'text-yellow-400' },
        { label: 'Facturación',    value: `$${stats.weeklyRevenue.toLocaleString('es-AR', { hour12: false })}`, icon: DollarSign,   color: 'text-success' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {locationName && (
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">{locationName}</h1>
                    <p className="text-gray-400 mt-1 font-medium">Panel operativo de sucursal</p>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {KPI_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-2xl hover:border-primary/20 transition group">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.15em]">{card.label}</span>
                            <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition">
                                <card.icon size={18} className={`${card.color} ${card.spin ? 'animate-spin' : ''}`} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-white italic tracking-tighter">
                            {loading ? <div className="h-9 w-20 bg-white/5 animate-pulse rounded-xl" /> : card.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-[2.5rem] p-7 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-full bg-primary/5 blur-3xl rounded-full translate-x-1/2" />
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-primary/20 flex items-center justify-center text-primary shadow-glow border border-primary/20">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Conectividad Activa</h4>
                        <p className="text-gray-400 text-sm">Heartbeat enviado. Sincronización en tiempo real.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Último Latido</p>
                        <p className="text-lg font-bold text-white font-mono italic">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={fetchStats} className="bg-white/5 hover:bg-white/10 text-white p-3.5 rounded-2xl border border-white/10 transition group shadow-xl">
                        <TrendingUp size={22} className="group-hover:scale-110 transition-transform text-primary" />
                    </button>
                </div>
            </div>
        </div>
    );
};
