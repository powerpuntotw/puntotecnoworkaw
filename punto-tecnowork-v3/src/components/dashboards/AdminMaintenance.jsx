import { useState } from 'react';
import { PriceManager } from './maintenance/PriceManager';
import { PrintPassConfig } from './maintenance/PrintPassConfig';
import { StorageManager } from './maintenance/StorageManager';
import { BackendHealthPanel } from './maintenance/BackendHealthPanel';

export const AdminMaintenance = () => {
    // Estados mínimos para coordinar el panel de salud
    const [pricesStatus, setPricesStatus] = useState('loading');
    const [ppStatus, setPpStatus] = useState({ enabled: false, locCount: 0, loading: true });
    const [filesCount, setFilesCount] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        setPricesStatus('loading');
        setPpStatus(prev => ({ ...prev, loading: true }));
    };

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent italic">
                    Mantenimiento del Sistema
                </h1>
                <p className="text-gray-400 mt-2 font-medium">
                    Configuración de precios, herramientas técnicas y módulos de fidelidad.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna Izquierda: Precios */}
                <PriceManager 
                    key={`prices-${refreshKey}`} 
                    onStatusChange={(ok) => setPricesStatus(ok)} 
                />

                {/* Columna Derecha: Salud y Herramientas */}
                <div className="space-y-8">
                    <BackendHealthPanel 
                        pricesStatus={pricesStatus}
                        filesCount={filesCount}
                        ppStatus={ppStatus}
                        onRefresh={handleRefresh}
                    />
                    
                    <StorageManager 
                        key={`storage-${refreshKey}`}
                        onFilesChange={(list) => setFilesCount(list.length)} 
                    />
                </div>
            </div>

            {/* Fila Inferior: PrintPass™ (Ancho Completo) */}
            <PrintPassConfig 
                key={`pp-${refreshKey}`}
                onStatusChange={(ok, enabled, locCount) => 
                    setPpStatus({ enabled, locCount, loading: false })
                }
            />
        </div>
    );
};
