import { useState, useEffect } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getUniversityStats, getScoreStats, getMajorStats } from '../../services/analyticsService';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import './Analytics.css';

echarts.use([PieChart, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const CHART_COLORS = ['#6366F1', '#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#14B8A6'];

export default function Analytics() {
    const [uniStats, setUniStats] = useState(null);
    const [scoreStats, setScoreStats] = useState(null);
    const [majorStats, setMajorStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchAll() {
            setLoading(true);
            try {
                const [uni, score, major] = await Promise.all([
                    getUniversityStats(),
                    getScoreStats('湖北'),
                    getMajorStats(),
                ]);
                setUniStats(uni);
                setScoreStats(score);
                setMajorStats(major);
                setError('');
            } catch (err) {
                console.error('Analytics error:', err);
                setError(err.message || '加载数据分析失败');
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    if (loading) return <Loading text="加载数据分析..." />;
    if (error) {
        return (
            <div className="analytics-page container animate-fade-in-up">
                <div className="analytics-header">
                    <h1 className="analytics-header__title">📊 数据分析</h1>
                    <p className="analytics-header__desc">多维度可视化院校、分数线、专业数据</p>
                </div>
                {error.includes('配置缺失') ? (
                    <ConfigErrorNotice
                        serviceName="数据分析服务"
                        detail="当前环境缺少 Supabase 配置，数据分析请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                    />
                ) : (
                    <div
                        className="uni-empty animate-fade-in"
                        style={{
                            padding: '2rem',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            background: 'rgba(127, 29, 29, 0.18)',
                        }}
                    >
                        <span className="uni-empty__icon">⚠️</span>
                        <h3>数据分析暂时不可用</h3>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        );
    }

    // --- Chart Options ---

    const uniTypePieOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        legend: { bottom: 0, textStyle: { color: '#94A3B8', fontSize: 11 } },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6, borderColor: '#0F172A', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#F8FAFC' } },
            data: Object.entries(uniStats?.byType || {}).map(([name, value], i) => ({
                name, value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
            })),
        }],
    };

    const uniLevelPieOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        legend: { bottom: 0, textStyle: { color: '#94A3B8', fontSize: 11 } },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            roseType: 'area',
            itemStyle: { borderRadius: 6, borderColor: '#0F172A', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#F8FAFC' } },
            data: [
                { name: '985', value: uniStats?.byLevel['985'] || 0, itemStyle: { color: '#EF4444' } },
                { name: '211', value: uniStats?.byLevel['211'] || 0, itemStyle: { color: '#F59E0B' } },
                { name: '双一流', value: uniStats?.byLevel['双一流'] || 0, itemStyle: { color: '#6366F1' } },
                { name: '普通本科', value: uniStats?.byLevel['普通本科'] || 0, itemStyle: { color: '#64748B' } },
            ],
        }],
    };

    const scoreDistBarOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        grid: { top: 20, right: 20, bottom: 30, left: 50 },
        xAxis: {
            type: 'category',
            data: Object.keys(scoreStats?.distribution || {}),
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94A3B8', fontSize: 11 },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#1E293B' } },
            axisLabel: { color: '#94A3B8' },
        },
        series: [{
            type: 'bar',
            data: Object.values(scoreStats?.distribution || {}),
            barWidth: '50%',
            itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#6366F1' },
                    { offset: 1, color: '#8B5CF6' },
                ]),
            },
        }],
    };

    const yearTrendLineOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        grid: { top: 20, right: 20, bottom: 30, left: 50 },
        xAxis: {
            type: 'category',
            data: (scoreStats?.yearTrend || []).map((t) => t.year),
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94A3B8' },
        },
        yAxis: {
            type: 'value',
            min: (v) => Math.max(0, v.min - 10),
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#1E293B' } },
            axisLabel: { color: '#94A3B8' },
        },
        series: [{
            type: 'line',
            data: (scoreStats?.yearTrend || []).map((t) => t.avgMinScore),
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { width: 3, color: '#06B6D4' },
            itemStyle: { color: '#06B6D4' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
                    { offset: 1, color: 'rgba(6, 182, 212, 0.02)' },
                ]),
            },
        }],
    };

    const majorCategoryBarOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        grid: { top: 10, right: 20, bottom: 50, left: 80 },
        xAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#1E293B' } },
            axisLabel: { color: '#94A3B8' },
        },
        yAxis: {
            type: 'category',
            data: Object.keys(majorStats?.byCategory || {}).reverse(),
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94A3B8', fontSize: 11 },
        },
        series: [{
            type: 'bar',
            data: Object.values(majorStats?.byCategory || {}).reverse(),
            barWidth: '60%',
            itemStyle: {
                borderRadius: [0, 4, 4, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#8B5CF6' },
                    { offset: 1, color: '#06B6D4' },
                ]),
            },
        }],
    };

    const uniProvinceBarOption = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.95)', borderColor: '#334155', textStyle: { color: '#F8FAFC' } },
        grid: { top: 10, right: 20, bottom: 50, left: 60 },
        xAxis: {
            type: 'category',
            data: Object.keys(uniStats?.byProvince || {}),
            axisLine: { lineStyle: { color: '#334155' } },
            axisLabel: { color: '#94A3B8', fontSize: 10, rotate: 45 },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: { lineStyle: { color: '#1E293B' } },
            axisLabel: { color: '#94A3B8' },
        },
        series: [{
            type: 'bar',
            data: Object.values(uniStats?.byProvince || {}),
            barWidth: '60%',
            itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#10B981' },
                    { offset: 1, color: '#059669' },
                ]),
            },
        }],
    };

    return (
        <div className="analytics-page container animate-fade-in-up">
            <div className="analytics-header">
                <h1 className="analytics-header__title">📊 数据分析</h1>
                <p className="analytics-header__desc">多维度可视化院校、分数线、专业数据</p>
            </div>

            {/* KPI Cards */}
            <div className="analytics-kpi-row">
                <div className="analytics-kpi">
                    <span className="analytics-kpi__icon">🏫</span>
                    <span className="analytics-kpi__num">{uniStats?.total || 0}</span>
                    <span className="analytics-kpi__label">院校总数</span>
                </div>
                <div className="analytics-kpi">
                    <span className="analytics-kpi__icon">🏆</span>
                    <span className="analytics-kpi__num">{uniStats?.by985 || 0}</span>
                    <span className="analytics-kpi__label">985 院校</span>
                </div>
                <div className="analytics-kpi">
                    <span className="analytics-kpi__icon">📚</span>
                    <span className="analytics-kpi__num">{majorStats?.total || 0}</span>
                    <span className="analytics-kpi__label">专业总数</span>
                </div>
                <div className="analytics-kpi">
                    <span className="analytics-kpi__icon">📋</span>
                    <span className="analytics-kpi__num">{scoreStats?.totalRecords || 0}</span>
                    <span className="analytics-kpi__label">分数线记录</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="analytics-grid">
                <Card variant="glass">
                    <CardHeader><h3>🏫 院校类型分布</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={uniTypePieOption} style={{ height: 300 }} notMerge />
                    </CardBody>
                </Card>

                <Card variant="glass">
                    <CardHeader><h3>🏆 院校层次分布</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={uniLevelPieOption} style={{ height: 300 }} notMerge />
                    </CardBody>
                </Card>

                <Card variant="glass">
                    <CardHeader><h3>📊 {scoreStats?.latestYear}年分数线分布</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={scoreDistBarOption} style={{ height: 300 }} notMerge />
                    </CardBody>
                </Card>

                <Card variant="glass">
                    <CardHeader><h3>📈 历年平均录取分趋势</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={yearTrendLineOption} style={{ height: 300 }} notMerge />
                    </CardBody>
                </Card>

                <Card variant="glass" className="analytics-wide">
                    <CardHeader><h3>📍 院校省份分布</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={uniProvinceBarOption} style={{ height: 300 }} notMerge />
                    </CardBody>
                </Card>

                <Card variant="glass" className="analytics-wide">
                    <CardHeader><h3>📚 专业学科分布</h3></CardHeader>
                    <CardBody>
                        <ReactEChartsCore echarts={echarts} option={majorCategoryBarOption} style={{ height: 280 }} notMerge />
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
