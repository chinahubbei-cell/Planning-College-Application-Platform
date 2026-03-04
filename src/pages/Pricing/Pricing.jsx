import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card, { CardBody } from '../../components/common/Card';
import { createOrder } from '../../services/commerceService';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await createOrder({ channel: 'wechat' });
      setOrderInfo(data);
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

          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            未登录？先去 <Link to="/login">登录</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
