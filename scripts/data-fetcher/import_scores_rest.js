// Import SQL files into Supabase via REST API in batches
const fs = require('fs');
const https = require('https');

const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase configuration in .env');
    process.exit(1);
}

function doRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(SUPABASE_URL + path);
        const req = https.request(url, {
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=ignore-duplicates'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ ok: true });
                } else {
                    resolve({ ok: false, status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function parseSqlToRecords(sqlFile) {
    const content = fs.readFileSync(sqlFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const records = [];

    for (const line of lines) {
        const valuesStart = line.indexOf('VALUES ') + 7;
        const valuesEnd = line.lastIndexOf(' ON CONFLICT');
        if (valuesStart < 7 || valuesEnd === -1) continue;

        const valuesStr = line.substring(valuesStart, valuesEnd);
        // Parse tuples
        const regex = /\((\d+),'([^']+)',(\d+),'([^']+)','([^']+)',(\d+),(NULL|\d+),(NULL|\d+)\)/g;
        let match;
        while ((match = regex.exec(valuesStr)) !== null) {
            records.push({
                university_id: parseInt(match[1]),
                province: match[2],
                year: parseInt(match[3]),
                subject_type: match[4],
                batch: match[5],
                min_score: parseInt(match[6]),
                avg_score: match[7] === 'NULL' ? null : parseInt(match[7]),
                min_rank: match[8] === 'NULL' ? null : parseInt(match[8]),
            });
        }
    }
    return records;
}

async function main() {
    const sqlFile = process.argv[2];
    if (!sqlFile) {
        console.error('Usage: node import_scores.js <sql_file>');
        return;
    }

    console.log(`Parsing ${sqlFile}...`);
    const records = parseSqlToRecords(sqlFile);
    console.log(`Parsed ${records.length} records`);

    const BATCH_SIZE = 100;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const chunk = records.slice(i, i + BATCH_SIZE);
        const result = await doRequest('POST', '/rest/v1/admission_scores', chunk);
        if (result.ok) {
            success += chunk.length;
        } else {
            errors += chunk.length;
            if (errors <= 500) process.stderr.write(`E`);
        }
        process.stdout.write(`\r  Inserted ${success}/${records.length} (err: ${errors})`);
    }

    console.log(`\n  Done! Success: ${success}, Errors: ${errors}`);
}

main().catch(console.error);
