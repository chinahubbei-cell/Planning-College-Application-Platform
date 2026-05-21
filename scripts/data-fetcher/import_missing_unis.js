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

// Helper for REST API
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
                    resolve({ ok: true, data: data ? JSON.parse(data) : null });
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

async function main() {
    console.log('Reading gaokao.cn school list...');
    const data = JSON.parse(fs.readFileSync('/tmp/moe/gaokao_school_list.json', 'utf8'));
    const schools = data.data; // Dictionary of id -> school info

    // Extract all undergraduate (本科) schools
    const undergrads = [];
    for (const [id, info] of Object.entries(schools)) {
        if (info.level && info.level.includes('本科')) {
            // Map gaokao fields to our DB schema
            // "department": "1" = 教育部, "2" = 其他部委, "3" = 地方属, "4" = 军队
            // "nature": "公办", "民办", "中外合作办学", "内地与港澳台地区合作办学"
            // "f985": "1" = 是, "2" = 否
            // "f211": "1" = 是, "2" = 否
            // "dual_class": "140131" etc means YES, "1" means NO (or not mapped)

            const is985 = info.f985 === '1';
            const is211 = info.f211 === '1';
            const isDoubleClass = info.dual_class && info.dual_class !== '1' && info.dual_class !== '';
            const isPrivate = info.nature === '民办' || info.nature === '中外合作办学' || info.nature === '内地与港澳台地区合作办学';

            let level = 'regular';
            if (is985) level = '985';
            else if (is211) level = '211';
            else if (isDoubleClass) level = 'double_first_class';

            let typeStr = info.type || '综合';
            typeStr = typeStr.replace('类', ''); // "理工类" -> "理工"

            let masterDept = '地方属';
            if (info.department === '1') masterDept = '教育部';
            else if (info.department === '2') masterDept = '其他部委';
            else if (info.department === '4') masterDept = '军队';

            undergrads.push({
                name: info.name.trim(),
                code: `GK${info.school_id}`, // Using Gaokao internal ID as code for missing ones, ensures uniqueness
                province: info.pro || '',
                city: info.city || '',
                level: level,
                type: typeStr,
                is_985: is985,
                is_211: is211,
                is_double_first_class: isDoubleClass,
                is_private: isPrivate,
                master_dept: masterDept
            });
        }
    }

    console.log(`Found ${undergrads.length} undergraduate universities across China.`);

    // Fetch existing universities from DB to avoid duplicates and preserve original codes
    console.log('Fetching existing universities from DB...');
    const url = new URL(SUPABASE_URL + '/rest/v1/universities?select=name,code');
    const res = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const existingNames = new Set(res.map(u => u.name));
    console.log(`DB currently has ${existingNames.size} universities.`);

    // Filter new ones
    const newUniversities = undergrads.filter(u => !existingNames.has(u.name));
    console.log(`Preparing to insert ${newUniversities.length} new universities...`);

    if (newUniversities.length === 0) {
        console.log('Nothing to insert. Done!');
        return;
    }

    // Insert via REST API
    const BATCH_SIZE = 100;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < newUniversities.length; i += BATCH_SIZE) {
        const chunk = newUniversities.slice(i, i + BATCH_SIZE);
        const result = await doRequest('POST', '/rest/v1/universities', chunk);
        if (result.ok) {
            success += chunk.length;
        } else {
            errors += chunk.length;
            console.error(`Error batch ${i}: ${result.body}`);
        }
        process.stdout.write(`\r  Inserted ${success}/${newUniversities.length} (err: ${errors})`);
    }

    console.log(`\nDone! Success: ${success}, Errors: ${errors}`);
}

main().catch(console.error);
