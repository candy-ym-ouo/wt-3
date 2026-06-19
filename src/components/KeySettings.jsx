import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/usePracticeStore.js'

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const THRESHOLD_OPTIONS = [
  { value: 'miss', label: 'Miss 及以下' },
  { value: 'good', label: 'Good 及以下' },
  { value: 'great', label: 'Great 及以下' },
  { value: 'perfect', label: '全部重放' }
]

export default function KeySettings({ keyConfig, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState('keys')
  const [config, setConfig] = useState({
    lanes: [...keyConfig.lanes],
    labels: [...keyConfig.labels],
    colors: [...keyConfig.colors]
  })
  const [recordingIndex, setRecordingIndex] = useState(-1)
  const [pressedKey, setPressedKey] = useState('')

  const practiceStore = usePracticeStore()
  const {
    settings: practiceSettings,
    setPlaybackSpeed,
    toggleTrackMute,
    setLoopMode,
    setReplayMisses,
    setReplayThreshold,
    setAutoProgress,
    setShowNotePreview,
    resetPracticeSettings
  } = practiceStore

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

  const handleResetAll = () => {
    handleReset()
    resetPracticeSettings()
  }

  const renderKeySettings = () => (
    <>
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
    </>
  )

  const renderPracticeSettings = () => (
    <div style={styles.practiceGrid}>
      <div style={styles.settingCard}>
        <div style={styles.settingCardHeader}>
          <span style={styles.settingCardIcon}>⏱</span>
          <span style={styles.settingCardTitle}>播放速度</span>
        </div>
        <div style={styles.speedButtons}>
          {SPEED_OPTIONS.map(speed => (
            <button
              key={speed}
              style={{
                ...styles.speedBtn,
                background: practiceSettings.playbackSpeed === speed
                  ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                  : 'rgba(255,255,255,0.05)',
                color: practiceSettings.playbackSpeed === speed ? '#00332a' : '#fff',
                boxShadow: practiceSettings.playbackSpeed === speed
                  ? '0 4px 20px rgba(0,255,204,0.3)'
                  : 'none'
              }}
              onClick={() => setPlaybackSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div style={styles.settingHint}>
          调整播放速度以适应不同练习阶段
        </div>
      </div>

      <div style={styles.settingCard}>
        <div style={styles.settingCardHeader}>
          <span style={styles.settingCardIcon}>🔇</span>
          <span style={styles.settingCardTitle}>轨道静音</span>
        </div>
        <div style={styles.trackMuteGrid}>
          {[
            { key: 'lead', label: '主旋律', color: '#ff3366' },
            { key: 'bass', label: '贝斯', color: '#ffcc00' },
            { key: 'chords', label: '和弦', color: '#00ffcc' },
            { key: 'drums', label: '鼓点', color: '#6699ff' }
          ].map(track => (
            <button
              key={track.key}
              style={{
                ...styles.trackMuteBtn,
                borderColor: track.color,
                background: practiceSettings.mutedTracks[track.key]
                  ? `${track.color}22`
                  : 'rgba(255,255,255,0.05)',
                opacity: practiceSettings.mutedTracks[track.key] ? 0.5 : 1
              }}
              onClick={() => toggleTrackMute(track.key)}
            >
              <span style={{ color: track.color, fontSize: '20px' }}>
                {practiceSettings.mutedTracks[track.key] ? '🔇' : '🔊'}
              </span>
              <span style={styles.trackMuteLabel}>{track.label}</span>
            </button>
          ))}
        </div>
        <div style={styles.settingHint}>
          静音特定轨道以便专注练习
        </div>
      </div>

      <div style={styles.settingCard}>
        <div style={styles.settingCardHeader}>
          <span style={styles.settingCardIcon}>🔁</span>
          <span style={styles.settingCardTitle}>循环模式</span>
        </div>
        <div style={styles.optionButtons}>
          {[
            { value: 'off', label: '关闭' },
            { value: 'section', label: '区段循环' },
            { value: 'full', label: '全曲循环' }
          ].map(opt => (
            <button
              key={opt.value}
              style={{
                ...styles.optionBtn,
                background: practiceSettings.loopMode === opt.value
                  ? 'linear-gradient(135deg, #6699ff, #4477dd)'
                  : 'rgba(255,255,255,0.05)',
                color: practiceSettings.loopMode === opt.value ? '#fff' : 'rgba(255,255,255,0.7)',
                boxShadow: practiceSettings.loopMode === opt.value
                  ? '0 4px 20px rgba(102,153,255,0.3)'
                  : 'none'
              }}
              onClick={() => setLoopMode(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={styles.settingHint}>
          在练习实验室中可选择具体区段
        </div>
      </div>

      <div style={styles.settingCard}>
        <div style={styles.settingCardHeader}>
          <span style={styles.settingCardIcon}>🎯</span>
          <span style={styles.settingCardTitle}>命中回放</span>
        </div>
        <div style={styles.toggleRow}>
          <span style={styles.toggleLabel}>自动重放失误段落</span>
          <button
            style={{
              ...styles.toggleBtn,
              background: practiceSettings.replayMisses
                ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                : 'rgba(255,255,255,0.1)'
            }}
            onClick={() => setReplayMisses(!practiceSettings.replayMisses)}
          >
            <div
              style={{
                ...styles.toggleKnob,
                transform: practiceSettings.replayMisses ? 'translateX(20px)' : 'translateX(0)'
              }}
            />
          </button>
        </div>
        <div style={styles.thresholdSection}>
          <span style={styles.thresholdLabel}>重放判定阈值</span>
          <div style={styles.thresholdButtons}>
            {THRESHOLD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                style={{
                  ...styles.thresholdBtn,
                  background: practiceSettings.replayThreshold === opt.value
                    ? 'linear-gradient(135deg, #ffcc00, #ff9900)'
                    : 'rgba(255,255,255,0.05)',
                  color: practiceSettings.replayThreshold === opt.value ? '#332200' : 'rgba(255,255,255,0.7)',
                  opacity: practiceSettings.replayMisses ? 1 : 0.4,
                  cursor: practiceSettings.replayMisses ? 'pointer' : 'not-allowed'
                }}
                onClick={() => practiceSettings.replayMisses && setReplayThreshold(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.settingCard}>
        <div style={styles.settingCardHeader}>
          <span style={styles.settingCardIcon}>⚡</span>
          <span style={styles.settingCardTitle}>其他选项</span>
        </div>
        <div style={styles.optionList}>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>自动进度</span>
            <button
              style={{
                ...styles.toggleBtn,
                background: practiceSettings.autoProgress
                  ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                  : 'rgba(255,255,255,0.1)'
              }}
              onClick={() => setAutoProgress(!practiceSettings.autoProgress)}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: practiceSettings.autoProgress ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
          </div>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>音符预览</span>
            <button
              style={{
                ...styles.toggleBtn,
                background: practiceSettings.showNotePreview
                  ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                  : 'rgba(255,255,255,0.1)'
              }}
              onClick={() => setShowNotePreview(!practiceSettings.showNotePreview)}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: practiceSettings.showNotePreview ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

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
          <h1 style={styles.title}>⚙ 设置</h1>
          <p style={styles.subtitle}>
            {activeTab === 'keys' ? '自定义你的演奏键位' : '配置练习实验室参数'}
          </p>
        </div>

        <div style={styles.tabBar}>
          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'keys' ? '#00ffcc' : 'transparent',
              color: activeTab === 'keys' ? '#00ffcc' : 'rgba(255,255,255,0.5)'
            }}
            onClick={() => setActiveTab('keys')}
          >
            🎹 键位设置
          </button>
          <button
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'practice' ? '#00ffcc' : 'transparent',
              color: activeTab === 'practice' ? '#00ffcc' : 'rgba(255,255,255,0.5)'
            }}
            onClick={() => setActiveTab('practice')}
          >
            🧪 练习实验室
          </button>
        </div>

        {activeTab === 'keys' && renderKeySettings()}
        {activeTab === 'practice' && renderPracticeSettings()}

        <div style={styles.actions}>
          <button style={styles.resetBtn} onClick={handleResetAll}>
            恢复默认
          </button>
          <div style={styles.actionsRight}>
            <button style={styles.cancelBtn} onClick={onCancel}>
              取消
            </button>
            <button
              style={styles.saveBtn}
              onClick={() => onSave(config)}
              disabled={activeTab === 'keys' && config.lanes.some((l, i) => isDuplicate(i))}
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
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '32px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  tabBtn: {
    flex: 1,
    padding: '16px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  practiceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '32px'
  },
  settingCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px'
  },
  settingCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  settingCardIcon: {
    fontSize: '24px'
  },
  settingCardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#fff'
  },
  settingHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '12px'
  },
  speedButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  speedBtn: {
    padding: '12px 8px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  trackMuteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  trackMuteBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    border: '2px solid',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  trackMuteLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)'
  },
  optionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  optionBtn: {
    padding: '14px 16px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  toggleLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500
  },
  toggleBtn: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '2px'
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'all 0.2s'
  },
  thresholdSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  thresholdLabel: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px'
  },
  thresholdButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  thresholdBtn: {
    padding: '10px 12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    opacity: 0.5
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
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
