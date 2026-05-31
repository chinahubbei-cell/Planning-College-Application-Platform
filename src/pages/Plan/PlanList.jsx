import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPlans, createPlan, deletePlan } from '../../services/planService';
import useAuthStore from '../../stores/useAuthStore';
import Card, { CardBody } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { PROVINCES } from '../../utils/constants';
import './Plan.css';

export default function PlanList() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        score: '',
        province: '湖北',
        subjectType: 'physics',
        year: 2025,
    });
    const [creating, setCreating] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState(null);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPlans();
            setPlans(data || []);
        } catch (err) {
            console.error('Failed to fetch plans:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            if (user) fetchPlans();
            else setLoading(false);
        });
    }, [fetchPlans, user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const plan = await createPlan({
                name: createForm.name || '我的方案',
                score: Number(createForm.score) || null,
                province: createForm.province,
                subjectType: createForm.subjectType,
                year: createForm.year,
            });
            setShowCreate(false);
            setCreateForm({ name: '', score: '', province: '湖北', subjectType: 'physics', year: 2025 });
            navigate(`/plans/${plan.id}`);
        } catch (err) {
            console.error('Failed to create plan:', err);
        } finally {
            setCreating(false);
        }
    };

    const openDeleteConfirm = (planId) => {
        setDeletingPlanId(planId);
    };

    const closeDeleteConfirm = () => {
        setDeletingPlanId(null);
    };

    const handleDelete = async () => {
        if (!deletingPlanId) return;
        try {
            await deletePlan(deletingPlanId);
            setPlans((prev) => prev.filter((p) => p.id !== deletingPlanId));
        } catch (err) {
            console.error('Failed to delete plan:', err);
        } finally {
            closeDeleteConfirm();
        }
    };

    if (!user) {
        return (
            <div className="plan-page container">
                <div className="uni-empty animate-fade-in" style={{ padding: '6rem 0' }}>
                    <span className="uni-empty__icon">🔐</span>
                    <h3>请先登录</h3>
                    <p>登录后即可创建和管理志愿方案</p>
                    <Link to="/login"><Button>去登录</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="plan-page container">
            <div className="plan-page__header animate-fade-in-up">
                <div>
                    <h1 className="plan-page__title">📋 志愿方案管理</h1>
                    <p className="plan-page__subtitle">创建、编辑和对比您的志愿填报方案</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)} icon="➕">
                    新建方案
                </Button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <Card variant="glass" className="plan-create-card animate-fade-in-down">
                    <CardBody>
                        <h3 className="plan-create-card__title">✨ 创建新方案</h3>
                        <form className="plan-create-form" onSubmit={handleCreate}>
                            <div className="plan-create-form__row">
                                <div className="plan-create-form__field">
                                    <label>方案名称</label>
                                    <input
                                        type="text"
                                        className="recommend-form__input"
                                        placeholder="例如：第一志愿方案"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="plan-create-form__field">
                                    <label>高考分数</label>
                                    <input
                                        type="number"
                                        className="recommend-form__input"
                                        placeholder="分数"
                                        value={createForm.score}
                                        onChange={(e) => setCreateForm({ ...createForm, score: e.target.value })}
                                    />
                                </div>
                                <div className="plan-create-form__field">
                                    <label>省份</label>
                                    <select
                                        className="recommend-form__select"
                                        value={createForm.province}
                                        onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                                    >
                                        {PROVINCES.map((p) => (
                                            <option key={p.code} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="plan-create-form__actions">
                                <Button type="submit" loading={creating}>创建方案</Button>
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            {/* Plan List */}
            {loading ? (
                <Loading text="加载方案列表..." />
            ) : plans.length === 0 ? (
                <div className="plan-empty animate-fade-in">
                    <div className="plan-empty__visual">
                        <span>📝</span>
                    </div>
                    <h3>还没有志愿方案</h3>
                    <p>创建您的第一个志愿方案，开始规划未来</p>
                    <Button onClick={() => setShowCreate(true)} icon="➕">创建第一个方案</Button>
                </div>
            ) : (
                <div className="plan-grid animate-fade-in-up">
                    {plans.map((plan) => (
                        <Card key={plan.id} variant="glass" hoverable className="plan-card">
                            <CardBody>
                                <div className="plan-card__content">
                                    <div className="plan-card__header">
                                        <h3 className="plan-card__name">{plan.name}</h3>
                                        <Tag
                                            variant={plan.status === 'submitted' ? 'success' : plan.status === 'archived' ? 'default' : 'primary'}
                                        >
                                            {plan.status === 'submitted' ? '已提交' : plan.status === 'archived' ? '已归档' : '草稿'}
                                        </Tag>
                                    </div>

                                    <div className="plan-card__meta">
                                        {plan.score && (
                                            <span className="plan-card__meta-item">
                                                <span>📊</span>
                                                <span>{plan.score} 分</span>
                                            </span>
                                        )}
                                        {plan.province && (
                                            <span className="plan-card__meta-item">
                                                <span>📍</span>
                                                <span>{plan.province}</span>
                                            </span>
                                        )}
                                        <span className="plan-card__meta-item">
                                            <span>🏫</span>
                                            <span>{plan.plan_items?.[0]?.count || 0} 个志愿</span>
                                        </span>
                                    </div>

                                    <div className="plan-card__time">
                                        更新于 {new Date(plan.updated_at).toLocaleDateString('zh-CN')}
                                    </div>

                                    <div className="plan-card__actions">
                                        <Link to={`/plans/${plan.id}`}>
                                            <Button variant="secondary" size="sm">查看详情</Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDeleteConfirm(plan.id)}
                                        >
                                            🗑️ 删除
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {deletingPlanId && (
                <div className="plan-delete-modal" role="dialog" aria-modal="true" aria-labelledby="plan-delete-title">
                    <div className="plan-delete-modal__backdrop" onClick={closeDeleteConfirm} />
                    <Card variant="glass" className="plan-delete-modal__card">
                        <CardBody>
                            <h3 id="plan-delete-title" className="plan-delete-modal__title">确认删除该方案？</h3>
                            <p className="plan-delete-modal__desc">删除后无法恢复，且方案内志愿条目也会一并移除。</p>
                            <div className="plan-delete-modal__actions">
                                <Button variant="ghost" onClick={closeDeleteConfirm}>取消</Button>
                                <Button variant="danger" onClick={handleDelete}>确认删除</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
