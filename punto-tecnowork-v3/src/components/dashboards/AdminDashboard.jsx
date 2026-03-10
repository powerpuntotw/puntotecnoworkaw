import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';

export const AdminDashboard = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        users: 0,
        points: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminStats = async () => {
            try {
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                
                // Fetch Orders (we might need pagination if it's > 100, assuming < 100 for now or getting all queries)
                // Appwrite's listDocuments returns a 'total' property we can use for counts easily.
                const ordersRes = await databases.listDocuments(dbId, 'orders', [Query.limit(500)]);
                
                // Calculate Revenue from non-cancelled orders
                const totalRevenue = ordersRes.documents
                    .filter(order => order.status !== 'cancelado')
                    .reduce((sum, order) => sum + (order.unit_price || 0), 0);

                // Fetch Users count
                const usersRes = await databases.listDocuments(dbId, 'users', [Query.limit(1)]);

                // Fetch Points
                const pointsRes = await databases.listDocuments(dbId, 'points_accounts', [Query.limit(500)]);
                const totalPoints = pointsRes.documents.reduce((sum, acc) => sum + (acc.total_points || 0), 0);

                setStats({
                    revenue: totalRevenue,
                    orders: ordersRes.total,
                    users: usersRes.total,
                    points: totalPoints
                });

            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminStats();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-white/5 shadow-xl glass">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Panel de Administración</h1>
                    <p className="text-sm text-gray-400 mt-1">Control Global y Estadísticas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border-l-4 border-success rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
                    <p className="text-gray-400 text-sm font-medium">Ingresos Totales (Global)</p>
                    <p className="text-2xl font-bold text-white mt-2">
                        {loading ? <span className="animate-pulse w-20 h-8 bg-white/10 rounded block"></span> : `$${stats.revenue.toLocaleString()}`}
                    </p>
                </div>
                <div className="bg-white/5 border-l-4 border-primary rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
                    <p className="text-gray-400 text-sm font-medium">Órdenes Procesadas</p>
                    <p className="text-2xl font-bold text-white mt-2">
                        {loading ? <span className="animate-pulse w-16 h-8 bg-white/10 rounded block"></span> : stats.orders.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white/5 border-l-4 border-secondary rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
                    <p className="text-gray-400 text-sm font-medium">Usuarios Registrados</p>
                    <p className="text-2xl font-bold text-white mt-2">
                        {loading ? <span className="animate-pulse w-16 h-8 bg-white/10 rounded block"></span> : stats.users.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white/5 border-l-4 border-warning rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group">
                    <p className="text-gray-400 text-sm font-medium">Puntos Latentes</p>
                    <p className="text-2xl font-bold text-white mt-2">
                        {loading ? <span className="animate-pulse w-16 h-8 bg-white/10 rounded block"></span> : stats.points.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl border border-white/5 p-6 h-80 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-500 mb-2">[ Área de Gráfico Recharts - Ventas ]</p>
                        <div className="w-full h-32 bg-secondary/10 border-b-2 border-secondary rounded-lg"></div>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border border-white/5 p-6 h-80 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-500 mb-2">[ Área de Gráfico Recharts - Niveles ]</p>
                        <div className="w-32 h-32 rounded-full border-[10px] border-primary/50 border-t-secondary/80 border-r-warning/50 border-b-white/10 mx-auto"></div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h2 className="font-semibold text-white">Rendimiento por Sucursal</h2>
                </div>
                <table className="w-full text-left">
                    <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition">
                            <td className="p-4 text-white font-medium">Sucursal Centro</td>
                            <td className="p-4"><span className="text-success text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success"></div> Abierta</span></td>
                            <td className="p-4 text-right text-gray-300 font-mono">$45,200</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition">
                            <td className="p-4 text-white font-medium">Campus Universitario</td>
                            <td className="p-4"><span className="text-gray-500 text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Cerrada</span></td>
                            <td className="p-4 text-right text-gray-300 font-mono">$0</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
};
