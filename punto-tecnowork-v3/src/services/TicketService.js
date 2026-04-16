import { databases, withRetry } from '../lib/appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTIONS = {
    TICKETS: 'tickets',
    MESSAGES: 'messages',
    USERS: 'users',
    LOCATIONS: 'printing_locations'
};

const STATUS = {
    OPEN: 'open',
    ANSWERED: 'answered',
    CLOSED: 'closed'
};

export const TicketService = {
    /**
     * Obtiene la lista de tickets filtrada según el rol y pertenencia
     */
    async getVisibleTickets(user, dbUser) {
        if (!user || !dbUser) return [];

        const isAdmin = dbUser.user_type === 'admin';
        const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];

        if (!isAdmin) {
            const userOrs = [
                Query.equal('client_id', user.$id),
                Query.equal('recipient_id', user.$id)
            ];

            // Si es local, también ve los tickets dirigidos a su sucursal
            if (dbUser.user_type === 'local' && dbUser.location_id) {
                userOrs.push(Query.equal('recipient_id', dbUser.location_id));
                userOrs.push(Query.equal('client_id', dbUser.location_id));
            }

            queries.push(Query.or(userOrs));
        }

        const res = await withRetry(() => 
            databases.listDocuments(DATABASE_ID, COLLECTIONS.TICKETS, queries)
        );
        return res.documents;
    },

    /**
     * Obtiene los mensajes de un ticket específico
     */
    async getMessages(ticketId) {
        if (!ticketId) return [];
        const res = await withRetry(() => 
            databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
                Query.equal('ticket_id', ticketId),
                Query.orderAsc('$createdAt'),
                Query.limit(100)
            ])
        );
        return res.documents;
    },

    /**
     * Lista destinatarios potenciales según el rol buscado
     */
    async getPotentialRecipients(role) {
        if (role === 'admin') return []; // Administración es global
        
        const collection = role === 'local' ? COLLECTIONS.LOCATIONS : COLLECTIONS.USERS;
        const queries = [Query.limit(100)];
        
        if (role !== 'local') {
            queries.push(Query.equal('user_type', role));
        }

        const res = await withRetry(() => 
            databases.listDocuments(DATABASE_ID, collection, queries)
        );
        return res.documents;
    },

    /**
     * Abre un nuevo ticket con un mensaje inicial opcional
     */
    async createTicket({ user, dbUser, subject, recipientRole, recipientId, recipientName, description }) {
        const creatorRole = dbUser?.user_type || 'client';
        
        // 1. Crear el documento del ticket
        const ticket = await withRetry(() => 
            databases.createDocument(DATABASE_ID, COLLECTIONS.TICKETS, ID.unique(), {
                client_id: user.$id,
                client_name: dbUser?.full_name || user.name,
                subject: subject.trim(),
                status: STATUS.OPEN,
                creator_role: creatorRole,
                recipient_role: recipientRole,
                recipient_id: recipientRole === 'admin' ? 'global' : recipientId,
                recipient_name: recipientName
            })
        );

        // 2. Crear mensaje inicial si existe descripción
        if (description?.trim()) {
            await withRetry(() => 
                databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
                    ticket_id: ticket.$id,
                    sender_id: user.$id,
                    sender_name: dbUser?.full_name || user.name,
                    content: description.trim(),
                    role: creatorRole
                })
            );
        }

        return ticket;
    },

    /**
     * Envía un mensaje en un ticket activo
     */
    async sendMessage({ ticketId, user, dbUser, content, updateStatusToAnswered = false }) {
        const myRole = dbUser?.user_type || 'client';
        
        // 1. Persistir mensaje
        const message = await withRetry(() => 
            databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
                ticket_id: ticketId,
                sender_id: user.$id,
                sender_name: dbUser?.full_name || user.name,
                content: content.trim(),
                role: myRole
            })
        );

        // 2. Opcionalmente actualizar estado del ticket (usado por admin)
        if (updateStatusToAnswered) {
            await withRetry(() => 
                databases.updateDocument(DATABASE_ID, COLLECTIONS.TICKETS, ticketId, {
                    status: STATUS.ANSWERED
                })
            );
        }

        return message;
    },

    /**
     * Cierra un ticket con una justificación obligatoria
     */
    async closeTicket({ ticketId, user, dbUser, resolution, closerRoleLabel }) {
        const myRole = dbUser?.user_type || 'client';
        const closerName = dbUser?.full_name || user?.name || 'Usuario';
        
        // 1. Agregar mensaje de resolución
        await withRetry(() => 
            databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), {
                ticket_id: ticketId,
                sender_id: user.$id,
                sender_name: `${closerName} (${closerRoleLabel})`,
                content: `✅ Ticket cerrado por ${closerName} (${closerRoleLabel}): ${resolution.trim()}`,
                role: myRole
            })
        );

        // 2. Actualizar estado
        const updatedTicket = await withRetry(() => 
            databases.updateDocument(DATABASE_ID, COLLECTIONS.TICKETS, ticketId, {
                status: STATUS.CLOSED
            })
        );

        return updatedTicket;
    }
};
