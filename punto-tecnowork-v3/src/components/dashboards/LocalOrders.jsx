import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Play, CheckCircle, Pause, Search, Info, Package } from 'lucide-react';

export const LocalOrders = ({ locationId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchOrders = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                [Query.equal('location_id', locationId), Query.orderDesc('$createdAt')]
            );
            setOrders(res.documents);
        } catch (error) {
            console.error("Error fetching local orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Set up Realtime subscription here later
    }, [locationId]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            setIsUpdating(true);
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                orderId,
                { status: newStatus }
            );
            setOrders(orders.map(o => o.$id === orderId ? { ...o, status: newStatus } : o));
            toast.success(`Orden actualizada a ${newStatus}`);
            setSelectedOrder(null);
        } catch (error) {
            toast.error("Error al actualizar la orden");
        } finally {
            setIsUpdating(false);
        }
    };

    const columns = [
        { id: 'pendiente', label: 'Cola (Pendiente)', color: 'border-warning/50' },
        { id: 'en_proceso', label: 'Taller (En Proceso)', color: 'border-primary/50' },
        { id: 'listo', label: 'Listo (Para Retiro)', color: 'border-success/50' },
        { id: 'entregado', label: 'Archivo (Entregado)', color: 'border-gray-700' }
    ];

    if (loading) return <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" size={32} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Package className="text-primary" /> Mesa de Control
                </h1>
                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Buscar orden..." className="w-full bg-card border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)] overflow-hidden">
                {columns.map(col => (
                    <div key={col.id} className={`flex flex-col bg-card/30 backdrop-blur rounded-2xl border-t-4 ${col.color} overflow-hidden`}>
                        <div className="p-4 bg-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{col.label}</h3>
                            <span className="text-xs font-mono px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                                {orders.filter(o => o.status === col.id).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {orders.filter(o => o.status === col.id).slice(0, col.id === 'entregado' ? 10 : 100).map(order => (
                                <div 
                                    key={order.$id} 
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-background/80 border border-white/5 p-4 rounded-xl cursor-pointer hover:border-primary/50 transition transform hover:-translate-y-1 shadow-lg"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-black text-primary-glow font-mono">#{order.order_number || order.$id.substring(0,6).toUpperCase()}</span>
                                        <span className="text-[10px] text-gray-500">{new Date(order.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white truncate">{order.client_name || 'Sin nombre'}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tight">{order.specs || 'A4 B&N'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Production Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-card w-full max-w-md border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white">Ficha de Producción</h2>
                                <p className="text-primary-glow font-mono text-sm">Orden #{selectedOrder.order_number || selectedOrder.$id.toUpperCase()}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Cliente</p>
                                    <p className="text-white font-medium">{selectedOrder.client_name}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Monto Total</p>
                                    <p className="text-success font-black text-xl">${selectedOrder.total_amount?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Especificaciones</p>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>🔹 Tamaño: {selectedOrder.size || 'A4'}</li>
                                    <li>🔹 Color: {selectedOrder.color_type || 'B&N'}</li>
                                    <li>🔹 Copias: {selectedOrder.copies || 1}</li>
                                </ul>
                            </div>

                            <div className="pt-6 flex flex-col gap-3">
                                {selectedOrder.status === 'pendiente' && (
                                    <button 
                                        onClick={() => updateStatus(selectedOrder.$id, 'en_proceso')} 
                                        disabled={isUpdating}
                                        className="w-full bg-primary hover:bg-primary-glow text-white font-bold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition"
                                    >
                                        <Play size={20} /> Empezar Taller
                                    </button>
                                )}
                                {selectedOrder.status === 'en_proceso' && (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(selectedOrder.$id, 'listo')} 
                                            disabled={isUpdating}
                                            className="w-full bg-success hover:bg-success/80 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-3 transition"
                                        >
                                            <CheckCircle size={20} /> Marcar como Listo
                                        </button>
                                        <button className="w-full bg-warning/10 text-warning font-bold py-3 rounded-2xl border border-warning/20 flex items-center justify-center gap-3 transition">
                                            <Pause size={18} /> Pausar Orden (Problema)
                                        </button>
                                    </>
                                )}
                                {selectedOrder.status === 'listo' && (
                                    <button 
                                        onClick={() => updateStatus(selectedOrder.$id, 'entregado')} 
                                        disabled={isUpdating}
                                        className="w-full bg-secondary hover:bg-secondary/80 text-white font-bold py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition"
                                    >
                                        <Package size={20} /> Confirmar Entrega
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
