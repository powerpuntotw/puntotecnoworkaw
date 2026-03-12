import { Client, Databases, Storage, ID } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.tecnowork.mywire.org/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '69aed0bd000df45ebd3a');

// NOTE: This usually requires a Session or API Key with sufficient permissions
const databases = new Databases(client);
const storage = new Storage(client);
const databaseId = 'main_db';

async function init() {
    console.log("Iniciando creación de recursos...");

    // 1. Intentar crear Bucket 'branding'
    try {
        console.log("Verificando/Creando bucket 'branding'...");
        await storage.createBucket('branding', 'Branding (Logos)');
        console.log("✅ Bucket 'branding' creado.");
    } catch (e) {
        if (e.code === 409) console.log("ℹ️ Bucket 'branding' ya existe.");
        else console.error("❌ Error bucket 'branding':", e.message);
    }

    // 2. Intentar crear Bucket 'orders_files'
    try {
        console.log("Verificando/Creando bucket 'orders_files'...");
        await storage.createBucket('orders_files', 'Archivos de Ordenes');
        console.log("✅ Bucket 'orders_files' creado.");
    } catch (e) {
        if (e.code === 409) console.log("ℹ️ Bucket 'orders_files' ya existe.");
        else console.error("❌ Error bucket 'orders_files':", e.message);
    }

    // 3. Crear Colección 'system_config'
    try {
        console.log("Verificando/Creando colección 'system_config'...");
        await databases.createCollection(databaseId, 'system_config', 'Configuración del Sistema');
        console.log("✅ Colección 'system_config' creada. Añadiendo atributos...");
        
        await databases.createStringAttribute(databaseId, 'system_config', 'type', 50, true);
        await databases.createStringAttribute(databaseId, 'system_config', 'data', 5000, true);
        console.log("✅ Atributos añadidos.");
    } catch (e) {
        if (e.code === 409) console.log("ℹ️ Colección 'system_config' ya existe.");
        else console.error("❌ Error colección 'system_config':", e.message);
    }

    console.log("Proceso finalizado. Si los errores persisten, verifica los permisos (ACL) de los recursos creados.");
}

init();
