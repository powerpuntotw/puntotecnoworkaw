import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Palette, Upload, Trash2, Save, Loader2, Image as ImageIcon } from 'lucide-react';

export const AdminBranding = () => {
    const [config, setConfig] = useState({
        platformName: 'Punto Tecnowork',
        tagline: 'Impresiones rápidas y fáciles',
        logoMain: '',
        logoLight: '',
        logoDark: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [docId, setDocId] = useState(null);

    const fetchBranding = async () => {
        try {
            setLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const res = await databases.listDocuments(dbId, 'system_config', []);
            const doc = res.documents.find(d => d.type === 'branding');
            if (doc) {
                setDocId(doc.$id);
                setConfig(JSON.parse(doc.data));
            }
        } catch (error) {
            console.error("Error fetching branding:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            if (docId) {
                await databases.updateDocument(dbId, 'system_config', docId, { data: JSON.stringify(config) });
            } else {
                const res = await databases.createDocument(dbId, 'system_config', ID.unique(), { type: 'branding', data: JSON.stringify(config) });
                setDocId(res.$id);
            }
            toast.success("Branding actualizado");
        } catch (error) {
            toast.error("Error al guardar branding");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (type, e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            toast.loading("Subiendo logo...", { id: 'upload' });
            const res = await storage.createFile(import.meta.env.VITE_STORAGE_BUCKET_ID || 'branding', ID.unique(), file);
            setConfig({ ...config, [type]: res.$id });
            toast.success("Logo subido correctamente", { id: 'upload' });
        } catch (error) {
            toast.error("Error al subir imagen", { id: 'upload' });
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Punto de Marca (Branding)</h1>
                <p className="text-gray-400 mt-2">Personaliza la identidad visual de la plataforma.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-glow space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Palette size={18} className="text-primary" /> Textos Principales</h2>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Nombre de la Plataforma</label>
                            <input 
                                type="text" 
                                value={config.platformName} 
                                onChange={e => setConfig({...config, platformName: e.target.value})} 
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Tagline / Slogan</label>
                            <input 
                                type="text" 
                                value={config.tagline} 
                                onChange={e => setConfig({...config, tagline: e.target.value})} 
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon size={18} className="text-secondary" /> Logos del Sistema</h2>
                        
                        <div className="space-y-4">
                            {['logoMain', 'logoLight', 'logoDark'].map((type) => (
                                <div key={type} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-sm font-medium text-white capitalize">{type.replace('logo', 'Logo ')}</p>
                                        <p className="text-[10px] text-gray-500">Formato: PNG/SVG max 2MB</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {config[type] ? (
                                            <div className="relative group w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                                <img src={storage.getFilePreview(import.meta.env.VITE_STORAGE_BUCKET_ID || 'branding', config[type])} alt="Logo" className="w-full h-full object-contain" />
                                                <button onClick={() => setConfig({...config, [type]: ''})} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} className="text-white" /></button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer p-3 bg-primary/20 hover:bg-primary/30 text-primary-glow rounded-xl transition">
                                                <Upload size={20} />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(type, e)} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary-glow text-white font-bold py-4 rounded-xl shadow-glow flex items-center justify-center gap-3 transition disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Identidad de Marca</>}
                    </button>
                </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                <p className="text-sm text-primary-glow/80 italic text-center">
                    Nota: Los cambios en el logo principal y el nombre se verán reflejados en el encabezado y la pantalla de inicio tras guardar.
                </p>
            </div>
        </div>
    );
};
