import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { FileText, Search, Filter, Loader2, ArrowRight } from 'lucide-react';

export const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            let queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
            if (filterStatus !== 'all') {
                queries.push(Query.equal('status', filterStatus));
            }

            const res = await databases.listDocuments(dbId, 'orders', queries);
            setOrders(res.documents);
        } catch (error) {
            console.error("Error fetching admin orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [filterStatus]);

    const filteredOrders = orders.filter(order => 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'pendiente': return 'text-warning bg-warning/10 border-warning/20';
            case 'en_proceso': return 'text-primary bg-primary/10 border-primary/20';
            case 'listo': return 'text-success bg-success/10 border-success/20';
            case 'entregado': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
            case 'cancelado': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Órdenes</h1>
                    <p className="text-gray-400 mt-2">Vista global de toda la actividad del sistema ({orders.length} órdenes)</p>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por #, cliente o local..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="text-gray-500" size={18} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary transition flex-1 md:flex-none"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="listo">Listo</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-sm">
                                    <th className="py-4 px-6 font-medium">Orden #</th>
                                    <th className="py-4 px-6 font-medium">Cliente</th>
                                    <th className="py-4 px-6 font-medium">Local</th>
                                    <th className="py-4 px-6 font-medium">Estado</th>
                                    <th className="py-4 px-6 font-medium">Monto</th>
                                    <th className="py-4 px-6 font-medium text-right">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredOrders.map(order => (
                                    <tr key={order.$id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-6 font-mono font-bold text-primary-glow">
                                            {order.order_number || order.$id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="py-4 px-6 text-white">{order.client_name || 'Desconocido'}</td>
                                        <td className="py-4 px-6 text-gray-400">{order.location_name || 'Sin local'}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                                {order.status?.toUpperCase() || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-mono text-gray-300">
                                            ${(order.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 text-gray-500 hover:text-primary transition">
                                                <ArrowRight size={18} />
                                            </button>
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
