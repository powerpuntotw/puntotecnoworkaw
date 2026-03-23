import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, storage } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Gift, Star, ArrowRight, Loader2, Info, CheckCircle } from 'lucide-react';

export const RewardsCatalog = () => {
    const { user, dbUser, checkSession } = useAuth();
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null); // reward.$id del que se está procesando

    const points = dbUser?.points ?? 0;

    const fetchRewards = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'rewards',
                [Query.equal('is_visible', true)]
            );
            setRewards(res.documents);
        } catch (error) {
            console.error("Error fetching rewards:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRewards(); }, []);

    const handleRedeem = async (reward) => {
        const cost = reward.points_required; // FIX: campo correcto del schema
        if ((points ?? 0) < cost) { toast.error("No tenés puntos suficientes."); return; }
        if (!window.confirm(`¿Canjear "${reward.name}" por ${cost} puntos?`)) return;
        try {
            setIsProcessing(reward.$id);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            // 1. Crear redeem
            await databases.createDocument(dbId, 'redeems', ID.unique(), {
                client_id: user.$id,
                client_name: dbUser?.full_name || user.name,
                reward_id: reward.$id,
                reward_name: reward.name,
                points_cost: cost,
                status: 'pendiente',
                code: redeemCode
            });
            // 2. Restar puntos
            await databases.updateDocument(dbId, 'users', dbUser.$id, {
                points: (points ?? 0) - cost
            });
            // 3. Log en historial
            await databases.createDocument(dbId, 'points_history', ID.unique(), {
                client_id: user.$id,
                type: 'minus',
                amount: cost,
                reason: `Canje: ${reward.name}`
            });
            toast.success(`¡Canje exitoso! Código: ${redeemCode}`, { duration: 7000 });
            checkSession(); // Refrescar puntos en contexto
        } catch (error) {
            console.error("Redeem error:", error);
            toast.error("Error al procesar el canje.");
        } finally {
            setIsProcessing(null);
        }
    };

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
                        <div className="text-4xl font-black text-white">{(points ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">Puntos Disponibles</div>
                    </div>
                </div>
            </div>

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
                        const cost = reward.points_required; // campo correcto
                        const canRedeem = (points ?? 0) >= cost;
                        const processing = isProcessing === reward.$id;
                        return (
                            <div key={reward.$id} className="bg-card/50 border border-white/10 rounded-[28px] overflow-hidden group hover:border-primary/40 transition duration-500 shadow-xl flex flex-col">
                                <div className="h-44 bg-white/5 relative overflow-hidden flex items-center justify-center">
                                    {reward.image_id ? (
                                        <img src={storage.getFilePreview('rewards_images', reward.image_id)} alt={reward.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700"/>
                                    ) : (
                                        <Gift size={56} className="text-gray-700"/>
                                    )}
                                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-white border border-white/20">
                                        {cost.toLocaleString()} pts
                                    </div>
                                    {canRedeem && (
                                        <div className="absolute top-3 left-3 bg-success/80 px-2 py-1 rounded-full text-[9px] font-black text-white uppercase flex items-center gap-1">
                                            <CheckCircle size={10}/> Disponible
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    {reward.category && <span className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">{reward.category}</span>}
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition">{reward.name}</h3>
                                    <p className="text-gray-500 text-xs leading-relaxed mb-4 flex-1">{reward.description || 'Sin descripción.'}</p>
                                    {reward.stock !== undefined && <p className="text-[10px] text-gray-600 mb-3">Stock: {reward.stock}</p>}
                                    <button onClick={() => handleRedeem(reward)} disabled={processing || !canRedeem}
                                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 ${canRedeem ? 'bg-primary hover:bg-primary-glow text-white shadow-glow' : 'bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed'}`}>
                                        {processing ? <Loader2 className="animate-spin" size={16}/> : canRedeem
                                            ? <><span>Canjear Ahora</span><ArrowRight size={14}/></>
                                            : <span>Faltan {(cost - (points ?? 0)).toLocaleString()} pts</span>
                                        }
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="bg-indigo-500/5 border border-indigo-500/10 p-7 rounded-[36px] flex flex-col md:flex-row items-center gap-5">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0"><Info size={22}/></div>
                <div className="text-center md:text-left">
                    <h4 className="text-base font-bold text-white mb-1">¿Cómo funciona el canje?</h4>
                    <p className="text-sm text-gray-500">Al canjear recibís un código único. Presentalo en cualquier sucursal adherida para retirar tu premio.</p>
                </div>
            </div>
        </div>
    );
};
