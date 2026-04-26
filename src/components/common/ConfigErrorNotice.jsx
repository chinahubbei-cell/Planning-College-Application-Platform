import Card, { CardBody } from './Card';

export default function ConfigErrorNotice({
    serviceName = '当前服务',
    detail = '请联系管理员检查 .env 中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。',
    className = '',
}) {
    return (
        <Card
            variant="glass"
            className={className}
            style={{
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(127, 29, 29, 0.18)',
            }}
        >
            <CardBody>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <strong style={{ color: 'var(--color-danger-light, #fca5a5)' }}>
                        {serviceName} 配置缺失
                    </strong>
                    <span style={{ color: 'var(--color-text-primary)' }}>
                        {detail}
                    </span>
                </div>
            </CardBody>
        </Card>
    );
}
