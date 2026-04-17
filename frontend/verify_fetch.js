const DJANGO_API_URL = 'http://127.0.0.1:8000/api';
const branchId = 'br-x74tzb48dl6cwzlx6hvldn7j';

async function testFetch() {
    const endpoint = `finance/cash-transactions/?branchId=${branchId}&limit=50&offset=0`;
    const url = `${DJANGO_API_URL}/${endpoint}`;
    
    console.log(`TESTING FETCH: ${url}`);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                // We'll use a direct token if needed, but testing anon access if allowed
            }
        });

        console.log(`Status: ${response.status}`);
        
        if (!response.ok) {
            const err = await response.text();
            console.error(`Error Body: ${err}`);
            return;
        }

        const data = await response.json();
        const results = data.results || (Array.isArray(data) ? data : []);
        
        console.log(`JSON Parsed successfully.`);
        console.log(`Total Count in JSON: ${data.count}`);
        console.log(`Items in results list: ${results.length}`);
        
        if (results.length > 0) {
            console.log(`SAMPLE ITEM: ${results[0].description}`);
        }
    } catch (e) {
        console.error(`Fetch failed completely: ${e.message}`);
    }
}

testFetch();
