/**
 * TecnoPrint Agent — Módulo de logging
 * Usa winston para escribir a consola + archivo de log rotativo
 */
'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Carpeta de logs junto al ejecutable (o junto a index.js en dev)
const logDir = path.join(process.execPath ? path.dirname(process.execPath) : __dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()} ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({
            filename: path.join(logDir, 'tecnoprint.log'),
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 3,
            tailable: true
        })
    ]
});

module.exports = logger;
