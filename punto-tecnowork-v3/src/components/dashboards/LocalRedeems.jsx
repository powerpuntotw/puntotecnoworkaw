import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Ticket, Search, CheckCircle, Clock, Gift, Loader2, Scan, ChevronRight } from 'lucide-react';

export const LocalRedeems = ({ locationId }) => {
    const [redeems, setRedeems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchCode, setSearchCode] = useState('');

    const fetchRedeems = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'redeems', [
                Query.equal('location_id', locationId),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]);
            setRedeems(res.documents);
        } catch (error) {
            console.error("Error fetching redeems:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRedeems();
    }, [locationId]);

    const handleDeliver = async (redeemId) => {
        try {
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'redeems',
                redeemId,
                { status: 'entregado', delivered_at: new Date().toISOString() }
            );
            setRedeems(redeems.map(r => r.$id === redeemId ? { ...r, status: 'entregado' } : r));
            toast.success("Premio entregado correctamente", {
                style: { background: '#1a1a1a', color: '#fff', borderRadius: '15px' }
            });
        } catch (error) {
            toast.error("Error al procesar entrega.");
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        <Ticket className="text-primary" size={32} /> Gestión de Canjes
                    </h1>
                    <p className="text-gray-400 font-medium mt-1">Busca códigos de redención y valida entregas físicas.</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Scan size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition" />
                    <input
                        type="text"
                        placeholder="Código de canje..."
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                        className="w-full bg-card/50 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white font-bold outline-none focus:border-primary transition shadow-inner"
                    />
                </div>
            </div>

            <div className="bg-card/30 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
                
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic border-b border-white/5">
                                    <th className="py-6 px-8">Identificación</th>
                                    <th className="py-6 px-8">Beneficiario</th>
                                    <th className="py-6 px-8">Recompensa</th>
                                    <th className="py-6 px-8">Estado Actual</th>
                                    <th className="py-6 px-8 text-right">Mesa de Entrega</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {redeems.filter(r => r.code?.includes(searchCode) || r.$id.includes(searchCode)).map(redeem => (
                                    <tr key={redeem.$id} className="hover:bg-white/5 transition group relative">
                                        <td className="py-6 px-8">
                                            <div className="text-primary font-black text-lg font-mono tracking-tighter italic uppercase group-hover:scale-105 transition-transform origin-left">
                                                {redeem.code || redeem.$id.substring(0,8).toUpperCase()}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{new Date(redeem.$createdAt).toLocaleDateString()} • {new Date(redeem.$createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className="text-sm font-black text-white italic tracking-tight">{redeem.client_name || 'Cliente Verificado'}</div>
                                            <div className="text-[9px] text-gray-600 font-bold uppercase mt-1">ID: {redeem.client_id?.substring(0,10)}...</div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-accent/10 rounded-xl border border-accent/20">
                                                    <Gift size={16} className="text-accent" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-300 italic uppercase tracking-tighter">{redeem.reward_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8">
                                            {redeem.status === 'entregado' ? (
                                                <span className="flex items-center gap-2 text-[9px] font-black uppercase text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20 w-fit italic">
                                                    <CheckCircle size={10} /> Entregado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-[9px] font-black uppercase text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 w-fit italic animate-pulse">
                                                    <Clock size={10} /> Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            {redeem.status === 'pendiente' ? (
                                                <button 
                                                    onClick={() => handleDeliver(redeem.$id)}
                                                    className="bg-success hover:bg-success/80 text-white text-xs font-black px-6 py-3 rounded-xl transition shadow-glow flex items-center gap-2 justify-center ml-auto group/btn italic tracking-tighter"
                                                >
                                                    Entregar <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            ) : (
                                                <div className="text-[10px] text-gray-600 font-mono italic font-bold">
                                                    {redeem.delivered_at ? new Date(redeem.delivered_at).toLocaleTimeString() : '--:--'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
