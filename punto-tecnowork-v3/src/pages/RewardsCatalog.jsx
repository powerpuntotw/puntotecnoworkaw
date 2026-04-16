import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, storage } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import { STORAGE_BUCKETS } from '../lib/constants';
import toast from 'react-hot-toast';
import {
    Gift, Star, ArrowRight, Loader2, Info, CheckCircle,
    MapPin, Printer, Clock, ShieldCheck, AlertCircle,
    X, ChevronDown, ChevronUp, Zap, Package
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

export const RewardsCatalog = () => {
    const { user, dbUser, checkSession } = useAuth();
    const [rewards, setRewards]           = useState([]);
    const [locations, setLocations]       = useState([]);
    const [loading, setLoading]           = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);
    const [selectedLocationId, setSelectedLocationId] = useState('');

    // PrintPass™ config
    const [ppEnabledLocs, setPpEnabledLocs] = useState([]);
    const [ppPolicy, setPpPolicy]           = useState('');
    const [policyOpen, setPolicyOpen]       = useState(false);

    // Modal de aceptación de política para PrintPass™
    const [showPolicyModal, setShowPolicyModal]   = useState(false);
    const [pendingReward, setPendingReward]       = useState(null);
    const [policyAccepted, setPolicyAccepted]    = useState(false);
    const [policyScrolled, setPolicyScrolled]    = useState(false);

    const points = dbUser?.points ?? 0;

    const fetchRewards = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'rewards',
                [Query.equal('is_visible', true)]
            );
            setRewards(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchLocations = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'printing_locations',
                [Query.equal('status', 'activo'), Query.limit(50)]
            );
            setLocations(res.documents);
            if (res.documents.length > 0) setSelectedLocationId(res.documents[0].$id);
        } catch (e) { console.error(e); }
    };

    const fetchPPConfig = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'system_config',
                [Query.equal('type', 'printpass_config')]
            );
            if (res.documents.length > 0) {
                const data = JSON.parse(res.documents[0].data);
                if (data.enabled) {
                    setPpEnabledLocs(data.enabled_locations ?? []);
                    setPpPolicy(data.policy ?? '');
                }
            }
        } catch { }
    };

    useEffect(() => { fetchRewards(); fetchLocations(); fetchPPConfig(); }, []);

    // ── Canjear: si es PrintPass™ mostrar modal de política primero ──
    const handleRedeemClick = (reward) => {
        if (!selectedLocationId) { toast.error('Seleccioná una sucursal para retirar el premio.'); return; }

        if (reward.is_print_pack && ppPolicy) {
            // Verificar que la sucursal seleccionada tiene PrintPass™ activo
            if (!ppEnabledLocs.includes(selectedLocationId)) {
                toast.error('Esta sucursal no está habilitada para PrintPass™. Seleccioná otra.');
                return;
            }
            // Abrir modal de aceptación de política
            setPendingReward(reward);
            setPolicyAccepted(false);
            setPolicyScrolled(false);
            setShowPolicyModal(true);
            return;
        }
        // Premio normal → canjear directamente
        executeRedeem(reward);
    };

    const executeRedeem = async (reward) => {
        const cost = reward.points_required;
        try {
            setIsProcessing(reward.$id);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

            // 1. Fetch saldo fresco para evitar race condition
            const freshUser = await databases.getDocument(dbId, 'users', dbUser.$id);
            const freshPoints = freshUser.points ?? 0;
            if (freshPoints < cost) {
                toast.error(`Saldo insuficiente. Tenés ${freshPoints} pts, necesitás ${cost} pts.`);
                checkSession();
                return;
            }

            const locName = locations.find(l => l.$id === selectedLocationId)?.name ?? '';
            if (!window.confirm(`¿Canjear "${reward.name}" por ${cost} puntos?\nRetiro en: ${locName}`)) return;

            const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();

            // 2. Crear redeem
            await databases.createDocument(dbId, 'redeems', ID.unique(), {
                client_id:   user.$id,
                client_name: dbUser?.full_name || user.name,
                reward_id:   reward.$id,
                reward_name: reward.name,
                points_cost: cost,
                status:      'pendiente',
                code:        redeemCode,
                location_id: selectedLocationId,
            });

            // 3. Descontar puntos
            await databases.updateDocument(dbId, 'users', dbUser.$id, { points: freshPoints - cost });

            // 4. Decrementar stock
            if (reward.stock > 0) {
                await databases.updateDocument(dbId, 'rewards', reward.$id, { stock: reward.stock - 1 });
            }

            // 5. Log historial
            await databases.createDocument(dbId, 'points_history', ID.unique(), {
                client_id: user.$id,
                type:      'minus',
                amount:    cost,
                reason:    `Canje: ${reward.name}`,
            });

            toast.success(
                reward.is_print_pack
                    ? `¡PrintPass™ canjeado! El operador lo activará en sucursal.`
                    : `¡Canje exitoso! Código: ${redeemCode}`,
                { duration: 7000 }
            );
            checkSession();
            fetchRewards();
        } catch (e) {
            console.error('Redeem error:', e);
            toast.error('Error al procesar el canje.');
        } finally {
            setIsProcessing(null);
        }
    };

    // ── Confirmar desde modal de política ──
    const handleConfirmFromModal = () => {
        if (!policyAccepted) {
            toast.error('Debés aceptar la política para continuar.');
            return;
        }
        setShowPolicyModal(false);
        executeRedeem(pendingReward);
    };

    // Detectar si la sucursal seleccionada tiene PP activo
    const selectedLocHasPP = ppEnabledLocs.includes(selectedLocationId);

    return (
        <div className="space-y-10 pb-20">

            {/* Header con puntos */}
            <div className="relative rounded-[40px] overflow-hidden bg-gradient-hero p-[1px] shadow-2xl shadow-primary/20">
                <div className="bg-background/90 backdrop-blur-2xl rounded-[38px] p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5">
                    <div className="space-y-3 text-center md:text-left">
                        <h1 className="text-4xl font-black text-white italic tracking-tighter">Catálogo de <span className="text-primary">Premios</span></h1>
                        <p className="text-gray-400 max-w-md">Usá tus puntos acumulados para obtener descuentos y beneficios exclusivos.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[28px] px-10 py-6 flex flex-col items-center shadow-inner">
                        <Star size={28} className="text-yellow-400 mb-2" />
                        <div className="text-4xl font-black text-white">{(points ?? 0).toLocaleString('es-AR')}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">Puntos Disponibles</div>
                    </div>
                </div>
            </div>

            {/* Selector de sucursal */}
            {locations.length > 0 && (
                <div className="bg-card/50 border border-white/10 rounded-[28px] p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-primary shrink-0" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">¿Dónde retirás el premio?</h2>
                        </div>
                        {selectedLocHasPP && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                                <Printer size={9} /> PrintPass™ disponible
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {locations.map(loc => {
                            const hasPP = ppEnabledLocs.includes(loc.$id);
                            return (
                                <button key={loc.$id} onClick={() => setSelectedLocationId(loc.$id)}
                                    className={`text-left p-4 rounded-2xl border transition-all ${
                                        selectedLocationId === loc.$id
                                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                            : 'border-white/10 bg-white/5 hover:border-white/25'
                                    }`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-white truncate">{loc.name}</p>
                                        {hasPP && <Printer size={12} className="text-primary shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{loc.address}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Política PrintPass™ (colapsable, visible si hay política) */}
            {ppPolicy && (
                <div className="bg-primary/5 border border-primary/15 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setPolicyOpen(o => !o)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-primary" />
                            <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                                Política de uso PrintPass™
                            </span>
                        </div>
                        {policyOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </button>
                    {policyOpen && (
                        <div className="px-5 pb-4 border-t border-primary/10">
                            <pre className="text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed mt-3 font-sans">{ppPolicy}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Grilla de premios */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="h-72 bg-card/50 animate-pulse rounded-[28px]"/>)}
                </div>
            ) : rewards.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Gift size={56} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-bold uppercase tracking-widest">Sin premios disponibles</p>
                    <p className="text-sm mt-2">El administrador todavía no cargó el catálogo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map(reward => {
                        const cost         = reward.points_required;
                        const canRedeem    = (points ?? 0) >= cost;
                        const processing   = isProcessing === reward.$id;
                        const isPack       = reward.is_print_pack === true;
                        const imgUrl       = reward.image_id ? getImageUrl(reward.image_id) : '';
                        // PrintPass™ solo canjeable en sucursales habilitadas
                        const ppBlocked    = isPack && selectedLocationId && !ppEnabledLocs.includes(selectedLocationId);

                        return (
                            <div key={reward.$id}
                                className={`bg-card/50 border rounded-[28px] overflow-hidden group hover:border-primary/40 transition duration-500 shadow-xl flex flex-col ${
                                    isPack ? 'border-primary/20' : 'border-white/10'
                                }`}>
                                <div className="h-44 bg-white/5 relative overflow-hidden flex items-center justify-center">
                                    {imgUrl ? (
                                        <img src={imgUrl} alt={reward.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                                    ) : isPack ? (
                                        <Printer size={56} className="text-primary/20" />
                                    ) : (
                                        <Gift size={56} className="text-gray-700"/>
                                    )}

                                    {/* Badge PrintPass™ */}
                                    {isPack && (
                                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary text-white text-[9px] font-black px-2 py-1 rounded-full">
                                            <Printer size={9} /> PrintPass™
                                        </div>
                                    )}

                                    {/* Badge disponible */}
                                    {canRedeem && !ppBlocked && (
                                        <div className="absolute top-3 right-3 bg-success/80 px-2 py-1 rounded-full text-[9px] font-black text-white uppercase flex items-center gap-1">
                                            <CheckCircle size={10}/> Disponible
                                        </div>
                                    )}

                                    {/* Badge sucursal no habilitada para PP */}
                                    {ppBlocked && (
                                        <div className="absolute top-3 right-3 bg-yellow-500/80 px-2 py-1 rounded-full text-[9px] font-black text-white uppercase flex items-center gap-1">
                                            <AlertCircle size={10}/> Cambiar sucursal
                                        </div>
                                    )}

                                    {/* Puntos */}
                                    {!canRedeem && !ppBlocked && (
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-white border border-white/20">
                                            {cost.toLocaleString('es-AR')} pts
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    {reward.category && (
                                        <span className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">{reward.category}</span>
                                    )}
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition">{reward.name}</h3>

                                    {isPack ? (
                                        <div className="space-y-1.5 mb-4 flex-1">
                                            <p className="text-[11px] text-primary font-bold">{packSummary(reward)}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Clock size={10} /> {reward.pack_validity_days ?? 30} días de vigencia desde activación
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <MapPin size={10} /> Solo válido en la sucursal de activación
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <AlertCircle size={10} /> No genera cashback al usar
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-xs leading-relaxed mb-4 flex-1">{reward.description || 'Sin descripción.'}</p>
                                    )}

                                    {reward.stock !== undefined && (
                                        <p className="text-[10px] text-gray-600 mb-3 flex items-center gap-1">
                                            <Package size={10} /> Stock: {reward.stock}
                                        </p>
                                    )}

                                    {/* Puntos requeridos */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-2xl font-black text-warning">{cost.toLocaleString('es-AR')} pts</span>
                                        {isPack && <Zap size={16} className="text-primary" />}
                                    </div>

                                    <button
                                        onClick={() => handleRedeemClick(reward)}
                                        disabled={processing || !canRedeem || ppBlocked}
                                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                                            ppBlocked
                                                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 cursor-not-allowed'
                                                : canRedeem
                                                    ? isPack
                                                        ? 'bg-primary hover:bg-primary-glow text-white shadow-glow'
                                                        : 'bg-primary hover:bg-primary-glow text-white shadow-glow'
                                                    : 'bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed'
                                        }`}>
                                        {processing ? (
                                            <Loader2 className="animate-spin" size={16}/>
                                        ) : ppBlocked ? (
                                            <><AlertCircle size={14}/> Sucursal sin PrintPass™</>
                                        ) : canRedeem ? (
                                            isPack
                                                ? <><Printer size={14}/> Canjear PrintPass™</>
                                                : <><span>Canjear Ahora</span><ArrowRight size={14}/></>
                                        ) : (
                                            <span>Faltan {(cost - (points ?? 0)).toLocaleString('es-AR')} pts</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info general */}
            <div className="bg-indigo-500/5 border border-indigo-500/10 p-7 rounded-[36px] flex flex-col md:flex-row items-center gap-5">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0"><Info size={22}/></div>
                <div className="text-center md:text-left">
                    <h4 className="text-base font-bold text-white mb-1">¿Cómo funciona el canje?</h4>
                    <p className="text-sm text-gray-500">
                        Al canjear un premio normal recibís un código único. Para PrintPass™, el operador del local activa tu saldo directamente en el sistema.
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                MODAL ACEPTACIÓN POLÍTICA PRINTPASS™
            ══════════════════════════════════════════════ */}
            {showPolicyModal && pendingReward && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }}
                        className="border border-primary/30 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">

                        {/* Header */}
                        <div className="flex items-start justify-between p-8 pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={22} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
                                        Términos PrintPass™
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        Leé y aceptá antes de canjear
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowPolicyModal(false)} className="p-2 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Detalle del pack */}
                        <div className="px-8 pb-4 shrink-0">
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Printer size={14} className="text-primary" />
                                    <span className="text-white font-black text-sm">{pendingReward.name}</span>
                                </div>
                                <p className="text-[11px] text-primary font-bold">{packSummary(pendingReward)}</p>
                                <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={9} /> {pendingReward.pack_validity_days ?? 30} días de vigencia</span>
                                    <span className="flex items-center gap-1"><MapPin size={9} /> Solo en {locations.find(l => l.$id === selectedLocationId)?.name}</span>
                                    <span className="flex items-center gap-1"><AlertCircle size={9} /> Sin cashback al usar</span>
                                </div>
                            </div>
                        </div>

                        {/* Política scrollable */}
                        <div className="px-8 shrink-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2 flex items-center gap-1">
                                <ShieldCheck size={10} /> Política de uso completa
                            </p>
                        </div>
                        <div
                            className="mx-8 rounded-2xl border border-white/10 bg-black/30 overflow-y-auto flex-1 min-h-[140px] max-h-[200px]"
                            onScroll={(e) => {
                                const el = e.target;
                                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                                    setPolicyScrolled(true);
                                }
                            }}>
                            <pre className="text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed p-4 font-sans">
                                {ppPolicy}
                            </pre>
                            {!policyScrolled && (
                                <div className="sticky bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-2 bg-gradient-to-t from-black/60 to-transparent text-[9px] text-gray-500 pointer-events-none">
                                    <ChevronDown size={12} className="animate-bounce" /> Desplazate para leer todo
                                </div>
                            )}
                        </div>

                        {/* Aceptación */}
                        <div className="p-8 pt-5 space-y-4 shrink-0">
                            <button
                                onClick={() => setPolicyAccepted(v => !v)}
                                className={`w-full flex items-start gap-3 p-4 rounded-2xl border transition text-left ${
                                    policyAccepted
                                        ? 'bg-primary/10 border-primary/30'
                                        : 'bg-white/3 border-white/10 hover:border-white/20'
                                }`}>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                                    policyAccepted ? 'bg-primary border-primary' : 'border-gray-600'
                                }`}>
                                    {policyAccepted && <CheckCircle size={12} className="text-white" />}
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Leí y acepto la política de uso del PrintPass™. Entiendo que el pack es personal, intransferible, válido únicamente en la sucursal seleccionada y que su mal uso puede resultar en la revocación del beneficio.
                                </p>
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPolicyModal(false)}
                                    className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmFromModal}
                                    disabled={!policyAccepted || isProcessing === pendingReward?.$id}
                                    className="flex-[2] py-3 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2">
                                    {isProcessing === pendingReward?.$id
                                        ? <><Loader2 size={16} className="animate-spin" /> Canjeando...</>
                                        : <><Printer size={16} /> Confirmar Canje</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
