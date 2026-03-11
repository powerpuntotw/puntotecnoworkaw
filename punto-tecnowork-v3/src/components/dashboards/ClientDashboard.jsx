import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Gift, Home, Clock, Star, Trophy, ArrowRight, Zap, Target } from 'lucide-react';
import { Link } from 'react-router';

export const ClientDashboard = () => {
    const { user, dbUser } = useAuth();
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const points = dbUser?.points || 0;
    const historicalPoints = dbUser?.historical_points || points; // Fallback to current if historical not found

    // Tier calculation logic
    const getTierInfo = (pts) => {
        if (pts >= 10000) return { name: 'Leyenda', icon: <Trophy className="text-yellow-400" />, next: 'Nivel Máximo', progress: 100, color: 'from-yellow-500 to-amber-600' };
        if (pts >= 5000) return { name: 'Platino', icon: <Star className="text-blue-300" />, next: '10,000 pts para Leyenda', progress: (pts/10000)*100, color: 'from-blue-400 to-indigo-600' };
        if (pts >= 2000) return { name: 'Oro', icon: <Target className="text-yellow-500" />, next: '5,000 pts para Platino', progress: (pts/5000)*100, color: 'from-yellow-400 to-orange-500' };
        if (pts >= 500) return { name: 'Plata', icon: <Zap className="text-gray-300" />, next: '2,000 pts para Oro', progress: (pts/2000)*100, color: 'from-gray-300 to-slate-500' };
        return { name: 'Bronce', icon: <Zap className="text-orange-400" />, next: '500 pts para Plata', progress: (pts/500)*100, color: 'from-orange-400 to-red-600' };
    };

    const tier = getTierInfo(historicalPoints);

    const fetchRecentOrders = async () => {
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'orders', [
                Query.equal('client_id', user.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(5)
            ]);
            setRecentOrders(res.documents);
        } catch (error) {
            console.error("Error fetching client orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.$id) fetchRecentOrders();
    }, [user?.$id]);

    return (
        <div className="space-y-8 pb-10">
            {/* Cabecera de Bienvenida y Puntos */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-glow">
                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${tier.color} opacity-10 blur-3xl -mr-20 -mt-20`}></div>
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.color} shadow-lg`}>
                                {tier.icon}
                             </div>
                             <span className="text-sm font-bold tracking-widest text-gray-400 uppercase">Nivel {tier.name}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white">¡Hola, {user?.name?.split(' ')[0]}!</h1>
                        <p className="text-gray-400 mt-2">Tienes <span className="text-white font-bold">{points.toLocaleString()} puntos</span> disponibles para canjear.</p>
                    </div>
                    <Link to="/rewards" className="group bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-bold transition flex items-center gap-3 shadow-glow">
                        <Gift size={22} /> Canjear Puntos 
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                    </Link>
                </div>

                {/* Barra de Progreso a Siguiente Nivel */}
                <div className="mt-10 space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                        <span className="text-gray-500">Progreso hacia el siguiente nivel</span>
                        <span className="text-primary-glow">{tier.next}</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={`h-full bg-gradient-to-r ${tier.color} transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                            style={{ width: `${tier.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mis Pedidos Recientes */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <Clock className="text-primary" /> Pedidos Recientes
                        </h2>
                        <Link to="/history" className="text-sm text-gray-500 hover:text-primary transition underline underline-offset-4">Ver todo el historial</Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-card/30 animate-pulse rounded-2xl" />)
                        ) : recentOrders.length === 0 ? (
                            <div className="bg-card/30 border border-white/5 rounded-2xl p-10 text-center">
                                <p className="text-gray-500">Aún no has realizado pedidos.</p>
                                <Link to="/orders/new" className="text-primary hover:underline mt-2 inline-block">¡Empieza ahora!</Link>
                            </div>
                        ) : (
                            recentOrders.map(order => (
                                <div key={order.$id} className="bg-card/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary transition">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white uppercase tracking-tighter italic">#{order.order_number || order.$id.substring(0,8).toUpperCase()}</div>
                                            <div className="text-xs text-gray-500 mt-1">{new Date(order.$createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-sm font-medium text-gray-300 capitalize">{order.status || 'Recibida'}</div>
                                            <div className="text-[10px] text-gray-500 tracking-widest uppercase">Estado</div>
                                        </div>
                                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-white">${(order.total_amount || 0).toLocaleString()}</div>
                                            <div className="text-xs text-primary-glow font-bold">+{Math.round((order.total_amount || 0) * 0.1)} pts</div>
                                        </div>
                                        <ArrowRight size={20} className="text-gray-700 group-hover:text-white transition" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Acciones Rápidas / Stats */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute -bottom-6 -right-6 text-indigo-500/10 group-hover:scale-125 transition duration-500">
                            <Target size={120} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Puntos Acumulados</h3>
                        <div className="text-4xl font-black text-white mb-4 italic">{historicalPoints.toLocaleString()} <span className="text-sm not-italic font-normal text-indigo-400">Ptos históricos</span></div>
                        <p className="text-xs text-gray-400 leading-relaxed">Cada impresión te acerca más al nivel Platino y beneficios exclusivos.</p>
                    </div>

                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Atajos Rápidos</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/orders/new" className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex flex-col items-center gap-2 transition border border-white/5">
                                <FileText className="text-primary-glow" />
                                <span className="text-[10px] font-bold uppercase">Imprimir</span>
                            </Link>
                            <Link to="/tickets" className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl flex flex-col items-center gap-2 transition border border-white/5">
                                <MessageSquare className="text-secondary" />
                                <span className="text-[10px] font-bold uppercase">Soporte</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple imports for icons used but missing in this scope
import { FileText, MessageSquare } from 'lucide-react';
