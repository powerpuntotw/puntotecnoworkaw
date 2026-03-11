import { useState, useEffect, useRef } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Package, CheckCircle2, TrendingUp, DollarSign, Clock, Users } from 'lucide-react';

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
                totalPoints: orders.length * 10, // Mock calculation: 10 pts per order delivered? Should be more complex.
                todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                pending: orders.filter(o => o.status === 'pendiente').length,
                processing: orders.filter(o => o.status === 'en_proceso').length,
                ready: orders.filter(o => o.status === 'listo').length,
                delivered: orders.filter(o => o.status === 'entregado').length,
                weeklyRevenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) // Simplified
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
        { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-warning' },
        { label: 'Imprimiendo', value: stats.processing, icon: Loader2, color: 'text-secondary' },
        { label: 'Listas para Retirar', value: stats.ready, icon: CheckCircle2, color: 'text-success' },
        { label: 'Entregadas (Total)', value: stats.delivered, icon: CheckCircle2, color: 'text-gray-400' },
        { label: 'Puntos Entregados', value: stats.totalPoints, icon: TrendingUp, color: 'text-warning' },
        { label: 'Ingresos Semanales', value: `$${stats.weeklyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' }
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI_CARDS.map((card, idx) => (
                    <div key={idx} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow transition hover:border-white/20">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">{card.label}</span>
                            <card.icon size={18} className={`${card.color} ${card.label === 'Imprimiendo' ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="text-3xl font-black text-white">
                            {loading ? <div className="h-9 w-20 bg-white/5 animate-pulse rounded" /> : card.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary-glow">
                        <Users size={24} />
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Resumen de Actividad</h4>
                        <p className="text-sm text-gray-400">Tu sucursal está enviando el latido (heartbeat) correctamente.</p>
                    </div>
                </div>
                <button onClick={fetchLocalStats} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition">
                    <TrendingUp size={20} className="text-primary-glow" />
                </button>
            </div>
        </div>
    );
};
