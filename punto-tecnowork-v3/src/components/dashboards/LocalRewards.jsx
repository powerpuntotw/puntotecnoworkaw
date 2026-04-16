import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { STORAGE_BUCKETS } from '../../lib/constants';
import toast from 'react-hot-toast';
import {
    Gift, Loader2, Image as ImageIcon, CheckCircle,
    Clock, Scan, Star, Printer, Package,
    Zap, AlertCircle, X, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────
const getImageUrl = (imageId) => {
    if (!imageId) return '';
    try { return storage.getFilePreview(STORAGE_BUCKETS.REWARDS, imageId); }
    catch { return ''; }
};

const packSummary = (r) => {
    const parts = [];
    if (r.pack_bw_a4 > 0)      parts.push(`${r.pack_bw_a4} B&N A4`);
    if (r.pack_color_a4 > 0)   parts.push(`${r.pack_color_a4} Color A4`);
    if (r.pack_foto_10x15 > 0) parts.push(`${r.pack_foto_10x15} Fotos`);
    if (r.pack_bw_a3 > 0)      parts.push(`${r.pack_bw_a3} B&N A3`);
    return parts.join(' · ');
};

// ─── Componente principal ────────────────────────────────────
export const LocalRewards = ({ locationId }) => {
    const [rewards, setRewards] = useState([]);
    const [redeems, setRedeems] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(true);
    const [loadingRedeems, setLoadingRedeems] = useState(true);
    const [searchCode, setSearchCode] = useState('');
    const [delivering, setDelivering] = useState(null);

    // PrintPass™ config
    const [ppEnabled, setPpEnabled] = useState(false);
    const [ppEnabledLocs, setPpEnabledLocs] = useState([]);
    const [ppPolicy, setPpPolicy] = useState('');
    const [policyOpen, setPolicyOpen] = useState(false);

    // Modal de confirmación activación PrintPass™
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [activatingRedeem, setActivatingRedeem] = useState(null);
    const [activating, setActivating] = useState(false);

    // ── Fetch config PrintPass™ ──
    const fetchPPConfig = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'system_config',
                [Query.equal('type', 'printpass_config')]
            );
            if (res.documents.length > 0) {
                const data = JSON.parse(res.documents[0].data);
                setPpEnabled(data.enabled === true);
                setPpEnabledLocs(data.enabled_locations ?? []);
                setPpPolicy(data.policy ?? '');
            }
        } catch { }
    };

    // ── Fetch catálogo ──
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
                [Query.equal('location_id', locationId), Query.orderDesc('$createdAt'), Query.limit(100)]
            );
            setRedeems(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoadingRedeems(false); }
    };

    useEffect(() => {
        fetchPPConfig();
        fetchRewards();
        fetchRedeems();
    }, [locationId]);

    // ── Verificar si esta sucursal tiene PrintPass™ activo ──
    const locationHasPP = ppEnabled && ppEnabledLocs.includes(locationId);

    // ── Determinar si un redeem es de tipo PrintPass™ ──
    const isPackRedeem = (r) => {
        const reward = rewards.find(rw => rw.$id === r.reward_id);
        return reward?.is_print_pack === true;
    };

    // ── Entrega normal (premios sin pack) ──
    const handleDeliver = async (redeemId) => {
        try {
            setDelivering(redeemId);
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'redeems', redeemId,
                { status: 'entregado', delivered_at: new Date().toISOString() }
            );
            setRedeems(prev => prev.map(r =>
                r.$id === redeemId
                    ? { ...r, status: 'entregado', delivered_at: new Date().toISOString() }
                    : r
            ));
            toast.success('Premio entregado correctamente');
        } catch { toast.error('Error al procesar la entrega'); }
        finally { setDelivering(null); }
    };

    // ── Abrir modal de confirmación activación PrintPass™ ──
    const openActivateModal = (redeem) => {
        setActivatingRedeem(redeem);
        setShowActivateModal(true);
    };

    // ── Activar PrintPass™: crea print_pack + marca redeem entregado ──
    const handleActivatePack = async () => {
        if (!activatingRedeem) return;
        const reward = rewards.find(rw => rw.$id === activatingRedeem.reward_id);
        if (!reward) { toast.error('No se encontró el premio'); return; }

        try {
            setActivating(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const now = new Date();
            const validityDays = reward.pack_validity_days ?? 30;
            const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

            // 1. Crear documento en print_packs
            await databases.createDocument(dbId, 'print_packs', ID.unique(), {
                client_id:          activatingRedeem.client_id,
                client_name:        activatingRedeem.client_name,
                reward_id:          reward.$id,
                reward_name:        reward.name,
                location_id:        locationId,
                location_name:      '', // se puede enriquecer si se tiene el nombre
                bw_a4_total:        reward.pack_bw_a4 ?? 0,
                bw_a4_remaining:    reward.pack_bw_a4 ?? 0,
                color_a4_total:     reward.pack_color_a4 ?? 0,
                color_a4_remaining: reward.pack_color_a4 ?? 0,
                foto_total:         reward.pack_foto_10x15 ?? 0,
                foto_remaining:     reward.pack_foto_10x15 ?? 0,
                bw_a3_total:        reward.pack_bw_a3 ?? 0,
                bw_a3_remaining:    reward.pack_bw_a3 ?? 0,
                activated_at:       now.toISOString(),
                expires_at:         expiresAt.toISOString(),
                status:             'activo',
            });

            // 2. Marcar redeem como entregado
            await databases.updateDocument(dbId, 'redeems', activatingRedeem.$id, {
                status: 'entregado',
                delivered_at: now.toISOString(),
            });

            setRedeems(prev => prev.map(r =>
                r.$id === activatingRedeem.$id
                    ? { ...r, status: 'entregado', delivered_at: now.toISOString() }
                    : r
            ));

            toast.success(`PrintPass™ activado para ${activatingRedeem.client_name} · Vence ${expiresAt.toLocaleDateString('es-AR')}`);
            setShowActivateModal(false);
            setActivatingRedeem(null);
        } catch (e) {
            console.error(e);
            toast.error('Error al activar el PrintPass™');
        } finally { setActivating(false); }
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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Gift className="text-primary shrink-0" size={28} /> Premios & Canjes
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Referencia del catálogo y gestión de entregas en esta sucursal.</p>
                </div>
                {/* Badge PrintPass™ activo para esta sucursal */}
                {locationHasPP && (
                    <div className="shrink-0 flex items-center gap-1.5 bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-full">
                        <Printer size={13} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">PrintPass™ activo</span>
                    </div>
                )}
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

            {/* ── Política PrintPass™ (colapsable) ── */}
            {locationHasPP && ppPolicy && (
                <div className="bg-primary/5 border border-primary/15 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setPolicyOpen(o => !o)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={15} className="text-primary" />
                            <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                                Política de uso PrintPass™
                            </span>
                        </div>
                        {policyOpen ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                    </button>
                    {policyOpen && (
                        <div className="px-5 pb-4 border-t border-primary/10">
                            <pre className="text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed mt-3 font-sans">
                                {ppPolicy}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                SECCIÓN 1 — CANJES PENDIENTES
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
                        {[...filteredRedeems].sort((a, b) => {
                            if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
                            if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
                            return 0;
                        }).map(r => {
                            const isPending = r.status === 'pendiente';
                            const isDelivering = delivering === r.$id;
                            const rewardData = rewards.find(rw => rw.$id === r.reward_id);
                            const imgUrl = rewardData?.image_id ? getImageUrl(rewardData.image_id) : '';
                            const isPack = rewardData?.is_print_pack === true;
                            const canActivatePP = isPack && locationHasPP && isPending;

                            return (
                                <div key={r.$id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition ${
                                        isPending
                                            ? canActivatePP
                                                ? 'bg-primary/8 border-primary/30 hover:border-primary/50'
                                                : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                                            : 'bg-card/30 border-white/5 opacity-60'
                                    }`}>

                                    {/* Miniatura */}
                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                        {imgUrl
                                            ? <img src={imgUrl} alt={r.reward_name} className="w-full h-full object-cover" />
                                            : isPack
                                                ? <Printer size={20} className="text-primary/50" />
                                                : <Gift size={20} className="text-gray-600" />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-primary font-black font-mono text-sm">{r.code}</span>
                                            {isPack && (
                                                <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                                    PrintPass™
                                                </span>
                                            )}
                                            {isPending
                                                ? <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20 animate-pulse">PENDIENTE</span>
                                                : <span className="text-[9px] font-black bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">ACTIVADO</span>
                                            }
                                        </div>
                                        <p className="text-white font-bold text-sm truncate mt-0.5">{r.reward_name}</p>
                                        <p className="text-gray-500 text-[11px]">
                                            {r.client_name} · {new Date(r.$createdAt).toLocaleDateString('es-AR')}
                                        </p>
                                        {/* Mostrar unidades del pack */}
                                        {isPack && rewardData && isPending && (
                                            <p className="text-[10px] text-primary mt-0.5 font-bold">
                                                {packSummary(rewardData)} · {rewardData.pack_validity_days ?? 30} días
                                            </p>
                                        )}
                                    </div>

                                    {/* Acción */}
                                    {isPending ? (
                                        canActivatePP ? (
                                            <button
                                                onClick={() => openActivateModal(r)}
                                                disabled={activating}
                                                className="shrink-0 bg-primary hover:bg-primary-glow text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 shadow-glow">
                                                <Zap size={14} /> Activar Pack
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleDeliver(r.$id)}
                                                disabled={isDelivering}
                                                className="shrink-0 bg-success hover:bg-success/80 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50">
                                                {isDelivering
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <><CheckCircle size={14} /> Entregar</>
                                                }
                                            </button>
                                        )
                                    ) : (
                                        <div className="shrink-0 text-right">
                                            {isPack
                                                ? <span className="text-[9px] text-primary font-black">Activado</span>
                                                : <span className="text-[10px] text-gray-600 font-mono">
                                                    {r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                  </span>
                                            }
                                        </div>
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
                    Premios disponibles para canje. Al activar un PrintPass™ el saldo queda disponible para el cliente en esta sucursal.
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
                            const isPack = reward.is_print_pack === true;
                            const pendingCount = pendingRedeems.filter(r => r.reward_id === reward.$id).length;

                            return (
                                <div key={reward.$id}
                                    className={`bg-card/40 border rounded-2xl overflow-hidden hover:border-white/20 transition group ${
                                        isPack ? 'border-primary/20' : 'border-white/10'
                                    }`}>

                                    <div className="relative h-36 bg-white/5 flex items-center justify-center overflow-hidden">
                                        {imgUrl
                                            ? <img src={imgUrl} alt={reward.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                            : <div className="flex flex-col items-center gap-2 text-gray-700">
                                                {isPack ? <Printer size={32} className="text-primary/30" /> : <ImageIcon size={32} />}
                                              </div>
                                        }
                                        {isPack && (
                                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-white text-[9px] font-black px-2 py-1 rounded-full">
                                                <Printer size={9} /> PrintPass™
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-black/70 text-warning text-[10px] font-black px-2 py-1 rounded-full border border-warning/30">
                                            {reward.points_required?.toLocaleString('es-AR')} pts
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        {reward.category && (
                                            <span className="text-[9px] text-primary font-black uppercase tracking-widest block mb-1">{reward.category}</span>
                                        )}
                                        <h3 className="text-sm font-black text-white">{reward.name}</h3>

                                        {isPack ? (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-[11px] text-primary font-bold">{packSummary(reward)}</p>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    <Clock size={10} /> {reward.pack_validity_days ?? 30} días de vigencia
                                                </div>
                                            </div>
                                        ) : (
                                            reward.description && (
                                                <p className="text-gray-500 text-[11px] mt-1 line-clamp-2">{reward.description}</p>
                                            )
                                        )}

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Package size={11} />
                                                Stock: <span className="text-white font-bold">{reward.stock}</span>
                                            </div>
                                            {pendingCount > 0 && (
                                                <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
                                                    {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                MODAL CONFIRMACIÓN ACTIVACIÓN PRINTPASS™
            ══════════════════════════════════════════════ */}
            {showActivateModal && activatingRedeem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }}
                        className="border border-primary/30 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                    <Zap size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
                                        Activar PrintPass™
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Confirmá la activación del pack</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowActivateModal(false); setActivatingRedeem(null); }}
                                className="p-2 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
        			    </div>

                        {/* Detalle del pack a activar */}
                        {(() => {
                            const reward = rewards.find(rw => rw.$id === activatingRedeem.reward_id);
                            const validityDays = reward?.pack_validity_days ?? 30;
                            const expiresDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
                            return (
                                <div className="space-y-4">
                                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Cliente</span>
                                            <span className="text-white font-black">{activatingRedeem.client_name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Pack</span>
                                            <span className="text-primary font-black">{activatingRedeem.reward_name}</span>
                                        </div>
                                        {reward && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Contenido</span>
                                                <span className="text-white font-bold text-xs text-right max-w-[180px]">{packSummary(reward)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Vence el</span>
                                            <span className="text-warning font-black">{expiresDate.toLocaleDateString('es-AR')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Sucursal válida</span>
                                            <span className="text-success font-black text-xs">Solo esta sucursal</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3">
                                        <AlertCircle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                                        <p className="text-yellow-400/80 text-xs">
                                            Una vez activado, el cliente podrá usar el saldo en sus próximas órdenes en esta sucursal. Esta acción no se puede deshacer.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { setShowActivateModal(false); setActivatingRedeem(null); }}
                                            className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleActivatePack}
                                            disabled={activating}
                                            className="flex-[2] py-3 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2">
                                            {activating
                                                ? <><Loader2 size={16} className="animate-spin" /> Activando...</>
                                                : <><Zap size={16} /> Confirmar Activación</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};
