import { useEffect } from 'react';
import useUIStore from '../../stores/useUIStore';
import './ToastViewport.css';

const TOAST_ICONS = {
    success: '✅',
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
};

export default function ToastViewport() {
    const { toasts, removeToast } = useUIStore();

    useEffect(() => {
        const timers = toasts.map((toast) => (
            window.setTimeout(() => removeToast(toast.id), toast.duration ?? 3000)
        ));

        return () => {
            timers.forEach(window.clearTimeout);
        };
    }, [removeToast, toasts]);

    if (toasts.length === 0) return null;

    return (
        <div className="toast-viewport" aria-live="polite" aria-atomic="true">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast--${toast.type || 'info'}`}
                    role="status"
                >
                    <span className="toast__icon">{TOAST_ICONS[toast.type] || TOAST_ICONS.info}</span>
                    <span className="toast__message">{toast.message}</span>
                    <button
                        type="button"
                        className="toast__close"
                        onClick={() => removeToast(toast.id)}
                        aria-label="关闭提示"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
