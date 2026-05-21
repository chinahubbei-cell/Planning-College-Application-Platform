const fs = require('fs');
const https = require('https');
const http = require('http');

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
                    resolve({ ok: true, data: data ? JSON.parse(data) : null });
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

// Full standard undergraduate majors catalog mapping (simplified for assignment)
const MAJOR_CATALOG = {
    '工学': [
        { code: '080901', name: '计算机科学与技术', degree: '工学/理学学士' },
        { code: '080902', name: '软件工程', degree: '工学学士' },
        { code: '080701', name: '电子信息工程', degree: '工学/理学学士' },
        { code: '080801', name: '自动化', degree: '工学学士' },
        { code: '080202', name: '机械设计制造及其自动化', degree: '工学学士' },
        { code: '081001', name: '土木工程', degree: '工学学士' },
        { code: '080601', name: '电气工程及其自动化', degree: '工学学士' },
        { code: '080905', name: '物联网工程', degree: '工学学士' },
        { code: '080910T', name: '数据科学与大数据技术', degree: '工学/理学学士' },
        { code: '080907T', name: '人工智能', degree: '工学学士' }
    ],
    '理学': [
        { code: '070101', name: '数学与应用数学', degree: '理学学士' },
        { code: '070201', name: '物理学', degree: '理学学士' },
        { code: '070301', name: '化学', degree: '理学学士' },
        { code: '071001', name: '生物科学', degree: '理学学士' },
        { code: '071101', name: '心理学', degree: '理学/教育学学士' },
        { code: '070102', name: '信息与计算科学', degree: '理学学士' },
        { code: '071201', name: '统计学', degree: '理学学士' }
    ],
    '管理学': [
        { code: '120202', name: '市场营销', degree: '管理学学士' },
        { code: '120203K', name: '会计学', degree: '管理学学士' },
        { code: '120204', name: '财务管理', degree: '管理学学士' },
        { code: '120201K', name: '工商管理', degree: '管理学学士' },
        { code: '120401', name: '公共事业管理', degree: '管理学学士' },
        { code: '120206', name: '人力资源管理', degree: '管理学学士' },
        { code: '120801', name: '电子商务', degree: '管理学/工学学士' },
        { code: '120601', name: '物流管理', degree: '管理学学士' }
    ],
    '经济学': [
        { code: '020301K', name: '金融学', degree: '经济学学士' },
        { code: '020101', name: '经济学', degree: '经济学学士' },
        { code: '020401', name: '国际经济与贸易', degree: '经济学学士' },
        { code: '020102', name: '经济统计学', degree: '经济学学士' },
        { code: '020302', name: '金融工程', degree: '经济学学士' },
        { code: '020201K', name: '财政学', degree: '经济学学士' }
    ],
    '文学': [
        { code: '050101', name: '汉语言文学', degree: '文学学士' },
        { code: '050201', name: '英语', degree: '文学学士' },
        { code: '050301', name: '新闻学', degree: '文学学士' },
        { code: '050303', name: '广告学', degree: '文学学士' },
        { code: '050207', name: '日语', degree: '文学学士' },
        { code: '050103', name: '汉语国际教育', degree: '文学学士' },
        { code: '050302', name: '广播电视学', degree: '文学学士' }
    ],
    '法学': [
        { code: '030101K', name: '法学', degree: '法学学士' },
        { code: '030302', name: '社会学', degree: '法学学士' },
        { code: '030201', name: '政治学与行政学', degree: '法学学士' },
        { code: '030301', name: '社会工作', degree: '法学学士' },
        { code: '030501', name: '马克思主义理论', degree: '法学学士' }
    ],
    '医学': [
        { code: '100201K', name: '临床医学', degree: '医学学士', duration: 5 },
        { code: '100301K', name: '口腔医学', degree: '医学学士', duration: 5 },
        { code: '101101', name: '护理学', degree: '理学/医学学士' },
        { code: '100701', name: '药学', degree: '理学学士' },
        { code: '100401K', name: '预防医学', degree: '医学学士', duration: 5 },
        { code: '100501K', name: '中医学', degree: '医学学士', duration: 5 },
        { code: '101001', name: '医学检验技术', degree: '理学学士' }
    ],
    '教育学': [
        { code: '040101', name: '教育学', degree: '教育学学士' },
        { code: '040106', name: '学前教育', degree: '教育学学士' },
        { code: '040107', name: '小学教育', degree: '教育学学士' },
        { code: '040104', name: '教育技术学', degree: '理学/工学/教育学学士' },
        { code: '040201', name: '体育教育', degree: '教育学学士' }
    ],
    '艺术学': [
        { code: '130202', name: '音乐表演', degree: '艺术学学士' },
        { code: '130310', name: '播音与主持艺术', degree: '艺术学学士' },
        { code: '130401', name: '美术学', degree: '艺术学学士' },
        { code: '130502', name: '视觉传达设计', degree: '艺术学学士' },
        { code: '130503', name: '环境设计', degree: '艺术学学士' },
        { code: '130504', name: '产品设计', degree: '艺术学学士' },
        { code: '130508', name: '数字媒体艺术', degree: '艺术学学士' }
    ],
    '农学': [
        { code: '090101', name: '农学', degree: '农学学士' },
        { code: '090102', name: '园艺', degree: '农学学士' },
        { code: '090201', name: '林学', degree: '农学学士' },
        { code: '090401', name: '动物科学', degree: '农学学士' },
        { code: '090402', name: '动物医学', degree: '农学学士', duration: 5 } // Usually 5 years
    ]
};

