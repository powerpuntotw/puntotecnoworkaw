import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, X, Printer, MapPin, Layers, Loader2, Camera, AlertCircle, Sparkles, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import { databases, storage } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { useNavigate } from 'react-router';

export const NewOrderFlow = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [files, setFiles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [colorMode, setColorMode] = useState('bw'); // 'bw' | 'color' | 'foto'
    const [copies, setCopies] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Pricing state
    const [globalPrices, setGlobalPrices] = useState({});
    const [localPrices, setLocalPrices] = useState({});

    useEffect(() => {
        const initOrderFlow = async () => {
            try {
                setIsLoadingData(true);
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                
                const locsRes = await databases.listDocuments(dbId, 'printing_locations', [
                    Query.equal('status', 'activo'),
                    Query.equal('is_open', true)
                ]);
                setLocations(locsRes.documents);
                if (locsRes.documents.length > 0) {
                    setSelectedLocation(locsRes.documents[0]);
                }

                const globalRes = await databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', 'global_prices')
                ]);
                if (globalRes.documents.length > 0) {
                    setGlobalPrices(JSON.parse(globalRes.documents[0].data));
                }

            } catch (error) {
                console.error("Error initializing order flow:", error);
                toast.error("Error al cargar configuración de precios");
            } finally {
                setIsLoadingData(false);
            }
        };
        initOrderFlow();
    }, []);

    useEffect(() => {
        const fetchLocalPrices = async () => {
            if (!selectedLocation || !selectedLocation.allow_custom_prices) {
                setLocalPrices({});
                return;
            }
            try {
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const localRes = await databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', `prices_${selectedLocation.$id}`)
                ]);
                if (localRes.documents.length > 0) {
                    setLocalPrices(JSON.parse(localRes.documents[0].data));
                } else {
                    setLocalPrices({});
                }
            } catch (error) {
                console.error("Error fetching local prices:", error);
            }
        };
        fetchLocalPrices();
        
        if (selectedLocation) {
            if (!selectedLocation.has_color_printing && colorMode === 'color') setColorMode('bw');
            if (!selectedLocation.has_fotoya && colorMode === 'foto') setColorMode('bw');
        }
    }, [selectedLocation]);

    const activePrices = useMemo(() => {
        const prices = { ...globalPrices };
        Object.keys(localPrices).forEach(key => {
            if (localPrices[key] > 0) prices[key] = localPrices[key];
        });
        return prices;
    }, [globalPrices, localPrices]);

    const onDrop = useCallback(acceptedFiles => {
        setFiles(prev => {
            const newFiles = acceptedFiles.filter(f => !prev.some(p => p.name === f.name));
            return [...prev, ...newFiles];
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 20 * 1024 * 1024 // 20MB
    });

    const removeFile = (fileName) => {
        setFiles(files.filter(f => f.name !== fileName));
    };

    const getUnitPrice = () => {
        if (colorMode === 'bw') return activePrices.a4_bn || 50;
        if (colorMode === 'color') return activePrices.a4_color || 150;
        if (colorMode === 'foto') return activePrices.foto_10x15 || 300;
        return 0;
    };

    const estimatedPrice = files.length * copies * getUnitPrice();
    const pointsToEarn = Math.floor(estimatedPrice * 0.10);

    const handleSubmit = async () => {
        if (files.length === 0) return toast.error("Agrega al menos un archivo");
        if (!selectedLocation) return toast.error("Selecciona una sucursal");
        if (!user) return toast.error("Sesión no válida");

        setIsSubmitting(true);
        const toastId = toast.loading("Procesando orden...");

        try {
            const fileIds = [];
            for (const file of files) {
                const uploadedFile = await storage.createFile('orders_files', ID.unique(), file);
                fileIds.push(uploadedFile.$id);
            }

            await databases.createDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                ID.unique(),
                {
                    client_id: user.$id,
                    location_id: selectedLocation.$id,
                    unit_price: getUnitPrice(),
                    total_price: estimatedPrice,
                    copies: copies,
                    status: 'pendiente',
                    files: fileIds,
                    color_mode: colorMode,
                    points_earned: pointsToEarn
                }
            );

            toast.success("¡Orden enviada con éxito!", { id: toastId });
            setTimeout(() => navigate('/dashboard'), 1500);

        } catch (error) {
            console.error("Order submission error:", error);
            toast.error("Error al procesar la orden", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return <div className="flex h-screen items-center justify-center text-primary"><Loader2 className="animate-spin" size={48} /></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative px-4 pb-10">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-hero bg-clip-text text-transparent italic tracking-tight uppercase">Nueva Impresión</h1>
                    <p className="text-gray-400 mt-2 text-lg font-medium tracking-tight">Carga tus documentos y recógelos en sucursal.</p>
                </div>
                <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shadow-inner">
                    <Sparkles className="text-accent" size={20} />
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Puntos Actuales</p>
                        <p className="text-xl font-black text-white">{user?.points || 0} <span className="text-xs font-normal text-gray-400 font-mono italic">pts</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel Izquierdo: Carga */}
                <div className="lg:col-span-8 space-y-6">
                    <div
                        {...getRootProps()}
                        className={`group relative overflow-hidden border-2 border-dashed ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-card/30'} rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-card/50 shadow-2xl`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                        <input {...getInputProps()} />
                        <div className="p-6 bg-primary/10 rounded-full mb-6 group-hover:scale-110 transition-transform ring-1 ring-primary/20">
                            <UploadCloud size={64} className="text-primary drop-shadow-[0_0_15px_rgba(235,28,36,0.5)]" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 italic uppercase">
                            {isDragActive ? "¡Suelta los archivos!" : "Arrastra tus documentos"}
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm font-medium">PDf, Word o Imágenes (JPG/PNG). <br/>Máximo 20MB por archivo.</p>
                        <div className="px-10 py-4 bg-primary hover:bg-primary-glow text-white rounded-2xl font-black shadow-glow transition uppercase tracking-tighter">Seleccionar Archivos</div>
                    </div>

                    {files.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-card/40 border border-white/10 p-5 rounded-3xl backdrop-blur-3xl group animate-in slide-in-from-bottom-2 duration-300 shadow-lg">
                                    <div className="flex items-center gap-4 truncate">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-[10px] text-primary border border-white/5">
                                            {file.name.split('.').pop().toUpperCase()}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-white font-bold truncate group-hover:text-primary transition">{file.name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeFile(file.name); }} className="p-2.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition">
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Panel Derecho: Configuración */}
                <div className="lg:col-span-4">
                    <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sticky top-8 shadow-2xl space-y-8 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                        
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-4 italic">Ajustes de Impresión</h3>

                        <div className="space-y-6">
                            {/* Sucursal */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 italic"><MapPin size={12} className="text-secondary" /> Punto de Retiro</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-primary transition appearance-none cursor-pointer"
                                    value={selectedLocation?.$id || ''}
                                    onChange={(e) => setSelectedLocation(locations.find(l => l.$id === e.target.value))}
                                >
                                    {locations.map(loc => (
                                        <option key={loc.$id} value={loc.$id} className="bg-dark">{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Modos de Impresión */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 italic"><Layers size={12} className="text-secondary" /> Calidad & Color</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setColorMode('bw')}
                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition ${colorMode === 'bw' ? 'border-primary bg-primary/10 text-white shadow-glow' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}
                                    >
                                        <Printer size={20} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">B&N ECO</span>
                                    </button>
                                    <button
                                        onClick={() => setColorMode('color')}
                                        disabled={!selectedLocation?.has_color_printing}
                                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition disabled:opacity-20 disabled:grayscale ${colorMode === 'color' ? 'border-secondary bg-secondary/10 text-white shadow-[0_0_20px_rgba(0,147,216,0.3)]' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}
                                    >
                                        <Layers size={20} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">PREMIUM</span>
                                    </button>
                                    {selectedLocation?.has_fotoya && (
                                        <button
                                            onClick={() => setColorMode('foto')}
                                            className={`col-span-2 p-4 rounded-2xl flex items-center justify-center gap-3 border transition ${colorMode === 'foto' ? 'border-accent bg-accent/10 text-white shadow-[0_0_20px_rgba(255,201,5,0.3)]' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}
                                        >
                                            <Camera size={20} />
                                            <span className="text-[9px] font-black uppercase tracking-widest italic">Servicio FotoYa (10x15)</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Copias */}
                            <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 ring-1 ring-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 italic">Juegos / Copias</span>
                                <div className="flex items-center gap-5">
                                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary hover:text-white text-gray-400 font-black transition">-</button>
                                    <span className="font-black text-white text-xl w-6 text-center italic">{copies}</span>
                                    <button onClick={() => setCopies(copies + 1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary hover:text-white text-gray-400 font-black transition">+</button>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <span>Unitario:</span>
                                <span className="text-white">${getUnitPrice()}</span>
                            </div>
                            <div className="flex justify-between items-end border-t border-primary/20 pt-4">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-tighter italic">Total Orden</span>
                                <span className="text-4xl font-black text-white italic tracking-tighter leading-none">${estimatedPrice}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-success/10 border border-success/20 p-3 rounded-2xl text-success font-black text-[9px] uppercase tracking-[0.15em] justify-center italic">
                                <Sparkles size={14} /> Recompensa: +{pointsToEarn} Puntos
                            </div>
                        </div>

                        {!selectedLocation && (
                            <div className="flex gap-2 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-[10px] font-black uppercase">
                                <AlertCircle size={16} className="shrink-0" />
                                <p>No hay locales disponibles ahora.</p>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || files.length === 0 || !selectedLocation}
                            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-xl italic tracking-tighter transition-all shadow-glow ${isSubmitting || files.length === 0 || !selectedLocation ? 'bg-gray-800 cursor-not-allowed text-gray-600' : 'bg-primary hover:bg-primary-glow text-white group ring-4 ring-primary/20'}`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>Imprimir Ahora <Sparkles size={22} className="group-hover:rotate-12 transition-transform" /></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
