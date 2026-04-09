/**
 * TecnoPrint Agent — Desinstalador de Servicio Windows
 * 
 * Ejecutar como Administrador:
 *   node src/service-uninstall.js
 */
'use strict';

const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
    name: 'TecnoPrint Agent',
    script: path.join(__dirname, 'index.js')
});

svc.on('uninstall', () => {
    console.log('✓ Servicio TecnoPrint Agent desinstalado.');
});

svc.uninstall();
