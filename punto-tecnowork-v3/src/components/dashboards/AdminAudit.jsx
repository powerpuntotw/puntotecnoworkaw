import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Search, Loader2, Clock, ShieldAlert } from 'lucide-react';

export const AdminAudit = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'audit_logs', [Query.orderDesc('$createdAt'), Query.limit(100)]);
            setLogs(res.documents);
        } catch {
            setLogs([
                { $id: '1', admin_name: 'Admin Principal', action: 'Change Role', description: 'Promovió a power@gmail.com a admin', $createdAt: new Date().toISOString() },
                { $id: '2', admin_name: 'Admin Principal', action: 'Update Prices', description: 'Ajuste inflacionario del 15%', $createdAt: new Date(Date.now() - 3600000).toISOString() },
            ]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, []);

    const filtered = logs.filter(l =>
        l.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Auditoría del Sistema</h1>
                <p className="text-gray-400 mt-2">Log histórico de todas las acciones administrativas.</p>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-primary transition" />
                </div>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
                    <>
                        <div className="sm:hidden divide-y divide-white/5">
                            {filtered.map(log => (
                                <div key={log.$id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary-glow border border-primary/30">{log.admin_name?.[0]}</div>
                                            <span className="text-sm font-medium text-white">{log.admin_name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-secondary px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded-md">{log.action}</span>
                                    </div>
                                    <p className="text-sm text-gray-400">{log.description}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-600"><Clock size={11} /> {new Date(log.$createdAt).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="py-4 px-6 font-medium">Fecha y Hora</th>
                                        <th className="py-4 px-6 font-medium">Administrador</th>
                                        <th className="py-4 px-6 font-medium">Acción</th>
                                        <th className="py-4 px-6 font-medium">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(log => (
                                        <tr key={log.$id} className="hover:bg-white/5 transition">
                                            <td className="py-4 px-6 text-xs text-gray-500"><div className="flex items-center gap-2"><Clock size={12} /> {new Date(log.$createdAt).toLocaleString()}</div></td>
                                            <td className="py-4 px-6"><div className="flex items-center gap-2 text-sm text-white"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary-glow border border-primary/30">{log.admin_name?.[0]}</div>{log.admin_name}</div></td>
                                            <td className="py-4 px-6"><span className="text-xs font-bold text-secondary px-2 py-1 bg-secondary/10 border border-secondary/20 rounded-md">{log.action}</span></td>
                                            <td className="py-4 px-6 text-sm text-gray-400">{log.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500/80 text-xs">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>Los registros son de solo lectura y no pueden ser eliminados ni modificados.</span>
            </div>
        </div>
    );
};
