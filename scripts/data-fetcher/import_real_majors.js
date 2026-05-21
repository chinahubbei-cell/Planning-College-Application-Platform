// Fetch real majors from gaokao.cn and upsert into the database
const fs = require('fs');
const https = require('https');
const http = require('http');

const path = require('path');
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
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
const API_BASE = 'https://api.eol.cn/gkcx/api/';
const DELAY = 200;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
    return new Promise((resolve) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', function () { this.destroy(); resolve(null); });
    });
}

function doRequest(method, path, body) {
    return new Promise((resolve) => {
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
        req.on('error', () => resolve({ ok: false }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getSchoolId(schoolName) {
    const url = `${API_BASE}?access_token=&keyword=${encodeURIComponent(schoolName)}&page=1&size=1&uri=apidata/api/gk/school/lists`;
    const json = await fetchJSON(url);
    if (json && json.code === '0000' && json.data?.item?.length > 0) {
        const school = json.data.item[0];
        if (school.name === schoolName) return school.school_id;
    }
    return null;
}

async function fetchSchoolSpecials(schoolId) {
    const url = `${API_BASE}?access_token=&keyword=&page=1&province_id=&size=300&special_group=&type=&uri=apidata/api/gk/school/special&school_id=${schoolId}&year=2024`;
    const json = await fetchJSON(url);
    if (json && json.code === '0000' && json.data?.item) return json.data.item;
    return [];
}

async function main() {
    // We'll process a small batch first to prove it works
    console.log('Fetching universities from DB...');
    const url = new URL(SUPABASE_URL + '/rest/v1/universities?select=id,name');
    const res = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const startIdx = parseInt(process.argv[2]) || 0;
    const endIdx = parseInt(process.argv[3]) || 50;
    const batch = res.slice(startIdx, endIdx);
    console.log(`Processing ${batch.length} universities for major data (${startIdx} to ${endIdx})...`);

    let totalMajors = 0;
    let allMajors = [];

    for (const uni of batch) {
        const gkId = await getSchoolId(uni.name);
        if (!gkId) {
            await sleep(100);
            continue;
        }

        const specials = await fetchSchoolSpecials(gkId);
        let count = 0;

        for (const m of specials) {
            const name = m.special_name || m.spname;
            if (!name) continue;

            allMajors.push({
                university_id: uni.id,
                name: name,
                code: m.special_id ? m.special_id.toString() : '000000',
                category: m.type_name || m.level2_name || '未分类',
                degree: m.degree || '学士',
                duration: parseInt(m.limit_year) || 4,
                subcategory: m.level3_name || null
            });
            count++;
            totalMajors++;
        }

        console.log(`  [${uni.name}] Fetched ${count} real majors`);
        await sleep(DELAY);
    }

    console.log(`\nTotal real majors fetched: ${totalMajors}`);

    if (allMajors.length > 0) {
        console.log('Inserting into database via REST...');
        const BATCH_SIZE = 100;
        let success = 0;
        for (let i = 0; i < allMajors.length; i += BATCH_SIZE) {
            const chunk = allMajors.slice(i, i + BATCH_SIZE);
            await doRequest('POST', '/rest/v1/majors', chunk);
            success += chunk.length;
            process.stdout.write(`\r  Inserted ${success}/${allMajors.length}`);
        }
        console.log('\nDone inserting!');
    }
}

main().catch(console.error);
