import { useState, useEffect } from 'react';
import client, { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast, { Toaster } from 'react-hot-toast';

export const LocalDashboard = ({ user, dbUser }) => {
    const [orders, setOrders] = useState([]);
    const [locationStats, setLocationStats] = useState({ name: 'Cargando...', isOpen: false, todayOrders: 0, todayRevenue: 0 });
    const locationId = dbUser?.location_id || null; // Assume the local user doc has a location_id reference

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Mocking location info if user doesn't have an explicit location attached for testing
                let targetLocationId = locationId;

                if (!targetLocationId) {
                    // Fallback for demo: just pick the first location
                    const locs = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'printing_locations', [Query.limit(1)]);
                    if (locs.documents.length > 0) targetLocationId = locs.documents[0].$id;
                }

                if (targetLocationId) {
                    // Fetch Location Info
                    const locDoc = await databases.getDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'printing_locations', targetLocationId);
                    setLocationStats(prev => ({ ...prev, id: locDoc.$id, name: locDoc.name, isOpen: locDoc.is_open }));
                }

                // Fetch latest orders (e.g. active ones)
                const queries = [Query.orderDesc('$createdAt'), Query.limit(20)];
                if (targetLocationId) queries.push(Query.equal('location_id', targetLocationId));

                const ordersRes = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders', queries);
                setOrders(ordersRes.documents);

                // Calculate mock today stats based on retrieved active orders
                const todayRev = ordersRes.documents.reduce((acc, curr) => acc + (curr.unit_price || 0), 0);
                setLocationStats(prev => ({ ...prev, todayOrders: ordersRes.documents.length, todayRevenue: todayRev }));

            } catch (error) {
                console.error("Local dashboard fetch error", error);
            }
        };

        fetchDashboardData();

        // Subscripción Realtime para Órdenes
        const unsubscribe = client.subscribe(
            `databases.${import.meta.env.VITE_APPWRITE_DATABASE_ID}.collections.orders.documents`,
            response => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    toast('¡Nueva orden recibida!', { icon: '🛎️' });
                    setOrders(prev => [response.payload, ...prev]);
                    setLocationStats(prev => ({
                        ...prev,
                        todayOrders: prev.todayOrders + 1,
                        todayRevenue: prev.todayRevenue + (response.payload.unit_price || 0)
                    }));
                }
                if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                    setOrders(prev => prev.map(order => order.$id === response.payload.$id ? response.payload : order));
                }
            }
        );

        return () => unsubscribe();
    }, [locationId]);

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                orderId,
                { status: newStatus }
            );
            toast.success(`Orden movida a ${newStatus}`);
        } catch (error) {
            console.error("Update error", error);
            toast.error("Error al actualizar la orden");
        }
    };

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

    const toggleOpenStatus = async () => {
        if (!locationId && !locationStats.id) {
            toast.error("No hay sucursal asociada a este dashboard");
            return;
        }
        
        const targetId = locationId || locationStats.id;
        const newState = !locationStats.isOpen;

        try {
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'printing_locations',
                targetId,
                { is_open: newState }
            );
            setLocationStats(prev => ({ ...prev, isOpen: newState }));
            toast.success(`Sucursal ${newState ? 'Abierta' : 'Cerrada'}`);
        } catch (error) {
            console.error("Error al abri/cerrar sucursal", error);
            toast.error("Error al actualizar estado");
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e2d', color: '#fff', border: '1px solid #333' } }} />

            <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-white/5 shadow-xl glass">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">{locationStats.name}</h1>
                    <p className="text-sm text-gray-400 mt-1">Panel Operativo</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`font-semibold text-lg ${locationStats.isOpen ? 'text-success' : 'text-gray-500'}`}>
                        {locationStats.isOpen ? 'ABIERTA' : 'CERRADA'}
                    </span>
                    <div
                        onClick={toggleOpenStatus}
                        className={`w-14 h-8 rounded-full p-1 cursor-pointer flex transition-all border shadow-lg ${locationStats.isOpen ? 'bg-success/20 border-success/50 justify-end shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gray-800 border-gray-600 justify-start'}`}
                    >
                        <div className={`w-6 h-6 rounded-full shadow-md ${locationStats.isOpen ? 'bg-success' : 'bg-gray-500'}`}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center backdrop-blur-sm">
                    <p className="text-gray-400 text-sm">Órdenes Hoy</p>
                    <p className="text-3xl font-bold text-white mt-1">{locationStats.todayOrders}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center backdrop-blur-sm">
                    <p className="text-gray-400 text-sm">Órdenes Pendientes</p>
                    <p className="text-3xl font-bold text-warning mt-1">{orders.filter(o => o.status === 'pendiente').length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center backdrop-blur-sm">
                    <p className="text-gray-400 text-sm">Ingresos Hoy (Estimado)</p>
                    <p className="text-3xl font-bold text-success mt-1">${locationStats.todayRevenue}</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h2 className="font-semibold text-white">Mesa de Trabajo (En Cola)</h2>
                    <span className="flex items-center gap-2 text-xs text-secondary animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        Escuchando en vivo...
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-sm">
                                <th className="p-4 font-medium">ID</th>
                                <th className="p-4 font-medium">Archivo / Opciones</th>
                                <th className="p-4 font-medium">Estado</th>
                                <th className="p-4 font-medium text-right">Flujo (Acción Rápida)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').map((order) => (
                                <tr key={order.$id} className="hover:bg-white/5 transition">
                                    <td className="p-4 font-mono text-gray-300 text-sm">#{order.$id.substring(0, 6).toUpperCase()}</td>
                                    <td className="p-4">
                                        <div className="text-white font-medium text-sm">{order.files?.length || 1} Archivo(s)</div>
                                        <div className="text-gray-400 text-xs">x{order.copies} Copias • {order.color_mode === 'color' ? 'Color' : 'B/N'}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase ${getStatusTheme(order.status)}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {/* State Machine Action Buttons */}
                                        {order.status === 'pendiente' && (
                                            <button onClick={() => updateOrderStatus(order.$id, 'en_proceso')} className="px-4 py-2 bg-secondary/20 text-secondary text-sm font-semibold rounded-lg hover:bg-secondary/40 border border-secondary/50 transition shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                                Imprimir
                                            </button>
                                        )}
                                        {order.status === 'en_proceso' && (
                                            <button onClick={() => updateOrderStatus(order.$id, 'listo')} className="px-4 py-2 bg-success/20 text-success text-sm font-semibold rounded-lg hover:bg-success/40 border border-success/50 transition shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                Marcar Listo
                                            </button>
                                        )}
                                        {order.status === 'listo' && (
                                            <button onClick={() => updateOrderStatus(order.$id, 'entregado')} className="px-4 py-2 bg-primary/20 text-primary-glow text-sm font-semibold rounded-lg hover:bg-primary/40 border border-primary/50 transition">
                                                Entregar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado').length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-500">No hay órdenes en cola actualmente.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
