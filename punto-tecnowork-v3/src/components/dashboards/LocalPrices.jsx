import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import toast from 'react-hot-toast';
import { DollarSign, Save, Loader2, Info, AlertCircle, Camera, Palette, Globe } from 'lucide-react';

export const LocalPrices = ({ locationId }) => {
    const [location, setLocation] = useState(null);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [docId, setDocId] = useState(null);

    const defaultPriceList = [
        { id: 'a4_bn', label: 'A4 económico (B&N)', icon: <Palette size={14} /> },
        { id: 'a4_color', label: 'A4 color Premium', icon: <Palette size={14} className="text-secondary" /> },
        { id: 'foto_10x15', label: 'Foto 10×15 cm (Glossy)', icon: <Camera size={14} className="text-red-400" />, requiresFlag: 'has_fotoya' },
        { id: 'fotocromo_a4', label: 'Fotocromo A4 / Ilustración', icon: <Globe size={14} className="text-primary-glow" /> },
    ];

    const fetchData = async () => {
        if (!locationId) return;
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            const [locRes, pricesRes] = await Promise.all([
                databases.getDocument(dbId, 'printing_locations', locationId),
                databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', `prices_${locationId}`)
                ])
            ]);

            setLocation(locRes);
            
            if (pricesRes.documents.length > 0) {
                setDocId(pricesRes.documents[0].$id);
                setPrices(JSON.parse(pricesRes.documents[0].data));
            } else {
                setPrices({});
            }
        } catch (error) {
            console.error("Error fetching local dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [locationId]);

    const handleSave = async () => {
        if (!location?.allow_custom_prices) {
            toast.error("Esta sucursal no tiene permitido definir precios propios. Contacta al administrador.");
            return;
        }

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

    if (loading) return <div className="flex justify-center py-20 text-primary"><Loader2 className="animate-spin" size={40} /></div>;

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tight">Arancelería de Sucursal</h1>
                    <p className="text-gray-400 mt-1">Configura valores específicos para {location?.name}.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving || !location?.allow_custom_prices}
                    className="bg-primary hover:bg-primary-glow text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 font-black shadow-glow transition disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} className="group-hover:scale-110 transition-transform" /> Aplicar Cambios</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Status Column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-card/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Estado de Permisos</h3>
                        
                        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${location?.allow_custom_prices ? 'bg-success/5 border-success/20 text-success' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                            <DollarSign size={20} />
                            <div>
                                <p className="text-xs font-bold uppercase">Custom Pricing</p>
                                <p className="text-[10px] opacity-70">{location?.allow_custom_prices ? 'HABILITADO' : 'BLOQUEADO'}</p>
                            </div>
                        </div>

                        {!location?.allow_custom_prices && (
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-3 text-gray-400 text-xs italic">
                                <AlertCircle size={18} className="shrink-0 text-primary-glow" />
                                <p>Para editar precios, el administrador debe activar el flag **"Custom Pricing"** para esta sucursal.</p>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-black text-gray-600 uppercase">Capacidades Activas</h4>
                            <div className="flex flex-wrap gap-2">
                                {location?.has_fotoya && <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg uppercase">FOTOYA</span>}
                                {location?.has_color_printing && <span className="px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold rounded-lg uppercase">COLOR</span>}
                                <span className="px-2 py-1 bg-white/5 border border-white/10 text-gray-500 text-[10px] font-bold rounded-lg uppercase">B&N {location?.max_bw_size}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rates Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-5 rounded-3xl flex gap-4 text-yellow-500/80 text-sm italic backdrop-blur-md">
                        <Info size={24} className="shrink-0 mt-0.5" />
                        <p>Los campos vacíos o con valor **0** heredarán automáticamente el **Precio Global** (Sede Central). Define valores aquí solo si deseas cobrar un precio distinto en este local.</p>
                    </div>

                    <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-glow">
                        {defaultPriceList.map(item => {
                            const isVisible = !item.requiresFlag || location?.[item.requiresFlag];
                            if (!isVisible) return null;

                            return (
                                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-white/5 rounded-2xl transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-primary-glow transition">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <label className="text-white font-bold block">{item.label}</label>
                                            <p className="text-[10px] text-gray-500 font-mono tracking-tighter">SKU: {item.id.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <input 
                                                type="number" 
                                                disabled={!location?.allow_custom_prices}
                                                value={prices[item.id] || ''} 
                                                onChange={(e) => setPrices({...prices, [item.id]: parseFloat(e.target.value) || 0})}
                                                placeholder="Usar Global"
                                                className="w-36 bg-background/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-right text-white font-black focus:border-primary-glow focus:ring-1 focus:ring-primary-glow outline-none transition placeholder:text-gray-700 disabled:opacity-30"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
