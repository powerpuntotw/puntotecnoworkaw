import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { ID } from 'appwrite';
import toast from 'react-hot-toast';
import { DollarSign, Save, Loader2, Info, AlertCircle } from 'lucide-react';

export const LocalPrices = ({ locationId }) => {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [docId, setDocId] = useState(null);

    const defaultPriceList = [
        { id: 'a4_bn', label: 'A4 económico (B&N)' },
        { id: 'a4_color', label: 'A4 color' },
        { id: 'foto_10x15', label: 'Foto 10×15 cm' },
        { id: 'fotocromo_a4', label: 'Fotocromo A4' },
    ];

    const fetchPrices = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'system_config', [
                Query.equal('type', `prices_${locationId}`)
            ]);
            if (res.documents.length > 0) {
                setDocId(res.documents[0].$id);
                setPrices(JSON.parse(res.documents[0].data));
            } else {
                setPrices({});
            }
        } catch (error) {
            console.error("Error fetching local prices:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, [locationId]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const dataStr = JSON.stringify(prices);
            
            if (docId) {
                await databases.updateDocument(dbId, 'system_config', docId, { data: dataStr });
            } else {
                const res = await databases.createDocument(dbId, 'system_config', ID.unique(), {
                    type: `prices_${locationId}`,
                    data: dataStr
                });
                setDocId(res.$id);
            }
            toast.success("Precios de sucursal actualizados.");
        } catch (error) {
            toast.error("Error al guardar precios.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20 text-primary"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Precios de Sucursal</h1>
                    <p className="text-gray-400 mt-1">Define precios específicos para este local (opcional).</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary-glow text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-glow transition disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Guardar</>}
                </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 text-yellow-500/80 text-xs">
                <AlertCircle size={20} className="shrink-0" />
                <p>Si dejas un precio en cero o vacío, el sistema utilizará automáticamente el **Precio Global** configurado por el administrador.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5">
                {defaultPriceList.map(item => (
                    <div key={item.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-gray-600 transition" />
                            <label className="text-gray-300 group-hover:text-white transition">{item.label}</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">$</span>
                            <input 
                                type="number" 
                                value={prices[item.id] || ''} 
                                onChange={(e) => setPrices({...prices, [item.id]: parseFloat(e.target.value) || 0})}
                                placeholder="Global"
                                className="w-24 bg-background/50 border border-white/10 rounded-lg px-3 py-1.5 text-right text-white focus:border-primary outline-none transition placeholder:text-gray-700"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
