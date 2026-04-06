import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, TrendingDown, Clock, Loader2, Calendar, History } from 'lucide-react';

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
            setHistory([]); // sin datos demo — mostrar vacío real
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, [user?.$id]);

    return (
        <div className="space-y-6 max-w-4xl pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-hero bg-clip-text text-transparent">Historial de Puntos</h1>
                    <p className="text-gray-400 mt-2">Seguimiento detallado de tus ingresos y canjes.</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <Calendar size={16} className="text-primary" />
                    <span className="text-xs text-gray-400">Últimos 50 movimientos</span>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" /></div>
                ) : history.length === 0 ? (
                    <div className="py-20 text-center text-gray-600">
                        <History size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-sm">Sin movimientos de puntos</p>
                        <p className="text-xs mt-2 text-gray-700">Tus puntos ganados y canjeados aparecerán aquí.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {history.map(item => (
                            <div key={item.$id} className="p-5 sm:p-6 flex items-center justify-between group hover:bg-white/5 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${item.type === 'plus' ? 'bg-success/10 border-success/20 text-success' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                                        {item.type === 'plus' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{item.reason}</h4>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                            <Clock size={11} /> {new Date(item.$createdAt).toLocaleString('es-AR', { hour12: false })}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xl font-black italic shrink-0 ml-4 ${item.type === 'plus' ? 'text-success' : 'text-red-400'}`}>
                                    {item.type === 'plus' ? '+' : '-'}{(item.amount || 0).toLocaleString('es-AR', { hour12: false })}
                                    <span className="text-[10px] not-italic font-normal opacity-60 ml-1">pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl text-center">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Tip</p>
                <p className="text-sm text-gray-300">Los puntos se acreditan automáticamente al confirmar la entrega de cada pedido.</p>
            </div>
        </div>
    );
};
