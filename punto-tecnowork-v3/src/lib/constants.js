// ─────────────────────────────────────────────────────────────
// SISTEMA DE TIERS — Fuente única de verdad
// Todos los componentes deben importar de aquí.
// Umbrales basados en historical_points (nunca bajan).
// ─────────────────────────────────────────────────────────────

export const TIER_THRESHOLDS = {
    BRONZE:  0,
    SILVER:  1000,
    GOLD:    2000,
    DIAMOND: 3000,
};

export const TIER_NAMES = {
    BRONZE:  'Bronce',
    SILVER:  'Plata',
    GOLD:    'Oro',
    DIAMOND: 'Diamante',
};

// Colores hex para uso en estilos inline (no depende de Tailwind)
export const TIER_COLORS = {
    BRONZE:  '#6B7280',
    SILVER:  '#9CA3AF',
    GOLD:    '#FFC905',
    DIAMOND: '#0093D8',
};

export const TIER_GRADIENTS = {
    BRONZE:  'from-[#6B7280] to-[#4b5563]',
    SILVER:  'from-[#9CA3AF] to-[#6b7280]',
    GOLD:    'from-[#FFC905] to-[#cc9f04]',
    DIAMOND: 'from-[#0093D8] to-[#007ba1]',
};

// ─────────────────────────────────────────────────────────────
// Clase TierCalculator — POO: encapsula toda la lógica de tiers
// ─────────────────────────────────────────────────────────────
export class TierCalculator {
    /**
     * @param {number} historicalPoints — puntos históricos acumulados (nunca bajan)
     */
    constructor(historicalPoints = 0) {
        this._pts = Math.max(0, historicalPoints);
    }

    get tierKey() {
        if (this._pts >= TIER_THRESHOLDS.DIAMOND) return 'DIAMOND';
        if (this._pts >= TIER_THRESHOLDS.GOLD)    return 'GOLD';
        if (this._pts >= TIER_THRESHOLDS.SILVER)  return 'SILVER';
        return 'BRONZE';
    }

    get name()     { return TIER_NAMES[this.tierKey]; }
    get color()    { return TIER_COLORS[this.tierKey]; }
    get gradient() { return TIER_GRADIENTS[this.tierKey]; }

    get nextThreshold() {
        const thresholds = [
            TIER_THRESHOLDS.SILVER,
            TIER_THRESHOLDS.GOLD,
            TIER_THRESHOLDS.DIAMOND,
        ];
        return thresholds.find(t => t > this._pts) ?? null;
    }

    get nextTierName() {
        if (this._pts >= TIER_THRESHOLDS.DIAMOND) return null;
        if (this._pts >= TIER_THRESHOLDS.GOLD)    return TIER_NAMES.DIAMOND;
        if (this._pts >= TIER_THRESHOLDS.SILVER)  return TIER_NAMES.GOLD;
        return TIER_NAMES.SILVER;
    }

    get nextLabel() {
        if (!this.nextTierName) return 'Nivel máximo';
        const remaining = this.nextThreshold - this._pts;
        return `${remaining.toLocaleString('es-AR')} pts para ${this.nextTierName}`;
    }

    /** Progreso de 0 a 100 hacia el siguiente tier */
    get progress() {
        if (this._pts >= TIER_THRESHOLDS.DIAMOND) return 100;
        const prev = {
            BRONZE:  0,
            SILVER:  TIER_THRESHOLDS.SILVER,
            GOLD:    TIER_THRESHOLDS.GOLD,
        }[this.tierKey] ?? 0;
        const range = this.nextThreshold - prev;
        return Math.min(100, Math.round(((this._pts - prev) / range) * 100));
    }

    /** Devuelve un objeto listo para usar en JSX */
    toInfo() {
        return {
            key:      this.tierKey,
            name:     this.name,
            color:    this.color,
            gradient: this.gradient,
            next:     this.nextLabel,
            progress: this.progress,
        };
    }
}

// ─────────────────────────────────────────────────────────────
// Helpers de cashback
// ─────────────────────────────────────────────────────────────
export const CASHBACK_RATE = 0.10; // 10% del total neto

export const calcPointsToEarn = (totalPrice) =>
    Math.floor((totalPrice ?? 0) * CASHBACK_RATE);

// ─────────────────────────────────────────────────────────────
// Nombres de buckets de Storage — fuente única
// ─────────────────────────────────────────────────────────────
export const STORAGE_BUCKETS = {
    ORDERS:   'orders_files',
    REWARDS:  'rewards_images',
    BRANDING: 'branding',
};

// ─────────────────────────────────────────────────────────────
// Estados de órdenes — etiquetas y colores para UI
// ─────────────────────────────────────────────────────────────
export const ORDER_STATUS = {
    pendiente:  { label: 'Pendiente',   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    en_proceso: { label: 'En proceso',  color: 'text-primary bg-primary/10 border-primary/20'          },
    listo:      { label: 'Listo',       color: 'text-success bg-success/10 border-success/20'          },
    entregado:  { label: 'Entregado',   color: 'text-gray-400 bg-gray-400/10 border-gray-400/20'       },
    cancelado:  { label: 'Cancelado',   color: 'text-red-400 bg-red-400/10 border-red-400/20'          },
};
