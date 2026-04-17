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
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function verify() {
    console.log('--- Verificación de Lógica Integrada (Corregida) ---');

    // 1. Validar Entrega Física
    console.log('\n[TEST 1] Entregando Premio Físico (TEST_RED_FISICO)...');
    const delivery = await api('PATCH', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents/TEST_RED_FISICO`, {
        data: { 
            status: 'entregado',
            delivered_at: new Date().toISOString()
        }
    });
    
    if (delivery.ok) {
        console.log('✅ Premio entregado correctamente.');
    } else {
        console.error('❌ Error en entrega:', delivery.data.message);
    }

    // 2. Validar Activación PrintPass
    console.log('\n[TEST 2] Activando PrintPass (TEST_RED_PACK) + Generación de Pack...');
    
    // a. Obtener datos del canje
    const redeemRes = await api('GET', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents/TEST_RED_PACK`);
    const redeem = redeemRes.data;

    // b. Obtener datos del premio
    const rewardRes = await api('GET', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REWARD}/documents/TEST_RW_PACK`);
    const reward = rewardRes.data;

    // c. Crear Print Pack Document (Schema real de RewardService.js)
    const packId = `TEST_PACK_${Date.now()}`;
    const pack = await api('POST', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.PRINT_PACK}/documents`, {
        documentId: packId,
        data: {
            client_id:          redeem.client_id,
            client_name:        redeem.client_name,
            reward_id:          reward.$id,
            reward_name:        reward.name,
            location_id:        TEST_LOCATION_ID,
            location_name:      '[TEST] Ubicación de Prueba',
            bw_a4_total:        reward.pack_bw_a4 ?? 0,
            bw_a4_remaining:    reward.pack_bw_a4 ?? 0,
            color_a4_total:     reward.pack_color_a4 ?? 0,
            color_a4_remaining: reward.pack_color_a4 ?? 0,
            foto_total:         reward.pack_foto_10x15 ?? 0,
            foto_remaining:     reward.pack_foto_10x15 ?? 0,
            bw_a3_total:        reward.pack_bw_a3 ?? 0,
            bw_a3_remaining:    reward.pack_bw_a3 ?? 0,
            activated_at:       new Date().toISOString(),
            expires_at:         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status:             'activo',
        }
    });

    if (pack.ok) {
        console.log(`✅ Documento PrintPack creado: ${packId}`);
        // Actualizar canje
        await api('PATCH', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents/TEST_RED_PACK`, {
            data: { 
                status: 'entregado',
                delivered_at: new Date().toISOString()
            }
        });
        console.log('✅ Canje PrintPass marcado como entregado.');
    } else {
        console.error('❌ Error creando PrintPack:', pack.data.message);
    }

    // 3. Resumen Final
    console.log('\n--- Resultado de Verificación ---');
    const finalRedeems = await api('GET', `/databases/${DATABASE_ID}/collections/${COLLECTIONS.REDEEM}/documents?limit=20`);
    const tests = finalRedeems.data.documents.filter(d => d.$id.startsWith('TEST_'));
    console.log('Canjes TEST actuales:');
    tests.forEach(t => console.log(`- ${t.$id}: ${t.status}`));
}

verify();
