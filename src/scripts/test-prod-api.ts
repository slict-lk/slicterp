
async function main() {
    const url = 'https://erp.slict.lk/api/public/export/config?subdomain=alphamc.pro';
    console.log('Fetching:', url);

    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text.slice(0, 500)); // Log first 500 chars
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

main();
