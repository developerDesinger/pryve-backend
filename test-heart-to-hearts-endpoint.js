const axios = require('axios');

async function testHeartToHeartsEndpoint() {
    try {
        console.log('Testing Heart-to-Hearts endpoint...');
        console.log('URL: https://pryve-backend.projectco.space/api/v1/chats/journey/messages?category=heart-to-hearts&limit=10');
        
        const response = await axios.get('https://pryve-backend.projectco.space/api/v1/chats/journey/messages', {
            params: {
                category: 'heart-to-hearts',
                limit: 10
            },
            timeout: 10000
        });

        console.log('\n=== RESPONSE STATUS ===');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);

        console.log('\n=== RESPONSE HEADERS ===');
        console.log(JSON.stringify(response.headers, null, 2));

        console.log('\n=== RESPONSE DATA ===');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data && Array.isArray(response.data)) {
            console.log(`\n=== SUMMARY ===`);
            console.log(`Total messages returned: ${response.data.length}`);
        }

    } catch (error) {
        console.error('\n=== ERROR ===');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testHeartToHeartsEndpoint();