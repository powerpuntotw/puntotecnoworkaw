const execute = async () => {
    try {
        const url = 'https://appwrite.tecnowork.mywire.org/v1/databases/main_db/collections/orders/attributes/boolean';
        const apiKey = 'standard_6655b4758f6786529a0611f2537bd0b9190a1ea8cb72e3bbacaa4db5ebb329ed508906e45914a97593c54249b5544fa0fa063ff5def690b8811a109638fbfc170c91fefd453a1557238bb338c6d488f0993e6b7051e2c6890f0ca73877a92282a39f16b0c164f6bf4ffeff133f689e62e421d6ba98d5bde58e424dc39e0215e4';
        const projectId = '69aed0bd000df45ebd3a';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey,
            },
            body: JSON.stringify({
                key: 'refund_applied',
                required: false,
                default: false,
                array: false
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Attribute "refund_applied" created successfully:', data);
        } else {
            console.error('❌ Failed to create attribute:', data);
        }
    } catch (error) {
        console.error('Error fetching:', error);
    }
};

execute();
