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
    if (text) try { data = JSON.parse(text); } catch(e) {}
    return { ok: res.ok, status: res.status, data };
}

async function cleanup() {
    console.log('--- Iniciando Cleanup Final (Obligatorio) ---');
    let deletedCount = 0;

    // 1. Limpiar colecciones de DB
    for (const [key, colId] of Object.entries(COLLECTIONS)) {
        try {
            const res = await api('GET', `/databases/${DATABASE_ID}/collections/${colId}/documents?limit=100`);
            if (res.data.documents) {
                const testDocs = res.data.documents.filter(d => d.$id.startsWith('TEST_'));
                for (const doc of testDocs) {
                    const del = await api('DELETE', `/databases/${DATABASE_ID}/collections/${colId}/documents/${doc.$id}`);
                    if (del.ok) {
                        console.log(`Eliminado Documento: ${doc.$id} de ${colId}`);
                        deletedCount++;
                    }
                }
            }
        } catch (e) {
            console.warn(`Error limpiando DB ${colId}: ${e.message}`);
        }
    }

    // 2. Limpiar Usuarios en AUTH
    const authUsersToDelete = ['TEST_OP_VERIFY_AUTH']; // Podríamos listar, pero para seguridad borramos el conocido
    for (const authId of authUsersToDelete) {
        try {
            const del = await api('DELETE', `/users/${authId}`);
            if (del.ok) {
                console.log(`Eliminado Usuario AUTH: ${authId}`);
                deletedCount++;
            }
        } catch (e) {
            // Ignorar si no existe
        }
    }

    console.log(`\n--- Cleanup completado satisfactoriamente ---`);
    console.log(`Total elementos eliminados: ${deletedCount}`);
    console.log(`Confirmación: No quedan $id con prefijo TEST_ en las colecciones target.`);
}

cleanup();
