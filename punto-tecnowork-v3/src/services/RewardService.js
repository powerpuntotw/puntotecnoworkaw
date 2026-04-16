import { databases, withRetry } from '../lib/appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTIONS = {
    REWARDS: 'rewards',
    REDEEMS: 'redeems',
    USERS: 'users',
    POINTS_HISTORY: 'points_history',
    LOCATIONS: 'printing_locations',
    SYSTEM_CONFIG: 'system_config',
    PRINT_PACKS: 'print_packs'
};

export const RewardService = {
    /**
     * Obtiene los premios visibles del catálogo
     */
    async getAvailableRewards() {
        return withRetry(async () => {
            const res = await databases.listDocuments(
                DATABASE_ID, 
                COLLECTIONS.REWARDS,
                [Query.equal('is_visible', true), Query.orderAsc('points_required')]
            );
            return res.documents;
        });
    },

    /**
     * Obtiene sucursales activas para retiro
     */
    async getPrintingLocations() {
        return withRetry(async () => {
            const res = await databases.listDocuments(
                DATABASE_ID, 
                COLLECTIONS.LOCATIONS,
                [Query.equal('status', 'activo'), Query.limit(50)]
            );
            return res.documents;
        });
    },

    /**
     * Obtiene configuración de PrintPass™
     */
    async getPrintPassConfig() {
        try {
            const res = await databases.listDocuments(
                DATABASE_ID, 
                COLLECTIONS.SYSTEM_CONFIG,
                [Query.equal('type', 'printpass_config')]
            );
            if (res.documents.length > 0) {
                return JSON.parse(res.documents[0].data);
            }
            return null;
        } catch (e) {
            console.error('Error fetching PrintPass config:', e);
            return null;
        }
    },

    /**
     * Orquestar Canje de Recompensa
     * Secuencia No-Atómica (Orden de Seguridad):
     * 1. Verificar puntos frescos.
     * 2. Crear documento de canje (Reserva de intención).
     * 3. Descontar puntos del usuario.
     * 4. Decrementar stock (si tiene).
     * 5. Registrar en historial.
     */
    async redeemReward({ user, dbUser, reward, locationId, locationName }) {
        const cost = reward.points_required;
        
        // 1. Verificación de saldo fresco
        const freshUser = await withRetry(() => databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, dbUser.$id));
        const freshPoints = freshUser.points ?? 0;
        
        if (freshPoints < cost) {
            throw new Error(`Saldo insuficiente. Tenés ${freshPoints} pts, necesitás ${cost} pts.`);
        }

        const redeemCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // 2. Crear documento de canje
        const redeem = await withRetry(() => databases.createDocument(
            DATABASE_ID, 
            COLLECTIONS.REDEEMS, 
            ID.unique(), 
            {
                client_id:   user.$id,
                client_name: dbUser?.full_name || user.name,
                reward_id:   reward.$id,
                reward_name: reward.name,
                points_cost: cost,
                status:      'pendiente',
                code:        redeemCode,
                location_id: locationId,
            }
        ));

        // 3. Descontar puntos
        await withRetry(() => databases.updateDocument(
            DATABASE_ID, 
            COLLECTIONS.USERS, 
            dbUser.$id, 
            { points: freshPoints - cost }
        ));

        // 4. Decrementar stock
        if (reward.stock > 0) {
            try {
                await withRetry(() => databases.updateDocument(
                    DATABASE_ID, 
                    COLLECTIONS.REWARDS, 
                    reward.$id, 
                    { stock: reward.stock - 1 }
                ));
            } catch (e) {
                console.warn('Fallo no crítico al decrementar stock:', e);
            }
        }

        // 5. Historial
        try {
            await withRetry(() => databases.createDocument(
                DATABASE_ID, 
                COLLECTIONS.POINTS_HISTORY, 
                ID.unique(), 
                {
                    client_id: user.$id,
                    type:      'minus',
                    amount:    cost,
                    reason:    `Canje: ${reward.name}`,
                }
            ));
        } catch (e) {
            console.warn('Fallo no crítico al registrar historial:', e);
        }

        return { redeem, redeemCode };
    },

    /**
     * Listar canjes filtrados
     */
    async listRedeems(filters = {}) {
        const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];
        if (filters.locationId) queries.push(Query.equal('location_id', filters.locationId));
        if (filters.clientId)   queries.push(Query.equal('client_id', filters.clientId));
        
        return withRetry(async () => {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REDEEMS, queries);
            return res.documents;
        });
    },

    /**
     * Entrega de premio estándar
     */
    async deliverReward(redeemId) {
        return withRetry(async () => {
            return await databases.updateDocument(
                DATABASE_ID, 
                COLLECTIONS.REDEEMS, 
                redeemId,
                { 
                    status: 'entregado', 
                    delivered_at: new Date().toISOString() 
                }
            );
        });
    },

    /**
     * Activación de PrintPass™: Crea saldo + marca entrega
     */
    async activatePrintPass({ redeem, reward, locationId }) {
        if (!redeem || !reward) throw new Error('Datos insuficientes para activar PrintPass');

        const now = new Date();
        const validityDays = reward.pack_validity_days ?? 30;
        const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

        return withRetry(async () => {
            // 1. Crear documento en print_packs
            await databases.createDocument(DATABASE_ID, COLLECTIONS.PRINT_PACKS, ID.unique(), {
                client_id:          redeem.client_id,
                client_name:        redeem.client_name,
                reward_id:          reward.$id,
                reward_name:        reward.name,
                location_id:        locationId,
                location_name:      '', // Placeholder, se puede llenar si se pasa el nombre
                bw_a4_total:        reward.pack_bw_a4 ?? 0,
                bw_a4_remaining:    reward.pack_bw_a4 ?? 0,
                color_a4_total:     reward.pack_color_a4 ?? 0,
                color_a4_remaining: reward.pack_color_a4 ?? 0,
                foto_total:         reward.pack_foto_10x15 ?? 0,
                foto_remaining:     reward.pack_foto_10x15 ?? 0,
                bw_a3_total:        reward.pack_bw_a3 ?? 0,
                bw_a3_remaining:    reward.pack_bw_a3 ?? 0,
                activated_at:       now.toISOString(),
                expires_at:         expiresAt.toISOString(),
                status:             'activo',
            });

            // 2. Marcar redeem como entregado
            return await databases.updateDocument(DATABASE_ID, COLLECTIONS.REDEEMS, redeem.$id, {
                status: 'entregado',
                delivered_at: now.toISOString(),
            });
        });
    }
};
