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

const isOnline = (lastActiveAt) => {
    if (!lastActiveAt) return false;
    return (Math.floor(Date.now() / 1000) - lastActiveAt) < 300;
};
const timeAgo = (lastActiveAt) => {
    if (!lastActiveAt) return 'sin conexión';
    const diff = Math.floor(Date.now() / 1000) - lastActiveAt;
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
    return `hace ${Math.floor(diff / 3600)}h`;
};
const genOrderNumber = () => 'PT' + Date.now().toString(36).toUpperCase();

// Mapeo de color_mode a campo del pack
const COLOR_TO_PACK = {
    bw:    'bw_a4_remaining',
    color: 'color_a4_remaining',
    foto:  'foto_remaining',
};

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

    const activePrices = useMemo(() => {
        const p = { ...globalPrices };
        Object.keys(localPrices).forEach(k => { if (localPrices[k] > 0) p[k] = localPrices[k]; });
        return p;
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
            'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 20 * 1024 * 1024
    });

    const getUnitPrice = () => {
        if (colorMode === 'bw')    return activePrices.a4_bn || 50;
        if (colorMode === 'color') return activePrices.a4_color || 150;
        if (colorMode === 'foto')  return activePrices.foto_10x15 || 300;
        return 0;
    };

    // ── Cálculo con lógica PrintPass™ ──
    const totalUnits = files.length * copies;  // unidades totales pedidas
    const packField  = COLOR_TO_PACK[colorMode];
    const packSaldo  = (usePack && selectedPack && packField) ? (selectedPack[packField] ?? 0) : 0;
    const packUnitsUsed  = usePack ? Math.min(packSaldo, totalUnits) : 0;
    const paidUnits      = totalUnits - packUnitsUsed;
    const unitPrice      = getUnitPrice();
    const estimatedPrice = paidUnits * unitPrice;
    const pointsToEarn   = usePack ? 0 : Math.floor(estimatedPrice * 0.10);

    // Pack tiene saldo para el tipo de impresión elegido
    const packHasSaldo = selectedPack && packField && (selectedPack[packField] ?? 0) > 0;

    // ── Submit ──
    const handleSubmit = async () => {
        if (files.length === 0) return toast.error('Agregá al menos un archivo');
        if (!selectedLocation)  return toast.error('Seleccioná una sucursal');
        if (!user)              return toast.error('Sesión no válida');

        setIsSubmitting(true);
        const toastId = toast.loading('Procesando orden...');
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

            // 1. Subir archivos
            const fileIds = [];
            for (const file of files) {
                const uploaded = await storage.createFile('orders_files', ID.unique(), file);
                fileIds.push(uploaded.$id);
            }

            // 2. Crear orden
            await databases.createDocument(dbId, 'orders', ID.unique(), {
                client_id:      user.$id,
                client_name:    dbUser?.full_name || user.name || 'Cliente',
                location_id:    selectedLocation.$id,
                location_name:  selectedLocation.name,
                unit_price:     unitPrice,
                total_price:    estimatedPrice,
                copies,
                status:         'pendiente',
                files:          fileIds,
                color_mode:     colorMode,
                points_earned:  pointsToEarn,
                order_number:   genOrderNumber(),
                // PrintPass™
                pack_id:        usePack && selectedPack ? selectedPack.$id : null,
                pack_units_used: packUnitsUsed,
                paid_units:     paidUnits,
            });

            // 3. Si usó pack: descontar saldo del print_pack
            if (usePack && selectedPack && packUnitsUsed > 0 && packField) {
                const newRemaining = (selectedPack[packField] ?? 0) - packUnitsUsed;
                const updatePayload = { [packField]: Math.max(0, newRemaining) };
                // Si todos los saldos llegan a 0 → agotado
                const otherFields = Object.values(COLOR_TO_PACK).filter(f => f !== packField);
                const allZero = otherFields.every(f => (selectedPack[f] ?? 0) === 0) && newRemaining <= 0;
                if (allZero) updatePayload.status = 'agotado';
                await databases.updateDocument(dbId, 'print_packs', selectedPack.$id, updatePayload);
            }

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
        const online = isOnline(loc.last_active_at);
        const lastSeen = timeAgo(loc.last_active_at);
        const hasPP = ppEnabledLocs.includes(loc.$id);
        return (
            <div onClick={() => onSelect(loc)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${selected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-white/10 bg-card/40 hover:border-white/25'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-black text-base tracking-tight">{loc.name}</h3>
                            {loc.has_fotoya && <span className="text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase">FotoYa</span>}
                            {hasPP && <span className="text-[9px] font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5"><Printer size={8} /> PrintPass™</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin size={12} className="shrink-0" /> {loc.address}
                        </div>
                        {loc.schedule && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-1">
                                <Clock size={11} className="shrink-0" /> {loc.schedule}
                            </div>
                        )}
                    </div>
                    {selected && <CheckCircle2 size={22} className="text-primary shrink-0 mt-1" />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-success/10 border border-success/20 text-success uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Abierto
                    </span>
                    {online ? (
                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary uppercase">
                            <Wifi size={9} /> Atendiendo ahora
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 uppercase" title={lastSeen}>
                            <WifiOff size={9} /> Sin operador activo
                        </span>
                    )}
                    {loc.has_color_printing && (
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary uppercase">
                            Color {loc.max_color_size}
                        </span>
                    )}
                    <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 uppercase">
                        B&N {loc.max_bw_size}
                    </span>
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

            {/* Stepper */}
            <div className="flex items-center gap-2">
                {[['1', 'Archivos'], ['2', 'Sucursal'], ['3', 'Opciones']].map(([n, label], i) => (
                    <div key={n} className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase transition ${step === i+1 ? 'bg-primary text-white' : step > i+1 ? 'bg-success/20 text-success' : 'bg-white/5 text-gray-500'}`}>
                            {step > i+1 ? <CheckCircle2 size={12} /> : <span>{n}</span>} {label}
                        </div>
                        {i < 2 && <ChevronRight size={14} className="text-gray-700" />}
                    </div>
                ))}
            </div>

            {/* PASO 1 */}
            {step === 1 && (
                <div className="space-y-5">
                    <div {...getRootProps()} className={`border-2 border-dashed ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-card/30'} rounded-[2rem] p-14 flex flex-col items-center justify-center text-center transition cursor-pointer hover:border-primary/50`}>
                        <input {...getInputProps()} />
                        <div className="p-5 bg-primary/10 rounded-full mb-5 ring-1 ring-primary/20">
                            <UploadCloud size={48} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 italic uppercase">{isDragActive ? '¡Soltá los archivos!' : 'Arrastrá tus documentos'}</h3>
                        <p className="text-gray-500 mb-6 text-sm">PDF, Word o Imágenes (JPG/PNG) — máx. 20MB c/u</p>
                        <div className="px-8 py-3 bg-primary hover:bg-primary-glow text-white rounded-xl font-black shadow-glow transition uppercase text-sm">Seleccionar Archivos</div>
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
                        className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black text-lg shadow-glow transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-tighter italic">
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
                    <div className="flex gap-3">
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
                        <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Juegos / Copias</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-primary text-gray-400 hover:text-white font-black transition">-</button>
                                <span className="font-black text-white text-xl w-6 text-center italic">{copies}</span>
                                <button onClick={() => setCopies(copies + 1)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-primary text-gray-400 hover:text-white font-black transition">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="bg-card/40 border border-white/10 rounded-[2rem] p-7 space-y-5 h-fit">
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
                            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/5 text-gray-400 font-black hover:bg-white/10 transition border border-white/5 text-sm">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting}
                                className="flex-1 py-4 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-tighter italic text-lg">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><FileText size={20} /> Imprimir Ahora</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
