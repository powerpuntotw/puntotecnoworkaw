import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Play, CheckCircle, Pause, Search, Info, Package, ChevronRight, FileText } from 'lucide-react';

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
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                [Query.equal('location_id', locationId), Query.orderDesc('$createdAt'), Query.limit(100)]
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
            toast.success(`Orden actualizada`, {
                style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
            });
            setSelectedOrder(null);
        } catch (error) {
            toast.error("Error al actualizar la orden");
        } finally {
            setIsUpdating(false);
        }
    };

    const columns = [
        { id: 'pendiente', label: 'Cola de Espera', color: 'border-accent', lightColor: 'bg-accent/5' },
        { id: 'en_proceso', label: 'En Producción', color: 'border-primary', lightColor: 'bg-primary/5' },
        { id: 'listo', label: 'Listo p/ Retiro', color: 'border-success', lightColor: 'bg-success/5' },
        { id: 'entregado', label: 'Historial', color: 'border-secondary', lightColor: 'bg-secondary/5' }
    ];

    const filteredOrders = orders.filter(o => 
        o.$id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" size={48} /></div>;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Package className="text-primary" size={32} /> Mesa de Control
                    </h1>
                    <p className="text-gray-400 font-medium mt-1">Gestión operativa táctica de pedidos entrantes.</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition" />
                    <input 
                        type="text" 
                        placeholder="ID o Nombre de cliente..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3 text-sm text-white focus:border-primary outline-none transition shadow-inner" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
                {columns.map(col => (
                    <div key={col.id} className={`flex flex-col bg-card/20 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative`}>
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${col.color.replace('border-', 'bg-')}`} />
                        
                        <div className="p-5 bg-white/5 flex justify-between items-center border-b border-white/5">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">{col.label}</h3>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${col.lightColor} ${col.color.replace('border-', 'text-')} border ${col.color.replace('border-', 'border-')}/20`}>
                                {filteredOrders.filter(o => o.status === col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {filteredOrders.filter(o => o.status === col.id).slice(0, col.id === 'entregado' ? 15 : 100).map(order => (
                                <div 
                                    key={order.$id} 
                                    onClick={() => setSelectedOrder(order)}
                                    className={`group relative overflow-hidden bg-dark/40 border border-white/5 p-5 rounded-2xl cursor-pointer hover:border-primary/30 transition-all duration-300 shadow-lg active:scale-95`}
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[9px] font-black text-primary-glow font-mono tracking-widest bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 transition group-hover:bg-primary group-hover:text-white uppercase">#{order.$id.substring(0,6)}</span>
                                        <span className="text-[9px] text-gray-500 font-bold italic">{new Date(order.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-white truncate italic uppercase tracking-tight group-hover:text-primary transition">{order.client_id || 'Cliente Punto'}</h4>
                                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                        <FileText size={12} className="text-secondary" />
                                        <span>{order.unit_price ? (order.unit_price > 100 ? 'Color' : 'B&N') : 'Impresión'} • {order.copies} JUEGOS</span>
                                    </div>
                                    
                                    <div className="absolute bottom-4 right-4 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                        <ChevronRight size={16} className="text-primary" />
                                    </div>
                                </div>
                            ))}
                            {filteredOrders.filter(o => o.status === col.id).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 opacity-20 h-full border-2 border-dashed border-white/5 rounded-3xl">
                                    <Package size={32} />
                                    <span className="text-[9px] font-black uppercase mt-2 tracking-widest">Sin Pendientes</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Control de Orden */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-dark/80 backdrop-blur-3xl w-full max-w-lg border border-white/10 rounded-[3rem] p-10 shadow-3xl shadow-primary/10 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
                        
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Control de Pedido</h2>
                                <p className="text-primary font-mono text-xs mt-2 font-bold tracking-[0.2em] uppercase">Ref: {selectedOrder.$id.toUpperCase()}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white p-3 bg-white/5 rounded-2xl border border-white/5 transition">✕</button>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Cliente ID</p>
                                    <p className="text-white font-black italic truncate">{selectedOrder.client_id}</p>
                                </div>
                                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Monto de Orden</p>
                                    <p className="text-success font-black text-3xl italic tracking-tighter leading-none">${selectedOrder.total_price?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Especificaciones Técnicas</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Maximize size={16} className="text-secondary" /></div>
                                        <span className="text-xs font-bold text-gray-300 uppercase">A4 Estándar</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Palette size={16} className="text-primary" /></div>
                                        <span className="text-xs font-bold text-gray-300 uppercase">{selectedOrder.unit_price > 100 ? 'Color Premium' : 'B&N Eco'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Package size={16} className="text-accent" /></div>
                                        <span className="text-xs font-bold text-gray-300 uppercase">{selectedOrder.copies} Copias</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                {selectedOrder.status === 'pendiente' && (
                                    <button 
                                        onClick={() => updateStatus(selectedOrder.$id, 'en_proceso')} 
                                        disabled={isUpdating}
                                        className="group w-full bg-primary hover:bg-primary-glow text-white font-black py-5 rounded-2xl shadow-glow flex items-center justify-center gap-4 transition-all text-xl italic tracking-tighter ring-4 ring-primary/20"
                                    >
                                        <Play size={24} className="group-hover:translate-x-1 transition-transform" /> EMPEZAR PRODUCCIÓN
                                    </button>
                                )}
                                {selectedOrder.status === 'en_proceso' && (
                                    <>
                                        <button 
                                            onClick={() => updateStatus(selectedOrder.$id, 'listo')} 
                                            disabled={isUpdating}
                                            className="group w-full bg-success hover:bg-success/80 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(164,204,57,0.3)] flex items-center justify-center gap-4 transition-all text-xl italic tracking-tighter ring-4 ring-success/20"
                                        >
                                            <CheckCircle size={24} className="group-hover:scale-110 transition-transform" /> MARCAR COMO LISTO
                                        </button>
                                        <button className="w-full bg-accent/10 text-accent font-black py-4 rounded-2xl border border-accent/20 flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-widest hover:bg-accent/20">
                                            <Pause size={18} /> Reportar Incidencia (Pausar)
                                        </button>
                                    </>
                                )}
                                {selectedOrder.status === 'listo' && (
                                    <button 
                                        onClick={() => updateStatus(selectedOrder.$id, 'entregado')} 
                                        disabled={isUpdating}
                                        className="group w-full bg-secondary hover:bg-secondary/80 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(0,147,216,0.3)] flex items-center justify-center gap-4 transition-all text-xl italic tracking-tighter ring-4 ring-secondary/20"
                                    >
                                        <Package size={24} className="group-hover:-translate-y-1 transition-transform" /> CONFIRMAR ENTREGA
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
