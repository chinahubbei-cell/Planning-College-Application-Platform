import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { getUserProfile, updateUserProfile } from '../../services/authService';
import { getFavorites, removeFavorite } from '../../services/favoriteService';
import Card, { CardBody, CardHeader } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import './Profile.css';

export default function Profile() {
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const [profile, setProfile] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [profileData, favData] = await Promise.all([
                getUserProfile(user.id).catch(() => null),
                getFavorites().catch(() => []),
            ]);
            setProfile(profileData);
            setFavorites(favData || []);
            if (profileData) {
                setEditForm({
                    name: profileData.name || '',
                    province: profileData.province || '',
                    exam_year: profileData.exam_year || 2025,
                    subject_type: profileData.subject_type || 'physics',
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        queueMicrotask(() => {
            if (user) fetchData();
            else setLoading(false);
        });
    }, [fetchData, user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const nextProfile = await updateUserProfile(user.id, editForm);
            setProfile(nextProfile);
            setEditing(false);
            addToast({ type: 'success', message: '个人资料已保存' });
        } catch (err) {
            console.error('Failed to save:', err);
            addToast({ type: 'error', message: err.message || '保存个人资料失败' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFavorite = async (favId) => {
        try {
            await removeFavorite(favId);
            setFavorites(favorites.filter((f) => f.id !== favId));
            addToast({ type: 'success', message: '已取消收藏' });
        } catch (err) {
            console.error(err);
            addToast({ type: 'error', message: err.message || '取消收藏失败' });
        }
    };

    if (!user) {
        return (
            <div className="profile-page container">
                <div className="uni-empty animate-fade-in" style={{ padding: '6rem 0' }}>
                    <span className="uni-empty__icon">🔐</span>
                    <h3>请先登录</h3>
                    <p>登录后查看个人中心</p>
                    <Link to="/login"><Button>去登录</Button></Link>
                </div>
            </div>
        );
    }

    if (loading) return <Loading text="加载个人信息..." />;

    const initial = profile?.name?.[0] || user?.email?.[0] || '?';

    const TABS = [
        { key: 'info', label: '👤 基本信息' },
        { key: 'favorites', label: `⭐ 我的收藏 (${favorites.length})` },
    ];

    return (
        <div className="profile-page container animate-fade-in-up">
            {/* Hero */}
            <div className="profile-hero">
                <div className="profile-hero__avatar">{initial.toUpperCase()}</div>
                <div className="profile-hero__info">
                    <h1 className="profile-hero__name">{profile?.name || '未设置昵称'}</h1>
                    <p className="profile-hero__email">{user?.email}</p>
                    <div className="profile-hero__tags">
                        {profile?.province && <Tag variant="default">📍 {profile.province}</Tag>}
                        {profile?.exam_year && <Tag variant="primary">🎓 {profile.exam_year}届</Tag>}
                        {profile?.subject_type && (
                            <Tag variant="default">
                                {profile.subject_type === 'physics' ? '物理类' : profile.subject_type === 'history' ? '历史类' : profile.subject_type === 'science' ? '理科' : '文科'}
                            </Tag>
                        )}
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
            {activeTab === 'info' && (
                <div className="profile-info animate-fade-in">
                    <Card variant="glass">
                        <CardHeader>
                            <div className="profile-info__header">
                                <h3>📋 个人资料</h3>
                                {!editing ? (
                                    <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>✏️ 编辑</Button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button size="sm" onClick={handleSave} loading={saving}>保存</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>取消</Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardBody>
                            {editing ? (
                                <div className="profile-edit-form">
                                    <div className="profile-edit-field">
                                        <label>昵称</label>
                                        <input
                                            type="text"
                                            className="recommend-form__input"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="profile-edit-field">
                                        <label>省份</label>
                                        <input
                                            type="text"
                                            className="recommend-form__input"
                                            value={editForm.province}
                                            onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                                        />
                                    </div>
                                    <div className="profile-edit-field">
                                        <label>高考年份</label>
                                        <input
                                            type="number"
                                            className="recommend-form__input"
                                            value={editForm.exam_year}
                                            onChange={(e) => setEditForm({ ...editForm, exam_year: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-info-grid">
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">👤</span>
                                        <div><span className="uni-info-item__label">昵称</span><span>{profile?.name || '未设置'}</span></div>
                                    </div>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📧</span>
                                        <div><span className="uni-info-item__label">邮箱</span><span>{user?.email}</span></div>
                                    </div>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📍</span>
                                        <div><span className="uni-info-item__label">省份</span><span>{profile?.province || '未设置'}</span></div>
                                    </div>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">🎓</span>
                                        <div><span className="uni-info-item__label">高考年份</span><span>{profile?.exam_year || '未设置'}</span></div>
                                    </div>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📖</span>
                                        <div><span className="uni-info-item__label">选科</span><span>{profile?.subject_type === 'physics' ? '物理类' : profile?.subject_type === 'history' ? '历史类' : '未设置'}</span></div>
                                    </div>
                                    <div className="uni-info-item">
                                        <span className="uni-info-item__icon">📅</span>
                                        <div><span className="uni-info-item__label">注册时间</span><span>{new Date(user?.created_at).toLocaleDateString('zh-CN')}</span></div>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Quick Links */}
                    <div className="profile-quick-links">
                        <Link to="/recommend" className="profile-quick-link">
                            <span className="profile-quick-link__icon">🎯</span>
                            <span>智能推荐</span>
                        </Link>
                        <Link to="/plans" className="profile-quick-link">
                            <span className="profile-quick-link__icon">📋</span>
                            <span>方案管理</span>
                        </Link>
                        <Link to="/universities" className="profile-quick-link">
                            <span className="profile-quick-link__icon">🏫</span>
                            <span>院校查询</span>
                        </Link>
                        <Link to="/analytics" className="profile-quick-link">
                            <span className="profile-quick-link__icon">📊</span>
                            <span>数据分析</span>
                        </Link>
                    </div>
                </div>
            )}

            {activeTab === 'favorites' && (
                <div className="profile-favorites animate-fade-in">
                    {favorites.length === 0 ? (
                        <div className="uni-empty" style={{ padding: '4rem 0' }}>
                            <span className="uni-empty__icon">⭐</span>
                            <h3>暂无收藏</h3>
                            <p>在院校或专业页面点击收藏按钮添加</p>
                            <Link to="/universities"><Button variant="outline" icon="🏫">去添加</Button></Link>
                        </div>
                    ) : (
                        <div className="profile-fav-grid">
                            {favorites.map((fav) => (
                                <Card key={fav.id} variant="glass" hoverable>
                                    <CardBody>
                                        <div className="profile-fav-item">
                                            <div className="profile-fav-item__info">
                                                {fav.universities ? (
                                                    <Link to={`/universities/${fav.universities.id}`}>
                                                        <h4>🏫 {fav.universities.name}</h4>
                                                        <span className="uni-card__location">📍 {fav.universities.province}</span>
                                                    </Link>
                                                ) : fav.majors ? (
                                                    <Link to={`/majors/${fav.majors.id}`}>
                                                        <h4>📚 {fav.majors.name}</h4>
                                                        <Tag variant="primary">{fav.majors.category}</Tag>
                                                    </Link>
                                                ) : (
                                                    <span>未知收藏</span>
                                                )}
                                            </div>
                                            <button className="plan-item-card__remove" onClick={() => handleRemoveFavorite(fav.id)}>✕</button>
                                        </div>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
