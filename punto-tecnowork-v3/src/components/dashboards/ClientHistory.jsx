import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import { History, TrendingUp, TrendingDown, Clock, Search, Loader2, Calendar } from 'lucide-react';

export const ClientHistory = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        if (!user?.$id) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'points_history', [
                Query.equal('client_id', user.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]);
            setHistory(res.documents);
        } catch (error) {
            console.error("Error fetching points history:", error);
            // Demo fallback
            setHistory([
                { $id: '1', type: 'plus', amount: 450, reason: 'Pedido #7890 (10%)', $createdAt: new Date().toISOString() },
                { $id: '2', type: 'minus', amount: 2000, reason: 'Canje: Cupon de descuento $500', $createdAt: new Date(Date.now() - 3600000*24).toISOString() },
                { $id: '3', type: 'plus', amount: 120, reason: 'Pedido #7852 (10%)', $createdAt: new Date(Date.now() - 3600000*48).toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user?.$id]);

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-hero bg-clip-text text-transparent">Historial de Puntos</h1>
                    <p className="text-gray-400 mt-2">Seguimiento detallado de tus ingresos y canjes.</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <Calendar size={18} className="text-primary-glow" />
                    <span className="text-xs text-gray-400">Filtrar por periodo</span>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="divide-y divide-white/5 text-slate-100">
                        {history.map(item => (
                            <div key={item.$id} className="p-6 flex items-center justify-between group hover:bg-white/5 transition">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.type === 'plus' ? 'bg-success/10 border-success/20 text-success' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                                        {item.type === 'plus' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white tracking-wide">{item.reason}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <Clock size={12} /> {new Date(item.$createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xl font-black italic ${item.type === 'plus' ? 'text-success' : 'text-red-400'}`}>
                                    {item.type === 'plus' ? '+' : '-'}{item.amount.toLocaleString()} <span className="text-xs not-italic font-normal opacity-60">pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-center justify-center gap-4 text-center">
                <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Tip de Ahorro</p>
                    <p className="text-sm text-gray-300">¡Recuerda que tus puntos vencen a los 12 meses de haberlos obtenido! Canjéalos antes.</p>
                </div>
            </div>
        </div>
    );
};
