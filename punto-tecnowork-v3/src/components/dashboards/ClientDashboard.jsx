import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { TierCalculator, ORDER_STATUS } from '../../lib/constants';
import {
    Gift, Clock, Star, Trophy, ArrowRight, Zap, Target,
    Package, FileText, MessageSquare, Printer, AlertCircle,
    ShieldCheck, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router';

// ─── Barra de progreso de saldo del pack ────────────────────
const PackBar = ({ label, used, total, color = 'bg-primary' }) => {
    if (total === 0) return null;
    const pct = Math.round((used / total) * 100);
    const remaining = total - used;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-500 font-bold uppercase tracking-wide">{label}</span>
                <span className="text-white font-black">{remaining}<span className="text-gray-600 font-normal"> / {total}</span></span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(2, 100 - pct)}%` }}
                />
            </div>
        </div>
    );
};

// ─── Días restantes del pack ─────────────────────────────────
const daysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const ClientDashboard = () => {
    const { user, dbUser } = useAuth();
    const [recentOrders, setRecentOrders]   = useState([]);
    const [loading, setLoading]             = useState(true);
    const [printPacks, setPrintPacks]       = useState([]);
    const [loadingPacks, setLoadingPacks]   = useState(true);
    const [ppPolicy, setPpPolicy]           = useState('');
    const [policyOpen, setPolicyOpen]       = useState(false);

    const points           = dbUser?.points ?? 0;
    const historicalPoints = dbUser?.historical_points ?? 0;
    const tierCalc         = new TierCalculator(historicalPoints);
    const tierInfo         = tierCalc.toInfo();

    const TIER_ICONS = {
        DIAMOND: <Trophy className="text-[#0093D8]" />,
        GOLD:    <Star   className="text-[#FFC905]" />,
        SILVER:  <Target className="text-[#9CA3AF]" />,
        BRONZE:  <Zap    className="text-[#6B7280]" />,
    };
    const tier = { ...tierInfo, icon: TIER_ICONS[tierInfo.key], color: tierInfo.gradient };

    // ── Fetch órdenes recientes ──
    const fetchRecentOrders = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders', [
                    Query.equal('client_id', user.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(5)
                ]
            );
            setRecentOrders(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // ── Fetch PrintPass™ activos ──
    const fetchPrintPacks = async () => {
        try {
            setLoadingPacks(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [packsRes, ppRes] = await Promise.all([
                databases.listDocuments(dbId, 'print_packs', [
                    Query.equal('client_id', user.$id),
                    Query.notEqual('status', 'revocado'),
                    Query.orderDesc('activated_at'),
                    Query.limit(10),
                ]),
                databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', 'printpass_config')
                ]),
            ]);

            // Lazy expiration
            const now = new Date();
            const processed = [];
            for (const pack of packsRes.documents) {
                if (pack.status === 'activo' && pack.expires_at && new Date(pack.expires_at) < now) {
                    try {
                        await databases.updateDocument(dbId, 'print_packs', pack.$id, { status: 'expirado' });
                        processed.push({ ...pack, status: 'expirado' });
                    } catch { processed.push(pack); }
                } else {
                    processed.push(pack);
                }
            }
            setPrintPacks(processed);

            if (ppRes.documents.length > 0) {
                const data = JSON.parse(ppRes.documents[0].data);
                if (data.enabled) setPpPolicy(data.policy ?? '');
            }
        } catch (e) { console.error(e); }
        finally { setLoadingPacks(false); }
    };

    useEffect(() => {
        if (user?.$id) { fetchRecentOrders(); fetchPrintPacks(); }
    }, [user?.$id]);

    const activePacks  = printPacks.filter(p => p.status === 'activo');
    const expiredPacks = printPacks.filter(p => p.status === 'expirado');
    const hasPacks     = printPacks.length > 0;

    return (
        <div className="space-y-8 pb-10">

            {/* ── Hero / Tier ── */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-glow">
                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${tier.color} opacity-10 blur-3xl -mr-20 -mt-20`}></div>
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.color} shadow-lg shadow-black/20`}>{tier.icon}</div>
                            <span className="text-sm font-bold tracking-widest text-gray-400 uppercase">Tier {tier.name}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">¡Hola, {user?.name?.split(' ')[0]}!</h1>
                        <p className="text-gray-400 mt-2 font-medium">Tenés <span className="text-primary font-bold">{points.toLocaleString('es-AR')} puntos</span> para canjear.</p>
                    </div>
                    <Link to="/rewards" className="group bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-black transition flex items-center gap-3 shadow-glow ring-1 ring-white/10">
                        <Gift size={22} /> Catálogo de Premios <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                    </Link>
                </div>
                <div className="mt-10 space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-500">Progreso de Tier</span>
                        <span className="text-primary">{tier.next}</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                        <div className={`h-full bg-gradient-to-r ${tier.color} transition-all duration-1000 rounded-full`} style={{ width: `${Math.min(tier.progress, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                WIDGET PRINTPASS™ — solo si hay packs
            ══════════════════════════════════════════════ */}
            {(hasPacks || loadingPacks) && (
                <div className="space-y-3">
                    <h2 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                        <Printer size={18} className="text-primary" /> Mis PrintPass™
                    </h2>

                    {loadingPacks ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2].map(i => <div key={i} className="h-36 bg-card/30 animate-pulse rounded-2xl border border-white/5" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Packs activos */}
                            {activePacks.map(pack => {
                                const days = daysLeft(pack.expires_at);
                                const expiringSoon = days !== null && days <= 5;
                                const totalUnits = (pack.bw_a4_total || 0) + (pack.color_a4_total || 0) +
                                                   (pack.foto_total || 0) + (pack.bw_a3_total || 0);
                                const remainingUnits = (pack.bw_a4_remaining || 0) + (pack.color_a4_remaining || 0) +
                                                       (pack.foto_remaining || 0) + (pack.bw_a3_remaining || 0);
                                const pctUsed = totalUnits > 0 ? Math.round(((totalUnits - remainingUnits) / totalUnits) * 100) : 0;

                                return (
                                    <div key={pack.$id}
                                        className={`rounded-2xl border p-5 space-y-4 ${
                                            expiringSoon
                                                ? 'bg-yellow-500/5 border-yellow-500/20'
                                                : 'bg-primary/5 border-primary/15'
                                        }`}>

                                        {/* Header del pack */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Printer size={13} className="text-primary" />
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">PrintPass™ Activo</span>
                                                </div>
                                                <h3 className="text-sm font-black text-white">{pack.reward_name}</h3>
                                                <p className="text-[10px] text-gray-500 mt-0.5">{pack.location_name || 'Sucursal asignada'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {expiringSoon ? (
                                                    <span className="flex items-center gap-1 text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20 animate-pulse">
                                                        <AlertCircle size={9} /> {days}d restantes
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-gray-500 font-bold">
                                                        <Clock size={9} className="inline mr-0.5" />
                                                        {days !== null ? `${days} días` : '—'}
                                                    </span>
                                                )}
                                                <p className="text-[9px] text-gray-600 mt-1">
                                                    Vence {pack.expires_at ? new Date(pack.expires_at).toLocaleDateString('es-AR') : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Barras de saldo por tipo */}
                                        <div className="space-y-2.5">
                                            <PackBar label="B&N A4"    used={pack.bw_a4_total - pack.bw_a4_remaining}       total={pack.bw_a4_total}      color="bg-gray-400" />
                                            <PackBar label="Color A4"  used={pack.color_a4_total - pack.color_a4_remaining}  total={pack.color_a4_total}   color="bg-primary" />
                                            <PackBar label="Fotos"     used={pack.foto_total - pack.foto_remaining}           total={pack.foto_total}       color="bg-secondary" />
                                            <PackBar label="B&N A3"    used={pack.bw_a3_total - pack.bw_a3_remaining}        total={pack.bw_a3_total}      color="bg-warning" />
                                        </div>

                                        {/* Resumen total */}
                                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                                            <span className="text-gray-500">Saldo total restante</span>
                                            <span className={`font-black ${remainingUnits === 0 ? 'text-gray-600' : 'text-white'}`}>
                                                {remainingUnits} / {totalUnits} unidades
                                            </span>
                                        </div>

                                        {/* Aviso expiración */}
                                        {expiringSoon && (
                                            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5">
                                                <AlertCircle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                                                <p className="text-yellow-400/80 text-[10px]">
                                                    Tu pack vence en {days} día{days !== 1 ? 's' : ''}. Usalo antes de que expire.
                                                </p>
                                            </div>
                                        )}

                                        {/* Botón usar */}
                                        {remainingUnits > 0 && (
                                            <Link to="/orders/new"
                                                className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-black uppercase rounded-xl py-2.5 transition">
                                                <Zap size={13} /> Usar en nueva orden
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Packs revocados */}
                            {printPacks.filter(p => p.status === 'revocado').map(pack => (
                                <div key={pack.$id} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-red-400" />
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Pack Revocado</span>
                                    </div>
                                    <p className="text-sm font-black text-white">{pack.reward_name}</p>
                                    {pack.revoked_reason && (
                                        <p className="text-[11px] text-gray-500">Motivo: {pack.revoked_reason}</p>
                                    )}
                                    <p className="text-[10px] text-gray-600">
                                        Podés apelar abriendo un ticket de soporte dentro de 7 días.
                                    </p>
                                    <Link to="/tickets"
                                        className="inline-flex items-center gap-1.5 text-[10px] font-black text-primary hover:underline mt-1">
                                        <MessageSquare size={11} /> Abrir ticket de apelación
                                    </Link>
                                </div>
                            ))}

                            {/* Packs expirados (últimos 2, colapsados) */}
                            {expiredPacks.slice(0, 2).map(pack => (
                                <div key={pack.$id} className="rounded-2xl border border-white/5 bg-white/2 p-4 opacity-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Expirado</span>
                                            <p className="text-sm font-bold text-gray-500">{pack.reward_name}</p>
                                        </div>
                                        <span className="text-[9px] text-gray-600">
                                            {pack.expires_at ? new Date(pack.expires_at).toLocaleDateString('es-AR') : ''}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Política PrintPass™ (colapsable) */}
                    {ppPolicy && (
                        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mt-2">
                            <button
                                onClick={() => setPolicyOpen(o => !o)}
                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={13} className="text-gray-500" />
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Política de uso PrintPass™</span>
                                </div>
                                {policyOpen ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                            </button>
                            {policyOpen && (
                                <div className="px-5 pb-4 border-t border-white/5">
                                    <pre className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed mt-3 font-sans">{ppPolicy}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
                            <Clock className="text-primary" /> Historial Reciente
                        </h2>
                        <Link to="/history" className="text-xs font-bold text-gray-500 hover:text-primary transition underline underline-offset-4 uppercase tracking-widest">Ver Todo</Link>
                    </div>
                    <div className="space-y-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-card/30 animate-pulse rounded-2xl border border-white/5" />)
                        ) : recentOrders.length === 0 ? (
                            <div className="bg-card/30 border border-white/5 rounded-3xl p-16 text-center">
                                <Package size={48} className="mx-auto text-gray-700 mb-4" />
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Todavía no realizaste pedidos.</p>
                                <Link to="/orders/new" className="text-primary font-black mt-4 inline-block underline decoration-2 underline-offset-4">¡IMPRIMIR AHORA!</Link>
                            </div>
                        ) : (
                            recentOrders.map(order => {
                                const statusInfo = ORDER_STATUS[order.status] || ORDER_STATUS.pendiente;
                                return (
                                    <div key={order.$id} className="bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:border-primary/50 transition shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-primary/20 group-hover:text-primary transition duration-500 border border-white/5">
                                                {order.pack_id ? <Printer size={24} className="text-primary/60" /> : <Package size={28} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white italic tracking-tighter uppercase line-clamp-1 flex items-center gap-2">
                                                    #{order.order_number || order.$id.substring(0,8).toUpperCase()}
                                                    {order.pack_id && (
                                                        <span className="text-[8px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">PP™</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium mt-1">{new Date(order.$createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-6">
                                            <span className={`hidden sm:inline-flex text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                            <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-white italic tracking-tight">
                                                    ${(order.total_price || 0).toLocaleString('es-AR')}
                                                </div>
                                                {order.pack_id ? (
                                                    <div className="text-[10px] text-primary font-black uppercase flex items-center gap-0.5 justify-end">
                                                        <Zap size={9} /> Pack usado
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-success font-black uppercase">
                                                        +{order.points_earned || Math.round((order.total_price || 0) * 0.1)} pts
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2 rounded-xl bg-white/5 text-gray-600 group-hover:text-white group-hover:bg-primary transition duration-500">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl">
                        <div className="absolute -bottom-6 -right-6 text-primary/10 group-hover:scale-125 transition duration-700"><Target size={160} /></div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Total Acumulado</h3>
                        <div className="text-5xl font-black text-white mb-6 italic tracking-tight leading-none group-hover:text-primary transition duration-500">
                            {historicalPoints.toLocaleString('es-AR')}
                            <span className="block text-xs not-italic font-bold text-gray-600 uppercase mt-2 tracking-widest">Puntos históricos</span>
                        </div>
                        {/* Resumen rápido de packs activos */}
                        {activePacks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-2">PrintPass™ activos</p>
                                {activePacks.map(p => {
                                    const rem = (p.bw_a4_remaining||0)+(p.color_a4_remaining||0)+(p.foto_remaining||0)+(p.bw_a3_remaining||0);
                                    return (
                                        <div key={p.$id} className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-400 truncate max-w-[120px]">{p.reward_name}</span>
                                            <span className="text-primary font-black shrink-0">{rem} ud.</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-glow">
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Acceso Directo</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/orders/new" className="bg-white/5 hover:bg-primary/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition border border-white/5 group ring-offset-black hover:ring-2 hover:ring-primary/50">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/20 transition duration-500"><FileText className="text-primary" size={20} /></div>
                                <span className="text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition tracking-widest text-center">Nueva Impresión</span>
                            </Link>
                            <Link to="/tickets" className="bg-white/5 hover:bg-secondary/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition border border-white/5 group ring-offset-black hover:ring-2 hover:ring-secondary/50">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-secondary/20 transition duration-500"><MessageSquare className="text-secondary" size={20} /></div>
                                <span className="text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition tracking-widest text-center">Ayuda Directa</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
