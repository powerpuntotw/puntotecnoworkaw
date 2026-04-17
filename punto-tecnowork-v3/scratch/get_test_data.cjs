const { Client, Databases, Query } = require('appwrite');

const client = new Client()
    .setEndpoint('https://appwrite.tecnowork.mywire.org/v1')
    .setProject('69aed0bd000df45ebd3a');

const databases = new Databases(client);

async function getData() {
    try {
        const locations = await databases.listDocuments('main_db', 'printing_locations', [Query.limit(1)]);
        const users = await databases.listDocuments('main_db', 'users', [Query.limit(1)]);
        const rewards = await databases.listDocuments('main_db', 'rewards', [Query.limit(50)]);
        
        const loc = locations.documents[0];
        const user = users.documents[0];
        
        const rewardNormal = rewards.documents.find(r => !r.is_print_pack);
        const rewardPack = rewards.documents.find(r => r.is_print_pack);
        
        console.log(JSON.stringify({
            location: { id: loc.$id, name: loc.name },
            user: { id: user.$id, auth_id: user.auth_id, name: user.full_name },
            rewardNormal: rewardNormal ? { id: rewardNormal.$id, name: rewardNormal.name } : null,
            rewardPack: rewardPack ? { id: rewardPack.$id, name: rewardPack.name } : null
        }, null, 2));
    } catch (err) {
        console.error(err);
    }
}

getData();
