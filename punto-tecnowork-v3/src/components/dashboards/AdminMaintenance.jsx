import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Settings, Save, TrendingUp, Activity, FileStack, Loader2, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const PRICE_LIST = [
    { id: 'a4_bn',        label: 'A4 B&N (Eco)' },
    { id: 'a4_color',     label: 'A4 Color' },
    { id: 'a3_bn',        label: 'A3 B&N' },
    { id: 'a3_color',     label: 'A3 Color' },
    { id: 'foto_10x15',   label: 'Foto 10×15 cm (FotoYa)' },
    { id: 'fotocromo_a4', label: 'Fotocromo A4' },
];

export const AdminMaintenance = () => {
    const [prices, setPrices] = useState(PRICE_LIST.map(p => ({ ...p, price: 0 })));
    const [inflation, setInflation] = useState('');
    const [simulatedPrices, setSimulatedPrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [configDocId, setConfigDocId] = useState(null);
    const [files, setFiles] = useState([]);
    const [backendOk, setBackendOk] = useState(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            // El doc se creó con type='global_prices' (correcto)
            const res = await databases.listDocuments(dbId, 'system_config', [
                Query.equal('type', 'global_prices')
            ]);
            if (res.documents.length > 0) {
                const doc = res.documents[0];
                setConfigDocId(doc.$id);
                const saved = JSON.parse(doc.data);
                setPrices(PRICE_LIST.map(p => ({ ...p, price: saved[p.id] || 0 })));
                setBackendOk(true);
            } else {
                setBackendOk(false);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setBackendOk(false);
        } finally { setLoading(false); }
    };

    const fetchFiles = async () => {
        try {
            const res = await storage.listFiles('orders_files');
            setFiles(res.files || []);
        } catch { setFiles([]); }
    };

    useEffect(() => { fetchSettings(); fetchFiles(); }, []);

    const handleSavePrices = async () => {
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const priceData = prices.reduce((acc, p) => ({ ...acc, [p.id]: p.price }), {});
            if (configDocId) {
                await databases.updateDocument(dbId, 'system_config', configDocId, { data: JSON.stringify(priceData) });
            } else {
                const doc = await databases.createDocument(dbId, 'system_config', ID.unique(), {
                    type: 'global_prices', data: JSON.stringify(priceData)
                });
                setConfigDocId(doc.$id);
            }
            setBackendOk(true);
            toast.success('Precios globales actualizados');
        } catch { toast.error('Error al guardar precios'); }
        finally { setIsSaving(false); }
    };

    const handleSimulate = () => {
        const pct = parseFloat(inflation);
        if (isNaN(pct) || pct <= 0) { toast.error('Ingresá un porcentaje válido'); return; }
        setSimulatedPrices(prices.map(p => ({ ...p, newPrice: Math.round((p.price * (1 + pct / 100)) / 10) * 10 })));
    };

    const applySimulation = () => {
        if (!simulatedPrices) return;
        setPrices(simulatedPrices.map(p => ({ ...p, price: p.newPrice })));
        setSimulatedPrices(null);
        setInflation('');
        toast.success('Ajuste aplicado. Guardá para confirmar.');
    };

    const handleDeleteFile = async (id) => {
        if (!window.confirm('¿Eliminar este archivo permanentemente?')) return;
        try {
            await storage.deleteFile('orders_files', id);
            setFiles(files.filter(f => f.$id !== id));
            toast.success('Archivo eliminado');
        } catch { toast.error('Error al eliminar'); }
    };

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Mantenimiento del Sistema</h1>
                <p className="text-gray-400 mt-2">Configuración de precios y herramientas técnicas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Precios Globales */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="text-primary" size={20} /> Precios Globales</h2>
                        <button disabled={isSaving} onClick={handleSavePrices}
                            className="bg-primary hover:bg-primary-glow text-white px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50 text-sm font-bold">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Guardar</>}
                        </button>
                    </div>
                    {loading ? <div className="flex justify-center py-8 text-primary"><Loader2 className="animate-spin" /></div> : (
                        <div className="space-y-3">
                            {prices.map(p => (
                                <div key={p.id} className="flex items-center justify-between group p-2 hover:bg-white/5 rounded-xl transition">
                                    <label className="text-gray-400 group-hover:text-gray-200 transition text-sm">{p.label}</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 text-sm">$</span>
                                        <input type="number" value={p.price}
                                            onChange={e => setPrices(prices.map(x => x.id === p.id ? { ...x, price: parseFloat(e.target.value) || 0 } : x))}
                                            className="w-24 bg-background/50 border border-white/5 rounded-lg px-3 py-1.5 text-right text-white text-sm focus:border-primary outline-none transition" />
                                        {simulatedPrices && (
                                            <span className="text-success text-xs font-bold w-14 text-right">→ ${simulatedPrices.find(s => s.id === p.id)?.newPrice}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Ajuste inflacionario */}
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-3"><TrendingUp className="text-yellow-400" size={20} /> Ajuste Inflacionario</h2>
                        <p className="text-sm text-gray-500 mb-4">Sube todos los precios por porcentaje. Redondeo a múltiplos de $10.</p>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input type="number" placeholder="Ej: 15" value={inflation}
                                    onChange={e => setInflation(e.target.value)}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white pr-8 outline-none focus:border-yellow-400 text-sm" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                            </div>
                            <button onClick={handleSimulate} className="bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 px-5 py-2 rounded-xl font-bold text-sm transition">Simular</button>
                        </div>
                        {simulatedPrices && (
                            <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-xl flex items-center justify-between">
                                <span className="text-success text-sm font-medium">Nueva tabla lista</span>
                                <button onClick={applySimulation} className="bg-success text-white px-4 py-1.5 rounded-lg text-sm font-bold">Aplicar Todo</button>
                            </div>
                        )}
                    </div>

                    {/* Estado backend */}
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4"><Activity className="text-secondary" size={20} /> Estado del Backend</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(164,204,57,0.8)]"></div>
                                    <span className="text-white text-sm font-medium">Appwrite Core</span>
                                </div>
                                <button onClick={() => { fetchSettings(); fetchFiles(); }} className="text-gray-400 hover:text-white transition"><RefreshCw size={16} /></button>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl space-y-2.5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Precios globales</span>
                                    {loading ? <Loader2 size={14} className="animate-spin text-gray-500" /> :
                                        backendOk ? <span className="text-success font-bold flex items-center gap-1"><CheckCircle2 size={14} /> OK</span>
                                        : <span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={14} /> Sin datos</span>}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Bucket orders_files</span>
                                    <span className={`font-bold text-xs ${files.length > 0 ? 'text-success' : 'text-gray-500'}`}>
                                        {files.length > 0 ? `${files.length} archivo(s)` : 'Vacío'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Archivos */}
            {files.length > 0 && (
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileStack className="text-primary" size={20} /> Archivos de Órdenes</h2>
                        <span className="text-xs text-gray-500">{files.length} archivos</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto border border-white/5 rounded-xl">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-background/90 backdrop-blur">
                                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                                    <th className="p-3 font-medium">Archivo</th>
                                    <th className="p-3 font-medium">Tamaño</th>
                                    <th className="p-3 font-medium">Fecha</th>
                                    <th className="p-3 font-medium text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {files.map(file => (
                                    <tr key={file.$id} className="hover:bg-white/5 transition">
                                        <td className="p-3 text-sm text-white truncate max-w-[180px]">{file.name}</td>
                                        <td className="p-3 text-sm text-gray-400">{(file.sizeOriginal / 1024).toFixed(1)} KB</td>
                                        <td className="p-3 text-sm text-gray-400">{new Date(file.$createdAt).toLocaleDateString()}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => handleDeleteFile(file.$id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
