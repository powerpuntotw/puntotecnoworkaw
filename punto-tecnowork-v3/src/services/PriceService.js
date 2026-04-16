/**
 * src/services/PriceService.js
 * Unica fuente de verdad para el cálculo de precios y puntos.
 * No tiene side effects (no guarda en DB).
 */

import { CASHBACK_RATE } from '../lib/constants';

// Mapeo detallado de color_mode a campo del pack para cálculos y persistencia
export const COLOR_TO_PACK = {
    bw:    'bw_a4_remaining',
    color: 'color_a4_remaining',
    foto:  'foto_remaining',
};

export const PriceService = {
    /**
     * Mergea precios globales con locales (los locales sobreescriben si son > 0).
     */
    resolveEffectivePrices: (globalPrices = {}, localPrices = {}) => {
        const prices = { ...globalPrices };
        Object.keys(localPrices).forEach(key => {
            if (localPrices[key] > 0) {
                prices[key] = localPrices[key];
            }
        });
        return prices;
    },

    /**
     * Obtiene el precio unitario exacto para un modo dado.
     */
    getUnitPrice: (colorMode, effectivePrices) => {
        if (colorMode === 'bw')    return effectivePrices.a4_bn || 50;
        if (colorMode === 'color') return effectivePrices.a4_color || 150;
        if (colorMode === 'foto')  return effectivePrices.foto_10x15 || 300;
        return 0;
    },

    /**
     * Calcula el desglose completo de una orden.
     * @param {Object} data - { fileCount, copies, colorMode, globalPrices, localPrices, selectedPack, usePack }
     */
    calculateOrder: ({ fileCount, copies, colorMode, globalPrices, localPrices, selectedPack, usePack }) => {
        const effectivePrices = PriceService.resolveEffectivePrices(globalPrices, localPrices);
        const unitPrice = PriceService.getUnitPrice(colorMode, effectivePrices);
        
        const totalUnits = fileCount * copies;
        const packField = COLOR_TO_PACK[colorMode];
        
        // Lógica de PrintPass™: calcular unidades bonificadas por el pack
        const packSaldo = (usePack && selectedPack && packField) ? (selectedPack[packField] ?? 0) : 0;
        const packUnitsUsed = usePack ? Math.min(packSaldo, totalUnits) : 0;
        const paidUnits = totalUnits - packUnitsUsed;
        
        const estimatedPrice = paidUnits * unitPrice;
        
        // Puntos: Paridad estricta con NewOrderFlow.jsx: si usePack es true, 0 puntos.
        const pointsToEarn = usePack ? 0 : Math.floor(estimatedPrice * CASHBACK_RATE);

        return {
            unitPrice,
            totalUnits,
            packUnitsUsed,
            paidUnits,
            estimatedPrice,
            pointsToEarn,
            packField // Útil para la posterior persistencia
        };
    }
};
