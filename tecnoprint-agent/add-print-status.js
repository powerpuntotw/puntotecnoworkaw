/**
 * Agrega el campo print_status a la colección orders en Appwrite.
 * Ejecutar UNA VEZ: node add-print-status.js
 */
'use strict';

require('dotenv').config({ path: 'C:\\PuntotwAW\\.env' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a')
    .setKey('standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed');

const databases = new Databases(client);

async function main() {
    try {
        // Agregar print_status: pending | printing | printed | error
        await databases.createStringAttribute(
            'main_db', 'orders', 'print_status',
            20,        // maxLength
            false,     // required
            'pending'  // default
        );
        console.log('✓ Campo print_status agregado a orders');
    } catch (err) {
        if (err.code === 409) {
            console.log('ℹ El campo print_status ya existe');
        } else {
            console.error('✗ Error:', err.message);
        }
    }
}

main();
