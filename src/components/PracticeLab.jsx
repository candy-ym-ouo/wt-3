import { useState, useMemo } from 'react'
import { usePracticeStore } from '../store/usePracticeStore.js'

export default function PracticeLab({ track, keyConfig, onStartPractice, onBack }) {
  const practiceStore = usePracticeStore()
  const {
    settings,
    setPlaybackSpeed,
    toggleTrackMute,
    setLoopRange,
    setLoopMode,
    setReplayMisses,
    setReplayThreshold
  } = practiceStore

  const [selectedSection, setSelectedSection] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  const beat = 60 / track.bpm
  const barDuration = beat * 4
  const totalBars = Math.ceil(track.duration / barDuration)

  const bars = useMemo(() => {
    const result = []
    for (let i = 0; i < totalBars; i++) {
      const barStart = i * barDuration
      const barEnd = Math.min((i + 1) * barDuration, track.duration)
      const notesInBar = track.notes.filter(
        n => n.time >= barStart && n.time < barEnd
      )
      result.push({
        index: i,
        start: barStart,
        end: barEnd,
        noteCount: notesInBar.length,
        density: notesInBar.length > 0 ? Math.min(1, notesInBar.length / 8) : 0
      })
    }
    return result
  }, [track.notes, totalBars, barDuration, track.duration])

  const sections = useMemo(() => {
    const sectionSize = 4
    const result = []
    for (let i = 0; i < totalBars; i += sectionSize) {
      const end = Math.min(i + sectionSize, totalBars)
      const sectionNotes = track.notes.filter(
        n => n.time >= i * barDuration && n.time < end * barDuration
      )
      result.push({
        id: `section-${i}`,
        startBar: i,
        endBar: end,
        barCount: end - i,
        noteCount: sectionNotes.length,
        startTime: i * barDuration,
        endTime: end * barDuration
      })
    }
    return result
  }, [track.notes, totalBars, barDuration])

  const handleBarClick = (barIndex, isShift) => {
    if (selectedSection === null || !isShift) {
      setSelectedSection({ startBar: barIndex, endBar: barIndex + 1 })
      setLoopRange(barIndex, barIndex + 1)
    } else {
      const start = Math.min(selectedSection.startBar, barIndex)
      const end = Math.max(selectedSection.endBar, barIndex + 1)
      setSelectedSection({ startBar: start, endBar: end })
      setLoopRange(start, end)
    }
  }

  const handleSectionClick = (section) => {
    setSelectedSection({ startBar: section.startBar, endBar: section.endBar })
    setLoopRange(section.startBar, section.endBar)
  }

  const isBarInRange = (barIndex) => {
    if (!selectedSection) return false
    return barIndex >= selectedSection.startBar && barIndex < selectedSection.endBar
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (density) => {
    if (density === 0) return 'rgba(255,255,255,0.05)'
    if (density < 0.3) return 'rgba(0,255,204,0.3)'
    if (density < 0.6) return 'rgba(255,204,0,0.4)'
    return 'rgba(255,51,102,0.5)'
  }

  const handleStart = () => {
    if (settings.loopMode === 'section' && !selectedSection) {
      alert('请先选择练习区段！')
      return
    }
    onStartPractice(selectedSection)
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgDecor}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.decorRing,
              width: `${100 + i * 80}px`,
              height: `${100 + i * 80}px`,
              borderColor: `${keyConfig.colors[i % 4]}15`,
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          ← 返回
        </button>
        <div style={styles.headerInfo}>
          <h1 style={styles.title}>🧪 练习实验室</h1>
          <p style={styles.subtitle}>{track.title} · {track.artist}</p>
        </div>
        <div style={styles.headerSpacer} />
      </div>

      <div style={styles.content}>
        <div style={styles.mainPanel}>
          <div style={styles.sectionCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>📊 区段选择</span>
              <span style={styles.cardHint}>
                {selectedSection
                  ? `已选择: 第 ${selectedSection.startBar + 1} - ${selectedSection.endBar} 小节`
                  : '点击小节或区段进行选择，按住 Shift 可多选'}
              </span>
            </div>

            <div style={styles.quickSections}>
              <span style={styles.quickLabel}>快速选择:</span>
              {sections.map(section => (
                <button
                  key={section.id}
                  style={{
                    ...styles.quickSectionBtn,
                    background: selectedSection?.startBar === section.startBar && selectedSection?.endBar === section.endBar
                      ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                      : 'rgba(255,255,255,0.05)',
                    color: selectedSection?.startBar === section.startBar && selectedSection?.endBar === section.endBar
                      ? '#00332a'
                      : 'rgba(255,255,255,0.7)',
                    boxShadow: selectedSection?.startBar === section.startBar && selectedSection?.endBar === section.endBar
                      ? '0 4px 15px rgba(0,255,204,0.3)'
                      : 'none'
                  }}
                  onClick={() => handleSectionClick(section)}
                >
                  {section.startBar + 1}-{section.endBar}
                  <span style={styles.quickNoteCount}>{section.noteCount}音</span>
                </button>
              ))}
            </div>

            <div style={styles.timeline}>
              <div style={styles.timelineLabels}>
                {bars.filter((_, i) => i % 4 === 0).map(bar => (
                  <span
                    key={bar.index}
                    style={{
                      ...styles.timelineLabel,
                      left: `${(bar.index / totalBars) * 100}%`
                    }}
                  >
                    {bar.index + 1}
                  </span>
                ))}
              </div>

              <div style={styles.barGrid}>
                {bars.map(bar => (
                  <div
                    key={bar.index}
                    style={{
                      ...styles.barCell,
                      width: `${100 / totalBars}%`,
                      background: isBarInRange(bar.index)
                        ? 'linear-gradient(180deg, #00ffcc44, #00ffcc11)'
                        : hoveredBar === bar.index
                        ? 'rgba(255,255,255,0.1)'
                        : getDifficultyColor(bar.density),
                      borderLeft: bar.index % 4 === 0 ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderTop: isBarInRange(bar.index) ? '3px solid #00ffcc' : '3px solid transparent',
                      borderBottom: isBarInRange(bar.index) ? '3px solid #00ffcc' : '3px solid transparent'
                    }}
                    onClick={(e) => handleBarClick(bar.index, e.shiftKey)}
                    onMouseEnter={() => setHoveredBar(bar.index)}
                    onMouseLeave={() => setHoveredBar(null)}
                    title={`第 ${bar.index + 1} 小节 · ${bar.noteCount} 个音符 · ${formatTime(bar.start)}`}
                  >
                    {bar.noteCount > 0 && (
                      <span style={styles.barNoteCount}>{bar.noteCount}</span>
                    )}
                  </div>
                ))}
              </div>

              {selectedSection && (
                <div style={styles.selectionInfo}>
                  <span style={styles.selectionText}>
                    🎯 练习区段: 第 {selectedSection.startBar + 1} - {selectedSection.endBar} 小节
                  </span>
                  <span style={styles.selectionTime}>
                    ⏱ {formatTime(selectedSection.startBar * barDuration)} - {formatTime(selectedSection.endBar * barDuration)}
                  </span>
                  <span style={styles.selectionNotes}>
                    🎵 {track.notes.filter(n =>
                      n.time >= selectedSection.startBar * barDuration &&
                      n.time < selectedSection.endBar * barDuration
                    ).length} 个音符
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.quickSettings}>
            <div style={styles.quickSettingCard}>
              <span style={styles.quickSettingLabel}>⏱ 速度</span>
              <div style={styles.quickSpeedBtns}>
                {[0.5, 0.75, 1.0, 1.25].map(speed => (
                  <button
                    key={speed}
                    style={{
                      ...styles.quickSpeedBtn,
                      background: settings.playbackSpeed === speed
                        ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                        : 'rgba(255,255,255,0.05)',
                      color: settings.playbackSpeed === speed ? '#00332a' : 'rgba(255,255,255,0.7)'
                    }}
                    onClick={() => setPlaybackSpeed(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.quickSettingCard}>
              <span style={styles.quickSettingLabel}>🔁 循环</span>
              <div style={styles.quickLoopBtns}>
                {[
                  { value: 'off', label: '关' },
                  { value: 'section', label: '区段' },
                  { value: 'full', label: '全曲' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    style={{
                      ...styles.quickLoopBtn,
                      background: settings.loopMode === opt.value
                        ? 'linear-gradient(135deg, #6699ff, #4477dd)'
                        : 'rgba(255,255,255,0.05)',
                      color: settings.loopMode === opt.value ? '#fff' : 'rgba(255,255,255,0.7)'
                    }}
                    onClick={() => setLoopMode(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.quickSettingCard}>
              <span style={styles.quickSettingLabel}>🎯 重放</span>
              <button
                style={{
                  ...styles.quickToggle,
                  background: settings.replayMisses
                    ? 'linear-gradient(135deg, #ffcc00, #ff9900)'
                    : 'rgba(255,255,255,0.05)',
                  color: settings.replayMisses ? '#332200' : 'rgba(255,255,255,0.7)'
                }}
                onClick={() => setReplayMisses(!settings.replayMisses)}
              >
                {settings.replayMisses ? '已开启' : '已关闭'}
              </button>
            </div>
          </div>
        </div>

        <div style={styles.sidePanel}>
          <div style={styles.trackInfoCard}>
            <h3 style={styles.sideCardTitle}>🎵 曲目信息</h3>
            <div style={styles.trackInfoRow}>
              <span style={styles.trackInfoLabel}>难度</span>
              <span style={styles.trackInfoValue}>{track.difficulty} · Lv.{track.level}</span>
            </div>
            <div style={styles.trackInfoRow}>
              <span style={styles.trackInfoLabel}>BPM</span>
              <span style={styles.trackInfoValue}>{track.bpm}</span>
            </div>
            <div style={styles.trackInfoRow}>
              <span style={styles.trackInfoLabel}>总时长</span>
              <span style={styles.trackInfoValue}>{formatTime(track.duration)}</span>
            </div>
            <div style={styles.trackInfoRow}>
              <span style={styles.trackInfoLabel}>总音符</span>
              <span style={styles.trackInfoValue}>{track.notes.length}</span>
            </div>
            <div style={styles.trackInfoRow}>
              <span style={styles.trackInfoLabel}>小节数</span>
              <span style={styles.trackInfoValue}>{totalBars}</span>
            </div>
          </div>

          <div style={styles.trackMuteCard}>
            <h3 style={styles.sideCardTitle}>🔇 轨道静音</h3>
            {[
              { key: 'lead', label: '主旋律', color: keyConfig.colors[0] },
              { key: 'bass', label: '贝斯', color: keyConfig.colors[1] },
              { key: 'chords', label: '和弦', color: keyConfig.colors[2] },
              { key: 'drums', label: '鼓点', color: keyConfig.colors[3] }
            ].map(track => (
              <div
                key={track.key}
                style={{
                  ...styles.muteRow,
                  opacity: settings.mutedTracks[track.key] ? 0.5 : 1
                }}
              >
                <span style={{ ...styles.muteIcon, color: track.color }}>
                  {settings.mutedTracks[track.key] ? '🔇' : '🔊'}
                </span>
                <span style={styles.muteLabel}>{track.label}</span>
                <button
                  style={{
                    ...styles.muteToggle,
                    borderColor: track.color,
                    background: settings.mutedTracks[track.key]
                      ? `${track.color}33`
                      : 'transparent'
                  }}
                  onClick={() => toggleTrackMute(track.key)}
                >
                  {settings.mutedTracks[track.key] ? '已静音' : '静音'}
                </button>
              </div>
            ))}
          </div>

          <div style={styles.practiceTips}>
            <h3 style={styles.sideCardTitle}>💡 练习技巧</h3>
            <ul style={styles.tipsList}>
              <li>从 0.5x 慢速开始，逐步提升速度</li>
              <li>静音主旋律轨道，练习跟伴奏演奏</li>
              <li>使用区段循环攻克难点段落</li>
              <li>开启命中回放自动复习失误部分</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.startBtn} onClick={handleStart}>
          ▶ 开始练习
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#050508',
    position: 'relative',
    overflow: 'hidden'
  },
  bgDecor: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  decorRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid',
    animation: 'pulse 4s ease-in-out infinite'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    zIndex: 10
  },
  backBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  headerInfo: {
    flex: 1,
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: 0,
    background: 'linear-gradient(135deg, #00ffcc, #6699ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
    letterSpacing: '2px'
  },
  headerSpacer: {
    width: '100px'
  },
  content: {
    flex: 1,
    display: 'flex',
    gap: '24px',
    padding: '24px 32px',
    overflow: 'hidden',
    zIndex: 10
  },
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflow: 'auto'
  },
  sidePanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'auto'
  },
  sectionCard: {
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(10px)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#fff'
  },
  cardHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  quickSections: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  quickLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginRight: '8px'
  },
  quickSectionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '56px'
  },
  quickNoteCount: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '2px'
  },
  timeline: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative'
  },
  timelineLabels: {
    position: 'relative',
    height: '20px',
    marginBottom: '8px'
  },
  timelineLabel: {
    position: 'absolute',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    transform: 'translateX(-50%)'
  },
  barGrid: {
    display: 'flex',
    height: '80px',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  barCell: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    minWidth: '8px'
  },
  barNoteCount: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 600
  },
  selectionInfo: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(0,255,204,0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(0,255,204,0.2)'
  },
  selectionText: {
    fontSize: '13px',
    color: '#00ffcc',
    fontWeight: 600
  },
  selectionTime: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)'
  },
  selectionNotes: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)'
  },
  quickSettings: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  quickSettingCard: {
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(10px)'
  },
  quickSettingLabel: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px',
    letterSpacing: '1px'
  },
  quickSpeedBtns: {
    display: 'flex',
    gap: '6px'
  },
  quickSpeedBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  quickLoopBtns: {
    display: 'flex',
    gap: '6px'
  },
  quickLoopBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  quickToggle: {
    width: '100%',
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sideCardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#fff',
    margin: '0 0 16px 0'
  },
  trackInfoCard: {
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)'
  },
  trackInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  trackInfoLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)'
  },
  trackInfoValue: {
    fontSize: '12px',
    color: '#fff',
    fontWeight: 600
  },
  trackMuteCard: {
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)'
  },
  muteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s'
  },
  muteIcon: {
    fontSize: '16px'
  },
  muteLabel: {
    flex: 1,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500
  },
  muteToggle: {
    padding: '6px 12px',
    border: '1.5px solid',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff'
  },
  practiceTips: {
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)'
  },
  tipsList: {
    margin: 0,
    paddingLeft: '16px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.8
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 10
  },
  startBtn: {
    padding: '16px 64px',
    background: 'linear-gradient(135deg, #00ffcc 0%, #00ccaa 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#00332a',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '4px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(0,255,204,0.3)',
    transition: 'all 0.2s'
  }
}
