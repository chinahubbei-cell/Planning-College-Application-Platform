/**
 * 专业级分数线 + 位次补全脚本
 * 
 * 从 static-data.gaokao.cn 的 school/{id}/dic/specialscore/{province_id}.json 端点
 * 拉取各院校的专业录取分数线（含位次），写入 admission_scores 表。
 * 
 * 用法: node scripts/data-fetcher/fetch_special_scores.js [startIdx] [endIdx]
 */
const fs = require('fs');
const https = require('https');

// Load env
const envContent = fs.readFileSync(
    require('path').resolve(__dirname, '../../.env'), 'utf8'
);
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
const DELAY = 300;

// 湖北省 ID = 42，优先只抓湖北
const TARGET_PROVINCE_ID = '42';
const TARGET_PROVINCE_NAME = '湖北';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
    return new Promise((resolve) => {
        https.get(url, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
        }).on('error', () => resolve(null)).on('timeout', function () { this.destroy(); resolve(null); });
    });
}

function supabaseRequest(method, path, body) {
    return new Promise((resolve) => {
        const url = new URL(SUPABASE_URL + path);
        const req = https.request(url, {
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=ignore-duplicates,return=minimal'
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

// Subject type mapping
function mapSubjectType(typeStr) {
    if (!typeStr) return 'physics';
    if (typeStr.includes('物理') || typeStr.includes('理科') || typeStr.includes('理工')) return 'physics';
    if (typeStr.includes('历史') || typeStr.includes('文科') || typeStr.includes('文史')) return 'history';
    return 'physics';
}

async function main() {
    console.log('=== 专业级分数线补全 (specialScore) ===\n');
    console.log(`目标省份: ${TARGET_PROVINCE_NAME} (ID: ${TARGET_PROVINCE_ID})\n`);

    // Step 1: Get gaokao school list
    console.log('Step 1: 下载掌上高考院校列表...');
    const listData = await fetchJSON('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!listData || listData.code !== '0000') {
        console.error('Failed to fetch school list');
        return;
    }

    const nameToGkId = {};
    for (const [gkId, info] of Object.entries(listData.data)) {
        nameToGkId[info.name] = gkId;
    }

    // Paginated fetch helper (Supabase REST default limit is 1000)
    async function fetchAllRows(tablePath) {
        const PAGE = 1000;
        let all = [];
        let offset = 0;
        while (true) {
            const u = new URL(`${SUPABASE_URL}${tablePath}&limit=${PAGE}&offset=${offset}`);
            const page = await new Promise((resolve, reject) => {
                https.get(u, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }, (resp) => {
                    let data = '';
                    resp.on('data', chunk => data += chunk);
                    resp.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            });
            all = all.concat(page);
            if (page.length < PAGE) break;
            offset += PAGE;
        }
        return all;
    }

    // Step 2: Fetch universities from DB
    console.log('Step 2: 获取数据库院校列表...');
    const unis = await fetchAllRows('/rest/v1/universities?select=id,name&order=id');
    console.log(`  数据库院校: ${unis.length}`);

    // Step 3: Fetch majors from DB for mapping
    console.log('Step 3: 获取专业列表用于关联...');
    const majors = await fetchAllRows('/rest/v1/majors?select=id,name,university_id&order=id');
    console.log(`  数据库专业: ${majors.length}`);

    // Build major lookup: "uniId_majorName" -> majorId
    const majorLookup = {};
    for (const m of majors) {
        majorLookup[`${m.university_id}_${m.name}`] = m.id;
    }
    console.log(`  专业映射条目: ${Object.keys(majorLookup).length}`);

    const matched = [];
    for (const uni of unis) {
        const gkId = nameToGkId[uni.name];
        if (gkId) matched.push({ ...uni, gkId });
    }
    console.log(`  匹配院校: ${matched.length}`);

    const startIdx = parseInt(process.argv[2]) || 0;
    const endIdx = parseInt(process.argv[3]) || matched.length;
    const batch = matched.slice(startIdx, endIdx);
    console.log(`\nStep 4: 拉取专业分数线 [${startIdx}-${endIdx}] (${batch.length} 所)\n`);

    let totalScores = 0;
    let insertedCount = 0;
    let failCount = 0;

    for (let i = 0; i < batch.length; i++) {
        const uni = batch[i];

        // Try multiple URL patterns (gaokao.cn has changed its CDN structure)
        const urls = [
            `https://static-data.gaokao.cn/www/2.0/school/${uni.gkId}/dic/specialscore/${TARGET_PROVINCE_ID}.json`,
            `https://static-data.gaokao.cn/www/2.0/school/${uni.gkId}/specialscore/${TARGET_PROVINCE_ID}.json`,
        ];

        let result = null;
        for (const url of urls) {
            result = await fetchJSON(url);
            if (result && result.code === '0000' && result.data) break;
            result = null;
        }

        if (!result) {
            failCount++;
            await sleep(100);
            if ((i + 1) % 50 === 0) {
                console.log(`  [${i + 1}/${batch.length}] ${uni.name}: 无数据`);
            }
            continue;
        }

        const scores = [];

        // result.data structure varies — try to handle common formats
        // Format 1: { "year_type": [ {spname, min, max, average, min_section, ...} ] }
        // Format 2: { "year": { "type": [ ... ] } }
        for (const [key, value] of Object.entries(result.data)) {
            let items = [];

            if (Array.isArray(value)) {
                // Format: key = "2024_1" (year_typeId)
                items = value;
                const parts = key.split('_');
                const year = parseInt(parts[0]);
                if (year < 2021 || year > 2025) continue;

                for (const item of items) {
                    const spName = item.spname || item.special_name || '';
                    const minScore = parseInt(item.min) || parseInt(item.min_score) || null;
                    const avgScore = parseInt(item.average) || null;
                    const maxScore = parseInt(item.max) || null;
                    const minRank = parseInt(item.min_section) || parseInt(item.min_rank) || null;
                    const subjectType = item.zslx_name ? mapSubjectType(item.zslx_name) :
                        item.local_type_name ? mapSubjectType(item.local_type_name) : 'physics';
                    const batch = item.local_batch_name || item.batch_name || 'batch_1';

                    if (!minScore || minScore <= 0) continue;

                    // Try to find major_id
                    const majorId = majorLookup[`${uni.id}_${spName}`] || null;

                    scores.push({
                        university_id: uni.id,
                        major_id: majorId,
                        province: TARGET_PROVINCE_NAME,
                        year: year,
                        subject_type: subjectType,
                        batch: 'batch_1',
                        min_score: minScore,
                        avg_score: avgScore,
                        max_score: maxScore,
                        min_rank: minRank,
                    });
                }
            } else if (typeof value === 'object' && value !== null) {
                // Nested format: key = year, value = { typeId: [...] }
                const year = parseInt(key);
                if (year < 2021 || year > 2025) continue;

                for (const [typeKey, typeItems] of Object.entries(value)) {
                    if (!Array.isArray(typeItems)) continue;
                    for (const item of typeItems) {
                        const spName = item.spname || item.special_name || '';
                        const minScore = parseInt(item.min) || parseInt(item.min_score) || null;
                        const avgScore = parseInt(item.average) || null;
                        const maxScore = parseInt(item.max) || null;
                        const minRank = parseInt(item.min_section) || parseInt(item.min_rank) || null;
                        const subjectType = item.zslx_name ? mapSubjectType(item.zslx_name) :
                            item.local_type_name ? mapSubjectType(item.local_type_name) : 'physics';

                        if (!minScore || minScore <= 0) continue;

                        const majorId = majorLookup[`${uni.id}_${spName}`] || null;

                        scores.push({
                            university_id: uni.id,
                            major_id: majorId,
                            province: TARGET_PROVINCE_NAME,
                            year: year,
                            subject_type: subjectType,
                            batch: 'batch_1',
                            min_score: minScore,
                            avg_score: avgScore,
                            max_score: maxScore,
                            min_rank: minRank,
                        });
                    }
                }
            }
        }

        totalScores += scores.length;

        // Insert in chunks
        if (scores.length > 0) {
            const CHUNK = 200;
            for (let j = 0; j < scores.length; j += CHUNK) {
                const chunk = scores.slice(j, j + CHUNK);
                const res = await supabaseRequest('POST', '/rest/v1/admission_scores', chunk);
                if (res.ok) {
                    insertedCount += chunk.length;
                } else {
                    // Log but don't stop — might be duplicate constraint
                    if (!res.body?.includes('duplicate')) {
                        console.warn(`  Chunk insert warning for ${uni.name}: ${res.body?.substring(0, 100)}`);
                    }
                }
            }
        }

        if ((i + 1) % 20 === 0) {
            console.log(`  [${i + 1}/${batch.length}] ${uni.name}: ${scores.length} 条 (总计: ${totalScores}, 入库: ${insertedCount})`);
        }
        await sleep(DELAY);
    }

    console.log(`\n=== 完成 ===`);
    console.log(`总专业分数线: ${totalScores}`);
    console.log(`成功入库: ${insertedCount}`);
    console.log(`无数据院校: ${failCount}`);
}

main().catch(console.error);
