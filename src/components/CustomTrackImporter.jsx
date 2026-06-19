import { useState, useRef, useMemo, useCallback } from 'react'
import {
  parseChart,
  detectFormat,
  readFileAsText,
  SUPPORTED_FORMATS,
  ChartParseError
} from '../data/chartParser.js'
import {
  validateTrack,
  autoFixTrack,
  getValidationSummary,
  ValidationSeverity
} from '../data/trackValidator.js'
import { showToast, ToastType, showValidationToast } from './Toast.jsx'
import { DIFFICULTIES } from '../data/tracks.js'

export default function CustomTrackImporter({
  isOpen,
  onClose,
  onImport,
  existingTracks = []
}) {
  const [step, setStep] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [detectedFormat, setDetectedFormat] = useState(null)
  const [rawContent, setRawContent] = useState('')
  const [parsedTrack, setParsedTrack] = useState(null)
  const [editingTrack, setEditingTrack] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const fileInputRef = useRef(null)

  const validationSummary = useMemo(() => {
    if (!validationResult) return null
    return getValidationSummary(validationResult)
  }, [validationResult])

  const resetState = useCallback(() => {
    setStep('upload')
    setSelectedFile(null)
    setDetectedFormat(null)
    setRawContent('')
    setParsedTrack(null)
    setEditingTrack(null)
    setValidationResult(null)
    setIsProcessing(false)
    setShowIssues(false)
  }, [])

  const handleClose = () => {
    resetState()
    onClose?.()
  }

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showToast(`文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，最大支持5MB`, {
        type: ToastType.ERROR,
        duration: 4000
      })
      return
    }

    setIsProcessing(true)
    setSelectedFile(file)

    try {
      const content = await readFileAsText(file)
      setRawContent(content)

      const format = detectFormat(file.name, content)
      setDetectedFormat(format)

      const track = parseChart(content, format)
      setParsedTrack(track)
      setEditingTrack(track)

      const result = validateTrack(track, existingTracks)
      setValidationResult(result)

      setStep('preview')
    } catch (error) {
      console.error('Parse error:', error)
      let message = '文件解析失败'
      if (error instanceof ChartParseError) {
        message = error.message
        if (error.line) message += ` (第${error.line}行)`
        if (error.field) message += ` [字段: ${error.field}]`
      } else if (error.message) {
        message = error.message
      }
      showToast(message, { type: ToastType.ERROR, duration: 5000 })
      setSelectedFile(null)
    } finally {
      setIsProcessing(false)
    }
  }, [existingTracks])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFormatChange = useCallback(async (format) => {
    if (!rawContent) return
    setIsProcessing(true)
    try {
      const track = parseChart(rawContent, format)
      setParsedTrack(track)
      setEditingTrack(track)
      const result = validateTrack(track, existingTracks)
      setValidationResult(result)
      setDetectedFormat(format)
    } catch (error) {
      let message = '解析失败'
      if (error instanceof ChartParseError) {
        message = error.message
        if (error.line) message += ` (第${error.line}行)`
      }
      showToast(message, { type: ToastType.ERROR, duration: 4000 })
    } finally {
      setIsProcessing(false)
    }
  }, [rawContent, existingTracks])

  const handleAutoFix = useCallback(() => {
    if (!editingTrack || !validationResult) return
    const fixed = autoFixTrack(editingTrack, validationResult)
    setEditingTrack(fixed)
    const result = validateTrack(fixed, existingTracks)
    setValidationResult(result)
    showToast('已自动修复可修正的问题', { type: ToastType.INFO })
  }, [editingTrack, validationResult, existingTracks])

  const handleEditField = (field, value) => {
    if (!editingTrack) return
    setEditingTrack(prev => {
      const updated = { ...prev }
      const fields = field.split('.')
      let ref = updated
      for (let i = 0; i < fields.length - 1; i++) {
        ref[fields[i]] = { ...ref[fields[i]] }
        ref = ref[fields[i]]
      }
      ref[fields[fields.length - 1]] = value
      return updated
    })
  }

  const handleReValidate = useCallback(() => {
    if (!editingTrack) return
    const result = validateTrack(editingTrack, existingTracks)
    setValidationResult(result)
    showValidationToast(result)
  }, [editingTrack, existingTracks])

  const handleConfirmImport = useCallback(() => {
    if (!editingTrack || !validationResult?.isValid) {
      if (validationResult && !validationResult.isValid) {
        showToast(`存在 ${validationResult.errors.length} 个错误，无法导入`, {
          type: ToastType.ERROR,
          actionLabel: '查看错误',
          onAction: () => setShowIssues(true)
        })
      }
      return
    }

    const finalTrack = { ...editingTrack }
    if (Array.isArray(finalTrack.difficulties)) {
      finalTrack.difficulties = finalTrack.difficulties.map(d => ({
        ...d,
        totalNotes: d.notes?.length || 0
      }))
    }

    onImport?.(finalTrack)
    showToast(`曲目「${finalTrack.title}」导入成功！`, { type: ToastType.SUCCESS })
    handleClose()
  }, [editingTrack, validationResult, onImport, handleClose])

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div
        style={styles.modal}
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📥</span>
            <h2 style={styles.headerTitle}>自定义曲目导入</h2>
          </div>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.steps}>
          {['upload', 'preview'].map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{
                ...styles.stepNum,
                ...(step === s ? styles.stepNumActive : {}),
                ...(step !== s && i < ['upload', 'preview'].indexOf(step) ? styles.stepNumDone : {})
              }}>
                {step !== s && i < ['upload', 'preview'].indexOf(step) ? '✓' : i + 1}
              </div>
              <span style={{
                ...styles.stepLabel,
                ...(step === s ? styles.stepLabelActive : {})
              }}>
                {s === 'upload' ? '选择文件' : '预览确认'}
              </span>
              {i < 1 && <div style={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div style={styles.body}>
          {step === 'upload' && (
            <UploadStep
              dragOver={dragOver}
              isProcessing={isProcessing}
              selectedFile={selectedFile}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInput={() => fileInputRef.current?.click()}
              fileInputRef={fileInputRef}
              onFileSelected={(e) => handleFileSelect(e.target.files?.[0])}
              onSelectSample={() => loadSampleChart(handleFileSelect)}
            />
          )}

          {step === 'preview' && editingTrack && validationResult && (
            <PreviewStep
              track={editingTrack}
              validationResult={validationResult}
              validationSummary={validationSummary}
              detectedFormat={detectedFormat}
              rawContent={rawContent}
              selectedFile={selectedFile}
              showIssues={showIssues}
              isProcessing={isProcessing}
              onFormatChange={handleFormatChange}
              onEditField={handleEditField}
              onToggleIssues={() => setShowIssues(v => !v)}
              onAutoFix={handleAutoFix}
              onReValidate={handleReValidate}
              onBack={() => setStep('upload')}
              onConfirm={handleConfirmImport}
            />
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerInfo}>
            {step === 'preview' && validationResult && (
              <span style={{
                color: validationResult.isValid ? '#66ff99' : '#ff6699',
                fontSize: 12,
                fontWeight: 600
              }}>
                {validationResult.isValid
                  ? `✓ 校验通过，可导入`
                  : `✗ 存在 ${validationResult.errors.length} 个错误`
                }
              </span>
            )}
          </div>
          <div style={styles.footerBtns}>
            {step === 'preview' && (
              <button
                style={styles.backBtn}
                onClick={() => setStep('upload')}
              >
                ← 返回
              </button>
            )}
            <button
              style={styles.backBtn}
              onClick={handleClose}
            >
              取消
            </button>
            {step === 'preview' && (
              <button
                style={{
                  ...styles.importBtn,
                  ...(!validationResult?.isValid ? styles.importBtnDisabled : {})
                }}
                onClick={handleConfirmImport}
                disabled={!validationResult?.isValid || isProcessing}
              >
                📥 确认导入
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadStep({
  dragOver,
  isProcessing,
  selectedFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  fileInputRef,
  onFileSelected,
  onSelectSample
}) {
  return (
    <>
      <div
        style={{
          ...styles.dropZone,
          ...(dragOver ? styles.dropZoneActive : {}),
          ...(selectedFile ? styles.dropZoneHasFile : {})
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onFileInput}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.sm,.chart"
          style={styles.fileInput}
          onChange={onFileSelected}
        />
        {isProcessing ? (
          <div style={styles.processing}>
            <div style={styles.spinner} />
            <span style={styles.processingText}>正在解析文件...</span>
          </div>
        ) : selectedFile ? (
          <div style={styles.fileInfo}>
            <span style={styles.fileIcon}>📄</span>
            <div style={styles.fileDetails}>
              <div style={styles.fileName}>{selectedFile.name}</div>
              <div style={styles.fileSize}>
                {(selectedFile.size / 1024).toFixed(2)} KB
              </div>
            </div>
            <span style={styles.reselectHint}>点击重新选择</span>
          </div>
        ) : (
          <>
            <div style={styles.dropIcon}>⬆️</div>
            <div style={styles.dropTitle}>拖放谱面文件到此处</div>
            <div style={styles.dropHint}>
              或 <span style={styles.dropLink}>点击选择文件</span>
            </div>
          </>
        )}
      </div>

      <div style={styles.formatsSection}>
        <div style={styles.sectionTitle}>支持的格式</div>
        <div style={styles.formatsGrid}>
          {SUPPORTED_FORMATS.map(fmt => (
            <div key={fmt.id} style={styles.formatCard}>
              <div style={styles.formatHeader}>
                <code style={styles.formatExt}>{fmt.extension}</code>
                <span style={styles.formatName}>{fmt.name}</span>
              </div>
              <div style={styles.formatDesc}>{fmt.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.sampleSection}>
        <button style={styles.sampleBtn} onClick={onSelectSample}>
          📝 加载示例谱面（JSON格式）
        </button>
      </div>
    </>
  )
}

function PreviewStep({
  track,
  validationResult,
  validationSummary,
  detectedFormat,
  selectedFile,
  showIssues,
  onFormatChange,
  onEditField,
  onToggleIssues,
  onAutoFix,
  onReValidate,
  onBack,
  onConfirm
}) {
  const issuesBySeverity = {
    error: validationResult.errors,
    warning: validationResult.warnings,
    info: validationResult.infos
  }

  const formatInfo = SUPPORTED_FORMATS.find(f => f.id === detectedFormat)

  return (
    <div style={styles.previewContainer}>
      <div style={styles.previewLeft}>
        <div style={styles.formatSelectorRow}>
          <span style={styles.formatLabel}>文件格式:</span>
          <select
            value={detectedFormat || 'json'}
            onChange={(e) => onFormatChange(e.target.value)}
            style={styles.formatSelect}
          >
            {SUPPORTED_FORMATS.map(fmt => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.name} ({fmt.extension})
              </option>
            ))}
          </select>
          {selectedFile && (
            <span style={styles.sourceFile}>
              📄 {selectedFile.name}
            </span>
          )}
        </div>

        <div style={styles.editSection}>
          <div style={styles.editSectionTitle}>📋 曲目信息</div>

          <div style={styles.editGrid}>
            <FieldInput
              label="曲目标题"
              value={track.title}
              onChange={(v) => onEditField('title', v)}
              required
              hasError={validationResult.errors.some(i => i.field === 'title')}
            />
            <FieldInput
              label="艺术家"
              value={track.artist}
              onChange={(v) => onEditField('artist', v)}
            />
            <FieldInput
              label="风格类型"
              value={track.genre || ''}
              onChange={(v) => onEditField('genre', v)}
            />
            <FieldInput
              label="BPM"
              type="number"
              value={track.bpm}
              onChange={(v) => onEditField('bpm', parseFloat(v) || 0)}
              required
              hasError={validationResult.errors.some(i => i.field === 'bpm')}
              min={30}
              max={600}
            />
            <FieldInput
              label="时长(秒)"
              type="number"
              value={track.duration}
              onChange={(v) => onEditField('duration', parseFloat(v) || 0)}
              required
              hasError={validationResult.errors.some(i => i.field === 'duration')}
              min={1}
              max={3600}
            />
            <div />
            <FieldInput
              label="主旋律波形"
              value={track.synth?.leadOsc || 'sawtooth'}
              onChange={(v) => onEditField('synth.leadOsc', v)}
              selectOptions={[
                { value: 'sine', label: 'Sine (正弦波)' },
                { value: 'square', label: 'Square (方波)' },
                { value: 'sawtooth', label: 'Sawtooth (锯齿波)' },
                { value: 'triangle', label: 'Triangle (三角波)' }
              ]}
            />
            <FieldInput
              label="贝斯波形"
              value={track.synth?.bassOsc || 'sine'}
              onChange={(v) => onEditField('synth.bassOsc', v)}
              selectOptions={[
                { value: 'sine', label: 'Sine (正弦波)' },
                { value: 'square', label: 'Square (方波)' },
                { value: 'sawtooth', label: 'Sawtooth (锯齿波)' },
                { value: 'triangle', label: 'Triangle (三角波)' }
              ]}
            />
          </div>
        </div>

        <div style={styles.editSection}>
          <div style={styles.editSectionTitle}>🎨 封面与描述</div>
          <div style={styles.editGrid}>
            <FieldInput
              label="封面渐变颜色1"
              value={track.preview?.coverGradient?.[0] || '#ff3366'}
              type="color"
              onChange={(v) => {
                const arr = [...(track.preview?.coverGradient || ['#ff3366', '#6633ff'])]
                arr[0] = v
                onEditField('preview.coverGradient', arr)
              }}
            />
            <FieldInput
              label="封面渐变颜色2"
              value={track.preview?.coverGradient?.[1] || '#6633ff'}
              type="color"
              onChange={(v) => {
                const arr = [...(track.preview?.coverGradient || ['#ff3366', '#6633ff'])]
                arr[1] = v
                onEditField('preview.coverGradient', arr)
              }}
            />
          </div>
          <div style={styles.textAreaGroup}>
            <label style={styles.fieldLabel}>曲目描述</label>
            <textarea
              value={track.preview?.description || ''}
              onChange={(e) => onEditField('preview.description', e.target.value)}
              style={styles.textArea}
              rows={3}
              placeholder="简短描述这首曲目..."
            />
          </div>
          <div style={styles.textAreaGroup}>
            <label style={styles.fieldLabel}>标签（逗号分隔）</label>
            <input
              type="text"
              value={Array.isArray(track.preview?.tags) ? track.preview.tags.join(', ') : ''}
              onChange={(e) => onEditField('preview.tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              style={styles.input}
              placeholder="电子, 高速, 治愈"
            />
          </div>
        </div>

        <div style={styles.editSection}>
          <div style={styles.editSectionTitle}>🎮 难度概览</div>
          <div style={styles.difficultyList}>
            {track.difficulties?.map((diff, i) => {
              const diffMeta = Object.values(DIFFICULTIES).find(d => d.id === diff.id) || DIFFICULTIES.NORMAL
              return (
                <div
                  key={diff.id || i}
                  style={{
                    ...styles.difficultyItem,
                    borderColor: diff.color || diffMeta.color
                  }}
                >
                  <div style={styles.diffHeader}>
                    <span style={{
                      ...styles.diffBadge,
                      background: (diff.color || diffMeta.color) + '22',
                      color: diff.color || diffMeta.color,
                      borderColor: diff.color || diffMeta.color
                    }}>
                      {diff.name}
                    </span>
                    <span style={styles.diffLevel}>Lv.{diff.level}</span>
                  </div>
                  <div style={styles.diffStats}>
                    <span>🎵 {diff.notes?.length || 0} 音符</span>
                    <span>📊 预估总音符: {diff.totalNotes || diff.notes?.length || 0}</span>
                  </div>
                </div>
              )
            })}
            {(!track.difficulties || track.difficulties.length === 0) && (
              <div style={styles.emptyDiffs}>暂无难度数据</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.previewRight}>
        <div style={{
          ...styles.validationCard,
          borderColor: validationResult.isValid
            ? 'rgba(102,255,153,0.4)'
            : 'rgba(255,51,102,0.4)',
          background: validationResult.isValid
            ? 'linear-gradient(135deg, rgba(102,255,153,0.1), rgba(0,204,102,0.05))'
            : 'linear-gradient(135deg, rgba(255,51,102,0.1), rgba(204,0,51,0.05))'
        }}>
          <div style={styles.validationHeader}>
            <span style={{ ...styles.validationIcon, fontSize: 28 }}>
              {validationResult.isValid ? '✅' : '❌'}
            </span>
            <div style={styles.validationHeaderInfo}>
              <div style={{
                ...styles.validationTitle,
                color: validationResult.isValid ? '#66ff99' : '#ff6699'
              }}>
                {validationResult.isValid ? '校验通过' : '校验未通过'}
              </div>
              <div style={styles.validationSubtitle}>
                {validationSummary.totalCount} 个问题
              </div>
            </div>
            <button
              style={styles.toggleIssuesBtn}
              onClick={onToggleIssues}
            >
              {showIssues ? '收起 ▲' : '展开 ▼'}
            </button>
          </div>

          <div style={styles.statsRow}>
            <StatBadge
              count={validationSummary.errorCount}
              label="错误"
              color="#ff6699"
              icon="❌"
            />
            <StatBadge
              count={validationSummary.warningCount}
              label="警告"
              color="#ffcc00"
              icon="⚠️"
            />
            <StatBadge
              count={validationSummary.infoCount}
              label="提示"
              color="#6699ff"
              icon="ℹ️"
            />
          </div>

          {showIssues && (
            <div style={styles.issuesList}>
              {['error', 'warning', 'info'].map(severity =>
                issuesBySeverity[severity].map((issue, i) => (
                  <div
                    key={`${severity}-${i}`}
                    style={{
                      ...styles.issueItem,
                      borderLeftColor: severity === 'error' ? '#ff6699' : severity === 'warning' ? '#ffcc00' : '#6699ff',
                      background: severity === 'error'
                        ? 'rgba(255,51,102,0.05)'
                        : severity === 'warning'
                          ? 'rgba(255,204,0,0.05)'
                          : 'rgba(102,153,255,0.05)'
                    }}
                  >
                    <div style={styles.issueHeader}>
                      <span style={styles.issueSeverity}>
                        {severity === 'error' ? '❌ 错误' : severity === 'warning' ? '⚠️ 警告' : 'ℹ️ 提示'}
                      </span>
                      {issue.field && (
                        <code style={styles.issueField}>{issue.field}</code>
                      )}
                    </div>
                    <div style={styles.issueMessage}>{issue.message}</div>
                    {issue.suggestion && (
                      <div style={styles.issueSuggestion}>
                        💡 {issue.suggestion}
                      </div>
                    )}
                  </div>
                ))
              )}
              {validationResult.issues.length === 0 && (
                <div style={styles.noIssues}>🎉 没有发现任何问题！</div>
              )}
            </div>
          )}

          <div style={styles.actionBtns}>
            {validationResult.warnings.length > 0 && (
              <button style={styles.autoFixBtn} onClick={onAutoFix}>
                🔧 自动修复
              </button>
            )}
            <button style={styles.revalidateBtn} onClick={onReValidate}>
              🔄 重新校验
            </button>
          </div>
        </div>

        {track.preview?.coverGradient && (
          <div style={styles.coverPreview}>
            <div
              style={{
                ...styles.coverPreviewInner,
                background: `linear-gradient(135deg, ${track.preview.coverGradient[0]}, ${track.preview.coverGradient[1]})`
              }}
            >
              <span style={styles.coverIcon}>♪</span>
            </div>
            <div style={styles.coverPreviewInfo}>
              <div style={styles.coverTitle}>{track.title || '未命名'}</div>
              <div style={styles.coverArtist}>{track.artist || '未知'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  hasError = false,
  selectOptions,
  min,
  max
}) {
  const inputStyle = {
    ...styles.input,
    ...(hasError ? styles.inputError : {})
  }

  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </label>
      {selectOptions ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        >
          {selectOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'color' ? (
        <div style={styles.colorInputWrap}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={styles.colorPicker}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...styles.input, ...styles.colorText }}
          />
        </div>
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          min={min}
          max={max}
        />
      )}
    </div>
  )
}

function StatBadge({ count, label, color, icon }) {
  return (
    <div style={{
      ...styles.statBadge,
      borderColor: color,
      background: color + '15'
    }}>
      <span style={styles.statIcon}>{icon}</span>
      <div style={styles.statInfo}>
        <span style={{ ...styles.statCount, color }}>{count}</span>
        <span style={styles.statLabel}>{label}</span>
      </div>
    </div>
  )
}

async function loadSampleChart(onFileSelect) {
  const sample = {
    id: `sample_demo_${Date.now()}`,
    title: '示例演示曲目',
    artist: 'Demo Creator',
    genre: '电子 / 演示',
    bpm: 128,
    duration: 32,
    synth: {
      leadOsc: 'sawtooth',
      bassOsc: 'sine',
      padOsc: 'triangle',
      root: 'C4'
    },
    preview: {
      coverGradient: ['#00ffcc', '#ff3366'],
      description: '这是一个示例谱面，用于演示导入功能',
      tags: ['示例', '演示', '入门'],
      story: '一个来自虚拟世界的示例曲目...'
    },
    difficulties: [
      {
        id: 'normal',
        name: '普通',
        level: 6,
        color: '#ffcc00',
        notes: generateSampleNotes(128, 32),
        totalNotes: 0
      }
    ]
  }
  sample.difficulties[0].totalNotes = sample.difficulties[0].notes.length

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
  const file = new File([blob], 'sample_chart.json', { type: 'application/json' })
  await onFileSelect(file)
}

function generateSampleNotes(bpm, duration) {
  const beat = 60 / bpm
  const notes = []
  let id = 0
  const totalBeats = Math.floor(duration / beat)

  for (let beatIdx = 4; beatIdx < totalBeats - 4; beatIdx++) {
    const patterns = [
      [{ o: 0, l: 0 }, { o: 0.5, l: 2 }, { o: 1, l: 1 }, { o: 1.5, l: 3 }, { o: 2, l: 0 }, { o: 2.5, l: 1 }, { o: 3, l: 2 }, { o: 3.5, l: 3 }],
      [{ o: 0, l: 3 }, { o: 1, l: 1 }, { o: 2, l: 2 }, { o: 3, l: 0 }],
      [{ o: 0, l: 0 }, { o: 0.25, l: 1 }, { o: 0.5, l: 2 }, { o: 0.75, l: 3 }, { o: 2, l: 3 }, { o: 2.25, l: 2 }, { o: 2.5, l: 1 }, { o: 2.75, l: 0 }]
    ]
    const pattern = patterns[beatIdx % patterns.length]
    pattern.forEach(p => {
      notes.push({
        id: id++,
        time: beatIdx * beat + p.o * beat,
        lane: p.l,
        type: 'normal'
      })
    })
  }

  notes.sort((a, b) => a.time - b.time)
  notes.forEach((n, i) => { n.id = i })
  return notes
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modal: {
    width: '100%',
    maxWidth: 1100,
    maxHeight: '92vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  headerIcon: {
    fontSize: 28
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    background: 'linear-gradient(135deg, #fff 0%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  closeBtn: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 24,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 32px',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  stepNum: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 700,
    fontSize: 14,
    transition: 'all 0.3s'
  },
  stepNumActive: {
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 0 20px rgba(255,51,102,0.4)'
  },
  stepNumDone: {
    background: 'rgba(102,255,153,0.15)',
    borderColor: 'rgba(102,255,153,0.4)',
    color: '#66ff99'
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.4)',
    transition: 'all 0.3s'
  },
  stepLabelActive: {
    color: '#fff'
  },
  stepLine: {
    flex: 1,
    height: 2,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 1
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px 32px'
  },
  dropZone: {
    minHeight: 220,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    position: 'relative',
    overflow: 'hidden'
  },
  dropZoneActive: {
    borderColor: '#00ffcc',
    background: 'rgba(0,255,204,0.05)',
    transform: 'scale(1.01)'
  },
  dropZoneHasFile: {
    minHeight: 100,
    padding: '20px 24px',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16
  },
  fileInput: {
    display: 'none'
  },
  dropIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  dropTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)'
  },
  dropHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)'
  },
  dropLink: {
    color: '#00ffcc',
    textDecoration: 'underline',
    cursor: 'pointer'
  },
  processing: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#00ffcc',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  processingText: {
    fontSize: 14,
    color: '#00ffcc',
    fontWeight: 500
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: 1
  },
  fileIcon: {
    fontSize: 36
  },
  fileDetails: {
    flex: 1
  },
  fileName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#fff'
  },
  fileSize: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2
  },
  reselectHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px'
  },
  formatsSection: {
    marginTop: 28
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: 12
  },
  formatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12
  },
  formatCard: {
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px'
  },
  formatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  formatExt: {
    padding: '2px 8px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(0,255,204,0.1))',
    border: '1px solid rgba(0,255,204,0.25)',
    borderRadius: '4px',
    fontSize: 11,
    fontWeight: 700,
    color: '#00ffcc'
  },
  formatName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff'
  },
  formatDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 1.5
  },
  sampleSection: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'center'
  },
  sampleBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, rgba(102,153,255,0.15), rgba(204,102,255,0.1))',
    border: '1px solid rgba(102,153,255,0.35)',
    borderRadius: '10px',
    color: '#6699ff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  previewContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 24
  },
  previewLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  previewRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  formatSelectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px'
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.4)'
  },
  formatSelect: {
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: 13,
    outline: 'none'
  },
  sourceFile: {
    marginLeft: 'auto',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)'
  },
  editSection: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '18px 20px'
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 14
  },
  editGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 16px'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5
  },
  required: {
    color: '#ff6699'
  },
  input: {
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  inputError: {
    borderColor: 'rgba(255,51,102,0.5)',
    background: 'rgba(255,51,102,0.05)'
  },
  colorInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  colorPicker: {
    width: 40,
    height: 38,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    background: 'transparent',
    cursor: 'pointer',
    padding: 2
  },
  colorText: {
    flex: 1
  },
  textAreaGroup: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  textArea: {
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  },
  difficultyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  difficultyItem: {
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid',
    borderRadius: '10px'
  },
  diffHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  diffBadge: {
    padding: '3px 10px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: 12,
    fontWeight: 700
  },
  diffLevel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)'
  },
  diffStats: {
    display: 'flex',
    gap: 16,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)'
  },
  emptyDiffs: {
    padding: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px'
  },
  validationCard: {
    padding: '18px 20px',
    border: '1px solid',
    borderRadius: '14px'
  },
  validationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  validationIcon: {
    flexShrink: 0
  },
  validationHeaderInfo: {
    flex: 1
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: 700
  },
  validationSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2
  },
  toggleIssuesBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginBottom: 14
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: '10px'
  },
  statIcon: {
    fontSize: 16
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  statCount: {
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2
  },
  issuesList: {
    maxHeight: 280,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 14,
    paddingRight: 4
  },
  issueItem: {
    padding: '10px 12px',
    borderLeft: '3px solid',
    borderRadius: '0 8px 8px 0'
  },
  issueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  issueSeverity: {
    fontSize: 11,
    fontWeight: 700
  },
  issueField: {
    padding: '1px 6px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  issueMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.5
  },
  issueSuggestion: {
    marginTop: 6,
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4
  },
  noIssues: {
    padding: 16,
    textAlign: 'center',
    color: '#66ff99',
    fontSize: 13,
    fontWeight: 600
  },
  actionBtns: {
    display: 'flex',
    gap: 8
  },
  autoFixBtn: {
    flex: 1,
    padding: '10px 14px',
    background: 'linear-gradient(135deg, rgba(102,153,255,0.15), rgba(102,153,255,0.1))',
    border: '1px solid rgba(102,153,255,0.35)',
    borderRadius: '8px',
    color: '#6699ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  revalidateBtn: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  coverPreview: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    overflow: 'hidden'
  },
  coverPreviewInner: {
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverIcon: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.8)',
    textShadow: '0 4px 20px rgba(0,0,0,0.4)'
  },
  coverPreviewInfo: {
    padding: '14px 18px'
  },
  coverTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#fff'
  },
  coverArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.04)'
  },
  footerBtns: {
    display: 'flex',
    gap: 10
  },
  backBtn: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  importBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #ff3366, #cc2255)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(255,51,102,0.35)'
  },
  importBtnDisabled: {
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'not-allowed',
    boxShadow: 'none'
  }
}
