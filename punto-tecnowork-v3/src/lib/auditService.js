import { databases, account } from './appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'audit_logs';

/**
 * Servicio para interactuar con la colección de logs de auditoría.
 */
export const AuditService = {
    /**
     * Registra una acción administrativa crítica.
     * @param {Object} params
     * @param {string} params.action - Identificador de la acción (ej: price_update)
     * @param {string} params.entityType - Tipo de entidad afectada (price, user, location, branding, printpass)
     * @param {string} [params.entityId] - ID opcional del recurso afectado
     * @param {Object} [params.metadata] - Contexto adicional y cambios
     */
    logAction: async ({ action, entityType, entityId = null, metadata = {} }) => {
        try {
            // Intentamos obtener el usuario actual para el log
            let adminName = 'Sistema';
            try {
                const user = await account.get();
                adminName = user.name || user.email;
            } catch (e) {
                console.warn('AuditService: could not get current user, logging as System');
            }

            const payload = {
                v: 2, // Versión del esquema de log
                entityType,
                entityId,
                metadata,
                timestamp: new Date().toISOString()
            };

            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                ID.unique(),
                {
                    admin_name: adminName,
                    action: action,
                    description: JSON.stringify(payload)
                }
            );
        } catch (error) {
            console.error('AuditService.logAction failed:', error);
            // No lanzamos error para no romper la experiencia del usuario si falla el log
        }
    },

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
