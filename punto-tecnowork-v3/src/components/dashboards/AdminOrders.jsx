import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Search, Filter, Loader2 } from 'lucide-react';

export const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            let queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
            if (filterStatus !== 'all') queries.push(Query.equal('status', filterStatus));
            const res = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders', queries);
            setOrders(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [filterStatus]);

    const filtered = orders.filter(o =>
        o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusStyle = (s) => {
        const m = { pendiente: 'text-warning bg-warning/10 border-warning/20', en_proceso: 'text-primary bg-primary/10 border-primary/20', listo: 'text-success bg-success/10 border-success/20', entregado: 'text-gray-400 bg-gray-400/10 border-gray-400/20', cancelado: 'text-red-400 bg-red-400/10 border-red-400/20' };
        return m[s] || 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Órdenes</h1>
                <p className="text-gray-400 mt-2">Vista global de toda la actividad ({orders.length} órdenes)</p>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" placeholder="Buscar por #, cliente o local..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary transition" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-500 shrink-0" size={18} />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        className="flex-1 bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition">
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
                {loading ? <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
                    <>
                        <div className="sm:hidden divide-y divide-white/5">
                            {filtered.map(o => (
                                <div key={o.$id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-bold text-primary-glow text-sm">#{o.order_number || o.$id.substring(0,8).toUpperCase()}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyle(o.status)}`}>{o.status?.toUpperCase() || 'N/A'}</span>
                                    </div>
                                    <p className="text-sm text-white">{o.client_name || 'Desconocido'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{o.location_name || 'Sin local'}</span>
                                        <span className="font-mono text-gray-300 font-semibold">${(o.total_amount || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && <div className="py-12 text-center text-gray-500">Sin órdenes</div>}
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                                        <th className="py-4 px-6 font-medium">Orden #</th>
                                        <th className="py-4 px-6 font-medium">Cliente</th>
                                        <th className="py-4 px-6 font-medium hidden md:table-cell">Local</th>
                                        <th className="py-4 px-6 font-medium">Estado</th>
                                        <th className="py-4 px-6 font-medium">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(o => (
                                        <tr key={o.$id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6 font-mono font-bold text-primary-glow">{o.order_number || o.$id.substring(0, 8).toUpperCase()}</td>
                                            <td className="py-4 px-6 text-white">{o.client_name || 'Desconocido'}</td>
                                            <td className="py-4 px-6 text-gray-400 hidden md:table-cell">{o.location_name || 'Sin local'}</td>
                                            <td className="py-4 px-6"><span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle(o.status)}`}>{o.status?.toUpperCase() || 'N/A'}</span></td>
                                            <td className="py-4 px-6 font-mono text-gray-300">${(o.total_amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
