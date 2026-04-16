/**
 * src/services/OrderService.js
 * Servicio centralizado para la creación de órdenes y gestión de persistencia de packs.
 */

import { databases, withRetry } from '../lib/appwrite';
import { ID } from 'appwrite';
import { COLOR_TO_PACK } from './PriceService';

export const OrderService = {
    /**
     * Genera un número de orden único y legible.
     */
    generateOrderNumber: () => 'PT' + Date.now().toString(36).toUpperCase(),

    /**
     * Orquesta la creación de una orden y el descuento de consumos de PrintPass.
     * @param {Object} params
     * @param {Object} params.client - Datos del cliente ($id, name).
     * @param {Object} params.location - Datos de la sucursal ($id, name).
     * @param {Array}  params.fileIds - IDs de los archivos ya subidos al storage.
     * @param {Object} params.details - Detalles de impresión (colorMode, copies).
     * @param {Object} params.pricing - Valores calculados (totalPrice, pointsEarned, etc.).
     * @param {Object} params.packInfo - Info de PrintPass (usePack, selectedPack, packUnitsUsed, packField).
     */
    createOrder: async ({ client, location, fileIds, details, pricing, packInfo }) => {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const orderNumber = OrderService.generateOrderNumber();

        // 1. Crear documento de la orden
        const orderDoc = await withRetry(() => databases.createDocument(
            dbId, 
            'orders', 
            ID.unique(), 
            {
                client_id:      client.id,
                client_name:    client.name,
                location_id:    location.id,
                location_name:  location.name,
                unit_price:     pricing.unitPrice,
                total_price:    pricing.totalPrice,
                copies:         details.copies,
                status:         'pendiente',
                files:          fileIds,
                color_mode:     details.colorMode,
                points_earned:  pricing.pointsEarned,
                order_number:   orderNumber,
                // PrintPass™
                pack_id:        packInfo?.usePack ? packInfo.selectedPack?.$id : null,
                pack_units_used: packInfo?.packUnitsUsed || 0,
                paid_units:     packInfo?.paidUnits || 0,
            }
        ));

        // 2. Si se usó pack, descontar saldo en print_packs
        if (packInfo?.usePack && packInfo?.selectedPack && packInfo?.packUnitsUsed > 0 && packInfo?.packField) {
            const pack = packInfo.selectedPack;
            const field = packInfo.packField;
            const units = packInfo.packUnitsUsed;

            const newRemaining = (pack[field] ?? 0) - units;
            const updatePayload = { [field]: Math.max(0, newRemaining) };

            // Lógica de "agotado": si todos los campos de saldo llegan a 0
            const otherFields = Object.values(COLOR_TO_PACK).filter(f => f !== field);
            const allZero = otherFields.every(f => (pack[f] ?? 0) === 0) && newRemaining <= 0;
            
            if (allZero) {
                updatePayload.status = 'agotado';
            }

            await withRetry(() => databases.updateDocument(
                dbId,
                'print_packs',
                pack.$id,
                updatePayload
            ));
        }

        return orderDoc;
    }
};
