import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Gift, Plus, Search, Loader2, Image as ImageIcon, Trash2, Eye, EyeOff } from 'lucide-react';

export const AdminRewards = () => {
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        points_required: 0,
        stock: 0,
        is_visible: true,
        image_id: ''
    });

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'rewards',
                [Query.orderDesc('$createdAt')]
            );
            setRewards(res.documents);
        } catch (error) {
            console.error("Error fetching rewards:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            if (formData.$id) {
                // Update
                await databases.updateDocument(dbId, 'rewards', formData.$id, {
                    name: formData.name,
                    category: formData.category,
                    description: formData.description,
                    points_required: parseInt(formData.points_required),
                    stock: parseInt(formData.stock),
                    is_visible: formData.is_visible,
                    image_id: formData.image_id
                });
                toast.success("Premio actualizado");
            } else {
                // Create
                await databases.createDocument(dbId, 'rewards', ID.unique(), {
                    name: formData.name,
                    category: formData.category,
                    description: formData.description,
                    points_required: parseInt(formData.points_required),
                    stock: parseInt(formData.stock),
                    is_visible: formData.is_visible,
                    image_id: formData.image_id
                });
                toast.success("Premio creado");
            }
            setIsModalOpen(false);
            fetchRewards();
        } catch (error) {
            console.error("Error saving reward:", error);
            toast.error("Error al guardar el premio");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este premio permanentemente?")) return;
        try {
            await databases.deleteDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'rewards', id);
            setRewards(rewards.filter(r => r.$id !== id));
            toast.success("Premio eliminado");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Catálogo de Premios</h1>
                    <p className="text-gray-400 mt-2">Configura los productos canjeables por puntos.</p>
                </div>
                <button 
                    onClick={() => {
                        setFormData({ name: '', category: '', description: '', points_required: 0, stock: 0, is_visible: true, image_id: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex justify-center items-center gap-2 bg-primary hover:bg-primary-glow text-white px-6 py-3 rounded-xl transition shadow-glow"
                >
                    <Plus size={20} /> Nuevo Premio
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rewards.map(reward => (
                        <div key={reward.$id} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-glow group hover:border-primary/30 transition">
                            <div className="relative aspect-square rounded-xl bg-white/5 overflow-hidden mb-4 flex items-center justify-center">
                                {reward.image_id ? (
                                    <img src={storage.getFilePreview(import.meta.env.VITE_STORAGE_BUCKET_ID || 'rewards', reward.image_id)} alt={reward.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={40} className="text-gray-600" />
                                )}
                                <div className="absolute top-3 right-3">
                                    {reward.is_visible ? <Eye size={18} className="text-success" /> : <EyeOff size={18} className="text-gray-500" />}
                                </div>
                            </div>
                            <div className="mb-4">
                                <span className="text-[10px] uppercase tracking-widest text-primary-glow font-bold mb-1 block">{reward.category || 'Sin categoría'}</span>
                                <h3 className="text-lg font-bold text-white">{reward.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{reward.description}</p>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-2xl font-black text-warning">{reward.points_required.toLocaleString()} pts</div>
                                    <div className="text-xs text-gray-400">Stock: {reward.stock}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setFormData(reward); setIsModalOpen(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">Editar</button>
                                    <button onClick={() => handleDelete(reward.$id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-lg border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">{formData.$id ? 'Editar Premio' : 'Nuevo Premio'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Puntos Requeridos</label>
                                    <input type="number" required value={formData.points_required} onChange={e => setFormData({...formData, points_required: e.target.value})} className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Stock Inicial</label>
                                    <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary" />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <input type="checkbox" checked={formData.is_visible} onChange={e => setFormData({...formData, is_visible: e.target.checked})} className="w-5 h-5 accent-primary" />
                                    <label className="text-sm text-gray-300">Visible en catálogo</label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary resize-none"></textarea>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-300 font-medium hover:bg-white/5 rounded-xl transition">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-glow transition disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Guardar Premio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
