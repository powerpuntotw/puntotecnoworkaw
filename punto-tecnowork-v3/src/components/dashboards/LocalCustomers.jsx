import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Users, Search, Mail, Phone, Calendar, ArrowRight, Loader2 } from 'lucide-react';

export const LocalCustomers = ({ locationId }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCustomers = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Link customers to this location via their orders
            const ordersRes = await databases.listDocuments(dbId, 'orders', [
                Query.equal('location_id', locationId),
                Query.limit(500)
            ]);
            
            const uniqueClientIds = [...new Set(ordersRes.documents.map(o => o.client_id))];
            
            // For now, fetch all users and filter (in a real app, this should be indexed)
            const usersRes = await databases.listDocuments(dbId, 'users', [
                Query.limit(100)
            ]);
            
            setCustomers(usersRes.documents.filter(u => uniqueClientIds.includes(u.$id)));
        } catch (error) {
            console.error("Error fetching local customers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [locationId]);

    const filtered = customers.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Mis Clientes</h1>
                <p className="text-gray-400 mt-1">Usuarios que han realizado pedidos en esta sucursal.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-primary transition"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-32 bg-card/30 animate-pulse rounded-2xl" />)
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 italic">No se encontraron clientes para esta sucursal.</div>
                ) : (
                    filtered.map(customer => (
                        <div key={customer.$id} className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-2xl group hover:border-primary/30 transition shadow-glow flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary-glow font-bold text-lg border border-primary/30 shadow-inner">
                                {customer.name?.[0]}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="text-white font-bold truncate">{customer.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 truncate">
                                    <Mail size={12} /> {customer.email}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-primary-glow font-bold mt-2 uppercase tracking-tighter italic">
                                    <Star size={10} /> {customer.points || 0} Puntos
                                </div>
                            </div>
                            <button className="p-2 text-gray-700 group-hover:text-primary transition">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
