import { useState, useMemo } from 'react'
import { CONSTRAINT_TYPES } from '../data/dailyChallengeData.js'

export default function DailyChallenge({
  dailyChallengeState,
  getTodayLeaderboard,
  onStartChallenge,
  onClose,
  tracks
}) {
  const [activeTab, setActiveTab] = useState('info')

  const { challenge, completionStatus, bestScore, attempts, passed } = dailyChallengeState
  const leaderboard = useMemo(() => getTodayLeaderboard(), [dailyChallengeState])

  const track = tracks?.find(t => t.id === challenge.trackId)

  const getStatusLabel = () => {
    switch (completionStatus) {
      case 'passed': return { text: '已通过', color: '#00ffcc', icon: '✅' }
      case 'failed': return { text: '未通过', color: '#ff3366', icon: '❌' }
      default: return { text: '待挑战', color: '#ffcc00', icon: '🎯' }
    }
  }

  const statusLabel = getStatusLabel()

  const getConstraintDesc = (c) => {
    switch (c.type) {
      case CONSTRAINT_TYPES.SPEED_UP: return `播放速度 ×${c.value}`
      case CONSTRAINT_TYPES.MIN_ACCURACY: return `准确度 ≥ ${c.value}%`
      case CONSTRAINT_TYPES.MIN_COMBO: return `连击 ≥ ${c.value}`
      case CONSTRAINT_TYPES.TARGET_SCORE: return `分数 ≥ ${c.value?.toLocaleString()}`
      case CONSTRAINT_TYPES.NO_MISS: return '不允许Miss'
      case CONSTRAINT_TYPES.HIDDEN_NOTES: return '音符隐身'
      case CONSTRAINT_TYPES.SUDDEN_DEATH: return '一命通关'
      default: return c.description
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
            <h1 style={styles.title}>
              <span style={{ color: '#ff9900' }}>☀️</span>
              {' '}每日挑战{' '}
              <span style={{ color: '#ff9900' }}>☀️</span>
            </h1>
          </div>
          <div style={styles.statusBadge}>
            <span>{statusLabel.icon}</span>
            <span style={{ color: statusLabel.color, fontWeight: 700 }}>{statusLabel.text}</span>
          </div>
        </div>

        <div style={styles.challengeCard}>
          <div style={styles.challengeMain}>
            <div style={styles.trackInfo}>
              <div style={styles.trackTitle}>{challenge.trackTitle}</div>
              <div style={styles.trackMeta}>
                <span style={styles.trackArtist}>{challenge.trackArtist}</span>
                <span style={{
                  ...styles.diffBadge,
                  color: challenge.difficultyId === 'easy' ? '#66ff99'
                    : challenge.difficultyId === 'normal' ? '#ffcc00'
                    : challenge.difficultyId === 'hard' ? '#ff6666'
                    : '#cc66ff'
                }}>
                  {challenge.difficultyName} Lv.{challenge.difficultyLevel}
                </span>
              </div>
            </div>
            <div style={styles.dateLabel}>
              📅 {challenge.dateKey}
            </div>
          </div>

          <div style={styles.constraintsSection}>
            <div style={styles.constraintsTitle}>⚡ 限制条件</div>
            <div style={styles.constraintsList}>
              {challenge.constraints.map((c, i) => (
                <div key={i} style={styles.constraintItem}>
                  <div style={{ ...styles.constraintIcon, color: c.color }}>{c.icon}</div>
                  <div style={styles.constraintInfo}>
                    <div style={styles.constraintName}>{c.name}</div>
                    <div style={styles.constraintDesc}>{getConstraintDesc(c)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.rewardRow}>
            <div style={styles.rewardLabel}>🎉 完成奖励</div>
            <div style={styles.rewardValue}>+{challenge.expReward} EXP</div>
            <div style={styles.rewardNote}>未通过可获得 30% 经验</div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{attempts}</div>
            <div style={styles.statLabel}>挑战次数</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{bestScore.toLocaleString()}</div>
            <div style={styles.statLabel}>最高分数</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: passed ? '#00ffcc' : '#ff3366' }}>
              {passed ? '✅' : '—'}
            </div>
            <div style={styles.statLabel}>通过状态</div>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'info', label: '📋 详情' },
            { id: 'leaderboard', label: '🏅 排行' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'info' && (
            <div style={infoStyles.container}>
              {track && (
                <div style={infoStyles.trackDetail}>
                  <div style={infoStyles.trackDesc}>
                    {track.preview?.description || '挑战这首曲目，达成所有限制条件！'}
                  </div>
                  <div style={infoStyles.trackTags}>
                    {(track.preview?.tags || []).map(tag => (
                      <span key={tag} style={infoStyles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={infoStyles.tipsSection}>
                <div style={infoStyles.tipsTitle}>💡 挑战提示</div>
                <div style={infoStyles.tipsList}>
                  {challenge.constraints.some(c => c.type === CONSTRAINT_TYPES.SPEED_UP) && (
                    <div style={infoStyles.tipItem}>速度提升时，优先保证准确度再追求连击</div>
                  )}
                  {challenge.constraints.some(c => c.type === CONSTRAINT_TYPES.NO_MISS || c.type === CONSTRAINT_TYPES.SUDDEN_DEATH) && (
                    <div style={infoStyles.tipItem}>零失误模式下，保持冷静比追求速度更重要</div>
                  )}
                  {challenge.constraints.some(c => c.type === CONSTRAINT_TYPES.HIDDEN_NOTES) && (
                    <div style={infoStyles.tipItem}>隐身音符模式下，依靠听觉和节奏感来判定时机</div>
                  )}
                  {challenge.constraints.some(c => c.type === CONSTRAINT_TYPES.MIN_ACCURACY) && (
                    <div style={infoStyles.tipItem}>准确度要求下，宁可稍晚也不要提前按键</div>
                  )}
                  <div style={infoStyles.tipItem}>每日挑战每天 00:00 刷新，所有玩家面对相同挑战</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div style={lbStyles.container}>
              {leaderboard.length === 0 ? (
                <div style={lbStyles.empty}>
                  <div style={lbStyles.emptyIcon}>🏅</div>
                  <div style={lbStyles.emptyText}>暂无挑战记录</div>
                  <div style={lbStyles.emptyHint}>完成今日挑战后这里将显示你的排行</div>
                </div>
              ) : (
                <div style={lbStyles.list}>
                  {leaderboard.map((entry, i) => (
                    <div
                      key={i}
                      style={{
                        ...lbStyles.entry,
                        ...(entry.passed ? lbStyles.entryPassed : {})
                      }}
                    >
                      <div style={lbStyles.entryRank}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <div style={lbStyles.entryInfo}>
                        <div style={lbStyles.entryScore}>{entry.score.toLocaleString()}</div>
                        <div style={lbStyles.entryMeta}>
                          <span>准确度 {entry.accuracy.toFixed(1)}%</span>
                          <span>连击 {entry.maxCombo}</span>
                          <span>{entry.rank}级</span>
                        </div>
                      </div>
                      <div style={{
                        ...lbStyles.entryStatus,
                        color: entry.passed ? '#00ffcc' : '#ff6666'
                      }}>
                        {entry.passed ? '✅ 通过' : '❌'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{
              ...styles.startBtn,
              ...(completionStatus === 'passed' ? styles.startBtnDone : {})
            }}
            onClick={onStartChallenge}
          >
            {completionStatus === 'passed' ? '🔄 再次挑战' : '🚀 开始挑战'}
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
    background: 'rgba(5, 5, 8, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(20px)'
  },
  container: {
    width: '800px',
    maxWidth: '94vw',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(10, 10, 20, 0.96)',
    border: '1px solid rgba(255, 153, 0, 0.15)',
    borderRadius: '20px',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 30px 100px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 153, 0, 0.05)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255, 153, 0, 0.1)',
    background: 'linear-gradient(180deg, rgba(255,153,0,0.05), transparent)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  closeBtn: {
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: 0
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    fontSize: '14px'
  },
  challengeCard: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  challengeMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  trackInfo: {
    flex: 1
  },
  trackTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '8px'
  },
  trackMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  trackArtist: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)'
  },
  diffBadge: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 700
  },
  dateLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px'
  },
  constraintsSection: {},
  constraintsTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '12px'
  },
  constraintsList: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  constraintItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 18px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px'
  },
  constraintIcon: {
    fontSize: '24px'
  },
  constraintInfo: {},
  constraintName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff'
  },
  constraintDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '2px'
  },
  rewardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, rgba(255,153,0,0.08), rgba(255,204,0,0.05))',
    border: '1px solid rgba(255,153,0,0.15)',
    borderRadius: '12px'
  },
  rewardLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)'
  },
  rewardValue: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#ffcc00',
    fontFamily: 'monospace'
  },
  rewardNote: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 'auto'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  statCard: {
    padding: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#ff9900',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  tabBtn: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(255,153,0,0.15), rgba(255,204,0,0.1))',
    borderColor: 'rgba(255,153,0,0.4)',
    color: '#fff'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px'
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    justifyContent: 'center'
  },
  startBtn: {
    padding: '14px 48px',
    background: 'linear-gradient(135deg, #ff9900 0%, #ffcc00 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '4px',
    boxShadow: '0 4px 20px rgba(255,153,0,0.3)',
    transition: 'all 0.2s'
  },
  startBtnDone: {
    background: 'linear-gradient(135deg, #00cc99, #00ffcc)',
    boxShadow: '0 4px 20px rgba(0,255,204,0.3)'
  }
}

const infoStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  trackDetail: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px'
  },
  trackDesc: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: '12px'
  },
  trackTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  tag: {
    padding: '4px 12px',
    background: 'rgba(255,153,0,0.1)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#ff9900',
    border: '1px solid rgba(255,153,0,0.2)'
  },
  tipsSection: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px'
  },
  tipsTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '12px'
  },
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  tipItem: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5,
    paddingLeft: '12px',
    borderLeft: '2px solid rgba(255,153,0,0.3)'
  }
}

const lbStyles = {
  container: {},
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '56px',
    marginBottom: '16px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px'
  },
  emptyHint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    transition: 'all 0.2s'
  },
  entryPassed: {
    background: 'linear-gradient(135deg, rgba(0,255,204,0.04), rgba(255,153,0,0.02))',
    borderColor: 'rgba(0,255,204,0.15)'
  },
  entryRank: {
    fontSize: '20px',
    fontWeight: 800,
    minWidth: '48px',
    textAlign: 'center'
  },
  entryInfo: {
    flex: 1
  },
  entryScore: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'monospace'
  },
  entryMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px'
  },
  entryStatus: {
    fontSize: '13px',
    fontWeight: 700
  }
}
