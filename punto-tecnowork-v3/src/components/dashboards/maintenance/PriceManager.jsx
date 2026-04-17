import { useState, useEffect } from 'react';
import { databases } from '../../../lib/appwrite';
import { ID, Query } from 'appwrite';
import toast from 'react-hot-toast';
import { Settings, Save, TrendingUp, Loader2 } from 'lucide-react';

const PRICE_LIST = [
    { id: 'a4_bn',        label: 'A4 B&N (Eco)' },
    { id: 'a4_color',     label: 'A4 Color' },
    { id: 'a3_bn',        label: 'A3 B&N' },
    { id: 'a3_color',     label: 'A3 Color' },
    { id: 'foto_10x15',   label: 'Foto 10×15 cm (FotoYa)' },
    { id: 'fotocromo_a4', label: 'Fotocromo A4' },
];

export const PriceManager = ({ onStatusChange }) => {
    const [prices, setPrices] = useState(PRICE_LIST.map(p => ({ ...p, price: 0 })));
    const [inflation, setInflation] = useState('');
    const [simulatedPrices, setSimulatedPrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [configDocId, setConfigDocId] = useState(null);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'system_config', [
                Query.equal('type', 'global_prices')
            ]);
            if (res.documents.length > 0) {
                const doc = res.documents[0];
                setConfigDocId(doc.$id);
                const saved = JSON.parse(doc.data);
                setPrices(PRICE_LIST.map(p => ({ ...p, price: saved[p.id] || 0 })));
                onStatusChange?.(true);
            } else {
                onStatusChange?.(false);
            }
        } catch { 
            onStatusChange?.(false);
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchPrices(); }, []);

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
            onStatusChange?.(true);
            toast.success('Precios globales actualizados');
        } catch { 
            toast.error('Error al guardar precios'); 
        } finally { 
            setIsSaving(false); 
        }
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

    return (
        <div className="space-y-6">
            {/* Tabla de Precios */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-primary" size={20} /> Precios Globales
                    </h2>
                    <button disabled={isSaving || loading} onClick={handleSavePrices}
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

            {/* Ajuste inflacionario */}
            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-3">
                    <TrendingUp className="text-yellow-400" size={20} /> Ajuste Inflacionario
                </h2>
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
        </div>
    );
};
