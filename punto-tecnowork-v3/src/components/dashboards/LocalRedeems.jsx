import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RewardService } from '../../services/RewardService';
import { Ticket, CheckCircle, Clock, Gift, Loader2, Scan, ChevronRight } from 'lucide-react';

export const LocalRedeems = ({ locationId }) => {
    const [redeems, setRedeems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchCode, setSearchCode] = useState('');

    const fetchRedeems = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const docs = await RewardService.listRedeems({ locationId });
            setRedeems(docs);
        } catch (e) {
            console.error('Error fetching redeems:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRedeems(); }, [locationId]);

    const handleDeliver = async (id) => {
        try {
            const updated = await RewardService.deliverReward(id);
            setRedeems(redeems.map(r => r.$id === id ? updated : r));
            toast.success('Premio entregado correctamente');
        } catch (e) {
            console.error('Deliver error:', e);
            toast.error('Error al procesar entrega.');
        }
    };

    const filtered = redeems.filter(r => r.code?.includes(searchCode) || r.$id.includes(searchCode));

    const StatusBadge = ({ status }) => status === 'entregado'
        ? <span className="flex items-center gap-1 text-[10px] font-black text-success bg-success/10 px-2 py-1 rounded-full border border-success/20 w-fit"><CheckCircle size={10} /> Entregado</span>
        : <span className="flex items-center gap-1 text-[10px] font-black text-accent bg-accent/10 px-2 py-1 rounded-full border border-accent/20 w-fit animate-pulse"><Clock size={10} /> Pendiente</span>;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Ticket className="text-primary shrink-0" size={28} /> Gestión de Canjes
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Busca códigos y valida entregas.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Scan size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Código de canje..." value={searchCode} onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                        className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3 text-white font-bold outline-none focus:border-primary transition" />
                </div>
            </div>
            {loading ? (
                <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="sm:hidden space-y-3">
                        {filtered.map(r => (
                            <div key={r.$id} className="bg-card/40 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-primary font-black font-mono">{r.code || r.$id.substring(0, 8).toUpperCase()}</span>
                                    <StatusBadge status={r.status} />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300"><Gift size={14} className="text-accent shrink-0" />{r.reward_name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{new Date(r.$createdAt).toLocaleDateString()}</span>
                                    {r.status === 'pendiente' && (
                                        <button onClick={() => handleDeliver(r.$id)} className="bg-success hover:bg-success/80 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1">
                                            Entregar <ChevronRight size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="py-16 text-center text-gray-500 italic">Sin canjes registrados.</div>}
                    </div>
                    {/* Desktop: tabla */}
                    <div className="hidden sm:block bg-card/30 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                        <th className="py-5 px-6">Código</th>
                                        <th className="py-5 px-6 hidden md:table-cell">Beneficiario</th>
                                        <th className="py-5 px-6">Recompensa</th>
                                        <th className="py-5 px-6">Estado</th>
                                        <th className="py-5 px-6 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(r => (
                                        <tr key={r.$id} className="hover:bg-white/5 transition">
                                            <td className="py-5 px-6">
                                                <div className="text-primary font-black font-mono">{r.code || r.$id.substring(0, 8).toUpperCase()}</div>
                                                <div className="text-[10px] text-gray-500 mt-1">{new Date(r.$createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="py-5 px-6 hidden md:table-cell text-sm font-bold text-white">{r.client_name || 'Cliente'}</td>
                                            <td className="py-5 px-6"><div className="flex items-center gap-2"><Gift size={14} className="text-accent shrink-0" /><span className="text-sm text-gray-300">{r.reward_name}</span></div></td>
                                            <td className="py-5 px-6"><StatusBadge status={r.status} /></td>
                                            <td className="py-5 px-6 text-right">
                                                {r.status === 'pendiente'
                                                    ? <button onClick={() => handleDeliver(r.$id)} className="bg-success hover:bg-success/80 text-white text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 ml-auto">Entregar <ChevronRight size={14} /></button>
                                                    : <span className="text-[10px] text-gray-600 font-mono">{r.delivered_at ? new Date(r.delivered_at).toLocaleTimeString() : '--:--'}</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
