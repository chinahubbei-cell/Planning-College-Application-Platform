import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getUniversityById, getMajorsByUniversity, getAdmissionScores } from '../../services/universityService';
import { getPlans, addPlanItem } from '../../services/planService';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import './University.css';
import '../Recommend/Recommend.css'; // Reuse modal styles

// Register echarts modules
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

export default function UniversityDetail() {
    const { id } = useParams();
    const [university, setUniversity] = useState(null);
    const [majors, setMajors] = useState([]);
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('info');

    // Plan modal states
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [addingToPlan, setAddingToPlan] = useState(false);

    const handleOpenPlanModal = async () => {
        if (!user) {
            addToast({ type: 'warning', message: '请先登录后再添加到方案' });
            return;
        }
        setShowPlanModal(true);
        if (plans.length === 0) {
            setLoadingPlans(true);
            try {
                const data = await getPlans();
                setPlans(data || []);
            } catch (err) {
                console.error('Failed to fetch plans', err);
            } finally {
                setLoadingPlans(false);
            }
        }
    };

    const handleAddToPlan = async (planId) => {
        if (!university) return;
        setAddingToPlan(true);
        try {
            await addPlanItem(planId, {
                universityId: university.id,
                riskLevel: 'unknown'
            });
            addToast({ type: 'success', message: '已成功添加到方案' });
            setShowPlanModal(false);
        } catch (err) {
            addToast({ type: 'error', message: err.message || '添加到方案失败' });
        } finally {
            setAddingToPlan(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [uni, majorsData, scoresData] = await Promise.all([
                    getUniversityById(Number(id)),
                    getMajorsByUniversity(Number(id)),
                    getAdmissionScores(Number(id)),
                ]);
                setUniversity(uni);
                setMajors(majorsData || []);
                setScores(scoresData || []);
                setError('');
            } catch (err) {
                console.error('Failed to fetch university:', err);
                setError(err.message || '加载院校信息失败');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) return <Loading text="加载院校信息..." />;
    if (error) {
        return (
            <div className="uni-empty" style={{ padding: '4rem' }}>
                {error.includes('配置缺失') ? (
                    <ConfigErrorNotice
                        serviceName="院校数据服务"
                        detail="当前环境缺少 Supabase 配置，院校详情请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                    />
                ) : (
                    <>
                        <span className="uni-empty__icon">⚠️</span>
                        <h3>院校信息暂时不可用</h3>
                        <p>{error}</p>
                        <Link to="/universities"><Button variant="outline">返回院校列表</Button></Link>
                    </>
                )}
            </div>
        );
    }
    if (!university) {
        return (
            <div className="uni-empty" style={{ padding: '4rem' }}>
                <span className="uni-empty__icon">😕</span>
                <h3>未找到该院校</h3>
                <Link to="/universities"><Button variant="outline">返回院校列表</Button></Link>
            </div>
        );
    }

    const getLevelTag = () => {
        if (university.is_985) return <Tag variant="danger" size="md">985</Tag>;
        if (university.is_211) return <Tag variant="warning" size="md">211</Tag>;
        if (university.is_double_first_class) return <Tag variant="primary" size="md">双一流</Tag>;
        return <Tag variant="default" size="md">普通本科</Tag>;
    };

    // Chart options
    const getScoreChartOption = () => {
        const years = [...new Set(scores.map((s) => s.year))].sort();
        const minScores = years.map((y) => {
            const s = scores.find((item) => item.year === y);
            return s?.min_score || null;
        });
        const avgScores = years.map((y) => {
            const s = scores.find((item) => item.year === y);
            return s?.avg_score || null;
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#F8FAFC', fontSize: 13 },
            },
            legend: {
                data: ['最低分', '平均分'],
                textStyle: { color: '#94A3B8' },
                top: 0,
            },
            grid: { top: 40, right: 20, bottom: 30, left: 50 },
            xAxis: {
                type: 'category',
                data: years,
                axisLine: { lineStyle: { color: '#334155' } },
                axisLabel: { color: '#94A3B8' },
            },
            yAxis: {
                type: 'value',
                min: (value) => Math.max(0, value.min - 20),
                axisLine: { show: false },
                splitLine: { lineStyle: { color: '#1E293B' } },
                axisLabel: { color: '#94A3B8' },
            },
            series: [
                {
                    name: '最低分',
                    type: 'line',
                    data: minScores,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: { width: 3, color: '#6366F1' },
                    itemStyle: { color: '#6366F1' },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(99, 102, 241, 0.25)' },
                            { offset: 1, color: 'rgba(99, 102, 241, 0.02)' },
                        ]),
                    },
                },
                {
                    name: '平均分',
                    type: 'line',
                    data: avgScores,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: { width: 3, color: '#06B6D4' },
                    itemStyle: { color: '#06B6D4' },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(6, 182, 212, 0.2)' },
                            { offset: 1, color: 'rgba(6, 182, 212, 0.02)' },
                        ]),
                    },
                },
            ],
        };
    };

    const getRankChartOption = () => {
        const years = [...new Set(scores.map((s) => s.year))].sort();
        const minRanks = years.map((y) => {
            const s = scores.find((item) => item.year === y);
            return s?.min_rank || null;
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: '#334155',
                textStyle: { color: '#F8FAFC', fontSize: 13 },
                formatter: (params) => {
                    const p = params[0];
                    return `${p.name}年<br/>最低位次: <strong>${p.value?.toLocaleString()}</strong>`;
                },
            },
            grid: { top: 20, right: 20, bottom: 30, left: 60 },
            xAxis: {
                type: 'category',
                data: years,
                axisLine: { lineStyle: { color: '#334155' } },
                axisLabel: { color: '#94A3B8' },
            },
            yAxis: {
                type: 'value',
                inverse: true,
                axisLine: { show: false },
                splitLine: { lineStyle: { color: '#1E293B' } },
                axisLabel: { color: '#94A3B8' },
            },
            series: [
                {
                    type: 'bar',
                    data: minRanks,
                    barWidth: '40%',
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#A78BFA' },
                            { offset: 1, color: '#6366F1' },
                        ]),
                    },
                },
            ],
        };
    };

    const TABS = [
        { key: 'info', label: '📋 基本信息', },
        { key: 'scores', label: '📊 历年分数线', },
        { key: 'majors', label: '📚 开设专业', },
    ];

    return (
        <div className="uni-detail container animate-fade-in-up">
            {/* Breadcrumb */}
            <nav className="uni-detail__breadcrumb">
                <Link to="/universities">院校查询</Link>
                <span>/</span>
                <span>{university.name}</span>
            </nav>

            {/* Hero */}
            <div className="uni-detail__hero">
                <div className="uni-detail__hero-left">
                    <div className="uni-detail__avatar">
                        {university.logo_url ? (
                            <img src={university.logo_url} alt={university.name} className="uni-detail__logo-img" />
                        ) : (
                            university.name[0]
                        )}
                    </div>
                    <div className="uni-detail__hero-info">
                        <h1 className="uni-detail__name">{university.name}</h1>
                        <p className="uni-detail__location">
                            📍 {university.province} · {university.city || university.province}
                            {university.website && (
                                <> · <a href={university.website} target="_blank" rel="noreferrer">官网 ↗</a></>
                            )}
                        </p>
                        <div className="uni-detail__tags">
                            {getLevelTag()}
                            <Tag variant="default" size="md">{university.type}</Tag>
                            <Tag variant="default" size="md">代码: {university.code}</Tag>
                            <Button
                                variant="outline"
                                size="sm"
                                className="uni-detail__add-plan-btn"
                                onClick={handleOpenPlanModal}
                                style={{ marginLeft: 'var(--space-2)' }}
                            >
                                ➕ 加入方案
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="uni-detail__hero-stats">
                    <div className="uni-detail__stat">
                        <span className="uni-detail__stat-num">{majors.length}</span>
                        <span className="uni-detail__stat-label">开设专业</span>
                    </div>
                    <div className="uni-detail__stat">
                        <span className="uni-detail__stat-num">{scores.length}</span>
                        <span className="uni-detail__stat-label">分数线记录</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="uni-detail__tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`uni-detail__tab ${activeTab === tab.key ? 'uni-detail__tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="uni-detail__content">
                {activeTab === 'info' && (
                    <div className="uni-detail__info animate-fade-in">
                        <Card variant="glass">
                            <CardHeader><h3>院校简介</h3></CardHeader>
                            <CardBody>
                                <p className="uni-detail__desc">
                                    {university.description || '暂无院校简介信息。'}
                                </p>
                            </CardBody>
                        </Card>

                        <div className="uni-detail__info-grid">
                            <Card variant="glass">
                                <CardBody>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">🏫</span>
                                        <div><span className="uni-info-item__label">院校名称</span><span>{university.name}</span></div>
                                    </div>
                                </CardBody>
                            </Card>
                            <Card variant="glass">
                                <CardBody>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📍</span>
                                        <div><span className="uni-info-item__label">所在地</span><span>{university.province} {university.city}</span></div>
                                    </div>
                                </CardBody>
                            </Card>
                            <Card variant="glass">
                                <CardBody>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">🏆</span>
                                        <div><span className="uni-info-item__label">院校层次</span><span>{university.level === '985' ? '985 工程' : university.level === '211' ? '211 工程' : university.is_double_first_class ? '双一流' : '普通本科'}</span></div>
                                    </div>
                                </CardBody>
                            </Card>
                            <Card variant="glass">
                                <CardBody>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📖</span>
                                        <div><span className="uni-info-item__label">院校类型</span><span>{university.type}</span></div>
                                    </div>
                                </CardBody>
                            </Card>
                            {university.founding_year && (
                                <Card variant="glass">
                                    <CardBody>
                                        <div className="uni-info-item">
                                            <span className="uni-info-item__icon">📅</span>
                                            <div><span className="uni-info-item__label">创办时间</span><span>{university.founding_year} 年</span></div>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                            {university.campus_area && (
                                <Card variant="glass">
                                    <CardBody>
                                        <div className="uni-info-item">
                                            <span className="uni-info-item__icon">🏟️</span>
                                            <div><span className="uni-info-item__label">校园面积</span><span>{university.campus_area.toLocaleString()} 亩</span></div>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                            {university.master_dept && (
                                <Card variant="glass">
                                    <CardBody>
                                        <div className="uni-info-item">
                                            <span className="uni-info-item__icon">🏛️</span>
                                            <div><span className="uni-info-item__label">主管部门</span><span>{university.master_dept}</span></div>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                            {university.website && (
                                <Card variant="glass">
                                    <CardBody>
                                        <div className="uni-info-item">
                                            <span className="uni-info-item__icon">🌐</span>
                                            <div>
                                                <span className="uni-info-item__label">官方网站</span>
                                                <a href={university.website} target="_blank" rel="noreferrer" className="uni-info-item__link">{university.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'scores' && (
                    <div className="uni-detail__scores animate-fade-in">
                        {scores.length === 0 ? (
                            <div className="uni-empty">
                                <span className="uni-empty__icon">📊</span>
                                <h3>暂无分数线数据</h3>
                                <p>该院校的历年录取分数线数据尚未收录</p>
                            </div>
                        ) : (
                            <div className="uni-detail__charts">
                                <Card variant="glass">
                                    <CardHeader><h3>📈 录取分数线趋势</h3></CardHeader>
                                    <CardBody>
                                        <ReactEChartsCore
                                            echarts={echarts}
                                            option={getScoreChartOption()}
                                            style={{ height: 320 }}
                                            notMerge
                                        />
                                    </CardBody>
                                </Card>

                                <Card variant="glass">
                                    <CardHeader><h3>📊 最低录取位次</h3></CardHeader>
                                    <CardBody>
                                        <ReactEChartsCore
                                            echarts={echarts}
                                            option={getRankChartOption()}
                                            style={{ height: 320 }}
                                            notMerge
                                        />
                                    </CardBody>
                                </Card>

                                {/* Score table */}
                                <Card variant="glass">
                                    <CardHeader><h3>📋 分数线详情</h3></CardHeader>
                                    <CardBody>
                                        <div className="uni-score-table-wrapper">
                                            <table className="uni-score-table">
                                                <thead>
                                                    <tr>
                                                        <th>年份</th>
                                                        <th>省份</th>
                                                        <th>科类</th>
                                                        <th>最低分</th>
                                                        <th>平均分</th>
                                                        <th>最低位次</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {scores.map((s) => (
                                                        <tr key={s.id}>
                                                            <td><strong>{s.year}</strong></td>
                                                            <td>{s.province}</td>
                                                            <td>{s.subject_type === 'physics' ? '物理类' : s.subject_type === 'history' ? '历史类' : s.subject_type === 'science' ? '理科' : '文科'}</td>
                                                            <td className="uni-score-cell uni-score-cell--primary">{s.min_score || '—'}</td>
                                                            <td>{s.avg_score || '—'}</td>
                                                            <td>{s.min_rank?.toLocaleString() || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'majors' && (
                    <div className="uni-detail__majors animate-fade-in">
                        {majors.length === 0 ? (
                            <div className="uni-empty">
                                <span className="uni-empty__icon">📚</span>
                                <h3>暂无专业数据</h3>
                                <p>该院校的专业信息尚未收录</p>
                            </div>
                        ) : (
                            <div className="uni-major-grid">
                                {majors.map((major) => (
                                    <Link to={`/majors/${major.id}`} key={major.id} className="uni-card-link">
                                        <Card variant="glass" hoverable>
                                            <CardBody>
                                                <div className="uni-major-card">
                                                    <h4 className="uni-major-card__name">{major.name}</h4>
                                                    <div className="uni-major-card__meta">
                                                        <Tag variant="primary">{major.category}</Tag>
                                                        <Tag variant="default">{major.degree} · {major.duration}年</Tag>
                                                    </div>
                                                    {major.description && (
                                                        <p className="uni-major-card__desc">{major.description}</p>
                                                    )}
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Plan Modal */}
            {showPlanModal && (
                <div className="recommend-plan-modal" role="dialog" aria-modal="true">
                    <div className="recommend-plan-modal__backdrop" onClick={() => setShowPlanModal(false)} />
                    <Card variant="glass" className="recommend-plan-modal__card animate-fade-in-up">
                        <CardHeader>
                            <div className="recommend-plan-modal__header-inner">
                                <h3>添加到志愿方案</h3>
                                <button className="recommend-plan-modal__close" onClick={() => setShowPlanModal(false)}>✕</button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {loadingPlans ? (
                                <Loading text="加载方案列表中..." />
                            ) : plans.length === 0 ? (
                                <div className="recommend-plan-empty">
                                    <p>您还没有创建任何方案。</p>
                                    <Link to="/plans" className="recommend-plan-modal__link">
                                        <Button size="sm">去创建方案</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="recommend-plan-list">
                                    {plans.map(plan => (
                                        <div key={plan.id} className="recommend-plan-item" onClick={() => handleAddToPlan(plan.id)}>
                                            <div className="recommend-plan-item__info">
                                                <h4>{plan.name}</h4>
                                                <p className="recommend-plan-item__meta">{plan.plan_items?.[0]?.count || 0} 个志愿</p>
                                            </div>
                                            <Button size="sm" variant="outline" loading={addingToPlan}>选择</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
