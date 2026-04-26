import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../../services/authService';
import Button from '../../components/common/Button';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import { hasSupabaseConfig } from '../../services/supabaseConfig';
import './Auth.css';

export default function Register() {
    const configReady = hasSupabaseConfig();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const updateField = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!configReady) return;
        setError('');

        // Validation
        if (form.password !== form.confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }
        if (form.password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        setLoading(true);
        try {
            const result = await signUp({
                email: form.email,
                password: form.password,
                name: form.name,
            });
            // If email confirmation is disabled, user is auto-confirmed
            if (result?.session) {
                navigate('/');
            } else {
                setSuccess(true);
            }
        } catch (err) {
            const msg = err.message?.toLowerCase() || '';
            if (msg.includes('already registered')) {
                setError('该邮箱已注册，请直接登录');
            } else if (msg.includes('rate limit') || msg.includes('email rate')) {
                setError('邮件发送频率超限，请等待几分钟后重试，或联系管理员关闭邮箱验证');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-container auth-container--narrow animate-fade-in-up">
                    <div className="auth-success">
                        <span className="auth-success__icon">✅</span>
                        <h2 className="auth-success__title">注册成功！</h2>
                        <p className="auth-success__desc">
                            我们已向 <strong>{form.email}</strong> 发送了一封确认邮件，
                            请查收并点击链接完成验证。
                        </p>
                        <Link to="/login">
                            <Button size="lg">前往登录</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container animate-fade-in-up">
                {/* Left visual panel */}
                <div className="auth-visual auth-visual--register">
                    <div className="auth-visual__content">
                        <span className="auth-visual__icon">✨</span>
                        <h2 className="auth-visual__title">加入我们</h2>
                        <p className="auth-visual__desc">
                            创建账户，开启智能志愿规划之旅，
                            选择更好的未来。
                        </p>
                        <div className="auth-visual__stats">
                            <div className="auth-visual__stat">
                                <span className="auth-visual__stat-num">2800+</span>
                                <span className="auth-visual__stat-label">覆盖院校</span>
                            </div>
                            <div className="auth-visual__stat">
                                <span className="auth-visual__stat-num">700+</span>
                                <span className="auth-visual__stat-label">专业方向</span>
                            </div>
                            <div className="auth-visual__stat">
                                <span className="auth-visual__stat-num">免费</span>
                                <span className="auth-visual__stat-label">基础功能</span>
                            </div>
                        </div>
                    </div>
                    <div className="auth-visual__glow auth-visual__glow--1" />
                    <div className="auth-visual__glow auth-visual__glow--2" />
                </div>

                {/* Right form panel */}
                <div className="auth-form-panel">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">注册</h1>
                        <p className="auth-form-subtitle">
                            已有账户？
                            <Link to="/login" className="auth-link">立即登录</Link>
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
                            detail="当前环境缺少 Supabase 配置，注册请求已被禁用。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                            className="animate-fade-in"
                        />
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label htmlFor="reg-name" className="auth-label">姓名</label>
                            <input
                                id="reg-name"
                                type="text"
                                className="auth-input"
                                placeholder="请输入您的姓名"
                                value={form.name}
                                onChange={updateField('name')}
                                required
                                disabled={!configReady || loading}
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-email" className="auth-label">邮箱</label>
                            <input
                                id="reg-email"
                                type="email"
                                className="auth-input"
                                placeholder="请输入邮箱地址"
                                value={form.email}
                                onChange={updateField('email')}
                                required
                                autoComplete="email"
                                disabled={!configReady || loading}
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-password" className="auth-label">密码</label>
                            <input
                                id="reg-password"
                                type="password"
                                className="auth-input"
                                placeholder="至少6位密码"
                                value={form.password}
                                onChange={updateField('password')}
                                required
                                minLength={6}
                                autoComplete="new-password"
                                disabled={!configReady || loading}
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-confirm" className="auth-label">确认密码</label>
                            <input
                                id="reg-confirm"
                                type="password"
                                className="auth-input"
                                placeholder="再次输入密码"
                                value={form.confirmPassword}
                                onChange={updateField('confirmPassword')}
                                required
                                minLength={6}
                                autoComplete="new-password"
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
                            创建账户
                        </Button>
                    </form>

                    <p className="auth-terms">
                        注册即表示您同意我们的
                        <a href="#">服务条款</a>和<a href="#">隐私政策</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
