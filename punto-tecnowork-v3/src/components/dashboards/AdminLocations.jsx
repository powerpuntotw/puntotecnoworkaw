import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Store, Loader2, Plus, Trash2 } from 'lucide-react';

export const AdminLocations = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'printing_locations',
                [Query.limit(50)]
            );
            setLocations(res.documents);
        } catch (error) {
            console.error("Error fetching locations:", error);
            toast.error("Error al cargar las sucursales.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const toggleStatus = async (loc) => {
        try {
            const newState = !loc.is_open;
            await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'printing_locations',
                loc.$id,
                { is_open: newState }
            );
            
            setLocations(locations.map(l => l.$id === loc.$id ? { ...l, is_open: newState } : l));
            toast.success(`Sucursal ${newState ? 'abierta' : 'cerrada'} exitosamente`);
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Error al cambiar estado de la sucursal");
        }
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        try {
            setIsCreating(true);
            const newLoc = await databases.createDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'printing_locations',
                ID.unique(),
                {
                    name: newLocationName.trim(),
                    is_open: false
                }
            );
            
            setLocations([...locations, newLoc]);
            setNewLocationName('');
            toast.success("Sucursal creada exitosamente");
        } catch (error) {
            console.error("Error creating location:", error);
            toast.error("Error al crear la sucursal");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta sucursal? Esto podría afectar a usuarios y órdenes vinculadas a ella.")) return;

        try {
            await databases.deleteDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'printing_locations',
                id
            );
            setLocations(locations.filter(l => l.$id !== id));
            toast.success("Sucursal eliminada");
        } catch (error) {
            console.error("Error deleting location:", error);
            toast.error("Error al eliminar la sucursal");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Gestión de Sucursales</h1>
                    <p className="text-gray-400 mt-2">Administra los locales de impresión de la red.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario de creación */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleCreateLocation} className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow sticky top-6">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Store size={20} className="text-primary"/> Nueva Sucursal
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de la Sucursal</label>
                                <input
                                    type="text"
                                    required
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    placeholder="Ej. Sede Central"
                                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary transition"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating || !newLocationName.trim()}
                                className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary-glow text-white font-semibold py-2.5 rounded-xl transition shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Crear Sucursal</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista de Sucursales */}
                <div className="lg:col-span-2">
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glow">
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                                            <th className="pb-4 pt-4 px-6 font-medium">Sucursal</th>
                                            <th className="pb-4 pt-4 px-6 font-medium">Estado</th>
                                            <th className="pb-4 pt-4 px-6 font-medium text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {locations.map(loc => (
                                            <tr key={loc.$id} className="group hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-white">{loc.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-1">ID: {loc.$id.substring(0,8)}...</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <button
                                                        onClick={() => toggleStatus(loc)}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${loc.is_open ? 'bg-success' : 'bg-gray-600'}`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${loc.is_open ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </button>
                                                    <span className={`ml-3 text-sm font-medium ${loc.is_open ? 'text-success' : 'text-gray-500'}`}>
                                                        {loc.is_open ? 'Abierta' : 'Cerrada'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <button
                                                        onClick={() => handleDelete(loc.$id)}
                                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                                        title="Eliminar Sucursal"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {locations.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="py-8 text-center text-gray-400">
                                                    No hay sucursales registradas. Crea una nueva.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