// University Type to allowed categories mapping
const TYPE_ALLOWED_CATS = {
    '综合': ['工学', '理学', '管理学', '经济学', '文学', '法学', '艺术学'],
    '理工': ['工学', '理学', '管理学', '经济学', '艺术学'],
    '师范': ['教育学', '文学', '理学', '艺术学', '法学', '心理学(理学)'], // psychology mapping omitted
    '医药': ['医学', '理学', '管理学'],
    '财经': ['经济学', '管理学', '法学', '文学'],
    '政法': ['法学', '管理学', '文学'],
    '农业': ['农学', '工学', '理学', '管理学'],
    '艺术': ['艺术学', '文学'],
    '体育': ['教育学', '管理学'],
    '语言': ['文学', '经济学', '管理学'],
    '民族': ['法学', '文学', '管理学', '经济学']
};

function assignMajorsForUni(uni) {
    const isTop = uni.is_985 || uni.is_211 || uni.is_double_first_class;
    const numCats = isTop ? 5 : 3;
    const majorsPerCat = isTop ? 4 : 2;

    let cats = TYPE_ALLOWED_CATS[uni.type];
    if (!cats || cats.length === 0) cats = TYPE_ALLOWED_CATS['综合']; // Fallback

    // Shuffle categories
    const selectedCats = [...cats].sort(() => 0.5 - Math.random()).slice(0, numCats);

    const assigned = [];
    for (const cat of selectedCats) {
        if (!MAJOR_CATALOG[cat]) continue;

        // Always include computer science for engineering if present
        let availableMajors = [...MAJOR_CATALOG[cat]].sort(() => 0.5 - Math.random());

        // Give CS priority for sci/eng
        if (cat === '工学') {
            const csIdx = availableMajors.findIndex(m => m.name === '计算机科学与技术');
            if (csIdx > 0) {
                const temp = availableMajors[0];
                availableMajors[0] = availableMajors[csIdx];
                availableMajors[csIdx] = temp;
            }
        }

        const selectedMajors = availableMajors.slice(0, majorsPerCat);
        for (const m of selectedMajors) {
            assigned.push({
                university_id: uni.id,
                name: m.name,
                code: m.code,
                category: cat,
                degree: m.degree,
                duration: m.duration || 4,
                description: `${uni.name}开设的${m.name}专业，属于${cat}门类，授予${m.degree}学位。`
            });
        }
    }

    return assigned;
}

async function main() {
    console.log('Fetching all universities from DB...');
    const url = new URL(SUPABASE_URL + '/rest/v1/universities?select=id,name,type,is_985,is_211,is_double_first_class');
    const maxRetries = 3;
    let resData;
    for (let i = 0; i < maxRetries; i++) {
        const res = await doRequest('GET', url.pathname + url.search);
        if (res.ok) {
            resData = res.data;
            break;
        }
        await sleep(1000);
    }

    if (!resData) {
        console.error('Failed to fetch universities');
        return;
    }

    console.log(`Ready to generate majors for ${resData.length} universities`);

    let allMajors = [];
    for (const uni of resData) {
        const generated = assignMajorsForUni(uni);
        allMajors = allMajors.concat(generated);
    }

    console.log(`Generated ${allMajors.length} major records.`);

    if (allMajors.length > 0) {
        console.log('Upserting assigned majors into Database via REST API...');
        const BATCH_SIZE = 100;
        let success = 0;
        let errors = 0;

        for (let i = 0; i < allMajors.length; i += BATCH_SIZE) {
            const chunk = allMajors.slice(i, i + BATCH_SIZE);
            const res = await doRequest('POST', '/rest/v1/majors', chunk);
            if (res.ok) {
                success += chunk.length;
            } else {
                errors += chunk.length;
            }
            process.stdout.write(`\r  Inserted ${success}/${allMajors.length} (errors: ${errors})`);
        }
        console.log('\nDone inserting realistic simulated majors for all newly added universities!');
    }
}

main().catch(console.error);
