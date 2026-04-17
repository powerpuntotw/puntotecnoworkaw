import { databases } from './appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'audit_logs';

/**
 * Servicio para interactuar con la colección de logs de auditoría.
 */
export const AuditService = {
    /**
     * Recupera una lista de logs paginados.
     * @param {number} limit - Cantidad de registros por página.
     * @param {number} offset - Cantidad de registros a saltar.
     * @returns {Promise<Object>} - Documentos de auditoría.
     */
    getLogs: async (limit = 50, offset = 0) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [
                    Query.orderDesc('$createdAt'),
                    Query.limit(limit),
                    Query.offset(offset)
                ]
            );
            return response;
        } catch (error) {
            console.error('AuditService.getLogs error:', error);
            throw error;
        }
    },

    /**
     * Búsqueda simple de logs (limitada a los más recientes para performance).
     * Nota: En Appwrite, Query.search requiere índices adecuados.
     * @param {string} term - Término de búsqueda.
     * @param {number} limit - Límite de resultados.
     */
    searchLogs: async (term, limit = 100) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID,
                [
                    Query.orderDesc('$createdAt'),
                    Query.limit(limit),
                    // Nota: Se asume que admin_name o description están indexados para búsqueda
                    Query.or([
                        Query.contains('admin_name', term),
                        Query.contains('action', term),
                        Query.contains('description', term)
                    ])
                ]
            );
            return response;
        } catch (error) {
            console.error('AuditService.searchLogs error:', error);
            throw error;
        }
    }
};
