import { useState, useEffect, useRef } from 'react';
import { databases, withRetry, ConnectionMonitor } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Loader2, Package, CheckCircle2, TrendingUp, DollarSign, Clock, Activity, Star, Wifi, WifiOff, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { BranchService, HEARTBEAT_INTERVAL_MS } from '../../services/BranchService';

export const LocalDashboard = ({ locationId }) => {
    const [loading, setLoading] = useState(true);
    const [locationName, setLocationName] = useState('');
    const [stats, setStats] = useState({
        todayOrders: 0, todayRevenue: 0,
        pending: 0, processing: 0, ready: 0, delivered: 0,
        weeklyRevenue: 0, totalPointsEarned: 0
    });
    const [locationData, setLocationData] = useState(null);
    const heartbeatRef = useRef(null);
    // BLINDAJE: Estado de conexión del heartbeat
    const [hbStatus, setHbStatus] = useState('connecting'); // 'ok' | 'retrying' | 'offline' | 'connecting'
    const [lastHbTime, setLastHbTime] = useState(null);
    const hbFailCountRef = useRef(0);
    const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 min máximo
    const BASE_INTERVAL_MS = HEARTBEAT_INTERVAL_MS;

    useEffect(() => {
        if (!locationId) return;

        let active = true;

        const sendHeartbeat = async () => {
            if (!ConnectionMonitor.isOnline) {
                setHbStatus('offline');
                return;
            }
            try {
                await BranchService.sendHeartbeat(locationId);
                hbFailCountRef.current = 0;
                setHbStatus('ok');
                setLastHbTime(new Date());
                // Actualizar localmente para mantener el indicador de disponibilidad sincronizado
                setLocationData(prev => prev ? { ...prev, last_active_at: Math.floor(Date.now() / 1000) } : null);
            } catch {
                hbFailCountRef.current += 1;
                setHbStatus('retrying');
            }
        };

        // Lanzar el próximo heartbeat con backoff si hubo fallo
        const scheduleNext = () => {
            const fails = hbFailCountRef.current;
            const delay = fails === 0
                ? BASE_INTERVAL_MS
                : Math.min(BASE_INTERVAL_MS * Math.pow(2, fails - 1), MAX_BACKOFF_MS);
            heartbeatRef.current = setTimeout(async () => {
                if (!active) return;
                await sendHeartbeat();
                scheduleNext();
            }, delay);
        };

        const handleVisibility = () => {
            clearTimeout(heartbeatRef.current);
            if (!document.hidden) { sendHeartbeat().then(scheduleNext); }
        };

        const handleOnline = (online) => {
            if (online) {
                clearTimeout(heartbeatRef.current);
                sendHeartbeat().then(scheduleNext);
            } else {
                setHbStatus('offline');
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        const unsubOnline = ConnectionMonitor.subscribe(handleOnline);

        setHbStatus('connecting');
        sendHeartbeat().then(scheduleNext);

        return () => {
            active = false;
            clearTimeout(heartbeatRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
            unsubOnline();
        };
    }, [locationId]);

    const fetchStats = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [locRes, ordersRes] = await Promise.all([
                withRetry(() => databases.getDocument(dbId, 'printing_locations', locationId)),
                withRetry(() => databases.listDocuments(dbId, 'orders', [
                    Query.equal('location_id', locationId), Query.limit(500)
                ]))
            ]);
            setLocationName(locRes.name);
            setLocationData(locRes);
            const orders = ordersRes.documents;
            const today = new Date().toLocaleDateString();
            const todayOrders    = orders.filter(o => new Date(o.$createdAt).toLocaleDateString() === today);
            // todayDelivered usa $updatedAt porque es cuándo se marcó como entregado
            const todayDelivered = orders.filter(o =>
                o.status === 'entregado' &&
                new Date(o.$updatedAt).toLocaleDateString() === today
            );
            const allDelivered   = orders.filter(o => o.status === 'entregado');
            setStats({
                todayOrders:       todayOrders.length,
                todayRevenue:      todayDelivered.reduce((s, o) => s + (o.total_price || 0), 0),
                pending:           orders.filter(o => o.status === 'pendiente').length,
                processing:        orders.filter(o => o.status === 'en_proceso').length,
                ready:             orders.filter(o => o.status === 'listo').length,
                delivered:         allDelivered.length,
                weeklyRevenue:     allDelivered.reduce((s, o) => s + (o.total_price || 0), 0),
                totalPointsEarned: allDelivered.reduce((s, o) => s + (o.points_earned || 0), 0)
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
                <div className="flex flex-col xl:flex-row items-center gap-7 relative z-10 w-full lg:w-auto">
                    {/* Indicador 1: Conectividad Técnica (Heartbeat) */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow border transition ${
                            hbStatus === 'ok'         ? 'bg-success/20 border-success/30 text-success' :
                            hbStatus === 'retrying'   ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                            hbStatus === 'offline'    ? 'bg-gray-800 border-gray-700 text-gray-500' :
                            'bg-primary/20 border-primary/20 text-primary'
                        }`}>
                            {hbStatus === 'ok'       && <Wifi size={24} />}
                            {hbStatus === 'retrying' && <AlertTriangle size={24} />}
                            {hbStatus === 'offline'  && <WifiOff size={24} />}
                            {hbStatus === 'connecting' && <Activity size={24} className="animate-pulse" />}
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Conectividad</p>
                            <h4 className="text-sm font-black text-white italic uppercase tracking-tight">
                                {hbStatus === 'ok'         && 'Activa'}
                                {hbStatus === 'retrying'   && 'Reintentando'}
                                {hbStatus === 'offline'    && 'Sin Internet'}
                                {hbStatus === 'connecting' && 'Conectando'}
                            </h4>
                        </div>
                    </div>

                    {/* Divisor vertical (solo desktop) */}
                    <div className="hidden xl:block w-[1px] h-10 bg-white/10" />

                    {/* Indicador 2: Disponibilidad Real (Visible para Clientes) */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {(() => {
                            const available = locationData ? BranchService.isAvailable(locationData) : false;
                            const isOpen = locationData?.is_open;
                            return (
                                <>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow border transition ${
                                        available ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' :
                                        'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        {available ? <Eye size={24} /> : <EyeOff size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Estado de Venta</p>
                                        <h4 className="text-sm font-black text-white italic uppercase tracking-tight">
                                            {available ? 'Visible para Clientes' : 
                                             !isOpen   ? 'Cerrado Manualmente' : 
                                             'No Visible (Offline)'}
                                        </h4>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Último Latido</p>
                        <p className="text-lg font-bold text-white font-mono italic">
                            {lastHbTime
                                ? lastHbTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                                : '--:--'}
                        </p>
                    </div>
                    <button onClick={fetchStats} className="bg-white/5 hover:bg-white/10 text-white p-3.5 rounded-2xl border border-white/10 transition group shadow-xl">
                        <TrendingUp size={22} className="group-hover:scale-110 transition-transform text-primary" />
                    </button>
                </div>
            </div>
        </div>
    );
};
