import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmissionData() {
  console.log('=== 查询当前分数线数据 ===');

  // 先查询 admission_scores 表的一条记录，看看有哪些列
  const { data: sampleData, error: sampleError } = await supabase
    .from('admission_scores')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('查询 admission_samples 失败:', sampleError);
  } else if (sampleData && sampleData.length > 0) {
    console.log('\nadmission_scores 表字段:', Object.keys(sampleData[0]));
  }

  // 查询 admission_scores 表（先获取总数）
  const { count: totalCount, error: countError } = await supabase
    .from('admission_scores')
    .select('*', { count: 'exact', head: true });

  // 分页获取所有数据（每批 1000 条）
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('admission_scores')
      .select('*')
      .order('province, year')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error(`查询 admission_scores 第 ${page} 页失败:`, error);
      break;
    }

    allData.push(...data);
    hasMore = data.length === pageSize;
    page++;
  }

  console.log(`\nadmission_scores 总数: ${totalCount}`);
  console.log(`实际获取: ${allData.length} 条`);

  if (allData.length > 0) {
    // 按省份统计
    const provinceStats = {};
    allData.forEach(r => {
      if (!provinceStats[r.province]) {
        provinceStats[r.province] = { records: 0, years: new Set(), tracks: new Set() };
      }
      provinceStats[r.province].records++;
      provinceStats[r.province].years.add(r.year);
      // 使用字段名中的 track 相关字段
      if (r.subject_track) provinceStats[r.province].tracks.add(r.subject_track);
      if (r.subject_type) provinceStats[r.province].tracks.add(r.subject_type);
      if (r.batch) provinceStats[r.province].tracks.add(r.batch);
    });

    console.log('\n各省份覆盖情况:');
    Object.entries(provinceStats).sort(([a], [b]) => a.localeCompare(b)).forEach(([province, stats]) => {
      console.log(`  ${province}: ${stats.records} 条记录, 年份: [${[...stats.years].join(', ')}], 类型: [${[...stats.tracks].join(', ')}]`);
    });
  }

  // 查询 universities 表
  const { data: uniData, error: uniError } = await supabase
    .from('universities')
    .select('province')
    .order('province');

  if (uniError) {
    console.error('查询 universities 失败:', uniError);
  } else {
    console.log(`\nuniversities 总数: ${uniData.length}`);
    const provinces = [...new Set(uniData.map(u => u.province))];
    console.log(`覆盖省份: ${provinces.length} 个 [${provinces.join(', ')}]`);
  }

  // 查询 majors 表
  const { data: majorData, error: majorError } = await supabase
    .from('majors')
    .select('id');

  if (majorError) {
    console.error('查询 majors 失败:', majorError);
  } else {
    console.log(`\nmajors 总数: ${majorData.length}`);
  }

  // 查询最近的数据变化（通过 created_at）
  const { data: recentData, error: recentError } = await supabase
    .from('admission_scores')
    .select('province, year, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('查询最近数据失败:', recentError);
  } else {
    console.log('\n最近新增的记录 (最近 10 条):');
    recentData.forEach((r, i) => {
      const time = new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      console.log(`  ${i+1}. ${r.province} | ${r.year} | ${time}`);
    });
  }
}

checkAdmissionData().then(() => process.exit(0)).catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
