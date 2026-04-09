/**
 * TecnoPrint Agent — Módulo de descarga segura
 * Descarga archivos desde Appwrite Storage usando el SDK oficial.
 * Los archivos van a una carpeta temporal por orden y se borran
 * automáticamente después de imprimir.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const logger = require('./logger');

const TEMP_DIR = process.env.TEMP_DIR || 'C:\\Windows\\Temp\\tecnoprint';

/**
 * Asegura que la carpeta temporal existe y la crea si no.
 */
function ensureTempDir(orderId) {
    const dir = path.join(TEMP_DIR, orderId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Descarga un archivo desde una URL firmada de Appwrite.
 * @param {string} downloadUrl - URL directa de descarga
 * @param {string} destPath    - Ruta local donde guardar
 * @returns {Promise<void>}
 */
function downloadFromUrl(downloadUrl, destPath) {
    return new Promise((resolve, reject) => {
        const proto = downloadUrl.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);

        const request = proto.get(downloadUrl, (response) => {
            // Manejar redirecciones
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(destPath);
                return downloadFromUrl(response.headers.location, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                return reject(new Error(`HTTP ${response.statusCode} al descargar archivo`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        });

        request.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });

        // Timeout de 2 minutos para archivos grandes
        request.setTimeout(120000, () => {
            request.destroy();
            reject(new Error('Timeout descargando archivo'));
        });
    });
}

/**
 * Descarga todos los archivos de una orden desde Appwrite Storage.
 * @param {object} sdk         - SDK de Appwrite (storage)
 * @param {string[]} fileIds   - Array de IDs de archivos en Appwrite
 * @param {string} orderId     - ID de la orden (para carpeta temporal)
 * @returns {Promise<string[]>} - Array de rutas locales descargadas
 */
async function downloadOrderFiles(sdk, fileIds, orderId) {
    const tempDir = ensureTempDir(orderId);
    const downloadedPaths = [];

    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        logger.info(`  Descargando archivo ${i + 1}/${fileIds.length}: ${fileId}`);

        try {
            // Obtener metadata del archivo para saber su extensión
            const fileInfo = await sdk.getFile('orders_files', fileId);
            const ext = path.extname(fileInfo.name) || '.pdf';
            const localPath = path.join(tempDir, `file_${i + 1}${ext}`);

            // URL de descarga directa con autenticación via header
            const downloadUrl = `${endpoint}/storage/buckets/orders_files/files/${fileId}/download?project=${projectId}`;

            // Descargar con autenticación via query param (método más simple)
            const urlWithAuth = `${endpoint}/storage/buckets/orders_files/files/${fileId}/download?project=${projectId}&mode=admin`;

            // Usar axios-style fetch manual con API key en header
            await downloadWithApiKey(urlWithAuth, localPath, apiKey, projectId);

            const stats = fs.statSync(localPath);
            logger.info(`  Archivo descargado: ${path.basename(localPath)} (${(stats.size / 1024).toFixed(1)} KB)`);
            downloadedPaths.push(localPath);

        } catch (err) {
            logger.error(`  Error descargando ${fileId}: ${err.message}`);
            throw err;
        }
    }

    return downloadedPaths;
}

/**
 * Descarga un archivo usando API Key de Appwrite en el header.
 */
function downloadWithApiKey(url, destPath, apiKey, projectId) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const proto = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey,
            }
        };

        const file = fs.createWriteStream(destPath);
        const req = proto.request(options, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        });

        req.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

/**
 * Elimina la carpeta temporal de una orden y todo su contenido.
 * @param {string} orderId
 */
function cleanupOrderFiles(orderId) {
    const dir = path.join(TEMP_DIR, orderId);
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            logger.info(`  Archivos temporales eliminados: ${dir}`);
        }
    } catch (err) {
        logger.warn(`  No se pudo limpiar ${dir}: ${err.message}`);
    }
}

/**
 * Limpieza global: borra todos los temporales de órdenes anteriores.
 * Se ejecuta al iniciar el agente.
 */
function cleanupAllTemp() {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            const entries = fs.readdirSync(TEMP_DIR);
            for (const entry of entries) {
                const fullPath = path.join(TEMP_DIR, entry);
                fs.rmSync(fullPath, { recursive: true, force: true });
            }
            logger.info(`Limpieza inicial de ${TEMP_DIR} completada (${entries.length} entradas).`);
        } else {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    } catch (err) {
        logger.warn(`No se pudo limpiar temp global: ${err.message}`);
    }
}

module.exports = { downloadOrderFiles, cleanupOrderFiles, cleanupAllTemp };
