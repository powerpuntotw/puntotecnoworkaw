import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, storage } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Gift, Star, ShoppingBag, ArrowRight, Loader2, Info } from 'lucide-react';

export const RewardsCatalog = () => {
    const { user, dbUser, fetchDBUser } = useAuth();
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const points = dbUser?.points || 0;

    const fetchRewards = async () => {
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'rewards', [
                Query.equal('is_active', true)
            ]);
            setRewards(res.documents);
        } catch (error) {
            console.error("Error fetching rewards:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const handleRedeem = async (reward) => {
        if (points < reward.points_cost) {
            toast.error("No tienes puntos suficientes.");
            return;
        }

        const confirm = window.confirm(`¿Seguro que quieres canjear "${reward.name}" por ${reward.points_cost} puntos?`);
        if (!confirm) return;

        try {
            setIsProcessing(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

            // 1. Create Redeem Document
            const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            await databases.createDocument(dbId, 'redeems', ID.unique(), {
                client_id: user.$id,
                client_name: user.name,
                reward_id: reward.$id,
                reward_name: reward.name,
                points_cost: reward.points_cost,
                status: 'pendiente',
                code: redeemCode,
                // Assumed to be redeemed at any local for now, 
                // or user selects one in a more complex flow
            });

            // 2. Subtract Points from User
            await databases.updateDocument(dbId, 'users', dbUser.$id, {
                points: points - reward.points_cost
            });

            // 3. Log into Points History
            await databases.createDocument(dbId, 'points_history', ID.unique(), {
                client_id: user.$id,
                type: 'minus',
                amount: reward.points_cost,
                reason: `Canje de premio: ${reward.name}`
            });

            toast.success("¡Canje exitoso! Usa el código " + redeemCode + " en tu sucursal.", { duration: 6000 });
            fetchDBUser(); // Refresh user points
        } catch (error) {
            console.error("Redeem error:", error);
            toast.error("Error al procesar el canje.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="relative rounded-[40px] overflow-hidden bg-gradient-hero p-1 w-full shadow-2xl shadow-primary/20">
                <div className="bg-background/90 backdrop-blur-2xl rounded-[38px] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5">
                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="text-5xl font-black text-white italic tracking-tighter">Catálogo de <span className="text-primary-glow">Premios</span></h1>
                        <p className="text-gray-400 text-lg max-w-md">Utiliza tus puntos acumulados para obtener descuentos y productos exclusivos.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col items-center shadow-inner group">
                         <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary-glow mb-4 shadow-glow group-hover:scale-110 transition duration-500">
                            <Star size={32} />
                         </div>
                         <div className="text-4xl font-black text-white">{points.toLocaleString()}</div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-2">Puntos Disponibles</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="h-80 bg-card/50 animate-pulse rounded-[32px]" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {rewards.map(reward => (
                        <div key={reward.$id} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden group hover:border-primary/50 transition duration-500 shadow-xl flex flex-col h-full">
                            <div className="h-48 bg-white/5 relative overflow-hidden">
                                {reward.image_id ? (
                                    <img 
                                        src={storage.getFilePreview(import.meta.env.VITE_STORAGE_BUCKET_ID || 'default', reward.image_id)} 
                                        alt={reward.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                        <Gift size={64} />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs font-black text-white">
                                    {reward.points_cost} PTS
                                </div>
                            </div>
                            <div className="p-8 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-glow transition">{reward.name}</h3>
                                <p className="text-gray-500 text-xs leading-relaxed mb-6 flex-1">{reward.description || 'Sin descripción disponible.'}</p>
                                
                                <button 
                                    onClick={() => handleRedeem(reward)}
                                    disabled={isProcessing || points < reward.points_cost}
                                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-3 ${
                                        points >= reward.points_cost 
                                        ? 'bg-primary hover:bg-primary-glow text-white shadow-glow' 
                                        : 'bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : (
                                        <>
                                            {points >= reward.points_cost ? 'Canjear Ahora' : 'Faltan ' + (reward.points_cost - points) + ' pts'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-indigo-500/5 border border-indigo-500/10 p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <Info size={24} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-lg font-bold text-white mb-1">¿Cómo funciona el canje?</h4>
                    <p className="text-sm text-gray-500">Una vez que canjees tus puntos, obtendrás un código único. Presenta este código en cualquier sucursal adherida para retirar tu premio físico.</p>
                </div>
            </div>
        </div>
    );
};
