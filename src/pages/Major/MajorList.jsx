import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMajors, getMajorCategories } from '../../services/majorService';
import Card, { CardBody } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import './Major.css';

export default function MajorList() {
    const [majors, setMajors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState([]);

    // Filters
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Load categories
    useEffect(() => {
        getMajorCategories()
            .then(setCategories)
            .catch(console.error);
    }, []);

    // Fetch majors
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getMajors({
                search: debouncedSearch,
                category,
                page,
                pageSize: 20,
            });
            setMajors(result.data || []);
            setTotalCount(result.count || 0);
            setTotalPages(result.totalPages || 1);
            setError('');
        } catch (err) {
            console.error('Failed to fetch majors:', err);
            setMajors([]);
            setTotalCount(0);
            setTotalPages(1);
            setError(err.message || '加载专业数据失败');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, category, page]);

    useEffect(() => { queueMicrotask(fetchData); }, [fetchData]);

    useEffect(() => { queueMicrotask(() => setPage(1)); }, [debouncedSearch, category]);

    const clearFilters = () => {
        setSearch('');
        setCategory('');
        setPage(1);
    };

    const hasFilters = search || category;

    const CATEGORY_ICONS = {
        '工学': '⚙️', '理学': '🔬', '经济学': '💰', '法学': '⚖️',
        '文学': '📝', '医学': '🏥', '管理学': '📊', '教育学': '🎓',
        '艺术学': '🎨', '农学': '🌾', '哲学': '💭', '历史学': '📜',
        '军事学': '🎖️',
    };

    return (
        <div className="major-page container">
            <div className="major-page__header animate-fade-in-up">
                <div>
                    <h1 className="major-page__title">专业查询</h1>
                    <p className="major-page__subtitle">浏览各类专业信息，了解学科方向与就业前景</p>
                </div>
                <div className="major-page__count">
                    共 <span className="major-page__count-num">{totalCount}</span> 个专业
                </div>
            </div>

            {/* Search Bar */}
            <div className="major-search-bar animate-fade-in">
                <div className="major-search-bar__input-wrapper">
                    <span className="major-search-bar__icon">🔍</span>
                    <input
                        type="text"
                        className="major-search-bar__input"
                        placeholder="搜索专业名称..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="major-search-bar__clear" onClick={() => setSearch('')}>✕</button>
                    )}
                </div>
            </div>

            {/* Category Chips */}
            <div className="major-categories animate-fade-in">
                <button
                    className={`major-category-chip ${!category ? 'major-category-chip--active' : ''}`}
                    onClick={() => setCategory('')}
                >
                    全部
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        className={`major-category-chip ${category === cat ? 'major-category-chip--active' : ''}`}
                        onClick={() => setCategory(category === cat ? '' : cat)}
                    >
                        <span>{CATEGORY_ICONS[cat] || '📖'}</span>
                        <span>{cat}</span>
                    </button>
                ))}
                {hasFilters && (
                    <button className="major-category-chip major-category-chip--clear" onClick={clearFilters}>
                        🗑️ 清除
                    </button>
                )}
            </div>

            {/* Results */}
            {error && (
                <div style={{ marginBottom: '1rem' }}>
                    {error.includes('配置缺失') ? (
                        <ConfigErrorNotice
                            serviceName="专业数据服务"
                            detail="当前环境缺少 Supabase 配置，专业列表请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
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
                            <h3>专业数据暂时不可用</h3>
                            <p>{error}</p>
                            <Button variant="outline" onClick={fetchData}>重新加载</Button>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <Loading text="加载专业数据..." />
            ) : !error && majors.length === 0 ? (
                <div className="uni-empty animate-fade-in">
                    <span className="uni-empty__icon">📚</span>
                    <h3>未找到匹配的专业</h3>
                    <p>请尝试调整搜索条件</p>
                    {hasFilters && <Button variant="outline" onClick={clearFilters}>清除筛选</Button>}
                </div>
            ) : !error ? (
                <>
                    <div className="major-grid">
                        {majors.map((major, i) => (
                            <Link
                                to={`/majors/${major.id}`}
                                key={major.id}
                                className="uni-card-link"
                            >
                                <Card
                                    variant="glass"
                                    hoverable
                                    className={`major-card animate-fade-in-up delay-${(i % 4) + 1}`}
                                >
                                    <CardBody>
                                        <div className="major-card__content">
                                            <div className="major-card__icon">
                                                {CATEGORY_ICONS[major.category] || '📖'}
                                            </div>
                                            <h3 className="major-card__name">{major.name}</h3>
                                            <div className="major-card__tags">
                                                <Tag variant="primary">{major.category}</Tag>
                                                <Tag variant="default">{major.degree} · {major.duration}年</Tag>
                                            </div>
                                            {major.universities && (
                                                <div className="major-card__uni">
                                                    <span className="major-card__uni-icon">🏫</span>
                                                    <span>{major.universities.name}</span>
                                                    {major.universities.level === '985' && <Tag variant="danger" size="sm">985</Tag>}
                                                    {major.universities.level === '211' && <Tag variant="warning" size="sm">211</Tag>}
                                                </div>
                                            )}
                                            {major.description && (
                                                <p className="major-card__desc">
                                                    {major.description.length > 50
                                                        ? major.description.slice(0, 50) + '...'
                                                        : major.description}
                                                </p>
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="uni-pagination">
                            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                            <span className="uni-pagination__info">第 {page} / {totalPages} 页</span>
                            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
