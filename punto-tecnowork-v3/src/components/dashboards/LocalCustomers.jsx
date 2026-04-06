import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Search, Mail, ArrowRight, Loader2, Star, Users } from 'lucide-react';

export const LocalCustomers = ({ locationId }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            // IDs únicos de clientes que pidieron en este local
            const ordersRes = await databases.listDocuments(dbId, 'orders', [
                Query.equal('location_id', locationId), Query.limit(500)
            ]);
            const uniqueClientIds = [...new Set(ordersRes.documents.map(o => o.client_id))];
            if (uniqueClientIds.length === 0) { setCustomers([]); return; }
            // Los orders guardan client_id = Appwrite Auth.$id
            // Los docs de users guardan auth_id = Appwrite Auth.$id
            const usersRes = await databases.listDocuments(dbId, 'users', [Query.limit(200)]);
            setCustomers(usersRes.documents.filter(u => uniqueClientIds.includes(u.auth_id)));
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchCustomers(); }, [locationId]);

    // Filtrar por full_name o email (campos reales del schema)
    const filtered = customers.filter(c =>
        (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!locationId) return (
        <div className="text-center py-20 text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-sm">Sin sucursal asignada</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase">Mis Clientes</h1>
                <p className="text-gray-400 mt-1">Usuarios que realizaron pedidos en esta sucursal.</p>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Buscar por nombre o email..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary transition" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-28 bg-card/30 animate-pulse rounded-2xl" />)
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-gray-500">
                        <Users size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="italic text-sm">{customers.length === 0 ? 'Aún no hay clientes para esta sucursal.' : 'Sin resultados.'}</p>
                    </div>
                ) : filtered.map(customer => (
                    <div key={customer.$id} className="bg-card/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl group hover:border-primary/30 transition shadow-lg flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30 shrink-0">
                            {customer.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold truncate">{customer.full_name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 truncate">
                                <Mail size={11} /> {customer.email}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold mt-1.5 uppercase">
                                <Star size={10} /> {(customer.points ?? 0).toLocaleString('es-AR', { hour12: false })} pts · {customer.tier || 'Bronze'}
                            </div>
                        </div>
                        <ArrowRight size={16} className="text-gray-700 group-hover:text-primary transition shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};
