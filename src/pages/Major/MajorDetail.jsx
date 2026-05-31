import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMajorById } from '../../services/majorService';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import './Major.css';

export default function MajorDetail() {
    const { id } = useParams();
    const [major, setMajor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const data = await getMajorById(Number(id));
                setMajor(data);
                setError('');
            } catch (err) {
                console.error('Failed to fetch major:', err);
                setMajor(null);
                setError(err.message || '加载专业信息失败');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) return <Loading text="加载专业信息..." />;
    if (error) {
        return (
            <div className="uni-empty" style={{ padding: '4rem' }}>
                {error.includes('配置缺失') ? (
                    <ConfigErrorNotice
                        serviceName="专业数据服务"
                        detail="当前环境缺少 Supabase 配置，专业详情请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                    />
                ) : (
                    <>
                        <span className="uni-empty__icon">⚠️</span>
                        <h3>专业信息暂时不可用</h3>
                        <p>{error}</p>
                        <Link to="/majors"><Button variant="outline">返回专业列表</Button></Link>
                    </>
                )}
            </div>
        );
    }
    if (!major) {
        return (
            <div className="uni-empty" style={{ padding: '4rem' }}>
                <span className="uni-empty__icon">😕</span>
                <h3>未找到该专业</h3>
                <Link to="/majors"><Button variant="outline">返回专业列表</Button></Link>
            </div>
        );
    }

    const CATEGORY_ICONS = {
        '工学': '⚙️', '理学': '🔬', '经济学': '💰', '法学': '⚖️',
        '文学': '📝', '医学': '🏥', '管理学': '📊', '教育学': '🎓',
        '艺术学': '🎨', '农学': '🌾', '哲学': '💭', '历史学': '📜',
    };

    return (
        <div className="major-detail container animate-fade-in-up">
            {/* Breadcrumb */}
            <nav className="uni-detail__breadcrumb">
                <Link to="/majors">专业查询</Link>
                <span>/</span>
                <span>{major.name}</span>
            </nav>

            {/* Hero */}
            <div className="major-detail__hero">
                <div className="major-detail__hero-left">
                    <div className="major-detail__icon">
                        {CATEGORY_ICONS[major.category] || '📖'}
                    </div>
                    <div>
                        <h1 className="major-detail__name">{major.name}</h1>
                        <p className="major-detail__code">专业代码: {major.code}</p>
                        <div className="major-detail__tags">
                            <Tag variant="primary" size="md">{major.category}</Tag>
                            {major.subcategory && <Tag variant="default" size="md">{major.subcategory}</Tag>}
                            <Tag variant="default" size="md">{major.degree} · {major.duration}年</Tag>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="major-detail__body">
                <Card variant="glass">
                    <CardHeader><h3>📋 专业简介</h3></CardHeader>
                    <CardBody>
                        <p className="major-detail__desc">
                            {major.description || '暂无该专业的简介信息。'}
                        </p>
                    </CardBody>
                </Card>

                <div className="major-detail__info-grid">
                    <Card variant="glass">
                        <CardBody>
                            <div className="uni-info-item">
                                <span className="uni-info-item__icon">📖</span>
                                <div><span className="uni-info-item__label">学科门类</span><span>{major.category}</span></div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody>
                            <div className="uni-info-item">
                                <span className="uni-info-item__icon">🎓</span>
                                <div><span className="uni-info-item__label">授予学位</span><span>{major.degree}</span></div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody>
                            <div className="uni-info-item">
                                <span className="uni-info-item__icon">⏱️</span>
                                <div><span className="uni-info-item__label">学制</span><span>{major.duration} 年</span></div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody>
                            <div className="uni-info-item">
                                <span className="uni-info-item__icon">🔢</span>
                                <div><span className="uni-info-item__label">专业代码</span><span>{major.code}</span></div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* University Link */}
                {major.universities && (
                    <Card variant="glass">
                        <CardHeader><h3>🏫 所属院校</h3></CardHeader>
                        <CardBody>
                            <Link to={`/universities/${major.universities.id}`} className="major-detail__uni-link">
                                <div className="major-detail__uni-card">
                                    <div className="uni-card__avatar">
                                        {major.universities.name[0]}
                                    </div>
                                    <div>
                                        <h4>{major.universities.name}</h4>
                                        <span className="uni-card__location">
                                            📍 {major.universities.province} · {major.universities.city || major.universities.province}
                                        </span>
                                    </div>
                                    <span className="major-detail__arrow">→</span>
                                </div>
                            </Link>
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    );
}
