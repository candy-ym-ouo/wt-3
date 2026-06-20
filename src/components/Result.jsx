import { useEffect, useState, useRef, useMemo } from 'react'
import { RANK_COLORS, TIER_GRADES, TIER_COLORS, TIER_NAMES, getTierInfo } from '../data/growthData.js'
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getDifficultyInfo,
  normalizeDifficultyId,
  sortDifficulties
} from '../data/tracks.js'
import { getMissionsSummary, getMissionProgressText } from '../data/missionData.js'

const LEADERBOARD_TABS = [
  { id: 'track', label: '曲目榜' },
  { id: 'difficulty', label: '难度榜' },
  { id: 'history', label: '历史记录' },
  { id: 'replay', label: '复盘分析' },
  { id: 'alldiffs', label: '各难度成绩' }
]

export default function Result({
  result,
  track,
  onRetry,
  onBack,
  growthInfo,
  playerData,
  recordChecks,
  trackLeaderboard,
  trackHistory,
  bestRecord,
  difficultyLeaderboard,
  isTutorialGame = false,
  showTutorialComplete = false,
  onTutorialComplete,
  replayData,
  getReplayAnalysis,
  trackReplays,
  onDeleteReplay,
  theme,
  isDailyChallengeMode = false,
  dailyChallengeResult = null,
  trackAllBestRecords,
  trackAllLeaderboards,
  allDifficultyLeaderboards,
  overallDifficultyStats,
  missionResult = null
}) {
  const resultStyle = theme?.resultStyleId || 'neon'
  const currentDiffInfo = getDifficultyInfo(track.difficulty)
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
  const [showGrowth, setShowGrowth] = useState(false)
  const [showRecordBanner, setShowRecordBanner] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showMissions, setShowMissions] = useState(false)
  const [activeTab, setActiveTab] = useState('track')
  const [activeDiffTab, setActiveDiffTab] = useState(normalizeDifficultyId(track.difficulty))
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  
  const [replayAnalysis, setReplayAnalysis] = useState(null)
  const [selectedReplayId, setSelectedReplayId] = useState(null)
  const [timelineCursor, setTimelineCursor] = useState(0)
  const [showTimelineDetail, setShowTimelineDetail] = useState(null)
  const replayCanvasRef = useRef(null)
  const replayAnimRef = useRef(null)
  
  useEffect(() => {
    if (replayData && replayData.id) {
      setSelectedReplayId(replayData.id)
      const analysis = getReplayAnalysis(replayData.id)
      setReplayAnalysis(analysis)
    }
  }, [replayData, getReplayAnalysis])
  
  useEffect(() => {
    if (selectedReplayId && activeTab === 'replay') {
      const analysis = getReplayAnalysis(selectedReplayId)
      setReplayAnalysis(analysis)
    }
  }, [selectedReplayId, activeTab, getReplayAnalysis])

  const hasNewRecord = recordChecks && (
    recordChecks.isNewBest || recordChecks.isNewAccuracy || recordChecks.isNewCombo
  )

  const missionSummary = useMemo(() => {
    if (!missionResult) return null
    return getMissionsSummary(missionResult)
  }, [missionResult])

  useEffect(() => {
    const t = setTimeout(() => animateStats(), 300)
    const t2 = setTimeout(() => setShowRank(true), 1200)
    const t3 = setTimeout(() => setShowDetails(true), 1800)
    const t4 = setTimeout(() => setShowGrowth(true), 2400)
    const t5 = setTimeout(() => {
      if (hasNewRecord) setShowRecordBanner(true)
    }, 800)
    const t6 = setTimeout(() => setShowLeaderboard(true), 3000)
    const t7 = setTimeout(() => {
      if (missionResult) setShowMissions(true)
    }, 2100)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
      clearTimeout(t6)
      clearTimeout(t7)
    }
  }, [hasNewRecord, missionResult])

  const animateStats = () => {
    const duration = 1200
    const start = Date.now()
    const startScore = bestRecord?.previousScore || 0
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

      if (resultStyle === 'neon') {
        for (let ring = 0; ring < 5; ring++) {
          const r = 60 + ring * 25 + Math.sin(t * 0.5 + ring) * 5
          ctx.beginPath()
          const alpha = Math.floor((0.1 + Math.sin(t + ring) * 0.1) * 255).toString(16).padStart(2, '0')
          ctx.strokeStyle = `${colors[0]}${alpha}`
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
      } else if (resultStyle === 'minimal') {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.4)
        grad.addColorStop(0, 'rgba(255,255,255,0.02)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      } else if (resultStyle === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, w, h)
        const offset = t * 0.1
        grad.addColorStop(0, `${colors[0]}22`)
        grad.addColorStop((0.3 + Math.sin(offset) * 0.2) % 1, `${colors[1]}15`)
        grad.addColorStop((0.6 + Math.cos(offset) * 0.2) % 1, `${colors[2]}18`)
        grad.addColorStop(1, `${colors[0]}22`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        for (let i = 0; i < 20; i++) {
          const ang = (i / 20) * Math.PI * 2 + t * 0.2
          const dist = 40 + (i % 4) * 20
          const x = cx + Math.cos(ang) * dist
          const y = cy + Math.sin(ang) * dist
          ctx.fillStyle = `${colors[i % 3]}44`
          ctx.beginPath()
          ctx.arc(x, y, 1 + Math.sin(t + i) * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (resultStyle === 'retro') {
        for (let y = 0; y < h; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'
          ctx.fillRect(0, y, w, 1)
        }
        const scanY = (t * 40) % h
        const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15)
        scanGrad.addColorStop(0, 'transparent')
        scanGrad.addColorStop(0.5, `${colors[0]}15`)
        scanGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, scanY - 15, w, 30)

        ctx.strokeStyle = `${colors[0]}20`
        ctx.lineWidth = 1
        ctx.strokeRect(cx - 50, cy - 50, 100, 100)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(animRef.current)
  }, [result.rank, resultStyle])

  const totalNotes = result.totalNotes
  const hitNotes = result.stats.perfect + result.stats.great + result.stats.good
  const hitRate = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 10000) / 100 : 0

  const formatDate = (isoStr) => {
    const d = new Date(isoStr)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${m}/${day} ${h}:${min}`
  }

  const getRankBadgeStyle = (rank) => ({
    background: `linear-gradient(135deg, ${RANK_COLORS[rank]}33, ${RANK_COLORS[rank]}11)`,
    border: `1px solid ${RANK_COLORS[rank]}55`,
    color: RANK_COLORS[rank]
  })

  return (
    <div style={styles.container}>
      <div style={styles.bgCanvas}>
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>

      {showTutorialComplete && isTutorialGame && (
        <div style={styles.tutorialCompleteOverlay}>
          <div style={styles.tutorialCompleteModal}>
            <div style={styles.tutorialCompleteIcon}>🎉</div>
            <h2 style={styles.tutorialCompleteTitle}>恭喜完成教学！</h2>
            <p style={styles.tutorialCompleteDesc}>
              你已经掌握了基本操作，准备好挑战更多曲目了吗？
            </p>
            
            <div style={styles.tutorialStats}>
              <div style={styles.tutorialStatItem}>
                <span style={styles.tutorialStatLabel}>得分</span>
                <span style={styles.tutorialStatValue}>{result.score.toLocaleString()}</span>
              </div>
              <div style={styles.tutorialStatItem}>
                <span style={styles.tutorialStatLabel}>准确率</span>
                <span style={styles.tutorialStatValue}>{result.accuracy.toFixed(2)}%</span>
              </div>
              <div style={styles.tutorialStatItem}>
                <span style={styles.tutorialStatLabel}>最大连击</span>
                <span style={styles.tutorialStatValue}>{result.maxCombo}</span>
              </div>
            </div>

            <div style={styles.tutorialFeedback}>
              {result.accuracy >= 90 ? (
                <div style={{ ...styles.feedbackCard, background: 'linear-gradient(135deg, rgba(255,204,0,0.2), rgba(255,153,0,0.1))', borderColor: 'rgba(255,204,0,0.5)' }}>
                  <span style={styles.feedbackIcon}>⭐</span>
                  <span style={styles.feedbackText}>太棒了！你的节奏感非常好！</span>
                </div>
              ) : result.accuracy >= 70 ? (
                <div style={{ ...styles.feedbackCard, background: 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,204,170,0.1))', borderColor: 'rgba(0,255,204,0.5)' }}>
                  <span style={styles.feedbackIcon}>👍</span>
                  <span style={styles.feedbackText}>做得不错！继续练习会更好！</span>
                </div>
              ) : (
                <div style={{ ...styles.feedbackCard, background: 'linear-gradient(135deg, rgba(102,153,255,0.2), rgba(68,119,221,0.1))', borderColor: 'rgba(102,153,255,0.5)' }}>
                  <span style={styles.feedbackIcon}>💪</span>
                  <span style={styles.feedbackText}>继续加油！多练习就能进步！</span>
                </div>
              )}
            </div>

            <div style={styles.tutorialTips}>
              <div style={styles.tutorialTipTitle}>💡 下一步建议：</div>
              <ul style={styles.tutorialTipList}>
                <li style={styles.tutorialTipListLi}>尝试挑战【普通】难度的"星云脉冲"</li>
                <li style={styles.tutorialTipListLi}>去设置里调整适合你的键位</li>
                <li style={styles.tutorialTipListLi}>使用练习实验室提高薄弱环节</li>
              </ul>
            </div>

            <button
              style={styles.tutorialCompleteBtn}
              onClick={onTutorialComplete}
            >
              开始正式游戏 →
            </button>
          </div>
        </div>
      )}

      {showRecordBanner && hasNewRecord && (
        <div style={styles.newRecordBanner}>
          <div style={styles.newRecordBannerInner}>
            <span style={styles.newRecordStar}>✨</span>
            <span style={styles.newRecordText}>NEW RECORD!</span>
            <div style={styles.newRecordTags}>
              {recordChecks.isNewBest && (
                <span style={{ ...styles.newRecordTag, background: 'linear-gradient(135deg, #ffcc00, #ff9900)' }}>
                  🏆 最高分
                  {bestRecord?.scoreDelta > 0 && <span style={styles.deltaPositive}> +{bestRecord.scoreDelta}</span>}
                </span>
              )}
              {recordChecks.isNewAccuracy && (
                <span style={{ ...styles.newRecordTag, background: 'linear-gradient(135deg, #00ffcc, #00ccaa)' }}>
                  🎯 最高准度
                </span>
              )}
              {recordChecks.isNewCombo && (
                <span style={{ ...styles.newRecordTag, background: 'linear-gradient(135deg, #ff3366, #cc2255)' }}>
                  🔥 最高连击
                </span>
              )}
            </div>
            <span style={styles.newRecordStar}>✨</span>
          </div>
        </div>
      )}

      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.resultLabel}>
            {result.cleared ? (
              <span style={styles.clearedText}>✓ TRACK CLEARED</span>
            ) : (
              <span style={styles.failedText}>✕ TRACK FAILED</span>
            )}
            {result.isPracticeMode && (
              <span style={styles.practiceBadge}>🧪 练习模式</span>
            )}
          </div>
          <h1 style={styles.trackTitle}>{track.title}</h1>
          <div style={styles.trackArtist}>
            {track.artist}
            {currentDiffInfo && (
              <span style={{
                ...styles.difficultyBadge,
                background: `${currentDiffInfo.color}22`,
                borderColor: `${currentDiffInfo.color}55`,
                color: currentDiffInfo.color
              }}>
                {currentDiffInfo.name} Lv.{track.level}
              </span>
            )}
            {!currentDiffInfo && (
              <span> · {track.difficulty} Lv.{track.level}</span>
            )}
          </div>

          {trackAllBestRecords && track.difficulties?.length > 1 && (
            <div style={styles.allDiffsMiniHeader}>
              <div style={styles.allDiffsMiniLabel}>各难度最佳:</div>
              <div style={styles.allDiffsMiniBadges}>
                {sortDifficulties(track.difficulties).map(diff => {
                  const key = normalizeDifficultyId(diff.id)
                  const diffBest = trackAllBestRecords.byDifficulty?.[key]
                  const isCurrent = key === normalizeDifficultyId(track.difficulty)
                  return (
                    <div
                      key={key}
                      style={{
                        ...styles.diffMiniBadge,
                        borderColor: isCurrent ? diff.color : `${diff.color}44`,
                        background: isCurrent ? `${diff.color}22` : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <span style={{
                        ...styles.diffMiniName,
                        color: diffBest ? diff.color : `${diff.color}88`
                      }}>
                        {diff.name}
                      </span>
                      {diffBest ? (
                        <span style={{
                          ...styles.diffMiniRank,
                          color: RANK_COLORS[diffBest.rank] || '#fff'
                        }}>
                          {diffBest.rank}
                        </span>
                      ) : (
                        <span style={styles.diffMiniLocked}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {bestRecord && (
            <div style={styles.bestRecordInfo}>
              <span style={styles.bestRecordLabel}>历史最佳: </span>
              <span style={styles.bestRecordScore}>
                {String(bestRecord.score).padStart(8, '0')}
              </span>
              <span style={styles.bestRecordAcc}>
                · {bestRecord.accuracy.toFixed(2)}%
              </span>
            </div>
          )}
          {isDailyChallengeMode && dailyChallengeResult && (
            <div style={styles.dailyChallengeResultBanner}>
              <div style={styles.dailyChallengeResultHeader}>
                <span style={styles.dailyChallengeResultIcon}>☀️</span>
                <span style={styles.dailyChallengeResultTitle}>每日挑战结果</span>
              </div>
              {dailyChallengeResult.passed ? (
                <div style={styles.dailyChallengeResultPassed}>
                  ✅ 挑战通过！+{dailyChallengeResult.expReward} EXP
                </div>
              ) : (
                <div style={styles.dailyChallengeResultFailed}>
                  ❌ 挑战未通过
                  {dailyChallengeResult.failedConstraints?.length > 0 && (
                    <div style={styles.dailyChallengeResultReasons}>
                      {dailyChallengeResult.failedConstraints.map((reason, i) => (
                        <span key={i} style={styles.dailyChallengeResultReason}>{reason}</span>
                      ))}
                    </div>
                  )}
                  <div style={styles.dailyChallengeResultPartial}>+{dailyChallengeResult.expReward} EXP (30%)</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.mainRow}>
          <div style={styles.rankSection}>
            <div
              style={{
                ...styles.rankBadge,
                color: RANK_COLORS[result.rank],
                textShadow: `0 0 60px ${RANK_COLORS[result.rank]}88`,
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
            <div style={{
              ...styles.scoreValue,
              color: recordChecks?.isNewBest ? '#ffcc00' : '#fff'
            }}>
              {String(animatedStats.score).padStart(8, '0')}
            </div>

            <div style={styles.accuracyRow}>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>ACCURACY</span>
                <span style={{
                  ...styles.accuracyValue,
                  color: recordChecks?.isNewAccuracy ? '#00ffcc' : '#ffcc00'
                }}>
                  {animatedStats.accuracy.toFixed(2)}%
                </span>
              </div>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>MAX COMBO</span>
                <span style={{
                  ...styles.accuracyValue,
                  color: recordChecks?.isNewCombo ? '#ff3366' : '#00ffcc'
                }}>{result.maxCombo}</span>
              </div>
              <div style={styles.accuracyItem}>
                <span style={styles.accuracyLabel}>CLEAR RATE</span>
                <span style={{
                  ...styles.accuracyValue,
                  color: hitRate >= 90 ? '#ffcc00' : hitRate >= 70 ? '#00ffcc' : '#ff3366'
                }}>{hitRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {result.tier && (
          <TierGradeSection
            tier={result.tier}
            breakdown={result.tierBreakdown}
            accuracy={result.accuracy}
            health={result.health}
            showDetails={showDetails}
          />
        )}

        {missionResult && missionResult.length > 0 && (
          <div style={{
            ...styles.missionsSection,
            opacity: showMissions ? 1 : 0,
            transform: showMissions ? 'translateY(0)' : 'translateY(20px)'
          }}>
            <div style={styles.missionsHeader}>
              <span style={styles.missionsIcon}>🎯</span>
              <span style={styles.missionsTitle}>局内任务</span>
              {missionSummary && (
                <span style={{
                  ...styles.missionsSummary,
                  color: missionSummary.allCompleted
                    ? '#00ffcc'
                    : missionSummary.anyFailed
                    ? '#ff3366'
                    : '#ffcc00'
                }}>
                  {missionSummary.completed}/{missionSummary.total} 完成
                  {missionSummary.bonusExp > 0 && (
                    <span style={styles.missionsBonus}>
                      +{missionSummary.bonusExp} EXP
                    </span>
                  )}
                </span>
              )}
            </div>

            <div style={styles.missionsGrid}>
              {missionResult.map((mission, index) => (
                <div
                  key={mission.id}
                  style={{
                    ...styles.missionCard,
                    borderColor: mission.completed
                      ? `${mission.color}55`
                      : mission.failed
                      ? 'rgba(255,51,102,0.3)'
                      : 'rgba(255,255,255,0.1)',
                    background: mission.completed
                      ? `linear-gradient(135deg, ${mission.color}18, transparent)`
                      : mission.failed
                      ? 'linear-gradient(135deg, rgba(255,51,102,0.1), transparent)'
                      : 'rgba(255,255,255,0.02)'
                  }}
                >
                  <div style={styles.missionCardHeader}>
                    <span style={{
                      ...styles.missionCardIcon,
                      background: `${mission.color}22`,
                      color: mission.color
                    }}>
                      {mission.completed ? '✓' : mission.failed ? '✕' : mission.icon}
                    </span>
                    <div style={styles.missionCardInfo}>
                      <div style={{
                        ...styles.missionCardName,
                        color: mission.completed
                          ? mission.color
                          : mission.failed
                          ? 'rgba(255,51,102,0.6)'
                          : '#fff'
                      }}>
                        {mission.name}
                      </div>
                      <div style={styles.missionCardDesc}>
                        {mission.description}
                      </div>
                    </div>
                    <div style={{
                      ...styles.missionCardStatus,
                      color: mission.completed
                        ? mission.color
                        : mission.failed
                        ? 'rgba(255,51,102,0.6)'
                        : 'rgba(255,255,255,0.5)'
                    }}>
                      {getMissionProgressText(mission)}
                    </div>
                  </div>

                  {mission.bonusExp > 0 && (
                    <div style={styles.missionCardBonus}>
                      {mission.completed ? (
                        <span style={{ ...styles.missionBonusText, color: '#ffcc00' }}>
                          +{mission.bonusExp} EXP 已获得
                        </span>
                      ) : (
                        <span style={styles.missionBonusText}>
                          奖励: +{mission.bonusExp} EXP
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {missionSummary && missionSummary.allCompleted && (
              <div style={styles.allMissionsCompleteBanner}>
                <span style={styles.allCompleteIcon}>🏆</span>
                <span style={styles.allCompleteText}>
                  太棒了！全部任务完成！
                </span>
                <span style={styles.allCompleteBonus}>
                  +{missionSummary.bonusExp} EXP
                </span>
              </div>
            )}
          </div>
        )}

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
            count={result.stats.perfect}
          />
          <StatItem
            label="GREAT"
            value={animatedStats.great}
            color="#00ffcc"
            total={totalNotes}
            count={result.stats.great}
          />
          <StatItem
            label="GOOD"
            value={animatedStats.good}
            color="#6699ff"
            total={totalNotes}
            count={result.stats.good}
          />
          <StatItem
            label="MISS"
            value={animatedStats.miss}
            color="#ff3366"
            total={totalNotes}
            count={result.stats.miss}
          />
        </div>

        {(result.judgmentOffsetMs !== undefined && result.judgmentOffsetMs !== null) && (
          <div style={{
            ...styles.judgmentOffsetSection,
            opacity: showDetails ? 1 : 0,
            transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
          }}>
            <div style={styles.judgmentOffsetHeader}>
              <span style={styles.judgmentOffsetIcon}>🎯</span>
              <span style={styles.judgmentOffsetTitle}>判定偏移</span>
            </div>
            <div style={styles.judgmentOffsetBody}>
              <div style={styles.judgmentOffsetValueRow}>
                <span style={styles.judgmentOffsetLabel}>本次使用</span>
                <span style={{
                  ...styles.judgmentOffsetValue,
                  color: result.judgmentOffsetMs === 0 ? 'rgba(255,255,255,0.5)' : result.judgmentOffsetMs > 0 ? '#00ffcc' : '#ffcc00'
                }}>
                  {result.judgmentOffsetMs > 0 ? '+' : ''}{result.judgmentOffsetMs}ms
                </span>
              </div>
              <div style={styles.judgmentOffsetInfo}>
                <span style={styles.judgmentOffsetTip}>
                  {result.judgmentOffsetMs < -20 ? '判定窗口大幅前移' :
                   result.judgmentOffsetMs < -10 ? '判定窗口前移' :
                   result.judgmentOffsetMs > 20 ? '判定窗口大幅后移' :
                   result.judgmentOffsetMs > 10 ? '判定窗口后移' :
                   '判定窗口居中'}
                </span>
                <span style={styles.judgmentOffsetAdvice}>
                  {result.judgmentOffsetMs !== 0 ? '可以在设置页统一管理偏移设置' : '无需调整'}
                </span>
              </div>
            </div>
          </div>
        )}

        {bestRecord && (
          <div style={{
            ...styles.compareSection,
            opacity: showDetails ? 1 : 0,
            transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
          }}>
            <div style={styles.compareHeader}>
              <span style={styles.compareTitle}>📊 成绩对比</span>
              <span style={styles.compareSubtitle}>本次 vs 历史最佳</span>
            </div>
            <div style={styles.compareGrid}>
              <CompareItem
                label="分数"
                currentValue={result.score}
                bestValue={bestRecord.previousScore ?? bestRecord.score}
                format={(v) => String(v).padStart(8, '0')}
                isHigherBetter={true}
                isNewRecord={recordChecks?.isNewBest}
              />
              <CompareItem
                label="准确率"
                currentValue={result.accuracy}
                bestValue={bestRecord.previousAccuracy ?? bestRecord.accuracy}
                format={(v) => `${v.toFixed(2)}%`}
                isHigherBetter={true}
                isNewRecord={recordChecks?.isNewAccuracy}
              />
              <CompareItem
                label="连击"
                currentValue={result.maxCombo}
                bestValue={bestRecord.previousMaxCombo ?? bestRecord.maxCombo}
                format={(v) => String(v)}
                isHigherBetter={true}
                isNewRecord={recordChecks?.isNewCombo}
              />
              <CompareItem
                label="失误"
                currentValue={result.stats.miss}
                bestValue={bestRecord.previousMiss ?? bestRecord.stats?.miss ?? 0}
                format={(v) => String(v)}
                isHigherBetter={false}
                isNewRecord={false}
              />
            </div>
          </div>
        )}

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

        <div style={{
          ...styles.leaderboardSection,
          opacity: showLeaderboard ? 1 : 0,
          transform: showLeaderboard ? 'translateY(0)' : 'translateY(20px)'
        }}>
          <div style={styles.leaderboardHeader}>
            <span style={styles.leaderboardTitle}>🏅 排行榜</span>
            <div style={styles.tabBar}>
              {LEADERBOARD_TABS.map(tab => (
                <button
                  key={tab.id}
                  style={{
                    ...styles.tabBtn,
                    background: activeTab === tab.id
                      ? 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(0,255,204,0.2))'
                      : 'rgba(255,255,255,0.03)',
                    borderColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)'
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.leaderboardBody}>
            {activeTab === 'track' && (
              <LeaderboardList
                type="track"
                entries={trackLeaderboard}
                formatDate={formatDate}
                getRankBadgeStyle={getRankBadgeStyle}
              />
            )}
            {activeTab === 'difficulty' && (
              <div>
                {allDifficultyLeaderboards ? (
                  <div>
                    <div style={styles.diffSubTabBar}>
                      {DIFFICULTY_ORDER.map(diffId => {
                        const diffInfo = getDifficultyInfo(diffId)
                        const entries = allDifficultyLeaderboards[diffId] || []
                        return (
                          <button
                            key={diffId}
                            style={{
                              ...styles.diffSubTabBtn,
                              borderColor: activeDiffTab === diffId ? diffInfo.color : 'rgba(255,255,255,0.06)',
                              color: activeDiffTab === diffId ? diffInfo.color : 'rgba(255,255,255,0.4)',
                              background: activeDiffTab === diffId ? `${diffInfo.color}18` : 'rgba(255,255,255,0.02)'
                            }}
                            onClick={() => setActiveDiffTab(diffId)}
                          >
                            <span>{diffInfo.name}</span>
                            <span style={styles.diffSubTabCount}>
                              {entries.length}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={styles.diffSubTabContent}>
                      <LeaderboardList
                        type="difficulty"
                        entries={allDifficultyLeaderboards[activeDiffTab] || []}
                        formatDate={formatDate}
                        getRankBadgeStyle={getRankBadgeStyle}
                      />
                      {overallDifficultyStats && overallDifficultyStats[activeDiffTab] && (
                        <div style={styles.diffStatsSummary}>
                          <div style={styles.diffStatsRow}>
                            <div style={styles.diffStatsItem}>
                              <span style={styles.diffStatsLabel}>已通关</span>
                              <span style={styles.diffStatsValue}>{overallDifficultyStats[activeDiffTab].clearedCount} 首</span>
                            </div>
                            <div style={styles.diffStatsItem}>
                              <span style={styles.diffStatsLabel}>最高等级</span>
                              <span style={styles.diffStatsValue}>Lv.{overallDifficultyStats[activeDiffTab].highestLevel}</span>
                            </div>
                            <div style={styles.diffStatsItem}>
                              <span style={styles.diffStatsLabel}>平均准度</span>
                              <span style={styles.diffStatsValue}>{overallDifficultyStats[activeDiffTab].avgAccuracy}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <LeaderboardList
                    type="difficulty"
                    entries={difficultyLeaderboard}
                    formatDate={formatDate}
                    getRankBadgeStyle={getRankBadgeStyle}
                  />
                )}
              </div>
            )}
            {activeTab === 'history' && (
              <HistoryList
                entries={trackHistory}
                formatDate={formatDate}
                getRankBadgeStyle={getRankBadgeStyle}
              />
            )}
            {activeTab === 'replay' && (
              <ReplayAnalysis
                replayData={replayData}
                replayAnalysis={replayAnalysis}
                trackReplays={trackReplays}
                selectedReplayId={selectedReplayId}
                onSelectReplay={setSelectedReplayId}
                onDeleteReplay={onDeleteReplay}
                formatDate={formatDate}
                getRankBadgeStyle={getRankBadgeStyle}
                timelineCursor={timelineCursor}
                setTimelineCursor={setTimelineCursor}
                showTimelineDetail={showTimelineDetail}
                setShowTimelineDetail={setShowTimelineDetail}
                replayCanvasRef={replayCanvasRef}
                replayAnimRef={replayAnimRef}
                track={track}
              />
            )}
            {activeTab === 'alldiffs' && trackAllBestRecords && track.difficulties && (
              <AllDiffsView
                track={track}
                trackAllBestRecords={trackAllBestRecords}
                trackAllLeaderboards={trackAllLeaderboards}
                formatDate={formatDate}
                getRankBadgeStyle={getRankBadgeStyle}
              />
            )}
          </div>
        </div>

        {growthInfo && (
          <div style={{
            ...styles.growthSection,
            opacity: showGrowth ? 1 : 0,
            transform: showGrowth ? 'translateY(0)' : 'translateY(20px)'
          }}>
            <div style={styles.growthLabel}>🎮 玩家成长</div>

            <div style={styles.growthRow}>
              <div style={styles.growthItem}>
                <span style={styles.growthItemLabel}>获得经验</span>
                <span style={styles.growthItemValue}>+{growthInfo.gainedExp} EXP</span>
              </div>
              <div style={styles.growthItem}>
                <span style={styles.growthItemLabel}>当前等级</span>
                <span style={styles.growthItemValue}>Lv.{playerData.level}</span>
              </div>
            </div>

            {growthInfo.levelUps && growthInfo.levelUps.length > 0 && (
              <div style={styles.levelUpNotice}>
                🎉 恭喜升级！达到 Lv.{growthInfo.levelUps[growthInfo.levelUps.length - 1]}
              </div>
            )}

            {growthInfo.newAchievements && growthInfo.newAchievements.length > 0 && (
              <div style={styles.unlockSection}>
                <div style={styles.unlockTitle}>🏆 新成就解锁</div>
                <div style={styles.unlockList}>
                  {growthInfo.newAchievements.map(a => (
                    <div key={a.id} style={styles.unlockItem}>
                      <span style={styles.unlockIcon}>{a.icon}</span>
                      <span style={styles.unlockName}>{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {growthInfo.newTitles && growthInfo.newTitles.length > 0 && (
              <div style={styles.unlockSection}>
                <div style={styles.unlockTitle}>🎖️ 新称号解锁</div>
                <div style={styles.unlockList}>
                  {growthInfo.newTitles.map(t => (
                    <div key={t.id} style={styles.unlockItem}>
                      <span style={styles.unlockIcon}>{t.icon}</span>
                      <span style={styles.unlockName}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {growthInfo.newBadges && growthInfo.newBadges.length > 0 && (
              <div style={styles.unlockSection}>
                <div style={styles.unlockTitle}>🏅 新徽章获得</div>
                <div style={styles.unlockList}>
                  {growthInfo.newBadges.map(b => (
                    <div key={b.id} style={{
                      ...styles.unlockItem,
                      background: 'rgba(204,102,255,0.08)',
                      borderColor: 'rgba(204,102,255,0.2)'
                    }}>
                      <span style={styles.unlockIcon}>{b.icon}</span>
                      <span style={styles.unlockName}>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

function AllDiffsView({ track, trackAllBestRecords, trackAllLeaderboards, formatDate, getRankBadgeStyle }) {
  const [selectedDiff, setSelectedDiff] = useState(normalizeDifficultyId(track.difficulty))
  const sortedDifficulties = sortDifficulties(track.difficulties)
  const totalDifficulties = sortedDifficulties.length
  const clearedCount = sortedDifficulties.filter(d => trackAllBestRecords.byDifficulty?.[normalizeDifficultyId(d.id)]).length
  const progress = totalDifficulties > 0 ? Math.round((clearedCount / totalDifficulties) * 100) : 0

  const selectedDiffInfo = sortedDifficulties.find(d => normalizeDifficultyId(d.id) === selectedDiff)
  const selectedRecord = trackAllBestRecords.byDifficulty?.[selectedDiff]
  const selectedLeaderboard = trackAllLeaderboards?.[selectedDiff] || []

  return (
    <div style={styles.allDiffsContainer}>
      <div style={styles.allDiffsHeader}>
        <div style={styles.allDiffsTitleSection}>
          <div style={styles.allDiffsTitle}>🎯 该曲目各难度成绩</div>
          <div style={styles.allDiffsProgressInfo}>
            <span style={styles.allDiffsProgressText}>
              已通关: {clearedCount} / {totalDifficulties} ({progress}%)
            </span>
            <div style={styles.allDiffsProgressBarBg}>
              <div style={{
                ...styles.allDiffsProgressBar,
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg, #00ffcc, #ffcc00)'
                  : 'linear-gradient(90deg, #6699ff, #ff3366)'
              }} />
            </div>
          </div>
        </div>
      </div>

      <div style={styles.allDiffsCards}>
        {sortedDifficulties.map(diff => {
          const key = normalizeDifficultyId(diff.id)
          const record = trackAllBestRecords.byDifficulty?.[key]
          const isSelected = key === selectedDiff
          const isCurrent = key === normalizeDifficultyId(track.difficulty)

          return (
            <div
              key={key}
              style={{
                ...styles.diffCard,
                borderColor: isSelected ? diff.color : 'rgba(255,255,255,0.06)',
                background: isSelected ? `${diff.color}12` : 'rgba(255,255,255,0.02)',
                boxShadow: isSelected ? `0 0 20px ${diff.color}22` : 'none'
              }}
              onClick={() => setSelectedDiff(key)}
            >
              <div style={styles.diffCardHeader}>
                <span style={{
                  ...styles.diffCardName,
                  color: diff.color
                }}>
                  {diff.name}
                </span>
                <span style={{
                  ...styles.diffCardLevel,
                  background: `${diff.color}22`,
                  color: diff.color
                }}>
                  Lv.{diff.level}
                </span>
                {isCurrent && (
                  <span style={styles.diffCurrentBadge}>本次</span>
                )}
              </div>
              {record ? (
                <div style={styles.diffCardContent}>
                  <div style={styles.diffCardScore}>
                    {String(record.score).padStart(8, '0')}
                  </div>
                  <div style={styles.diffCardRow}>
                    <span style={{
                      ...styles.diffCardRank,
                      background: `${RANK_COLORS[record.rank]}22`,
                      color: RANK_COLORS[record.rank]
                    }}>
                      {record.rank}
                    </span>
                    <span style={styles.diffCardAcc}>{record.accuracy.toFixed(2)}%</span>
                    <span style={styles.diffCardCombo}>{record.maxCombo} COMBO</span>
                  </div>
                  <div style={styles.diffCardDate}>
                    达成: {formatDate(record.updatedAt)}
                  </div>
                </div>
              ) : (
                <div style={styles.diffCardLocked}>
                  <div style={styles.diffCardLockedIcon}>🔒</div>
                  <div style={styles.diffCardLockedText}>尚未通关</div>
                  <div style={styles.diffCardLockedNotes}>
                    共 {diff.totalNotes || 0} 音符
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDiffInfo && (
        <div style={styles.selectedDiffDetail}>
          <div style={{
            ...styles.selectedDiffHeader,
            borderColor: `${selectedDiffInfo.color}44`
          }}>
            <span style={{
              ...styles.selectedDiffTitle,
              color: selectedDiffInfo.color
            }}>
              {selectedDiffInfo.name} Lv.{selectedDiffInfo.level}
            </span>
            <span style={styles.selectedDiffLabel}>排行榜 TOP 5</span>
          </div>
          {selectedLeaderboard.length > 0 ? (
            <LeaderboardList
              type="track"
              entries={selectedLeaderboard.slice(0, 5)}
              formatDate={formatDate}
              getRankBadgeStyle={getRankBadgeStyle}
            />
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <div style={styles.emptyText}>该难度暂无通关记录</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LeaderboardList({ type, entries, formatDate, getRankBadgeStyle }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <div style={styles.emptyText}>
          {type === 'track' ? '暂无该曲目记录，快来挑战吧！' : '暂无数据'}
        </div>
      </div>
    )
  }

  const medalColors = {
    0: { bg: 'linear-gradient(135deg, #ffcc00, #ff9900)', text: '#000' },
    1: { bg: 'linear-gradient(135deg, #e0e0e0, #a0a0a0)', text: '#000' },
    2: { bg: 'linear-gradient(135deg, #cd7f32, #8b4513)', text: '#fff' }
  }

  return (
    <div style={styles.leaderboardList}>
      <div style={styles.leaderboardHeaderRow}>
        <span style={{ ...styles.leaderboardCell, flex: '0 0 40px' }}>#</span>
        {type === 'difficulty' && (
          <span style={{ ...styles.leaderboardCell, flex: 2 }}>曲目</span>
        )}
        <span style={{ ...styles.leaderboardCell, flex: 1.5 }}>分数</span>
        <span style={{ ...styles.leaderboardCell, flex: 1 }}>等级</span>
        <span style={{ ...styles.leaderboardCell, flex: 1 }}>准度</span>
        <span style={{ ...styles.leaderboardCell, flex: 1, textAlign: 'right' }}>日期</span>
      </div>
      {entries.map((entry, index) => {
        const medal = medalColors[index]
        return (
          <div
            key={entry.id || `${entry.trackId}_${index}`}
            style={{
              ...styles.leaderboardEntry,
              background: index < 3
                ? `linear-gradient(90deg, ${medal.bg.split(',')[0].replace('linear-gradient(135deg, ', '')}11, transparent)`
                : undefined
            }}
          >
            <div style={{ ...styles.leaderboardCell, flex: '0 0 40px' }}>
              {medal ? (
                <span style={{
                  ...styles.rankMedal,
                  background: medal.bg,
                  color: medal.text
                }}>
                  {index + 1}
                </span>
              ) : (
                <span style={styles.rankNumber}>{index + 1}</span>
              )}
            </div>
            {type === 'difficulty' && (
              <div style={{ ...styles.leaderboardCell, flex: 2 }}>
                <div style={styles.trackNameCell}>{entry.trackTitle}</div>
                <div style={styles.trackArtistCell}>{entry.artist}</div>
              </div>
            )}
            <div style={{ ...styles.leaderboardCell, flex: 1.5 }}>
              <span style={styles.entryScore}>{String(entry.score).padStart(8, '0')}</span>
            </div>
            <div style={{ ...styles.leaderboardCell, flex: 1 }}>
              <span style={{
                ...styles.rankBadgeMini,
                ...getRankBadgeStyle(entry.rank)
              }}>{entry.rank}</span>
            </div>
            <div style={{ ...styles.leaderboardCell, flex: 1 }}>
              <span style={styles.entryAccuracy}>{entry.accuracy.toFixed(2)}%</span>
            </div>
            <div style={{ ...styles.leaderboardCell, flex: 1, textAlign: 'right' }}>
              <span style={styles.entryDate}>{formatDate(entry.playedAt || entry.updatedAt)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function HistoryList({ entries, formatDate, getRankBadgeStyle }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🕰️</div>
        <div style={styles.emptyText}>暂无游戏记录</div>
      </div>
    )
  }

  return (
    <div style={styles.leaderboardList}>
      <div style={styles.leaderboardHeaderRow}>
        <span style={{ ...styles.leaderboardCell, flex: '0 0 60px' }}>序号</span>
        <span style={{ ...styles.leaderboardCell, flex: 1.5 }}>分数</span>
        <span style={{ ...styles.leaderboardCell, flex: 1 }}>等级</span>
        <span style={{ ...styles.leaderboardCell, flex: 1 }}>准度</span>
        <span style={{ ...styles.leaderboardCell, flex: 1 }}>连击</span>
        <span style={{ ...styles.leaderboardCell, flex: 1.2, textAlign: 'right' }}>时间</span>
      </div>
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          style={{
            ...styles.leaderboardEntry,
            background: index === 0
              ? 'linear-gradient(90deg, rgba(255,51,102,0.1), transparent)'
              : undefined
          }}
        >
          <div style={{ ...styles.leaderboardCell, flex: '0 0 60px' }}>
            <span style={index === 0 ? styles.currentPlayLabel : styles.historyIndex}>
              {index === 0 ? '本次' : `#${entries.length - index}`}
            </span>
          </div>
          <div style={{ ...styles.leaderboardCell, flex: 1.5 }}>
            <span style={styles.entryScore}>{String(entry.score).padStart(8, '0')}</span>
          </div>
          <div style={{ ...styles.leaderboardCell, flex: 1 }}>
            <span style={{
              ...styles.rankBadgeMini,
              ...getRankBadgeStyle(entry.rank)
            }}>{entry.rank}</span>
          </div>
          <div style={{ ...styles.leaderboardCell, flex: 1 }}>
            <span style={styles.entryAccuracy}>{entry.accuracy.toFixed(2)}%</span>
          </div>
          <div style={{ ...styles.leaderboardCell, flex: 1 }}>
            <span style={styles.entryCombo}>{entry.maxCombo}</span>
          </div>
          <div style={{ ...styles.leaderboardCell, flex: 1.2, textAlign: 'right' }}>
            <div>
              <span style={styles.entryDate}>{formatDate(entry.playedAt)}</span>
              {entry.isPracticeMode && (
                <span style={styles.practiceMiniBadge}>练习</span>
              )}
              {entry.playbackSpeed !== 1 && (
                <span style={styles.speedMiniBadge}>{entry.playbackSpeed}x</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TierGradeSection({ tier, breakdown, accuracy, health, showDetails }) {
  const tierInfo = getTierInfo(tier)
  const tierIndex = TIER_GRADES.findIndex(t => t.id === tier)
  const nextTier = tierIndex > 0 ? TIER_GRADES[tierIndex - 1] : null

  return (
    <div style={{
      ...tierStyles.container,
      opacity: showDetails ? 1 : 0,
      transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
    }}>
      <div style={tierStyles.header}>
        <span style={tierStyles.headerIcon}>⚔️</span>
        <span style={tierStyles.headerTitle}>段位评价</span>
      </div>

      <div style={tierStyles.mainRow}>
        <div style={{
          ...tierStyles.tierBadge,
          background: tierInfo.bg,
          color: tierInfo.color
        }}>
          <div style={tierStyles.tierId}>{tier}</div>
          <div style={tierStyles.tierName}>{tierInfo.name}</div>
        </div>

        <div style={tierStyles.breakdownColumn}>
          <TierBreakdownBar
            label={breakdown.accuracy.label}
            score={breakdown.accuracy.score}
            max={breakdown.accuracy.max}
            displayValue={`${accuracy.toFixed(2)}%`}
            color="#ffcc00"
          />
          <TierBreakdownBar
            label={breakdown.combo.label}
            score={breakdown.combo.score}
            max={breakdown.combo.max}
            displayValue={breakdown.combo.value === 'FC' ? 'FULL COMBO' : `${Math.round((breakdown.combo.ratio || 0) * 100)}%`}
            color="#00ffcc"
            isFC={breakdown.isFullCombo}
          />
          <TierBreakdownBar
            label={breakdown.health.label}
            score={breakdown.health.score}
            max={breakdown.health.max}
            displayValue={`${Math.round(health)}%`}
            color="#ff3366"
          />

          <div style={tierStyles.totalRow}>
            <span style={tierStyles.totalLabel}>综合评分</span>
            <span style={tierStyles.totalValue}>
              {breakdown.totalScore} / {breakdown.maxScore}
            </span>
            <div style={tierStyles.totalBarBg}>
              <div style={{
                ...tierStyles.totalBarFill,
                width: `${(breakdown.totalScore / breakdown.maxScore) * 100}%`,
                background: tierInfo.bg
              }} />
            </div>
          </div>
        </div>
      </div>

      {nextTier && (
        <div style={tierStyles.nextTierRow}>
          <span style={tierStyles.nextTierLabel}>距下一段位</span>
          <span style={{
            ...tierStyles.nextTierName,
            color: nextTier.color
          }}>
            {nextTier.id} {nextTier.name}
          </span>
          <div style={tierStyles.nextTierHints}>
            {accuracy < nextTier.threshold && (
              <span style={tierStyles.nextTierHint}>↑ 准确率需达 {nextTier.threshold}%</span>
            )}
            {nextTier.fullCombo && !breakdown.isFullCombo && (
              <span style={tierStyles.nextTierHint}>↑ 需要满连 (FC)</span>
            )}
            {health < nextTier.minHealth && (
              <span style={tierStyles.nextTierHint}>↑ 生命值需 ≥ {nextTier.minHealth}%</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TierBreakdownBar({ label, score, max, displayValue, color, isFC }) {
  return (
    <div style={tierStyles.breakdownItem}>
      <div style={tierStyles.breakdownHeader}>
        <span style={{ ...tierStyles.breakdownLabel, color }}>{label}</span>
        <span style={tierStyles.breakdownValue}>{displayValue}</span>
      </div>
      <div style={tierStyles.breakdownBarRow}>
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            style={{
              ...tierStyles.breakdownDot,
              background: i < score ? color : 'rgba(255,255,255,0.08)',
              boxShadow: i < score ? `0 0 8px ${color}66` : 'none'
            }}
          />
        ))}
      </div>
    </div>
  )
}

function StatItem({ label, value, color, total, count }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
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

function CompareItem({ label, currentValue, bestValue, format, isHigherBetter, isNewRecord }) {
  const diff = currentValue - bestValue
  const isImproved = isHigherBetter ? diff > 0 : diff < 0
  const isEqual = diff === 0
  const isWorse = isHigherBetter ? diff < 0 : diff > 0

  let diffText = ''
  let diffColor = 'rgba(255,255,255,0.4)'

  if (isEqual) {
    diffText = '持平'
    diffColor = 'rgba(255,255,255,0.5)'
  } else if (isImproved) {
    if (label === '准确率') {
      diffText = `+${diff.toFixed(2)}%`
    } else if (label === '失误') {
      diffText = `${diff}`
    } else {
      diffText = `+${diff.toLocaleString()}`
    }
    diffColor = '#00ffcc'
  } else {
    if (label === '准确率') {
      diffText = `${diff.toFixed(2)}%`
    } else if (label === '失误') {
      diffText = `+${Math.abs(diff)}`
    } else {
      diffText = `${diff.toLocaleString()}`
    }
    diffColor = '#ff3366'
  }

  const arrowIcon = isEqual ? '—' : (isImproved ? '↑' : '↓')

  return (
    <div style={{
      ...compareStyles.container,
      borderColor: isNewRecord ? 'rgba(255,204,0,0.4)' : undefined,
      background: isNewRecord
        ? 'linear-gradient(135deg, rgba(255,204,0,0.08), rgba(255,153,0,0.04))'
        : undefined
    }}>
      <div style={compareStyles.header}>
        <span style={compareStyles.label}>{label}</span>
        {isNewRecord && (
          <span style={compareStyles.newBadge}>🏆 新纪录</span>
        )}
      </div>
      <div style={compareStyles.valuesRow}>
        <div style={compareStyles.valueBlock}>
          <span style={compareStyles.valueLabel}>本次</span>
          <span style={{
            ...compareStyles.value,
            color: isNewRecord ? '#ffcc00' : '#fff'
          }}>{format(currentValue)}</span>
        </div>
        <div style={{
          ...compareStyles.arrowBlock,
          color: diffColor
        }}>
          <span style={compareStyles.arrow}>{arrowIcon}</span>
          <span style={compareStyles.diffText}>{diffText}</span>
        </div>
        <div style={compareStyles.valueBlock}>
          <span style={compareStyles.valueLabel}>最佳</span>
          <span style={compareStyles.bestValue}>{format(bestValue)}</span>
        </div>
      </div>
    </div>
  )
}

const tierStyles = {
  container: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '20px',
    transition: 'all 0.5s ease-out'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  headerIcon: {
    fontSize: '18px'
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '3px',
    color: 'rgba(255,255,255,0.7)'
  },
  mainRow: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center'
  },
  tierBadge: {
    flex: '0 0 120px',
    padding: '16px 12px',
    borderRadius: '14px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
  },
  tierId: {
    fontSize: '36px',
    fontWeight: 900,
    letterSpacing: '2px',
    lineHeight: 1.1
  },
  tierName: {
    fontSize: '13px',
    fontWeight: 600,
    opacity: 0.8,
    marginTop: '4px',
    letterSpacing: '2px'
  },
  breakdownColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  breakdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  breakdownLabel: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1.5px'
  },
  breakdownValue: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    fontWeight: 600
  },
  breakdownBarRow: {
    display: 'flex',
    gap: '6px'
  },
  breakdownDot: {
    width: '28px',
    height: '8px',
    borderRadius: '4px',
    transition: 'all 0.3s ease-out'
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  totalLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1.5px'
  },
  totalValue: {
    fontSize: '14px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#fff'
  },
  totalBarBg: {
    flex: 1,
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  totalBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out'
  },
  nextTierRow: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  nextTierLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600
  },
  nextTierName: {
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '1px'
  },
  nextTierHints: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  nextTierHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    padding: '3px 10px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)'
  }
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

const compareStyles = {
  container: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '14px 16px',
    transition: 'all 0.3s'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: 'rgba(255,255,255,0.7)'
  },
  newBadge: {
    padding: '3px 10px',
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 800,
    color: '#00332a',
    letterSpacing: '1px'
  },
  valuesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  valueBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  valueLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '1px'
  },
  value: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'monospace',
    transition: 'color 0.3s'
  },
  bestValue: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)'
  },
  arrowBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: '60px',
    transition: 'color 0.3s'
  },
  arrow: {
    fontSize: '18px',
    fontWeight: 900
  },
  diffText: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'monospace'
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
  newRecordBanner: {
    position: 'absolute',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    animation: 'bannerIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
  },
  newRecordBannerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 32px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.25), rgba(255,153,0,0.15))',
    border: '1.5px solid rgba(255,204,0,0.6)',
    borderRadius: '16px',
    boxShadow: '0 0 60px rgba(255,204,0,0.3), inset 0 0 40px rgba(255,204,0,0.05)',
    backdropFilter: 'blur(20px)'
  },
  newRecordStar: {
    fontSize: '24px',
    animation: 'pulseStar 1.2s ease-in-out infinite'
  },
  newRecordText: {
    fontSize: '22px',
    fontWeight: 900,
    letterSpacing: '6px',
    color: '#ffcc00',
    textShadow: '0 0 20px rgba(255,204,0,0.8)'
  },
  newRecordTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  newRecordTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '1px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
  },
  deltaPositive: {
    marginLeft: '4px',
    fontWeight: 800,
    fontSize: '10px',
    color: '#00332a'
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '820px',
    maxWidth: '94vw',
    maxHeight: '94vh',
    overflowY: 'auto',
    background: 'rgba(10,10,20,0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '36px 40px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 80px rgba(0,0,0,0.6)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  resultLabel: {
    marginBottom: '12px',
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap'
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
  practiceBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    background: 'rgba(0,255,204,0.12)',
    border: '1px solid rgba(0,255,204,0.3)',
    color: '#00ffcc',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px'
  },
  trackTitle: {
    fontSize: '30px',
    fontWeight: 800,
    letterSpacing: '4px',
    marginBottom: '6px',
    background: 'linear-gradient(135deg, #fff 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  trackArtist: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    marginBottom: '10px'
  },
  bestRecordInfo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: 'rgba(255,204,0,0.08)',
    border: '1px solid rgba(255,204,0,0.2)',
    borderRadius: '20px',
    marginTop: '8px'
  },
  bestRecordLabel: {
    fontSize: '11px',
    color: 'rgba(255,204,0,0.7)',
    fontWeight: 600
  },
  bestRecordScore: {
    fontSize: '14px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#ffcc00'
  },
  bestRecordAcc: {
    fontSize: '11px',
    color: 'rgba(255,204,0,0.6)',
    fontFamily: 'monospace'
  },
  mainRow: {
    display: 'flex',
    gap: '32px',
    marginBottom: '28px'
  },
  rankSection: {
    width: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rankBadge: {
    fontSize: '100px',
    fontWeight: 900,
    lineHeight: 1,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  rankLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '4px',
    marginTop: '8px'
  },
  scoreSection: {
    flex: 1
  },
  scoreLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    marginBottom: '6px'
  },
  scoreValue: {
    fontSize: '42px',
    fontWeight: 900,
    fontFamily: 'monospace',
    marginBottom: '16px',
    textShadow: '0 0 30px rgba(255,255,255,0.2)',
    transition: 'color 0.5s'
  },
  accuracyRow: {
    display: 'flex',
    gap: '12px'
  },
  accuracyItem: {
    flex: 1,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px'
  },
  accuracyLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1.5px',
    display: 'block',
    marginBottom: '4px'
  },
  accuracyValue: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#ffcc00',
    transition: 'color 0.3s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px',
    transition: 'all 0.5s ease-out'
  },
  judgmentOffsetSection: {
    marginBottom: '24px',
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(255,102,204,0.05), rgba(255,51,102,0.03))',
    border: '1px solid rgba(255,102,204,0.15)',
    borderRadius: '12px',
    transition: 'all 0.5s ease-out'
  },
  judgmentOffsetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  judgmentOffsetIcon: {
    fontSize: '18px'
  },
  judgmentOffsetTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '2px'
  },
  judgmentOffsetBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  judgmentOffsetValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  judgmentOffsetLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  },
  judgmentOffsetValue: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  judgmentOffsetInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  judgmentOffsetTip: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)'
  },
  judgmentOffsetAdvice: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)'
  },
  compareSection: {
    marginBottom: '24px',
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(102,153,255,0.05), rgba(0,255,204,0.03))',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    transition: 'all 0.5s ease-out'
  },
  compareHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  compareTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '2px'
  },
  compareSubtitle: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '1px'
  },
  compareGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  progressSection: {
    marginBottom: '24px'
  },
  progressLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginBottom: '8px'
  },
  progressBars: {
    display: 'flex',
    height: '10px',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  progressBarSegment: {
    height: '100%',
    transition: 'width 1s ease-out'
  },
  leaderboardSection: {
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    transition: 'all 0.5s ease-out'
  },
  leaderboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  leaderboardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '2px'
  },
  tabBar: {
    display: 'flex',
    gap: '6px'
  },
  tabBtn: {
    padding: '6px 14px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  leaderboardBody: {
    maxHeight: '300px',
    overflowY: 'auto'
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  leaderboardHeaderRow: {
    display: 'flex',
    padding: '8px 12px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px',
    fontWeight: 600,
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  leaderboardEntry: {
    display: 'flex',
    padding: '10px 12px',
    borderRadius: '8px',
    alignItems: 'center',
    transition: 'all 0.2s',
    border: '1px solid transparent'
  },
  leaderboardCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px'
  },
  rankMedal: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 900,
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
  },
  rankNumber: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    paddingLeft: '6px'
  },
  trackNameCell: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff'
  },
  trackArtistCell: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    marginTop: '2px'
  },
  entryScore: {
    fontSize: '13px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#fff'
  },
  rankBadgeMini: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 800
  },
  entryAccuracy: {
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.7)'
  },
  entryCombo: {
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: '#00ffcc'
  },
  entryDate: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'monospace'
  },
  currentPlayLabel: {
    padding: '3px 8px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(255,51,102,0.15))',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#ff3366'
  },
  historyIndex: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    paddingLeft: '10px'
  },
  practiceMiniBadge: {
    marginLeft: '6px',
    padding: '2px 6px',
    background: 'rgba(0,255,204,0.12)',
    border: '1px solid rgba(0,255,204,0.25)',
    borderRadius: '4px',
    fontSize: '9px',
    color: '#00ffcc',
    fontWeight: 600
  },
  speedMiniBadge: {
    marginLeft: '4px',
    padding: '2px 6px',
    background: 'rgba(102,153,255,0.12)',
    border: '1px solid rgba(102,153,255,0.25)',
    borderRadius: '4px',
    fontSize: '9px',
    color: '#6699ff',
    fontWeight: 600
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '36px',
    marginBottom: '12px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '1px'
  },
  growthSection: {
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.08), rgba(0,255,204,0.06))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    marginBottom: '24px',
    transition: 'all 0.5s ease-out'
  },
  growthLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: '2px',
    marginBottom: '16px'
  },
  growthRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '12px'
  },
  growthItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  growthItemLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  growthItemValue: {
    fontSize: '18px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  levelUpNotice: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.2), rgba(255,153,0,0.1))',
    border: '1px solid rgba(255,204,0,0.4)',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffcc00',
    marginBottom: '12px'
  },
  unlockSection: {
    marginTop: '12px'
  },
  unlockTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px'
  },
  unlockList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  unlockItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px'
  },
  unlockIcon: {
    fontSize: '15px'
  },
  unlockName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff'
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
    fontSize: '13px',
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
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '2px',
    boxShadow: '0 6px 30px rgba(255,51,102,0.35)',
    transition: 'all 0.2s'
  },
  tipText: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '2px'
  },
  tutorialCompleteOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(15px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.5s ease-out'
  },
  tutorialCompleteModal: {
    width: '520px',
    maxWidth: '90vw',
    padding: '48px 40px',
    background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(10,10,20,0.95))',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '24px',
    textAlign: 'center',
    boxShadow: '0 30px 100px rgba(255,204,0,0.15), 0 0 60px rgba(255,51,102,0.1)',
    animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  tutorialCompleteIcon: {
    fontSize: '72px',
    marginBottom: '16px',
    animation: 'bounce 1s ease-in-out infinite'
  },
  tutorialCompleteTitle: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 12px 0',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  tutorialCompleteDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '28px'
  },
  tutorialStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px'
  },
  tutorialStatItem: {
    flex: 1,
    padding: '16px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px'
  },
  tutorialStatLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
    marginBottom: '6px'
  },
  tutorialStatValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#ffcc00',
    fontFamily: 'monospace'
  },
  tutorialFeedback: {
    marginBottom: '24px'
  },
  feedbackCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    border: '1px solid',
    borderRadius: '12px'
  },
  feedbackIcon: {
    fontSize: '28px'
  },
  feedbackText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff'
  },
  tutorialTips: {
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    marginBottom: '28px',
    textAlign: 'left'
  },
  tutorialTipTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '10px'
  },
  tutorialTipList: {
    margin: 0,
    paddingLeft: '20px'
  },
  tutorialTipListLi: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '4px'
  },
  tutorialCompleteBtn: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(255,51,102,0.4)',
    transition: 'all 0.2s'
  },
  replayContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  replaySelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  replaySelectorLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
    fontWeight: 600
  },
  replaySelectorList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  replaySelectorItem: {
    position: 'relative',
    flex: '1 1 140px',
    minWidth: '140px',
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  replaySelectorItemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px'
  },
  replaySelectorScore: {
    fontSize: '13px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#fff'
  },
  replaySelectorAcc: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    marginLeft: 'auto'
  },
  replaySelectorItemSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace'
  },
  currentReplayBadge: {
    padding: '2px 6px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(255,51,102,0.15))',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: '4px',
    color: '#ff3366',
    fontWeight: 700
  },
  deleteReplayBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    background: 'rgba(255,51,102,0.2)',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: '4px',
    color: '#ff3366',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'all 0.2s'
  },
  replayTabBar: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '12px'
  },
  replayTabBtn: {
    flex: '1 1 auto',
    padding: '8px 10px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  timelineHint: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px'
  },
  replayCanvas: {
    width: '100%',
    height: '200px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  timelineLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '12px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  laneAnalysis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  laneCard: {
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px'
  },
  laneCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  laneCardTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '1px'
  },
  laneCardAcc: {
    fontSize: '14px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  laneCardStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
    marginBottom: '10px'
  },
  laneStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px'
  },
  laneStatLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.5px'
  },
  laneProgressBg: {
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  laneProgressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s ease-out'
  },
  timingAnalysis: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  timingCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px'
  },
  timingCard: {
    padding: '12px 8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    textAlign: 'center'
  },
  timingCardLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px',
    marginBottom: '6px'
  },
  timingCardValue: {
    fontSize: '22px',
    fontWeight: 800,
    fontFamily: 'monospace',
    marginBottom: '4px'
  },
  timingCardSub: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)'
  },
  timingHint: {
    padding: '12px 16px',
    background: 'linear-gradient(135deg, rgba(0,255,204,0.08), rgba(0,204,170,0.04))',
    border: '1px solid rgba(0,255,204,0.2)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center'
  },
  segmentAnalysis: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  segmentCard: {
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px'
  },
  segmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  segmentTime: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  segmentAcc: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  segmentBars: {
    display: 'flex',
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px'
  },
  segmentBar: {
    height: '100%',
    transition: 'width 1s ease-out'
  },
  segmentStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '10px',
    fontFamily: 'monospace'
  },
  segmentWarning: {
    marginTop: '6px',
    padding: '6px 10px',
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.2)',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#ff3366'
  },
  breaksAnalysis: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  breaksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px'
  },
  breaksHint: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)'
  },
  breaksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '250px',
    overflowY: 'auto'
  },
  breakItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: 'rgba(255,51,102,0.05)',
    border: '1px solid rgba(255,51,102,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  breakIndex: {
    width: '32px',
    fontSize: '14px',
    fontWeight: 800,
    color: '#ff3366',
    fontFamily: 'monospace'
  },
  breakInfo: {
    flex: 1
  },
  breakTime: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    marginBottom: '2px'
  },
  breakCombo: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)'
  },
  breakComboValue: {
    color: '#ff3366',
    fontWeight: 700
  },
  breakArrow: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.3)'
  },
  hitDistContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  hitDistCanvas: {
    width: '100%',
    height: '220px',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  hitDistLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  hitDistLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)'
  },
  hitDistLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  hitDistSummary: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '10px 0'
  },
  hitDistSummaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px'
  },
  hitDistSummaryLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)'
  },
  hitDistSummaryValue: {
    fontSize: '14px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  hitDistHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    padding: '4px 0'
  },
  mistakePeaksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  mistakePeaksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)'
  },
  mistakePeaksHint: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)'
  },
  mistakePeaksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  mistakePeakCard: {
    padding: '12px 14px',
    background: 'rgba(255,51,102,0.04)',
    border: '1px solid rgba(255,51,102,0.12)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  mistakePeakHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mistakePeakRank: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  mistakePeakRankNum: {
    fontSize: '14px',
    fontWeight: 900,
    fontFamily: 'monospace'
  },
  mistakePeakTime: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)'
  },
  mistakePeakErrorRate: {
    fontSize: '12px',
    fontWeight: 700
  },
  mistakePeakBarContainer: {
    padding: '0 2px'
  },
  mistakePeakBarBg: {
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  mistakePeakBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease'
  },
  mistakePeakStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)'
  },
  mistakePeakStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  mistakePeakStatDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  mistakePeakMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)'
  },
  mistakePeakLane: {
    fontFamily: 'monospace'
  },
  mistakePeakScoreLost: {
    color: '#ff3366',
    fontWeight: 600,
    fontFamily: 'monospace'
  },
  keyLossContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  keyLossCanvas: {
    width: '100%',
    height: '200px',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  keyLossLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  keyLossLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)'
  },
  keyLossLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  keyLossPhaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  keyLossPhaseCard: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeft: '3px solid',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  keyLossPhaseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  keyLossPhaseTime: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600
  },
  keyLossPhaseBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px'
  },
  keyLossPhaseDetail: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  keyLossPhaseBar: {
    display: 'flex',
    height: '4px',
    borderRadius: '2px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.05)'
  },
  keyLossPhaseBarSeg: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  keyLossHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    padding: '4px 0'
  },
  emptyHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center'
  },
  dailyChallengeResultBanner: {
    marginTop: '12px',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(255,153,0,0.1), rgba(255,204,0,0.05))',
    border: '1px solid rgba(255,153,0,0.25)',
    borderRadius: '12px'
  },
  dailyChallengeResultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  dailyChallengeResultIcon: {
    fontSize: '18px'
  },
  dailyChallengeResultTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#ff9900',
    letterSpacing: '2px'
  },
  dailyChallengeResultPassed: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#00ffcc'
  },
  dailyChallengeResultFailed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  dailyChallengeResultReasons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px'
  },
  dailyChallengeResultReason: {
    padding: '2px 8px',
    background: 'rgba(255,51,102,0.15)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#ff6666'
  },
  dailyChallengeResultPartial: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px'
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    border: '1px solid',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginLeft: '10px'
  },
  allDiffsMiniHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '10px',
    marginBottom: '4px',
    flexWrap: 'wrap'
  },
  allDiffsMiniLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)',
    fontWeight: 600,
    letterSpacing: '1px'
  },
  allDiffsMiniBadges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  diffMiniBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    border: '1px solid',
    borderRadius: '12px',
    transition: 'all 0.2s'
  },
  diffMiniName: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px'
  },
  diffMiniRank: {
    fontSize: '10px',
    fontWeight: 900,
    fontFamily: 'monospace'
  },
  diffMiniLocked: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'monospace'
  },
  diffSubTabBar: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  diffSubTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  diffSubTabCount: {
    padding: '1px 6px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    fontSize: '9px',
    fontFamily: 'monospace',
    opacity: 0.7
  },
  diffSubTabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  diffStatsSummary: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px'
  },
  diffStatsRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-around'
  },
  diffStatsItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  diffStatsLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '1px'
  },
  diffStatsValue: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'monospace'
  },
  allDiffsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  allDiffsHeader: {
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  allDiffsTitleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  allDiffsTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: '2px'
  },
  allDiffsProgressInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  allDiffsProgressText: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace'
  },
  allDiffsProgressBarBg: {
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  allDiffsProgressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.6s ease-out'
  },
  allDiffsCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px'
  },
  diffCard: {
    padding: '14px',
    border: '1.5px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease-out'
  },
  diffCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px'
  },
  diffCardName: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '2px',
    flex: 1
  },
  diffCardLevel: {
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  diffCurrentBadge: {
    padding: '2px 8px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.3), rgba(255,51,102,0.15))',
    border: '1px solid rgba(255,51,102,0.4)',
    borderRadius: '8px',
    fontSize: '9px',
    fontWeight: 700,
    color: '#ff3366',
    letterSpacing: '1px'
  },
  diffCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  diffCardScore: {
    fontSize: '18px',
    fontWeight: 900,
    fontFamily: 'monospace',
    color: '#fff',
    letterSpacing: '1px'
  },
  diffCardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  diffCardRank: {
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 900,
    fontFamily: 'monospace'
  },
  diffCardAcc: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#ffcc00',
    fontFamily: 'monospace'
  },
  diffCardCombo: {
    fontSize: '10px',
    color: '#00ffcc',
    fontFamily: 'monospace',
    opacity: 0.8
  },
  diffCardDate: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    marginTop: '2px'
  },
  diffCardLocked: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 0'
  },
  diffCardLockedIcon: {
    fontSize: '20px',
    opacity: 0.4
  },
  diffCardLockedText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.35)'
  },
  diffCardLockedNotes: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: 'monospace'
  },
  selectedDiffDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  selectedDiffHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    border: '1px solid',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)'
  },
  selectedDiffTitle: {
    fontSize: '13px',
    fontWeight: 800,
    letterSpacing: '2px'
  },
  selectedDiffLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  missionsSection: {
    marginTop: '20px',
    padding: '20px',
    background: 'rgba(10,10,20,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    transition: 'all 0.4s ease-out'
  },
  missionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px'
  },
  missionsIcon: {
    fontSize: '20px'
  },
  missionsTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '2px',
    flex: 1
  },
  missionsSummary: {
    fontSize: '13px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  missionsBonus: {
    marginLeft: '8px',
    padding: '3px 8px',
    background: 'rgba(255,204,0,0.15)',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffcc00'
  },
  missionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  missionCard: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid',
    transition: 'all 0.3s ease'
  },
  missionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  missionCardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 800,
    flexShrink: 0
  },
  missionCardInfo: {
    flex: 1,
    minWidth: 0
  },
  missionCardName: {
    fontSize: '14px',
    fontWeight: 700,
    marginBottom: '2px'
  },
  missionCardDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  missionCardStatus: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'monospace',
    flexShrink: 0
  },
  missionCardBonus: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  missionBonusText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  allMissionsCompleteBanner: {
    marginTop: '16px',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(255,204,0,0.1))',
    border: '1px solid rgba(0,255,204,0.3)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  allCompleteIcon: {
    fontSize: '24px'
  },
  allCompleteText: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#00ffcc',
    letterSpacing: '1px'
  },
  allCompleteBonus: {
    padding: '4px 10px',
    background: 'rgba(255,204,0,0.2)',
    border: '1px solid rgba(255,204,0,0.4)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#ffcc00'
  }
}

