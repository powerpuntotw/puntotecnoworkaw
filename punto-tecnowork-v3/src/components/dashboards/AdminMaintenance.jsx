import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Settings, Save, TrendingUp, Activity, FileStack, Loader2, Trash2, RefreshCw } from 'lucide-react';

export const AdminMaintenance = () => {
    const [prices, setPrices] = useState([
        { id: 'a4_bn', label: 'A4 económico (B&N)', price: 0 },
        { id: 'a4_color', label: 'A4 color', price: 0 },
        { id: 'a3_bn', label: 'A3 económico (B&N)', price: 0 },
        { id: 'a3_color', label: 'A3 color', price: 0 },
        { id: 'oficio_bn', label: 'Oficio económico (B&N)', price: 0 },
        { id: 'oficio_color', label: 'Oficio color', price: 0 },
        { id: 'foto_10x15', label: 'Foto 10×15 cm', price: 0 },
        { id: 'foto_13x18', label: 'Foto 13×18 cm', price: 0 },
        { id: 'fotocromo_a4', label: 'Fotocromo A4', price: 0 },
    ]);
    const [inflation, setInflation] = useState(0);
    const [simulatedPrices, setSimulatedPrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [files, setFiles] = useState([]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID, 'system_config', []);
            const config = res.documents.find(doc => doc.type === 'prices');
            if (config && config.data) {
                const savedPrices = JSON.parse(config.data);
                setPrices(prices.map(p => ({ ...p, price: savedPrices[p.id] || 0 })));
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const res = await storage.listFiles(import.meta.env.VITE_STORAGE_BUCKET_ID || 'orders');
            setFiles(res.files);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchFiles();
    }, []);

    const handlePriceChange = (id, value) => {
        setPrices(prices.map(p => p.id === id ? { ...p, price: parseFloat(value) || 0 } : p));
    };

    const handleSavePrices = async () => {
        try {
            setIsSaving(true);
            const priceData = prices.reduce((acc, p) => ({ ...acc, [p.id]: p.price }), {});
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            const res = await databases.listDocuments(dbId, 'system_config', []);
            const existing = res.documents.find(doc => doc.type === 'prices');

            if (existing) {
                await databases.updateDocument(dbId, 'system_config', existing.$id, { data: JSON.stringify(priceData) });
            } else {
                await databases.createDocument(dbId, 'system_config', ID.unique(), { type: 'prices', data: JSON.stringify(priceData) });
            }
            toast.success("Precios actualizados exitosamente");
        } catch (error) {
            toast.error("Error al guardar precios");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSimulate = () => {
        const factor = 1 + (inflation / 100);
        const sim = prices.map(p => ({
            ...p,
            newPrice: Math.round((p.price * factor) / 10) * 10
        }));
        setSimulatedPrices(sim);
    };

    const applySimulation = () => {
        if (!simulatedPrices) return;
        setPrices(simulatedPrices.map(p => ({ ...p, price: p.newPrice })));
        setSimulatedPrices(null);
        setInflation(0);
        toast.success("Ajuste aplicado a la tabla. No olvides Guardar.");
    };

    const handleDeleteFile = async (id) => {
        if (!window.confirm("¿Eliminar este archivo permanentemente?")) return;
        try {
            await storage.deleteFile(import.meta.env.VITE_STORAGE_BUCKET_ID || 'orders', id);
            setFiles(files.filter(f => f.$id !== id));
            toast.success("Archivo eliminado");
        } catch (error) {
            toast.error("Error al eliminar archivo");
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Mantenimiento del Sistema</h1>
                <p className="text-gray-400 mt-2">Herramientas técnicas y configuración de precios.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Precios Globales */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="text-primary" /> Precios Globales</h2>
                        <button 
                            disabled={isSaving}
                            onClick={handleSavePrices} 
                            className="bg-primary hover:bg-primary-glow text-white px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Guardar</>}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {prices.map(p => (
                            <div key={p.id} className="flex items-center justify-between group">
                                <label className="text-gray-400 group-hover:text-gray-200 transition">{p.label}</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">$</span>
                                    <input 
                                        type="number" 
                                        value={p.price} 
                                        onChange={(e) => handlePriceChange(p.id, e.target.value)} 
                                        className="w-24 bg-background/50 border border-white/5 rounded-lg px-3 py-1 text-right text-white focus:border-primary outline-none transition"
                                    />
                                    {simulatedPrices && (
                                        <span className="text-success text-xs font-bold animate-pulse">→ ${simulatedPrices.find(s => s.id === p.id)?.newPrice}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ajuste Inflacionario */}
                <div className="space-y-8">
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4"><TrendingUp className="text-warning" /> Ajuste Inflacionario</h2>
                        <p className="text-sm text-gray-500 mb-6">Aumenta todos los precios por un porcentaje. Redondeo automático a múltiplos de 10.</p>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <input 
                                    type="number" 
                                    placeholder="Ej: 15" 
                                    value={inflation} 
                                    onChange={(e) => setInflation(e.target.value)}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white pr-10 outline-none focus:border-warning" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                            </div>
                            <button onClick={handleSimulate} className="bg-warning/20 hover:bg-warning/30 text-warning px-6 py-2.5 rounded-xl font-bold transition">Simular</button>
                        </div>
                        {simulatedPrices && (
                            <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-xl flex items-center justify-between">
                                <span className="text-success text-sm font-medium">Nueva tabla generada correctamente</span>
                                <button onClick={applySimulation} className="bg-success text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg">Aplicar Todo</button>
                            </div>
                        )}
                    </div>

                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4"><Activity className="text-secondary" /> Estado del Backend</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                    <span className="text-white font-medium">Appwrite Core Active</span>
                                </div>
                                <button onClick={fetchSettings} className="text-gray-400 hover:text-white transition"><RefreshCw size={18} /></button>
                            </div>
                            
                            <div className="p-4 bg-white/5 rounded-xl space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic mb-2">Verificación de Recursos</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Colección `system_config`</span>
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : (
                                        prices.some(p => p.price > 0) ? <span className="text-success font-bold">OK</span> : <span className="text-red-500 font-bold">No Detectada</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Bucket `branding`</span>
                                    <span className="text-gray-500 italic text-xs">Requiere subida inicial</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Bucket `orders_files`</span>
                                    {files.length > 0 ? <span className="text-success font-bold">OK ({files.length})</span> : <span className="text-orange-500 font-bold text-xs italic">Vacío o No Detectado</span>}
                                </div>
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <p className="text-[10px] text-primary-glow font-bold mb-1">¿ERRORES 404?</p>
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    Si ves errores 404 en consola al subir imágenes, asegúrate de haber creado el bucket con ID <code className="text-white">branding</code> y la colección con ID <code className="text-white">system_config</code> en tu consola de Appwrite.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Administrador de Archivos */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileStack className="text-primary" /> Administrador de Archivos</h2>
                    <span className="text-xs text-gray-500">{files.length} archivos en el bucket</span>
                </div>
                <div className="max-h-96 overflow-y-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-background/90 backdrop-blur z-10">
                            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                                <th className="p-4 font-medium">Archivo</th>
                                <th className="p-4 font-medium">Tamaño</th>
                                <th className="p-4 font-medium">Fecha</th>
                                <th className="p-4 font-medium text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {files.map(file => (
                                <tr key={file.$id} className="hover:bg-white/5 transition">
                                    <td className="p-4 text-sm text-white truncate max-w-[200px]">{file.name}</td>
                                    <td className="p-4 text-sm text-gray-400">{(file.sizeOriginal / 1024).toFixed(1)} KB</td>
                                    <td className="p-4 text-sm text-gray-400">{new Date(file.$createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDeleteFile(file.$id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
