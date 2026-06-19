import { useState, useEffect, useRef } from 'react'
import { TITLES, RANK_COLORS } from '../data/growthData.js'

export default function TrackSelect({
  tracks,
  onSelectTrack,
  onOpenSettings,
  onOpenEditor,
  onEditTrack,
  keyConfig,
  playerData,
  expProgress,
  onOpenGrowthCenter,
  getBestRecord
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState(-1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  const currentTitle = TITLES.find(t => t.id === playerData.currentTitle)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      timeRef.current += 0.008
      const t = timeRef.current
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, w, h)

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2)
      gradient.addColorStop(0, `rgba(${100 + Math.sin(t) * 40}, ${50 + Math.sin(t * 1.3) * 30}, ${150 + Math.sin(t * 0.7) * 50}, 0.15)`)
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      for (let ring = 0; ring < 6; ring++) {
        const baseR = 150 + ring * 80
        const r = baseR + Math.sin(t * 0.8 + ring) * 20
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${0.03 + Math.sin(t + ring) * 0.02})`
        ctx.lineWidth = 1
        for (let a = 0; a <= Math.PI * 2; a += 0.02) {
          const noise = Math.sin(a * 8 + t * 2 + ring) * 15 + Math.sin(a * 3 + t * 1.5) * 8
          const px = cx + Math.cos(a) * (r + noise)
          const py = cy + Math.sin(a) * (r + noise)
          if (a === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2 + t * 0.3
        const dist = 200 + (i % 5) * 60 + Math.sin(t + i) * 40
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const size = 1.5 + Math.sin(t * 2 + i) * 0.8
        const colorIdx = i % keyConfig.colors.length
        ctx.fillStyle = keyConfig.colors[colorIdx] + '99'
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [keyConfig.colors])

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const track = tracks[selectedIndex]
  const bestRecord = getBestRecord ? getBestRecord(track.id) : null

  return (
    <div
      style={styles.container}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} style={styles.canvas} />

      <div style={styles.topBar}>
        <h1 style={styles.title}>
          <span style={{ color: '#ff3366' }}>◆</span>
          {' '}圈层节奏{' '}
          <span style={{ color: '#00ffcc' }}>◆</span>
        </h1>
        <div style={styles.topButtons}>
          <div style={styles.playerInfo} onClick={onOpenGrowthCenter}>
            <div style={styles.playerAvatar}>
              {currentTitle ? currentTitle.icon : '🎵'}
            </div>
            <div style={styles.playerDetails}>
              <div style={styles.playerLevel}>Lv.{playerData.level}</div>
              <div style={styles.playerExpBar}>
                <div style={{ ...styles.playerExpFill, width: `${expProgress}%` }} />
              </div>
            </div>
            <div style={styles.playerName}>
              {currentTitle ? (
                <span style={styles.playerTitleText}>
                  {currentTitle.icon} {currentTitle.name}
                </span>
              ) : (
                <span style={styles.playerNoTitle}>点击查看成长</span>
              )}
            </div>
          </div>
          <button style={styles.editorBtn} onClick={onOpenEditor}>
            ✎ 谱面编辑器
          </button>
          <button style={styles.settingsBtn} onClick={onOpenSettings}>
            ⚙ 键位设置
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.trackList}>
          <h2 style={styles.sectionTitle}>选择曲目</h2>
          <div style={styles.tracksContainer}>
            {tracks.map((t, i) => {
              const best = getBestRecord ? getBestRecord(t.id) : null
              return (
                <div
                  key={t.id}
                  style={{
                    ...styles.trackCard,
                    ...(i === selectedIndex ? styles.trackCardActive : {}),
                    ...(i === hoverIndex ? styles.trackCardHover : {})
                  }}
                  onClick={() => setSelectedIndex(i)}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(-1)}
                >
                  <div style={styles.trackIndex}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={styles.trackInfo}>
                    <div style={styles.trackTitle}>{t.title}</div>
                    <div style={styles.trackArtist}>{t.artist}</div>
                    {best && (
                      <div style={styles.trackBest}>
                        <span style={{ ...styles.bestRank, color: RANK_COLORS[best.rank] }}>{best.rank}</span>
                        <span style={styles.bestScore}>{best.score.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div style={styles.trackMeta}>
                    <span style={styles.difficultyBadge}>{t.difficulty}</span>
                    <span style={styles.levelBadge}>Lv.{t.level}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={styles.previewPanel}>
          <div style={styles.previewHeader}>
            <span style={styles.bpmLabel}>BPM {track.bpm}</span>
            <span style={styles.noteCountLabel}>
              {track.notes.length} 音符
            </span>
            {bestRecord && (
              <span style={styles.bestRecordLabel}>
                最高分: <strong>{bestRecord.score.toLocaleString()}</strong>
                {' '}<span style={{ color: RANK_COLORS[bestRecord.rank] }}>[{bestRecord.rank}]</span>
              </span>
            )}
          </div>

          <div style={styles.previewTitle}>{track.title}</div>
          <div style={styles.previewArtist}>{track.artist}</div>

          <div style={styles.waveformContainer}>
            <WaveformPreview track={track} />
          </div>

          <div style={styles.keyHints}>
            {keyConfig.labels.map((label, i) => (
              <div
                key={i}
                style={{
                  ...styles.keyHint,
                  borderColor: keyConfig.colors[i]
                }}
              >
                <span style={{ color: keyConfig.colors[i] }}>{label}</span>
                <span style={styles.keyHintLane}>轨道 {i + 1}</span>
              </div>
            ))}
          </div>

          <button
            style={styles.startBtn}
            onClick={() => onSelectTrack(track)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ▶ 开始演奏
          </button>

          <button
            style={styles.editBtn}
            onClick={() => onEditTrack && onEditTrack(track)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✎ 编辑谱面
          </button>

          <div style={styles.hintText}>
            点击开始 · 按 {keyConfig.labels.join(' ')} 键演奏
          </div>
        </div>
      </div>

      <KeyTracker
        mousePos={mousePos}
        colors={keyConfig.colors}
        labels={keyConfig.labels}
      />
    </div>
  )
}

function WaveformPreview({ track }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    ctx.clearRect(0, 0, w, h)

    const duration = track.duration
    const visibleNotes = track.notes

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      const x = (w / 4) * (i + 1)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    const colors = ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
    visibleNotes.forEach(note => {
      const x = (w / 4) * note.lane + w / 8
      const y = h - (note.time / duration) * h
      ctx.fillStyle = colors[note.lane] + 'aa'
      ctx.fillRect(x - 6, y - 1, 12, 3)
    })
  }, [track])

  return <canvas ref={canvasRef} style={styles.waveformCanvas} />
}

function KeyTracker({ mousePos, colors, labels }) {
  return (
    <div
      style={{
        ...styles.keyTracker,
        left: mousePos.x + 15,
        top: mousePos.y + 15
      }}
    >
      {labels.map((label, i) => (
        <div
          key={i}
          style={{
            ...styles.keyTrackerItem,
            color: colors[i],
            borderColor: colors[i]
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0
  },
  topBar: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 40px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '6px',
    textShadow: '0 0 30px rgba(255,51,102,0.5)'
  },
  topButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)'
  },
  playerAvatar: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.2), rgba(0,255,204,0.2))',
    borderRadius: '10px',
    border: '1px solid rgba(255,51,102,0.3)'
  },
  playerDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  playerLevel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff'
  },
  playerExpBar: {
    width: '80px',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  playerExpFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff3366, #00ffcc)',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out'
  },
  playerName: {
    marginLeft: '4px'
  },
  playerTitleText: {
    fontSize: '13px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  playerNoTitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  editorBtn: {
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    color: '#00ffcc',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s'
  },
  settingsBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s'
  },
  mainContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: '40px',
    padding: '0 40px',
    height: 'calc(100% - 100px)'
  },
  trackList: {
    width: '420px',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '3px',
    marginBottom: '16px'
  },
  tracksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    overflowY: 'auto'
  },
  trackCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '18px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  trackCardActive: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.12), rgba(0,255,204,0.08))',
    borderColor: 'rgba(255,51,102,0.4)',
    boxShadow: '0 8px 32px rgba(255,51,102,0.15)'
  },
  trackCardHover: {
    transform: 'translateX(4px)'
  },
  trackIndex: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    minWidth: '28px'
  },
  trackInfo: {
    flex: 1
  },
  trackTitle: {
    fontSize: '17px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  trackArtist: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  trackBest: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px'
  },
  bestRank: {
    fontSize: '14px',
    fontWeight: 900,
    lineHeight: 1
  },
  bestScore: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  trackMeta: {
    display: 'flex',
    gap: '8px'
  },
  difficultyBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'rgba(255,204,0,0.15)',
    color: '#ffcc00'
  },
  levelBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'rgba(0,255,204,0.15)',
    color: '#00ffcc'
  },
  previewPanel: {
    flex: 1,
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '32px',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column'
  },
  previewHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    alignItems: 'center'
  },
  bpmLabel: {
    padding: '6px 14px',
    background: 'rgba(255,51,102,0.15)',
    color: '#ff3366',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600
  },
  noteCountLabel: {
    padding: '6px 14px',
    background: 'rgba(102,153,255,0.15)',
    color: '#6699ff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600
  },
  bestRecordLabel: {
    padding: '6px 14px',
    background: 'rgba(255,204,0,0.1)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600
  },
  previewTitle: {
    fontSize: '42px',
    fontWeight: 800,
    letterSpacing: '4px',
    background: 'linear-gradient(135deg, #fff 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  previewArtist: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '28px'
  },
  waveformContainer: {
    height: '180px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    marginBottom: '28px',
    overflow: 'hidden',
    padding: '12px'
  },
  waveformCanvas: {
    width: '100%',
    height: '100%'
  },
  keyHints: {
    display: 'flex',
    gap: '12px',
    marginBottom: '28px'
  },
  keyHint: {
    flex: 1,
    padding: '14px',
    border: '2px solid',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  keyHintLane: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
    letterSpacing: '1px'
  },
  startBtn: {
    width: '100%',
    padding: '20px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '4px',
    cursor: 'pointer',
    boxShadow: '0 8px 40px rgba(255,51,102,0.4)',
    transition: 'all 0.2s',
    marginBottom: '12px'
  },
  editBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.4)',
    borderRadius: '10px',
    color: '#00ffcc',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px'
  },
  hintText: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px'
  },
  keyTracker: {
    position: 'fixed',
    display: 'flex',
    gap: '4px',
    pointerEvents: 'none',
    zIndex: 100
  },
  keyTrackerItem: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 700,
    background: 'rgba(0,0,0,0.8)'
  }
}
