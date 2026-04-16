import { databases, withRetry } from '../lib/appwrite';

// Configuración centralizada de presencia
export const HEARTBEAT_INTERVAL_MS = 60000;      // Frecuencia base de latido (1 min)
export const ONLINE_THRESHOLD_SECONDS = 300;     // Tiempo máximo para considerar "online" (5 min)

/**
 * Helper puro para calcular diferencia de tiempo en segundos.
 */
const getSecondsSince = (timestamp) => {
    if (!timestamp) return Infinity;
    return Math.floor(Date.now() / 1000) - timestamp;
};

export const BranchService = {
    /**
     * Determina si el operador está activo basándose en su último heartbeat.
     */
    isOperatorOnline: (lastActiveAt) => {
        return getSecondsSince(lastActiveAt) < ONLINE_THRESHOLD_SECONDS;
    },

    /**
     * Determina si la sucursal está disponible para recibir órdenes.
     * Combina estado administrativo (is_open) y presencia técnica (heartbeat).
     */
    isAvailable: (location) => {
        if (!location) return false;
        
        const isAdministrativelyOpen = location.status === 'activo' && location.is_open === true;
        const isTechnicalyOnline = BranchService.isOperatorOnline(location.last_active_at);

        return isAdministrativelyOpen && isTechnicalyOnline;
    },

    /**
     * Formatea el tiempo transcurrido desde la última actividad.
     */
    formatLastSeen: (lastActiveAt) => {
        const diff = getSecondsSince(lastActiveAt);
        if (diff === Infinity) return 'sin conexión';
        if (diff < 60) return `hace ${diff}s`;
        if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
        return `hace ${Math.floor(diff / 3600)}h`;
    },

    /**
     * Envía la señal de actividad (Heartbeat) al servidor.
     * @sideEffect: Realiza una escritura en Appwrite.
     */
    sendHeartbeat: async (locationId) => {
        if (!locationId) return;
        
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        return await withRetry(
            () => databases.updateDocument(
                dbId,
                'printing_locations',
                locationId,
                { last_active_at: Math.floor(Date.now() / 1000) }
            ),
            { maxRetries: 2, baseDelayMs: 1000 }
        );
    }
};
