import { useState, useEffect } from 'react';
import { databases, storage } from '../../lib/appwrite';
import { ID } from 'appwrite';
import toast from 'react-hot-toast';
import { Palette, Upload, Trash2, Save, Loader2, Image as ImageIcon, RotateCcw, Sparkles } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';

export const AdminBranding = () => {
    const { refreshBranding } = useBranding();
    const [config, setConfig] = useState({
        platformName: 'Punto Tecnowork',
        tagline: 'Impresiones rápidas y fáciles',
        logoMain: '',
        logoLight: '',
        logoDark: '',
        colors: {
            primary: '#EB1C24',
            secondary: '#0093D8',
            accent: '#FFC905'
        }
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
                const data = JSON.parse(doc.data);
                setConfig({
                    ...config,
                    ...data,
                    colors: {
                        ...config.colors,
                        ...(data.colors || {})
                    }
                });
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
            
            // Actualización reactiva instantánea
            if (refreshBranding) await refreshBranding();
            
            toast.success("Branding actualizado correctamente");
        } catch (error) {
            console.error("Save branding error:", error);
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
            const bucketId = import.meta.env.VITE_STORAGE_BUCKET_ID || 'branding';
            const res = await storage.createFile(bucketId, ID.unique(), file);
            setConfig({ ...config, [type]: res.$id });
            toast.success("Logo subido correctamente", { id: 'upload' });
        } catch (error) {
            console.error("Upload error:", error);
            const message = error.code === 404 
                ? "El bucket 'branding' no existe en Appwrite. Por favor, créalo o revisa el panel de Mantenimiento."
                : "Error al subir imagen. Verifica los permisos.";
            toast.error(message, { id: 'upload', duration: 5000 });
        }
    };

    const resetColors = () => {
        setConfig({
            ...config,
            colors: {
                primary: '#EB1C24',
                secondary: '#0093D8',
                accent: '#FFC905'
            }
        });
        toast.success("Colores restaurados por defecto");
    };

    if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 max-w-4xl pb-10">
            <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-hero bg-clip-text text-transparent">Punto de Marca (Branding)</h1>
                <p className="text-gray-400 mt-2 font-medium">Personaliza la identidad visual y los colores base de la plataforma.</p>
            </div>

            <div className="bg-card/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-glow space-y-10 relative overflow-hidden">
                {/* Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* SECCIÓN TEXTOS Y COLORES */}
                    <div className="space-y-10">
                        {/* Identidad */}
                        <div className="space-y-6">
                            <h2 className="text-sm font-black text-white italic uppercase tracking-[0.2em] flex items-center gap-2">
                                <Palette size={18} className="text-primary" /> Identidad Visual
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nombre de la Plataforma</label>
                                    <input 
                                        type="text" 
                                        value={config.platformName} 
                                        onChange={e => setConfig({...config, platformName: e.target.value})} 
                                        className="w-full bg-background/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:border-primary transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Tagline / Slogan</label>
                                    <input 
                                        type="text" 
                                        value={config.tagline} 
                                        onChange={e => setConfig({...config, tagline: e.target.value})} 
                                        className="w-full bg-background/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm font-bold outline-none focus:border-primary transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Paleta de Colores */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-sm font-black text-white italic uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Palette size={18} className="text-secondary" /> Paleta Base
                                </h2>
                                <button onClick={resetColors} className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition flex items-center gap-1.5">
                                    <RotateCcw size={10} /> Reset
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { key: 'primary', label: 'Color Primario', desc: 'Botones y acentos' },
                                    { key: 'secondary', label: 'Color Secundario', desc: 'Elementos premium' },
                                    { key: 'accent', label: 'Color de Acento', desc: 'Destacados' }
                                ].map((color) => (
                                    <div key={color.key} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{color.label}</p>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase mt-0.5">{color.desc}</p>
                                            </div>
                                            <input 
                                                type="color" 
                                                value={config.colors?.[color.key] || '#000000'} 
                                                onChange={e => setConfig({
                                                    ...config, 
                                                    colors: { ...config.colors, [color.key]: e.target.value }
                                                })} 
                                                className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-3 rounded-full overflow-hidden bg-background/50 border border-white/5">
                                                <div className="h-full transition-all duration-500" style={{ backgroundColor: config.colors?.[color.key], width: '100%' }} />
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{config.colors?.[color.key]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN LOGOS */}
                    <div className="space-y-6">
                        <h2 className="text-sm font-black text-white italic uppercase tracking-[0.2em] flex items-center gap-2">
                            <ImageIcon size={18} className="text-warning" /> Logos de Sistema
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { key: 'logoMain', label: 'Logo Principal', desc: 'Vistas claras' },
                                { key: 'logoLight', label: 'Logo sobre Oscuro', desc: 'Dashboards' },
                                { key: 'logoDark', label: 'Logo sobre Claro', desc: 'Documentos' }
                            ].map((logo) => (
                                <div key={logo.key} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{logo.label}</p>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase mt-0.5">{logo.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {config[logo.key] ? (
                                            <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-2">
                                                <img src={storage.getFilePreview(import.meta.env.VITE_STORAGE_BUCKET_ID || 'branding', config[logo.key])} alt="Logo" className="w-full h-full object-contain" />
                                                <button onClick={() => setConfig({...config, [logo.key]: ''})} className="absolute inset-0 bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                    <Trash2 size={16} className="text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer w-14 h-14 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition">
                                                <Upload size={20} />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(logo.key, e)} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary-glow text-white font-black py-4.5 rounded-2xl shadow-glow flex items-center justify-center gap-3 transition disabled:opacity-50 uppercase tracking-tighter italic text-lg"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Cambios de Marca</>}
                    </button>
                </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary mt-1">
                    <Sparkles size={18} />
                </div>
                <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none">Actualización Inteligente</h4>
                    <p className="text-[11px] text-gray-400 mt-2 font-medium leading-relaxed">
                        Los cambios realizados se aplicarán al instante en toda la plataforma mediante inyección reactiva de CSS. No es necesario recargar el sitio para ver los nuevos colores.
                    </p>
                </div>
            </div>
        </div>
    );
};
