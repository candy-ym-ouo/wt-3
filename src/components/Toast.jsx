import { useState, useEffect, useCallback } from 'react'

let globalToast = null
let globalToastId = 0

export function setGlobalToastHandler(handler) {
  globalToast = handler
}

export const ToastType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
}

const TYPE_STYLES = {
  [ToastType.SUCCESS]: {
    icon: '✅',
    bg: 'linear-gradient(135deg, rgba(102,255,153,0.15), rgba(0,204,102,0.1))',
    border: 'rgba(102,255,153,0.4)',
    color: '#66ff99'
  },
  [ToastType.ERROR]: {
    icon: '❌',
    bg: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(204,0,51,0.1))',
    border: 'rgba(255,51,102,0.4)',
    color: '#ff6699'
  },
  [ToastType.WARNING]: {
    icon: '⚠️',
    bg: 'linear-gradient(135deg, rgba(255,204,0,0.15), rgba(204,153,0,0.1))',
    border: 'rgba(255,204,0,0.4)',
    color: '#ffcc00'
  },
  [ToastType.INFO]: {
    icon: 'ℹ️',
    bg: 'linear-gradient(135deg, rgba(102,153,255,0.15), rgba(51,102,204,0.1))',
    border: 'rgba(102,153,255,0.4)',
    color: '#6699ff'
  },
  [ToastType.LOADING]: {
    icon: '⏳',
    bg: 'linear-gradient(135deg, rgba(204,102,255,0.15), rgba(153,51,204,0.1))',
    border: 'rgba(204,102,255,0.4)',
    color: '#cc66ff'
  }
}

export function showToast(message, options = {}) {
  const {
    type = ToastType.INFO,
    duration = 3000,
    actionLabel,
    onAction,
    onClose,
    id
  } = options

  const toastId = id || `toast_${++globalToastId}_${Date.now()}`

  if (globalToast) {
    globalToast.show({
      id: toastId,
      message,
      type,
      duration,
      actionLabel,
      onAction,
      onClose
    })
  }

  return {
    id: toastId,
    dismiss: () => {
      if (globalToast) {
        globalToast.dismiss(toastId)
      }
    }
  }
}

export function showValidationToast(validationResult) {
  if (validationResult.isValid) {
    if (validationResult.warnings.length > 0) {
      return showToast(
        `导入成功！有 ${validationResult.warnings.length} 个警告需要注意`,
        { type: ToastType.WARNING, duration: 4000 }
      )
    }
    return showToast('导入成功！曲目已添加到列表', { type: ToastType.SUCCESS })
  } else {
    return showToast(
      `导入失败：${validationResult.errors.length} 个错误，${validationResult.warnings.length} 个警告`,
      { type: ToastType.ERROR, duration: 5000 }
    )
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((toast) => {
    setToasts(prev => [...prev, { ...toast, createdAt: Date.now() }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id)
      if (toast?.onClose) toast.onClose()
      return prev.filter(t => t.id !== id)
    })
  }, [])

  useEffect(() => {
    setGlobalToastHandler({ show, dismiss })
    return () => setGlobalToastHandler(null)
  }, [show, dismiss])

  useEffect(() => {
    const timers = []
    toasts.forEach(toast => {
      if (toast.type !== ToastType.LOADING && toast.duration > 0) {
        const timer = setTimeout(() => {
          dismiss(toast.id)
        }, toast.duration)
        timers.push(timer)
      }
    })
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismiss])

  if (toasts.length === 0) return null

  return (
    <div style={styles.container}>
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  )
}

function ToastItem({ toast, index, onDismiss }) {
  const [isEntering, setIsEntering] = useState(true)
  const style = TYPE_STYLES[toast.type] || TYPE_STYLES[ToastType.INFO]

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleAction = () => {
    if (toast.onAction) {
      toast.onAction()
    }
    onDismiss()
  }

  return (
    <div
      style={{
        ...styles.toast,
        ...(isEntering ? styles.toastEntering : {}),
        background: style.bg,
        borderColor: style.border,
        animationDelay: `${index * 50}ms`,
        marginTop: index === 0 ? 0 : 8
      }}
    >
      <span style={styles.icon}>{style.icon}</span>
      <div style={styles.content}>
        <div style={{ ...styles.message, color: style.color }}>{toast.message}</div>
        {toast.details && (
          <div style={styles.details}>{toast.details}</div>
        )}
      </div>
      {toast.actionLabel && (
        <button
          style={{
            ...styles.actionBtn,
            borderColor: style.border,
            color: style.color
          }}
          onClick={handleAction}
        >
          {toast.actionLabel}
        </button>
      )}
      <button style={styles.closeBtn} onClick={onDismiss}>×</button>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '420px',
    pointerEvents: 'none'
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    border: '1px solid',
    borderRadius: '12px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    pointerEvents: 'auto',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    animation: 'toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) both',
    minWidth: '280px'
  },
  toastEntering: {
    transform: 'translateX(100%)',
    opacity: 0
  },
  icon: {
    fontSize: 22,
    flexShrink: 0
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  message: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.4,
    wordBreak: 'break-word'
  },
  details: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4
  },
  actionBtn: {
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  closeBtn: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s',
    flexShrink: 0,
    padding: 0,
    lineHeight: 1
  }
}
