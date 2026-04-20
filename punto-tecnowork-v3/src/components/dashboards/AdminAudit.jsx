import { useState, useEffect, useCallback } from 'react';
import { AuditService } from '../../lib/auditService';
import { 
    Search, Loader2, Clock, ShieldAlert, Shield, ChevronDown, 
    Tag, User, MapPin, Palette, Printer, Info 
} from 'lucide-react';

const PAGE_SIZE = 50;

/**
 * Taxonomía visual basada en entityType
 */
const ENTITY_STYLES = {
    price: {
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        icon: Tag,
        label: 'Precios'
    },
    user: {
        color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        icon: User,
        label: 'Usuarios'
    },
    location: {
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        icon: MapPin,
        label: 'Sucursales'
    },
    branding: {
        color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        icon: Palette,
        label: 'Branding'
    },
    printpass: {
        color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
        icon: Printer,
        label: 'PrintPass™'
    },
    default: {
        color: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        icon: Shield,
        label: 'Sistema'
    }
};

export const AdminAudit = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const parseLogDescription = (desc) => {
        try {
            if (desc?.startsWith('{')) {
                const parsed = JSON.parse(desc);
                // Si es v2, tiene metadata estructurada
                if (parsed.v === 2) {
                    return {
                        isV2: true,
                        entityType: parsed.entityType,
                        entityId: parsed.entityId,
                        metadata: parsed.metadata,
                        message: parsed.metadata?.description || `Acción administrativa sobre ${parsed.entityType}`
                    };
                }
            }
        } catch (e) {
            // Ignorar error de parseo y retornar normal
        }
        return { isV2: false, message: desc, entityType: 'default' };
    };

    const fetchLogs = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
                setOffset(0);
            } else {
                setLoadingMore(true);
            }

            const currentOffset = isInitial ? 0 : offset;
            const res = await AuditService.getLogs(PAGE_SIZE, currentOffset);
            
            // Pre-procesamos los logs para facilitar el filtrado y renderizado
            const processedDocs = res.documents.map(doc => ({
                ...doc,
                _parsed: parseLogDescription(doc.description)
            }));

            if (isInitial) {
                setLogs(processedDocs);
            } else {
                setLogs(prev => [...prev, ...processedDocs]);
            }

            setHasMore(res.documents.length === PAGE_SIZE);
            setOffset(currentOffset + res.documents.length);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [offset]);

    useEffect(() => { fetchLogs(true); }, []);

    // Filtrado local (acción, admin, descripción o metadata)
    const filtered = logs.filter(l => {
        const term = searchTerm.toLowerCase();
        const searchInMetadata = l._parsed.isV2 ? JSON.stringify(l._parsed.metadata).toLowerCase() : '';
        
        return (
            (l.admin_name || '').toLowerCase().includes(term) ||
            (l.action || '').toLowerCase().includes(term) ||
            (l._parsed.message || '').toLowerCase().includes(term) ||
            searchInMetadata.includes(term)
        );
    });

    const getEntityStyle = (type) => ENTITY_STYLES[type] || ENTITY_STYLES.default;

    const LogDetails = ({ log }) => {
        const { _parsed } = log;
        const style = getEntityStyle(_parsed.entityType);
        const Icon = style.icon;

        return (
            <div className="space-y-1">
                <p className="text-sm text-gray-300 font-medium leading-relaxed">
                    {_parsed.message}
                </p>
                {_parsed.isV2 && _parsed.entityId && (
                    <p className="text-[10px] text-gray-600 font-mono">
                        ID Recurso: <span className="text-gray-500">{_parsed.entityId}</span>
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent italic uppercase tracking-tighter">
                        Auditoría del Sistema
                    </h1>
                    <p className="text-gray-400 mt-1 font-medium">
                        Log histórico de acciones administrativas y gobernanza.
                        {logs.length > 0 && <span className="text-gray-600 ml-1">({logs.length} cargados)</span>}
                    </p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        <Loader2 size={12} className="animate-spin" /> Sincronizando
                    </div>
                )}
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-glow">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar por acción, admin, recurso o cambios específicos..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none focus:border-primary transition" 
                    />
                </div>
            </div>

            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
                {loading && logs.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-24 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cargando historial...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center text-gray-500">
                        <Shield size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-sm italic">Sin registros</p>
                        <p className="text-xs mt-2 text-gray-600 font-medium">No hay acciones registradas que coincidan con los criterios.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View */}
                        <div className="sm:hidden divide-y divide-white/5">
                            {filtered.map(log => {
                                const style = getEntityStyle(log._parsed.entityType);
                                const Icon = style.icon;
                                return (
                                    <div key={log.$id} className="p-5 space-y-3 hover:bg-white/3 transition duration-300">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black border shrink-0 ${style.color}`}>
                                                    <Icon size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{log.admin_name}</p>
                                                    <div className="flex items-center gap-1 text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                                        <Clock size={10} /> {new Date(log.$createdAt).toLocaleString('es-AR', { hour12: false })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 border rounded-full uppercase tracking-widest shrink-0 ${style.color}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <LogDetails log={log} />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/3 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                        <th className="py-5 px-6 font-black">Fecha y Hora</th>
                                        <th className="py-5 px-6 font-black">Admin</th>
                                        <th className="py-5 px-6 font-black">Categoría / Acción</th>
                                        <th className="py-5 px-6 font-black">Detalle de Operación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(log => {
                                        const style = getEntityStyle(log._parsed.entityType);
                                        const Icon = style.icon;
                                        return (
                                            <tr key={log.$id} className="hover:bg-white/[0.03] transition duration-300 group">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold group-hover:text-gray-400 transition">
                                                        <Clock size={12} className="text-primary/50" />
                                                        {new Date(log.$createdAt).toLocaleString('es-AR', { hour12: false })}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-black text-white border border-white/10 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/30 transition duration-300 capitalize">
                                                            {(log.admin_name || '?')[0]}
                                                        </div>
                                                        <span className="text-sm font-bold text-white group-hover:text-primary transition">{log.admin_name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${style.color.split(' ')[0]}`}>
                                                            <Icon size={12} /> {style.label}
                                                        </div>
                                                        <span className={`inline-block text-[8px] font-black px-2 py-0.5 border rounded-full uppercase tracking-tighter w-fit ${style.color}`}>
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <LogDetails log={log} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {hasMore && (
                            <div className="p-8 flex justify-center border-t border-white/5 bg-white/[0.02]">
                                <button 
                                    onClick={() => fetchLogs()} 
                                    disabled={loadingMore}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow transition disabled:opacity-50 group">
                                    {loadingMore ? (
                                        <><Loader2 size={16} className="animate-spin text-primary" /> Cargando...</>
                                    ) : (
                                        <>Cargar más registros <ChevronDown size={16} className="group-hover:translate-y-0.5 transition" /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-start gap-3 p-5 bg-primary/5 border border-primary/10 rounded-2xl text-primary/70 text-xs font-medium">
                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-primary" />
                <p className="leading-relaxed">
                    <span className="font-black uppercase tracking-widest text-[10px] block mb-1">Registro Administrativo Estricto</span>
                    Esta bitácora registra exclusivamente acciones críticas realizadas desde el panel de control. Los eventos operativos de sucursales y clientes quedan fuera de este log para garantizar un historial de gobernanza limpio y auditable.
                </p>
            </div>
        </div>
    );
};
