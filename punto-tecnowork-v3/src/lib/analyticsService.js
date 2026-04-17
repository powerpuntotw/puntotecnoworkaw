import { databases } from './appwrite';
import { Query } from 'appwrite';

/**
 * Tope de seguridad para evitar transferencias de datos masivas.
 * Si un rango temporal supera este número de órdenes, solo se procesarán las 5,000 más recientes. 
 */
const MAX_REPORT_RECORDS = 5000;

export const AnalyticsService = {
    /**
     * Obtiene y procesa métricas de negocio para un rango de fechas.
     * @param {Date} startDate - Inicio del rango (Local)
     * @param {Date} endDate - Fin del rango (Local)
     */
    async getReportData(startDate, endDate) {
        try {
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            
            // Construcción de filtros ISO UTC
            // Forzamos el inicio a las 00:00:00 y fin a las 23:59:59 del día local antes de convertir a ISO
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const isoStart = start.toISOString();
            const isoEnd = end.toISOString();

            // Queries base
            const commonQueries = [
                Query.greaterThanEqual('$createdAt', isoStart),
                Query.lessThanEqual('$createdAt', isoEnd),
                Query.orderDesc('$createdAt'),
                Query.limit(MAX_REPORT_RECORDS)
            ];

            // 1. Fetch de todas las órdenes en el periodo (para KPIs de conteo y Pie Chart)
            const allOrdersRes = await databases.listDocuments(dbId, 'orders', commonQueries);
            const allOrders = allOrdersRes.documents;

            // 2. Fetch de solo órdenes 'entregado' (para Financiero y Gráfico de Líneas)
            const deliveredOrdersRes = await databases.listDocuments(dbId, 'orders', [
                ...commonQueries,
                Query.equal('status', 'entregado')
            ]);
            const deliveredOrders = deliveredOrdersRes.documents;

            // --- Cálculos de KPIs ---
            const revenue = deliveredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
            const avgTicket = deliveredOrders.length > 0 ? revenue / deliveredOrders.length : 0;
            const activeLocals = new Set(allOrders.map(o => o.location_id).filter(Boolean)).size;

            // --- Transformación: Gráfico Diario (Línea) ---
            // Creamos un mapa de todos los días en el rango para asegurar que aparezcan días con valor 0
            const dailyMap = {};
            const iterDate = new Date(start);
            while (iterDate <= end) {
                const dayLabel = iterDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                dailyMap[dayLabel] = { date: dayLabel, revenue: 0, _ts: iterDate.getTime() };
                iterDate.setDate(iterDate.getDate() + 1);
            }

            deliveredOrders.forEach(o => {
                const d = new Date(o.$createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                if (dailyMap[d]) {
                    dailyMap[d].revenue += o.total_price || 0;
                }
            });
            const dailyData = Object.values(dailyMap).sort((a, b) => a._ts - b._ts);

            // --- Transformación: Estado de Órdenes (Pie) ---
            const statusMap = {};
            allOrders.forEach(o => {
                const s = o.status || 'pendiente';
                if (!statusMap[s]) statusMap[s] = { name: s, value: 0 };
                statusMap[s].value++;
            });
            const statusData = Object.values(statusMap);

            // --- Transformación: Facturación por Sucursal (Bar) ---
            const locMap = {};
            deliveredOrders.forEach(o => {
                const n = o.location_name || 'Sin sucursal';
                if (!locMap[n]) locMap[n] = { name: n, revenue: 0 };
                locMap[n].revenue += o.total_price || 0;
            });
            const localData = Object.values(locMap).sort((a, b) => b.revenue - a.revenue);

            return {
                stats: {
                    totalOrders: allOrders.length,
                    totalRevenue: revenue,
                    avgTicket,
                    activeLocals
                },
                dailyData,
                statusData,
                localData
            };
        } catch (error) {
            console.error("AnalyticsService Error:", error);
            throw error;
        }
    }
};
