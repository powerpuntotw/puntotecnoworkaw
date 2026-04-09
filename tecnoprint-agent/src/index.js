/**
 * TecnoPrint Agent — Módulo principal
 * 
 * Flujo:
 *  1. Polling a Appwrite cada POLL_INTERVAL_SECONDS
 *  2. Busca órdenes con status="en_proceso" Y print_status="pending" para ESTE local
 *  3. Marca print_status="printing" (para evitar doble proceso)
 *  4. Descarga archivos a carpeta temporal
 *  5. Imprime silenciosamente con SumatraPDF
 *  6. Borra archivos temporales
 *  7. Actualiza print_status="printed" y order status="listo"
 *  8. En caso de error: print_status="error" + log detallado
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Client, Databases, Storage, Query } = require('node-appwrite');
const logger = require('./logger');
const { printFile, listPrinters } = require('./printer');
const { downloadOrderFiles, cleanupOrderFiles, cleanupAllTemp } = require('./downloader');

// ── Configuración ────────────────────────────────────────────────────────────
const ENDPOINT    = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID  = process.env.APPWRITE_PROJECT_ID;
const API_KEY     = process.env.APPWRITE_API_KEY;
const DB_ID       = process.env.APPWRITE_DATABASE_ID || 'main_db';
const LOCATION_ID = process.env.LOCATION_ID;
const POLL_SEC    = parseInt(process.env.POLL_INTERVAL_SECONDS || '10', 10);

const PRINTER_BN    = process.env.PRINTER_BN;
const PRINTER_COLOR = process.env.PRINTER_COLOR;
const PRINTER_FOTO  = process.env.PRINTER_FOTO;

// ── Validación de configuración ──────────────────────────────────────────────
function validateConfig() {
    const required = { ENDPOINT, PROJECT_ID, API_KEY, LOCATION_ID };
    const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
        logger.error(`Faltan variables de entorno: ${missing.join(', ')}`);
        logger.error('Verificar el archivo .env junto al agente.');
        process.exit(1);
    }
    if (!PRINTER_BN && !PRINTER_COLOR && !PRINTER_FOTO) {
        logger.warn('⚠️  No hay impresoras configuradas en .env. Las órdenes no se imprimirán.');
        logger.warn('   Configurar PRINTER_BN, PRINTER_COLOR y/o PRINTER_FOTO en .env');
        const printers = listPrinters();
        if (printers.length > 0) {
            logger.info('Impresoras disponibles en este equipo:');
            printers.forEach(p => logger.info(`  - ${p}`));
        }
    }
}

// ── Selección de impresora según color_mode de la orden ──────────────────────
function selectPrinter(colorMode) {
    if (colorMode === 'foto' && PRINTER_FOTO) return PRINTER_FOTO;
    if (colorMode === 'color' && PRINTER_COLOR) return PRINTER_COLOR;
    if (PRINTER_BN) return PRINTER_BN;
    // Fallback: intentar con la primera disponible
    const printers = listPrinters();
    if (printers.length > 0) return printers[0];
    throw new Error('No hay impresoras configuradas ni disponibles en Windows.');
}

// ── Cliente Appwrite ──────────────────────────────────────────────────────────
let client, databases, storage;

function initAppwrite() {
    client = new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID)
        .setKey(API_KEY);
    databases = new Databases(client);
    storage   = new Storage(client);
    logger.info(`Appwrite conectado → ${ENDPOINT} | Proyecto: ${PROJECT_ID}`);
}

// ── Set para evitar procesar la misma orden dos veces en paralelo ────────────
const processing = new Set();

// ── Procesar una sola orden ──────────────────────────────────────────────────
async function processOrder(order) {
    const orderId = order.$id;
    const orderNum = order.order_number || orderId.substring(0, 8).toUpperCase();

    if (processing.has(orderId)) {
        logger.warn(`Orden ${orderNum} ya está siendo procesada, saltando.`);
        return;
    }
    processing.add(orderId);

    logger.info(`━━━ Procesando orden #${orderNum} ━━━`);
    logger.info(`  Color: ${order.color_mode || 'bw'} | Copias: ${order.copies || 1} | Archivos: ${(order.files || []).length}`);

    try {
        // 1. Marcar como "printing" para evitar doble proceso
        await databases.updateDocument(DB_ID, 'orders', orderId, {
            print_status: 'printing'
        });

        // 2. Validar que hay archivos
        const fileIds = order.files || [];
        if (fileIds.length === 0) {
            throw new Error('La orden no tiene archivos adjuntos.');
        }

        // 3. Seleccionar impresora
        const printer = selectPrinter(order.color_mode);
        logger.info(`  Impresora seleccionada: ${printer}`);

        // 4. Descargar archivos (temporales, no accesibles por el encargado)
        logger.info(`  Descargando ${fileIds.length} archivo(s)...`);
        const localFiles = await downloadOrderFiles(storage, fileIds, orderId);

        // 5. Imprimir cada archivo silenciosamente
        const copies = order.copies || 1;
        for (let i = 0; i < localFiles.length; i++) {
            const filePath = localFiles[i];
            logger.info(`  Imprimiendo archivo ${i + 1}/${localFiles.length}: ${require('path').basename(filePath)}`);
            await printFile(filePath, printer, copies);
        }

        // 6. Limpiar archivos temporales ANTES de marcar como listo
        cleanupOrderFiles(orderId);

        // 7. Actualizar estado en Appwrite: print_status=printed, status=listo
        await databases.updateDocument(DB_ID, 'orders', orderId, {
            print_status: 'printed',
            status: 'listo'
        });

        logger.info(`✓ Orden #${orderNum} impresa y marcada como LISTA.`);

    } catch (err) {
        logger.error(`✗ Error en orden #${orderNum}: ${err.message}`);
        // Limpiar archivos aunque haya error
        cleanupOrderFiles(orderId);
        // Marcar como error en Appwrite para que el encargado lo vea
        try {
            await databases.updateDocument(DB_ID, 'orders', orderId, {
                print_status: 'error'
            });
        } catch (updateErr) {
            logger.error(`No se pudo actualizar print_status a error: ${updateErr.message}`);
        }
    } finally {
        processing.delete(orderId);
    }
}

// ── Polling principal ────────────────────────────────────────────────────────
async function poll() {
    try {
        // Buscar órdenes: en_proceso + print_status=pending + este local
        const result = await databases.listDocuments(DB_ID, 'orders', [
            Query.equal('location_id', LOCATION_ID),
            Query.equal('status', 'en_proceso'),
            Query.equal('print_status', 'pending'),
            Query.limit(10),
            Query.orderAsc('$createdAt') // FIFO: primero la más antigua
        ]);

        if (result.documents.length === 0) return; // silencioso si no hay nada

        logger.info(`🔔 ${result.documents.length} orden(es) pendientes de imprimir.`);

        // Procesar todas en paralelo (la mayoría de los casos será 1)
        await Promise.all(result.documents.map(order => processOrder(order)));

    } catch (err) {
        // Errores de red o Appwrite — no matar el proceso, seguir intentando
        logger.error(`Error en poll: ${err.message}`);
    }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
    logger.info('═══════════════════════════════════════════════');
    logger.info('   TecnoPrint Agent v1.0 — Punto Tecnowork');
    logger.info('═══════════════════════════════════════════════');

    validateConfig();
    initAppwrite();

    // Limpiar cualquier temporal de sesiones anteriores
    cleanupAllTemp();

    // Mostrar impresoras disponibles al arrancar (útil para debug)
    const printers = listPrinters();
    if (printers.length > 0) {
        logger.info(`Impresoras detectadas: ${printers.join(' | ')}`);
    }
    logger.info(`Sucursal: ${LOCATION_ID}`);
    logger.info(`Polling cada ${POLL_SEC}s | B&N: ${PRINTER_BN || 'n/c'} | Color: ${PRINTER_COLOR || 'n/c'} | Foto: ${PRINTER_FOTO || 'n/c'}`);
    logger.info('Agente activo. Esperando órdenes...');
    logger.info('───────────────────────────────────────────────');

    // Primer poll inmediato
    await poll();

    // Loop de polling
    setInterval(poll, POLL_SEC * 1000);
}

// Manejo de señales para apagado limpio
process.on('SIGTERM', () => { logger.info('Agente detenido (SIGTERM).'); process.exit(0); });
process.on('SIGINT',  () => { logger.info('Agente detenido (SIGINT).' ); process.exit(0); });
process.on('uncaughtException', (err) => { logger.error(`Error no capturado: ${err.message}`); });
process.on('unhandledRejection', (reason) => { logger.error(`Promise rechazada: ${reason}`); });

main().catch(err => {
    logger.error(`Error fatal al iniciar: ${err.message}`);
    process.exit(1);
});
