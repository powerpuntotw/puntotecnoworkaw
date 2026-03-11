import { useState, useEffect, useRef } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Package, CheckCircle2, TrendingUp, DollarSign, Clock, Users, Activity } from 'lucide-react';

export const LocalDashboard = ({ locationId }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayOrders: 0,
        totalPoints: 0,
        todayRevenue: 0,
        pending: 0,
        processing: 0,
        ready: 0,
        delivered: 0,
        weeklyRevenue: 0
    });
    const heartbeatInterval = useRef(null);

    // Heartbeat logic
    useEffect(() => {
        if (!locationId) return;

        const sendHeartbeat = async () => {
            try {
                await databases.updateDocument(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'printing_locations',
                    locationId,
                    { last_active_at: new Date().toISOString() }
                );
            } catch (error) {
                console.error("Heartbeat failed:", error);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(heartbeatInterval.current);
            } else {
                sendHeartbeat();
                heartbeatInterval.current = setInterval(sendHeartbeat, 180000); // 3 minutes
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Initial heartbeat
        sendHeartbeat();
        heartbeatInterval.current = setInterval(sendHeartbeat, 180000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(heartbeatInterval.current);
        };
    }, [locationId]);

    const fetchLocalStats = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Get all orders for this location
            const res = await databases.listDocuments(dbId, 'orders', [
                Query.equal('location_id', locationId),
                Query.limit(500)
            ]);
            const orders = res.documents;
            const today = new Date().toLocaleDateString();

            const todayOrders = orders.filter(o => new Date(o.$createdAt).toLocaleDateString() === today);
            
            setStats({
                todayOrders: todayOrders.length,
                totalPoints: orders.length * 10, 
                todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0),
                pending: orders.filter(o => o.status === 'pendiente').length,
                processing: orders.filter(o => o.status === 'en_proceso').length,
                ready: orders.filter(o => o.status === 'listo').length,
                delivered: orders.filter(o => o.status === 'entregado').length,
                weeklyRevenue: orders.reduce((sum, o) => sum + (o.total_price || 0), 0)
            });
        } catch (error) {
            console.error("Error fetching local stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocalStats();
    }, [locationId]);

    const KPI_CARDS = [
        { label: 'Órdenes Hoy', value: stats.todayOrders, icon: Package, color: 'text-primary' },
        { label: 'Ingresos Hoy', value: `$${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
        { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-accent' },
        { label: 'Imprimiendo', value: stats.processing, icon: Loader2, color: 'text-secondary' },
        { label: 'Listas', value: stats.ready, icon: CheckCircle2, color: 'text-success' },
        { label: 'Entregadas', value: stats.delivered, icon: CheckCircle2, color: 'text-gray-400' },
        { label: 'Puntos Gen.', value: stats.totalPoints, icon: TrendingUp, color: 'text-accent' },
        { label: 'Venta Semanal', value: `$${stats.weeklyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' }
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl transition hover:border-primary/20 group">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{card.label}</span>
                            <div className={`p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition`}>
                                <card.icon size={20} className={`${card.color} ${card.label === 'Imprimiendo' ? 'animate-spin' : ''}`} />
                            </div>
                        </div>
                        <div className="text-4xl font-black text-white italic tracking-tighter">
                            {loading ? <div className="h-10 w-24 bg-white/5 animate-pulse rounded-xl" /> : card.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 blur-3xl rounded-full translate-x-1/2" />
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary/20 flex items-center justify-center text-primary-glow shadow-glow border border-primary/20">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-white italic uppercase tracking-tight">Estado de Conectividad</h4>
                        <p className="text-gray-400 font-medium">Latido operativo activo. Sincronización en tiempo real establecida.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Último Latido</p>
                        <p className="text-xl font-bold text-white font-mono italic">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button 
                        onClick={fetchLocalStats} 
                        className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl border border-white/10 transition group shadow-xl"
                    >
                        <TrendingUp size={24} className="group-hover:scale-110 transition-transform text-primary" />
                    </button>
                </div>
            </div>
        </div>
    );
};
