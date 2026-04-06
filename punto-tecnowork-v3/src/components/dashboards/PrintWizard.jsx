import { useState } from 'react';
import { storage } from '../../lib/appwrite';
import { Printer, Download, CheckCircle2, ChevronRight, ChevronLeft, X, FileText, Layers, Package, Maximize, Eye } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Resumen' },
    { id: 2, label: 'Documentos' },
    { id: 3, label: 'Confirmar' },
];

const BUCKET_ID = 'orders_files';

export const PrintWizard = ({ order, onConfirm, onCancel, isUpdating }) => {
    const [step, setStep] = useState(1);
    const [downloadedAll, setDownloadedAll] = useState(false);

    const fileIds = order.files || [];

    const getDownloadUrl = (fileId) => {
        return storage.getFileDownload(BUCKET_ID, fileId);
    };

    const getViewUrl = (fileId) => {
        return storage.getFileView(BUCKET_ID, fileId);
    };

    const colorLabel = () => {
        if (order.color_mode === 'color') return 'Color Premium';
        if (order.color_mode === 'foto') return 'FotoYa 10×15';
        return 'B&N Eco';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div
                className="bg-[#0a0a0f] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                            <Printer size={20} className="text-primary" /> Asistente de Impresión
                        </h2>
                        <p className="text-primary font-mono text-xs mt-0.5 tracking-widest uppercase">
                            #{order.order_number || order.$id.substring(0, 8).toUpperCase()}
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-gray-500 hover:text-white transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1 px-7 py-4 border-b border-white/5">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-1">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition ${
                                step === s.id ? 'bg-primary text-white' :
                                step > s.id ? 'bg-success/20 text-success' :
                                'bg-white/5 text-gray-600'
                            }`}>
                                {step > s.id ? <CheckCircle2 size={10} /> : <span>{s.id}</span>}
                                {s.label}
                            </div>
                            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-800 shrink-0" />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="px-7 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>

                    {/* STEP 1: Resumen del pedido */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Revisá los detalles antes de imprimir</p>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Cliente</p>
                                    <p className="text-white font-black text-sm truncate">{order.client_name || '—'}</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Total</p>
                                    <p className="text-success font-black text-xl italic">${(order.total_price || 0).toLocaleString('es-AR')}</p>
                                </div>
                            </div>

                            {/* Specs */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 grid grid-cols-3 gap-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                                        <Layers size={16} className="text-secondary" />
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase text-center leading-tight">{colorLabel()}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                                        <Maximize size={16} className="text-primary" />
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase text-center leading-tight">
                                        {order.color_mode === 'foto' ? '10 × 15 cm' : 'Hoja A4'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                                        <Package size={16} className="text-accent" />
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase text-center leading-tight">{order.copies} cop.</span>
                                </div>
                            </div>

                            {/* File count */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl">
                                <FileText size={14} className="text-primary shrink-0" />
                                <p className="text-sm text-white font-bold">
                                    {fileIds.length} archivo{fileIds.length !== 1 ? 's' : ''} para imprimir
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Documentos */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Descargá o visualizá cada archivo</p>
                            {fileIds.length === 0 ? (
                                <div className="py-10 text-center text-gray-600">
                                    <FileText size={36} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold">No hay archivos adjuntos</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fileIds.map((fileId, idx) => (
                                        <div key={fileId} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-[9px] font-black text-primary shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm text-white font-bold truncate">Archivo {idx + 1}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <a
                                                    href={getViewUrl(fileId)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 hover:text-white transition"
                                                >
                                                    <Eye size={12} /> Ver
                                                </a>
                                                <a
                                                    href={getDownloadUrl(fileId)}
                                                    download
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-[10px] font-black text-primary transition"
                                                >
                                                    <Download size={12} /> Descargar
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Confirm downloaded */}
                            <label className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-2xl cursor-pointer group">
                                <div
                                    onClick={() => setDownloadedAll(v => !v)}
                                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                                        downloadedAll ? 'bg-success border-success' : 'bg-white/5 border-white/20 group-hover:border-white/40'
                                    }`}
                                >
                                    {downloadedAll && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                                <span className="text-sm text-white font-bold" onClick={() => setDownloadedAll(v => !v)}>
                                    Descargué todos los archivos y estoy listo para imprimir
                                </span>
                            </label>
                        </div>
                    )}

                    {/* STEP 3: Confirmación final */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="flex flex-col items-center text-center py-4 gap-4">
                                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow">
                                    <Printer size={36} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">¿Iniciar Impresión?</h3>
                                    <p className="text-gray-500 text-sm mt-1">
                                        La orden pasará a estado <span className="text-primary font-bold">En Producción</span>.
                                    </p>
                                </div>
                            </div>

                            {/* Resumen final */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Orden</span>
                                    <span className="text-white font-black font-mono">#{order.order_number || order.$id.substring(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cliente</span>
                                    <span className="text-white font-bold">{order.client_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Modo</span>
                                    <span className="text-white font-bold">{colorLabel()} · {order.copies} cop.</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Archivos</span>
                                    <span className="text-white font-bold">{fileIds.length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex gap-3 px-7 pb-7 pt-4 border-t border-white/5">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/5 text-gray-400 font-black hover:bg-white/10 transition border border-white/5 text-sm">
                            <ChevronLeft size={16} /> Volver
                        </button>
                    ) : (
                        <button onClick={onCancel} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/5 text-gray-400 font-black hover:bg-white/10 transition border border-white/5 text-sm">
                            <X size={16} /> Cancelar
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 2 && !downloadedAll && fileIds.length > 0}
                            className="flex-1 py-3.5 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-tighter italic"
                        >
                            Continuar <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={onConfirm}
                            disabled={isUpdating}
                            className="flex-1 py-3.5 rounded-2xl bg-primary hover:bg-primary-glow text-white font-black shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-tighter italic text-lg"
                        >
                            <Printer size={20} /> {isUpdating ? 'Iniciando...' : 'Iniciar Impresión'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
