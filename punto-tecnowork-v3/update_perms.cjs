const { Client, Databases } = require('node-appwrite');
const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a')
    .setKey('standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4');
const db = new Databases(client);
const dbId = 'main_db';

const targetCollections = ['system_config', 'users', 'printing_locations', 'audit_logs'];

async function applyStage2() {
    console.log('--- Iniciando ETAPA 2 ---');
    const res = await db.listCollections(dbId);
    
    for (const id of targetCollections) {
        const c = res.collections.find(col => col['$id'] === id);
        if (!c) {
            console.log('Error: no se encontro ' + id);
            continue;
        }
        
        let newPerms = [...c['$permissions']];
        
        // Add create(any) and update(any) if not present
        if (!newPerms.includes('create("any")')) newPerms.push('create("any")');
        if (!newPerms.includes('update("any")')) newPerms.push('update("any")');
        
        // Ensure no delete(any)
        newPerms = newPerms.filter(p => p !== 'delete("any")');
        
        await db.updateCollection(dbId, id, c.name, newPerms, c.documentSecurity, c.enabled);
        console.log('Modificada colección: ' + id + ' -> Nuevos permisos: ' + JSON.stringify(newPerms));
    }
    console.log('--- Apertura completada ---');
}

applyStage2().catch(console.error);
