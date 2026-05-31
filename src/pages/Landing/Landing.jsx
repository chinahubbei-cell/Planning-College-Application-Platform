import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card, { CardBody } from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import './Landing.css';

// 动态数字组件
function CountUp({ end, duration = 2000, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        let animationId;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    const start = 0;
                    const startTime = performance.now();

                    function animate(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // easeOutQuart
                        const eased = 1 - Math.pow(1 - progress, 4);
                        setCount(Math.floor(start + (end - start) * eased));
                        if (progress < 1) animationId = requestAnimationFrame(animate);
                    }
                    animationId = requestAnimationFrame(animate);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => {
            observer.disconnect();
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [end, duration]);

    return (
        <span ref={ref} className="count-up">
            {count.toLocaleString()}{suffix}
        </span>
    );
}

// 粒子背景
function ParticleBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        function resize() {
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * pixelRatio;
            canvas.height = canvas.offsetHeight * pixelRatio;
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        }

        function createParticles() {
            particles = [];
            const count = Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 15000);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.offsetWidth,
                    y: Math.random() * canvas.offsetHeight,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 1.5 + 0.5,
                    opacity: Math.random() * 0.5 + 0.1,
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.offsetWidth;
                if (p.x > canvas.offsetWidth) p.x = 0;
                if (p.y < 0) p.y = canvas.offsetHeight;
                if (p.y > canvas.offsetHeight) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animationId = requestAnimationFrame(draw);
        }

        resize();
        createParticles();
        draw();
        const handleResize = () => {
            resize();
            createParticles();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="particle-bg" />;
}

const FEATURES = [
    {
        icon: '🎯',
        title: '智能推荐',
        desc: '基于高考分数和位次，结合历年录取大数据，一键生成个性化志愿推荐方案。',
        tag: 'AI 驱动',
        tagVariant: 'primary',
    },
    {
        icon: '📊',
        title: '数据分析',
        desc: '全面展示院校分数线趋势、位次分布、录取概率等多维数据分析。',
        tag: '可视化',
        tagVariant: 'secondary',
    },
    {
        icon: '📋',
        title: '方案管理',
        desc: '创建多套志愿方案，支持拖拽排序、风险评估、方案对比。',
        tag: '一站式',
        tagVariant: 'success',
    },
    {
        icon: '🤖',
        title: 'AI 问答助手',
        desc: '内置智能问答助手，实时解答志愿填报、院校选择、专业前景等疑问。',
        tag: '实时问答',
        tagVariant: 'warning',
    },
];

const STATS = [
    { value: 2800, suffix: '+', label: '覆盖院校' },
    { value: 700, suffix: '+', label: '专业方向' },
    { value: 5, suffix: '年', label: '历史数据' },
    { value: 99, suffix: '%', label: '数据准确率' },
];

const STEPS = [
    { num: '01', title: '输入信息', desc: '填写高考分数、位次、所在省份和选科组合' },
    { num: '02', title: '智能匹配', desc: '系统基于大数据自动匹配适合的院校和专业' },
    { num: '03', title: '方案优化', desc: '手动调整志愿顺序，系统实时评估录取风险' },
    { num: '04', title: '确认提交', desc: '最终确认方案，导出报告，信心满满参加填报' },
];