function ReplayAnalysis({
  replayData,
  replayAnalysis,
  trackReplays,
  selectedReplayId,
  onSelectReplay,
  onDeleteReplay,
  formatDate,
  getRankBadgeStyle,
  timelineCursor,
  setTimelineCursor,
  showTimelineDetail,
  setShowTimelineDetail,
  replayCanvasRef,
  replayAnimRef,
  track
}) {
  const [replayTab, setReplayTab] = useState('timeline')
  const hitDistCanvasRef = useRef(null)
  const hitDistAnimRef = useRef(null)
  const keyLossCanvasRef = useRef(null)
  const keyLossAnimRef = useRef(null)

  useEffect(() => {
    if (!replayData || !replayAnalysis || replayTab !== 'timeline') return
    
    const canvas = replayCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    const w = rect.width
    const h = rect.height

    let t = 0
    const draw = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)

      const duration = track.duration
      const padding = { top: 20, right: 20, bottom: 40, left: 50 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (chartW / 10) * i
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + chartH)
        ctx.stroke()
        
        const time = Math.round((duration / 10) * i)
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${time}s`, x, padding.top + chartH + 20)
      }

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }

      const laneHeight = chartH / 4
      replayData.judgeEvents.forEach(judge => {
        const x = padding.left + (judge.time / duration) * chartW
        const laneY = padding.top + laneHeight * judge.lane + laneHeight / 2
        
        const size = judge.judgeType === 'perfect' ? 6 : judge.judgeType === 'great' ? 5 : judge.judgeType === 'good' ? 4 : 3
        const alpha = judge.judgeType === 'miss' ? 0.8 : 0.9
        
        ctx.beginPath()
        ctx.arc(x, laneY, size, 0, Math.PI * 2)
        ctx.fillStyle = `${judgeColors[judge.judgeType]}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.fill()
        
        if (Math.abs(x - (padding.left + (timelineCursor / duration) * chartW)) < 4) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })

      for (let i = 0; i < 4; i++) {
        const y = padding.top + laneHeight * i
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
        ctx.stroke()
        ctx.setLineDash([])
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`L${i + 1}`, padding.left - 8, y + laneHeight / 2 + 4)
      }

      const cursorX = padding.left + (timelineCursor / duration) * chartW
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cursorX, padding.top)
      ctx.lineTo(cursorX, padding.top + chartH)
      ctx.stroke()

      if (showTimelineDetail) {
        const judge = replayData.judgeEvents.find(j => 
          Math.abs(j.time - timelineCursor) < 0.1
        )
        if (judge) {
          const timeStr = `${judge.time.toFixed(2)}s`
          const diffMs = Math.round(judge.timeDiff * 1000)
          const text = `${judge.judgeType.toUpperCase()} · ${diffMs > 0 ? '+' : ''}${diffMs}ms`
          const textW = ctx.measureText(text).width + 16
          
          ctx.fillStyle = 'rgba(0,0,0,0.85)'
          ctx.fillRect(cursorX - textW / 2, padding.top - 30, textW, 22)
          ctx.fillStyle = judgeColors[judge.judgeType]
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(text, cursorX, padding.top - 14)
        }
      }

      replayAnimRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      if (replayAnimRef.current) {
        cancelAnimationFrame(replayAnimRef.current)
      }
    }
  }, [replayData, replayAnalysis, replayTab, timelineCursor, showTimelineDetail, track, replayCanvasRef, replayAnimRef])

  useEffect(() => {
    if (!replayAnalysis || replayTab !== 'hitDistribution') return
    const canvas = hitDistCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    const w = rect.width
    const h = rect.height
    const dist = replayAnalysis.hitTimeDistribution
    if (!dist || dist.length === 0) return

    let animProgress = 0
    const draw = () => {
      animProgress = Math.min(animProgress + 0.04, 1)
      const ease = 1 - Math.pow(1 - animProgress, 3)
      ctx.clearRect(0, 0, w, h)

      const padding = { top: 30, right: 20, bottom: 50, left: 60 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom

      const maxCount = Math.max(...dist.map(b => b.count), 1)
      const minOffset = dist[0].offset
      const maxOffset = dist[dist.length - 1].offset
      const range = maxOffset - minOffset || 100
      const barWidth = Math.max(4, (chartW / dist.length) * 0.7)

      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
        ctx.stroke()
        const val = Math.round(maxCount * (1 - i / 5))
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '9px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(val, padding.left - 8, y + 3)
      }

      ctx.strokeStyle = 'rgba(255,204,0,0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      const centerBucket = dist.find(b => b.offset === 0)
      if (centerBucket || minOffset <= 0 && maxOffset >= 0) {
        const zeroX = padding.left + ((0 - minOffset) / range) * chartW
        ctx.beginPath()
        ctx.moveTo(zeroX, padding.top)
        ctx.lineTo(zeroX, padding.top + chartH)
        ctx.stroke()
      }
      ctx.setLineDash([])

      dist.forEach((bucket, i) => {
        const x = padding.left + ((bucket.offset - minOffset) / range) * chartW
        const barH = (bucket.count / maxCount) * chartH * ease
        const y = padding.top + chartH - barH

        const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH)
        if (bucket.offset < -100) {
          grad.addColorStop(0, 'rgba(102,153,255,0.9)')
          grad.addColorStop(1, 'rgba(102,153,255,0.3)')
        } else if (bucket.offset > 100) {
          grad.addColorStop(0, 'rgba(255,51,102,0.9)')
          grad.addColorStop(1, 'rgba(255,51,102,0.3)')
        } else {
          grad.addColorStop(0, 'rgba(255,204,0,0.9)')
          grad.addColorStop(1, 'rgba(0,255,204,0.5)')
        }

        ctx.fillStyle = grad
        const bw = Math.max(3, barWidth)
        ctx.fillRect(x - bw / 2, y, bw, barH)

        const innerH = barH * ease
        if (innerH > 4) {
          const perfectH = (bucket.perfect / bucket.count) * innerH
          const greatH = (bucket.great / bucket.count) * innerH
          let curY = padding.top + chartH - innerH
          if (perfectH > 0) {
            ctx.fillStyle = 'rgba(255,204,0,0.6)'
            ctx.fillRect(x - bw / 2, curY, bw, perfectH)
            curY += perfectH
          }
          if (greatH > 0) {
            ctx.fillStyle = 'rgba(0,255,204,0.6)'
            ctx.fillRect(x - bw / 2, curY, bw, greatH)
            curY += greatH
          }
          if (bucket.good > 0) {
            const goodH = (bucket.good / bucket.count) * innerH
            ctx.fillStyle = 'rgba(102,153,255,0.6)'
            ctx.fillRect(x - bw / 2, curY, bw, goodH)
          }
        }
      })

      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      const labelStep = Math.max(1, Math.floor(dist.length / 8))
      dist.forEach((bucket, i) => {
        if (i % labelStep === 0) {
          const x = padding.left + ((bucket.offset - minOffset) / range) * chartW
          ctx.fillText(`${bucket.offset}ms`, x, padding.top + chartH + 18)
        }
      })

      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('← 早按 (EARLY)', padding.left + chartW * 0.2, padding.top + chartH + 38)
      ctx.fillText('晚按 (LATE) →', padding.left + chartW * 0.8, padding.top + chartH + 38)

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('命中时间偏差分布', padding.left, padding.top - 12)

      if (animProgress < 1) {
        hitDistAnimRef.current = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => { if (hitDistAnimRef.current) cancelAnimationFrame(hitDistAnimRef.current) }
  }, [replayAnalysis, replayTab])

  useEffect(() => {
    if (!replayAnalysis || replayTab !== 'keyLoss') return
    const canvas = keyLossCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    const w = rect.width
    const h = rect.height
    const phases = replayAnalysis.keyLossPhases
    if (!phases || phases.length === 0) return

    let animProgress = 0
    const draw = () => {
      animProgress = Math.min(animProgress + 0.04, 1)
      const ease = 1 - Math.pow(1 - animProgress, 3)
      ctx.clearRect(0, 0, w, h)

      const padding = { top: 40, right: 20, bottom: 50, left: 60 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom
      const maxLost = Math.max(...phases.map(p => p.scoreLost), 1)

      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartW, y)
        ctx.stroke()
        const val = Math.round(maxLost * (1 - i / 5))
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '9px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(val, padding.left - 8, y + 3)
      }

      const barW = (chartW / phases.length) * 0.65
      const gap = (chartW / phases.length) * 0.35

      phases.forEach((phase, i) => {
        const x = padding.left + (chartW / phases.length) * i + gap / 2
        const barH = (phase.scoreLost / maxLost) * chartH * ease
        const y = padding.top + chartH - barH

        const severityColor = phase.severity === 'critical' ? '#ff3366' : phase.severity === 'warning' ? '#ffcc00' : '#00ffcc'
        const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH)
        grad.addColorStop(0, severityColor + 'dd')
        grad.addColorStop(1, severityColor + '33')
        ctx.fillStyle = grad
        ctx.fillRect(x, y, barW, barH)

        if (phase.miss > 0) {
          const missH = (phase.miss / (phase.total || 1)) * barH
          ctx.fillStyle = 'rgba(255,51,102,0.7)'
          ctx.fillRect(x, padding.top + chartH - missH, barW, missH)
        }

        if (phase.severity === 'critical' || phase.severity === 'warning') {
          ctx.strokeStyle = severityColor + '88'
          ctx.lineWidth = 1
          ctx.strokeRect(x - 1, y - 1, barW + 2, barH + 2)
        }

        const timeLabel = `${Math.floor(phase.startTime / 60)}:${String(Math.floor(phase.startTime % 60)).padStart(2, '0')}`
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(timeLabel, x + barW / 2, padding.top + chartH + 14)

        if (phase.scoreLost > 0 && barH > 12) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`-${phase.scoreLost}`, x + barW / 2, y - 4)
        }
      })

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('关键失分阶段分析', padding.left, padding.top - 18)

      ctx.font = '9px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.textAlign = 'center'
      ctx.fillText('时间段', padding.left + chartW / 2, padding.top + chartH + 36)

      ctx.textAlign = 'left'
      ctx.fillText('失分量', padding.left - 45, padding.top - 4)

      if (animProgress < 1) {
        keyLossAnimRef.current = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => { if (keyLossAnimRef.current) cancelAnimationFrame(keyLossAnimRef.current) }
  }, [replayAnalysis, replayTab])

  const handleTimelineClick = (e) => {
    if (!replayData) return
    const canvas = replayCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 50, right: 20 }
    const chartW = rect.width - padding.left - padding.right
    const ratio = (x - padding.left) / chartW
    const time = Math.max(0, Math.min(track.duration, ratio * track.duration))
    setTimelineCursor(time)
    
    const judge = replayData.judgeEvents.find(j => 
      Math.abs(j.time - time) < 0.1
    )
    if (judge) {
      setShowTimelineDetail(judge)
      setTimeout(() => setShowTimelineDetail(null), 3000)
    }
  }

  if (!replayData && trackReplays.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🎬</div>
        <div style={styles.emptyText}>暂无回放记录</div>
        <div style={styles.emptyHint}>完成游戏后将自动保存回放数据</div>
      </div>
    )
  }

  const currentReplay = trackReplays.find(r => r.id === selectedReplayId) || replayData

  return (
    <div style={styles.replayContainer}>
      {trackReplays.length > 0 && (
        <div style={styles.replaySelector}>
          <div style={styles.replaySelectorLabel}>选择回放</div>
          <div style={styles.replaySelectorList}>
            {trackReplays.slice(0, 5).map((r, idx) => (
              <div
                key={r.id}
                onClick={() => onSelectReplay(r.id)}
                className="replay-selector-item"
                style={{
                  ...styles.replaySelectorItem,
                  background: selectedReplayId === r.id 
                    ? 'linear-gradient(135deg, rgba(255,51,102,0.2), rgba(0,255,204,0.15))'
                    : 'rgba(255,255,255,0.03)',
                  borderColor: selectedReplayId === r.id 
                    ? 'rgba(255,51,102,0.4)' 
                    : 'rgba(255,255,255,0.06)'
                }}
              >
                <div style={styles.replaySelectorItemMain}>
                  <span style={styles.replaySelectorScore}>
                    {String(r.summary?.score || r.score).padStart(8, '0')}
                  </span>
                  <span style={{
                    ...styles.rankBadgeMini,
                    ...getRankBadgeStyle(r.summary?.rank || r.rank)
                  }}>
                    {r.summary?.rank || r.rank}
                  </span>
                  <span style={styles.replaySelectorAcc}>
                    {(r.summary?.accuracy || r.accuracy).toFixed(2)}%
                  </span>
                </div>
                <div style={styles.replaySelectorItemSub}>
                  <span>{formatDate(r.playedAt)}</span>
                  {r.playbackSpeed !== 1 && (
                    <span style={styles.speedMiniBadge}>{r.playbackSpeed}x</span>
                  )}
                  {idx === 0 && replayData && r.id === replayData.id && (
                    <span style={styles.currentReplayBadge}>本次</span>
                  )}
                </div>
                <button
                  className="delete-replay-btn"
                  style={styles.deleteReplayBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('确定删除此回放吗？')) {
                      onDeleteReplay(r.id)
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentReplay && replayAnalysis && (
        <>
          <div style={styles.replayTabBar}>
            {[
              { id: 'timeline', label: '🕐 判定时间线' },
              { id: 'lanes', label: '📊 轨道分析' },
              { id: 'timing', label: '⏱ 时机偏差' },
              { id: 'hitDistribution', label: '🎯 命中分布' },
              { id: 'segments', label: '📈 分段表现' },
              { id: 'mistakePeaks', label: '⚡ 失误波峰' },
              { id: 'keyLoss', label: '🔥 失分阶段' },
              { id: 'breaks', label: '💔 连击中断' }
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  ...styles.replayTabBtn,
                  background: replayTab === tab.id
                    ? 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,204,170,0.1))'
                    : 'rgba(255,255,255,0.03)',
                  borderColor: replayTab === tab.id
                    ? 'rgba(0,255,204,0.3)'
                    : 'rgba(255,255,255,0.06)',
                  color: replayTab === tab.id ? '#00ffcc' : 'rgba(255,255,255,0.5)'
                }}
                onClick={() => setReplayTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {replayTab === 'timeline' && (
            <div>
              <div style={styles.timelineHint}>
                💡 点击时间线查看判定详情
              </div>
              <canvas
                ref={replayCanvasRef}
                style={styles.replayCanvas}
                onClick={handleTimelineClick}
              />
              <div style={styles.timelineLegend}>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#ffcc00' }}></span>
                  <span>PERFECT</span>
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#00ffcc' }}></span>
                  <span>GREAT</span>
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#6699ff' }}></span>
                  <span>GOOD</span>
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: '#ff3366' }}></span>
                  <span>MISS</span>
                </div>
              </div>
            </div>
          )}

          {replayTab === 'lanes' && (
            <div style={styles.laneAnalysis}>
              {replayAnalysis.laneStats.map(lane => (
                <div key={lane.lane} style={styles.laneCard}>
                  <div style={styles.laneCardHeader}>
                    <span style={styles.laneCardTitle}>轨道 {lane.lane + 1}</span>
                    <span style={{
                      ...styles.laneCardAcc,
                      color: lane.accuracy >= 90 ? '#ffcc00' : lane.accuracy >= 70 ? '#00ffcc' : '#ff3366'
                    }}>
                      {lane.accuracy.toFixed(2)}%
                    </span>
                  </div>
                  <div style={styles.laneCardStats}>
                    <div style={styles.laneStatItem}>
                      <span style={{ color: '#ffcc00' }}>{lane.perfect}</span>
                      <span style={styles.laneStatLabel}>PERFECT</span>
                    </div>
                    <div style={styles.laneStatItem}>
                      <span style={{ color: '#00ffcc' }}>{lane.great}</span>
                      <span style={styles.laneStatLabel}>GREAT</span>
                    </div>
                    <div style={styles.laneStatItem}>
                      <span style={{ color: '#6699ff' }}>{lane.good}</span>
                      <span style={styles.laneStatLabel}>GOOD</span>
                    </div>
                    <div style={styles.laneStatItem}>
                      <span style={{ color: '#ff3366' }}>{lane.miss}</span>
                      <span style={styles.laneStatLabel}>MISS</span>
                    </div>
                  </div>
                  <div style={styles.laneProgressBg}>
                    <div style={{
                      ...styles.laneProgressFill,
                      width: `${lane.total > 0 ? ((lane.perfect + lane.great) / lane.total) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #ffcc00, #00ffcc)'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {replayTab === 'timing' && (
            <div style={styles.timingAnalysis}>
              <div style={styles.timingCards}>
                <div style={styles.timingCard}>
                  <div style={styles.timingCardLabel}>早按</div>
                  <div style={{ ...styles.timingCardValue, color: '#6699ff' }}>
                    {replayAnalysis.earlyLate.early}
                  </div>
                  <div style={styles.timingCardSub}>按键过快</div>
                </div>
                <div style={styles.timingCard}>
                  <div style={styles.timingCardLabel}>完美时机</div>
                  <div style={{ ...styles.timingCardValue, color: '#ffcc00' }}>
                    {replayAnalysis.earlyLate.perfectTiming}
                  </div>
                  <div style={styles.timingCardSub}>完全对齐</div>
                </div>
                <div style={styles.timingCard}>
                  <div style={styles.timingCardLabel}>晚按</div>
                  <div style={{ ...styles.timingCardValue, color: '#ff3366' }}>
                    {replayAnalysis.earlyLate.late}
                  </div>
                  <div style={styles.timingCardSub}>按键过慢</div>
                </div>
                <div style={styles.timingCard}>
                  <div style={styles.timingCardLabel}>平均偏差</div>
                  <div style={{
                    ...styles.timingCardValue,
                    color: replayAnalysis.earlyLate.averageDiff > 50 ? '#ff3366' 
                          : replayAnalysis.earlyLate.averageDiff > 20 ? '#ffcc00' 
                          : '#00ffcc'
                  }}>
                    {replayAnalysis.earlyLate.averageDiff > 0 ? '+' : ''}
                    {replayAnalysis.earlyLate.averageDiff}ms
                  </div>
                  <div style={styles.timingCardSub}>
                    {replayAnalysis.earlyLate.averageDiff > 20 ? '整体偏慢' 
                     : replayAnalysis.earlyLate.averageDiff < -20 ? '整体偏快' 
                     : '时机良好'}
                  </div>
                </div>
              </div>
              
              <div style={styles.timingHint}>
                {replayAnalysis.earlyLate.early > replayAnalysis.earlyLate.late ? (
                  <span>💡 你的按键普遍偏快，尝试稍晚一点再按键</span>
                ) : replayAnalysis.earlyLate.late > replayAnalysis.earlyLate.early ? (
                  <span>💡 你的按键普遍偏慢，尝试稍早一点再按键</span>
                ) : (
                  <span>💡 你的按键时机非常均衡，继续保持！</span>
                )}
              </div>
            </div>
          )}

          {replayTab === 'hitDistribution' && (
            <div style={styles.hitDistContainer}>
              <canvas ref={hitDistCanvasRef} style={styles.hitDistCanvas} />
              <div style={styles.hitDistLegend}>
                <div style={styles.hitDistLegendItem}>
                  <span style={{ ...styles.hitDistLegendDot, background: '#ffcc00' }}></span>
                  <span>PERFECT</span>
                </div>
                <div style={styles.hitDistLegendItem}>
                  <span style={{ ...styles.hitDistLegendDot, background: '#00ffcc' }}></span>
                  <span>GREAT</span>
                </div>
                <div style={styles.hitDistLegendItem}>
                  <span style={{ ...styles.hitDistLegendDot, background: '#6699ff' }}></span>
                  <span>GOOD</span>
                </div>
                <div style={styles.hitDistLegendItem}>
                  <span style={{ ...styles.hitDistLegendDot, background: 'rgba(255,204,0,0.3)', border: '1px dashed rgba(255,204,0,0.5)' }}></span>
                  <span>零偏差线</span>
                </div>
              </div>
              {replayAnalysis.hitTimeDistribution.length > 0 && (
                <div style={styles.hitDistSummary}>
                  <div style={styles.hitDistSummaryItem}>
                    <span style={styles.hitDistSummaryLabel}>最集中偏差</span>
                    <span style={{
                      ...styles.hitDistSummaryValue,
                      color: replayAnalysis.hitTimeDistribution.reduce((a, b) => a.count > b.count ? a : b).offset > 50 ? '#ff3366'
                        : replayAnalysis.hitTimeDistribution.reduce((a, b) => a.count > b.count ? a : b).offset < -50 ? '#6699ff' : '#ffcc00'
                    }}>
                      {replayAnalysis.hitTimeDistribution.reduce((a, b) => a.count > b.count ? a : b).offset}ms
                    </span>
                  </div>
                  <div style={styles.hitDistSummaryItem}>
                    <span style={styles.hitDistSummaryLabel}>偏差范围</span>
                    <span style={styles.hitDistSummaryValue}>
                      {replayAnalysis.hitTimeDistribution[0].offset}ms ~ {replayAnalysis.hitTimeDistribution[replayAnalysis.hitTimeDistribution.length - 1].offset}ms
                    </span>
                  </div>
                  <div style={styles.hitDistSummaryItem}>
                    <span style={styles.hitDistSummaryLabel}>±50ms内占比</span>
                    <span style={{
                      ...styles.hitDistSummaryValue,
                      color: (() => {
                        const within = replayAnalysis.hitTimeDistribution.filter(b => Math.abs(b.offset) <= 50).reduce((s, b) => s + b.count, 0)
                        const total = replayAnalysis.hitTimeDistribution.reduce((s, b) => s + b.count, 0)
                        const pct = total > 0 ? (within / total) * 100 : 0
                        return pct >= 70 ? '#ffcc00' : pct >= 40 ? '#00ffcc' : '#ff3366'
                      })()
                    }}>
                      {(() => {
                        const within = replayAnalysis.hitTimeDistribution.filter(b => Math.abs(b.offset) <= 50).reduce((s, b) => s + b.count, 0)
                        const total = replayAnalysis.hitTimeDistribution.reduce((s, b) => s + b.count, 0)
                        return total > 0 ? Math.round((within / total) * 1000) / 10 : 0
                      })()}%
                    </span>
                  </div>
                </div>
              )}
              <div style={styles.hitDistHint}>
                💡 分布越集中在零偏差线附近，说明时机掌握越精准
              </div>
            </div>
          )}

          {replayTab === 'segments' && (
            <div style={styles.segmentAnalysis}>
              {replayAnalysis.timeSegments.map((seg, idx) => {
                if (seg.total === 0) return null
                return (
                  <div key={idx} style={styles.segmentCard}>
                    <div style={styles.segmentHeader}>
                      <span style={styles.segmentTime}>
                        {Math.floor(seg.startTime / 60)}:{String(Math.floor(seg.startTime % 60)).padStart(2, '0')} - 
                        {Math.floor(seg.endTime / 60)}:{String(Math.floor(seg.endTime % 60)).padStart(2, '0')}
                      </span>
                      <span style={{
                        ...styles.segmentAcc,
                        color: seg.accuracy >= 90 ? '#ffcc00' : seg.accuracy >= 70 ? '#00ffcc' : '#ff3366'
                      }}>
                        {seg.accuracy.toFixed(2)}%
                      </span>
                    </div>
                    <div style={styles.segmentBars}>
                      <div style={{ ...styles.segmentBar, width: `${(seg.perfect / seg.total) * 100}%`, background: '#ffcc00' }}></div>
                      <div style={{ ...styles.segmentBar, width: `${(seg.great / seg.total) * 100}%`, background: '#00ffcc' }}></div>
                      <div style={{ ...styles.segmentBar, width: `${(seg.good / seg.total) * 100}%`, background: '#6699ff' }}></div>
                      <div style={{ ...styles.segmentBar, width: `${(seg.miss / seg.total) * 100}%`, background: '#ff3366' }}></div>
                    </div>
                    <div style={styles.segmentStats}>
                      <span style={{ color: '#ffcc00' }}>P:{seg.perfect}</span>
                      <span style={{ color: '#00ffcc' }}>G:{seg.great}</span>
                      <span style={{ color: '#6699ff' }}>O:{seg.good}</span>
                      <span style={{ color: '#ff3366' }}>M:{seg.miss}</span>
                    </div>
                    {seg.accuracy < 70 && (
                      <div style={styles.segmentWarning}>
                        ⚠️ 此段表现较弱，建议重点练习
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {replayTab === 'mistakePeaks' && (
            <div style={styles.mistakePeaksContainer}>
              {replayAnalysis.mistakePeaks.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎯</div>
                  <div style={styles.emptyText}>没有明显失误波峰</div>
                  <div style={styles.emptyHint}>你的表现非常稳定！</div>
                </div>
              ) : (
                <>
                  <div style={styles.mistakePeaksHeader}>
                    <span>检测到 {replayAnalysis.mistakePeaks.length} 个失误密集区</span>
                    <span style={styles.mistakePeaksHint}>按严重程度排列</span>
                  </div>
                  <div style={styles.mistakePeaksList}>
                    {replayAnalysis.mistakePeaks.map((peak, idx) => (
                      <div key={idx} style={styles.mistakePeakCard}>
                        <div style={styles.mistakePeakHeader}>
                          <div style={styles.mistakePeakRank}>
                            <span style={{
                              ...styles.mistakePeakRankNum,
                              color: idx < 2 ? '#ff3366' : idx < 5 ? '#ffcc00' : '#00ffcc'
                            }}>#{idx + 1}</span>
                            <span style={styles.mistakePeakTime}>
                              {Math.floor(peak.startTime / 60)}:{String(Math.floor(peak.startTime % 60)).padStart(2, '0')} - 
                              {Math.floor(peak.endTime / 60)}:{String(Math.floor(peak.endTime % 60)).padStart(2, '0')}
                            </span>
                          </div>
                          <div style={{
                            ...styles.mistakePeakErrorRate,
                            color: peak.errorRate >= 60 ? '#ff3366' : peak.errorRate >= 30 ? '#ffcc00' : '#00ffcc'
                          }}>
                            {peak.errorRate}% 失误率
                          </div>
                        </div>
                        <div style={styles.mistakePeakBarContainer}>
                          <div style={styles.mistakePeakBarBg}>
                            <div style={{
                              ...styles.mistakePeakBarFill,
                              width: `${peak.errorRate}%`,
                              background: peak.errorRate >= 60 ? 'linear-gradient(90deg, #ff3366, #ff6666)' : peak.errorRate >= 30 ? 'linear-gradient(90deg, #ffcc00, #ff9933)' : 'linear-gradient(90deg, #00ffcc, #00ccaa)'
                            }}></div>
                          </div>
                        </div>
                        <div style={styles.mistakePeakStats}>
                          <div style={styles.mistakePeakStat}>
                            <span style={{ ...styles.mistakePeakStatDot, background: '#ff3366' }}></span>
                            <span>MISS: {peak.missCount}</span>
                          </div>
                          <div style={styles.mistakePeakStat}>
                            <span style={{ ...styles.mistakePeakStatDot, background: '#6699ff' }}></span>
                            <span>GOOD: {peak.goodCount}</span>
                          </div>
                          <div style={styles.mistakePeakStat}>
                            <span style={{ ...styles.mistakePeakStatDot, background: 'rgba(255,255,255,0.3)' }}></span>
                            <span>总音符: {peak.totalInWindow}</span>
                          </div>
                        </div>
                        <div style={styles.mistakePeakMeta}>
                          <span style={styles.mistakePeakLane}>
                            涉及轨道: {peak.lanes.map(l => `L${l + 1}`).join(', ')}
                          </span>
                          {peak.scoreLost < 0 && (
                            <span style={styles.mistakePeakScoreLost}>
                              失分: {peak.scoreLost}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={styles.mistakePeaksHint}>
                    💡 失误波峰代表短时间内连续出现失误的区域，优先攻克这些区段可快速提升成绩
                  </div>
                </>
              )}
            </div>
          )}

          {replayTab === 'keyLoss' && (
            <div style={styles.keyLossContainer}>
              <canvas ref={keyLossCanvasRef} style={styles.keyLossCanvas} />
              <div style={styles.keyLossLegend}>
                <div style={styles.keyLossLegendItem}>
                  <span style={{ ...styles.keyLossLegendDot, background: '#ff3366' }}></span>
                  <span>严重失分</span>
                </div>
                <div style={styles.keyLossLegendItem}>
                  <span style={{ ...styles.keyLossLegendDot, background: '#ffcc00' }}></span>
                  <span>警告</span>
                </div>
                <div style={styles.keyLossLegendItem}>
                  <span style={{ ...styles.keyLossLegendDot, background: '#00ffcc' }}></span>
                  <span>正常</span>
                </div>
              </div>
              <div style={styles.keyLossPhaseList}>
                {replayAnalysis.keyLossPhases.filter(p => p.severity !== 'normal').length > 0 ? (
                  replayAnalysis.keyLossPhases
                    .filter(p => p.severity !== 'normal')
                    .sort((a, b) => b.scoreLost - a.scoreLost)
                    .map((phase, idx) => (
                      <div key={idx} style={{
                        ...styles.keyLossPhaseCard,
                        borderLeftColor: phase.severity === 'critical' ? '#ff3366' : '#ffcc00'
                      }}>
                        <div style={styles.keyLossPhaseHeader}>
                          <span style={styles.keyLossPhaseTime}>
                            {Math.floor(phase.startTime / 60)}:{String(Math.floor(phase.startTime % 60)).padStart(2, '0')} - 
                            {Math.floor(phase.endTime / 60)}:{String(Math.floor(phase.endTime % 60)).padStart(2, '0')}
                          </span>
                          <span style={{
                            ...styles.keyLossPhaseBadge,
                            background: phase.severity === 'critical' ? 'rgba(255,51,102,0.2)' : 'rgba(255,204,0,0.2)',
                            color: phase.severity === 'critical' ? '#ff3366' : '#ffcc00'
                          }}>
                            {phase.severity === 'critical' ? '严重' : '警告'}
                          </span>
                        </div>
                        <div style={styles.keyLossPhaseDetail}>
                          <span>失分 <strong style={{ color: '#ff3366' }}>-{phase.scoreLost}</strong></span>
                          <span>MISS {phase.miss}</span>
                          <span>GOOD {phase.good}</span>
                          {phase.comboBreaksCount > 0 && <span>断连 {phase.comboBreaksCount}次</span>}
                        </div>
                        <div style={styles.keyLossPhaseBar}>
                          {phase.total > 0 && (
                            <>
                              <div style={{ ...styles.keyLossPhaseBarSeg, width: `${(phase.perfect / phase.total) * 100}%`, background: '#ffcc00' }}></div>
                              <div style={{ ...styles.keyLossPhaseBarSeg, width: `${(phase.great / phase.total) * 100}%`, background: '#00ffcc' }}></div>
                              <div style={{ ...styles.keyLossPhaseBarSeg, width: `${(phase.good / phase.total) * 100}%`, background: '#6699ff' }}></div>
                              <div style={{ ...styles.keyLossPhaseBarSeg, width: `${(phase.miss / phase.total) * 100}%`, background: '#ff3366' }}></div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🌟</div>
                    <div style={styles.emptyText}>没有关键失分阶段</div>
                    <div style={styles.emptyHint}>整首曲目表现稳定！</div>
                  </div>
                )}
              </div>
              <div style={styles.keyLossHint}>
                💡 柱状图展示每个10秒区段的失分量，红色标注的严重阶段是最需要针对性练习的部分
              </div>
            </div>
          )}

          {replayTab === 'breaks' && (
            <div style={styles.breaksAnalysis}>
              {replayAnalysis.comboBreaks.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🎉</div>
                  <div style={styles.emptyText}>完美！没有连击中断</div>
                  <div style={styles.emptyHint}>全连达成！</div>
                </div>
              ) : (
                <>
                  <div style={styles.breaksHeader}>
                    <span>共 {replayAnalysis.comboBreaks.length} 次连击中断</span>
                    <span style={styles.breaksHint}>点击可在时间线中定位</span>
                  </div>
                  <div style={styles.breaksList}>
                    {replayAnalysis.comboBreaks.map((breakPoint, idx) => (
                      <div
                        key={idx}
                        style={styles.breakItem}
                        onClick={() => {
                          setTimelineCursor(breakPoint.time)
                          setReplayTab('timeline')
                        }}
                      >
                        <div style={styles.breakIndex}>#{idx + 1}</div>
                        <div style={styles.breakInfo}>
                          <div style={styles.breakTime}>
                            时间: {breakPoint.time.toFixed(2)}s · 轨道: {breakPoint.lane + 1}
                          </div>
                          <div style={styles.breakCombo}>
                            连击中断于 <span style={styles.breakComboValue}>{breakPoint.comboBefore}</span> COMBO
                          </div>
                        </div>
                        <div style={styles.breakArrow}>→</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .replay-selector-item:hover .delete-replay-btn {
    opacity: 1;
  }
  @keyframes bannerIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes pulseStar {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
`
document.head.appendChild(styleSheet)
