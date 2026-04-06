import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Search, Filter, Loader2, Package, DollarSign, MapPin, Tag } from 'lucide-react';

export const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            let queries = [Query.orderDesc('$createdAt'), Query.limit(200)];
            if (filterStatus !== 'all') queries.push(Query.equal('status', filterStatus));
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'orders', queries
            );
            setOrders(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [filterStatus]);

    const filtered = orders.filter(o =>
        (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.location_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusStyle = s => ({
        pendiente:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        en_proceso: 'text-primary bg-primary/10 border-primary/20',
        listo:      'text-success bg-success/10 border-success/20',
        entregado:  'text-gray-400 bg-gray-400/10 border-gray-400/20',
        cancelado:  'text-red-400 bg-red-400/10 border-red-400/20'
    }[s] || 'text-gray-500 bg-gray-500/10 border-gray-500/20');

    // Solo contar órdenes efectivamente entregadas
    const totalRevenue = filtered
        .filter(o => o.status === 'entregado')
        .reduce((s, o) => s + (o.total_price || 0), 0);

    const deliveredCount = filtered.filter(o => o.status === 'entregado').length;

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Órdenes</h1>
                <p className="text-gray-400 mt-1">
                    {orders.length} órdenes totales ·{' '}
                    <span className="text-success font-semibold">${totalRevenue.toLocaleString()} facturado</span>
                    <span className="text-gray-600 text-xs ml-1">({deliveredCount} entregadas)</span>
                </p>
            </div>
            <div className="bg-card/50 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Buscar por #orden, cliente o local..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-500 shrink-0" size={16} />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition">
                        <option value="all">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="listo">Listo</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
            </div>
            <div className="bg-card/50 border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">
                        <Package size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-sm">Sin órdenes</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile */}
                        <div className="sm:hidden divide-y divide-white/5">
                            {filtered.map(o => (
                                <div key={o.$id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-bold text-primary text-sm">#{o.order_number || o.$id.substring(0,8).toUpperCase()}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyle(o.status)}`}>{o.status?.toUpperCase() || 'N/A'}</span>
                                    </div>
                                    <p className="text-sm text-white">{o.client_name || 'Sin nombre'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><MapPin size={10} />{o.location_name || 'Sin local'}</span>
                                        <span className={`font-mono font-semibold ${o.status === 'entregado' ? 'text-success' : 'text-gray-500'}`}>
                                            ${(o.total_price || 0).toLocaleString()}
                                            {o.status !== 'entregado' && <span className="text-[9px] ml-1 text-gray-600">pendiente</span>}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Desktop */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-white/10 text-gray-400 text-xs">
                                    <tr>
                                        <th className="py-4 px-5 font-medium"><Tag size={12} className="inline mr-1" />Orden</th>
                                        <th className="py-4 px-5 font-medium">Cliente</th>
                                        <th className="py-4 px-5 font-medium hidden md:table-cell"><MapPin size={12} className="inline mr-1" />Local</th>
                                        <th className="py-4 px-5 font-medium">Estado</th>
                                        <th className="py-4 px-5 font-medium"><DollarSign size={12} className="inline" />Monto</th>
                                        <th className="py-4 px-5 font-medium hidden lg:table-cell">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(o => (
                                        <tr key={o.$id} className="hover:bg-white/5 transition">
                                            <td className="py-3 px-5 font-mono font-bold text-primary text-sm">#{o.order_number || o.$id.substring(0,8).toUpperCase()}</td>
                                            <td className="py-3 px-5 text-white text-sm">{o.client_name || <span className="text-gray-600 italic">sin nombre</span>}</td>
                                            <td className="py-3 px-5 text-gray-400 text-sm hidden md:table-cell">{o.location_name || <span className="text-gray-600 italic">sin local</span>}</td>
                                            <td className="py-3 px-5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle(o.status)}`}>{o.status?.toUpperCase() || 'N/A'}</span></td>
                                            <td className="py-3 px-5">
                                                <span className={`font-mono font-semibold text-sm ${o.status === 'entregado' ? 'text-success' : 'text-gray-500'}`}>
                                                    ${(o.total_price || 0).toLocaleString()}
                                                </span>
                                                {o.status !== 'entregado' && (
                                                    <span className="text-[9px] text-gray-600 font-bold uppercase ml-1">pend.</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-5 text-gray-500 text-xs hidden lg:table-cell">{new Date(o.$createdAt).toLocaleDateString()}</td>
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
