import { useState, useEffect, useRef } from 'react'
import { TUTORIAL_STEPS, tutorialTrack } from '../data/tutorialData.js'

export default function Tutorial({
  currentStep,
  onNext,
  onSkip,
  onOpenKeySettings,
  onStartPractice,
  keyConfig,
  tracks,
  onSelectTrack,
  selectedTrackIndex,
  onTrackSelect,
}) {
  const step = TUTORIAL_STEPS[currentStep]
  const [showContent, setShowContent] = useState(false)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    setShowContent(false)
    const timer = setTimeout(() => setShowContent(true), 100)
    return () => clearTimeout(timer)
  }, [currentStep])

  useEffect(() => {
    if (step.type !== 'judge') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    const draw = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      ctx.clearRect(0, 0, w, h)

      const centerY = h / 2
      const hitLineX = w * 0.2

      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const y = centerY - 60 + i * 40
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.fillRect(hitLineX - 2, centerY - 80, 4, 160)

      const noteX = hitLineX + 100 + Math.sin(t * 2) * 30
      const judgeTypes = [
        { offset: -50, type: 'perfect', color: '#ffcc00' },
        { offset: -10, type: 'great', color: '#00ffcc' },
        { offset: 30, type: 'good', color: '#6699ff' },
        { offset: 80, type: 'miss', color: '#ff3366' },
      ]

      judgeTypes.forEach((jt, i) => {
        const y = centerY - 60 + i * 40
        const notePosX = noteX + jt.offset
        ctx.fillStyle = jt.color + 'cc'
        ctx.fillRect(notePosX - 15, y - 12, 30, 24)

        ctx.fillStyle = jt.color
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(jt.type.toUpperCase(), notePosX, y - 18)

        if (Math.abs(notePosX - hitLineX) < 5) {
          ctx.beginPath()
          ctx.arc(hitLineX, y, 25 + Math.sin(t * 10) * 5, 0, Math.PI * 2)
          ctx.strokeStyle = jt.color + '88'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      })

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('判定线 →', hitLineX - 10, centerY + 100)

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(animRef.current)
  }, [step.type])

  if (!step) return null

  const renderContent = () => {
    if (step.type === 'intro' || step.type === 'practice' || step.type === 'complete') {
      return (
        <div style={styles.contentList}>
          {step.content.map((text, i) => (
            <div
              key={i}
              style={{
                ...styles.contentItem,
                opacity: showContent ? 1 : 0,
                transform: showContent ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      )
    }

    if (step.type === 'track_select') {
      return (
        <div style={styles.trackPreview}>
          <div style={styles.contentList}>
            {step.content.map((text, i) => (
              <div
                key={i}
                style={{
                  ...styles.contentItem,
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${i * 0.1}s`,
                }}
              >
                {text}
              </div>
            ))}
          </div>
          <div style={styles.trackMiniList}>
            <div style={styles.miniListTitle}>选择教学曲目：</div>
            <div
              style={{
                ...styles.miniTrackCard,
                ...(selectedTrackIndex === -1 ? styles.miniTrackCardActive : {}),
              }}
              onClick={() => {
                onTrackSelect(-1)
                onSelectTrack(tutorialTrack)
              }}
            >
              <span style={styles.miniTrackIcon}>🎓</span>
              <div style={styles.miniTrackInfo}>
                <div style={styles.miniTrackTitle}>{tutorialTrack.title}</div>
                <div style={styles.miniTrackMeta}>{tutorialTrack.artist} · Lv.{tutorialTrack.level}</div>
              </div>
              <span style={styles.miniTrackDifficulty}>{tutorialTrack.difficulty}</span>
            </div>
            {tracks.slice(0, 2).map((track, i) => (
              <div
                key={track.id}
                style={{
                  ...styles.miniTrackCard,
                  ...(selectedTrackIndex === i ? styles.miniTrackCardActive : {}),
                }}
                onClick={() => {
                  onTrackSelect(i)
                  onSelectTrack(track)
                }}
              >
                <span style={styles.miniTrackIcon}>🎵</span>
                <div style={styles.miniTrackInfo}>
                  <div style={styles.miniTrackTitle}>{track.title}</div>
                  <div style={styles.miniTrackMeta}>{track.artist} · Lv.{track.level}</div>
                </div>
                <span style={styles.miniTrackDifficulty}>{track.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (step.type === 'key_settings') {
      return (
        <div style={styles.keyPreview}>
          <div style={styles.contentList}>
            {step.content.map((text, i) => (
              <div
                key={i}
                style={{
                  ...styles.contentItem,
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${i * 0.1}s`,
                }}
              >
                {text}
              </div>
            ))}
          </div>
          <div style={styles.keyDemo}>
            <div style={styles.keyDemoTitle}>当前键位设置：</div>
            <div style={styles.keyDemoLanes}>
              {keyConfig.labels.map((label, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.keyDemoLane,
                    borderColor: keyConfig.colors[i],
                    background: `${keyConfig.colors[i]}22`,
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${0.4 + i * 0.1}s`,
                  }}
                >
                  <span style={{ ...styles.keyDemoLabel, color: keyConfig.colors[i] }}>
                    {label}
                  </span>
                  <span style={styles.keyDemoLaneLabel}>轨道 {i + 1}</span>
                </div>
              ))}
            </div>
            <button
              style={styles.keySettingsBtn}
              onClick={onOpenKeySettings}
            >
              ⚙ 自定义键位
            </button>
          </div>
        </div>
      )
    }

    if (step.type === 'judge') {
      return (
        <div style={styles.judgeContent}>
          <div style={styles.judgeCanvasContainer}>
            <canvas ref={canvasRef} style={styles.judgeCanvas} />
          </div>
          <div style={styles.judgeGrid}>
            {step.content.map((item, i) => (
              <div
                key={item.type}
                style={{
                  ...styles.judgeCard,
                  borderColor: item.color,
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${0.2 + i * 0.1}s`,
                }}
              >
                <div style={{ ...styles.judgeLabel, color: item.color }}>
                  {item.label}
                </div>
                <div style={styles.judgeDesc}>{item.desc}</div>
                <div style={styles.judgeWindow}>
                  判定窗口: {item.window}
                </div>
                <div style={{ ...styles.judgeBar, background: item.color }} />
              </div>
            ))}
          </div>
          <div style={styles.scoreHint}>
            <span style={styles.scoreHintText}>
              💡 判定越准确，得分越高！PERFECT 比 MISS 多 1000 分
            </span>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.bgGlow} />

      <div
        style={{
          ...styles.modal,
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        }}
      >
        <div style={styles.stepIndicator}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.stepDot,
                background: i < currentStep
                  ? '#00ffcc'
                  : i === currentStep
                  ? '#ff3366'
                  : 'rgba(255,255,255,0.2)',
                width: i === currentStep ? '24px' : '8px',
              }}
            />
          ))}
        </div>

        <div style={styles.header}>
          <h1 style={styles.title}>{step.title}</h1>
          <p style={styles.subtitle}>{step.subtitle}</p>
        </div>

        <div style={styles.content}>
          {renderContent()}
        </div>

        <div style={styles.actions}>
          {currentStep > 0 && (
            <button style={styles.skipBtn} onClick={onSkip}>
              跳过教程
            </button>
          )}
          <button
            style={styles.nextBtn}
            onClick={() => {
              if (step.type === 'key_settings') {
                onOpenKeySettings()
              } else if (step.type === 'practice') {
                onStartPractice()
              } else {
                onNext()
              }
            }}
          >
            {step.buttonText}
            <span style={styles.nextArrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.3s ease-out',
  },
  bgGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(255,51,102,0.15) 0%, rgba(0,255,204,0.08) 50%, transparent 70%)',
    pointerEvents: 'none',
    animation: 'pulse 3s ease-in-out infinite',
  },
  modal: {
    position: 'relative',
    width: '720px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(10,10,20,0.98))',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 30px 100px rgba(0,0,0,0.8), 0 0 60px rgba(255,51,102,0.1)',
    overflowY: 'auto',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  stepDot: {
    height: '8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '4px',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #fff 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
  },
  content: {
    marginBottom: '32px',
  },
  contentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  contentItem: {
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '15px',
    color: 'rgba(255,255,255,0.85)',
    transition: 'all 0.4s ease-out',
  },
  trackPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  trackMiniList: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '20px',
  },
  miniListTitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px',
    letterSpacing: '1px',
  },
  miniTrackCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  miniTrackCardActive: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.12), rgba(0,255,204,0.08))',
    borderColor: 'rgba(255,51,102,0.4)',
    boxShadow: '0 4px 20px rgba(255,51,102,0.15)',
  },
  miniTrackIcon: {
    fontSize: '24px',
  },
  miniTrackInfo: {
    flex: 1,
  },
  miniTrackTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '2px',
  },
  miniTrackMeta: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  miniTrackDifficulty: {
    padding: '4px 10px',
    background: 'rgba(255,204,0,0.15)',
    color: '#ffcc00',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  keyPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  keyDemo: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '24px',
  },
  keyDemoTitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '16px',
    letterSpacing: '1px',
  },
  keyDemoLanes: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  keyDemoLane: {
    flex: 1,
    padding: '20px 12px',
    border: '2px solid',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.4s ease-out',
  },
  keyDemoLabel: {
    fontSize: '28px',
    fontWeight: 800,
    display: 'block',
    marginBottom: '4px',
  },
  keyDemoLaneLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
  },
  keySettingsBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(0,255,204,0.1)',
    border: '1px solid rgba(0,255,204,0.4)',
    color: '#00ffcc',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  judgeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  judgeCanvasContainer: {
    height: '200px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  judgeCanvas: {
    width: '100%',
    height: '100%',
  },
  judgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  judgeCard: {
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid',
    borderRadius: '12px',
    transition: 'all 0.4s ease-out',
  },
  judgeLabel: {
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '2px',
    marginBottom: '6px',
  },
  judgeDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
  },
  judgeWindow: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    marginBottom: '10px',
  },
  judgeBar: {
    height: '4px',
    borderRadius: '2px',
    opacity: 0.6,
  },
  scoreHint: {
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.1), rgba(255,153,0,0.05))',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '10px',
  },
  scoreHintText: {
    fontSize: '13px',
    color: 'rgba(255,204,0,0.9)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  skipBtn: {
    padding: '14px 24px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(255,51,102,0.4)',
    transition: 'all 0.2s',
  },
  nextArrow: {
    fontSize: '18px',
    transition: 'transform 0.2s',
  },
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  }
`
document.head.appendChild(styleSheet)
