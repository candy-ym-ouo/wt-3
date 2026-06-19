import { useState, useEffect } from 'react'

export default function KeySettings({ keyConfig, onSave, onCancel }) {
  const [config, setConfig] = useState({
    lanes: [...keyConfig.lanes],
    labels: [...keyConfig.labels],
    colors: [...keyConfig.colors]
  })
  const [recordingIndex, setRecordingIndex] = useState(-1)
  const [pressedKey, setPressedKey] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault()
      if (recordingIndex >= 0) {
        const code = e.code
        const label = e.key.length === 1 ? e.key.toUpperCase() : code.replace('Key', '')
        if (code.startsWith('Key') || code.startsWith('Digit')) {
          const newLanes = [...config.lanes]
          const newLabels = [...config.labels]
          newLanes[recordingIndex] = code
          newLabels[recordingIndex] = label
          setConfig({ ...config, lanes: newLanes, labels: newLabels })
          setRecordingIndex(-1)
        }
      }
      setPressedKey(e.code)
    }
    const handleKeyUp = () => {
      setPressedKey('')
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [recordingIndex, config])

  const handleColorChange = (index, color) => {
    const newColors = [...config.colors]
    newColors[index] = color
    setConfig({ ...config, colors: newColors })
  }

  const handleReset = () => {
    setConfig({
      lanes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
      labels: ['D', 'F', 'J', 'K'],
      colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
    })
  }

  const isDuplicate = (index) => {
    return config.lanes.some((l, i) => i !== index && l === config.lanes[index])
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgDecor}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.decorRing,
              width: `${150 + i * 60}px`,
              height: `${150 + i * 60}px`,
              borderColor: `${config.colors[i % 4]}22`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>

      <div style={styles.panel}>
        <div style={styles.header}>
          <h1 style={styles.title}>⚙ 键位设置</h1>
          <p style={styles.subtitle}>自定义你的演奏键位</p>
        </div>

        <div style={styles.keyGrid}>
          {config.lanes.map((lane, i) => (
            <div
              key={i}
              style={{
                ...styles.keyRow,
                borderColor: recordingIndex === i ? '#fff' : `${config.colors[i]}44`
              }}
            >
              <div style={styles.laneIndex}>
                轨道 {i + 1}
              </div>

              <div
                style={{
                  ...styles.keyDisplay,
                  borderColor: config.colors[i],
                  background: recordingIndex === i
                    ? `${config.colors[i]}33`
                    : pressedKey === lane ? `${config.colors[i]}55` : 'rgba(255,255,255,0.05)',
                  boxShadow: pressedKey === lane ? `0 0 30px ${config.colors[i]}` : 'none'
                }}
                onClick={() => setRecordingIndex(i)}
              >
                {recordingIndex === i ? (
                  <span style={styles.recordingText}>按下按键...</span>
                ) : (
                  <span style={{ ...styles.keyValue, color: config.colors[i] }}>
                    {config.labels[i]}
                  </span>
                )}
                <span style={styles.keyHint}>
                  {recordingIndex === i ? '录制中' : '点击修改'}
                </span>
              </div>

              <div style={styles.colorPicker}>
                <span style={styles.colorLabel}>颜色</span>
                <div style={styles.colorOptions}>
                  {['#ff3366', '#ff6633', '#ffcc00', '#66ff33', '#00ffcc', '#3399ff', '#6699ff', '#cc66ff'].map(color => (
                    <div
                      key={color}
                      style={{
                        ...styles.colorDot,
                        background: color,
                        transform: config.colors[i] === color ? 'scale(1.3)' : 'scale(1)',
                        boxShadow: config.colors[i] === color ? `0 0 15px ${color}` : 'none'
                      }}
                      onClick={() => handleColorChange(i, color)}
                    />
                  ))}
                </div>
              </div>

              {isDuplicate(i) && (
                <div style={styles.warning}>
                  ⚠ 键位重复
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.previewSection}>
          <h3 style={styles.previewTitle}>预览</h3>
          <div style={styles.previewLanes}>
            {config.labels.map((label, i) => (
              <div
                key={i}
                style={{
                  ...styles.previewLane,
                  background: `${config.colors[i]}22`,
                  borderColor: config.colors[i]
                }}
              >
                <span style={{ ...styles.previewKey, color: config.colors[i] }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.resetBtn} onClick={handleReset}>
            恢复默认
          </button>
          <div style={styles.actionsRight}>
            <button style={styles.cancelBtn} onClick={onCancel}>
              取消
            </button>
            <button
              style={styles.saveBtn}
              onClick={() => onSave(config)}
              disabled={config.lanes.some((l, i) => isDuplicate(i))}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: '#0a0a0f'
  },
  bgDecor: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  decorRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid',
    animation: 'pulse 3s ease-in-out infinite'
  },
  panel: {
    position: 'relative',
    zIndex: 1,
    width: '720px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'rgba(10,10,20,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '40px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 80px rgba(0,0,0,0.5)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '4px',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px'
  },
  keyGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px'
  },
  keyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1.5px solid',
    borderRadius: '12px',
    transition: 'all 0.2s'
  },
  laneIndex: {
    width: '70px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    fontWeight: 600
  },
  keyDisplay: {
    width: '140px',
    height: '60px',
    border: '2px solid',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  keyValue: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '2px'
  },
  recordingText: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
    animation: 'blink 0.8s infinite'
  },
  keyHint: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '2px'
  },
  colorPicker: {
    flex: 1
  },
  colorLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '6px',
    display: 'block'
  },
  colorOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  colorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  warning: {
    fontSize: '12px',
    color: '#ff4444',
    fontWeight: 600
  },
  previewSection: {
    marginBottom: '32px'
  },
  previewTitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    marginBottom: '12px',
    fontWeight: 600
  },
  previewLanes: {
    display: 'flex',
    gap: '10px'
  },
  previewLane: {
    flex: 1,
    height: '80px',
    border: '2px solid',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewKey: {
    fontSize: '28px',
    fontWeight: 800
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionsRight: {
    display: 'flex',
    gap: '12px'
  },
  resetBtn: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  cancelBtn: {
    padding: '12px 28px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  saveBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #00ffcc 0%, #00ccaa 100%)',
    border: 'none',
    color: '#00332a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    boxShadow: '0 4px 20px rgba(0,255,204,0.3)',
    transition: 'all 0.2s'
  }
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.05); opacity: 0.6; }
  }
`
document.head.appendChild(styleSheet)
