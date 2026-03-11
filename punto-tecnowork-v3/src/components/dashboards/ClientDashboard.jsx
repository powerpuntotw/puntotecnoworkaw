import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Gift, Clock, Star, Trophy, ArrowRight, Zap, Target, Package, FileText, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';

export const ClientDashboard = () => {
    const { user, dbUser } = useAuth();
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const points = dbUser?.points || 0;
    const historicalPoints = dbUser?.historical_points || points;

    // Tier calculation logic aligned with brand request
    const getTierInfo = (pts) => {
        if (pts >= 5000) return { 
            name: 'Diamond', 
            icon: <Trophy className="text-[#0093D8]" />, 
            next: 'Nivel Máximo', 
            progress: 100, 
            color: 'from-[#0093D8] to-[#007ba1]' 
        };
        if (pts >= 2000) return { 
            name: 'Gold', 
            icon: <Star className="text-[#FFC905]" />, 
            next: '5,000 pts para Diamond', 
            progress: (pts/5000)*100, 
            color: 'from-[#FFC905] to-[#cc9f04]' 
        };
        if (pts >= 500) return { 
            name: 'Silver', 
            icon: <Target className="text-[#9CA3AF]" />, 
            next: '2,000 pts para Gold', 
            progress: (pts/2000)*100, 
            color: 'from-[#9CA3AF] to-[#6b7280]' 
        };
        return { 
            name: 'Bronze', 
            icon: <Zap className="text-[#6B7280]" />, 
            next: '500 pts para Silver', 
            progress: (pts/500)*100, 
            color: 'from-[#6B7280] to-[#4b5563]' 
        };
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
                             <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.color} shadow-lg shadow-black/20`}>
                                {tier.icon}
                             </div>
                             <span className="text-sm font-bold tracking-widest text-gray-400 uppercase">Tier {tier.name}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">¡Hola, {user?.name?.split(' ')[0]}!</h1>
                        <p className="text-gray-400 mt-2 font-medium">Tienes <span className="text-primary font-bold">{points.toLocaleString()} puntos</span> para canjear.</p>
                    </div>
                    <Link to="/rewards" className="group bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-black transition flex items-center gap-3 shadow-glow ring-1 ring-white/10">
                        <Gift size={22} /> Catálogo de Premios 
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                    </Link>
                </div>

                {/* Barra de Progreso a Siguiente Nivel */}
                <div className="mt-10 space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-500">Progreso de Tier</span>
                        <span className="text-primary">{tier.next}</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                        <div 
                            className={`h-full bg-gradient-to-r ${tier.color} transition-all duration-1000 rounded-full`}
                            style={{ width: `${tier.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mis Pedidos Recientes */}
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
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Aún no has realizado pedidos.</p>
                                <Link to="/orders/new" className="text-primary hover:text-primary-glow font-black mt-4 inline-block underline decoration-2 underline-offset-4">¡IMPRIMIR AHORA!</Link>
                            </div>
                        ) : (
                            recentOrders.map(order => (
                                <div key={order.$id} className="bg-card/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:border-primary/50 transition shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-primary/20 group-hover:text-primary transition duration-500 border border-white/5">
                                            <Package size={28} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white italic tracking-tighter uppercase line-clamp-1">#{order.order_number || order.$id.substring(0,8).toUpperCase()}</div>
                                            <div className="text-xs text-gray-500 font-medium mt-1">{new Date(order.$createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-xs font-black text-white uppercase tracking-widest">{order.status || 'Recibida'}</div>
                                            <div className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Estado</div>
                                        </div>
                                        <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-white italic tracking-tight">${(order.total_amount || 0).toLocaleString()}</div>
                                            <div className="text-[10px] text-success font-black uppercase">+{Math.round((order.total_amount || 0) * 0.1)} pts</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/5 text-gray-600 group-hover:text-white group-hover:bg-primary transition duration-500">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Acciones Rápidas / Stats */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl">
                        <div className="absolute -bottom-6 -right-6 text-primary/10 group-hover:scale-125 transition duration-700">
                            <Target size={160} />
                        </div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Total Acumulado</h3>
                        <div className="text-5xl font-black text-white mb-6 italic tracking-tight leading-none group-hover:text-primary transition duration-500">
                            {historicalPoints.toLocaleString()} 
                            <span className="block text-xs not-italic font-bold text-gray-600 uppercase mt-2 tracking-widest">Puntos en Carrera</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">Cada impresión en PuntoTecnowork te acerca a beneficios exclusivos de nivel **{tier.name}**.</p>
                    </div>

                    <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-glow">
                        <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Acceso Directo</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/orders/new" className="bg-white/5 hover:bg-primary/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition border border-white/5 group ring-offset-black hover:ring-2 hover:ring-primary/50">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/20 transition duration-500">
                                    <FileText className="text-primary" size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition tracking-widest text-center">Nueva Impresión</span>
                            </Link>
                            <Link to="/tickets" className="bg-white/5 hover:bg-secondary/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition border border-white/5 group ring-offset-black hover:ring-2 hover:ring-secondary/50">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-secondary/20 transition duration-500">
                                    <MessageSquare className="text-secondary" size={20} />
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-400 group-hover:text-white transition tracking-widest text-center">Ayuda Directa</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
