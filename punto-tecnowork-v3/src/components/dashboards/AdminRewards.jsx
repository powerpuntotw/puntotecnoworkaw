import { useState, useEffect, useRef } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { STORAGE_BUCKETS } from '../../lib/constants';
import toast from 'react-hot-toast';
import {
    Gift, Plus, Loader2, Image as ImageIcon, Trash2, Eye, EyeOff,
    Upload, X, Printer, ToggleLeft, ToggleRight, Clock, FileText
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────
const inputStyle = {
    backgroundColor: '#1a1a1a', color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', padding: '14px 18px',
    width: '100%', fontSize: '14px', fontWeight: '700',
    outline: 'none', boxSizing: 'border-box'
};

const PACK_FIELDS = [
    { key: 'pack_bw_a4',       label: 'Hojas B&N A4',    icon: '⬜' },
    { key: 'pack_color_a4',    label: 'Hojas Color A4',  icon: '🟦' },
    { key: 'pack_foto_10x15',  label: 'Fotos 10×15',     icon: '🖼' },
    { key: 'pack_bw_a3',       label: 'Hojas B&N A3',    icon: '📄' },
];

export const AdminRewards = () => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // PrintPass™ habilitado en el sistema (para mostrar badge)
    const [ppEnabled, setPpEnabled] = useState(false);

    const [formData, setFormData] = useState({
        name: '', category: '', description: '',
        points_required: 0, stock: 0,
        is_visible: true, image_id: '',
        // PrintPass™
        is_print_pack: false,
        pack_bw_a4: 0, pack_color_a4: 0,
        pack_foto_10x15: 0, pack_bw_a3: 0,
        pack_validity_days: 30,
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'rewards',
                [Query.orderDesc('$createdAt')]
            );
            setRewards(res.documents);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Verificar si PrintPass™ está activo en el sistema
    const fetchPPStatus = async () => {
        try {
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'system_config',
                [Query.equal('type', 'printpass_config')]
            );
            if (res.documents.length > 0) {
                const data = JSON.parse(res.documents[0].data);
                setPpEnabled(data.enabled === true);
            }
        } catch { }
    };

    useEffect(() => { fetchRewards(); fetchPPStatus(); }, []);

    const getImageUrl = (imageId) => {
        if (!imageId) return '';
        try { return storage.getFilePreview(STORAGE_BUCKETS.REWARDS, imageId); }
        catch { return ''; }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearSelectedImage = () => {
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveExistingImage = async () => {
        if (!formData.image_id) return;
        try { await storage.deleteFile(STORAGE_BUCKETS.REWARDS, formData.image_id); } catch { }
        setFormData(prev => ({ ...prev, image_id: '' }));
        clearSelectedImage();
        toast.success('Imagen eliminada');
    };

    const openModal = (reward = null) => {
        if (reward) {
            setFormData({
                ...reward,
                is_print_pack:       reward.is_print_pack ?? false,
                pack_bw_a4:          reward.pack_bw_a4 ?? 0,
                pack_color_a4:       reward.pack_color_a4 ?? 0,
                pack_foto_10x15:     reward.pack_foto_10x15 ?? 0,
                pack_bw_a3:          reward.pack_bw_a3 ?? 0,
                pack_validity_days:  reward.pack_validity_days ?? 30,
            });
            setImagePreview(reward.image_id ? getImageUrl(reward.image_id) : '');
        } else {
            setFormData({
                name: '', category: '', description: '',
                points_required: 0, stock: 0,
                is_visible: true, image_id: '',
                is_print_pack: false,
                pack_bw_a4: 0, pack_color_a4: 0,
                pack_foto_10x15: 0, pack_bw_a3: 0,
                pack_validity_days: 30,
            });
            setImagePreview('');
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); clearSelectedImage(); };

    const handleSave = async (e) => {
        e.preventDefault();
        // Validar que PrintPass™ tenga al menos 1 unidad
        if (formData.is_print_pack) {
            const total = (formData.pack_bw_a4 || 0) + (formData.pack_color_a4 || 0) +
                          (formData.pack_foto_10x15 || 0) + (formData.pack_bw_a3 || 0);
            if (total === 0) {
                toast.error('Debés agregar al menos 1 unidad de algún tipo de impresión.');
                return;
            }
        }
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            let finalImageId = formData.image_id;

            if (imageFile) {
                setIsUploadingImage(true);
                try {
                    if (formData.image_id) {
                        try { await storage.deleteFile(STORAGE_BUCKETS.REWARDS, formData.image_id); } catch { }
                    }
                    const uploaded = await storage.createFile(STORAGE_BUCKETS.REWARDS, ID.unique(), imageFile);
                    finalImageId = uploaded.$id;
                } finally { setIsUploadingImage(false); }
            }

            const pts = parseInt(formData.points_required);
            const payload = {
                name:               formData.name,
                title:              formData.name,
                category:           formData.is_print_pack ? 'PrintPass™' : (formData.category || ''),
                description:        formData.description,
                points_required:    pts,
                points_cost:        pts,
                stock:              parseInt(formData.stock),
                is_visible:         formData.is_visible,
                image_id:           finalImageId,
                // PrintPass™
                is_print_pack:      formData.is_print_pack,
                pack_bw_a4:         parseInt(formData.pack_bw_a4) || 0,
                pack_color_a4:      parseInt(formData.pack_color_a4) || 0,
                pack_foto_10x15:    parseInt(formData.pack_foto_10x15) || 0,
                pack_bw_a3:         parseInt(formData.pack_bw_a3) || 0,
                pack_validity_days: parseInt(formData.pack_validity_days) || 30,
            };

            if (formData.$id) {
                await databases.updateDocument(dbId, 'rewards', formData.$id, payload);
                toast.success('Premio actualizado');
            } else {
                await databases.createDocument(dbId, 'rewards', ID.unique(), payload);
                toast.success('Premio creado');
            }

            closeModal();
            fetchRewards();
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar el premio');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async (reward) => {
        if (!window.confirm('¿Eliminar este premio permanentemente?')) return;
        try {
            if (reward.image_id) { try { await storage.deleteFile(STORAGE_BUCKETS.REWARDS, reward.image_id); } catch { } }
            await databases.deleteDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'rewards', reward.$id);
            setRewards(rewards.filter(r => r.$id !== reward.$id));
            toast.success('Premio eliminado');
        } catch { toast.error('Error al eliminar'); }
    };

    const modalImageSrc = imagePreview || (formData.image_id ? getImageUrl(formData.image_id) : '');

    // Resumen de unidades del pack para mostrar en la card
    const packSummary = (r) => {
        const parts = [];
        if (r.pack_bw_a4 > 0)       parts.push(`${r.pack_bw_a4} B&N A4`);
        if (r.pack_color_a4 > 0)    parts.push(`${r.pack_color_a4} Color A4`);
        if (r.pack_foto_10x15 > 0)  parts.push(`${r.pack_foto_10x15} Fotos`);
        if (r.pack_bw_a3 > 0)       parts.push(`${r.pack_bw_a3} B&N A3`);
        return parts.join(' · ');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Catálogo de Premios</h1>
                    <p className="text-gray-400 mt-2">Configurá los productos canjeables por puntos.</p>
                </div>
                <button onClick={() => openModal()}
                    className="flex justify-center items-center gap-2 bg-primary hover:bg-primary-glow text-white px-6 py-3 rounded-xl transition shadow-glow">
                    <Plus size={20} /> Nuevo Premio
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : rewards.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Gift size={56} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest">Sin premios cargados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map(reward => (
                        <div key={reward.$id}
                            className={`bg-card/50 backdrop-blur-xl border rounded-2xl p-5 shadow-glow group hover:border-primary/30 transition ${
                                reward.is_print_pack ? 'border-primary/20' : 'border-white/10'
                            }`}>
                            <div className="relative aspect-square rounded-xl bg-white/5 overflow-hidden mb-4 flex items-center justify-center">
                                {reward.image_id ? (
                                    <img src={getImageUrl(reward.image_id)} alt={reward.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-600">
                                        {reward.is_print_pack
                                            ? <Printer size={40} className="text-primary/40" />
                                            : <ImageIcon size={40} />
                                        }
                                        <span className="text-[10px] uppercase tracking-widest font-bold">
                                            {reward.is_print_pack ? 'PrintPass™' : 'Sin imagen'}
                                        </span>
                                    </div>
                                )}
                                {/* Badges superpuestos */}
                                <div className="absolute top-3 left-3 flex flex-col gap-1">
                                    {reward.is_print_pack && (
                                        <span className="flex items-center gap-1 text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full">
                                            <Printer size={9} /> PrintPass™
                                        </span>
                                    )}
                                </div>
                                <div className="absolute top-3 right-3">
                                    {reward.is_visible
                                        ? <Eye size={18} className="text-success" />
                                        : <EyeOff size={18} className="text-gray-500" />}
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className="text-[10px] uppercase tracking-widest text-primary-glow font-bold mb-1 block">
                                    {reward.category || 'Sin categoría'}
                                </span>
                                <h3 className="text-lg font-bold text-white">{reward.name}</h3>
                                {reward.is_print_pack ? (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[11px] text-primary font-bold">{packSummary(reward)}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <Clock size={10} /> Vigencia: {reward.pack_validity_days ?? 30} días
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{reward.description}</p>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-2xl font-black text-warning">{reward.points_required?.toLocaleString('es-AR')} pts</div>
                                    <div className="text-xs text-gray-400">Stock: {reward.stock}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(reward)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition text-sm px-3">Editar</button>
                                    <button onClick={() => handleDelete(reward)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div style={{ backgroundColor: '#0a0a0f' }}
                        className="border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                                    {formData.is_print_pack
                                        ? <Printer className="text-primary" size={22} />
                                        : <Gift className="text-primary" size={22} />
                                    }
                                    {formData.$id ? 'Editar Premio' : 'Nuevo Premio'}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Completá los datos del premio canjeable.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">

                            {/* ── Toggle PrintPass™ ── */}
                            {ppEnabled && (
                                <div className={`p-4 rounded-2xl border transition ${
                                    formData.is_print_pack
                                        ? 'bg-primary/10 border-primary/30'
                                        : 'bg-white/3 border-white/10'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Printer size={18} className={formData.is_print_pack ? 'text-primary' : 'text-gray-500'} />
                                            <div>
                                                <p className={`text-sm font-black uppercase tracking-wider ${formData.is_print_pack ? 'text-white' : 'text-gray-400'}`}>
                                                    PrintPass™
                                                </p>
                                                <p className="text-[10px] text-gray-500">Pack de impresiones canjeables</p>
                                            </div>
                                        </div>
                                        <button type="button"
                                            onClick={() => setFormData(f => ({ ...f, is_print_pack: !f.is_print_pack }))}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition ${
                                                formData.is_print_pack
                                                    ? 'bg-primary text-white shadow-glow'
                                                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                            }`}>
                                            {formData.is_print_pack
                                                ? <><ToggleRight size={14} /> Activo</>
                                                : <><ToggleLeft size={14} /> Inactivo</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Campos PrintPass™ (solo si is_print_pack) ── */}
                            {formData.is_print_pack && (
                                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-4">
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <FileText size={11} /> Contenido del pack
                                    </p>

                                    <div className="grid grid-cols-2 gap-3">
                                        {PACK_FIELDS.map(f => (
                                            <div key={f.key}>
                                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1.5">
                                                    {f.icon} {f.label}
                                                </label>
                                                <input
                                                    type="number" min="0"
                                                    value={formData[f.key]}
                                                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                    style={{ ...inputStyle, padding: '10px 14px', fontSize: '13px' }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Vigencia */}
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                            <Clock size={11} /> Días de vigencia desde activación
                                        </label>
                                        <input
                                            type="number" min="1" max="365"
                                            value={formData.pack_validity_days}
                                            onChange={e => setFormData(prev => ({ ...prev, pack_validity_days: e.target.value }))}
                                            style={{ ...inputStyle, padding: '10px 14px', fontSize: '13px' }}
                                        />
                                        <p className="text-[10px] text-gray-600 mt-1">
                                            El pack expira {formData.pack_validity_days} días después de ser activado en sucursal.
                                        </p>
                                    </div>

                                    {/* Resumen del pack */}
                                    {(() => {
                                        const total = (parseInt(formData.pack_bw_a4)||0) + (parseInt(formData.pack_color_a4)||0) +
                                                      (parseInt(formData.pack_foto_10x15)||0) + (parseInt(formData.pack_bw_a3)||0);
                                        return total > 0 ? (
                                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-[11px] text-primary font-bold">
                                                📦 Pack total: {total} unidades ·{' '}
                                                {formData.pack_validity_days} días de vigencia
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-[11px] text-yellow-400">
                                                ⚠️ Ingresá al menos 1 unidad en algún tipo de impresión.
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* ── Imagen ── */}
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                    Imagen del Premio <span className="text-gray-600 font-normal normal-case">(opcional · JPG, PNG, WEBP · máx 5 MB)</span>
                                </label>
                                {modalImageSrc ? (
                                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-white/5 border border-white/10">
                                        <img src={modalImageSrc} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-3">
                                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-primary rounded-xl text-white text-xs font-black uppercase shadow-glow">
                                                <Upload size={14} /> Cambiar
                                            </button>
                                            <button type="button"
                                                onClick={imageFile ? clearSelectedImage : handleRemoveExistingImage}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/80 rounded-xl text-white text-xs font-black uppercase">
                                                <Trash2 size={14} /> Quitar
                                            </button>
                                        </div>
                                        {imageFile && (
                                            <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-full text-[10px] text-white font-bold">
                                                Nueva imagen — se guardará al confirmar
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/50 bg-white/3 hover:bg-primary/5 transition flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                                            <Upload size={26} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black uppercase tracking-widest">Subir imagen</p>
                                            <p className="text-[10px] mt-1 text-gray-600">Hacé click para seleccionar</p>
                                        </div>
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </div>

                            {/* ── Campos básicos ── */}
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Nombre *</label>
                                <input type="text" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={inputStyle} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {!formData.is_print_pack && (
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Categoría</label>
                                        <input type="text" value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            style={inputStyle} />
                                    </div>
                                )}
                                <div className={formData.is_print_pack ? 'col-span-2' : ''}>
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Puntos Requeridos *</label>
                                    <input type="number" required min="1" value={formData.points_required}
                                        onChange={e => setFormData({ ...formData, points_required: e.target.value })}
                                        style={inputStyle} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Stock</label>
                                    <input type="number" required min="0" value={formData.stock}
                                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                        style={inputStyle} />
                                </div>
                                <div className="flex items-center gap-3 pt-7">
                                    <input type="checkbox" id="is_visible" checked={formData.is_visible}
                                        onChange={e => setFormData({ ...formData, is_visible: e.target.checked })}
                                        className="w-5 h-5 accent-primary" />
                                    <label htmlFor="is_visible" className="text-sm text-gray-300 cursor-pointer select-none">Visible en catálogo</label>
                                </div>
                            </div>

                            {!formData.is_print_pack && (
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Descripción</label>
                                    <textarea rows={3} value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        style={{ ...inputStyle, resize: 'none', fontWeight: '600' }} />
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-3 rounded-2xl font-black uppercase text-sm transition"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving || isUploadingImage}
                                    className={`flex-[2] py-3 rounded-2xl font-black shadow-glow transition disabled:opacity-40 uppercase text-sm flex items-center justify-center gap-2 text-white ${
                                        formData.is_print_pack ? 'bg-primary hover:bg-primary-glow' : 'bg-primary hover:bg-primary-glow'
                                    }`}>
                                    {(isSaving || isUploadingImage)
                                        ? <><Loader2 size={16} className="animate-spin" /> {isUploadingImage ? 'Subiendo imagen...' : 'Guardando...'}</>
                                        : formData.is_print_pack
                                            ? <><Printer size={16} /> Guardar PrintPass™</>
                                            : <><Gift size={16} /> Guardar Premio</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
