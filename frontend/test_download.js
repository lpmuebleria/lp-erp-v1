const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const res = await axios.post(`http://127.0.0.1:8000/api/reports/team-activity`, {
            start_date: "2026-03-01",
            end_date: "2026-03-31",
            selected_families: ["maniobras", "fletes"],
            include_expenses: true
        }, {
            responseType: 'blob'
        });

        console.log("Success! Received:", typeof res.data, res.headers['content-type']);
        if (res.data instanceof Buffer || Buffer.isBuffer(res.data)) {
            console.log("Got buffer. First bytes:", res.data.slice(0, 10));
        }
    } catch (e) {
        console.error("Failed:", e.message);
        if (e.response && e.response.data) {
            console.error("Response data:", e.response.data.toString());
        }
    }
}

test();
