import { useEffect, useState, useMemo } from 'react'
import { calculateTierGrade, getTierInfo } from '../data/growthData.js'
import { getMissionProgressText } from '../data/missionData.js'

export default function ScorePanel({
  score,
  combo,
  maxCombo,
  health,
  progress,
  currentTime,
  duration,
  stats,
  trackTitle,
  judgeFeedback,
  totalNotes,
  missions = null
}) {
  const [displayScore, setDisplayScore] = useState(0)
  const [comboFlash, setComboFlash] = useState(false)
  const prevComboRef = useState(0)

  useEffect(() => {
    if (combo > prevComboRef[0] && combo >= 10) {
      setComboFlash(true)
      setTimeout(() => setComboFlash(false), 150)
    }
    prevComboRef[0] = combo
  }, [combo, prevComboRef])

  useEffect(() => {
    const diff = score - displayScore
    if (Math.abs(diff) < 10) {
      setDisplayScore(score)
      return
    }
    const step = Math.ceil(Math.abs(diff) / 10) * Math.sign(diff)
    const timer = setTimeout(() => {
      setDisplayScore(displayScore + step)
    }, 16)
    return () => clearTimeout(timer)
  }, [score, displayScore])

  const formatTime = (sec) => {
    const m = Math.floor(Math.max(0, sec) / 60)
    const s = Math.floor(Math.max(0, sec) % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const healthColor = health > 70 ? '#00ffcc' : health > 40 ? '#ffcc00' : '#ff3366'

  const estimatedTier = useMemo(() => {
    if (!totalNotes || totalNotes <= 0) return null
    const totalJudged = stats.perfect + stats.great + stats.good + stats.miss
    if (totalJudged <= 0) return null
    const accuracy = (stats.perfect * 100 + stats.great * 75 + stats.good * 50) / totalJudged
    return calculateTierGrade({
      accuracy,
      maxCombo,
      totalNotes,
      health
    })
  }, [stats, maxCombo, totalNotes, health])

  const estimatedTierInfo = estimatedTier ? getTierInfo(estimatedTier) : null

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.trackInfo}>
          <div style={styles.trackLabel}>NOW PLAYING</div>
          <div style={styles.trackName}>{trackTitle}</div>
        </div>

        <div style={styles.timeInfo}>
          <div style={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressBg}>
          <div
            style={{
              ...styles.progressFill,
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              background: 'linear-gradient(90deg, #ff3366 0%, #ffcc00 50%, #00ffcc 100%)'
            }}
          />
        </div>
      </div>

      <div style={styles.scoreSection}>
        <div style={styles.scoreLabel}>SCORE</div>
        <div style={styles.scoreValue}>
          {String(Math.floor(Math.max(0, displayScore))).padStart(8, '0')}
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBlock}>
          <div style={{ ...styles.statLabel, color: '#ffcc00' }}>PERFECT</div>
          <div style={{ ...styles.statValue, color: '#ffcc00' }}>{stats.perfect}</div>
        </div>
        <div style={styles.statBlock}>
          <div style={{ ...styles.statLabel, color: '#00ffcc' }}>GREAT</div>
          <div style={{ ...styles.statValue, color: '#00ffcc' }}>{stats.great}</div>
        </div>
        <div style={styles.statBlock}>
          <div style={{ ...styles.statLabel, color: '#6699ff' }}>GOOD</div>
          <div style={{ ...styles.statValue, color: '#6699ff' }}>{stats.good}</div>
        </div>
        <div style={styles.statBlock}>
          <div style={{ ...styles.statLabel, color: '#ff3366' }}>MISS</div>
          <div style={{ ...styles.statValue, color: '#ff3366' }}>{stats.miss}</div>
        </div>
      </div>

      <div style={styles.healthSection}>
        <div style={styles.healthHeader}>
          <span style={styles.healthLabel}>HP</span>
          <span style={{ ...styles.healthValue, color: healthColor }}>
            {Math.floor(Math.max(0, health))}%
          </span>
        </div>
        <div style={styles.healthBarBg}>
          <div
            style={{
              ...styles.healthBarFill,
              width: `${Math.max(0, Math.min(100, health))}%`,
              background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
              boxShadow: `0 0 20px ${healthColor}66`
            }}
          />
        </div>
      </div>

      {estimatedTierInfo && (
        <div style={styles.tierSection}>
          <div style={styles.tierHeader}>
            <span style={styles.tierLabel}>TIER</span>
          </div>
          <div style={{
            ...styles.tierBadge,
            background: `${estimatedTierInfo.color}22`,
            borderColor: `${estimatedTierInfo.color}55`,
            color: estimatedTierInfo.color
          }}>
            <span style={styles.tierId}>{estimatedTier}</span>
            <span style={styles.tierName}>{estimatedTierInfo.name}</span>
          </div>
        </div>
      )}

      {missions && missions.length > 0 && (
        <div style={styles.missionsSection}>
          <div style={styles.missionsHeader}>
            <span style={styles.missionsIcon}>🎯</span>
            <span style={styles.missionsLabel}>局内任务</span>
          </div>
          <div style={styles.missionsList}>
            {missions.map((mission, index) => (
              <div
                key={mission.id}
                style={{
                  ...styles.missionItem,
                  borderColor: mission.completed
                    ? `${mission.color}88`
                    : mission.failed
                    ? 'rgba(255,51,102,0.3)'
                    : 'rgba(255,255,255,0.1)',
                  background: mission.completed
                    ? `${mission.color}15`
                    : mission.failed
                    ? 'rgba(255,51,102,0.08)'
                    : 'rgba(0,0,0,0.3)'
                }}
              >
                <div style={styles.missionItemLeft}>
                  <span style={{
                    ...styles.missionIcon,
                    opacity: mission.failed ? 0.5 : 1
                  }}>
                    {mission.completed ? '✓' : mission.failed ? '✕' : mission.icon}
                  </span>
                  <div style={styles.missionInfo}>
                    <div style={{
                      ...styles.missionName,
                      color: mission.completed
                        ? mission.color
                        : mission.failed
                        ? 'rgba(255,51,102,0.6)'
                        : '#fff'
                    }}>
                      {mission.name}
                    </div>
                    <div style={styles.missionDesc}>
                      {mission.description}
                    </div>
                  </div>
                </div>
                <div style={{
                  ...styles.missionProgress,
                  color: mission.completed
                    ? mission.color
                    : mission.failed
                    ? 'rgba(255,51,102,0.6)'
                    : 'rgba(255,255,255,0.7)'
                }}>
                  {getMissionProgressText(mission)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {combo > 0 && (
        <div
          style={{
            ...styles.comboSection,
            transform: comboFlash ? 'scale(1.15)' : 'scale(1)',
            opacity: 1
          }}
        >
          <div style={styles.comboLabel}>COMBO</div>
          <div
            style={{
              ...styles.comboValue,
              color: combo >= 100 ? '#ffcc00' : combo >= 50 ? '#00ffcc' : '#fff',
              textShadow: combo >= 50
                ? `0 0 30px ${combo >= 100 ? '#ffcc00' : '#00ffcc'}`
                : 'none'
            }}
          >
            {combo}
          </div>
          {maxCombo > 0 && (
            <div style={styles.maxCombo}>MAX {maxCombo}</div>
          )}
        </div>
      )}

      {combo >= 10 && (
        <div style={styles.comboMilestone}>
          <MilestoneBadge combo={combo} />
        </div>
      )}
    </div>
  )
}

function MilestoneBadge({ combo }) {
  const milestones = [10, 25, 50, 75, 100, 150, 200, 300, 500]
  const milestone = milestones.filter(m => combo >= m).pop()
  if (!milestone) return null

  const colors = {
    10: '#6699ff',
    25: '#00ffcc',
    50: '#00ffcc',
    75: '#ffcc00',
    100: '#ffcc00',
    150: '#ff9900',
    200: '#ff3366',
    300: '#cc66ff',
    500: '#fff'
  }

  return (
    <div
      style={{
        padding: '6px 16px',
        background: `${colors[milestone]}22`,
        border: `1px solid ${colors[milestone]}66`,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 700,
        color: colors[milestone],
        letterSpacing: '2px',
        animation: 'pulseGlow 1.5s ease-in-out infinite'
      }}
    >
      ★ {milestone} COMBO ACHIEVED
    </div>
  )
}

const styles = {
  container: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 5
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 32px'
  },
  trackInfo: {},
  trackLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    marginBottom: '4px'
  },
  trackName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '2px'
  },
  timeInfo: {},
  timeDisplay: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)',
    background: 'rgba(0,0,0,0.4)',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  progressContainer: {
    padding: '0 32px'
  },
  progressBg: {
    height: '4px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.1s linear',
    boxShadow: '0 0 15px rgba(255,51,102,0.5)'
  },
  scoreSection: {
    position: 'absolute',
    top: '100px',
    left: '32px'
  },
  scoreLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    marginBottom: '4px'
  },
  scoreValue: {
    fontSize: '42px',
    fontWeight: 900,
    fontFamily: 'monospace',
    color: '#fff',
    letterSpacing: '2px',
    textShadow: '0 0 30px rgba(255,255,255,0.3)'
  },
  statsRow: {
    position: 'absolute',
    top: '180px',
    left: '32px',
    display: 'flex',
    gap: '16px'
  },
  statBlock: {
    background: 'rgba(0,0,0,0.3)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  statLabel: {
    fontSize: '10px',
    letterSpacing: '1.5px',
    fontWeight: 600,
    marginBottom: '2px'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  healthSection: {
    position: 'absolute',
    top: '100px',
    right: '32px',
    width: '200px'
  },
  healthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px'
  },
  healthLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px'
  },
  healthValue: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  healthBarBg: {
    height: '10px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '5px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  healthBarFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.2s ease-out'
  },
  tierSection: {
    position: 'absolute',
    top: '160px',
    right: '32px',
    width: '200px'
  },
  tierHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px'
  },
  tierLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px'
  },
  tierBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid',
    transition: 'all 0.3s ease-out'
  },
  tierId: {
    fontSize: '18px',
    fontWeight: 900,
    fontFamily: 'monospace',
    letterSpacing: '1px'
  },
  tierName: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '1px',
    opacity: 0.8
  },
  comboSection: {
    position: 'absolute',
    top: '38%',
    left: '32px',
    transform: 'translateY(-50%)',
    transition: 'transform 0.15s ease-out'
  },
  comboLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '6px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  comboValue: {
    fontSize: '80px',
    fontWeight: 900,
    lineHeight: 1,
    transition: 'all 0.15s ease-out'
  },
  maxCombo: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginTop: '6px'
  },
  comboMilestone: {
    position: 'absolute',
    top: '52%',
    left: '32px',
    transform: 'translateY(-50%)'
  },
  missionsSection: {
    position: 'absolute',
    top: '240px',
    right: '32px',
    width: '240px',
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px',
    backdropFilter: 'blur(10px)'
  },
  missionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px'
  },
  missionsIcon: {
    fontSize: '14px'
  },
  missionsLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '2px'
  },
  missionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  missionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },
  missionItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0
  },
  missionIcon: {
    fontSize: '16px',
    flexShrink: 0
  },
  missionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0
  },
  missionName: {
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  missionDesc: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  missionProgress: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'monospace',
    flexShrink: 0
  }
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes pulseGlow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`
document.head.appendChild(styleSheet)
