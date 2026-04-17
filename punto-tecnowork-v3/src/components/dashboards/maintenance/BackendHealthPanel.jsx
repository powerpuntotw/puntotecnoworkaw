import { Activity, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const BackendHealthPanel = ({ 
    pricesStatus, 
    filesCount, 
    ppStatus,
    onRefresh 
}) => {
    return (
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Activity className="text-secondary" size={20} /> Estado del Backend
            </h2>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(164,204,57,0.8)]"></div>
                        <span className="text-white text-sm font-medium">Appwrite Core</span>
                    </div>
                    <button onClick={onRefresh} className="text-gray-400 hover:text-white transition">
                        <RefreshCw size={16} />
                    </button>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Precios globales</span>
                        {pricesStatus === 'loading' ? <Loader2 size={14} className="animate-spin text-gray-500" /> :
                            pricesStatus ? <span className="text-success font-bold flex items-center gap-1"><CheckCircle2 size={14} /> OK</span>
                            : <span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={14} /> Sin datos</span>}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Bucket orders_files</span>
                        <span className={`font-bold text-xs ${filesCount > 0 ? 'text-success' : 'text-gray-500'}`}>
                            {filesCount > 0 ? `${filesCount} archivo(s)` : 'Vacío'}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">PrintPass™</span>
                        {ppStatus === 'loading' ? <Loader2 size={14} className="animate-spin text-gray-500" /> :
                            <span className={`font-bold text-xs flex items-center gap-1 ${ppStatus.enabled ? 'text-success' : 'text-gray-500'}`}>
                                {ppStatus.enabled ? <><CheckCircle2 size={14} /> Activo · {ppStatus.locCount} local(es)</> : 'Inactivo'}
                            </span>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};
