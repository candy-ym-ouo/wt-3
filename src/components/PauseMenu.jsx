import { useState, useEffect } from 'react'

const OFFSET_RANGE = 100
const OFFSET_STEP = 1

export default function PauseMenu({
  score,
  combo,
  maxCombo,
  health,
  stats,
  keyConfig,
  track,
  currentTime,
  duration,
  onResume,
  onRestart,
  onQuit,
  judgmentOffsetMs = 0,
  onUpdateJudgmentOffset,
  onApplyAndSaveOffset
}) {
  const [showKeyHints, setShowKeyHints] = useState(false)
  const [showOffsetAdjust, setShowOffsetAdjust] = useState(false)
  const [localOffset, setLocalOffset] = useState(judgmentOffsetMs)

  useEffect(() => {
    setLocalOffset(judgmentOffsetMs)
  }, [judgmentOffsetMs])

  const handleOffsetChange = (value) => {
    setLocalOffset(value)
    if (onUpdateJudgmentOffset) {
      onUpdateJudgmentOffset(value)
    }
  }

  const handleApplyAndSave = () => {
    if (onApplyAndSaveOffset) {
      onApplyAndSaveOffset()
    }
  }

  const formatTime = (sec) => {
    const m = Math.floor(Math.max(0, sec) / 60)
    const s = Math.floor(Math.max(0, sec) % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const totalNotes = stats.perfect + stats.great + stats.good + stats.miss
  const accuracy = totalNotes > 0
    ? ((stats.perfect * 100 + stats.great * 75 + stats.good * 50) / totalNotes).toFixed(2)
    : '0.00'

  const healthColor = health > 70 ? '#00ffcc' : health > 40 ? '#ffcc00' : '#ff3366'

  const handleResume = () => {
    onResume()
  }

  const handleRestart = () => {
    if (confirm('确定要重新开始吗？当前进度将丢失。')) {
      onRestart()
    }
  }

  const handleQuit = () => {
    if (confirm('确定要退出吗？当前进度将丢失。')) {
      onQuit()
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>⏸ 游戏暂停</h2>
          <p style={styles.subtitle}>按空格键继续游戏</p>
        </div>

        {!showKeyHints ? (
          <>
            <div style={styles.scoreOverview}>
              <h3 style={styles.sectionTitle}>📊 当前成绩概览</h3>
              
              <div style={styles.trackInfo}>
                <span style={styles.trackName}>{track.title}</span>
                <span style={styles.trackArtist}>{track.artist} · {track.difficulty}</span>
              </div>

              <div style={styles.progressRow}>
                <span style={styles.progressLabel}>进度</span>
                <div style={styles.progressBarBg}>
                  <div 
                    style={{
                      ...styles.progressBarFill,
                      width: `${(currentTime / duration) * 100}%`
                    }}
                  />
                </div>
                <span style={styles.progressTime}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div style={styles.mainStats}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>分数</div>
                  <div style={styles.statValue}>{String(Math.floor(score)).padStart(8, '0')}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>准确率</div>
                  <div style={{ ...styles.statValue, color: '#00ffcc' }}>{accuracy}%</div>
                </div>
              </div>

              <div style={styles.comboRow}>
                <div style={styles.comboItem}>
                  <span style={styles.comboLabel}>当前连击</span>
                  <span style={styles.comboValue}>{combo}</span>
                </div>
                <div style={styles.comboItem}>
                  <span style={styles.comboLabel}>最大连击</span>
                  <span style={{ ...styles.comboValue, color: '#ffcc00' }}>{maxCombo}</span>
                </div>
              </div>

              <div style={styles.judgeStats}>
                <div style={{ ...styles.judgeItem, borderColor: '#ffcc00' }}>
                  <span style={{ ...styles.judgeLabel, color: '#ffcc00' }}>PERFECT</span>
                  <span style={{ ...styles.judgeCount, color: '#ffcc00' }}>{stats.perfect}</span>
                </div>
                <div style={{ ...styles.judgeItem, borderColor: '#00ffcc' }}>
                  <span style={{ ...styles.judgeLabel, color: '#00ffcc' }}>GREAT</span>
                  <span style={{ ...styles.judgeCount, color: '#00ffcc' }}>{stats.great}</span>
                </div>
                <div style={{ ...styles.judgeItem, borderColor: '#6699ff' }}>
                  <span style={{ ...styles.judgeLabel, color: '#6699ff' }}>GOOD</span>
                  <span style={{ ...styles.judgeCount, color: '#6699ff' }}>{stats.good}</span>
                </div>
                <div style={{ ...styles.judgeItem, borderColor: '#ff3366' }}>
                  <span style={{ ...styles.judgeLabel, color: '#ff3366' }}>MISS</span>
                  <span style={{ ...styles.judgeCount, color: '#ff3366' }}>{stats.miss}</span>
                </div>
              </div>

              <div style={styles.healthRow}>
                <span style={styles.healthLabel}>生命值</span>
                <div style={styles.healthBarBg}>
                  <div 
                    style={{
                      ...styles.healthBarFill,
                      width: `${Math.max(0, Math.min(100, health))}%`,
                      background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`
                    }}
                  />
                </div>
                <span style={{ ...styles.healthValue, color: healthColor }}>
                  {Math.floor(Math.max(0, health))}%
                </span>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.resumeBtn} onClick={handleResume}>
                ▶ 继续游戏
              </button>
            </div>

            <div style={styles.buttonGrid}>
              <button style={styles.offsetAdjustBtn} onClick={() => setShowOffsetAdjust(true)}>
                🎯 判定微调
              </button>
              <button style={styles.keyHintBtn} onClick={() => setShowKeyHints(true)}>
                🎹 键位提示
              </button>
              <button style={styles.restartBtn} onClick={handleRestart}>
                🔄 重新开始
              </button>
              <button style={styles.quitBtn} onClick={handleQuit}>
                ✕ 退出游戏
              </button>
            </div>
          </>
        ) : showOffsetAdjust ? (
          <>
            <div style={styles.offsetAdjustSection}>
              <h3 style={styles.sectionTitle}>🎯 判定偏移微调</h3>
              <p style={styles.offsetHint}>
                调整判定窗口的整体偏移。正值判定窗口后移（适合按键偏早），负值前移（适合按键偏晚）。
                <br />
                <span style={{ color: '#00ffcc' }}>调整后点击"继续游戏"即可实时测试效果！</span>
              </p>

              <div style={styles.offsetCard}>
                <div style={styles.offsetCardHeader}>
                  <span style={styles.offsetCardIcon}>🎯</span>
                  <span style={styles.offsetCardTitle}>判定偏移</span>
                  <span style={{
                    ...styles.offsetValue,
                    color: localOffset === 0 ? 'rgba(255,255,255,0.5)' : localOffset > 0 ? '#00ffcc' : '#ffcc00'
                  }}>
                    {localOffset > 0 ? '+' : ''}{localOffset}ms
                  </span>
                </div>

                <div style={styles.offsetSliderRow}>
                  <span style={styles.offsetSliderLabel}>-{OFFSET_RANGE}ms</span>
                  <div style={styles.offsetSliderTrack}>
                    <div
                      style={{
                        ...styles.offsetSliderFill,
                        width: `${((localOffset + OFFSET_RANGE) / (OFFSET_RANGE * 2)) * 100}%`,
                        background: localOffset === 0
                          ? 'rgba(255,255,255,0.2)'
                          : localOffset > 0
                            ? 'linear-gradient(90deg, rgba(255,255,255,0.1), #00ffcc)'
                            : 'linear-gradient(270deg, rgba(255,255,255,0.1), #ffcc00)'
                      }}
                    />
                    <div
                      style={{
                        ...styles.offsetSliderCenter,
                        left: `${(OFFSET_RANGE / (OFFSET_RANGE * 2)) * 100}%`
                      }}
                    />
                    <input
                      type="range"
                      min={-OFFSET_RANGE}
                      max={OFFSET_RANGE}
                      step={OFFSET_STEP}
                      value={localOffset}
                      onChange={e => handleOffsetChange(Number(e.target.value))}
                      style={styles.offsetSliderInput}
                    />
                  </div>
                  <span style={styles.offsetSliderLabel}>+{OFFSET_RANGE}ms</span>
                </div>

                <div style={styles.offsetPresets}>
                  {[-50, -20, -10, 0, 10, 20, 50].map(v => (
                    <button
                      key={v}
                      style={{
                        ...styles.offsetPresetBtn,
                        background: localOffset === v
                          ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                          : 'rgba(255,255,255,0.05)',
                        color: localOffset === v ? '#00332a' : 'rgba(255,255,255,0.7)'
                      }}
                      onClick={() => handleOffsetChange(v)}
                    >
                      {v > 0 ? '+' : ''}{v}ms
                    </button>
                  ))}
                </div>

                <div style={styles.offsetFineTune}>
                  <button 
                    style={styles.fineTuneBtn}
                    onClick={() => handleOffsetChange(Math.max(-OFFSET_RANGE, localOffset - 5))}
                  >
                    -5ms
                  </button>
                  <button 
                    style={styles.fineTuneBtn}
                    onClick={() => handleOffsetChange(Math.max(-OFFSET_RANGE, localOffset - 1))}
                  >
                    -1ms
                  </button>
                  <button 
                    style={styles.fineTuneBtn}
                    onClick={() => handleOffsetChange(0)}
                  >
                    归零
                  </button>
                  <button 
                    style={styles.fineTuneBtn}
                    onClick={() => handleOffsetChange(Math.min(OFFSET_RANGE, localOffset + 1))}
                  >
                    +1ms
                  </button>
                  <button 
                    style={styles.fineTuneBtn}
                    onClick={() => handleOffsetChange(Math.min(OFFSET_RANGE, localOffset + 5))}
                  >
                    +5ms
                  </button>
                </div>

                <div style={styles.judgeWindowPreview}>
                  <span style={styles.judgeWindowLabel}>判定窗口预览</span>
                  <div style={styles.judgeWindowTrack}>
                    {[
                      { label: 'MISS', range: 220, color: '#ff3366' },
                      { label: 'GOOD', range: 160, color: '#ffcc00' },
                      { label: 'GREAT', range: 100, color: '#00ffcc' },
                      { label: 'PERFECT', range: 50, color: '#fff' }
                    ].map((w, i) => {
                      const offsetShift = (localOffset / 220) * 50
                      return (
                        <div key={i} style={styles.judgeWindowRow}>
                          <span style={{ ...styles.judgeWindowName, color: w.color }}>{w.label}</span>
                          <div style={styles.judgeWindowBar}>
                            <div
                              style={{
                                ...styles.judgeWindowFill,
                                width: `${(w.range / 220) * 100}%`,
                                background: `${w.color}44`,
                                border: `1px solid ${w.color}66`,
                                transform: `translateX(${offsetShift}%)`
                              }}
                            />
                            <div style={styles.judgeWindowCenter} />
                          </div>
                          <span style={styles.judgeWindowMs}>±{w.range}ms</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={styles.offsetInfo}>
                <div style={styles.offsetInfoItem}>
                  <span style={styles.offsetInfoLabel}>当前值</span>
                  <span style={{
                    ...styles.offsetInfoValue,
                    color: localOffset === 0 ? 'rgba(255,255,255,0.5)' : localOffset > 0 ? '#00ffcc' : '#ffcc00'
                  }}>
                    {localOffset > 0 ? '+' : ''}{localOffset}ms
                  </span>
                </div>
                <div style={styles.offsetInfoItem}>
                  <span style={styles.offsetInfoLabel}>调整建议</span>
                  <span style={styles.offsetInfoTip}>
                    {localOffset < -20 ? '判定窗口大幅前移，适合按键偏晚的玩家' :
                     localOffset < -10 ? '判定窗口前移，适合按键稍晚的玩家' :
                     localOffset > 20 ? '判定窗口大幅后移，适合按键偏早的玩家' :
                     localOffset > 10 ? '判定窗口后移，适合按键稍早的玩家' :
                     '判定窗口居中'}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.applySaveBtn} onClick={handleApplyAndSave}>
                💾 保存为默认设置
              </button>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.resumeBtn} onClick={() => setShowOffsetAdjust(false)}>
                ← 返回
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.keyHintsSection}>
              <h3 style={styles.sectionTitle}>🎹 键位提示</h3>
              <p style={styles.keyHintDesc}>当音符到达底部判定线时，按下对应按键</p>
              
              <div style={styles.keyGrid}>
                {keyConfig.lanes.map((lane, i) => (
                  <div key={i} style={styles.keyItem}>
                    <div style={styles.keyTrackLabel}>轨道 {i + 1}</div>
                    <div 
                      style={{
                        ...styles.keyDisplay,
                        borderColor: keyConfig.colors[i],
                        background: `${keyConfig.colors[i]}22`,
                        boxShadow: `0 0 30px ${keyConfig.colors[i]}44`
                      }}
                    >
                      <span style={{ ...styles.keyValue, color: keyConfig.colors[i] }}>
                        {keyConfig.labels[i]}
                      </span>
                    </div>
                    <div 
                      style={{
                        ...styles.keyColorIndicator,
                        background: keyConfig.colors[i],
                        boxShadow: `0 0 15px ${keyConfig.colors[i]}`
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={styles.additionalHints}>
                <div style={styles.hintItemBordered}>
                  <span style={styles.hintKey}>Space</span>
                  <span style={styles.hintDesc}>暂停 / 继续</span>
                </div>
                <div style={styles.hintItem}>
                  <span style={styles.hintKey}>Esc</span>
                  <span style={styles.hintDesc}>退出游戏</span>
                </div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.resumeBtn} onClick={() => setShowKeyHints(false)}>
                ← 返回
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.9)',
    backdropFilter: 'blur(15px)',
    zIndex: 60
  },
  container: {
    width: '520px',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: 'rgba(10,10,20,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 20px 80px rgba(0,0,0,0.6)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 8px 0',
    color: '#fff'
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
    letterSpacing: '1px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    margin: '0 0 16px 0',
    color: '#00ffcc',
    textAlign: 'center'
  },
  scoreOverview: {
    marginBottom: '24px'
  },
  trackInfo: {
    textAlign: 'center',
    marginBottom: '20px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  trackName: {
    display: 'block',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '4px'
  },
  trackArtist: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)'
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  progressLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    minWidth: '36px'
  },
  progressBarBg: {
    flex: 1,
    height: '6px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff3366, #ffcc00, #00ffcc)',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  progressTime: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)',
    minWidth: '90px',
    textAlign: 'right'
  },
  mainStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  },
  statCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginBottom: '6px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#fff'
  },
  comboRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  },
  comboItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '10px 14px'
  },
  comboLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  },
  comboValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#fff'
  },
  judgeStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '16px'
  },
  judgeItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1.5px solid',
    borderRadius: '10px',
    padding: '10px 8px',
    textAlign: 'center'
  },
  judgeLabel: {
    display: 'block',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '4px'
  },
  judgeCount: {
    fontSize: '18px',
    fontWeight: 800
  },
  healthRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  healthLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    minWidth: '50px'
  },
  healthBarBg: {
    flex: 1,
    height: '10px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '5px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  healthBarFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease'
  },
  healthValue: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'monospace',
    minWidth: '45px',
    textAlign: 'right'
  },
  buttonRow: {
    marginBottom: '12px'
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '12px'
  },
  offsetAdjustBtn: {
    padding: '12px 8px',
    background: 'linear-gradient(135deg, #ff66cc, #cc44aa)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(255,102,204,0.3)'
  },
  resumeBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '10px',
    color: '#00332a',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(0,255,204,0.3)'
  },
  keyHintBtn: {
    padding: '12px 8px',
    background: 'linear-gradient(135deg, #6699ff, #4477dd)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(102,153,255,0.3)'
  },
  restartBtn: {
    padding: '12px 8px',
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    border: 'none',
    borderRadius: '10px',
    color: '#332200',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(255,204,0,0.3)'
  },
  quitBtn: {
    padding: '12px 8px',
    background: 'linear-gradient(135deg, #ff3366, #cc2255)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(255,51,102,0.3)'
  },
  keyHintsSection: {
    marginBottom: '24px'
  },
  keyHintDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: '20px'
  },
  keyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px'
  },
  keyItem: {
    textAlign: 'center',
    position: 'relative'
  },
  keyTrackLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px',
    letterSpacing: '1px'
  },
  keyDisplay: {
    width: '100%',
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px'
  },
  keyValue: {
    fontSize: '24px',
    fontWeight: 800
  },
  keyColorIndicator: {
    width: '20px',
    height: '4px',
    borderRadius: '2px',
    margin: '0 auto'
  },
  additionalHints: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '16px'
  },
  hintItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0'
  },
  hintItemBordered: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  hintKey: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: 'monospace'
  },
  hintDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)'
  },
  offsetAdjustSection: {
    marginBottom: '20px'
  },
  offsetHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: '16px',
    lineHeight: '1.6'
  },
  offsetCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  },
  offsetCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  offsetCardIcon: {
    fontSize: '20px'
  },
  offsetCardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    flex: 1
  },
  offsetValue: {
    fontSize: '20px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  offsetSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  offsetSliderLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    minWidth: '48px'
  },
  offsetSliderTrack: {
    flex: 1,
    height: '36px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '18px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden'
  },
  offsetSliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '18px',
    transition: 'all 0.15s ease'
  },
  offsetSliderCenter: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '2px',
    height: '60%',
    background: 'rgba(255,255,255,0.3)',
    borderRadius: '1px'
  },
  offsetSliderInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer'
  },
  offsetPresets: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    marginBottom: '12px'
  },
  offsetPresetBtn: {
    padding: '8px 4px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'monospace'
  },
  offsetFineTune: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px'
  },
  fineTuneBtn: {
    padding: '10px 4px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'monospace'
  },
  judgeWindowPreview: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  judgeWindowLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    marginBottom: '12px',
    textAlign: 'center'
  },
  judgeWindowTrack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  judgeWindowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  judgeWindowName: {
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '55px'
  },
  judgeWindowBar: {
    flex: 1,
    height: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    position: 'relative',
    overflow: 'hidden'
  },
  judgeWindowFill: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    height: '70%',
    borderRadius: '8px',
    transition: 'transform 0.2s ease'
  },
  judgeWindowCenter: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '2px',
    height: '100%',
    background: 'rgba(255,255,255,0.2)',
    zIndex: 1
  },
  judgeWindowMs: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    minWidth: '50px',
    textAlign: 'right'
  },
  offsetInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px'
  },
  offsetInfoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px 16px'
  },
  offsetInfoLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  },
  offsetInfoValue: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  offsetInfoTip: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    maxWidth: '200px'
  },
  applySaveBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    border: 'none',
    borderRadius: '10px',
    color: '#332200',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(255,204,0,0.3)'
  }
}
