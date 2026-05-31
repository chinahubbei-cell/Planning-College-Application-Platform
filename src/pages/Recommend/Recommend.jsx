import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getRecommendations } from '../../services/recommendService';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { PROVINCES, SUBJECT_TYPES } from '../../utils/constants';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { getPlans, addPlanItem } from '../../services/planService';
import './Recommend.css';

const RISK_CONFIG = {
    reach: { label: '冲一冲', icon: '🚀', color: '#EF4444', desc: '录取概率较低，但有机会冲击' },
    match: { label: '稳一稳', icon: '🎯', color: '#F59E0B', desc: '录取概率适中，比较稳妥' },
    safe: { label: '保一保', icon: '🛡️', color: '#10B981', desc: '录取概率很高，安全保底' },
};

export default function Recommend() {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        score: '',
        province: '湖北',
        subjectType: 'physics',
        year: 2025,
    });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    // Plan modal states
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [addingToPlan, setAddingToPlan] = useState(false);

    useEffect(() => {
        const nextScore = searchParams.get('score');
        const nextProvince = searchParams.get('province');
        const nextSubjectType = searchParams.get('subjectType');
        const nextYear = searchParams.get('year');

        if (!nextScore && !nextProvince && !nextSubjectType && !nextYear) {
            return;
        }

        queueMicrotask(() => {
            setFormData((prev) => ({
                ...prev,
                score: nextScore ?? prev.score,
                province: nextProvince ?? prev.province,
                subjectType: nextSubjectType ?? prev.subjectType,
                year: nextYear ? Number(nextYear) || prev.year : prev.year,
            }));
        });
    }, [searchParams]);

    const handleOpenPlanModal = async (e, item, riskKey) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            addToast({ type: 'warning', message: '请先登录后再添加到方案' });
            return;
        }
        setSelectedItem({ universityId: item.university.id, riskLevel: riskKey });
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
        if (!selectedItem) return;
        setAddingToPlan(true);
        try {
            await addPlanItem(planId, {
                universityId: selectedItem.universityId,
                riskLevel: selectedItem.riskLevel
            });
            addToast({ type: 'success', message: '已成功添加到方案' });
            setShowPlanModal(false);
            setSelectedItem(null);
        } catch (err) {
            addToast({ type: 'error', message: err.message || '添加到方案失败' });
        } finally {
            setAddingToPlan(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.score || formData.score < 100 || formData.score > 750) {
            setError('请输入有效的高考分数（100-750）');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const data = await getRecommendations({
                score: Number(formData.score),
                province: formData.province,
                subjectType: formData.subjectType,
                year: formData.year,
            });
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalCount = results
        ? results.reach.length + results.match.length + results.safe.length
        : 0;

    return (
        <div className="recommend-page container">
            {/* Header */}
            <div className="recommend-header animate-fade-in-up">
                <h1 className="recommend-header__title">
                    <span className="recommend-header__icon">🎯</span>
                    智能志愿推荐
                </h1>
                <p className="recommend-header__desc">
                    输入您的高考成绩，AI 根据历年录取数据智能匹配院校，按「冲/稳/保」三梯度精准推荐
                </p>
            </div>

            {/* Input Form */}
            <Card variant="glass" className="recommend-form-card animate-fade-in-up">
                <CardBody>
                    <form className="recommend-form" onSubmit={handleSubmit}>
                        <div className="recommend-form__row">
                            <div className="recommend-form__field">
                                <label className="recommend-form__label">高考分数</label>
                                <input
                                    type="number"
                                    className="recommend-form__input recommend-form__input--score"
                                    placeholder="请输入分数"
                                    value={formData.score}
                                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                                    min={100}
                                    max={750}
                                    required
                                />
                            </div>

                            <div className="recommend-form__field">
                                <label className="recommend-form__label">所在省份</label>
                                <select
                                    className="recommend-form__select"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                >
                                    {PROVINCES.map((p) => (
                                        <option key={p.code} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="recommend-form__field">
                                <label className="recommend-form__label">选科类型</label>
                                <select
                                    className="recommend-form__select"
                                    value={formData.subjectType}
                                    onChange={(e) => setFormData({ ...formData, subjectType: e.target.value })}
                                >
                                    {SUBJECT_TYPES.NEW_GAOKAO.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                    {SUBJECT_TYPES.TRADITIONAL.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="recommend-form__field">
                                <label className="recommend-form__label">参考年份</label>
                                <select
                                    className="recommend-form__select"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                                >
                                    {[2025, 2024, 2023, 2022, 2021].map((y) => (
                                        <option key={y} value={y}>{y}年</option>
                                    ))}
                                </select>
                            </div>

                            <div className="recommend-form__field recommend-form__field--action">
                                <Button type="submit" size="lg" loading={loading} icon="🔍">
                                    开始推荐
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="recommend-form__error animate-fade-in">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                    </form>
                </CardBody>
            </Card>

            {/* Results */}
            {loading && <Loading text="AI 正在分析匹配中..." />}

            {!loading && hasSearched && results && (
                <div className="recommend-results animate-fade-in-up">
                    {/* Summary */}
                    <div className="recommend-summary">
                        <div className="recommend-summary__score">
                            <span className="recommend-summary__score-label">您的分数</span>
                            <span className="recommend-summary__score-num">{formData.score}</span>
                        </div>
                        <div className="recommend-summary__stats">
                            {['reach', 'match', 'safe'].map((key) => (
                                <div key={key} className="recommend-summary__stat" style={{ borderColor: RISK_CONFIG[key].color }}>
                                    <span className="recommend-summary__stat-icon">{RISK_CONFIG[key].icon}</span>
                                    <span className="recommend-summary__stat-num">{results[key].length}</span>
                                    <span className="recommend-summary__stat-label">{RISK_CONFIG[key].label}</span>
                                </div>
                            ))}
                            <div className="recommend-summary__stat recommend-summary__stat--total">
                                <span className="recommend-summary__stat-icon">📊</span>
                                <span className="recommend-summary__stat-num">{totalCount}</span>
                                <span className="recommend-summary__stat-label">推荐总数</span>
                            </div>
                        </div>
                    </div>

                    {/* Groups */}
                    {totalCount === 0 ? (
                        <div className="uni-empty">
                            <span className="uni-empty__icon">🔍</span>
                            <h3>未找到匹配的院校</h3>
                            <p>当前分数在该省份暂无匹配数据，请尝试调整条件</p>
                        </div>
                    ) : (
                        ['reach', 'match', 'safe'].map((riskKey) => {
                            const items = results[riskKey];
                            if (items.length === 0) return null;
                            const config = RISK_CONFIG[riskKey];

                            return (
                                <div key={riskKey} className="recommend-group">
                                    <div className="recommend-group__header" style={{ '--risk-color': config.color }}>
                                        <div className="recommend-group__title">
                                            <span className="recommend-group__icon">{config.icon}</span>
                                            <h2>{config.label}</h2>
                                            <Tag
                                                variant={riskKey === 'reach' ? 'danger' : riskKey === 'match' ? 'warning' : 'success'}
                                            >
                                                {items.length} 所
                                            </Tag>
                                        </div>
                                        <p className="recommend-group__desc">{config.desc}</p>
                                    </div>

                                    <div className="recommend-group__grid">
                                        {items.map((item) => (
                                            <Link
                                                to={`/universities/${item.university.id}`}
                                                key={item.id}
                                                className="uni-card-link"
                                            >
                                                <Card variant="glass" hoverable className="recommend-card">
                                                    <CardBody>
                                                        <div className="recommend-card__content">
                                                            <div className="recommend-card__top">
                                                                <div className="recommend-card__uni-info">
                                                                    <div className="uni-card__avatar" style={{ width: 42, height: 42, fontSize: '1.1rem' }}>
                                                                        {item.university.name[0]}
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="recommend-card__name">{item.university.name}</h3>
                                                                        <span className="uni-card__location">
                                                                            📍 {item.university.province} · {item.university.city || item.university.province}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="recommend-card__probability" style={{ '--prob-color': config.color }}>
                                                                    <span className="recommend-card__prob-num">{item.probability}%</span>
                                                                    <span className="recommend-card__prob-label">录取概率</span>
                                                                </div>
                                                            </div>

                                                            <div className="recommend-card__tags">
                                                                {item.university.is_985 && <Tag variant="danger">985</Tag>}
                                                                {item.university.is_211 && <Tag variant="warning">211</Tag>}
                                                                {item.university.is_double_first_class && <Tag variant="primary">双一流</Tag>}
                                                                <Tag variant="default">{item.university.type}</Tag>
                                                            </div>

                                                            <div className="recommend-card__scores">
                                                                <div className="recommend-card__score-item">
                                                                    <span className="recommend-card__score-label">最低分</span>
                                                                    <span className="recommend-card__score-value">{item.min_score}</span>
                                                                </div>
                                                                <div className="recommend-card__score-item">
                                                                    <span className="recommend-card__score-label">平均分</span>
                                                                    <span className="recommend-card__score-value">{item.avg_score || '—'}</span>
                                                                </div>
                                                                <div className="recommend-card__score-item">
                                                                    <span className="recommend-card__score-label">分差</span>
                                                                    <span className={`recommend-card__score-value ${item.scoreDiff >= 0 ? 'recommend-card__score-value--positive' : 'recommend-card__score-value--negative'}`}>
                                                                        {item.scoreDiff >= 0 ? '+' : ''}{item.scoreDiff}
                                                                    </span>
                                                                </div>
                                                                {item.min_rank && (
                                                                    <div className="recommend-card__score-item">
                                                                        <span className="recommend-card__score-label">位次</span>
                                                                        <span className="recommend-card__score-value">{item.min_rank.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="recommend-card__actions">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="recommend-card__add-btn"
                                                                    onClick={(e) => handleOpenPlanModal(e, item, riskKey)}
                                                                >
                                                                    ➕ 加入方案
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Empty state before search */}
            {!hasSearched && (
                <div className="recommend-empty animate-fade-in">
                    <div className="recommend-empty__visual">
                        <span className="recommend-empty__icon">🎓</span>
                    </div>
                    <h3>输入分数，开启智能推荐</h3>
                    <p>基于历年录取数据，AI 为您精准匹配适合的院校</p>
                    <div className="recommend-empty__steps">
                        <div className="recommend-empty__step">
                            <span>1️⃣</span>
                            <span>输入高考分数</span>
                        </div>
                        <div className="recommend-empty__step">
                            <span>2️⃣</span>
                            <span>选择省份和科类</span>
                        </div>
                        <div className="recommend-empty__step">
                            <span>3️⃣</span>
                            <span>获取冲/稳/保推荐</span>
                        </div>
                    </div>
                </div>
            )}

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
