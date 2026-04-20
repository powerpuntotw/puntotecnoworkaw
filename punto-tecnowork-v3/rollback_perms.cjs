const { Client, Databases } = require('node-appwrite');
const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a')
    .setKey('standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4');
const db = new Databases(client);
const dbId = 'main_db';

const targetCollections = ['system_config', 'users', 'printing_locations', 'audit_logs'];
// Baseline extraído fielmente en Etapa 1 / Etapa 2
const originalPerms = ['read("any")', 'create("users")', 'update("users")', 'delete("users")'];

async function applyStage4() {
    console.log('--- Iniciando ETAPA 4 (Rollback) ---');
    const res = await db.listCollections(dbId);
    
    for (const id of targetCollections) {
        const c = res.collections.find(col => col['$id'] === id);
        if (!c) {
            console.log('Error: no se encontro ' + id);
            continue;
        }
        
        // Revertir a permisos exactos del baseline
        await db.updateCollection(dbId, id, c.name, originalPerms, c.documentSecurity, c.enabled);
        console.log('Restaurada colección: ' + id + ' -> Permisos Baseline: ' + JSON.stringify(originalPerms));
    }
    console.log('--- Rollback completado ---');
}

applyStage4().catch(console.error);
