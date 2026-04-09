/**
 * TecnoPrint Agent — Módulo de impresión silenciosa
 * Usa SumatraPDF portable para imprimir sin diálogo.
 * SumatraPDF soporta: PDF, DOCX, XLSX, JPG, PNG, BMP, TIFF nativamente.
 */
'use strict';

const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// SumatraPDF portable debe estar junto al .exe o en src/ durante desarrollo
const SUMATRA_PATHS = [
    path.join(process.execPath ? path.dirname(process.execPath) : __dirname, '..', 'SumatraPDF.exe'),
    path.join(__dirname, '..', 'SumatraPDF.exe'),
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
];

function getSumatraPath() {
    for (const p of SUMATRA_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('SumatraPDF.exe no encontrado. Colocarlo junto al agente.');
}

/**
 * Imprime un archivo de forma silenciosa.
 * @param {string} filePath  - Ruta absoluta al archivo a imprimir
 * @param {string} printer   - Nombre exacto de la impresora en Windows
 * @param {number} copies    - Número de copias
 * @returns {Promise<void>}
 */
function printFile(filePath, printer, copies = 1) {
    return new Promise((resolve, reject) => {
        const sumatra = getSumatraPath();
        const ext = path.extname(filePath).toLowerCase();

        // SumatraPDF soporta todos estos formatos directamente
        const supported = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];
        if (!supported.includes(ext)) {
            return reject(new Error(`Formato no soportado: ${ext}`));
        }

        // Construir argumentos de SumatraPDF
        // -print-to "IMPRESORA" -print-settings "noscale,portrait,bin=auto" -silent
        const printSettings = `noscale,portrait`;
        const args = [
            '-print-to', printer,
            '-print-settings', `${printSettings}`,
            '-silent',
            filePath
        ];

        // Si hay múltiples copias, repetir el comando
        const printOnce = () => new Promise((res, rej) => {
            execFile(sumatra, args, { timeout: 60000 }, (err, stdout, stderr) => {
                if (err) {
                    logger.error(`SumatraPDF error: ${err.message}`);
                    rej(err);
                } else {
                    res();
                }
            });
        });

        // Ejecutar las copias secuencialmente
        (async () => {
            try {
                for (let i = 0; i < copies; i++) {
                    logger.info(`  Imprimiendo copia ${i + 1}/${copies} en "${printer}"...`);
                    await printOnce();
                    if (i < copies - 1) await new Promise(r => setTimeout(r, 1500)); // pausa entre copias
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        })();
    });
}

/**
 * Obtiene la lista de impresoras instaladas en Windows.
 * Útil para verificar que los nombres de .env son correctos.
 */
function listPrinters() {
    try {
        const output = execSync('powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"', { encoding: 'utf8' });
        return output.trim().split('\n').map(l => l.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

module.exports = { printFile, listPrinters };
