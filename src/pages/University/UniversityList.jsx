import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getUniversities } from '../../services/universityService';
import Card, { CardBody } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import { PROVINCES, UNIVERSITY_LEVELS, UNIVERSITY_TYPES } from '../../utils/constants';
import './University.css';

export default function UniversityList() {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [search, setSearch] = useState('');
    const [province, setProvince] = useState('');
    const [level, setLevel] = useState('');
    const [type, setType] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch universities
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getUniversities({
                search: debouncedSearch,
                province,
                level,
                type,
                page,
                pageSize: 12,
            });
            setUniversities(result.data || []);
            setTotalCount(result.count || 0);
            setTotalPages(result.totalPages || 1);
            setError('');
        } catch (err) {
            console.error('Failed to fetch universities:', err);
            setUniversities([]);
            setTotalCount(0);
            setTotalPages(1);
            setError(err.message || '加载院校数据失败');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, province, level, type, page]);

    useEffect(() => {
        queueMicrotask(fetchData);
    }, [fetchData]);

    // Reset page when filters change
    useEffect(() => {
        queueMicrotask(() => setPage(1));
    }, [debouncedSearch, province, level, type]);

    const clearFilters = () => {
        setSearch('');
        setProvince('');
        setLevel('');
        setType('');
        setPage(1);
    };

    const hasFilters = search || province || level || type;

    const getLevelTag = (uni) => {
        if (uni.is_985) return <Tag variant="danger">985</Tag>;
        if (uni.is_211) return <Tag variant="warning">211</Tag>;
        if (uni.is_double_first_class) return <Tag variant="primary">双一流</Tag>;
        return <Tag variant="default">普通本科</Tag>;
    };

    return (
        <div className="uni-page container">
            {/* Page Header */}
            <div className="uni-page__header animate-fade-in-up">
                <div>
                    <h1 className="uni-page__title">院校查询</h1>
                    <p className="uni-page__subtitle">
                        查询全国高校信息，了解院校特色、录取分数线
                    </p>
                </div>
                <div className="uni-page__count">
                    共 <span className="uni-page__count-num">{totalCount}</span> 所院校
                </div>
            </div>

            <div className="uni-page__body">
                {/* Filter Sidebar */}
                <aside className="uni-filters animate-fade-in">
                    {/* Search */}
                    <div className="uni-filter-section">
                        <div className="uni-filter-search">
                            <span className="uni-filter-search__icon">🔍</span>
                            <input
                                type="text"
                                className="uni-filter-search__input"
                                placeholder="搜索院校名称..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    className="uni-filter-search__clear"
                                    onClick={() => setSearch('')}
                                >✕</button>
                            )}
                        </div>
                    </div>

                    {/* Level Filter */}
                    <div className="uni-filter-section">
                        <h3 className="uni-filter-title">院校层次</h3>
                        <div className="uni-filter-options">
                            <button
                                className={`uni-filter-chip ${!level ? 'uni-filter-chip--active' : ''}`}
                                onClick={() => setLevel('')}
                            >全部</button>
                            {UNIVERSITY_LEVELS.map((l) => (
                                <button
                                    key={l.value}
                                    className={`uni-filter-chip ${level === l.value ? 'uni-filter-chip--active' : ''}`}
                                    onClick={() => setLevel(level === l.value ? '' : l.value)}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div className="uni-filter-section">
                        <h3 className="uni-filter-title">院校类型</h3>
                        <div className="uni-filter-options">
                            <button
                                className={`uni-filter-chip ${!type ? 'uni-filter-chip--active' : ''}`}
                                onClick={() => setType('')}
                            >全部</button>
                            {UNIVERSITY_TYPES.slice(0, 8).map((t) => (
                                <button
                                    key={t}
                                    className={`uni-filter-chip ${type === t ? 'uni-filter-chip--active' : ''}`}
                                    onClick={() => setType(type === t ? '' : t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Province Filter */}
                    <div className="uni-filter-section">
                        <h3 className="uni-filter-title">所在省份</h3>
                        <select
                            className="uni-filter-select"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                        >
                            <option value="">全部省份</option>
                            {PROVINCES.map((p) => (
                                <option key={p.code} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {hasFilters && (
                        <Button variant="ghost" fullWidth onClick={clearFilters} icon="🗑️">
                            清除筛选
                        </Button>
                    )}
                </aside>

                {/* Results */}
                <div className="uni-results">
                    {error && (
                        <div style={{ marginBottom: '1rem' }}>
                            {error.includes('配置缺失') ? (
                                <ConfigErrorNotice
                                    serviceName="院校数据服务"
                                    detail="当前环境缺少 Supabase 配置，院校列表请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
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
                                    <h3>院校数据暂时不可用</h3>
                                    <p>{error}</p>
                                    <Button variant="outline" onClick={fetchData}>重新加载</Button>
                                </div>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <Loading text="加载院校数据..." />
                    ) : !error && universities.length === 0 ? (
                        <div className="uni-empty animate-fade-in">
                            <span className="uni-empty__icon">🏫</span>
                            <h3>未找到匹配的院校</h3>
                            <p>请尝试调整搜索条件或筛选项</p>
                            {hasFilters && (
                                <Button variant="outline" onClick={clearFilters}>清除筛选</Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="uni-grid">
                                {universities.map((uni, i) => (
                                    <Link
                                        to={`/universities/${uni.id}`}
                                        key={uni.id}
                                        className="uni-card-link"
                                    >
                                        <Card
                                            variant="glass"
                                            hoverable
                                            className={`uni-card animate-fade-in-up delay-${(i % 4) + 1}`}
                                        >
                                            <CardBody>
                                                <div className="uni-card__content">
                                                    <div className="uni-card__header">
                                                        <div className="uni-card__avatar">
                                                            {uni.logo_url ? (
                                                                <img src={uni.logo_url} alt={uni.name} className="uni-card__logo-img" />
                                                            ) : (
                                                                uni.name[0]
                                                            )}
                                                        </div>
                                                        <div className="uni-card__info">
                                                            <h3 className="uni-card__name">{uni.name}</h3>
                                                            <span className="uni-card__location">
                                                                📍 {uni.province} · {uni.city || uni.province}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="uni-card__tags">
                                                        {getLevelTag(uni)}
                                                        <Tag variant="default">{uni.type}</Tag>
                                                        {uni.code && <Tag variant="default">代码: {uni.code}</Tag>}
                                                    </div>
                                                    {uni.description && (
                                                        <p className="uni-card__desc">
                                                            {uni.description.length > 60
                                                                ? uni.description.slice(0, 60) + '...'
                                                                : uni.description}
                                                        </p>
                                                    )}
                                                    <div className="uni-card__footer">
                                                        <span className="uni-card__detail-link">查看详情 →</span>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="uni-pagination">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        上一页
                                    </Button>
                                    <span className="uni-pagination__info">
                                        第 {page} / {totalPages} 页
                                    </span>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        下一页
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
