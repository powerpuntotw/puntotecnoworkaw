import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, X, Printer, MapPin, Layers, Loader2 } from 'lucide-react';
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
    const [selectedLocation, setSelectedLocation] = useState('');
    const [colorMode, setColorMode] = useState('bw'); // 'bw' | 'color'
    const [copies, setCopies] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Constants for pricing (Ideally loaded from a settings DB, but we hardcode a base here for the calc)
    const BASE_PRICE_BW = 50;
    const BASE_PRICE_COLOR = 150;
    const POINTS_PERCENTAGE = 0.10; // 10%

    useEffect(() => {
        // Fetch open printing locations
        const fetchLocations = async () => {
            try {
                const res = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'printing_locations',
                    [Query.equal('is_open', true)]
                );
                setLocations(res.documents);
                if (res.documents.length > 0) {
                    setSelectedLocation(res.documents[0].$id);
                }
            } catch (error) {
                console.error("Error fetching locations:", error);
                toast.error("Error al cargar las sucursales");
            }
        };
        fetchLocations();
    }, []);

    const onDrop = useCallback(acceptedFiles => {
        // Append new files, avoiding duplicates by name for simplicity
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
        maxSize: 10485760 // 10MB
    });

    const removeFile = (fileName) => {
        setFiles(files.filter(f => f.name !== fileName));
    };

    // Very naive calculation since we can't count PDF pages client-side without a heavy library like pdf.js.
    // For a real app, users might input page count manualy or the backend calculates it. 
    // Here we'll just charge the base price per file for the sake of the demo.
    const estimatedPrice = files.length * copies * (colorMode === 'bw' ? BASE_PRICE_BW : BASE_PRICE_COLOR);
    const pointsToEarn = Math.floor(estimatedPrice * POINTS_PERCENTAGE);

    const handleSubmit = async () => {
        if (files.length === 0) return toast.error("Agrega al menos un archivo");
        if (!selectedLocation) return toast.error("Selecciona una sucursal");
        if (!user) return toast.error("Sesión no válida");

        setIsSubmitting(true);
        const toastId = toast.loading("Subiendo archivos...");

        try {
            // 1. Upload files to Storage
            const fileIds = [];
            for (const file of files) {
                const uploadedFile = await storage.createFile(
                    'orders_files', // Bucket ID
                    ID.unique(),
                    file
                );
                fileIds.push(uploadedFile.$id);
            }

            toast.loading("Creando orden...", { id: toastId });

            // 2. Create Order Document
            await databases.createDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'orders',
                ID.unique(),
                {
                    client_id: user.$id,
                    location_id: selectedLocation,
                    unit_price: estimatedPrice, // Total estimated front-end price
                    copies: copies,
                    status: 'pendiente',
                    files: fileIds,
                    color_mode: colorMode
                }
            );

            toast.success("¡Orden creada con éxito!", { id: toastId });
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);

        } catch (error) {
            console.error("Order error", error);
            toast.error("Hubo un error al procesar tu orden", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 relative">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e2d', color: '#fff', border: '1px solid #333' } }} />

            <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">Nueva Orden de Impresión</h1>
            <p className="text-gray-400">Sube tus archivos y configura las opciones de impresión.</p>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Panel Izquierdo: Carga y Lista de Archivos */}
                <div className="w-full lg:w-2/3 space-y-6">
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed ${isDragActive ? 'border-primary bg-primary/10' : 'border-secondary/40 bg-card/30'} rounded-3xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] hover:bg-card/60 hover:border-secondary`}
                    >
                        <input {...getInputProps()} />
                        <UploadCloud size={64} className={`${isDragActive ? 'text-primary' : 'text-secondary'} mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-colors`} />
                        <h3 className="text-xl font-medium text-white mb-2">
                            {isDragActive ? "Suelta tus archivos aquí" : "Arrastra o selecciona tus archivos"}
                        </h3>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG, DOCX (Máx 10MB)</p>
                        <div className="mt-6 px-6 py-2 bg-secondary/10 border border-secondary text-secondary rounded-full font-medium hover:bg-secondary hover:text-white transition">Examinar Archivos</div>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-300">Archivos ({files.length})</h4>

                            {files.map((file, idx) => {
                                const ext = file.name.split('.').pop().toUpperCase();
                                const isPdf = ext === 'PDF';
                                return (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg border font-bold text-xs uppercase ${isPdf ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                {ext}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium truncate max-w-[200px] md:max-w-xs">{file.name}</p>
                                                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFile(file.name)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition opacity-100 lg:opacity-0 group-hover:opacity-100">
                                            <X size={20} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Panel Derecho: Configuración y Cotizador */}
                <div className="w-full lg:w-1/3">
                    <div className="bg-card border border-white/10 rounded-3xl p-6 sticky top-6 glass shadow-2xl space-y-6">
                        <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-4">Configuración</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2"><MapPin size={16} /> Sucursal</label>
                                <select
                                    className="w-full bg-background border border-white/10 rounded-xl p-3 text-white appearance-none outline-none focus:border-primary"
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    disabled={locations.length === 0}
                                >
                                    {locations.length === 0 && <option value="">Cargando locales...</option>}
                                    {locations.map(loc => (
                                        <option key={loc.$id} value={loc.$id}>{loc.name} {loc.is_open ? '(Abierto)' : '(Cerrado)'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setColorMode('bw')}
                                    className={`p-4 rounded-xl text-center flex flex-col items-center gap-2 transition ${colorMode === 'bw' ? 'border border-primary bg-primary/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/30'}`}
                                >
                                    <Printer size={20} className={colorMode === 'bw' ? 'text-primary-glow' : ''} />
                                    Blanco y Negro
                                </button>
                                <button
                                    onClick={() => setColorMode('color')}
                                    className={`p-4 rounded-xl text-center flex flex-col items-center gap-2 transition ${colorMode === 'color' ? 'border border-secondary bg-secondary/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/30'}`}
                                >
                                    <Layers size={20} className={colorMode === 'color' ? 'text-secondary' : ''} />
                                    Color Premium
                                </button>
                            </div>

                            <div className="flex justify-between items-center bg-background border border-white/10 rounded-xl p-2 gap-4">
                                <span className="text-sm text-gray-400 pl-3">Juegos (Copias)</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center">-</button>
                                    <span className="font-mono text-white text-lg w-4 text-center">{copies}</span>
                                    <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center">+</button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10 space-y-2 pb-6">
                            <div className="flex justify-between text-gray-400 text-sm"><span>Subtotal base por archivo:</span> <span>${colorMode === 'bw' ? BASE_PRICE_BW : BASE_PRICE_COLOR}</span></div>
                            <div className="flex justify-between font-bold text-2xl text-white"><span>Total Aprox:</span> <span>${estimatedPrice}</span></div>
                            <div className="flex justify-center mt-2">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-success/20 border border-success/40 text-success text-sm font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    ✨ Puntos que ganarás: +{pointsToEarn} pts
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || files.length === 0}
                            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all ${isSubmitting || files.length === 0 ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-primary hover:bg-primary-glow text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'}`}
                        >
                            {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Procesando...</> : 'Confirmar y Subir Orden'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
