import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Settings, Save, TrendingUp, Activity, FileStack, Loader2, Trash2, RefreshCw, Clock, Shield } from 'lucide-react';

const DB_ID = () => import.meta.env.VITE_APPWRITE_DATABASE_ID;

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
    const [sessionTimeout, setSessionTimeout] = useState(15);
    const [closeOnBrowserExit, setCloseOnBrowserExit] = useState(true);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [sessionDocId, setSessionDocId] = useState(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(DB_ID(), 'system_config', []);
            const pricesConfig = res.documents.find(doc => doc.type === 'prices');
            if (pricesConfig?.data) {
                const saved = JSON.parse(pricesConfig.data);
                setPrices(prev => prev.map(p => ({ ...p, price: saved[p.id] || 0 })));
            }
            const sessionConfig = res.documents.find(doc => doc.type === 'session_config');
            if (sessionConfig?.data) {
                const sc = JSON.parse(sessionConfig.data);
                setSessionTimeout(sc.session_timeout_minutes ?? 15);
                setCloseOnBrowserExit(sc.close_on_browser_exit ?? true);
                setSessionDocId(sessionConfig.$id);
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

    useEffect(() => { fetchSettings(); fetchFiles(); }, []);

    const handlePriceChange = (id, value) => setPrices(prices.map(p => p.id === id ? { ...p, price: parseFloat(value) || 0 } : p));

    const handleSavePrices = async () => {
        try {
            setIsSaving(true);
            const priceData = prices.reduce((acc, p) => ({ ...acc, [p.id]: p.price }), {});
            const res = await databases.listDocuments(DB_ID(), 'system_config', []);
            const existing = res.documents.find(doc => doc.type === 'prices');
            if (existing) {
                await databases.updateDocument(DB_ID(), 'system_config', existing.$id, { data: JSON.stringify(priceData) });
            } else {
                await databases.createDocument(DB_ID(), 'system_config', ID.unique(), { type: 'prices', data: JSON.stringify(priceData) });
            }
            toast.success("Precios actualizados exitosamente");
        } catch { toast.error("Error al guardar precios"); }
        finally { setIsSaving(false); }
    };

    const handleSaveSessionConfig = async () => {
        try {
            setIsSavingSession(true);
            const data = JSON.stringify({ session_timeout_minutes: sessionTimeout, close_on_browser_exit: closeOnBrowserExit });
            if (sessionDocId) {
                await databases.updateDocument(DB_ID(), 'system_config', sessionDocId, { data });
            } else {
                const doc = await databases.createDocument(DB_ID(), 'system_config', ID.unique(), { type: 'session_config', data });
                setSessionDocId(doc.$id);
            }
            toast.success("Configuración de sesión guardada");
        } catch { toast.error("Error al guardar configuración de sesión"); }
        finally { setIsSavingSession(false); }
    };

    const handleSimulate = () => {
        const factor = 1 + (inflation / 100);
        setSimulatedPrices(prices.map(p => ({ ...p, newPrice: Math.round((p.price * factor) / 10) * 10 })));
    };

    const applySimulation = () => {
        if (!simulatedPrices) return;
        setPrices(simulatedPrices.map(p => ({ ...p, price: p.newPrice })));
        setSimulatedPrices(null);
        setInflation(0);
        toast.success("Ajuste aplicado. No olvides Guardar.");
    };

    const handleDeleteFile = async (id) => {
        if (!window.confirm("¿Eliminar este archivo permanentemente?")) return;
        try {
            await storage.deleteFile(import.meta.env.VITE_STORAGE_BUCKET_ID || 'orders', id);
            setFiles(files.filter(f => f.$id !== id));
            toast.success("Archivo eliminado");
        } catch { toast.error("Error al eliminar archivo"); }
    };

    const TIMEOUT_OPTIONS = [
        { value: 5, label: '5 min' },
        { value: 10, label: '10 min' },
        { value: 15, label: '15 min' },
        { value: 30, label: '30 min' },
        { value: 60, label: '1 hora' },
        { value: 120, label: '2 horas' },
        { value: 0, label: 'Sin límite ⚠️' },
    ];

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Mantenimiento del Sistema</h1>
                <p className="text-gray-400 mt-2">Herramientas técnicas y configuración de precios.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Precios Globales */}
                <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="text-primary" size={20} /> Precios Globales</h2>
                        <button disabled={isSaving} onClick={handleSavePrices}
                            className="bg-primary hover:bg-primary-glow text-white px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50 text-sm font-bold">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Guardar</>}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {prices.map(p => (
                            <div key={p.id} className="flex items-center justify-between group">
                                <label className="text-gray-400 group-hover:text-gray-200 transition text-sm">{p.label}</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600 text-sm">$</span>
                                    <input type="number" value={p.price} onChange={(e) => handlePriceChange(p.id, e.target.value)}
                                        className="w-24 bg-background/50 border border-white/5 rounded-lg px-3 py-1.5 text-right text-white focus:border-primary outline-none transition text-sm" />
                                    {simulatedPrices && (
                                        <span className="text-success text-xs font-bold animate-pulse">→ ${simulatedPrices.find(s => s.id === p.id)?.newPrice}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Ajuste Inflacionario */}
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><TrendingUp className="text-warning" size={20} /> Ajuste Inflacionario</h2>
                        <p className="text-sm text-gray-500 mb-4">Aumenta todos los precios. Redondeo a múltiplos de 10.</p>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input type="number" placeholder="Ej: 15" value={inflation} onChange={(e) => setInflation(e.target.value)}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white pr-10 outline-none focus:border-warning text-sm" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                            </div>
                            <button onClick={handleSimulate} className="bg-warning/20 hover:bg-warning/30 text-warning px-5 py-2.5 rounded-xl font-bold transition text-sm">Simular</button>
                        </div>
                        {simulatedPrices && (
                            <div className="mt-4 p-4 bg-success/10 border border-success/20 rounded-xl flex items-center justify-between">
                                <span className="text-success text-sm font-medium">Tabla generada</span>
                                <button onClick={applySimulation} className="bg-success text-white px-4 py-1.5 rounded-lg text-sm font-bold">Aplicar Todo</button>
                            </div>
                        )}
                    </div>

                    {/* Seguridad de Sesión */}
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Shield className="text-secondary" size={20} /> Seguridad de Sesión</h2>
                            <button disabled={isSavingSession} onClick={handleSaveSessionConfig}
                                className="bg-secondary/20 hover:bg-secondary/30 text-secondary px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50 text-sm font-bold border border-secondary/20">
                                {isSavingSession ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Guardar</>}
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-300">
                                    <Clock size={14} className="text-secondary" /> Timeout de inactividad:
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {TIMEOUT_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setSessionTimeout(opt.value)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                                                sessionTimeout === opt.value
                                                    ? 'bg-secondary/20 border-secondary/50 text-secondary'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            }`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div onClick={() => setCloseOnBrowserExit(!closeOnBrowserExit)}
                                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 transition group">
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-secondary transition">Cerrar sesión al cerrar el navegador</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Cerrar pestaña o navegador cierra la sesión inmediatamente.</p>
                                </div>
                                <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${closeOnBrowserExit ? 'bg-secondary' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${closeOnBrowserExit ? 'translate-x-6' : 'translate-x-1'}`} />
                                </div>
                            </div>
                            {sessionTimeout > 0 && (
                                <div className="flex items-start gap-2 p-3 bg-secondary/5 border border-secondary/20 rounded-xl text-xs text-gray-400">
                                    <Shield size={13} className="text-secondary shrink-0 mt-0.5" />
                                    <span>Los usuarios ven un aviso 60 segundos antes del cierre y pueden extender su sesión con un clic.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Estado del Backend */}
                    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Activity className="text-secondary" size={20} /> Estado del Backend</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_8px_rgba(164,204,57,0.8)]"></div>
                                    <span className="text-white font-medium text-sm">Appwrite Core Active</span>
                                </div>
                                <button onClick={fetchSettings} className="text-gray-400 hover:text-white transition"><RefreshCw size={16} /></button>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Verificación</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Colección system_config</span>
                                    {loading ? <Loader2 size={14} className="animate-spin" /> :
                                        prices.some(p => p.price > 0) ? <span className="text-success font-bold text-xs">OK</span> : <span className="text-red-500 font-bold text-xs">No Detectada</span>}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Config de sesión</span>
                                    {sessionDocId ? <span className="text-success font-bold text-xs">OK</span> : <span className="text-warning font-bold text-xs">Default (15 min)</span>}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Bucket orders_files</span>
                                    {files.length > 0 ? <span className="text-success font-bold text-xs">OK ({files.length})</span> : <span className="text-orange-500 font-bold text-xs">Vacío</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Administrador de Archivos */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><FileStack className="text-primary" size={20} /> Administrador de Archivos</h2>
                    <span className="text-xs text-gray-500">{files.length} archivos</span>
                </div>
                <div className="max-h-72 overflow-y-auto border border-white/5 rounded-xl">
                    <div className="sm:hidden divide-y divide-white/5">
                        {files.map(file => (
                            <div key={file.$id} className="p-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{(file.sizeOriginal / 1024).toFixed(1)} KB · {new Date(file.$createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => handleDeleteFile(file.$id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition shrink-0"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        {files.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Sin archivos</div>}
                    </div>
                    <table className="w-full text-left hidden sm:table">
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
                                    <td className="p-4 text-right"><button onClick={() => handleDeleteFile(file.$id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
