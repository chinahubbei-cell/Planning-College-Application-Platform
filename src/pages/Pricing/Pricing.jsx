import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card, { CardBody } from '../../components/common/Card';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import { createOrder, getMyAccess } from '../../services/commerceService';
import useAuthStore from '../../stores/useAuthStore';
import { hasSupabaseConfig } from '../../services/supabaseConfig';

export default function Pricing() {
  const { user } = useAuthStore();
  const configReady = hasSupabaseConfig();
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [error, setError] = useState('');
  const [access, setAccess] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(true);

  useEffect(() => {
    if (!configReady) {
      setLoadingAccess(false);
      setError('订阅服务配置缺失，请联系管理员检查环境变量');
      return;
    }
    loadAccess();
  }, [configReady]);

  const loadAccess = async () => {
    setLoadingAccess(true);
    try {
      const data = await getMyAccess();
      setAccess(data);
      setError('');
    } catch (err) {
      console.error('获取付费状态失败:', err);
      setAccess(null);
      setError(err.message || '获取付费状态失败');
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleBuy = async () => {
    if (!configReady) {
      setError('订阅服务配置缺失，请联系管理员检查环境变量');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await createOrder({ channel: 'wechat' });
      setOrderInfo(data);
      // 刷新付费状态
      await loadAccess();
    } catch (err) {
      setError(err.message || '下单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 0 4rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>💳 套餐订阅</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        MVP 版本仅提供一个可验证商业模式的套餐：299 元 / 90 天
      </p>

      <Card variant="glass" style={{ maxWidth: 560 }}>
        <CardBody>
          <h2 style={{ marginBottom: '0.5rem' }}>基础版 299</h2>
          <ul style={{ marginBottom: '1rem', paddingLeft: '1rem', lineHeight: 1.8 }}>
            <li>智能推荐完整使用</li>
            <li>志愿方案报告导出</li>
            <li>有效期 90 天</li>
          </ul>

          {!configReady && (
            <ConfigErrorNotice
              serviceName="订阅服务"
              detail="当前环境缺少 Supabase 配置，无法检查订阅状态或创建订单。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
            />
          )}

          {/* 加载中 */}
          {configReady && loadingAccess && (
            <p style={{ color: 'var(--color-text-secondary)' }}>正在检查订阅状态...</p>
          )}

          {/* 已订阅 */}
          {configReady && !loadingAccess && access?.is_paid && (
            <div style={{
              padding: '1rem',
              background: 'var(--color-success-bg, #d1fae5)',
              border: '1px solid var(--color-success, #10b981)',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ color: 'var(--color-success, #065f46)', margin: 0, fontWeight: 500 }}>
                ✅ 已订阅
              </p>
              {access.expires_at && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  有效期至: {new Date(access.expires_at).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          )}

          {/* 未订阅 */}
          {configReady && !loadingAccess && !access?.is_paid && (
            <>
              <Button onClick={handleBuy} loading={loading}>
                立即开通（299 元）
              </Button>

              {error && <p style={{ color: 'var(--color-danger)', marginTop: '0.75rem' }}>⚠️ {error}</p>}

              {orderInfo && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <p><strong>订单号：</strong>{orderInfo.order_no}</p>
                  <p style={{ marginTop: '0.5rem' }}>已创建订单。当前为快速验证模式，请由后端支付回调完成开通。</p>
                </div>
              )}
            </>
          )}

          {!user && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              未登录？先去 <Link to="/login">登录</Link>
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
