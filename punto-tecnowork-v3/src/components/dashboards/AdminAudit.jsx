import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { Search, Loader2, Clock, ShieldAlert, Shield } from 'lucide-react';

const ACTION_COLOR = {
    'Crear Sucursal':    'text-success bg-success/10 border-success/20',
    'Editar Sucursal':   'text-secondary bg-secondary/10 border-secondary/20',
    'Eliminar Sucursal': 'text-red-400 bg-red-400/10 border-red-400/20',
    'Asignar Encargado': 'text-accent bg-accent/10 border-accent/20',
    'Promover a Local':  'text-primary bg-primary/10 border-primary/20',
};

export const AdminAudit = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'audit_logs',
                [Query.orderDesc('$createdAt'), Query.limit(200)]
            );
            setLogs(res.documents);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setLogs([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, []);

    const filtered = logs.filter(l =>
        (l.admin_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const actionStyle = (action) =>
        ACTION_COLOR[action] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Auditoría del Sistema</h1>
                <p className="text-gray-400 mt-2">
                    Log histórico de acciones administrativas.
                    {logs.length > 0 && <span className="text-gray-600 ml-1">({logs.length} registros)</span>}
                </p>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Buscar por acción, admin o descripción..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-primary transition" />
                </div>
            </div>
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                {loading ? (
                    <div className="flex justify-center items-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-600">
                        <Shield size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-sm">
                            {logs.length === 0 ? 'Sin registros todavía' : 'Sin resultados'}
                        </p>
                        <p className="text-xs mt-2 text-gray-700">Los logs se generan al crear/editar sucursales y asignar encargados.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile */}
                        <div className="sm:hidden divide-y divide-white/5">
                            {filtered.map(log => (
                                <div key={log.$id} className="p-4 space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary border border-primary/30">{(log.admin_name || '?')[0]}</div>
                                            <span className="text-sm font-medium text-white">{log.admin_name}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md ${actionStyle(log.action)}`}>{log.action}</span>
                                    </div>
                                    <p className="text-sm text-gray-400">{log.description}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-600"><Clock size={11} /> {new Date(log.$createdAt).toLocaleString('es-AR', { hour12: false })}</div>
                                </div>
                            ))}
                        </div>
                        {/* Desktop */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="py-4 px-5 font-medium">Fecha y Hora</th>
                                        <th className="py-4 px-5 font-medium">Administrador</th>
                                        <th className="py-4 px-5 font-medium">Acción</th>
                                        <th className="py-4 px-5 font-medium">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(log => (
                                        <tr key={log.$id} className="hover:bg-white/5 transition">
                                            <td className="py-3 px-5 text-xs text-gray-500"><div className="flex items-center gap-1.5"><Clock size={11} /> {new Date(log.$createdAt).toLocaleString('es-AR', { hour12: false })}</div></td>
                                            <td className="py-3 px-5"><div className="flex items-center gap-2 text-sm text-white"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary border border-primary/30">{(log.admin_name || '?')[0]}</div>{log.admin_name}</div></td>
                                            <td className="py-3 px-5"><span className={`text-[10px] font-bold px-2 py-1 border rounded-md ${actionStyle(log.action)}`}>{log.action}</span></td>
                                            <td className="py-3 px-5 text-sm text-gray-400">{log.description}</td>
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
                <span>Los registros son de solo lectura. Se generan automáticamente en cada acción administrativa.</span>
            </div>
        </div>
    );
};
