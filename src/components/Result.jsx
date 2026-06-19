import { useEffect, useState, useRef } from 'react'

export default function Result({ result, track, onRetry, onBack }) {
  const [animatedStats, setAnimatedStats] = useState({
    score: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    accuracy: 0
  })
  const [showRank, setShowRank] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => animateStats(), 300)
    const t2 = setTimeout(() => setShowRank(true), 1200)
    const t3 = setTimeout(() => setShowDetails(true), 1800)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const animateStats = () => {
    const duration = 1200
    const start = Date.now()
    const startScore = 0
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setAnimatedStats({
        score: Math.floor(startScore + (result.score - startScore) * easeOut),
        perfect: Math.floor(result.stats.perfect * easeOut),
        great: Math.floor(result.stats.great * easeOut),
        good: Math.floor(result.stats.good * easeOut),
        miss: Math.floor(result.stats.miss * easeOut),
        accuracy: Math.round((result.accuracy * 100 * easeOut)) / 100
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    let t = 0

    const rankColors = {
      S: ['#ffcc00', '#ff9900', '#fff7cc'],
      A: ['#ff3366', '#cc2255', '#ff99bb'],
      B: ['#00ffcc', '#00ccaa', '#99ffee'],
      C: ['#6699ff', '#3366cc', '#99bbff'],
      D: ['#999999', '#666666', '#cccccc']
    }
    const colors = rankColors[result.rank] || rankColors.D

    const draw = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      for (let ring = 0; ring < 5; ring++) {
        const r = 60 + ring * 25 + Math.sin(t * 0.5 + ring) * 5
        ctx.beginPath()
        const alpha = Math.floor((0.1 + Math.sin(t + ring) * 0.1) * 255)
        ctx.strokeStyle = `${colors[0]}${alpha.toString(16).padStart(2, '0')}`
        ctx.lineWidth = 1.5
        for (let i = 0; i <= Math.PI * 2; i += 0.02) {
          const noise = Math.sin(i * 8 + t * 2 + ring) * 6
          const x = cx + Math.cos(i) * (r + noise)
          const y = cy + Math.sin(i) * (r + noise)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      for (let i = 0; i < 30; i++) {
        const ang = (i / 30) * Math.PI * 2 + t * 0.3
        const dist = 50 + (i % 4) * 25 + Math.sin(t + i) * 15
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        ctx.fillStyle = `${colors[i % 3]}88`
        ctx.beginPath()
        ctx.arc(x, y, 1.5 + Math.sin(t * 2 + i) * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100)
      grad.addColorStop(0, `${colors[0]}44`)
      grad.addColorStop(0.5, `${colors[1]}22`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(animRef.current)
  }, [result.rank])

  const getRankColor = (rank) => {
    const colors = {
      S: '#ffcc00',
      A: '#ff3366',
      B: '#00ffcc',
      C: '#6699ff',
      D: '#999999'
    }
    return colors[rank] || colors.D
  }

  const totalNotes = result.totalNotes
  const hitNotes = result.stats.perfect + result.stats.great + result.stats.good
  const hitRate = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 10000) / 100 : 0

  return (
    <div style={styles.container}>
      <div style={styles.bgCanvas}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.resultLabel}>
            {result.cleared ? (
              <span style={styles.clearedText}>✓ TRACK CLEARED</span>
            ) : (
              <span style={styles.failedText}>✕ TRACK FAILED</span>
            )}
          </div>
          <h1 style={styles.trackTitle}>{track.title}</h1>
          <div style={styles.trackArtist}>{track.artist} · {track.difficulty} Lv.{track.level}</div>
        </div>

        <div style={styles.mainRow}>
          <div style={styles.rankSection}>
            <div
              style={{
                ...styles.rankBadge,
                color: getRankColor(result.rank),
                textShadow: `0 0 60px ${getRankColor(result.rank)}88`,
                opacity: showRank ? 1 : 0,
                transform: showRank ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-20deg)'
              }}
            >
              {result.rank}
            </div>
            <div style={styles.rankLabel}>RANK</div>
          </div>

          <div style={styles.scoreSection}>
            <div style={styles.scoreLabel}>FINAL SCORE</div>
            <div style={styles.scoreValue}>
              {String(animatedStats.score).padStart(8, '0')}
            </div>

            <div style={styles.accuracyRow}>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>ACCURACY</span>
                <span style={styles.accuracyValue}>{animatedStats.accuracy.toFixed(2)}%</span>
              </div>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>MAX COMBO</span>
                <span style={{ ...styles.accuracyValue, color: '#00ffcc' }}>{result.maxCombo}</span>
              </div>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>CLEAR RATE</span>
                <span style={{ ...styles.accuracyValue, color: hitRate >= 90 ? '#ffcc00' : hitRate >= 70 ? '#00ffcc' : '#ff3366' }}>{hitRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          ...styles.statsGrid,
          opacity: showDetails ? 1 : 0,
          transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
        }}>
          <StatItem
            label="PERFECT"
            value={animatedStats.perfect}
            color="#ffcc00"
            total={totalNotes}
            width={result.stats.perfect}
          />
          <StatItem
            label="GREAT"
            value={animatedStats.great}
            color="#00ffcc"
            total={totalNotes}
            width={result.stats.great}
          />
          <StatItem
            label="GOOD"
            value={animatedStats.good}
            color="#6699ff"
            total={totalNotes}
            width={result.stats.good}
          />
          <StatItem
            label="MISS"
            value={animatedStats.miss}
            color="#ff3366"
            total={totalNotes}
            width={result.stats.miss}
          />
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>HIT DISTRIBUTION</div>
          <div style={styles.progressBars}>
            <div
              style={{
                ...styles.progressBarSegment,
                width: `${totalNotes > 0 ? (result.stats.perfect / totalNotes) * 100 : 0}%`,
                background: '#ffcc00'
              }}
            />
            <div
              style={{
                ...styles.progressBarSegment,
                width: `${totalNotes > 0 ? (result.stats.great / totalNotes) * 100 : 0}%`,
                background: '#00ffcc'
              }}
            />
            <div
              style={{
                ...styles.progressBarSegment,
                width: `${totalNotes > 0 ? (result.stats.good / totalNotes) * 100 : 0}%`,
                background: '#6699ff'
              }}
            />
            <div
              style={{
                ...styles.progressBarSegment,
                width: `${totalNotes > 0 ? (result.stats.miss / totalNotes) * 100 : 0}%`,
                background: '#ff3366'
              }}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.backBtn} onClick={onBack}>
            ← 返回选曲
          </button>
          <button style={styles.retryBtn} onClick={onRetry}>
            ↻ 再来一次
          </button>
        </div>

        <div style={styles.tipText}>
          按 R 重试 · 按 ESC 返回
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, color, total, width }) {
  const percent = total > 0 ? Math.round((width / total) * 100) : 0
  return (
    <div style={statStyles.container}>
      <div style={statStyles.header}>
        <span style={{ ...statStyles.label, color }}>{label}</span>
        <span style={statStyles.percent}>{percent}%</span>
      </div>
      <div style={statStyles.valueRow}>
        <span style={{ ...statStyles.value, color }}>{value}</span>
        <span style={statStyles.total}> / {total}</span>
      </div>
      <div style={statStyles.barBg}>
        <div
          style={{
            ...statStyles.barFill,
            width: `${percent}%`,
            background: color,
            boxShadow: `0 0 10px ${color}66`
          }}
        />
      </div>
    </div>
  )
}

