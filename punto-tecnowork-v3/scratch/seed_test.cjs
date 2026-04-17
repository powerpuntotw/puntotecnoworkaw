const ENDPOINT = 'https://appwrite.tecnowork.mywire.org/v1';
const PROJECT_ID = '69aed0bd000df45ebd3a';
const API_KEY = 'standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4';
const DATABASE_ID = 'main_db';

const COLLECTIONS = {
    USER: 'users',
    REWARD: 'rewards',
    REDEEM: 'redeems',
    PRINT_PACK: 'print_packs'
};

const TEST_LOCATION_ID = '69c0d617002d2e48c03d';

async function api(method, path, body = null) {
    const url = `${ENDPOINT}${path}`;
    const options = {
        method,
        headers: {
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY
        }
    };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    try {
        if (text) data = JSON.parse(text);
    } catch (e) {
        // Ignorar si no es JSON
    }
    
    if (!res.ok) {
        if (res.status === 404 && method === 'DELETE') return null; // No importa si ya no existe
        throw new Error(`${res.status} ${data.message || text || 'Error'}`);
    }
    return data;
}

async function safeDelete(colId, docId) {
    try {
        await api('DELETE', `/databases/${DATABASE_ID}/collections/${colId}/documents/${docId}`);
        console.log(`Eliminado document ${docId} de ${colId}`);
    } catch (e) {
        // Ignorar errores en borrado safe
    }
}

async function cleanup() {
    console.log('--- Limpiando documentos TEST_ ---');
    for (const [key, colId] of Object.entries(COLLECTIONS)) {
        try {
            const res = await api('GET', `/databases/${DATABASE_ID}/collections/${colId}/documents?limit=100`);
            if (res.documents) {
                const testDocs = res.documents.filter(d => d.$id.startsWith('TEST_'));
                for (const doc of testDocs) {
                    await safeDelete(colId, doc.$id);
                }
            }
        } catch (e) {
            console.warn(`Error limpiando ${colId}: ${e.message}`);
        }
    }
}

async function seed() {
    try {
        await cleanup();
        console.log('--- Iniciando Seeding (REST API) ---');

        // 1. Usuario
        await safeDelete(COLLECTIONS.USER, 'TEST_USER_VERIFY');
        await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.USER}/documents`, {
            documentId: 'TEST_USER_VERIFY',
            data: {
                auth_id: 'TEST_AUTH_VERIFY',
                full_name: '[TEST] Usuario Verificación',
                email: 'test_verify@example.com',
                points: 1000,
                user_type: 'client',
                is_active: true
            }
        });
        console.log('Usuario TEST_USER_VERIFY creado.');

        // 2. Premio Físico
        await safeDelete(COLLECTIONS.REWARD, 'TEST_RW_FISICO');
        await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REWARD}/documents`, {
            documentId: 'TEST_RW_FISICO',
            data: {
                title: '[TEST] Premio Físico',
                name: '[TEST] Premio Físico',
                points_cost: 100,
                points_required: 100,
                stock: 10,
                is_visible: true,
                is_active: true,
                is_print_pack: false
            }
        });
        console.log('Premio TEST_RW_FISICO creado.');

        // 3. Premio Pack
        await safeDelete(COLLECTIONS.REWARD, 'TEST_RW_PACK');
        await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REWARD}/documents`, {
            documentId: 'TEST_RW_PACK',
            data: {
                title: '[TEST] Pack PrintPass 50',
                name: '[TEST] Pack PrintPass 50',
                points_cost: 500,
                points_required: 500,
                stock: 99,
                is_visible: true,
                is_active: true,
                is_print_pack: true,
                pack_bw_a4: 50,
                pack_validity_days: 30
            }
        });
        console.log('Premio TEST_RW_PACK creado.');

        // 4. Canje Físico Pendiente
        await safeDelete(COLLECTIONS.REDEEM, 'TEST_RED_FISICO');
        await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents`, {
            documentId: 'TEST_RED_FISICO',
            data: {
                client_id: 'TEST_USER_VERIFY',
                client_name: '[TEST] Usuario Verificación',
                reward_id: 'TEST_RW_FISICO',
                reward_name: '[TEST] Premio Físico',
                points_cost: 100,
                status: 'pendiente',
                code: 'T-PHYS',
                location_id: TEST_LOCATION_ID
            }
        });
        console.log('Canje TEST_RED_FISICO creado.');

        // 5. Canje Pack Pendiente
        await safeDelete(COLLECTIONS.REDEEM, 'TEST_RED_PACK');
        await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents`, {
            documentId: 'TEST_RED_PACK',
            data: {
                client_id: 'TEST_USER_VERIFY',
                client_name: '[TEST] Usuario Verificación',
                reward_id: 'TEST_RW_PACK',
                reward_name: '[TEST] Pack PrintPass 50',
                points_cost: 500,
                status: 'pendiente',
                code: 'T-PACK',
                location_id: TEST_LOCATION_ID
            }
        });
        console.log('Canje TEST_RED_PACK creado.');

        console.log('--- Seeding completado con éxito ---');
    } catch (err) {
        console.error('Error durante el seeding:', err.message);
    }
}

seed();
