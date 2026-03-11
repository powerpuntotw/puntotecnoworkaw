import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Store, Loader2, Plus, Trash2, Camera, Palette, Maximize, DollarSign, User, ShieldCheck, MapPin, Phone, Mail, Settings2, Globe, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export const AdminLocations = () => {
    const [locations, setLocations] = useState([]);
    const [localManagers, setLocalManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        manager_id: '',
        has_fotoya: false,
        has_color_printing: false,
        max_bw_size: 'A4',
        max_color_size: 'A4',
        allow_custom_prices: false,
        status: 'activo',
        is_open: true
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            const [locsRes, usersRes] = await Promise.all([
                databases.listDocuments(dbId, 'printing_locations', [Query.limit(100)]),
                // Fetch all users so we can promote a 'client' to 'local'
                databases.listDocuments(dbId, 'users', [Query.limit(100)])
            ]);
            
            setLocations(locsRes.documents);
            setLocalManagers(usersRes.documents);
        } catch (error) {
            console.error("Error fetching admin locations data:", error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateModal = () => {
        setEditingLocation(null);
        setFormData({
            name: '', address: '', phone: '', email: '', manager_id: '',
            has_fotoya: false, has_color_printing: false,
            max_bw_size: 'A4', max_color_size: 'A4',
            allow_custom_prices: false, status: 'activo', is_open: true
        });
        setShowModal(true);
    };

    const openEditModal = (loc) => {
        setEditingLocation(loc);
        setFormData({
            name: loc.name || '',
            address: loc.address || '',
            phone: loc.phone || '',
            email: loc.email || '',
            manager_id: loc.manager_id || '',
            has_fotoya: loc.has_fotoya || false,
            has_color_printing: loc.has_color_printing || false,
            max_bw_size: loc.max_bw_size || 'A4',
            max_color_size: loc.max_color_size || 'A4',
            allow_custom_prices: loc.allow_custom_prices || false,
            status: loc.status || 'activo',
            is_open: loc.is_open ?? true
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.address) {
            toast.error("La dirección física es obligatoria");
            return;
        }

        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // 1. Identify role changes if manager is updated
            const oldManagerId = editingLocation?.manager_id;
            const newManagerId = formData.manager_id;

            let finalDoc;
            if (editingLocation) {
                finalDoc = await databases.updateDocument(dbId, 'printing_locations', editingLocation.$id, formData);
                setLocations(locations.map(l => l.$id === finalDoc.$id ? finalDoc : l));
                toast.success("Sucursal actualizada");
            } else {
                finalDoc = await databases.createDocument(dbId, 'printing_locations', ID.unique(), formData);
                setLocations([...locations, finalDoc]);
                toast.success("Sucursal creada");
            }

            // 2. Update user roles in DB
            if (newManagerId && newManagerId !== oldManagerId) {
                // Promote new manager to 'local'
                await databases.updateDocument(dbId, 'users', newManagerId, { user_type: 'local' });
                toast.success("Rol de usuario actualizado a Local");
            }
            if (oldManagerId && oldManagerId !== newManagerId) {
                // Demote old manager back to 'client' (unless they manage another store - for simplicity we demo as client)
                // In a production system we'd check if they still manage something else.
                await databases.updateDocument(dbId, 'users', oldManagerId, { user_type: 'client' });
            }

            setShowModal(false);
            fetchData(); // Refresh to get updated manager list/roles
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar sucursal");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta sucursal?")) return;
        try {
            await databases.deleteDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'printing_locations', id);
            setLocations(locations.filter(l => l.$id !== id));
            toast.success("Sucursal eliminada");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Gestión de Sucursales</h1>
                    <p className="text-gray-400 mt-2 font-medium">Control operativo y técnico de la red PuntoTecnowork.</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="group bg-primary hover:bg-primary-glow text-white px-8 py-4 rounded-2xl font-black shadow-glow transition flex items-center gap-3 ring-1 ring-white/10"
                >
                    <Plus size={22} className="group-hover:rotate-90 transition-transform" /> 
                    <span>Alta de Sucursal</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {locations.map(loc => (
                        <div key={loc.$id} className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-primary/30 transition duration-500">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
                            
                            {/* Status Header */}
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-3 h-3 rounded-full ${loc.is_open ? 'bg-success shadow-[0_0_12px_rgba(164,204,57,0.5)]' : 'bg-primary shadow-[0_0_12px_rgba(235,28,36,0.5)]'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${loc.is_open ? 'text-success' : 'text-primary'}`}>
                                        {loc.is_open ? 'En Línea' : 'Cerrado'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEditModal(loc)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-gray-400 hover:text-white border border-white/5">
                                        <Settings2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(loc.$id)} className="p-3 bg-primary/5 hover:bg-primary/20 rounded-xl transition text-primary/40 hover:text-primary border border-primary/10">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2 italic tracking-tighter uppercase group-hover:text-primary transition">{loc.name}</h3>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-6 font-medium">
                                <MapPin size={14} className="text-secondary" /> {loc.address || 'Ubicación no especificada'}
                            </div>

                            {/* Flags Badges */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {loc.has_fotoya && (
                                    <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-[9px] text-primary font-black flex items-center gap-1.5 uppercase tracking-wider">
                                        <Camera size={12} /> FotoYa
                                    </span>
                                )}
                                {loc.has_color_printing && (
                                    <span className="px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-xl text-[9px] text-secondary font-black flex items-center gap-1.5 uppercase tracking-wider">
                                        <Palette size={12} /> Color
                                    </span>
                                )}
                                {(loc.max_bw_size === 'A3' || loc.max_color_size === 'A3') && (
                                    <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-[9px] text-accent font-black flex items-center gap-1.5 uppercase tracking-wider">
                                        <Maximize size={12} /> A3 Ready
                                    </span>
                                )}
                                {loc.allow_custom_prices && (
                                    <span className="px-3 py-1.5 bg-success/10 border border-success/20 rounded-xl text-[9px] text-success font-black flex items-center gap-1.5 uppercase tracking-wider">
                                        <DollarSign size={12} /> Precios
                                    </span>
                                )}
                            </div>

                            {/* Manager Info */}
                            <div className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group-hover:bg-white/10 transition duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-xs font-black text-gray-500 border border-white/5">
                                        {localManagers.find(m => m.$id === loc.manager_id)?.full_name?.substring(0,2).toUpperCase() || <ShieldCheck size={18} />}
                                    </div>
                                    <div className="truncate max-w-[130px]">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-0.5">Responsable</p>
                                        <p className="text-xs text-white font-bold truncate tracking-tight">{localManagers.find(m => m.$id === loc.manager_id)?.full_name || 'Personal Central'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-0.5">Latido</p>
                                    <p className="text-xs text-gray-400 font-mono font-bold italic">
                                        {loc.last_active_at ? new Date(loc.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Creación/Edición */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-dark/80 backdrop-blur-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/10 rounded-[3rem] p-10 shadow-3xl shadow-primary/10 custom-scrollbar animate-in zoom-in-95 duration-300 relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                        
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{editingLocation ? 'Perfil de Sucursal' : 'Nueva Sucursal'}</h2>
                                <p className="text-gray-500 font-medium mt-2">Configuración técnica y administrativa del punto de venta.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition p-3 bg-white/5 rounded-2xl border border-white/5">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                            {/* Sección 1: Datos Básicos */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-primary/30"></span> Identidad & Contacto
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1">Nombre Comercial</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1">Encargado Asignado</label>
                                        <select required value={formData.manager_id} onChange={e => setFormData({...formData, manager_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-primary outline-none transition cursor-pointer">
                                            <option value="" className="bg-dark">Sin encargado...</option>
                                            {localManagers.map(m => (
                                                <option key={m.$id} value={m.$id} className="bg-dark">{m.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1 text-secondary">Dirección Física</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold focus:border-secondary transition" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Capacidad y Flags */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-secondary/30"></span> Servicios Habilitados
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition group">
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" checked={formData.has_fotoya} onChange={e => setFormData({...formData, has_fotoya: e.target.checked})} className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary transition cursor-pointer appearance-none checked:bg-primary" />
                                            {formData.has_fotoya && <CheckCircle size={14} className="absolute text-white pointer-events-none" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white italic tracking-tight uppercase group-hover:text-primary transition">Servicio FotoYa</p>
                                            <p className="text-[10px] text-gray-600 font-bold">Impresión fotográfica glossy.</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl cursor-pointer hover:bg-secondary/5 hover:border-secondary/20 transition group">
                                        <div className="relative flex items-center justify-center">
                                            <input type="checkbox" checked={formData.has_color_printing} onChange={e => setFormData({...formData, has_color_printing: e.target.checked})} className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-secondary focus:ring-secondary transition cursor-pointer appearance-none checked:bg-secondary" />
                                            {formData.has_color_printing && <CheckCircle size={14} className="absolute text-white pointer-events-none" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white italic tracking-tight uppercase group-hover:text-secondary transition">Soporte Color</p>
                                            <p className="text-[10px] text-gray-600 font-bold">Inyección/Láser color premium.</p>
                                        </div>
                                    </label>

                                    <div className="md:col-span-2 grid grid-cols-2 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Tamaño Máx B&N</label>
                                            <div className="flex gap-2">
                                                {['A4', 'A3'].map(v => (
                                                    <button key={v} type="button" onClick={() => setFormData({...formData, max_bw_size: v})} className={`flex-1 py-3 rounded-xl border font-black text-xs transition uppercase ${formData.max_bw_size === v ? 'bg-white text-dark border-white shadow-glow' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'}`}>{v}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Tamaño Máx Color</label>
                                            <div className="flex gap-2">
                                                {['A4', 'A3'].map(v => (
                                                    <button key={v} type="button" onClick={() => setFormData({...formData, max_color_size: v})} className={`flex-1 py-3 rounded-xl border font-black text-xs transition uppercase ${formData.max_color_size === v ? 'bg-secondary text-white border-secondary shadow-glow' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'}`}>{v}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <label className="md:col-span-2 flex items-center justify-between p-6 bg-success/5 border border-success/20 rounded-[2rem] cursor-pointer hover:bg-success/10 transition ring-1 ring-success/10">
                                        <div className="flex items-center gap-5">
                                            <div className="p-3 bg-success/10 rounded-2xl border border-success/20">
                                                <DollarSign className="text-success" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-white italic tracking-tighter uppercase">ARANCELERÍA DE SUCURSAL</p>
                                                <p className="text-xs text-success/70 font-bold">Habilitar independencia de precios para este local.</p>
                                            </div>
                                        </div>
                                        <div className="relative flex items-center justify-center scale-125">
                                            <input type="checkbox" checked={formData.allow_custom_prices} onChange={e => setFormData({...formData, allow_custom_prices: e.target.checked})} className="w-8 h-8 rounded-full border-success/30 bg-success/5 text-success focus:ring-success transition cursor-pointer appearance-none checked:bg-success" />
                                            {formData.allow_custom_prices && <CheckCircle size={18} className="absolute text-white pointer-events-none" />}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-10 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[1.5rem] bg-white/5 text-gray-500 font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition border border-white/5">Descartar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] px-8 py-5 rounded-[1.5rem] bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-50 ring-4 ring-primary/20 uppercase italic tracking-tighter text-xl">
                                    {isSaving ? <Loader2 className="animate-spin inline mr-2" /> : editingLocation ? 'Confirmar Cambios' : 'Abrir Sucursal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
