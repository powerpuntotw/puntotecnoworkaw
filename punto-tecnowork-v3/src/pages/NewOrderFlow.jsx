import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    UploadCloud, X, Printer, Layers, Loader2, Camera, AlertCircle,
    Sparkles, FileText, MapPin, Clock, CheckCircle2, ChevronRight,
    ChevronLeft, Wifi, WifiOff, Zap, Package
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import { databases, storage } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { useNavigate } from 'react-router';

import { PriceService } from '../services/PriceService';
import { OrderService } from '../services/OrderService';
import { BranchService } from '../services/BranchService';

// El mapeo de campos de pack ahora se centraliza en PriceService y OrderService

export const NewOrderFlow = () => {
    const { user, dbUser } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [files, setFiles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [colorMode, setColorMode] = useState('bw');
    const [copies, setCopies] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [globalPrices, setGlobalPrices] = useState({});
    const [localPrices, setLocalPrices] = useState({});

    // ── PrintPass™ ──
    const [ppEnabledLocs, setPpEnabledLocs] = useState([]);
    const [activePacks, setActivePacks] = useState([]);      // print_packs activos del cliente
    const [usePack, setUsePack] = useState(false);           // toggle "usar pack"
    const [selectedPack, setSelectedPack] = useState(null);  // pack elegido
    const [loadingPacks, setLoadingPacks] = useState(false);

    // ── Init ──
    useEffect(() => {
        const init = async () => {
            try {
                setIsLoadingData(true);
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const [locsRes, globalRes, ppRes] = await Promise.all([
                    databases.listDocuments(dbId, 'printing_locations', [
                        Query.equal('status', 'activo'), Query.equal('is_open', true)
                    ]),
                    databases.listDocuments(dbId, 'system_config', [
                        Query.equal('type', 'global_prices')
                    ]),
                    databases.listDocuments(dbId, 'system_config', [
                        Query.equal('type', 'printpass_config')
                    ]),
                ]);
                setLocations(locsRes.documents);
                if (globalRes.documents.length > 0) {
                    try { setGlobalPrices(JSON.parse(globalRes.documents[0].data)); } catch {}
                }
                if (ppRes.documents.length > 0) {
                    const ppData = JSON.parse(ppRes.documents[0].data);
                    if (ppData.enabled) setPpEnabledLocs(ppData.enabled_locations ?? []);
                }
            } catch (e) {
                console.error('Error init order flow:', e);
                toast.error('Error al cargar datos');
            } finally {
                setIsLoadingData(false);
            }
        };
        init();
    }, []);

    // ── Cargar packs activos del cliente cuando selecciona sucursal ──
    useEffect(() => {
        const fetchPacks = async () => {
            if (!selectedLocation || !user) { setActivePacks([]); setUsePack(false); setSelectedPack(null); return; }
            // Solo si la sucursal tiene PrintPass™ activo
            if (!ppEnabledLocs.includes(selectedLocation.$id)) { setActivePacks([]); return; }
            try {
                setLoadingPacks(true);
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const res = await databases.listDocuments(dbId, 'print_packs', [
                    Query.equal('client_id', user.$id),
                    Query.equal('location_id', selectedLocation.$id),
                    Query.equal('status', 'activo'),
                    Query.orderAsc('activated_at'),
                    Query.limit(10),
                ]);
                // Lazy expiration: marcar expirados
                const now = new Date();
                const valid = [];
                for (const pack of res.documents) {
                    if (pack.expires_at && new Date(pack.expires_at) < now) {
                        try {
                            await databases.updateDocument(dbId, 'print_packs', pack.$id, { status: 'expirado' });
                        } catch { }
                    } else {
                        valid.push(pack);
                    }
                }
                setActivePacks(valid);
                // Auto-seleccionar el más antiguo si tiene saldo para el tipo actual
                if (valid.length > 0) setSelectedPack(valid[0]);
                else { setUsePack(false); setSelectedPack(null); }
            } catch (e) { console.error(e); }
            finally { setLoadingPacks(false); }
        };
        fetchPacks();
    }, [selectedLocation, user, ppEnabledLocs]);

    // ── Precios locales ──
    useEffect(() => {
        const fetchLocalPrices = async () => {
            if (!selectedLocation?.allow_custom_prices) { setLocalPrices({}); return; }
            try {
                const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
                const res = await databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', `prices_${selectedLocation.$id}`)
                ]);
                setLocalPrices(res.documents.length > 0 ? JSON.parse(res.documents[0].data) : {});
            } catch { setLocalPrices({}); }
        };
        fetchLocalPrices();
        if (selectedLocation) {
            if (!selectedLocation.has_color_printing && colorMode === 'color') setColorMode('bw');
            if (!selectedLocation.has_fotoya && colorMode === 'foto') setColorMode('bw');
        }
        setUsePack(false);
    }, [selectedLocation]);

    // Cuando cambia el modo de color, verificar si el pack tiene saldo para ese tipo
    useEffect(() => {
        if (!usePack || !selectedPack) return;
        const field = COLOR_TO_PACK[colorMode];
        if (!field || (selectedPack[field] ?? 0) === 0) setUsePack(false);
    }, [colorMode]);

    const pricing = useMemo(() => PriceService.calculateOrder({
        fileCount: files.length,
        copies,
        colorMode,
        globalPrices,
        localPrices,
        selectedPack,
        usePack
    }), [files.length, copies, colorMode, globalPrices, localPrices, selectedPack, usePack]);

    const { 
        unitPrice, totalUnits, packUnitsUsed, 
        paidUnits, estimatedPrice, pointsToEarn, packField 
    } = pricing;

    // Pack tiene saldo para el tipo de impresión elegido (basado en el cálculo del servicio)
    const packHasSaldo = selectedPack && packField && (selectedPack[packField] ?? 0) > 0;

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
            'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 20 * 1024 * 1024
    });

    // ── Submit ──
    const handleSubmit = async () => {
        if (files.length === 0) return toast.error('Agregá al menos un archivo');
        if (!selectedLocation)  return toast.error('Seleccioná una sucursal');
        if (!user)              return toast.error('Sesión no válida');

        setIsSubmitting(true);
        const toastId = toast.loading('Procesando orden...');
        try {
            // 1. Subir archivos
            const fileIds = [];
            for (const file of files) {
                const uploaded = await storage.createFile('orders_files', ID.unique(), file);
                fileIds.push(uploaded.$id);
            }

            // 2. Procesar Orden vía Servicio (Centraliza creación de orden y descuento de pack)
            await OrderService.createOrder({
                client: {
                    id:   user.$id,
                    name: dbUser?.full_name || user.name || 'Cliente'
                },
                location: {
                    id:   selectedLocation.$id,
                    name: selectedLocation.name
                },
                fileIds,
                details: {
                    colorMode,
                    copies
                },
                pricing: {
                    unitPrice,
                    totalPrice: estimatedPrice,
                    pointsEarned: pointsToEarn
                },
                packInfo: {
                    usePack,
                    selectedPack,
                    packUnitsUsed,
                    packField,
                    paidUnits
                }
            });

            toast.success('¡Orden enviada con éxito!', { id: toastId });
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            console.error('Order error:', error);
            toast.error('Error al procesar la orden', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return (
        <div className="flex h-screen items-center justify-center text-primary"><Loader2 className="animate-spin" size={48} /></div>
    );

    const LocationCard = ({ loc, selected, onSelect }) => {
        const online = BranchService.isOperatorOnline(loc.last_active_at);
        const lastSeen = BranchService.formatLastSeen(loc.last_active_at);
        const hasPP = ppEnabledLocs.includes(loc.$id);
        return (
            <div onClick={() => onSelect(loc)}
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${selected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-white/10 bg-card/40 hover:border-white/25'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h3 className="text-white font-black text-sm sm:text-base tracking-tight truncate">{loc.name}</h3>
                            <div className="flex gap-1">
                                {loc.has_fotoya && <span className="text-[8px] font-black bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full uppercase">Foto</span>}
                                {hasPP && <span className="text-[8px] font-black bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">PP</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] sm:text-xs truncate">
                            <MapPin size={10} className="shrink-0" /> {loc.address}
                        </div>
                    </div>
                    {selected && <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-success/10 border border-success/20 text-success uppercase">
                        <span className="w-1 h-1 rounded-full bg-success"></span> Abierto
                    </span>
                    {online ? (
                        <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary uppercase">
                            <Wifi size={8} /> Online
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 uppercase">
                            <WifiOff size={8} /> {lastSeen}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 px-4 pb-10">
            <Toaster position="top-right" />
            <div>
                <h1 className="text-3xl font-black bg-gradient-hero bg-clip-text text-transparent italic tracking-tight uppercase">Nueva Impresión</h1>
                <p className="text-gray-400 mt-1">Cargá tus documentos y retirálos en sucursal.</p>
            </div>

            {/* Stepper / Progress Reader */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Paso <span className="text-primary">{step}</span> de 3
                    </span>
                    <span className="text-xs font-black text-white italic truncate uppercase">
                        {['Cargar Archivos', 'Elegir Sucursal', 'Personalizar'][step - 1]}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-primary transition-all duration-500 ease-out shadow-glow" 
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* PASO 1 */}
            {step === 1 && (
                <div className="space-y-5">
                    <div {...getRootProps()} className={`border-2 border-dashed ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-card/30'} rounded-[2rem] p-8 sm:p-14 flex flex-col items-center justify-center text-center transition cursor-pointer hover:border-primary/50`}>
                        <input {...getInputProps()} />
                        <div className="p-4 sm:p-5 bg-primary/10 rounded-full mb-4 sm:mb-5 ring-1 ring-primary/20">
                            <UploadCloud size={32} className="text-primary sm:w-12 sm:h-12" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-white mb-2 italic uppercase">{isDragActive ? '¡Soltá los archivos!' : 'Arrastrá tus documentos'}</h3>
                        <p className="text-gray-500 mb-6 text-xs sm:text-sm px-4">PDF, Word o Imágenes (JPG/PNG) — máx. 20MB c/u</p>
                        <div className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-glow text-white rounded-xl font-black shadow-glow transition uppercase text-sm">Seleccionar Archivos</div>
                    </div>
                    {files.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-card/40 border border-white/10 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3 truncate">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-[10px] text-primary border border-white/5 shrink-0">
                                            {file.name.split('.').pop().toUpperCase()}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-white font-bold text-sm truncate">{file.name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{(file.size/1024/1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setFiles(files.filter(f => f.name !== file.name))} className="p-2 text-gray-500 hover:text-primary rounded-lg transition shrink-0"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setStep(2)} disabled={files.length === 0}
                        className="hidden sm:flex w-full py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black text-lg shadow-glow transition disabled:opacity-30 disabled:cursor-not-allowed items-center justify-center gap-3 uppercase tracking-tighter italic">
                        Continuar <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* PASO 2 */}
            {step === 2 && (
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-black text-white mb-1">Seleccioná un Local</h2>
                        <p className="text-gray-400 text-sm">¿Dónde querés retirar tus impresiones?</p>
                    </div>
                    {locations.length === 0 ? (
                        <div className="flex items-center gap-3 p-5 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                            <AlertCircle size={20} className="shrink-0" />
                            <p className="text-sm font-bold">No hay sucursales disponibles en este momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {locations.map(loc => (
                                <LocationCard key={loc.$id} loc={loc} selected={selectedLocation?.$id === loc.$id} onSelect={setSelectedLocation} />
                            ))}
                        </div>
                    )}
                    <div className="hidden sm:flex gap-3">
                        <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 text-gray-400 font-black hover:bg-white/10 transition border border-white/5">
                            <ChevronLeft size={18} /> Volver
                        </button>
                        <button onClick={() => setStep(3)} disabled={!selectedLocation}
                            className="flex-1 py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black text-lg shadow-glow transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-tighter italic">
                            Continuar <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* PASO 3 */}
            {step === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-white mb-1">Opciones de Impresión</h2>
                            <p className="text-gray-400 text-sm">Configurá calidad y cantidad.</p>
                        </div>

                        {/* ── Banner PrintPass™ ── */}
                        {loadingPacks && (
                            <div className="flex items-center gap-2 text-primary text-sm">
                                <Loader2 size={14} className="animate-spin" /> Verificando tus PrintPass™...
                            </div>
                        )}
                        {!loadingPacks && activePacks.length > 0 && packHasSaldo && (
                            <div className={`rounded-2xl border p-4 transition ${usePack ? 'bg-primary/10 border-primary/30' : 'bg-white/3 border-white/10'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap size={16} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm uppercase tracking-wide">
                                                Tenés PrintPass™ disponible
                                            </p>
                                            <p className="text-gray-400 text-[11px] mt-0.5">
                                                {selectedPack?.reward_name} · Saldo {colorMode === 'bw' ? 'B&N A4' : colorMode === 'color' ? 'Color A4' : 'Fotos'}:{' '}
                                                <span className="text-primary font-black">{packSaldo} unidades</span>
                                            </p>
                                            {selectedPack?.expires_at && (
                                                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                                    <Clock size={9} /> Vence {new Date(selectedPack.expires_at).toLocaleDateString('es-AR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setUsePack(v => !v)}
                                        className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl uppercase transition ${
                                            usePack
                                                ? 'bg-primary text-white shadow-glow'
                                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                        }`}>
                                        {usePack ? 'Usando pack' : 'Usar pack'}
                                    </button>
                                </div>

                                {/* Desglose si usa pack */}
                                {usePack && (
                                    <div className="mt-3 pt-3 border-t border-primary/15 space-y-1.5 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Unidades del pack</span>
                                            <span className="text-primary font-black">{packUnitsUsed} gratis</span>
                                        </div>
                                        {paidUnits > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Excedente a pagar</span>
                                                <span className="text-warning font-black">{paidUnits} × ${unitPrice} = ${estimatedPrice}</span>
                                            </div>
                                        )}
                                        {paidUnits === 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total a pagar</span>
                                                <span className="text-success font-black">$0 — ¡Todo cubierto!</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-gray-500 mt-1">
                                            <AlertCircle size={9} />
                                            <span>Las unidades del pack no generan cashback.</span>
                                        </div>
                                    </div>
                                )}

                                {/* Selector de pack si hay varios */}
                                {activePacks.length > 1 && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Elegir pack a usar:</p>
                                        <div className="space-y-1.5">
                                            {activePacks.map(pack => (
                                                <button key={pack.$id}
                                                    onClick={() => { setSelectedPack(pack); setUsePack(true); }}
                                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                                                        selectedPack?.$id === pack.$id
                                                            ? 'bg-primary/15 border-primary/30'
                                                            : 'bg-white/3 border-white/8 hover:border-white/20'
                                                    }`}>
                                                    <div>
                                                        <p className="text-white text-xs font-bold">{pack.reward_name}</p>
                                                        <p className="text-[10px] text-gray-500">
                                                            Saldo: {pack[packField] ?? 0} · Vence {new Date(pack.expires_at).toLocaleDateString('es-AR')}
                                                        </p>
                                                    </div>
                                                    {selectedPack?.$id === pack.$id && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Modo color */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Layers size={12} /> Calidad & Color</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setColorMode('bw')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition ${colorMode === 'bw' ? 'border-primary bg-primary/10 text-white' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}>
                                    <Printer size={20} /><span className="text-[9px] font-black uppercase tracking-widest">B&N Eco</span>
                                </button>
                                <button onClick={() => setColorMode('color')} disabled={!selectedLocation?.has_color_printing}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition disabled:opacity-20 ${colorMode === 'color' ? 'border-secondary bg-secondary/10 text-white' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}>
                                    <Layers size={20} /><span className="text-[9px] font-black uppercase tracking-widest">Premium Color</span>
                                </button>
                                {selectedLocation?.has_fotoya && (
                                    <button onClick={() => setColorMode('foto')} className={`col-span-2 p-4 rounded-2xl border flex items-center justify-center gap-3 transition ${colorMode === 'foto' ? 'border-accent bg-accent/10 text-white' : 'border-white/5 bg-white/3 text-gray-500 hover:border-white/20'}`}>
                                        <Camera size={20} /><span className="text-[9px] font-black uppercase tracking-widest">Servicio FotoYa (10×15)</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Copias */}
                        <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 min-h-[72px]">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Juegos / Copias</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-primary text-gray-400 hover:text-white font-black transition flex items-center justify-center text-xl shadow-glow">-</button>
                                <span className="font-black text-white text-2xl w-8 text-center italic">{copies}</span>
                                <button onClick={() => setCopies(copies + 1)} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-primary text-gray-400 hover:text-white font-black transition flex items-center justify-center text-xl shadow-glow">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Resumen - Visible solo en desktop (lg+) */}
                    <div className="hidden lg:block bg-card/40 border border-white/10 rounded-[2rem] p-7 space-y-5 h-fit sticky top-6">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">Resumen de Orden</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Archivos</span><span className="font-bold text-white">{files.length} archivo{files.length !== 1 ? 's' : ''}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sucursal</span><span className="font-bold text-white text-right max-w-[160px] truncate">{selectedLocation?.name}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Precio unitario</span><span className="font-bold text-white">${unitPrice}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Total unidades</span><span className="font-bold text-white">{totalUnits}</span></div>
                            {usePack && packUnitsUsed > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 flex items-center gap-1"><Package size={11} /> Pack cubre</span>
                                        <span className="font-bold text-primary">−{packUnitsUsed} unidades</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Unidades a pagar</span>
                                        <span className="font-bold text-white">{paidUnits}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="border-t border-white/10 pt-4 space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-gray-400 font-black uppercase text-xs tracking-widest">Total</span>
                                <span className="text-4xl font-black text-white italic tracking-tighter">${estimatedPrice}</span>
                            </div>
                            {usePack ? (
                                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 p-3 rounded-xl text-primary font-black text-[9px] uppercase tracking-widest justify-center italic">
                                    <Zap size={12} /> PrintPass™ activo — sin cashback en unidades del pack
                                </div>
                            ) : (
                                pointsToEarn > 0 && (
                                    <div className="flex items-center gap-2 bg-success/10 border border-success/20 p-3 rounded-xl text-success font-black text-[9px] uppercase tracking-widest justify-center italic">
                                        <Sparkles size={12} /> Ganás +{pointsToEarn} puntos
                                    </div>
                                )
                            )}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setStep(2)} className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 text-gray-400 font-black hover:bg-white/10 transition border border-white/5">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className="flex-1 py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-tighter italic text-lg">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><FileText size={20} /> Imprimir Ahora</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STICKY BOTTOM BAR (Mobile only) */}
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4 pb-6 pt-4 bg-background/90 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
                    <div className="flex flex-col min-w-[100px]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Estimado</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white italic leading-none">${estimatedPrice}</span>
                            {usePack && <Zap size={10} className="text-primary" />}
                        </div>
                    </div>
                    <button 
                        onClick={step === 3 ? handleSubmit : () => setStep(prev => prev + 1)}
                        disabled={isSubmitting || (step === 1 && files.length === 0) || (step === 2 && !selectedLocation)}
                        className="flex-1 h-14 min-h-[56px] bg-primary hover:bg-primary-glow text-white rounded-2xl font-black shadow-glow transition flex items-center justify-center gap-2 uppercase tracking-tighter italic text-base disabled:opacity-30 active:scale-95 touch-manipulation"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (
                            <>
                                <span>{step === 3 ? 'Enviar Orden' : 'Siguiente'}</span>
                                {step < 3 && <ChevronRight size={20} />}
                                {step === 3 && <FileText size={20} />}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
