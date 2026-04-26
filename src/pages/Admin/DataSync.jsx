import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { RefreshCw, Database, Server, Clock, AlertCircle, CheckCircle, X, TimerOff, Info } from 'lucide-react';
import ConfigErrorNotice from '../../components/common/ConfigErrorNotice';
import useUIStore from '../../stores/useUIStore';
import { createAppError, normalizeAppError } from '../../services/appError';
import { hasSupabaseConfig } from '../../services/supabaseConfig';
import './DataSync.css';

const POLL_INTERVAL = 4000; // 4 seconds
const SYNC_TIMEOUT = 120000; // 2 minutes

const TASK_TYPE_LABELS = {
    UNIVERSITIES: '高校名录',
    UNIVERSITY_DETAILS: '院校详情',
    MAJORS: '专业目录',
    SCORES: '分数线',
};

function normalizeSyncTriggerError(error, type) {
    const normalizedError = normalizeAppError(error, {
        fallbackMessage: '触发同步失败',
        networkMessage: '数据同步服务暂时无法连接，请检查网络后重试',
        unauthorizedMessage: '登录状态已失效，请重新登录',
        forbiddenMessage: '当前账号没有执行同步的权限',
        configMessage: '数据同步服务配置缺失，请联系管理员检查环境变量',
    });

    const rawMessage = String(error?.message || normalizedError.message || '').toLowerCase();
    if (
        type === 'UNIVERSITY_DETAILS'
        && normalizedError.code === 'BAD_REQUEST'
        && rawMessage.includes('invalid task_type')
    ) {
        return new Error('当前线上 sync-data 函数仍是旧版本，暂不支持“补全院校详情”。请先重新部署 Supabase Edge Function `sync-data`。');
    }

    return normalizedError;
}

async function getValidSyncAccessToken() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const session = sessionData?.session;
    const now = Date.now();
    const expiryMs = session?.expires_at ? session.expires_at * 1000 : 0;

    if (session?.access_token && expiryMs - now > 60 * 1000) {
        return session.access_token;
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;

    const refreshedToken = refreshData?.session?.access_token;
    if (!refreshedToken) {
        throw new Error('请重新登录后再执行同步');
    }

    return refreshedToken;
}

async function forceRefreshSyncAccessToken() {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;

    const refreshedToken = refreshData?.session?.access_token;
    if (!refreshedToken) {
        throw new Error('请重新登录后再执行同步');
    }

    return refreshedToken;
}

async function invokeSyncTask(type) {
    await getValidSyncAccessToken();

    try {
        const { error } = await supabase.functions.invoke('sync-data', {
            body: { task_type: type, executed_by: 'admin' },
        });
        if (error) throw error;
    } catch (error) {
        const normalizedError = await normalizeSyncInvokeError(error);

        if (normalizedError.code !== 'UNAUTHORIZED') {
            throw normalizedError;
        }

        await forceRefreshSyncAccessToken();
        const { error: retryError } = await supabase.functions.invoke('sync-data', {
            body: { task_type: type, executed_by: 'admin' },
        });
        if (retryError) {
            throw await normalizeSyncInvokeError(retryError);
        }
    }
}

async function normalizeSyncInvokeError(error) {
    const response = error?.context;
    if (response instanceof Response) {
        let payload = null;
        try {
            payload = await response.clone().json();
        } catch {
            try {
                const text = await response.clone().text();
                if (text) {
                    payload = { error: { message: text } };
                }
            } catch {
                payload = null;
            }
        }

        if (payload?.error?.message) {
            return createAppError(
                payload.error.code || (response.status === 401 ? 'UNAUTHORIZED' : 'EDGE_FUNCTION_ERROR'),
                payload.error.message,
                { status: response.status, data: payload },
            );
        }

        if (payload?.message) {
            return createAppError(
                response.status === 401 ? 'UNAUTHORIZED' : 'EDGE_FUNCTION_ERROR',
                payload.message,
                { status: response.status, data: payload },
            );
        }
    }

    return normalizeAppError(error, {
        fallbackMessage: '触发同步失败',
        networkMessage: '数据同步服务暂时无法连接，请检查网络后重试',
        unauthorizedMessage: '登录状态已失效，请重新登录',
        forbiddenMessage: '当前账号没有执行同步的权限',
        configMessage: '数据同步服务配置缺失，请联系管理员检查环境变量',
    });
}

