const { Client, Databases } = require('appwrite');

const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a');

const databases = new Databases(client);

async function findPack() {
    try {
        const res = await databases.listDocuments('main_db', 'rewards');
        const pack = res.documents.find(r => 
            r.is_print_pack === true || 
            r.name.toLowerCase().includes('pack') || 
            r.name.toLowerCase().includes('printpass')
        );
        
        if (pack) {
            console.log(JSON.stringify({ id: pack.$id, name: pack.name, is_print_pack: pack.is_print_pack }, null, 2));
        } else {
            console.log("No pack reward found.");
        }
    } catch (err) {
        console.error(err);
    }
}

findPack();
