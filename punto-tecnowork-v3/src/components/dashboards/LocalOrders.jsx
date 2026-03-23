import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Play, CheckCircle, Pause, Search, Package, ChevronRight, FileText, Maximize, Palette } from 'lucide-react';

export const LocalOrders = ({ locationId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchOrders = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders',
                [Query.equal('location_id', locationId), Query.orderDesc('$createdAt'), Query.limit(100)]
            );
            setOrders(res.documents);
        } catch (error) {
            console.error("Error fetching local orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [locationId]);

    // Suma puntos al usuario y registra en points_history al entregar
    const awardPoints = async (order) => {
        const pts = order.points_earned || 0;
        if (pts <= 0) return;
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            // Buscar doc del usuario por client_id (auth_id)
            const userRes = await databases.listDocuments(dbId, 'users', [
                Query.equal('auth_id', order.client_id)
            ]);
            if (userRes.documents.length === 0) return;
            const userDoc = userRes.documents[0];
            const currentPts = userDoc.points ?? 0;
            await databases.updateDocument(dbId, 'users', userDoc.$id, {
                points: currentPts + pts
            });
            await databases.createDocument(dbId, 'points_history', ID.unique(), {
                client_id: order.client_id,
                type: 'plus',
                amount: pts,
                reason: `Orden entregada: ${order.order_number || order.$id.substring(0, 8).toUpperCase()}`
            });
        } catch (err) {
            console.error('Error awarding points:', err);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            setIsUpdating(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            await databases.updateDocument(dbId, 'orders', orderId, { status: newStatus });
            const updatedOrders = orders.map(o => o.$id === orderId ? { ...o, status: newStatus } : o);
            setOrders(updatedOrders);
            // Sumar puntos solo al marcar entregado
            if (newStatus === 'entregado') {
                const order = orders.find(o => o.$id === orderId);
                if (order) await awardPoints(order);
                toast.success('Entrega confirmada. Puntos acreditados al cliente.', {
                    style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                });
            } else {
                toast.success('Orden actualizada', {
                    style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                });
            }
            setSelectedOrder(null);
        } catch {
            toast.error("Error al actualizar la orden");
        } finally {
            setIsUpdating(false);
        }
    };

    const columns = [
        { id: 'pendiente',   label: 'Cola de Espera',  color: 'border-accent',     lightColor: 'bg-accent/5'     },
        { id: 'en_proceso',  label: 'En Producción',   color: 'border-primary',    lightColor: 'bg-primary/5'    },
        { id: 'listo',       label: 'Listo p/ Retiro', color: 'border-success',    lightColor: 'bg-success/5'    },
        { id: 'entregado',   label: 'Historial',       color: 'border-secondary',  lightColor: 'bg-secondary/5'  }
    ];

    const filteredOrders = orders.filter(o =>
        (o.order_number || o.$id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!locationId) return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Package size={48} className="opacity-20" />
            <p className="font-black uppercase tracking-widest text-sm">Sin sucursal asignada</p>
            <p className="text-xs text-gray-600">Contactá al administrador para que te asigne una sucursal.</p>
        </div>
    );

    if (loading) return <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" size={48} /></div>;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Package className="text-primary" size={32} /> Mesa de Control
                    </h1>
                    <p className="text-gray-400 font-medium mt-1">Gestión operativa de pedidos.</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition" />
                    <input type="text" placeholder="# orden o nombre..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3 text-sm text-white focus:border-primary outline-none transition" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 h-[calc(100vh-280px)] min-h-[500px]">
                {columns.map(col => (
                    <div key={col.id} className="flex flex-col bg-card/20 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className={`h-1.5 ${col.color.replace('border-', 'bg-')}`} />
                        <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{col.label}</h3>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${col.lightColor} ${col.color.replace('border-', 'text-')}`}>
                                {filteredOrders.filter(o => o.status === col.id).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {filteredOrders.filter(o => o.status === col.id).slice(0, col.id === 'entregado' ? 15 : 100).map(order => (
                                <div key={order.$id} onClick={() => setSelectedOrder(order)}
                                    className="group bg-dark/40 border border-white/5 p-4 rounded-2xl cursor-pointer hover:border-primary/30 transition-all shadow-lg active:scale-95">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase">
                                            #{order.order_number || order.$id.substring(0,6)}
                                        </span>
                                        <span className="text-[9px] text-gray-500 italic">{new Date(order.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-white truncate italic uppercase tracking-tight group-hover:text-primary transition">
                                        {order.client_name || order.client_id?.substring(0, 10) || 'Cliente'}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500 font-bold uppercase">
                                        <FileText size={11} className="text-secondary" />
                                        {order.color_mode === 'color' ? 'Color' : order.color_mode === 'foto' ? 'FotoYa' : 'B&N'} · {order.copies} cop.
                                    </div>
                                </div>
                            ))}
                            {filteredOrders.filter(o => o.status === col.id).length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                                    <Package size={28} /><span className="text-[9px] font-black uppercase mt-2 tracking-widest">Vacío</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-dark/80 backdrop-blur-3xl w-full max-w-lg border border-white/10 rounded-[3rem] p-8 shadow-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px]" />
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Control de Pedido</h2>
                                <p className="text-primary font-mono text-xs mt-1 tracking-widest uppercase">
                                    #{selectedOrder.order_number || selectedOrder.$id.substring(0,8).toUpperCase()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-500 hover:text-white transition">✕</button>
                        </div>
                        <div className="space-y-5 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Cliente</p>
                                    <p className="text-white font-black text-sm truncate">{selectedOrder.client_name || selectedOrder.client_id?.substring(0,12)}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Total</p>
                                    <p className="text-success font-black text-2xl italic tracking-tighter">${(selectedOrder.total_price || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Maximize size={14} className="text-secondary" /></div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase text-center">
                                        {selectedOrder.color_mode === 'foto' ? '10×15' : selectedOrder.color_mode === 'bw' ? 'A4 B&N' : 'A4 Color'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Palette size={14} className="text-primary" /></div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase text-center">
                                        {selectedOrder.color_mode === 'color' ? 'Color' : selectedOrder.color_mode === 'foto' ? 'FotoYa' : 'B&N Eco'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Package size={14} className="text-accent" /></div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase text-center">{selectedOrder.copies} cop.</span>
                                </div>
                            </div>
                            {selectedOrder.points_earned > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-xl text-success text-[10px] font-black uppercase tracking-widest">
                                    ★ Al entregar: +{selectedOrder.points_earned} pts para el cliente
                                </div>
                            )}
                            <div className="flex flex-col gap-3 pt-2">
                                {selectedOrder.status === 'pendiente' && (
                                    <button onClick={() => updateStatus(selectedOrder.$id, 'en_proceso')} disabled={isUpdating}
                                        className="w-full bg-primary hover:bg-primary-glow text-white font-black py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition text-lg italic tracking-tighter">
                                        <Play size={20} /> INICIAR PRODUCCIÓN
                                    </button>
                                )}
                                {selectedOrder.status === 'en_proceso' && (<>
                                    <button onClick={() => updateStatus(selectedOrder.$id, 'listo')} disabled={isUpdating}
                                        className="w-full bg-success hover:bg-success/80 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition text-lg italic tracking-tighter">
                                        <CheckCircle size={20} /> MARCAR COMO LISTO
                                    </button>
                                    <button className="w-full bg-accent/10 text-accent font-black py-3 rounded-2xl border border-accent/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-accent/20 transition">
                                        <Pause size={16} /> Reportar Incidencia
                                    </button>
                                </>)}
                                {selectedOrder.status === 'listo' && (
                                    <button onClick={() => updateStatus(selectedOrder.$id, 'entregado')} disabled={isUpdating}
                                        className="w-full bg-secondary hover:bg-secondary/80 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition text-lg italic tracking-tighter">
                                        <Package size={20} /> CONFIRMAR ENTREGA
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
