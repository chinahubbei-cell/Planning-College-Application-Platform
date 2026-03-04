import { Link, useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/useUIStore';
import useAuthStore from '../../stores/useAuthStore';
import { signOut } from '../../services/authService';
import './Header.css';

const NAV_ITEMS = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/recommend', label: '智能推荐', icon: '🎯' },
    { path: '/universities', label: '院校查询', icon: '🏫' },
    { path: '/majors', label: '专业查询', icon: '📚' },
    { path: '/plans', label: '方案管理', icon: '📋' },
    { path: '/pricing', label: '套餐订阅', icon: '💳' },
    { path: '/analytics', label: '数据分析', icon: '📊' },
    { path: '/assistant', label: 'AI 助手', icon: '🤖' },
];

const ADMIN_NAV_ITEMS = [
    { path: '/admin/data', label: '数据管理', icon: '⚙️' },
];

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
    const { user } = useAuthStore();

    const isAdmin = user?.profile?.role === 'admin';

    // Combine nav items: show admin items only to admins
    const visibleNavItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/');
        } catch (err) {
            console.error('Sign out error:', err);
        }
    };

    return (
        <header className="header">
            <div className="header__inner">
                {/* Logo */}
                <Link to="/" className="header__logo">
                    <span className="header__logo-icon">🎓</span>
                    <span className="header__logo-text">志愿规划</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="header__nav">
                    {visibleNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`header__nav-item ${location.pathname === item.path ? 'header__nav-item--active' : ''
                                }`}
                        >
                            <span className="header__nav-icon">{item.icon}</span>
                            <span className="header__nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="header__actions">
                    <button
                        className="header__theme-toggle"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    {user ? (
                        <div className="header__user-menu">
                            <Link to="/profile" className="header__avatar" title={user.email}>
                                <span>{user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase() || '?'}</span>
                            </Link>
                            <button className="header__signout-btn" onClick={handleSignOut} title="退出登录">
                                退出
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="header__login-btn">
                            登录
                        </Link>
                    )}

                    {/* Mobile menu toggle */}
                    <button
                        className="header__mobile-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <nav className="header__mobile-nav animate-fade-in-down">
                    {visibleNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`header__mobile-nav-item ${location.pathname === item.path ? 'header__mobile-nav-item--active' : ''
                                }`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                    {user ? (
                        <button
                            className="header__mobile-nav-item"
                            onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                        >
                            <span>👋</span>
                            <span>退出登录</span>
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            className="header__mobile-nav-item"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span>🔑</span>
                            <span>登录</span>
                        </Link>
                    )}
                </nav>
            )}
        </header>
    );
}
