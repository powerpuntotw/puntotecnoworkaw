import { useState, useEffect } from 'react';
import { storage, databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { STORAGE_BUCKETS } from '../../lib/constants';
import toast from 'react-hot-toast';
import { RewardService } from '../../services/RewardService';
import {
    Gift, Loader2, Image as ImageIcon, CheckCircle,
    Clock, Scan, Star, Printer,
    Zap, AlertCircle, X, ShieldCheck, ChevronDown, ChevronUp,
    Search, History, ChevronRight
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
    const [activeTab, setActiveTab] = useState('canjes'); // canjes, catalogo, historial

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
            const docs = await RewardService.listRedeems({ locationId });
            setRedeems(docs);
        } catch (e) {
            console.error('Error fetching redeems:', e);
        } finally {
            setLoadingRedeems(false);
        }
    };

    useEffect(() => {
        fetchPPConfig();
        fetchRewards();
        fetchRedeems();
    }, [locationId]);

    // ── Verificar si esta sucursal tiene PrintPass™ activo ──
    const locationHasPP = ppEnabled && ppEnabledLocs.includes(locationId);

    // ── Entrega normal (premios sin pack) ──
    const handleDeliver = async (redeemId) => {
        try {
            setDelivering(redeemId);
            const updated = await RewardService.deliverReward(redeemId);
            
            setRedeems(prev => prev.map(r =>
                r.$id === redeemId ? updated : r
            ));
            toast.success('Premio entregado correctamente');
        } catch (e) {
            console.error('Deliver error:', e);
            toast.error('Error al procesar la entrega');
        } finally {
            setDelivering(null);
        }
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
            const updatedRedeem = await RewardService.activatePrintPass({
                redeem: activatingRedeem,
                reward,
                locationId
            });

            setRedeems(prev => prev.map(r =>
                r.$id === activatingRedeem.$id ? updatedRedeem : r
            ));

            toast.success(`PrintPass™ activado para ${activatingRedeem.client_name}`);
            setShowActivateModal(false);
            setActivatingRedeem(null);
        } catch (e) {
            console.error('Activation error:', e);
            toast.error('Error al activar el PrintPass™');
        } finally {
            setActivating(false);
        }
    };

    // ── Filtros ──
    const pendingRedeems = redeems.filter(r => r.status === 'pendiente');
    const deliveredRedeems = redeems.filter(r => r.status === 'entregado');
    const filteredDelivered = deliveredRedeems.filter(r =>
        !searchCode ||
        r.code?.toUpperCase().includes(searchCode) ||
        r.client_name?.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.reward_name?.toLowerCase().includes(searchCode.toLowerCase())
    );

    return (
        <>
            {/* ── Tabs Selector (Solo Mobile) ── */}
            <div className="flex md:hidden bg-card/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-1 gap-1 sticky top-0 z-20 shadow-xl overflow-x-auto no-scrollbar">
                {[
                    { id: 'canjes',   label: 'Pendientes', icon: Clock,   count: pendingRedeems.length, color: 'text-primary' },
                    { id: 'catalogo', label: 'Catálogo',   icon: Star,    count: rewards.length,        color: 'text-warning' },
                    { id: 'historial',label: 'Historial',  icon: History, count: deliveredRedeems.length, color: 'text-success' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 min-w-[80px] ${activeTab === tab.id ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}>
                        <div className="flex items-center gap-1.5">
                            <tab.icon size={12} className={activeTab === tab.id ? tab.color : ''} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                        </div>
                        <span className={`text-[10px] font-black mt-0.5 ${activeTab === tab.id ? tab.color : 'text-gray-600'}`}>{tab.count}</span>
                        {activeTab === tab.id && <div className={`h-0.5 w-4 mt-1 rounded-full ${tab.color.replace('text-', 'bg-')}`} />}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ── COLUMNA IZQUIERDA: GESTIÓN OPERATIVA ── */}
                <div className={`lg:col-span-12 space-y-8 ${activeTab === 'catalogo' ? 'hidden md:block' : 'block'}`}>
                    
                    {/* ══════════════════════════════════════════════
                        SECCIÓN 1 — CANJES PENDIENTES
                    ══════════════════════════════════════════════ */}
                    <div className={activeTab === 'historial' ? 'hidden md:block' : 'block'}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                                <Clock size={22} className="text-primary" />
                                Canjes por Entregar
                                {pendingRedeems.length > 0 && (
                                    <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                                        {pendingRedeems.length}
                                    </span>
                                )}
                            </h2>
                            <div className="relative w-full sm:w-72 group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition" />
                                <input
                                    type="text"
                                    placeholder="Código, cliente o premio..."
                                    value={searchCode}
                                    onChange={e => setSearchCode(e.target.value.toUpperCase())}
                                    className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white text-sm font-bold outline-none focus:border-primary transition"
                                />
                            </div>
                        </div>

                        {loadingRedeems ? (
                            <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
                        ) : pendingRedeems.length === 0 ? (
                            <div className="bg-card/20 border-2 border-dashed border-white/5 rounded-[2.5rem] py-16 flex flex-col items-center gap-4 text-gray-600">
                                <CheckCircle size={48} className="opacity-20 text-success" />
                                <div className="text-center">
                                    <p className="text-sm font-black uppercase tracking-widest text-white/50">Todo al día</p>
                                    <p className="text-[11px] font-bold mt-1">No hay canjes pendientes en esta sucursal.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingRedeems.filter(r => 
                                    !searchCode || 
                                    r.code?.toUpperCase().includes(searchCode) || 
                                    r.client_name?.toLowerCase().includes(searchCode.toLowerCase()) ||
                                    r.reward_name?.toLowerCase().includes(searchCode.toLowerCase())
                                ).map(r => {
                                    const isDelivering = delivering === r.$id;
                                    const rewardData = rewards.find(rw => rw.$id === r.reward_id);
                                    const imgUrl = rewardData?.image_id ? getImageUrl(rewardData.image_id) : '';
                                    const isPack = rewardData?.is_print_pack === true;
                                    const canActivatePP = isPack && locationHasPP;

                                    return (
                                        <div key={r.$id} onClick={() => canActivatePP ? openActivateModal(r) : handleDeliver(r.$id)}
                                            className={`group relative overflow-hidden bg-card/40 border-2 rounded-[2rem] p-5 cursor-pointer transition-all active:scale-[0.98] ${
                                                canActivatePP ? 'border-primary/20 hover:border-primary/40' : 'border-white/5 hover:border-success/30'
                                            }`}>
                                            
                                            <div className="relative z-10 flex gap-4">
                                                {/* Miniatura Pro */}
                                                <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {imgUrl
                                                        ? <img src={imgUrl} alt={r.reward_name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                                        : isPack
                                                            ? <Printer size={24} className="text-primary/50" />
                                                            : <Gift size={24} className="text-gray-600" />
                                                    }
                                                    {isPack && (
                                                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-glow" />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-primary font-black font-mono text-[10px] bg-primary/10 px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest leading-none">
                                                            #{r.code}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase">{new Date(r.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <h4 className="text-white font-black text-sm truncate uppercase tracking-tight group-hover:text-primary transition">{r.reward_name}</h4>
                                                    <p className="text-gray-400 font-bold text-[11px] truncate flex items-center gap-1.5 mt-0.5">
                                                        <Clock size={10} className="text-gray-600" /> {r.client_name}
                                                    </p>
                                                    
                                                    {isPack && rewardData && (
                                                        <div className="mt-2 text-[10px] text-primary/80 font-black uppercase tracking-wider bg-primary/10 w-fit px-2 py-1 rounded-lg border border-primary/20">
                                                            PrintPass™ · {packSummary(rewardData)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="shrink-0 flex items-center pl-2">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                        canActivatePP ? 'bg-primary text-white shadow-glow' : 'bg-success text-white'
                                                    }`}>
                                                        {isDelivering || activating ? <Loader2 size={18} className="animate-spin" /> : canActivatePP ? <Zap size={18} /> : <CheckCircle size={18} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Decor • Subtle Glow Background */}
                                            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-[40px] opacity-10 transition ${canActivatePP ? 'bg-primary group-hover:opacity-30' : 'bg-success group-hover:opacity-20'}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ══════════════════════════════════════════════
                        SECCIÓN 2 — HISTORIAL (CANJES ENTREGADOS)
                    ══════════════════════════════════════════════ */}
                    <div className={activeTab === 'canjes' ? 'hidden md:block' : 'block'}>
                        <div className="flex items-center gap-3 mb-6">
                            <History size={22} className="text-success" />
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Historial de Entregas</h2>
                            <span className="text-[10px] text-gray-500 font-bold uppercase px-3 py-1 bg-white/5 rounded-full border border-white/5">{deliveredRedeems.length} total</span>
                        </div>

                        {deliveredRedeems.length === 0 ? (
                            <div className="py-10 text-center text-gray-600 italic text-sm">No hay entregas registradas aún.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredDelivered.slice(0, 15).map(r => (
                                    <div key={r.$id} className="flex items-center gap-4 p-4 rounded-2xl bg-card/20 border border-white/5 backdrop-blur-sm opacity-70 hover:opacity-100 transition">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                                            {r.reward_name.toLowerCase().includes('pack') ? <Printer size={16} /> : <Gift size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-400 font-mono">#{r.code}</span>
                                                <span className="text-[9px] font-black text-success uppercase">Entregado</span>
                                            </div>
                                            <p className="text-gray-300 font-bold text-xs truncate uppercase mt-0.5">{r.reward_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">{new Date(r.delivered_at || r.$createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{new Date(r.delivered_at || r.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── COLUMNA DERECHA: CATÁLOGO DE REFERENCIA ── */}
                <div className={`lg:col-span-12 space-y-6 ${activeTab === 'catalogo' ? 'block' : 'hidden md:block'}`}>
                    <div className="bg-card/30 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 rounded-full blur-[100px]" />
                        
                        <div className="relative z-10 mb-8">
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Star size={26} className="text-warning" />
                                Catálogo de Referencia
                            </h2>
                            <p className="text-gray-400 text-xs mt-2 font-medium max-w-lg">
                                Consulta el stock y los puntos requeridos para cada recompensa activa en el sistema.
                            </p>
                        </div>

                        {loadingRewards ? (
                            <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {rewards.map(reward => {
                                    const imgUrl = reward.image_id ? getImageUrl(reward.image_id) : '';
                                    const isPack = reward.is_print_pack === true;
                                    const pc = pendingRedeems.filter(r => r.reward_id === reward.$id).length;

                                    return (
                                        <div key={reward.$id}
                                            className={`group bg-dark/40 border-2 rounded-3xl overflow-hidden hover:border-white/20 transition-all ${
                                                isPack ? 'border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]' : 'border-white/5'
                                            }`}>
                                            
                                            <div className="relative h-32 bg-white/5 flex items-center justify-center overflow-hidden">
                                                {imgUrl
                                                    ? <img src={imgUrl} alt={reward.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                                                    : <div className="flex flex-col items-center gap-2 text-gray-700">
                                                        {isPack ? <Printer size={32} className="text-primary/30" /> : <ImageIcon size={32} className="opacity-20" />}
                                                      </div>
                                                }
                                                <div className="absolute top-3 left-3 flex flex-col gap-2">
                                                    {isPack && (
                                                        <div className="flex items-center gap-1.5 bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-xl backdrop-blur-md uppercase">
                                                            <Printer size={9} /> PrintPass™
                                                        </div>
                                                    )}
                                                    <div className="bg-black/80 backdrop-blur-md text-warning text-[10px] font-black px-2.5 py-1 rounded-lg border border-warning/20 shadow-xl uppercase">
                                                        {reward.points_required?.toLocaleString()} pts
                                                    </div>
                                                </div>
                                                {pc > 0 && (
                                                    <div className="absolute top-3 right-3 bg-primary text-white text-[9px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-glow animate-pulse">
                                                        {pc}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 bg-white/5">
                                                <h3 className="text-xs font-black text-white italic uppercase truncate tracking-tight">{reward.name}</h3>
                                                
                                                {isPack ? (
                                                    <p className="text-[10px] text-primary font-black uppercase mt-1 tracking-widest leading-relaxed">{packSummary(reward)}</p>
                                                ) : (
                                                    <p className="text-gray-500 text-[10px] font-bold mt-1 line-clamp-1 italic uppercase">{reward.category || 'Recompensa'}</p>
                                                )}

                                                <div className="flex items-center justify-between mt-4">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${reward.stock > 0 ? 'bg-success/10 text-success border-success/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        {reward.stock > 0 ? `Stock: ${reward.stock}` : 'Sin Stock'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 opacity-30 hover:opacity-100 transition pointer-events-none">
                                                        <ChevronRight size={14} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Política PrintPass™ ── */}
                    {locationHasPP && ppPolicy && (
                        <div className="bg-primary/5 border border-primary/10 rounded-3xl overflow-hidden shadow-2xl">
                            <button
                                onClick={() => setPolicyOpen(o => !o)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition group">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className="text-primary group-hover:scale-110 transition" />
                                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">
                                        Protocolo de Uso PrintPass™
                                    </span>
                                </div>
                                {policyOpen ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />}
                            </button>
                            {policyOpen && (
                                <div className="px-8 pb-6 bg-dark/20 border-t border-primary/10 animate-in slide-in-from-top duration-300">
                                    <div className="prose prose-invert prose-sm max-w-none mt-4">
                                        <pre className="text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed font-sans bg-transparent p-0">
                                            {ppPolicy}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showActivateModal && activatingRedeem && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }}
                        className="border-t sm:border border-primary/30 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] p-8 sm:p-10 shadow-3xl relative overflow-hidden animate-in slide-in-from-bottom duration-300">
                        
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[1.25rem] bg-primary/20 border border-primary/30 flex items-center justify-center shadow-glow">
                                    <Zap size={28} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                                        Activar PrintPass™
                                    </h2>
                                    <p className="text-primary/60 text-[10px] font-black tracking-widest uppercase mt-2">Operación Irreversible</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowActivateModal(false); setActivatingRedeem(null); }}
                                className="p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
        			    </div>

                        {/* Detalle del pack a activar */}
                        {(() => {
                            const reward = rewards.find(rw => rw.$id === activatingRedeem.reward_id);
                            const validityDays = reward?.pack_validity_days ?? 30;
                            const expiresDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
                            return (
                                <div className="space-y-6 relative z-10">
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Titular</span>
                                            <span className="text-white font-black italic">{activatingRedeem.client_name}</span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4 text-sm border-b border-white/5 pb-3">
                                            <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Beneficio</span>
                                            <div className="text-right">
                                                <p className="text-primary font-black italic uppercase tracking-tight leading-none">{activatingRedeem.reward_name}</p>
                                                {reward && <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">{packSummary(reward)}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-1">
                                            <div className="space-y-1">
                                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Vencimiento</span>
                                                <p className="text-warning font-black text-sm tracking-tight">{expiresDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Crédito</span>
                                                <p className="text-success font-black text-sm tracking-tight">Disponible hoy</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                                        <AlertCircle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                                        <p className="text-yellow-400/80 text-[11px] font-medium leading-relaxed">
                                            Al confirmar, el saldo se acreditará en la cuenta del cliente para ser usado exclusivamente en esta sucursal. Asegúrate de verificar la identidad del cliente.
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-4 sm:pb-0">
                                        <button
                                            onClick={() => { setShowActivateModal(false); setActivatingRedeem(null); }}
                                            className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10">
                                            No, Cancelar
                                        </button>
                                        <button
                                            onClick={handleActivatePack}
                                            disabled={activating}
                                            className="flex-[2] py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-40 uppercase text-sm tracking-tighter italic flex items-center justify-center gap-3">
                                            {activating
                                                ? <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                                                : <><Zap size={18} /> Activar PrintPass™</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </>
    );
};
