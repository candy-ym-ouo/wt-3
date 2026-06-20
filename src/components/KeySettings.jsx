import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePracticeStore } from '../store/usePracticeStore.js'
import { useKeyPresetStore } from '../store/useKeyPresetStore.js'

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

  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveDialogType, setSaveDialogType] = useState('save')
  const [newPresetName, setNewPresetName] = useState('')
  const [editingPresetId, setEditingPresetId] = useState(null)
  const [editingPresetName, setEditingPresetName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const presetSelectorBtnRef = useRef(null)
  const presetMenuRef = useRef(null)
  const saveDialogRef = useRef(null)

  const keyPresetStore = useKeyPresetStore()
  const {
    presets,
    currentPresetId,
    switchPreset,
    savePreset,
    createPreset,
    renamePreset,
    deletePreset,
    checkConflicts,
    resetPresets
  } = keyPresetStore

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

  const currentPreset = presets.find(p => p.id === currentPresetId)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target) &&
        presetSelectorBtnRef.current &&
        !presetSelectorBtnRef.current.contains(e.target)
      ) {
        setShowPresetMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault()
      if (recordingIndex >= 0) {
        const code = e.code
        const label = e.key.length === 1 ? e.key.toUpperCase() : code.replace('Key', '')
        if (code.startsWith('Key') || code.startsWith('Digit') || code.startsWith('Arrow')) {
          const newLanes = [...config.lanes]
          const newLabels = [...config.labels]
          newLanes[recordingIndex] = code
          newLabels[recordingIndex] = label
          setConfig({ ...config, lanes: newLanes, labels: newLabels })
          setRecordingIndex(-1)
          setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
  }

  const handleReset = () => {
    setConfig({
      lanes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
      labels: ['D', 'F', 'J', 'K'],
      colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
    })
    setHasUnsavedChanges(true)
  }

  const conflicts = checkConflicts(config.lanes)
  const isDuplicate = (index) => {
    return conflicts.some(c => c.indices.includes(index))
  }

  const getConflictInfo = (index) => {
    return conflicts.find(c => c.indices.includes(index))
  }

  const handleResetAll = () => {
    handleReset()
    resetPracticeSettings()
    resetPresets()
  }

  const handleSwitchPreset = (presetId) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      switchPreset(presetId)
      setConfig({
        lanes: [...preset.lanes],
        labels: [...preset.labels],
        colors: [...preset.colors]
      })
      setHasUnsavedChanges(false)
    }
    setShowPresetMenu(false)
  }

  const handleSaveCurrent = () => {
    if (currentPreset && !currentPreset.isDefault) {
      savePreset(currentPresetId, config)
      setHasUnsavedChanges(false)
    }
  }

  const handleOpenSaveAs = () => {
    setSaveDialogType('saveas')
    setNewPresetName('')
    setShowSaveDialog(true)
  }

  const handleSaveAs = () => {
    if (newPresetName.trim()) {
      createPreset(newPresetName.trim(), config)
      setHasUnsavedChanges(false)
      setShowSaveDialog(false)
      setNewPresetName('')
    }
  }

  const handleStartRename = (preset) => {
    setEditingPresetId(preset.id)
    setEditingPresetName(preset.name)
  }

  const handleFinishRename = () => {
    if (editingPresetId && editingPresetName.trim()) {
      renamePreset(editingPresetId, editingPresetName.trim())
    }
    setEditingPresetId(null)
    setEditingPresetName('')
  }

  const handleDeletePreset = (presetId) => {
    if (presets.length <= 1) return
    const preset = presets.find(p => p.id === presetId)
    if (preset && preset.isDefault) return
    if (confirm('确定要删除此方案吗？')) {
      deletePreset(presetId)
    }
  }

  const updateDropdownPosition = useCallback(() => {
    if (presetSelectorBtnRef.current) {
      const rect = presetSelectorBtnRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      })
    }
  }, [])

  const handleTogglePresetMenu = () => {
    if (!showPresetMenu) {
      updateDropdownPosition()
    }
    setShowPresetMenu(!showPresetMenu)
  }

  useEffect(() => {
    if (showPresetMenu) {
      updateDropdownPosition()
      window.addEventListener('resize', updateDropdownPosition)
      window.addEventListener('scroll', updateDropdownPosition, true)
      return () => {
        window.removeEventListener('resize', updateDropdownPosition)
        window.removeEventListener('scroll', updateDropdownPosition, true)
      }
    }
  }, [showPresetMenu, updateDropdownPosition])

  const renderPresetDropdown = () => {
    if (!showPresetMenu) return null

    return createPortal(
      <div
        ref={presetMenuRef}
        style={{
          ...styles.presetDropdown,
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width
        }}
      >
        <div style={styles.presetDropdownHeader}>
          <span style={styles.presetDropdownTitle}>方案列表</span>
        </div>
        <div style={styles.presetList}>
          {presets.map(preset => (
            <div
              key={preset.id}
              style={{
                ...styles.presetItem,
                background: preset.id === currentPresetId ? 'rgba(0,255,204,0.1)' : 'transparent',
                borderColor: preset.id === currentPresetId ? '#00ffcc' : 'transparent'
              }}
            >
              {editingPresetId === preset.id ? (
                <input
                  style={styles.presetNameInput}
                  value={editingPresetName}
                  onChange={(e) => setEditingPresetName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename()
                    if (e.key === 'Escape') {
                      setEditingPresetId(null)
                      setEditingPresetName('')
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div style={styles.presetItemMain} onClick={() => handleSwitchPreset(preset.id)}>
                  <span style={styles.presetItemName}>{preset.name}</span>
                  {preset.isDefault && (
                    <span style={styles.presetDefaultBadge}>默认</span>
                  )}
                  {preset.id === currentPresetId && (
                    <span style={styles.presetActiveIcon}>✓</span>
                  )}
                </div>
              )}
              {!preset.isDefault && editingPresetId !== preset.id && (
                <div style={styles.presetItemActions}>
                  <button
                    style={styles.presetActionBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartRename(preset)
                    }}
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    style={styles.presetActionBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePreset(preset.id)
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={styles.presetDropdownActions}>
          <button style={styles.presetDropdownBtn} onClick={handleOpenSaveAs}>
            ➕ 另存为新方案
          </button>
        </div>
      </div>,
      document.body
    )
  }

  const renderPresetSelector = () => (
    <div style={styles.presetSelector}>
      <div style={styles.presetLabel}>
        <span style={styles.presetLabelText}>当前方案</span>
      </div>
      <button
        ref={presetSelectorBtnRef}
        style={styles.presetSelectorBtn}
        onClick={handleTogglePresetMenu}
      >
        <span style={styles.presetSelectorIcon}>📋</span>
        <span style={styles.presetSelectorName}>
          {currentPreset?.name || '未选择'}
          {hasUnsavedChanges && <span style={styles.unsavedDot}>•</span>}
        </span>
        <span style={{ ...styles.presetSelectorArrow, transform: showPresetMenu ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▼
        </span>
      </button>

      {renderPresetDropdown()}

      {hasUnsavedChanges && (
        <button
          style={styles.saveQuickBtn}
          onClick={handleSaveCurrent}
          disabled={currentPreset?.isDefault}
          title={currentPreset?.isDefault ? '默认方案不可修改，请使用"另存为"' : '保存修改到当前方案'}
        >
          💾 保存
        </button>
      )}
    </div>
  )

  const renderSaveDialog = () => {
    if (!showSaveDialog) return null

    return createPortal(
      <div style={styles.dialogOverlay} onClick={() => setShowSaveDialog(false)}>
        <div style={styles.dialog} ref={saveDialogRef} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.dialogTitle}>
            {saveDialogType === 'saveas' ? '另存为新方案' : '保存方案'}
          </h3>
          <input
            style={styles.dialogInput}
            placeholder="请输入方案名称"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAs()
              if (e.key === 'Escape') setShowSaveDialog(false)
            }}
            autoFocus
          />
          <div style={styles.dialogActions}>
            <button style={styles.dialogCancelBtn} onClick={() => setShowSaveDialog(false)}>
              取消
            </button>
            <button
              style={styles.dialogConfirmBtn}
              onClick={handleSaveAs}
              disabled={!newPresetName.trim()}
            >
              保存
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  const renderConflictSummary = () => {
    if (conflicts.length === 0) return null

    return (
      <div style={styles.conflictSummary}>
        <div style={styles.conflictSummaryIcon}>⚠️</div>
        <div style={styles.conflictSummaryText}>
          检测到 <span style={styles.conflictCount}>{conflicts.length}</span> 个键位冲突
        </div>
        <div style={styles.conflictDetails}>
          {conflicts.map((c, i) => (
            <span key={i} style={styles.conflictDetailTag}>
              {config.labels[c.indices[0]] || c.key} 重复
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderKeySettings = () => (
    <>
      {renderPresetSelector()}

      <div style={styles.keyGrid}>
        {config.lanes.map((lane, i) => {
          const hasConflict = isDuplicate(i)
          const conflictInfo = getConflictInfo(i)

          return (
            <div
              key={i}
              style={{
                ...styles.keyRow,
                borderColor: recordingIndex === i
                  ? '#fff'
                  : hasConflict
                    ? '#ff4444'
                    : `${config.colors[i]}44`,
                boxShadow: hasConflict ? '0 0 20px rgba(255,68,68,0.2)' : 'none'
              }}
            >
              <div style={styles.laneIndex}>
                轨道 {i + 1}
              </div>

              <div
                style={{
                  ...styles.keyDisplay,
                  borderColor: hasConflict ? '#ff4444' : config.colors[i],
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
                  <span style={{ ...styles.keyValue, color: hasConflict ? '#ff4444' : config.colors[i] }}>
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

              {hasConflict && conflictInfo && (
                <div style={styles.warning}>
                  ⚠ 与轨道 {conflictInfo.indices.filter(idx => idx !== i).map(idx => idx + 1).join('、')} 冲突
                </div>
              )}
            </div>
          )
        })}
      </div>

      {renderConflictSummary()}

      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>预览</h3>
        <div style={styles.previewLanes}>
          {config.labels.map((label, i) => (
            <div
              key={i}
              style={{
                ...styles.previewLane,
                background: `${config.colors[i]}22`,
                borderColor: isDuplicate(i) ? '#ff4444' : config.colors[i]
              }}
            >
              <span style={{ ...styles.previewKey, color: isDuplicate(i) ? '#ff4444' : config.colors[i] }}>
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

  const handleSaveAndClose = () => {
    if (activeTab === 'keys' && conflicts.length > 0) return
    if (activeTab === 'keys' && hasUnsavedChanges && !currentPreset?.isDefault) {
      savePreset(currentPresetId, config)
    }
    onSave(config)
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
              onClick={handleSaveAndClose}
              disabled={activeTab === 'keys' && conflicts.length > 0}
            >
              {activeTab === 'keys' && conflicts.length > 0 ? '存在冲突' : '保存设置'}
            </button>
          </div>
        </div>
      </div>

      {renderSaveDialog()}
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
  presetSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    position: 'relative'
  },
  presetLabel: {
    display: 'flex',
    alignItems: 'center'
  },
  presetLabelText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    fontWeight: 600
  },
  presetSelectorBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  presetSelectorIcon: {
    fontSize: '18px'
  },
  presetSelectorName: {
    flex: 1,
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  unsavedDot: {
    color: '#ffcc00',
    fontSize: '20px',
    animation: 'blink 1s infinite'
  },
  presetSelectorArrow: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    transition: 'transform 0.2s'
  },
  presetDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '8px',
    background: 'rgba(20,20,35,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    zIndex: 100
  },
  presetDropdownHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  presetDropdownTitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    fontWeight: 600
  },
  presetList: {
    maxHeight: '240px',
    overflowY: 'auto'
  },
  presetItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    borderLeft: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    gap: '10px'
  },
  presetItemMain: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  presetItemName: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 500,
    flex: 1
  },
  presetDefaultBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    background: 'rgba(102,153,255,0.2)',
    color: '#6699ff',
    borderRadius: '4px',
    fontWeight: 600
  },
  presetActiveIcon: {
    color: '#00ffcc',
    fontWeight: 700,
    fontSize: '14px'
  },
  presetItemActions: {
    display: 'flex',
    gap: '4px'
  },
  presetActionBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s'
  },
  presetNameInput: {
    flex: 1,
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid #00ffcc',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none'
  },
  presetDropdownActions: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  presetDropdownBtn: {
    width: '100%',
    padding: '10px',
    background: 'rgba(0,255,204,0.1)',
    border: '1px dashed rgba(0,255,204,0.3)',
    borderRadius: '8px',
    color: '#00ffcc',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  saveQuickBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #00ffcc 0%, #00ccaa 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#00332a',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  keyGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
    position: 'relative'
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
    fontWeight: 600,
    minWidth: '100px'
  },
  conflictSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px 20px',
    marginBottom: '24px',
    background: 'rgba(255,68,68,0.08)',
    border: '1px solid rgba(255,68,68,0.3)',
    borderRadius: '12px'
  },
  conflictSummaryIcon: {
    fontSize: '20px'
  },
  conflictSummaryText: {
    fontSize: '13px',
    color: '#ff6666',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  conflictCount: {
    color: '#ff4444',
    fontWeight: 800,
    fontSize: '16px'
  },
  conflictDetails: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  conflictDetailTag: {
    fontSize: '11px',
    padding: '4px 10px',
    background: 'rgba(255,68,68,0.2)',
    border: '1px solid rgba(255,68,68,0.4)',
    borderRadius: '6px',
    color: '#ff8888'
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
  },
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  dialog: {
    width: '360px',
    background: 'rgba(20,20,35,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  dialogTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '20px',
    textAlign: 'center',
    letterSpacing: '2px'
  },
  dialogInput: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '20px',
    boxSizing: 'border-box'
  },
  dialogActions: {
    display: 'flex',
    gap: '12px'
  },
  dialogCancelBtn: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  dialogConfirmBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #00ffcc 0%, #00ccaa 100%)',
    border: 'none',
    color: '#00332a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
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
