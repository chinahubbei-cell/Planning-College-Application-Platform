import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../../services/authService';
import Button from '../../components/common/Button';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import { hasSupabaseConfig } from '../../services/supabaseConfig';
import './Auth.css';

export default function Login() {
    const configReady = hasSupabaseConfig();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!configReady) return;
        setError('');
        setLoading(true);

        try {
            await signIn({ email, password });
            navigate('/');
        } catch (err) {
            setError(err.message === 'Invalid login credentials'
                ? '邮箱或密码错误，请重试'
                : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container animate-fade-in-up">
                {/* Left visual panel */}
                <div className="auth-visual">
                    <div className="auth-visual__content">
                        <span className="auth-visual__icon">🎓</span>
                        <h2 className="auth-visual__title">欢迎回来</h2>
                        <p className="auth-visual__desc">
                            登录您的账户，继续完善志愿方案，查看最新推荐。
                        </p>
                        <div className="auth-visual__features">
                            <div className="auth-visual__feature">
                                <span>🎯</span>
                                <span>个性化智能推荐</span>
                            </div>
                            <div className="auth-visual__feature">
                                <span>📊</span>
                                <span>历年数据分析</span>
                            </div>
                            <div className="auth-visual__feature">
                                <span>📋</span>
                                <span>志愿方案管理</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative glows */}
                    <div className="auth-visual__glow auth-visual__glow--1" />
                    <div className="auth-visual__glow auth-visual__glow--2" />
                </div>

                {/* Right form panel */}
                <div className="auth-form-panel">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">登录</h1>
                        <p className="auth-form-subtitle">
                            还没有账户？
                            <Link to="/register" className="auth-link">立即注册</Link>
                        </p>
                    </div>

                    {error && (
                        <div className="auth-error animate-fade-in">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {!configReady && (
                        <ConfigErrorNotice
                            serviceName="认证服务"
                            detail="当前环境缺少 Supabase 配置，登录和注册请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                            className="animate-fade-in"
                        />
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label htmlFor="login-email" className="auth-label">邮箱</label>
                            <input
                                id="login-email"
                                type="email"
                                className="auth-input"
                                placeholder="请输入邮箱地址"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                disabled={!configReady || loading}
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="login-password" className="auth-label">密码</label>
                            <input
                                id="login-password"
                                type="password"
                                className="auth-input"
                                placeholder="请输入密码"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="current-password"
                                disabled={!configReady || loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            fullWidth
                            size="lg"
                            loading={loading}
                            disabled={!configReady}
                        >
                            登录
                        </Button>
                    </form>

                    <div className="auth-divider">
                        <span>或</span>
                    </div>

                    <div className="auth-alt-actions">
                        <p className="auth-hint">
                            提示：使用邮箱注册后即可登录体验所有功能
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
