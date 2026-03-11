import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Ticket, Search, CheckCircle, Clock, Gift, Loader2, Scan } from 'lucide-react';

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
            toast.success("Premio marcado como entregado.");
        } catch (error) {
            toast.error("Error al procesar entrega.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2 rotate-2"><Ticket className="text-primary-glow" /> Validación de Canjes</h1>
                    <p className="text-gray-400 mt-1">Busca códigos y entrega los premios físicos.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Escanear código..."
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                            className="w-full bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-primary transition"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="py-4 px-6">Código / Fecha</th>
                                    <th className="py-4 px-6">Cliente</th>
                                    <th className="py-4 px-6">Premio</th>
                                    <th className="py-4 px-6">Estado</th>
                                    <th className="py-4 px-6 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {redeems.filter(r => r.code?.includes(searchCode)).map(redeem => (
                                    <tr key={redeem.$id} className="hover:bg-white/5 transition group">
                                        <td className="py-4 px-6 font-mono">
                                            <div className="text-primary-glow font-bold text-sm tracking-wider">{redeem.code || redeem.$id.substring(0,8).toUpperCase()}</div>
                                            <div className="text-[10px] text-gray-500 mt-1">{new Date(redeem.$createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-medium text-white">{redeem.client_name}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <Gift size={14} className="text-warning" />
                                                <span className="text-sm text-gray-300">{redeem.reward_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {redeem.status === 'entregado' ? (
                                                <span className="text-[10px] font-black uppercase text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">Entregado</span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">Pendiente</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {redeem.status === 'pendiente' && (
                                                <button 
                                                    onClick={() => handleDeliver(redeem.$id)}
                                                    className="bg-success hover:bg-success/80 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition shadow-lg"
                                                >
                                                    Entregar
                                                </button>
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
