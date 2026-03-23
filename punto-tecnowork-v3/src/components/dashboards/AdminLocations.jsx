import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Loader2, Plus, Trash2, Camera, Palette, Maximize, DollarSign, ShieldCheck, MapPin, Settings2, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';

const logAudit = async (databases, dbId, action, description) => {
    try {
        await databases.createDocument(dbId, 'audit_logs', ID.unique(), { admin_name: 'Administrador', action, description });
    } catch { }
};

const inputStyle = {
    backgroundColor: '#1a1a1a', color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px',
    padding: '16px 20px', width: '100%', fontSize: '14px',
    fontWeight: '700', outline: 'none', boxSizing: 'border-box'
};

const DarkSelect = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} style={{
        ...inputStyle,
        appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
        paddingRight: '44px',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
    }}>
        {children}
    </select>
);

export const AdminLocations = () => {
    const [locations, setLocations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPromoting, setIsPromoting] = useState(null); // userId siendo promovido
    const [editingLocation, setEditingLocation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPromotePanel, setShowPromotePanel] = useState(false);

    const emptyForm = {
        name: '', address: '', phone: '', email: '', manager_id: '',
        schedule: '', has_fotoya: false, has_color_printing: false,
        max_bw_size: 'A4', max_color_size: 'A4',
        allow_custom_prices: false, status: 'activo', is_open: true
    };
    const [formData, setFormData] = useState(emptyForm);

    const fetchData = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [locsRes, usersRes] = await Promise.all([
                databases.listDocuments(dbId, 'printing_locations', [Query.limit(100)]),
                databases.listDocuments(dbId, 'users', [Query.limit(100)])
            ]);
            setLocations(locsRes.documents);
            setAllUsers(usersRes.documents);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreateModal = () => {
        setEditingLocation(null);
        setFormData(emptyForm);
        setShowPromotePanel(false);
        setShowModal(true);
    };

    const openEditModal = (loc) => {
        setEditingLocation(loc);
        setFormData({
            name: loc.name || '', address: loc.address || '',
            phone: loc.phone || '', email: loc.email || '',
            manager_id: loc.manager_id || '', schedule: loc.schedule || '',
            has_fotoya: loc.has_fotoya || false, has_color_printing: loc.has_color_printing || false,
            max_bw_size: loc.max_bw_size || 'A4', max_color_size: loc.max_color_size || 'A4',
            allow_custom_prices: loc.allow_custom_prices || false,
            status: loc.status || 'activo', is_open: loc.is_open ?? true
        });
        setShowPromotePanel(false);
        setShowModal(true);
    };

    // Promover un cliente a rol local
    const handlePromote = async (userId) => {
        const user = allUsers.find(u => u.$id === userId);
        if (!window.confirm(`¿Promover a "${user?.full_name}" al rol Local?\nPodrá ser asignado como encargado de sucursal.`)) return;
        try {
            setIsPromoting(userId);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            await databases.updateDocument(dbId, 'users', userId, { user_type: 'local' });
            await logAudit(databases, dbId, 'Promover a Local', `${user?.full_name} promovido de client a local`);
            toast.success(`${user?.full_name} ahora tiene rol Local`);
            // Actualizar estado local sin refetch
            setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, user_type: 'local' } : u));
        } catch (error) {
            console.error(error);
            toast.error("Error al cambiar el rol");
        } finally {
            setIsPromoting(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.address) { toast.error("La dirección es obligatoria"); return; }
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const oldManagerId = editingLocation?.manager_id;
            const newManagerId = formData.manager_id;

            let finalDoc;
            if (editingLocation) {
                finalDoc = await databases.updateDocument(dbId, 'printing_locations', editingLocation.$id, formData);
                setLocations(locations.map(l => l.$id === finalDoc.$id ? finalDoc : l));
                toast.success("Sucursal actualizada");
                await logAudit(databases, dbId, 'Editar Sucursal', `Actualizó: ${formData.name}`);
            } else {
                finalDoc = await databases.createDocument(dbId, 'printing_locations', ID.unique(), formData);
                setLocations([...locations, finalDoc]);
                toast.success("Sucursal creada");
                await logAudit(databases, dbId, 'Crear Sucursal', `Creó: ${formData.name} en ${formData.address}`);
            }

            if (newManagerId && newManagerId !== oldManagerId) {
                await databases.updateDocument(dbId, 'users', newManagerId, {
                    user_type: 'local', location_id: finalDoc.$id
                });
                const name = allUsers.find(u => u.$id === newManagerId)?.full_name || newManagerId;
                toast.success(`${name} asignado como encargado`);
                await logAudit(databases, dbId, 'Asignar Encargado', `${name} → local, sucursal ${formData.name}`);
            }
            if (oldManagerId && oldManagerId !== newManagerId) {
                await databases.updateDocument(dbId, 'users', oldManagerId, {
                    user_type: 'client', location_id: null
                });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const loc = locations.find(l => l.$id === id);
        if (!window.confirm(`¿Eliminar "${loc?.name}"?`)) return;
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            if (loc?.manager_id) {
                await databases.updateDocument(dbId, 'users', loc.manager_id, { user_type: 'client', location_id: null });
            }
            await databases.deleteDocument(dbId, 'printing_locations', id);
            setLocations(locations.filter(l => l.$id !== id));
            await logAudit(databases, dbId, 'Eliminar Sucursal', `Eliminó: ${loc?.name}`);
            toast.success("Sucursal eliminada");
        } catch { toast.error("Error al eliminar"); }
    };

    // IDs de managers ya asignados a OTRAS sucursales (no la que se edita)
    const assignedElsewhere = locations
        .filter(l => l.$id !== editingLocation?.$id)
        .map(l => l.manager_id).filter(Boolean);

    // Solo usuarios con rol 'local' y sin asignación a otra sucursal
    const availableLocals = allUsers.filter(u =>
        u.user_type === 'local' && !assignedElsewhere.includes(u.$id)
    );

    // Clientes que podrían ser promovidos a local
    const promotableClients = allUsers.filter(u => u.user_type === 'client');

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Gestión de Sucursales</h1>
                    <p className="text-gray-400 mt-2 font-medium">Control operativo y técnico de la red PuntoTecnowork.</p>
                </div>
                <button onClick={openCreateModal} className="group bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-black shadow-glow transition flex items-center gap-3 ring-1 ring-white/10">
                    <Plus size={22} className="group-hover:rotate-90 transition-transform" />
                    <span>Alta de Sucursal</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
            ) : locations.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <MapPin size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-sm">No hay sucursales creadas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {locations.map(loc => {
                        const manager = allUsers.find(m => m.$id === loc.manager_id);
                        return (
                            <div key={loc.$id} className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition duration-500">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-3 h-3 rounded-full ${loc.is_open ? 'bg-success shadow-[0_0_12px_rgba(164,204,57,0.5)]' : 'bg-primary shadow-[0_0_12px_rgba(235,28,36,0.5)]'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${loc.is_open ? 'text-success' : 'text-primary'}`}>{loc.is_open ? 'Abierto' : 'Cerrado'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(loc)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-gray-400 hover:text-white border border-white/5"><Settings2 size={16} /></button>
                                        <button onClick={() => handleDelete(loc.$id)} className="p-3 bg-primary/5 hover:bg-primary/20 rounded-xl transition text-primary/40 hover:text-primary border border-primary/10"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-1 italic tracking-tighter uppercase group-hover:text-primary transition">{loc.name}</h3>
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                                    <MapPin size={13} className="text-secondary shrink-0" /> {loc.address || 'Sin dirección'}
                                </div>
                                {loc.schedule && (
                                    <div className="flex items-center gap-2 text-gray-600 text-[10px] mb-3">
                                        <Clock size={11} className="text-accent shrink-0" /> {loc.schedule}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 my-4">
                                    {loc.has_fotoya && <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-xl text-[9px] text-primary font-black flex items-center gap-1 uppercase"><Camera size={11} /> FotoYa</span>}
                                    {loc.has_color_printing && <span className="px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-xl text-[9px] text-secondary font-black flex items-center gap-1 uppercase"><Palette size={11} /> Color {loc.max_color_size}</span>}
                                    {loc.max_bw_size === 'A3' && <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-xl text-[9px] text-accent font-black flex items-center gap-1 uppercase"><Maximize size={11} /> B&N A3</span>}
                                    {loc.allow_custom_prices && <span className="px-2.5 py-1 bg-success/10 border border-success/20 rounded-xl text-[9px] text-success font-black flex items-center gap-1 uppercase"><DollarSign size={11} /> Precios</span>}
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-xs font-black text-gray-400 border border-white/5">
                                        {manager?.full_name?.substring(0, 2).toUpperCase() || <ShieldCheck size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Encargado</p>
                                        <p className="text-xs text-white font-bold truncate">{manager?.full_name || 'Sin asignar'}</p>
                                    </div>
                                    {loc.last_active_at && (
                                        <div className="text-right shrink-0">
                                            <p className="text-[9px] text-gray-600 uppercase">Latido</p>
                                            <p className="text-xs text-success font-mono">{new Date(loc.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div style={{ backgroundColor: '#0a0a0f' }} className="border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-10 shadow-2xl custom-scrollbar">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{editingLocation ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                                <p className="text-gray-500 mt-1 font-medium">Configuración del punto de venta.</p>
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="p-3 rounded-2xl border border-white/10 text-gray-500 hover:text-white transition" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <XCircle size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Nombre Comercial *</label>
                                    <input required type="text" value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: PuntTw Centro" style={inputStyle} />
                                </div>

                                {/* Encargado — solo rol local */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Encargado (rol Local)</label>
                                    <DarkSelect value={formData.manager_id} onChange={e => setFormData({ ...formData, manager_id: e.target.value })}>
                                        <option value="" style={{ backgroundColor: '#1a1a1a', color: '#aaa' }}>-- Sin encargado --</option>
                                        {availableLocals.map(u => (
                                            <option key={u.$id} value={u.$id} style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
                                                {u.full_name}
                                            </option>
                                        ))}
                                    </DarkSelect>

                                    {/* Info + botón para ver clientes promovibles */}
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-[10px] text-gray-600">
                                            {availableLocals.length === 0
                                                ? 'Sin usuarios con rol Local disponibles'
                                                : `${availableLocals.length} usuario(s) con rol Local`}
                                        </p>
                                        {promotableClients.length > 0 && (
                                            <button type="button" onClick={() => setShowPromotePanel(v => !v)}
                                                className="text-[10px] font-black text-secondary hover:text-white transition flex items-center gap-1">
                                                <UserCheck size={11} /> Promover cliente
                                            </button>
                                        )}
                                    </div>

                                    {/* Panel de promoción de clientes */}
                                    {showPromotePanel && (
                                        <div className="mt-2 rounded-2xl border border-white/10 overflow-hidden" style={{ backgroundColor: '#111' }}>
                                            <div className="px-4 py-2 border-b border-white/10">
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Usuarios cliente — promover a Local</p>
                                            </div>
                                            {promotableClients.map(u => (
                                                <div key={u.$id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0">
                                                    <div>
                                                        <p className="text-sm text-white font-bold">{u.full_name}</p>
                                                        <p className="text-[10px] text-gray-500">{u.email}</p>
                                                    </div>
                                                    <button type="button" onClick={() => handlePromote(u.$id)} disabled={isPromoting === u.$id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition"
                                                        style={{ backgroundColor: 'rgba(0,147,216,0.15)', color: '#0093D8', border: '1px solid rgba(0,147,216,0.3)' }}>
                                                        {isPromoting === u.$id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                                                        {isPromoting === u.$id ? 'Promoviendo...' : 'Hacer Local'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Dirección */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Dirección Física *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                        <input required type="text" value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Ej: 9 de Julio 1241"
                                            style={{ ...inputStyle, paddingLeft: '44px' }} />
                                    </div>
                                </div>

                                {/* Horario */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={11} className="text-accent" /> Horario de atención
                                    </label>
                                    <input type="text" value={formData.schedule}
                                        onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                                        placeholder="Ej: Lun-Vie 8-20hs · Sáb 9-14hs" style={inputStyle} />
                                </div>
                            </div>

                            {/* Servicios */}
                            <div className="space-y-3">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Servicios habilitados</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[{ key: 'has_fotoya', label: 'Servicio FotoYa', sub: 'Fotos 10x15 glossy' },
                                      { key: 'has_color_printing', label: 'Impresión Color', sub: 'Premium inyección/láser' }
                                    ].map(({ key, label, sub }) => (
                                        <label key={key} className="flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition"
                                            style={{ backgroundColor: formData[key] ? 'rgba(235,28,36,0.08)' : 'rgba(255,255,255,0.03)', borderColor: formData[key] ? 'rgba(235,28,36,0.3)' : 'rgba(255,255,255,0.1)' }}>
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <input type="checkbox" checked={formData[key]}
                                                    onChange={e => setFormData({ ...formData, [key]: e.target.checked })}
                                                    className="w-5 h-5 rounded appearance-none cursor-pointer"
                                                    style={{ backgroundColor: formData[key] ? '#EB1C24' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }} />
                                                {formData[key] && <CheckCircle size={12} className="absolute text-white pointer-events-none" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase">{label}</p>
                                                <p className="text-[10px] text-gray-500">{sub}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {[['max_bw_size', 'B&N máx.'], ['max_color_size', 'Color máx.']].map(([key, label]) => (
                                        <div key={key} className="space-y-2">
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{label}</p>
                                            <div className="flex gap-2">
                                                {['A4', 'A3'].map(v => (
                                                    <button key={v} type="button" onClick={() => setFormData({ ...formData, [key]: v })}
                                                        className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase transition"
                                                        style={{ backgroundColor: formData[key] === v ? '#fff' : 'rgba(255,255,255,0.05)', color: formData[key] === v ? '#000' : '#666', border: formData[key] === v ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)' }}>
                                                        {v}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <label className="flex items-center justify-between p-5 rounded-2xl cursor-pointer"
                                    style={{ backgroundColor: 'rgba(164,204,57,0.05)', border: '1px solid rgba(164,204,57,0.2)' }}>
                                    <div className="flex items-center gap-4">
                                        <DollarSign className="text-success" size={20} />
                                        <div>
                                            <p className="text-sm font-black text-white uppercase">Arancelería propia</p>
                                            <p className="text-[10px]" style={{ color: 'rgba(164,204,57,0.7)' }}>Precios independientes</p>
                                        </div>
                                    </div>
                                    <div className="relative flex items-center justify-center shrink-0">
                                        <input type="checkbox" checked={formData.allow_custom_prices}
                                            onChange={e => setFormData({ ...formData, allow_custom_prices: e.target.checked })}
                                            className="w-6 h-6 rounded appearance-none cursor-pointer"
                                            style={{ backgroundColor: formData.allow_custom_prices ? '#A4CC39' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(164,204,57,0.3)' }} />
                                        {formData.allow_custom_prices && <CheckCircle size={14} className="absolute text-white pointer-events-none" />}
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className="flex-[2] py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-50 uppercase italic text-lg tracking-tighter">
                                    {isSaving ? <Loader2 className="animate-spin inline mr-2" size={18} /> : editingLocation ? 'Guardar Cambios' : 'Crear Sucursal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
