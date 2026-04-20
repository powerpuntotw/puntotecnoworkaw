const { Client, Databases } = require('node-appwrite');
const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a');
const db = new Databases(client);

async function testPersistence() {
    console.log('Testing Appwrite persistence as Guest (no session, no key)...');
    try {
        const res = await db.listDocuments('main_db', 'system_config');
        const priceDoc = res.documents.find(d => d.type === 'global_prices');
        if (priceDoc) {
            console.log('Doc read successful. Attempting an update...');
            await db.updateDocument('main_db', 'system_config', priceDoc['$id'], { type: 'global_prices' });
            console.log('✅ Update successful! Persistence operational from client without session.');
        } else {
            console.log('No price doc found to update, but read is working.');
        }
    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}
testPersistence();
