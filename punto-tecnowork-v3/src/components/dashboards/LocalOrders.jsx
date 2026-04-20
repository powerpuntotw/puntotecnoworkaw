import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { calcPointsToEarn } from '../../lib/constants';
import { COLOR_TO_PACK } from '../../services/PriceService';
import { AuditService } from '../../lib/auditService';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, Search, Package, FileText, Maximize, Palette, Printer, XCircle, AlertTriangle } from 'lucide-react';
import { PrintWizard } from './PrintWizard';

export const LocalOrders = ({ locationId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [printWizardOrder, setPrintWizardOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('pendiente');

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

    // ── awardPoints ──────────────────────────────────────────────────
    // Lee el saldo FRESCO desde Appwrite antes de sumar para evitar
    // race conditions cuando dos órdenes del mismo cliente se entregan
    // casi simultáneamente. Actualiza AMBOS campos:
    //   • points          — saldo canjeable (puede bajar al canjear)
    //   • historical_points — acumulado histórico (NUNCA baja, define el tier)
    const awardPoints = async (order) => {
        const pts = order.points_earned || calcPointsToEarn(order.total_price);
        if (pts <= 0) return;
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            // Fetch fresco para evitar race condition
            const userRes = await databases.listDocuments(dbId, 'users', [Query.equal('auth_id', order.client_id)]);
            if (userRes.documents.length === 0) return;
            const userDoc = userRes.documents[0];
            await databases.updateDocument(dbId, 'users', userDoc.$id, {
                points:             (userDoc.points             ?? 0) + pts,
                historical_points:  (userDoc.historical_points  ?? 0) + pts,
            });
            await databases.createDocument(dbId, 'points_history', ID.unique(), {
                client_id: order.client_id,
                type:      'plus',
                amount:    pts,
                reason:    `Orden entregada: ${order.order_number || order.$id.substring(0, 8).toUpperCase()}`,
            });
        } catch (err) { console.error('Error awarding points:', err); }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            setIsUpdating(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

            await databases.updateDocument(dbId, 'orders', orderId, { status: newStatus });
            setOrders(orders.map(o => o.$id === orderId ? { ...o, status: newStatus } : o));

            if (newStatus === 'en_proceso') {
                toast.success('🖨 Enviando a imprimir...', {
                    style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                });
            } else if (newStatus === 'entregado') {
                const order = orders.find(o => o.$id === orderId);
                if (order) await awardPoints(order);
                toast.success('Entrega confirmada. Puntos acreditados.', {
                    style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                });
            } else {
                toast.success('Orden actualizada', {
                    style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
                });
            }
            setSelectedOrder(null);
        } catch (err) {
            console.error('Error updating order:', err);
            toast.error("Error al actualizar la orden");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateCopies = async (orderId, newCopies) => {
        try {
            setIsUpdating(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const order = orders.find(o => o.$id === orderId);
            
            if (!order || order.pack_id) {
                toast.error("No se pueden editar órdenes con PrintPass.");
                setIsUpdating(false);
                return;
            }
            if (newCopies < 1) newCopies = 1;
            
            const numFiles = Array.isArray(order.files) ? order.files.length : 1;
            const newTotalUnits = numFiles * newCopies;
            const newTotalPrice = newTotalUnits * (order.unit_price || 0);
            const newPointsEarned = calcPointsToEarn(newTotalPrice);
            
            await databases.updateDocument(dbId, 'orders', orderId, {
                copies: newCopies,
                total_price: newTotalPrice,
                points_earned: newPointsEarned
            });
            
            const updatedOrder = { 
                ...order, 
                copies: newCopies, 
                total_price: newTotalPrice, 
                points_earned: newPointsEarned 
            };
            
            setOrders(orders.map(o => o.$id === orderId ? updatedOrder : o));
            
            if (selectedOrder && selectedOrder.$id === orderId) {
                setSelectedOrder(updatedOrder);
            }
            
            toast.success('Cantidad actualizada', {
                style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
            });
        } catch (err) {
            console.error('Error updating copies:', err);
            toast.error("Error al recalcular pedido");
        } finally {
            setIsUpdating(false);
        }
    };

    // ── cancelOrder ───────────────────────────────────────────────────
    // Flujo idempotente de cancelación. Orden de operaciones aprobado:
    //  1. Validar estado permitido (pendiente | en_proceso)
    //  2. Validar refund_applied === false (guard anti-doble-refund)
    //  3. Marcar orden como 'cancelado' (bloquea re-intentos concurrentes)
    //  4. Si hay pack_id → reintegrar saldo al PrintPass
    //  5. Solo si el refund fue exitoso → marcar refund_applied = true
    //  6. Registrar en auditoría
    //  7. Actualizar estado local
    const cancelOrder = async (order) => {
        if (isCancelling) return; // guard doble click

        const ALLOWED_STATES = ['pendiente', 'en_proceso'];
        if (!ALLOWED_STATES.includes(order.status)) {
            toast.error('Este pedido no puede cancelarse en su estado actual.');
            return;
        }

        if (order.refund_applied === true) {
            toast.error('El reintegro ya fue aplicado. No se puede cancelar de nuevo.');
            return;
        }

        setIsCancelling(true);
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        try {
            // ── PASO 3: Marcar como cancelado ──────────────────────────
            await databases.updateDocument(dbId, 'orders', order.$id, {
                status: 'cancelado'
            });

            let refundOk = false;

            // ── PASO 4: Reintegro de PrintPass si corresponde ──────────
            if (order.pack_id && order.pack_units_used > 0) {
                try {
                    const packDoc = await databases.getDocument(dbId, 'print_packs', order.pack_id);

                    // Determinar el campo de saldo según color_mode
                    const packField = COLOR_TO_PACK[order.color_mode];
                    if (packDoc && packField) {
                        const currentBalance = packDoc[packField] ?? 0;
                        const restoredBalance = currentBalance + (order.pack_units_used || 0);
                        const updatePayload = { [packField]: restoredBalance };

                        // Si el pack estaba agotado, reactivarlo
                        if (packDoc.status === 'agotado') {
                            updatePayload.status = 'activo';
                        }

                        await databases.updateDocument(dbId, 'print_packs', order.pack_id, updatePayload);
                        refundOk = true;
                    } else {
                        console.warn('cancelOrder: pack_field no encontrado para color_mode', order.color_mode);
                        refundOk = false;
                    }
                } catch (refundErr) {
                    console.error('cancelOrder: error al reintegrar PrintPass:', refundErr);
                    // La orden ya quedó cancelada; loguear pero no bloquear
                    refundOk = false;
                    toast.error('Pedido cancelado, pero el reintegro del PrintPass falló. Informá al administrador.');
                }
            } else {
                // Sin PrintPass: no hay refund que aplicar
                refundOk = true;
            }

            // ── PASO 5: Marcar refund_applied solo si el refund fue exitoso ──
            if (refundOk && order.pack_id) {
                try {
                    await databases.updateDocument(dbId, 'orders', order.$id, {
                        refund_applied: true
                    });
                } catch (flagErr) {
                    console.error('cancelOrder: no se pudo marcar refund_applied:', flagErr);
                }
            }

            // ── PASO 6: Auditoría ─────────────────────────────────────
            await AuditService.logAction({
                action: 'order_cancelled',
                entityType: 'order',
                entityId: order.$id,
                metadata: {
                    order_number: order.order_number || order.$id.substring(0, 8).toUpperCase(),
                    client_name: order.client_name,
                    prev_status: order.status,
                    had_pack: !!order.pack_id,
                    pack_id: order.pack_id || null,
                    refund_applied: refundOk && !!order.pack_id,
                    pack_units_returned: order.pack_id ? (order.pack_units_used || 0) : 0
                }
            });

            // ── PASO 7: Actualizar estado local ───────────────────────
            const updatedOrder = { ...order, status: 'cancelado', refund_applied: refundOk && !!order.pack_id };
            setOrders(prev => prev.map(o => o.$id === order.$id ? updatedOrder : o));
            setSelectedOrder(null);
            setCancelConfirm(false);

            toast.success(
                order.pack_id && refundOk
                    ? 'Pedido cancelado. PrintPass reintegrado.'
                    : 'Pedido cancelado.',
                { style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' } }
            );
        } catch (err) {
            console.error('cancelOrder error:', err);
            toast.error('Error al cancelar el pedido. Intentá de nuevo.');
        } finally {
            setIsCancelling(false);
        }
    };

    const columns = [
        { id: 'pendiente',  label: 'Cola de Espera',  shortLabel: 'Cola',      color: 'border-accent',    lightColor: 'bg-accent/5'    },
        { id: 'en_proceso', label: 'En Producción',   shortLabel: 'Taller',    color: 'border-primary',   lightColor: 'bg-primary/5'   },
        { id: 'listo',      label: 'Listo p/ Retiro', shortLabel: 'Listos',    color: 'border-success',   lightColor: 'bg-success/5'   },
        { id: 'entregado',  label: 'Historial',       shortLabel: 'Archivo',   color: 'border-secondary', lightColor: 'bg-secondary/5' },
        { id: 'cancelado',  label: 'Cancelados',      shortLabel: 'Cancelado', color: 'border-red-500',   lightColor: 'bg-red-500/5'   },
    ];

    const filteredOrders = orders.filter(o =>
        (o.order_number || o.$id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Badge de estado de impresión
    const PrintBadge = ({ order }) => {
        if (order.status !== 'en_proceso') return null;
        const ps = order.print_status;
        if (ps === 'printing') return (
            <span className="flex items-center gap-1 text-[8px] font-black text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full border border-yellow-400/20 animate-pulse">
                <Printer size={8} /> Imprimiendo
            </span>
        );
        if (ps === 'printed') return (
            <span className="flex items-center gap-1 text-[8px] font-black text-success bg-success/10 px-1.5 py-0.5 rounded-full border border-success/20">
                <CheckCircle size={8} /> Impreso
            </span>
        );
        if (ps === 'error') return (
            <span className="flex items-center gap-1 text-[8px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full border border-red-400/20">
                ✗ Error impresión
            </span>
        );
        if (ps === 'pending') return (
            <span className="flex items-center gap-1 text-[8px] font-black text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/10">
                <Printer size={8} /> En cola
            </span>
        );
        return null;
    };

    if (!locationId) return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Package size={48} className="opacity-20" />
            <p className="font-black uppercase tracking-widest text-sm">Sin sucursal asignada</p>
            <p className="text-xs text-gray-600">Contactá al administrador.</p>
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

            {/* Selector de Pestañas en Móvil */}
            <div className="flex md:hidden bg-card/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-1 gap-1 sticky top-0 z-20 shadow-xl overflow-x-auto no-scrollbar">
                {columns.map(col => {
                    const count = filteredOrders.filter(o => o.status === col.id).length;
                    const isActive = activeTab === col.id;
                    return (
                        <button key={col.id} onClick={() => setActiveTab(col.id)}
                            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 min-w-[75px] ${isActive ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">{col.shortLabel}</span>
                            <span className={`text-[10px] font-black mt-0.5 ${isActive ? col.color.replace('border-', 'text-') : 'text-gray-600'}`}>
                                {count}
                            </span>
                            {isActive && <div className={`h-0.5 w-4 mt-1 rounded-full ${col.color.replace('border-', 'bg-')}`} />}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 h-[calc(100vh-320px)] md:h-[calc(100vh-280px)] min-h-[500px]">
                {columns.map(col => (
                    <div key={col.id} className={`flex flex-col bg-card/20 backdrop-blur-3xl rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl ${activeTab !== col.id ? 'hidden md:flex' : 'flex'}`}>
                        <div className={`h-1.5 ${col.color.replace('border-', 'bg-')}`} />
                        <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{col.label}</h3>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${col.lightColor} ${col.color.replace('border-', 'text-')}`}>
                                {filteredOrders.filter(o => o.status === col.id).length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {filteredOrders.filter(o => o.status === col.id).slice(0, (col.id === 'entregado' || col.id === 'cancelado') ? 15 : 100).map(order => (
                                <div key={order.$id} onClick={() => setSelectedOrder(order)}
                                    className="group bg-dark/40 border border-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer hover:border-primary/30 transition-all shadow-lg active:scale-95">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase">
                                            #{order.order_number || order.$id.substring(0,6)}
                                        </span>
                                        <span className="text-[9px] text-gray-500 italic">{new Date(order.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-white truncate italic uppercase tracking-tight group-hover:text-primary transition">
                                        {order.client_name || 'Cliente'}
                                    </h4>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase">
                                            <FileText size={10} className="text-secondary" />
                                            {order.color_mode === 'color' ? 'Color' : order.color_mode === 'foto' ? 'FotoYa' : 'B&N'} · {order.copies} cop.
                                        </div>
                                        <PrintBadge order={order} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-dark/80 backdrop-blur-3xl w-full max-w-lg border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-3xl relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px]" />
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Control de Pedido</h2>
                                <p className="text-primary font-mono text-xs mt-1 tracking-widest uppercase">
                                    #{selectedOrder.order_number || selectedOrder.$id.substring(0,8).toUpperCase()}
                                </p>
                            </div>
                            <button onClick={() => { setSelectedOrder(null); setCancelConfirm(false); }} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-500 hover:text-white transition">✕</button>
                        </div>
                        <div className="space-y-5 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Cliente</p>
                                    <p className="text-white font-black text-sm truncate">{selectedOrder.client_name || '—'}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Total</p>
                                    <p className="text-success font-black text-2xl italic tracking-tighter">${(selectedOrder.total_price || 0).toLocaleString('es-AR', { hour12: false })}</p>
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
                                    {selectedOrder.status === 'pendiente' && !selectedOrder.pack_id ? (
                                        <div className="flex items-center gap-2 bg-dark/50 px-2 py-1 rounded-lg border border-white/10 mt-1 shadow-inner">
                                            <button onClick={() => updateCopies(selectedOrder.$id, selectedOrder.copies - 1)} disabled={selectedOrder.copies <= 1 || isUpdating}
                                                className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">-</button>
                                            <span className="text-[10px] font-black text-white w-4 text-center">{selectedOrder.copies}</span>
                                            <button onClick={() => updateCopies(selectedOrder.$id, selectedOrder.copies + 1)} disabled={isUpdating}
                                                className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold text-gray-400 uppercase text-center mt-2">{selectedOrder.copies} cop.</span>
                                    )}
                                </div>
                            </div>
                            
                            {selectedOrder.pack_id && selectedOrder.status === 'pendiente' && (
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent text-[10px] font-black uppercase tracking-widest mt-2">
                                    ★ Orden con PrintPass: no admite edición. Cancele para modificar.
                                </div>
                            )}

                            {/* Badge de estado de impresión en el modal */}
                            {selectedOrder.status === 'en_proceso' && selectedOrder.print_status === 'printing' && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl text-yellow-400 text-xs font-black uppercase animate-pulse">
                                    <Printer size={14} /> Imprimiendo en este momento...
                                </div>
                            )}
                            {selectedOrder.status === 'en_proceso' && selectedOrder.print_status === 'error' && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-xs font-black uppercase">
                                    ✗ Error al imprimir — revisar logs del agente
                                </div>
                            )}
                            {selectedOrder.points_earned > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-xl text-success text-[10px] font-black uppercase tracking-widest">
                                    ★ Al entregar: +{selectedOrder.points_earned} pts para el cliente
                                </div>
                            )}
                            <div className="flex flex-col gap-3 pt-2">
                                {selectedOrder.status === 'pendiente' && (
                                    <button
                                        onClick={() => { setSelectedOrder(null); setPrintWizardOrder(selectedOrder); }}
                                        disabled={isUpdating}
                                        className="w-full bg-primary hover:bg-primary-glow text-white font-black py-4 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition text-lg italic tracking-tighter">
                                        <Printer size={20} /> INICIAR IMPRESIÓN
                                    </button>
                                )}
                                {selectedOrder.status === 'en_proceso' && (
                                    <>
                                        {selectedOrder.print_status === 'printing' && (
                                            <div className="w-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-black py-3 mb-2 rounded-xl flex items-center justify-center gap-2 text-xs">
                                                <Loader2 size={14} className="animate-spin" /> Agente reporta impresión en curso
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => updateStatus(selectedOrder.$id, 'pendiente')} disabled={isUpdating}
                                                className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition text-sm">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">Volver a</span>
                                                <span className="text-sm italic tracking-tighter">COLA</span>
                                            </button>
                                            <button onClick={() => updateStatus(selectedOrder.$id, 'listo')} disabled={isUpdating}
                                                className="w-full bg-success hover:bg-success/80 text-white font-black py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition shadow-lg">
                                                <span className="text-[10px] text-success/50 uppercase tracking-widest leading-none">Terminar</span>
                                                <span className="text-sm italic tracking-tighter flex items-center gap-2">
                                                    <CheckCircle size={14} /> FORZAR LISTO
                                                </span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                {selectedOrder.status === 'listo' && (
                                    <button onClick={() => updateStatus(selectedOrder.$id, 'entregado')} disabled={isUpdating}
                                        className="w-full bg-secondary hover:bg-secondary/80 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition text-lg italic tracking-tighter">
                                        <Package size={20} /> CONFIRMAR ENTREGA
                                    </button>
                                )}

                                {/* ── Cancelación operativa ── */}
                                {['pendiente', 'en_proceso'].includes(selectedOrder.status) && (
                                    <div className="border-t border-white/5 pt-3 mt-1">
                                        {!cancelConfirm ? (
                                            <button
                                                onClick={() => setCancelConfirm(true)}
                                                disabled={isUpdating || isCancelling}
                                                className="w-full bg-transparent hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition text-sm tracking-widest uppercase">
                                                <XCircle size={16} /> Cancelar Pedido
                                            </button>
                                        ) : (
                                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-red-400 font-black text-xs uppercase tracking-widest">¿Confirmar cancelación?</p>
                                                        <p className="text-gray-400 text-[10px] mt-1 leading-relaxed">
                                                            {selectedOrder.pack_id
                                                                ? 'Se cancelará el pedido y se reintegrará el saldo del PrintPass.'
                                                                : 'Se cancelará el pedido. Esta acción queda registrada.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setCancelConfirm(false)}
                                                        disabled={isCancelling}
                                                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition">
                                                        No, volver
                                                    </button>
                                                    <button
                                                        onClick={() => cancelOrder(selectedOrder)}
                                                        disabled={isCancelling}
                                                        className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2">
                                                        {isCancelling
                                                            ? <><Loader2 size={12} className="animate-spin" /> Cancelando...</>
                                                            : <><XCircle size={12} /> Sí, cancelar</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Wizard */}
            {printWizardOrder && (
                <PrintWizard
                    order={printWizardOrder}
                    isUpdating={isUpdating}
                    onCancel={() => setPrintWizardOrder(null)}
                    onConfirm={async () => {
                        await updateStatus(printWizardOrder.$id, 'en_proceso');
                        setPrintWizardOrder(null);
                    }}
                />
            )}
        </div>
    );
};