const statStyles = {
  container: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '14px 16px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '2px'
  },
  percent: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  valueRow: {
    marginBottom: '8px'
  },
  value: {
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  total: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)'
  },
  barBg: {
    height: '4px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 1s ease-out'
  }
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#050508',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bgCanvas: {
    position: 'absolute',
    inset: 0
  },
  canvas: {
    width: '100%',
    height: '100%'
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '720px',
    maxWidth: '92vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: 'rgba(10,10,20,0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '40px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 80px rgba(0,0,0,0.6)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '36px'
  },
  resultLabel: {
    marginBottom: '12px'
  },
  clearedText: {
    display: 'inline-block',
    padding: '6px 20px',
    background: 'rgba(0,255,204,0.15)',
    border: '1px solid rgba(0,255,204,0.4)',
    color: '#00ffcc',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '3px'
  },
  failedText: {
    display: 'inline-block',
    padding: '6px 20px',
    background: 'rgba(255,51,102,0.15)',
    border: '1px solid rgba(255,51,102,0.4)',
    color: '#ff3366',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '3px'
  },
  trackTitle: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '4px',
    marginBottom: '6px',
    background: 'linear-gradient(135deg, #fff 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  trackArtist: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px'
  },
  mainRow: {
    display: 'flex',
    gap: '40px',
    marginBottom: '32px'
  },
  rankSection: {
    width: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rankBadge: {
    fontSize: '120px',
    fontWeight: 900,
    lineHeight: 1,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  rankLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '4px',
    marginTop: '8px'
  },
  scoreSection: {
    flex: 1
  },
  scoreLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    marginBottom: '6px'
  },
  scoreValue: {
    fontSize: '48px',
    fontWeight: 900,
    fontFamily: 'monospace',
    marginBottom: '20px',
    textShadow: '0 0 30px rgba(255,255,255,0.2)'
  },
  accuracyRow: {
    display: 'flex',
    gap: '16px'
  },
  accuracyItem: {
    flex: 1,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px'
  },
  accuracyLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1.5px',
    display: 'block',
    marginBottom: '4px'
  },
  accuracyValue: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#ffcc00'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '28px',
    transition: 'all 0.5s ease-out'
  },
  progressSection: {
    marginBottom: '32px'
  },
  progressLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginBottom: '8px'
  },
  progressBars: {
    display: 'flex',
    height: '12px',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  progressBarSegment: {
    height: '100%',
    transition: 'width 1s ease-out'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  backBtn: {
    flex: 1,
    padding: '14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '2px',
    transition: 'all 0.2s'
  },
  retryBtn: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    boxShadow: '0 6px 30px rgba(255,51,102,0.35)',
    transition: 'all 0.2s'
  },
  tipText: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '2px'
  }
}
