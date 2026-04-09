/**
 * TecnoPrint Agent — Instalador de Servicio Windows
 * 
 * Ejecutar UNA VEZ como Administrador:
 *   node src/service-install.js
 * 
 * Esto instala el agente como servicio de Windows que:
 * - Arranca automáticamente con el sistema
 * - Corre en segundo plano (invisible)
 * - Se reinicia solo si falla
 * - No requiere que ningún usuario esté logueado
 */
'use strict';

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
    name: 'TecnoPrint Agent',
    description: 'Agente de impresion silenciosa para Punto Tecnowork',
    script: path.join(__dirname, 'index.js'),
    nodeOptions: [],
    env: [
        { name: 'NODE_ENV', value: 'production' }
    ],
    // Reintentos automáticos si falla
    maxRestarts: 5,
    wait: 2,      // segundos entre reintentos
    grow: 0.5,    // backoff exponencial
    // Logging
    logpath: path.join(__dirname, '..', 'logs')
});

svc.on('install', () => {
    console.log('✓ Servicio instalado correctamente.');
    console.log('  Iniciando servicio...');
    svc.start();
});

svc.on('start', () => {
    console.log('✓ TecnoPrint Agent iniciado como servicio de Windows.');
    console.log('  Para verificar: Services.msc → "TecnoPrint Agent"');
    console.log('  Logs en: ' + path.join(__dirname, '..', 'logs', 'tecnoprint.log'));
});

svc.on('error', (err) => {
    console.error('✗ Error al instalar servicio:', err);
});

svc.install();
