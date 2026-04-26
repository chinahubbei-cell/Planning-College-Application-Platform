export async function syncUniversities(supabase: any) {
    console.log('Fetching gaokao.cn school list...');

    // Fetch directly from the CDN used by gaokao.cn
    const response = await fetch('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!response.ok) {
        throw new Error(`Failed to fetch school list: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== '0000' || !data.data) {
        throw new Error('Invalid response format from gaokao.cn');
    }

    const schools = data.data; // Dictionary of id -> school info
    const undergrads: any[] = [];

    for (const [id, info] of Object.entries(schools)) {
        if (info.level && info.level.includes('本科')) {
            const is985 = info.f985 === '1';
            const is211 = info.f211 === '1';
            const isDoubleClass = info.dual_class && info.dual_class !== '1' && info.dual_class !== '';
            const isPrivate = info.nature === '民办' || info.nature === '中外合作办学' || info.nature === '内地与港澳台地区合作办学';

            let level = 'regular';
            if (is985) level = '985';
            else if (is211) level = '211';
            else if (isDoubleClass) level = 'double_first_class';

            let typeStr = info.type || '综合';
            typeStr = typeStr.replace('类', '');

            let masterDept = '地方属';
            if (info.department === '1') masterDept = '教育部';
            else if (info.department === '2') masterDept = '其他部委';
            else if (info.department === '4') masterDept = '军队';

            undergrads.push({
                name: info.name.trim(),
                code: `GK${info.school_id}`, // Using Gaokao internal ID as code
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

    console.log(`Found ${undergrads.length} undergraduate universities.`);

    // Fetch existing universities to avoid duplicates
    const { data: existingUnis, error: fetchError } = await supabase
        .from('universities')
        .select('name, code');

    if (fetchError) throw fetchError;

    const existingNames = new Set(existingUnis?.map((u: any) => u.name).filter(Boolean) || []);
    const existingCodes = new Set(existingUnis?.map((u: any) => u.code).filter(Boolean) || []);
    const seenNames = new Set<string>();
    const seenCodes = new Set<string>();
    const newUniversities = undergrads.filter((uni) => {
        if (!uni.name || !uni.code) return false;
        if (existingNames.has(uni.name) || existingCodes.has(uni.code)) return false;
        if (seenNames.has(uni.name) || seenCodes.has(uni.code)) return false;

        seenNames.add(uni.name);
        seenCodes.add(uni.code);
        return true;
    });

    console.log(`Found ${newUniversities.length} new universities to insert.`);

    if (newUniversities.length === 0) {
        return { recordsAdded: 0, message: 'No new universities found.' };
    }

    // Insert new universities in batches
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < newUniversities.length; i += BATCH_SIZE) {
        const chunk = newUniversities.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
            .from('universities')
            .upsert(chunk, { onConflict: 'code', ignoreDuplicates: true });

        if (insertError) {
            console.error('Insert chunk error:', insertError);
            throw insertError;
        }
        successCount += chunk.length;
    }

    return {
        recordsAdded: successCount,
        message: `Successfully synced universities. Inserted ${successCount}.`
    };
}
