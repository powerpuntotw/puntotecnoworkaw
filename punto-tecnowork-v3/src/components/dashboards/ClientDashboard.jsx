import { useState, useEffect } from 'react';
import client, { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Link } from 'react-router';

export const ClientDashboard = ({ user, dbUser }) => {
    const [orders, setOrders] = useState([]);
    const [points, setPoints] = useState(0);

    useEffect(() => {
        if (!user) return;

        // Fetch User's Recent Orders
        const fetchOrders = async () => {
            try {
                const res = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'orders',
                    [
                        Query.equal('client_id', user.$id),
                        Query.orderDesc('$createdAt'),
                        Query.limit(5)
                    ]
                );
                setOrders(res.documents);
            } catch (error) {
                console.error("Error fetching orders:", error);
            }
        };

        // Fetch User's Points
        const fetchPoints = async () => {
            try {
                const res = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'points_accounts',
                    [Query.equal('client_id', user.$id)]
                );
                if (res.documents.length > 0) {
                    setPoints(res.documents[0].total_points);
                }
            } catch (error) {
                console.error("Error fetching points:", error);
            }
        };

        fetchOrders();
        fetchPoints();

        // Realtime Subscription for Orders
        const unsubscribe = client.subscribe(
            `databases.${import.meta.env.VITE_APPWRITE_DATABASE_ID}.collections.orders.documents`,
            response => {
                // Check if the event is related to the current user's orders
                if (response.payload.client_id === user.$id) {
                    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                        setOrders(prev => [response.payload, ...prev].slice(0, 5));
                    }
                    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                        setOrders(prev => prev.map(order => order.$id === response.payload.$id ? response.payload : order));
                    }
                }
            }
        );

        return () => unsubscribe();
    }, [user]);

    const getStatusTheme = (status) => {
        switch (status) {
            case 'pendiente': return 'bg-warning/20 text-warning border-warning/30';
            case 'en_proceso': return 'bg-secondary/20 text-secondary border-secondary/30';
            case 'listo': return 'bg-success/20 text-success border-success/30';
            case 'entregado': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'cancelado': return 'bg-red-500/20 text-red-500 border-red-500/30';
            default: return 'bg-white/10 text-white border-white/20';
        }
    };

    // Calculate level based on points
    const getLevel = (pts) => {
        if (pts >= 3000) return { name: 'Diamante', next: null, color: 'text-secondary' };
        if (pts >= 2000) return { name: 'Oro', next: 3000, color: 'text-warning' };
        if (pts >= 1000) return { name: 'Plata', next: 2000, color: 'text-gray-300' };
        return { name: 'Bronce', next: 1000, color: 'text-[#cd7f32]' };
    };

    const level = getLevel(points);
    const progress = level.next ? (points / level.next) * 100 : 100;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-white/5 shadow-xl glass">
                <div>
                    <h1 className={`text-3xl font-bold ${level.color} drop-shadow-md`}>Nivel {level.name}</h1>
                    {level.next ? (
                        <p className="text-gray-400 mt-2">Te faltan {level.next - points} Pts para el siguiente nivel</p>
                    ) : (
                        <p className="text-gray-400 mt-2">¡Desbloqueaste el nivel máximo!</p>
                    )}
                </div>
                <div className="w-full md:w-1/2">
                    <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${level.name === 'Oro' ? 'bg-warning shadow-[0_0_10px_rgba(250,204,21,0.8)]' : level.name === 'Diamante' ? 'bg-secondary shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-primary-glow shadow-[0_0_10px_rgba(99,102,241,0.8)]'} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/orders/new" className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl flex flex-col items-center justify-center hover:border-primary-glow/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all group cursor-pointer">
                    <span className="text-2xl font-bold text-white group-hover:text-primary-glow drop-shadow-md">Nueva Orden</span>
                    <span className="text-sm text-gray-400 mt-2">Imprime tus archivos ahora</span>
                </Link>
                <Link to="/rewards" className="h-40 bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 rounded-2xl flex flex-col items-center justify-center hover:border-secondary/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all group cursor-pointer">
                    <span className="text-2xl font-bold text-white group-hover:text-secondary drop-shadow-md">Catálogo de Premios</span>
                    <span className="text-sm text-gray-400 mt-2">Tienes {points} puntos</span>
                </Link>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Órdenes Recientes</h2>
                    <span className="flex items-center gap-2 text-xs text-secondary animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        En vivo
                    </span>
                </div>
                <div className="space-y-3">
                    {orders.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No tienes órdenes recientes. ¡Crea una nueva orden!</p>
                    ) : (
                        orders.map((order) => (
                            <div key={order.$id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition gap-4 md:gap-0">
                                <div>
                                    <p className="font-medium text-gray-200">Pedido #{order.$id.substring(0, 6).toUpperCase()}</p>
                                    <p className="text-sm text-gray-500">{order.files?.length || 0} archivo(s) • {order.copies} copia(s) • {order.color_mode === 'color' ? 'Color' : 'B/N'}</p>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusTheme(order.status)}`}>
                                        {order.status.replace('_', ' ')}
                                    </span>
                                    <span className="font-mono text-gray-300 font-semibold">${order.unit_price}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
