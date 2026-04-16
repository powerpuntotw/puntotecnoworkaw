import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { STORAGE_BUCKETS } from '../../lib/constants';
import toast from 'react-hot-toast';
import {
    Gift, Loader2, Image as ImageIcon, CheckCircle,
    Clock, ChevronRight, Scan, Star, Printer, Package
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────
const getImageUrl = (imageId) => {
    if (!imageId) return '';
    try { return storage.getFilePreview(STORAGE_BUCKETS.REWARDS, imageId); }
    catch { return ''; }
};

// Detecta si un premio es del tipo "impresiones gratis" por categoría o nombre
const isPrintReward = (reward) => {
    const hay = (str = '') => str.toLowerCase();
    return (
        hay(reward.category).includes('impres') ||
        hay(reward.name).includes('impres') ||
        hay(reward.description).includes('impres') ||
        hay(reward.category).includes('print') ||
        hay(reward.name).includes('print')
    );
};

// ─── Componente principal ────────────────────────────────────
export const LocalRewards = ({ locationId }) => {
    const [rewards, setRewards] = useState([]);
    const [redeems, setRedeems] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(true);
    const [loadingRedeems, setLoadingRedeems] = useState(true);
    const [searchCode, setSearchCode] = useState('');
    const [delivering, setDelivering] = useState(null);

    // ── Fetch catálogo (todos los visibles) ──
    const fetchRewards = async () => {
        try {
            setLoadingRewards(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'rewards',
                [Query.equal('is_visible', true), Query.orderAsc('points_required')]
            );
            setRewards(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoadingRewards(false); }
    };

    // ── Fetch canjes de esta sucursal ──
    const fetchRedeems = async () => {
        if (!locationId) return;
        try {
            setLoadingRedeems(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'redeems',
                [
                    Query.equal('location_id', locationId),
                    Query.orderDesc('$createdAt'),
                    Query.limit(100)
                ]
            );
            setRedeems(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoadingRedeems(false); }
    };

    useEffect(() => {
        fetchRewards();
        fetchRedeems();
    }, [locationId]);

    // ── Entregar premio ──
    const handleDeliver = async (redeemId) => {
        try {
            setDelivering(redeemId);
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'redeems',
                redeemId,
                { status: 'entregado', delivered_at: new Date().toISOString() }
            );
            setRedeems(prev => prev.map(r =>
                r.$id === redeemId ? { ...r, status: 'entregado', delivered_at: new Date().toISOString() } : r
            ));
            toast.success('Premio entregado correctamente');
        } catch {
            toast.error('Error al procesar la entrega');
        } finally {
            setDelivering(null);
        }
    };

    // ── Filtros ──
    const pendingRedeems = redeems.filter(r => r.status === 'pendiente');
    const deliveredRedeems = redeems.filter(r => r.status === 'entregado');
    const filteredRedeems = redeems.filter(r =>
        !searchCode ||
        r.code?.toUpperCase().includes(searchCode) ||
        r.client_name?.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.reward_name?.toLowerCase().includes(searchCode.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                    <Gift className="text-primary shrink-0" size={28} /> Premios & Canjes
                </h1>
                <p className="text-gray-400 mt-1 text-sm">
                    Referencia del catálogo y gestión de entregas en esta sucursal.
                </p>
            </div>

            {/* ── Stats rápidas ── */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-primary">{rewards.length}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center">Premios activos</span>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-primary animate-pulse">{pendingRedeems.length}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center">Pendientes</span>
                </div>
                <div className="bg-card/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-success">{deliveredRedeems.length}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center">Entregados</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                SECCIÓN 1 — CANJES PENDIENTES (prioridad alta)
            ══════════════════════════════════════════════ */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        Canjes a Entregar
                        {pendingRedeems.length > 0 && (
                            <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                                {pendingRedeems.length}
                            </span>
                        )}
                    </h2>
                    {/* Buscador */}
                    <div className="relative w-full sm:w-64">
                        <Scan size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Código, cliente o premio..."
                            value={searchCode}
                            onChange={e => setSearchCode(e.target.value.toUpperCase())}
                            className="w-full bg-card/50 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white text-sm font-bold outline-none focus:border-primary transition"
                        />
                    </div>
                </div>

                {loadingRedeems ? (
                    <div className="flex justify-center py-10 text-primary"><Loader2 className="animate-spin" /></div>
                ) : filteredRedeems.length === 0 ? (
                    <div className="bg-card/30 border border-white/5 rounded-2xl py-12 flex flex-col items-center gap-3 text-gray-600">
                        <CheckCircle size={32} className="opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest">
                            {searchCode ? 'Sin resultados para esa búsqueda' : 'Sin canjes registrados aún'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Pendientes primero, luego entregados */}
                        {[...filteredRedeems].sort((a, b) => {
                            if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
                            if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
                            return 0;
                        }).map(r => {
                            const isPending = r.status === 'pendiente';
                            const isDelivering = delivering === r.$id;
                            // Buscar el premio correspondiente en el catálogo para mostrar imagen
                            const rewardData = rewards.find(rw => rw.$id === r.reward_id);
                            const imgUrl = rewardData?.image_id ? getImageUrl(rewardData.image_id) : '';

                            return (
                                <div key={r.$id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition ${
                                        isPending
                                            ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                                            : 'bg-card/30 border-white/5 opacity-60'
                                    }`}>

                                    {/* Miniatura del premio */}
                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                        {imgUrl
                                            ? <img src={imgUrl} alt={r.reward_name} className="w-full h-full object-cover" width="48" height="48" />
                                            : <Gift size={20} className="text-gray-600" />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-primary font-black font-mono text-sm">{r.code}</span>
                                            {isPending
                                                ? <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 animate-pulse">PENDIENTE</span>
                                                : <span className="text-[9px] font-black bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">ENTREGADO</span>
                                            }
                                        </div>
                                        <p className="text-white font-bold text-sm truncate mt-0.5">{r.reward_name}</p>
                                        <p className="text-gray-500 text-[11px]">
                                            {r.client_name} · {new Date(r.$createdAt).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>

                                    {/* Acción */}
                                    {isPending ? (
                                        <button
                                            onClick={() => handleDeliver(r.$id)}
                                            disabled={isDelivering}
                                            className="shrink-0 bg-success hover:bg-success/80 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm">
                                            {isDelivering
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : <><CheckCircle size={14} /> Entregar</>
                                            }
                                        </button>
                                    ) : (
                                        <span className="shrink-0 text-[10px] text-gray-600 font-mono">
                                            {r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                SECCIÓN 2 — CATÁLOGO DE REFERENCIA
            ══════════════════════════════════════════════ */}
            <div>
                <h2 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2 mb-4">
                    <Star size={18} className="text-warning" />
                    Catálogo de Referencia
                </h2>
                <p className="text-gray-500 text-xs mb-4">
                    Estos son los premios que los clientes pueden canjear. Usalo para saber qué tenés que entregar cuando llegue alguien con un código.
                </p>

                {loadingRewards ? (
                    <div className="flex justify-center py-10 text-primary"><Loader2 className="animate-spin" /></div>
                ) : rewards.length === 0 ? (
                    <div className="bg-card/30 border border-white/5 rounded-2xl py-12 flex flex-col items-center gap-3 text-gray-600">
                        <Gift size={32} className="opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest">Sin premios en el catálogo</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards.map(reward => {
                            const imgUrl = reward.image_id ? getImageUrl(reward.image_id) : '';
                            const isPrint = isPrintReward(reward);

                            return (
                                <div key={reward.$id}
                                    className="bg-card/40 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition group">

                                    {/* Imagen */}
                                    <div className="relative h-36 bg-white/5 flex items-center justify-center overflow-hidden">
                                        {imgUrl
                                            ? <img src={imgUrl} alt={reward.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" width="400" height="144" />
                                            : <div className="flex flex-col items-center gap-2 text-gray-700">
                                                <ImageIcon size={32} />
                                              </div>
                                        }
                                        {/* Badge tipo impresión */}
                                        {isPrint && (
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary/90 text-white text-[9px] font-black px-2 py-1 rounded-full">
                                                <Printer size={10} /> Impresión
                                            </div>
                                        )}
                                        {/* Puntos necesarios */}
                                        <div className="absolute top-2 right-2 bg-black/70 text-warning text-[10px] font-black px-2 py-1 rounded-full border border-warning/30">
                                            {reward.points_required?.toLocaleString('es-AR')} pts
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        {reward.category && (
                                            <span className="text-[9px] text-primary font-black uppercase tracking-widest block mb-1">{reward.category}</span>
                                        )}
                                        <h3 className="text-sm font-black text-white">{reward.name}</h3>
                                        {reward.description && (
                                            <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">{reward.description}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Package size={11} />
                                                Stock: <span className="text-white font-bold">{reward.stock}</span>
                                            </div>
                                            {/* Canjes pendientes de este premio en esta sucursal */}
                                            {(() => {
                                                const count = pendingRedeems.filter(r => r.reward_id === reward.$id).length;
                                                return count > 0 ? (
                                                    <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
                                                        {count} pendiente{count > 1 ? 's' : ''}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