export default function Landing() {
    const navigate = useNavigate();
    const [quickScore, setQuickScore] = useState('');

    const handleQuickRecommend = (e) => {
        e.preventDefault();

        const trimmedScore = quickScore.trim();
        if (!trimmedScore) {
            navigate('/recommend');
            return;
        }

        navigate(`/recommend?score=${encodeURIComponent(trimmedScore)}`);
    };

    return (
        <div className="landing">
            {/* ===== Hero Section ===== */}
            <section className="hero">
                <ParticleBackground />
                <div className="hero__content container">
                    <div className="hero__badge animate-fade-in">
                        <Tag variant="primary" size="md">🚀 2026 高考志愿填报季</Tag>
                    </div>

                    <h1 className="hero__title animate-fade-in-up">
                        AI 驱动的
                        <br />
                        <span className="text-gradient">智能高考志愿规划</span>
                    </h1>

                    <p className="hero__subtitle animate-fade-in-up delay-1">
                        基于大数据与人工智能技术，为每一位考生量身定制最优志愿方案。
                        <br />
                        让志愿填报不再迷茫，步步稳妥、冲刺梦想。
                    </p>

                    <div className="hero__actions animate-fade-in-up delay-2">
                        <Link to="/recommend">
                            <Button size="lg" icon="🎯">开始智能推荐</Button>
                        </Link>
                        <Link to="/universities">
                            <Button variant="outline" size="lg" icon="🔍">查询院校</Button>
                        </Link>
                    </div>

                    {/* Quick Score Input */}
                    <div className="hero__quick animate-fade-in-up delay-3">
                        <div className="hero__quick-card glass">
                            <span className="hero__quick-label">快速体验：输入您的分数</span>
                            <form className="hero__quick-input-group" onSubmit={handleQuickRecommend}>
                                <input
                                    type="number"
                                    className="hero__quick-input"
                                    placeholder="高考分数"
                                    min="0"
                                    max="750"
                                    value={quickScore}
                                    onChange={(e) => setQuickScore(e.target.value)}
                                />
                                <Button type="submit">查看推荐</Button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Decorative glow */}
                <div className="hero__glow hero__glow--1" />
                <div className="hero__glow hero__glow--2" />
            </section>

            {/* ===== Stats Section ===== */}
            <section className="stats">
                <div className="stats__inner container">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="stats__item">
                            <div className="stats__value">
                                <CountUp end={stat.value} suffix={stat.suffix} />
                            </div>
                            <div className="stats__label">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== Features Section ===== */}
            <section className="features container">
                <div className="section-header">
                    <Tag variant="primary" size="md">核心功能</Tag>
                    <h2 className="section-title">
                        为你的志愿填报<span className="text-gradient">保驾护航</span>
                    </h2>
                    <p className="section-desc">
                        融合历年录取大数据与 AI 智能分析，提供全方位志愿填报辅助服务
                    </p>
                </div>

                <div className="features__grid">
                    {FEATURES.map((f, i) => (
                        <Card key={f.title} variant="glass" hoverable glow className={`animate-fade-in-up delay-${i + 1}`}>
                            <CardBody>
                                <div className="feature-card">
                                    <div className="feature-card__icon">{f.icon}</div>
                                    <Tag variant={f.tagVariant}>{f.tag}</Tag>
                                    <h3 className="feature-card__title">{f.title}</h3>
                                    <p className="feature-card__desc">{f.desc}</p>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ===== How It Works ===== */}
            <section className="steps container">
                <div className="section-header">
                    <Tag variant="secondary" size="md">使用流程</Tag>
                    <h2 className="section-title">
                        四步完成<span className="text-gradient">完美填报</span>
                    </h2>
                    <p className="section-desc">
                        简洁高效的操作流程，从信息输入到方案确认，一气呵成
                    </p>
                </div>

                <div className="steps__grid">
                    {STEPS.map((step, i) => (
                        <div key={step.num} className={`step-card animate-fade-in-up delay-${i + 1}`}>
                            <div className="step-card__num">{step.num}</div>
                            <div className="step-card__connector" />
                            <h3 className="step-card__title">{step.title}</h3>
                            <p className="step-card__desc">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== CTA Section ===== */}
            <section className="cta">
                <div className="cta__inner container">
                    <div className="cta__card glass">
                        <h2 className="cta__title">
                            准备好开始你的
                            <span className="text-gradient">志愿规划</span>之旅了吗？
                        </h2>
                        <p className="cta__desc">
                            立即注册，免费使用智能推荐功能，为你的未来做出最明智的选择。
                        </p>
                        <div className="cta__actions">
                            <Link to="/register">
                                <Button size="lg" icon="✨">免费注册</Button>
                            </Link>
                            <Link to="/assistant">
                                <Button variant="ghost" size="lg" icon="💬">先问问 AI 助手</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
