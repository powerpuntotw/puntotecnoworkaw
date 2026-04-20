import { databases } from './src/lib/appwrite.js';
import { Query } from 'appwrite';
import fs from 'fs';

const dbId = '67b36f7a0017a41400e9'; // Asumiendo este ID basado en logs previos
const collectionId = 'audit_logs';

async function checkLogs() {
    try {
        const res = await databases.listDocuments(dbId, collectionId, [
            Query.orderDesc('$createdAt'),
            Query.limit(5)
        ]);
        console.log('--- RECENT AUDIT LOGS ---');
        res.documents.forEach(doc => {
            console.log(`[${doc.$createdAt}] ${doc.action} - ${doc.entity_type}: ${doc.description}`);
        });
        fs.writeFileSync('audit_check.json', JSON.stringify(res.documents, null, 2));
    } catch (e) {
        console.error('Error fetching logs:', e);
    }
}

checkLogs();
