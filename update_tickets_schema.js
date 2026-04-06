
const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a')
    .setKey('standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4');

const databases = new Databases(client);

async function updateSchema() {
    try {
        console.log("Adding attributes to 'tickets' collection...");
        
        // creator_role
        try {
            await databases.createStringAttribute('main_db', 'tickets', 'creator_role', 50, false);
            console.log("Added creator_role.");
        } catch(e) { console.log("creator_role already exists or error.", e.message); }

        // recipient_role
        try {
            // max 50 length, not required (false) to not break existing tickets
            await databases.createStringAttribute('main_db', 'tickets', 'recipient_role', 50, false);
            console.log("Added recipient_role.");
        } catch(e) { console.log("recipient_role already exists or error.", e.message); }

        // recipient_id
        try {
            await databases.createStringAttribute('main_db', 'tickets', 'recipient_id', 255, false);
            console.log("Added recipient_id.");
        } catch(e) { console.log("recipient_id already exists or error.", e.message); }

        // recipient_name
        try {
            await databases.createStringAttribute('main_db', 'tickets', 'recipient_name', 255, false);
            console.log("Added recipient_name.");
        } catch(e) { console.log("recipient_name already exists or error.", e.message); }

        console.log("Schema update completed.");
    } catch (e) {
        console.error("Critical error:", e);
    }
}
updateSchema();
