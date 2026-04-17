const ENDPOINT = 'https://appwrite.tecnowork.mywire.org/v1';
const PROJECT_ID = '69aed0bd000df45ebd3a';
const API_KEY = 'standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4';
const DATABASE_ID = 'main_db';

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
    const data = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${data.message || 'Error'}`);
    return data;
}

async function createTestOperator() {
    try {
        console.log('--- Creando Operador de Prueba ---');
        // 1. Borrar si existe (en Auth)
        try {
            await api('DELETE', `/users/TEST_OP_VERIFY_AUTH`);
            console.log('Usuario auth previo borrado.');
        } catch (e) {}

        // 2. Crear en Auth
        const authUser = await api('POST', '/users', {
            userId: 'TEST_OP_VERIFY_AUTH',
            email: 'test_op@example.com',
            password: 'Password123!',
            name: '[TEST] Operador Verificación'
        });
        console.log('Usuario en AUTH creado.');

        // 3. Crear en Colección 'users' (Database)
        // Borrar si existe
        // ... (el script seed_test ya tiene lógica de borrado para TEST_)
        
        await api('POST', `/databases/${DATABASE_ID}/collections/users/documents`, {
            documentId: 'TEST_OP_VERIFY_DOC',
            data: {
                auth_id: 'TEST_OP_VERIFY_AUTH',
                full_name: '[TEST] Operador Verificación',
                email: 'test_op@example.com',
                user_type: 'admin', // Admin para ver todo
                location_id: '69c0d617002d2e48c03d', // Tecnowork Centro
                is_active: true
            }
        });
        console.log('Documento de usuario creado en DB.');
        console.log('CREDENTIALS: test_op@example.com / Password123!');

    } catch (err) {
        console.error('Error creando operador:', err.message);
    }
}

createTestOperator();