export default function DataSyncAdmin() {
    const configReady = hasSupabaseConfig();
    const { addToast } = useUIStore();
    const [logs, setLogs] = useState([]);
    const [syncingTypes, setSyncingTypes] = useState(new Set()); // Track each type independently
    const [confirmModal, setConfirmModal] = useState({ open: false, type: null, title: '' });
    const [refreshing, setRefreshing] = useState(false);
    const [activeDetail, setActiveDetail] = useState(null); // { message, rect }
    const [error, setError] = useState('');
    const pollTimerRef = useRef(null);
    const timeoutTimersRef = useRef({});

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        if (!configReady) {
            setError('数据同步服务配置缺失，请联系管理员检查环境变量');
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('data_sync_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (fetchError) throw fetchError;

            setError('');
            setLogs(data || []);
            // Check if any RUNNING logs completed → stop polling for those types
            const stillRunning = (data || []).filter((l) => l.status === 'RUNNING');
            const runningTypes = new Set(stillRunning.map((l) => l.task_type));

            setSyncingTypes((prev) => {
                const next = new Set();
                for (const t of prev) {
                    if (runningTypes.has(t)) next.add(t);
                }
                // If nothing is running anymore, stop polling
                if (next.size === 0 && pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                }
                return next;
            });
        } catch (err) {
            const normalizedError = normalizeAppError(err, {
                fallbackMessage: '获取同步日志失败',
                networkMessage: '数据同步服务暂时无法连接，请检查网络后重试',
                unauthorizedMessage: '登录状态已失效，请重新登录',
                forbiddenMessage: '当前账号没有查看同步日志的权限',
                configMessage: '数据同步服务配置缺失，请联系管理员检查环境变量',
            });
            setError(normalizedError.message);
        }
    }, [configReady]);

    useEffect(() => {
        fetchLogs();
        const timeoutTimers = timeoutTimersRef.current;
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            Object.values(timeoutTimers).forEach(clearTimeout);
        };
    }, [fetchLogs]);

    // Start polling when a sync is triggered
    const startPolling = useCallback(() => {
        if (pollTimerRef.current) return; // Already polling
        pollTimerRef.current = setInterval(fetchLogs, POLL_INTERVAL);
    }, [fetchLogs]);

    // Show confirm modal
    const requestSync = (type, title) => {
        setConfirmModal({ open: true, type, title });
    };

    const cancelSync = () => {
        setConfirmModal({ open: false, type: null, title: '' });
    };

    // Fire-and-forget async sync
    const confirmAndSync = async () => {
        if (!configReady) {
            const message = '数据同步服务配置缺失，请联系管理员检查环境变量';
            setError(message);
            addToast({ type: 'error', message });
            return;
        }

        const type = confirmModal.type;
        setConfirmModal({ open: false, type: null, title: '' });

        // Mark this type as syncing
        setSyncingTypes(prev => new Set([...prev, type]));

        try {
            await invokeSyncTask(type);
            setError('');
            addToast({ type: 'success', message: `${confirmModal.title} 已开始执行` });

            // Start polling for status updates
            startPolling();
            // Immediate refresh to show the new RUNNING log
            setTimeout(fetchLogs, 800);

            // Set a timeout to mark as timed out on the client side
            timeoutTimersRef.current[type] = setTimeout(async () => {
                setSyncingTypes(prev => {
                    const next = new Set(prev);
                    next.delete(type);
                    return next;
                });
                // Fetch latest logs after timeout
                fetchLogs();
            }, SYNC_TIMEOUT);

        } catch (err) {
            const normalizedError = normalizeSyncTriggerError(err, type);
            console.error('Sync trigger failed:', normalizedError);
            setSyncingTypes(prev => {
                const next = new Set(prev);
                next.delete(type);
                return next;
            });
            setError(normalizedError.message);
            addToast({ type: 'error', message: normalizedError.message });
            // Still refresh logs in case the Edge Function created a RUNNING entry
            fetchLogs();
        }
    };

    const syncItems = [
        { type: 'UNIVERSITIES', title: '同步高校名录', desc: '从教育部名录增量更新，每年6月更新', icon: Server },
        { type: 'UNIVERSITY_DETAILS', title: '补全院校详情', desc: '从掌上高考补全简介/官网/校徽/建校年份等', icon: Info },
        { type: 'MAJORS', title: '更新专业目录', desc: '覆盖全部高校最新开设专业信息', icon: Database },
        { type: 'SCORES', title: '拉取最新分数线', desc: '从掌上高考全量增量拉取分省分数线', icon: RefreshCw },
    ];

    // Status badge helper
    const renderStatus = (status) => {
        switch (status) {
            case 'SUCCESS':
                return (
                    <span className="datasync-badge datasync-badge--success">
                        <CheckCircle /> 成功
                    </span>
                );
            case 'RUNNING':
                return (
                    <span className="datasync-badge datasync-badge--running">
                        <RefreshCw className="datasync-spin" /> 执行中
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="datasync-badge datasync-badge--fail">
                        <AlertCircle /> 失败
                    </span>
                );
            case 'TIMEOUT':
                return (
                    <span className="datasync-badge datasync-badge--timeout">
                        <TimerOff /> 超时
                    </span>
                );
            default:
                return (
                    <span className="datasync-badge datasync-badge--unknown">
                        <Info /> {status}
                    </span>
                );
        }
    };

    // Format relative time
    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Format duration
    const formatDuration = (log) => {
        if (!log.started_at) return '';
        const start = new Date(log.started_at);
        const end = log.finished_at ? new Date(log.finished_at) : (log.status === 'RUNNING' ? new Date() : null);
        if (!end) return '';
        const diffMs = end - start;
        if (diffMs < 1000) return `${diffMs}ms`;
        if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
        return `${(diffMs / 60000).toFixed(1)}min`;
    };

    return (
        <div className="datasync-page container">
            {/* Header */}
            <div className="datasync-header">
                <h1 className="datasync-header__title">
                    <Database /> 数据管理与同步中心
                </h1>
                <p className="datasync-header__desc">
                    管理高校名录、开设专业及历年录取分数线的底层数据源更新。
                </p>
            </div>

            {!configReady && (
                <ConfigErrorNotice
                    serviceName="数据同步服务"
                    detail="当前环境缺少 Supabase 配置，无法读取同步日志或触发同步任务。请检查 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。"
                    className="animate-fade-in"
                />
            )}

            {error && (
                <div
                    className="datasync-error-banner"
                    style={{
                        marginBottom: '1rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        background: 'rgba(127, 29, 29, 0.18)',
                        color: 'var(--color-text-primary)',
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {/* Sync Cards */}
            <div className="datasync-cards">
                {syncItems.map((item, idx) => {
                    const isThisSyncing = syncingTypes.has(item.type);
                    return (
                        <div key={item.type} className={`datasync-card animate-fade-in-up delay-${idx + 1}`}>
                            <div className="datasync-card__icon-wrap">
                                <item.icon />
                            </div>
                            <h3 className="datasync-card__title">{item.title}</h3>
                            <p className="datasync-card__desc">{item.desc}</p>
                            <button
                                className="datasync-btn"
                                onClick={() => requestSync(item.type, item.title)}
                                disabled={isThisSyncing || !configReady}
                            >
                                {isThisSyncing ? (
                                    <>
                                        <RefreshCw className="datasync-spin" /> 同步中...
                                    </>
                                ) : '🚀 立即触发同步'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Logs Table */}
            <div className="datasync-logs">
                <div className="datasync-logs__header">
                    <h3 className="datasync-logs__title">
                        <Clock /> 近期同步日志
                    </h3>
                    <button
                        className={`datasync-logs__refresh${refreshing ? ' datasync-logs__refresh--active' : ''}`}
                        onClick={async () => {
                            setRefreshing(true);
                            await fetchLogs();
                            setTimeout(() => setRefreshing(false), 600);
                        }}
                        disabled={refreshing || !configReady}
                    >
                        <RefreshCw className={refreshing ? 'datasync-spin' : ''} />
                        {refreshing ? '刷新中...' : '刷新'}
                    </button>
                </div>

                <div className="datasync-table-wrap">
                    <table className="datasync-table">
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>任务类型</th>
                                <th>状态</th>
                                <th>更新条目数</th>
                                <th>耗时</th>
                                <th>详情</th>
                                <th>执行者</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="datasync-table__empty">
                                        暂无同步日志...
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className={log.status === 'RUNNING' ? 'datasync-row--running' : ''}>
                                        <td>{formatTime(log.created_at)}</td>
                                        <td>
                                            <span className="datasync-badge datasync-badge--type">
                                                {TASK_TYPE_LABELS[log.task_type] || log.task_type}
                                            </span>
                                        </td>
                                        <td>{renderStatus(log.status)}</td>
                                        <td className="datasync-table__records">
                                            {log.status === 'SUCCESS' && log.records_added != null
                                                ? <span className="datasync-records-count">{log.records_added.toLocaleString()}</span>
                                                : log.status === 'RUNNING'
                                                    ? <span className="datasync-records-pending">计算中...</span>
                                                    : '-'}
                                        </td>
                                        <td className="datasync-table__duration">
                                            {formatDuration(log) || '-'}
                                        </td>
                                        <td className="datasync-table__message">
                                            {log.message ? (
                                                <span
                                                    className="datasync-message-text"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setActiveDetail({ message: log.message, rect });
                                                    }}
                                                >
                                                    {log.message.length > 20 ? log.message.slice(0, 20) + '...' : log.message}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>{log.executed_by || 'system (cron)'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Popup */}
            {activeDetail && (
                <div className="datasync-detail-backdrop" onClick={() => setActiveDetail(null)}>
                    <div
                        className="datasync-detail-popup"
                        style={{
                            top: activeDetail.rect.bottom + 8,
                            left: Math.min(activeDetail.rect.left, window.innerWidth - 420),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="datasync-detail-popup__header">
                            <span>详情</span>
                            <button onClick={() => setActiveDetail(null)}><X size={14} /></button>
                        </div>
                        <div className="datasync-detail-popup__body">
                            {activeDetail.message}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.open && (
                <div className="datasync-modal-backdrop" onClick={cancelSync}>
                    <div className="datasync-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="datasync-modal__close" onClick={cancelSync}>
                            <X />
                        </button>
                        <div className="datasync-modal__icon">
                            <AlertCircle />
                        </div>
                        <h3 className="datasync-modal__title">确认执行同步</h3>
                        <p className="datasync-modal__desc">
                            确定要执行 <strong>{confirmModal.title}</strong> 增量同步吗？<br />
                            同步将在后台执行，不影响其他操作。
                        </p>
                        <div className="datasync-modal__actions">
                            <button className="datasync-modal__btn datasync-modal__btn--cancel" onClick={cancelSync}>
                                取消
                            </button>
                            <button className="datasync-modal__btn datasync-modal__btn--confirm" onClick={confirmAndSync}>
                                ✅ 确认同步
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
