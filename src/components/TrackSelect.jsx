import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { TITLES, RANK_COLORS, TIER_COLORS, getTierInfo } from '../data/growthData.js'
import {
  TRACK_PACKS, TRACKS, DIFFICULTIES, checkUnlockCondition, getTrackWithDifficulty,
  sortDifficulties, getTrackDifficultyStats, getTrackDifficultySummary,
  getDifficultyInfo, getDifficultyColor, getDifficultyName, normalizeDifficultyId,
  makeRecordKey, GENRES, SCENES, MOODS, FEATURES, TAG_CATEGORIES,
  getTagInfo, getTagDisplayName, getTagColor, getTagIcon,
  getRecommendedTracks, getTracksByTag, analyzePlayerPreferences,
  autoGenerateTrackTags
} from '../data/tracks.js'

export default function TrackSelect({
  tracks,
  onSelectTrack,
  onOpenSettings,
  onOpenEditor,
  onEditTrack,
  onOpenPracticeLab,
  onStartPrepMode,
  keyConfig,
  playerData,
  expProgress,
  onOpenGrowthCenter,
  getBestRecord,
  challengeSummary,
  onOpenChallengeCenter,
  activeMultiplier,
  bestRecords,
  onOpenCalibrationCenter,
  onOpenThemeWorkshop,
  dailyChallengeState,
  onOpenDailyChallenge,
  onOpenStoryMode,
  onOpenImporter,
  playHistory = []
}) {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0)
  const [selectedDifficultyId, setSelectedDifficultyId] = useState(null)
  const [selectedPackId, setSelectedPackId] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false)
  const [hoverIndex, setHoverIndex] = useState(-1)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [viewMode, setViewMode] = useState('list')
  const [levelRange, setLevelRange] = useState({ min: 1, max: 20 })
  const [bpmRange, setBpmRange] = useState({ min: 60, max: 240 })
  const [noteCountRange, setNoteCountRange] = useState({ min: 0, max: 1000 })
  const [clearStatus, setClearStatus] = useState('all')
  const [overallClearStatus, setOverallClearStatus] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedScene, setSelectedScene] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [showTagFilters, setShowTagFilters] = useState(false)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  const currentTitle = TITLES.find(t => t.id === playerData.currentTitle)

  const getDifficultyClearStatus = useCallback((track, difficulty) => {
    if (!getBestRecord) return false
    const rec = getBestRecord(track.id, difficulty.id)
    return rec?.cleared || false
  }, [getBestRecord])

  const getDifficultyScore = useCallback((track, difficulty) => {
    if (!getBestRecord) return 0
    const rec = getBestRecord(track.id, difficulty.id)
    return rec?.score || 0
  }, [getBestRecord])

  const getDifficultyAccuracy = useCallback((track, difficulty) => {
    if (!getBestRecord) return 0
    const rec = getBestRecord(track.id, difficulty.id)
    return rec?.accuracy || 0
  }, [getBestRecord])

  const getMatchingDifficulty = useCallback((track) => {
    if (!track.difficulties || track.difficulties.length === 0) return null

    const sortedDiffs = sortDifficulties(track.difficulties)

    const matchingDiffs = sortedDiffs.filter(d => {
      if (filterDifficulty !== 'all' && normalizeDifficultyId(d.id) !== filterDifficulty) return false
      if (d.level < levelRange.min || d.level > levelRange.max) return false
      const noteCount = d.totalNotes || 0
      if (noteCount < noteCountRange.min || noteCount > noteCountRange.max) return false
      if (clearStatus !== 'all') {
        const cleared = getDifficultyClearStatus(track, d)
        if (clearStatus === 'none' && cleared) return false
        if (clearStatus === 'cleared' && !cleared) return false
      }
      return true
    })

    if (matchingDiffs.length === 0) return null
    return matchingDiffs.sort((a, b) => b.level - a.level)[0]
  }, [filterDifficulty, levelRange, noteCountRange, clearStatus, getDifficultyClearStatus])

  const getTrackOverallClearStatus = useCallback((track) => {
    if (!track.difficulties || track.difficulties.length === 0) return 'none'
    const clearedCount = track.difficulties.filter(d => getDifficultyClearStatus(track, d)).length
    if (clearedCount === 0) return 'none'
    if (clearedCount === track.difficulties.length) return 'all_cleared'
    return 'partial'
  }, [getDifficultyClearStatus])

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

  const tracksWithMatchingDifficulty = useMemo(() => {
    return [...tracks].map(track => {
      const matchingDiff = getMatchingDifficulty(track)
      const diffStats = getTrackDifficultyStats(track, getBestRecord)
      const diffSummary = getTrackDifficultySummary(track, getBestRecord)
      const trackWithTags = {
        ...track,
        tags: track.tags || autoGenerateTrackTags(track)
      }
      return {
        ...trackWithTags,
        matchingDifficulty: matchingDiff,
        difficultyStats: diffStats,
        difficultySummary: diffSummary
      }
    })
  }, [tracks, getMatchingDifficulty, getBestRecord])

  const recommendedTracks = useMemo(() => {
    if (!showRecommendations) return []
    return getRecommendedTracks({
      allTracks: tracksWithMatchingDifficulty,
      playerData,
      playHistory,
      bestRecords,
      sceneFilter: selectedScene,
      limit: 6,
      getBestRecordFn: getBestRecord
    })
  }, [tracksWithMatchingDifficulty, playerData, playHistory, bestRecords, selectedScene, showRecommendations, getBestRecord])

  const playerPreferences = useMemo(() => {
    return analyzePlayerPreferences(playHistory, bestRecords)
  }, [playHistory, bestRecords])

  const filteredTracks = useMemo(() => {
    let result = [...tracksWithMatchingDifficulty]

    if (selectedPackId !== 'all') {
      result = result.filter(t => t.packIds?.includes(selectedPackId))
    }

    result = result.filter(t => t.matchingDifficulty !== null)

    result = result.filter(t => t.bpm >= bpmRange.min && t.bpm <= bpmRange.max)

    if (overallClearStatus !== 'all') {
      result = result.filter(t => getTrackOverallClearStatus(t) === overallClearStatus)
    }

    if (selectedGenre) {
      result = result.filter(t => t.tags?.genre?.includes(selectedGenre))
    }

    if (selectedScene) {
      result = result.filter(t => t.tags?.scene?.includes(selectedScene))
    }

    if (selectedMood) {
      result = result.filter(t => t.tags?.mood?.includes(selectedMood))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q) ||
        t.preview?.tags?.some(tag => tag.toLowerCase().includes(q)) ||
        t.tags?.genre?.some(g => getTagDisplayName('genre', g).toLowerCase().includes(q)) ||
        t.tags?.scene?.some(s => getTagDisplayName('scene', s).toLowerCase().includes(q)) ||
        t.tags?.mood?.some(m => getTagDisplayName('mood', m).toLowerCase().includes(q))
      )
    }

    if (showOnlyUnlocked) {
      result = result.filter(t => {
        const check = checkUnlockCondition(t.unlockCondition, playerData, bestRecords)
        return check.unlocked
      })
    }

    switch (sortBy) {
      case 'level_asc':
        result.sort((a, b) => (a.matchingDifficulty?.level || 0) - (b.matchingDifficulty?.level || 0))
        break
      case 'level_desc':
        result.sort((a, b) => (b.matchingDifficulty?.level || 0) - (a.matchingDifficulty?.level || 0))
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
        break
      case 'artist':
        result.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN'))
        break
      case 'bpm_asc':
        result.sort((a, b) => a.bpm - b.bpm)
        break
      case 'bpm_desc':
        result.sort((a, b) => b.bpm - a.bpm)
        break
      case 'notes_asc':
        result.sort((a, b) => (a.matchingDifficulty?.totalNotes || 0) - (b.matchingDifficulty?.totalNotes || 0))
        break
      case 'notes_desc':
        result.sort((a, b) => (b.matchingDifficulty?.totalNotes || 0) - (a.matchingDifficulty?.totalNotes || 0))
        break
      case 'score_desc':
        result.sort((a, b) => {
          const scoreA = a.matchingDifficulty ? getDifficultyScore(a, a.matchingDifficulty) : 0
          const scoreB = b.matchingDifficulty ? getDifficultyScore(b, b.matchingDifficulty) : 0
          return scoreB - scoreA
        })
        break
      case 'accuracy_desc':
        result.sort((a, b) => {
          const accA = a.matchingDifficulty ? getDifficultyAccuracy(a, a.matchingDifficulty) : 0
          const accB = b.matchingDifficulty ? getDifficultyAccuracy(b, b.matchingDifficulty) : 0
          return accB - accA
        })
        break
      case 'clear_progress_desc': {
        const getProgress = (t) => {
          if (!t.difficulties) return 0
          const cleared = t.difficulties.filter(d => getDifficultyClearStatus(t, d)).length
          return cleared / t.difficulties.length
        }
        result.sort((a, b) => getProgress(b) - getProgress(a))
        break
      }
      case 'recommendation': {
        result.sort((a, b) => {
          const recA = recommendedTracks.find(r => r.id === a.id)?.recommendation?.score || 0
          const recB = recommendedTracks.find(r => r.id === b.id)?.recommendation?.score || 0
          return recB - recA
        })
        break
      }
      default:
        break
    }

    return result
  }, [
    tracksWithMatchingDifficulty, selectedPackId, searchQuery, showOnlyUnlocked, sortBy,
    playerData, bestRecords, bpmRange, overallClearStatus,
    getTrackOverallClearStatus, getDifficultyClearStatus, getDifficultyScore, getDifficultyAccuracy,
    selectedGenre, selectedScene, selectedMood, recommendedTracks
  ])

  useEffect(() => {
    if (filteredTracks.length > 0 && selectedTrackIndex >= filteredTracks.length) {
      setSelectedTrackIndex(0)
    }
  }, [filteredTracks, selectedTrackIndex])

  useEffect(() => {
    if (filteredTracks.length > 0) {
      const currentTrack = filteredTracks[selectedTrackIndex]
      const matchingDiff = currentTrack?.matchingDifficulty
      const defaultDiff = matchingDiff
        || currentTrack?.difficulties?.find(d => d.id === 'normal')
        || currentTrack?.difficulties?.[0]
      setSelectedDifficultyId(defaultDiff?.id || null)
    }
  }, [selectedTrackIndex, filteredTracks])

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const track = filteredTracks[selectedTrackIndex]
  const currentDifficulty = track?.difficulties?.find(d => d.id === selectedDifficultyId)
    || track?.difficulties?.[0]

  const getPlayableTrack = () => {
    if (!track) return null
    return getTrackWithDifficulty(track.id, selectedDifficultyId || track.difficulties[0]?.id)
  }

  const bestRecord = track && currentDifficulty && getBestRecord
    ? getBestRecord(track.id, currentDifficulty.id)
    : null

  const trackUnlockCheck = track
    ? checkUnlockCondition(track.unlockCondition, playerData, bestRecords)
    : { unlocked: true, reason: null }

  const packUnlockChecks = useMemo(() => {
    const basePacks = TRACK_PACKS.map(pack => ({
      ...pack,
      unlock: checkUnlockCondition(pack.unlockCondition, playerData, bestRecords)
    }))
    const customCount = tracks.filter(t => t.isCustom).length
    basePacks.push({
      id: 'custom',
      name: '自定义曲库',
      description: '导入的自定义曲目',
      icon: '📁',
      color: '#00ffcc',
      order: 99,
      unlockCondition: { type: 'none' },
      trackIds: tracks.filter(t => t.isCustom).map(t => t.id),
      customCount,
      unlock: { unlocked: true, reason: null }
    })
    basePacks.sort((a, b) => (a.order || 0) - (b.order || 0))
    return basePacks
  }, [playerData, bestRecords, tracks])

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
          <div
            style={{
              ...styles.playerInfo,
              ...(challengeSummary?.pendingClaim > 0 ? styles.playerInfoGlow : {})
            }}
            onClick={onOpenGrowthCenter}
          >
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
          <button
            style={{
              ...styles.challengeBtn,
              ...(challengeSummary?.hasNewlyCompleted ? styles.challengeBtnNotify : {})
            }}
            onClick={onOpenChallengeCenter}
          >
            <span style={styles.challengeBtnIcon}>⚡</span>
            <span style={styles.challengeBtnLabel}>挑战中心</span>
            {activeMultiplier && activeMultiplier > 1 && (
              <span style={styles.challengeMultiplier}>×{activeMultiplier.toFixed(1)}</span>
            )}
            {challengeSummary?.pendingClaim > 0 && (
              <span style={styles.challengeBadge}>
                {challengeSummary.pendingClaim}
              </span>
            )}
            {challengeSummary && (
              <div style={styles.challengeMiniProgress}>
                <div
                  style={{
                    ...styles.challengeMiniProgressFill,
                    width: `${challengeSummary.progressPercent}%`
                  }}
                />
              </div>
            )}
          </button>
          <button style={styles.editorBtn} onClick={onOpenEditor}>
            ✎ 谱面编辑器
          </button>
          <button
            style={{
              background: 'linear-gradient(135deg, rgba(255,51,102,0.12), rgba(0,255,204,0.08))',
              border: '1px solid rgba(0,255,204,0.3)',
              color: '#00ffcc',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
            onClick={onOpenImporter}
          >
            📥 导入曲目
          </button>
          <button style={styles.settingsBtn} onClick={onOpenSettings}>
            ⚙ 键位设置
          </button>
          <button style={styles.calibrationBtn} onClick={onOpenCalibrationCenter}>
            🎯 校准中心
          </button>
          <button style={styles.themeBtn} onClick={onOpenThemeWorkshop}>
            🎨 主题工坊
          </button>
          <button style={styles.storyBtn} onClick={onOpenStoryMode}>
            📖 剧情模式
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.trackList}>
          {challengeSummary?.hasNewlyCompleted && (
            <div
              style={styles.challengeAlertBanner}
              onClick={onOpenChallengeCenter}
            >
              <span style={styles.challengeAlertIcon}>🎁</span>
              <div style={styles.challengeAlertContent}>
                <span style={styles.challengeAlertTitle}>
                  {challengeSummary.pendingClaim > 0
                    ? `有 ${challengeSummary.pendingClaim} 个奖励待领取！`
                    : '有新完成的挑战任务！'
                  }
                </span>
                <span style={styles.challengeAlertDesc}>点击前往挑战中心查看</span>
              </div>
              <span style={styles.challengeAlertArrow}>→</span>
            </div>
          )}

          {dailyChallengeState && (
            <div
              style={styles.dailyChallengeBanner}
              onClick={onOpenDailyChallenge}
            >
              <div style={styles.dailyChallengeBannerLeft}>
                <span style={styles.dailyChallengeBannerIcon}>☀️</span>
                <div style={styles.dailyChallengeBannerInfo}>
                  <span style={styles.dailyChallengeBannerTitle}>每日挑战</span>
                  <span style={styles.dailyChallengeBannerTrack}>
                    {dailyChallengeState.challenge?.trackTitle} · {dailyChallengeState.challenge?.difficultyName}
                    <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
                    {dailyChallengeState.challenge?.constraints?.length || 0} 个限制条件
                  </span>
                </div>
              </div>
              <div style={styles.dailyChallengeBannerRight}>
                {dailyChallengeState.passed ? (
                  <span style={styles.dailyChallengePassed}>✅ 已通过</span>
                ) : dailyChallengeState.attempts > 0 ? (
                  <span style={styles.dailyChallengeFailed}>❌ 未通过</span>
                ) : (
                  <span style={styles.dailyChallengePending}>🎯 待挑战</span>
                )}
                <span style={styles.dailyChallengeBannerArrow}>→</span>
              </div>
            </div>
          )}

          <div style={styles.filterSection}>
            <div style={styles.filterRow}>
              <input
                type="text"
                placeholder="🔍 搜索曲目、艺术家、风格..."
                style={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={styles.viewModeToggle}>
                <button
                  style={{
                    ...styles.viewModeBtn,
                    ...(viewMode === 'list' ? styles.viewModeBtnActive : {})
                  }}
                  onClick={() => setViewMode('list')}
                >
                  ☰
                </button>
                <button
                  style={{
                    ...styles.viewModeBtn,
                    ...(viewMode === 'grid' ? styles.viewModeBtnActive : {})
                  }}
                  onClick={() => setViewMode('grid')}
                >
                  ▦
                </button>
              </div>
            </div>

            <div style={styles.packFilterRow}>
              <span style={styles.filterLabel}>曲包:</span>
              <div style={styles.packChips}>
                <button
                  style={{
                    ...styles.packChip,
                    ...(selectedPackId === 'all' ? styles.packChipActive : {})
                  }}
                  onClick={() => setSelectedPackId('all')}
                >
                  📚 全部
                </button>
                {packUnlockChecks.map(pack => (
                  <button
                    key={pack.id}
                    style={{
                      ...styles.packChip,
                      ...(selectedPackId === pack.id ? {
                        ...styles.packChipActive,
                        borderColor: pack.color,
                        color: pack.color
                      } : {}),
                      ...(!pack.unlock.unlocked ? styles.packChipLocked : {})
                    }}
                    onClick={() => pack.unlock.unlocked && setSelectedPackId(pack.id)}
                    title={pack.unlock.unlocked ? pack.description : pack.unlock.reason}
                  >
                    <span>{pack.icon}</span>
                    <span style={styles.packChipName}>{pack.name}</span>
                    {!pack.unlock.unlocked && <span style={styles.lockIcon}>🔒</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>难度:</span>
                <div style={styles.difficultyChips}>
                  <button
                    style={{
                      ...styles.diffChip,
                      ...(filterDifficulty === 'all' ? styles.diffChipActive : {})
                    }}
                    onClick={() => setFilterDifficulty('all')}
                  >
                    全部
                  </button>
                  {Object.values(DIFFICULTIES).map(diff => (
                    <button
                      key={diff.id}
                      style={{
                        ...styles.diffChip,
                        ...(filterDifficulty === diff.id ? {
                          ...styles.diffChipActive,
                          borderColor: diff.color,
                          color: diff.color
                        } : {})
                      }}
                      onClick={() => setFilterDifficulty(diff.id)}
                    >
                      {diff.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>排序:</span>
                <select
                  style={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="default">默认排序</option>
                  <option value="recommendation">✨ 智能推荐</option>
                  <option value="level_asc">难度 ↑</option>
                  <option value="level_desc">难度 ↓</option>
                  <option value="bpm_asc">BPM ↑</option>
                  <option value="bpm_desc">BPM ↓</option>
                  <option value="notes_asc">音符数 ↑</option>
                  <option value="notes_desc">音符数 ↓</option>
                  <option value="score_desc">最高分 ↓</option>
                  <option value="accuracy_desc">准确率 ↓</option>
                  <option value="clear_progress_desc">通关进度 ↓</option>
                  <option value="title">曲目名</option>
                  <option value="artist">艺术家</option>
                </select>
              </div>

              <button
                style={{
                  ...styles.advancedFilterBtn,
                  ...(showTagFilters ? styles.advancedFilterBtnActive : {})
                }}
                onClick={() => setShowTagFilters(!showTagFilters)}
              >
                🏷️ 标签筛选 {showTagFilters ? '▲' : '▼'}
              </button>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showOnlyUnlocked}
                  onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
                  style={styles.checkbox}
                />
                仅显示已解锁
              </label>

              <button
                style={{
                  ...styles.advancedFilterBtn,
                  ...(showAdvancedFilters ? styles.advancedFilterBtnActive : {})
                }}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? '▲' : '▼'} 高级筛选
              </button>
            </div>

            {showTagFilters && (
              <div style={styles.tagFilters}>
                <div style={styles.tagFilterSection}>
                  <span style={styles.filterLabel}>🎬 推荐场景:</span>
                  <div style={styles.tagChips}>
                    <button
                      style={{
                        ...styles.tagChip,
                        ...(selectedScene === null ? styles.tagChipActive : {})
                      }}
                      onClick={() => setSelectedScene(null)}
                    >
                      全部
                    </button>
                    {Object.values(SCENES).map(scene => (
                      <button
                        key={scene.id}
                        style={{
                          ...styles.tagChip,
                          ...(selectedScene === scene.id ? {
                            ...styles.tagChipActive,
                            borderColor: scene.color,
                            color: scene.color
                          } : {})
                        }}
                        onClick={() => setSelectedScene(selectedScene === scene.id ? null : scene.id)}
                        title={scene.description}
                      >
                        {scene.icon} {scene.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.tagFilterSection}>
                  <span style={styles.filterLabel}>🎵 音乐风格:</span>
                  <div style={styles.tagChips}>
                    <button
                      style={{
                        ...styles.tagChip,
                        ...(selectedGenre === null ? styles.tagChipActive : {})
                      }}
                      onClick={() => setSelectedGenre(null)}
                    >
                      全部
                    </button>
                    {Object.values(GENRES).map(genre => (
                      <button
                        key={genre.id}
                        style={{
                          ...styles.tagChip,
                          ...(selectedGenre === genre.id ? {
                            ...styles.tagChipActive,
                            borderColor: genre.color,
                            color: genre.color
                          } : {})
                        }}
                        onClick={() => setSelectedGenre(selectedGenre === genre.id ? null : genre.id)}
                      >
                        {genre.icon} {genre.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.tagFilterSection}>
                  <span style={styles.filterLabel}>🎭 情绪氛围:</span>
                  <div style={styles.tagChips}>
                    <button
                      style={{
                        ...styles.tagChip,
                        ...(selectedMood === null ? styles.tagChipActive : {})
                      }}
                      onClick={() => setSelectedMood(null)}
                    >
                      全部
                    </button>
                    {Object.values(MOODS).map(mood => (
                      <button
                        key={mood.id}
                        style={{
                          ...styles.tagChip,
                          ...(selectedMood === mood.id ? {
                            ...styles.tagChipActive,
                            borderColor: mood.color,
                            color: mood.color
                          } : {})
                        }}
                        onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
                      >
                        {mood.icon} {mood.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  style={styles.resetFiltersBtn}
                  onClick={() => {
                    setSelectedGenre(null)
                    setSelectedScene(null)
                    setSelectedMood(null)
                  }}
                >
                  ↺ 重置标签筛选
                </button>
              </div>
            )}

            {showAdvancedFilters && (
              <div style={styles.advancedFilters}>
                <div style={styles.rangeFilterGroup}>
                  <span style={styles.filterLabel}>等级范围:</span>
                  <div style={styles.rangeControl}>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={levelRange.min}
                      onChange={(e) => setLevelRange(prev => ({ ...prev, min: Math.max(1, Math.min(prev.max, parseInt(e.target.value) || 1)) }))}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeSeparator}>~</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={levelRange.max}
                      onChange={(e) => setLevelRange(prev => ({ ...prev, max: Math.min(20, Math.max(prev.min, parseInt(e.target.value) || 20)) }))}
                      style={styles.rangeInput}
                    />
                  </div>
                </div>

                <div style={styles.rangeFilterGroup}>
                  <span style={styles.filterLabel}>BPM范围:</span>
                  <div style={styles.rangeControl}>
                    <input
                      type="number"
                      min="40"
                      max="300"
                      value={bpmRange.min}
                      onChange={(e) => setBpmRange(prev => ({ ...prev, min: Math.max(40, Math.min(prev.max, parseInt(e.target.value) || 40)) }))}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeSeparator}>~</span>
                    <input
                      type="number"
                      min="40"
                      max="300"
                      value={bpmRange.max}
                      onChange={(e) => setBpmRange(prev => ({ ...prev, max: Math.min(300, Math.max(prev.min, parseInt(e.target.value) || 300)) }))}
                      style={styles.rangeInput}
                    />
                  </div>
                </div>

                <div style={styles.rangeFilterGroup}>
                  <span style={styles.filterLabel}>音符数:</span>
                  <div style={styles.rangeControl}>
                    <input
                      type="number"
                      min="0"
                      max="2000"
                      step="50"
                      value={noteCountRange.min}
                      onChange={(e) => setNoteCountRange(prev => ({ ...prev, min: Math.max(0, Math.min(prev.max, parseInt(e.target.value) || 0)) }))}
                      style={styles.rangeInput}
                    />
                    <span style={styles.rangeSeparator}>~</span>
                    <input
                      type="number"
                      min="0"
                      max="2000"
                      step="50"
                      value={noteCountRange.max}
                      onChange={(e) => setNoteCountRange(prev => ({ ...prev, max: Math.min(2000, Math.max(prev.min, parseInt(e.target.value) || 2000)) }))}
                      style={styles.rangeInput}
                    />
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>联合通关:</span>
                  <div style={styles.statusChips}>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(clearStatus === 'all' ? styles.statusChipActive : {})
                      }}
                      onClick={() => setClearStatus('all')}
                      title="与难度、等级、音符数联合筛选"
                    >
                      全部
                    </button>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(clearStatus === 'none' ? { ...styles.statusChipActive, borderColor: '#ff6666', color: '#ff6666' } : {})
                      }}
                      onClick={() => setClearStatus('none')}
                      title="匹配难度未通关"
                    >
                      未通关
                    </button>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(clearStatus === 'cleared' ? { ...styles.statusChipActive, borderColor: '#66ff99', color: '#66ff99' } : {})
                      }}
                      onClick={() => setClearStatus('cleared')}
                      title="匹配难度已通关"
                    >
                      已通关
                    </button>
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>整体状态:</span>
                  <div style={styles.statusChips}>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(overallClearStatus === 'all' ? styles.statusChipActive : {})
                      }}
                      onClick={() => setOverallClearStatus('all')}
                      title="曲目整体通关状态"
                    >
                      全部
                    </button>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(overallClearStatus === 'none' ? { ...styles.statusChipActive, borderColor: '#ff6666', color: '#ff6666' } : {})
                      }}
                      onClick={() => setOverallClearStatus('none')}
                      title="所有难度均未通关"
                    >
                      全未通
                    </button>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(overallClearStatus === 'partial' ? { ...styles.statusChipActive, borderColor: '#ffcc00', color: '#ffcc00' } : {})
                      }}
                      onClick={() => setOverallClearStatus('partial')}
                      title="部分难度已通关"
                    >
                      部分通
                    </button>
                    <button
                      style={{
                        ...styles.statusChip,
                        ...(overallClearStatus === 'all_cleared' ? { ...styles.statusChipActive, borderColor: '#66ff99', color: '#66ff99' } : {})
                      }}
                      onClick={() => setOverallClearStatus('all_cleared')}
                      title="所有难度均已通关"
                    >
                      全通关
                    </button>
                  </div>
                </div>

                <button
                  style={styles.resetFiltersBtn}
                  onClick={() => {
                    setLevelRange({ min: 1, max: 20 })
                    setBpmRange({ min: 60, max: 240 })
                    setNoteCountRange({ min: 0, max: 1000 })
                    setClearStatus('all')
                    setOverallClearStatus('all')
                    setFilterDifficulty('all')
                    setSelectedPackId('all')
                    setSearchQuery('')
                    setShowOnlyUnlocked(false)
                    setSortBy('default')
                  }}
                >
                  ↺ 重置所有筛选
                </button>
              </div>
            )}
          </div>

          {showRecommendations && recommendedTracks.length > 0 && (
            <div style={styles.recommendationSection}>
              <div style={styles.recommendationHeader}>
                <h2 style={styles.sectionTitle}>
                  <span style={{ marginRight: '8px' }}>✨</span>
                  为你推荐
                  {selectedScene && (
                    <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.7, marginLeft: '10px' }}>
                      · {getTagInfo('scene', selectedScene)?.icon} {getTagInfo('scene', selectedScene)?.name}
                    </span>
                  )}
                </h2>
                <div style={styles.recommendationHeaderRight}>
                  {playerPreferences.favoriteGenres.length > 0 && (
                    <span style={styles.preferenceHint}>
                      你喜欢: {playerPreferences.favoriteGenres.slice(0, 2).map(g => (
                        <span key={g} style={{ marginLeft: '4px' }}>
                          {getTagIcon('genre', g)} {getTagDisplayName('genre', g)}
                        </span>
                      ))}
                    </span>
                  )}
                  <button
                    style={styles.refreshRecBtn}
                    onClick={() => setShowRecommendations(!showRecommendations)}
                  >
                    {showRecommendations ? '隐藏推荐' : '显示推荐'}
                  </button>
                </div>
              </div>
              <div style={styles.recommendationGrid}>
                {recommendedTracks.map((track, idx) => {
                  const unlockCheck = checkUnlockCondition(track.unlockCondition, playerData, bestRecords)
                  const diffSummary = getTrackDifficultySummary(track, getBestRecord)
                  return (
                    <div
                      key={`rec-${track.id}`}
                      style={{
                        ...styles.recommendationCard,
                        ...(!unlockCheck.unlocked ? styles.trackCardLocked : {})
                      }}
                      onClick={() => {
                        if (unlockCheck.unlocked) {
                          const idxInFiltered = filteredTracks.findIndex(t => t.id === track.id)
                          if (idxInFiltered !== -1) {
                            setSelectedTrackIndex(idxInFiltered)
                            const matchingDiff = filteredTracks[idxInFiltered].matchingDifficulty
                            if (matchingDiff) {
                              setSelectedDifficultyId(matchingDiff.id)
                            }
                          }
                        }
                      }}
                    >
                      <div
                        style={{
                          ...styles.recCardCover,
                          background: `linear-gradient(135deg, ${track.preview?.coverGradient?.[0] || '#ff3366'}, ${track.preview?.coverGradient?.[1] || '#6633ff'})`
                        }}
                      >
                        <div style={styles.recRankBadge}>#{track.recommendation.rank}</div>
                        <span style={styles.recCardCoverIcon}>♪</span>
                      </div>
                      <div style={styles.recCardContent}>
                        <div style={styles.recCardTitle}>{track.title}</div>
                        <div style={styles.recCardArtist}>{track.artist}</div>
                        {track.recommendation.reasons.length > 0 && (
                          <div style={styles.recReasons}>
                            {track.recommendation.reasons.map((reason, i) => (
                              <span key={i} style={styles.recReasonBadge}>
                                {reason.icon} {reason.text}
                              </span>
                            ))}
                          </div>
                        )}
                        {track.tags && (
                          <div style={styles.recCardTags}>
                            {track.tags.genre?.slice(0, 2).map((g, i) => (
                              <span
                                key={i}
                                style={{
                                  ...styles.recCardTag,
                                  color: getTagColor('genre', g),
                                  borderColor: getTagColor('genre', g) + '44'
                                }}
                              >
                                {getTagIcon('genre', g)} {getTagDisplayName('genre', g)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={styles.tracksHeader}>
            <h2 style={styles.sectionTitle}>
              <span style={{ marginRight: '8px' }}>🎵</span>
              所有曲目
            </h2>
            <span style={styles.trackCount}>
              {filteredTracks.length} / {tracks.length} 首
            </span>
          </div>

          <div style={{
            ...styles.tracksContainer,
            ...(viewMode === 'grid' ? styles.tracksGrid : {})
          }}>
            {filteredTracks.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎵</div>
                <div style={styles.emptyTitle}>没有找到匹配的曲目</div>
                <div style={styles.emptyDesc}>尝试调整筛选条件</div>
              </div>
            ) : (
              filteredTracks.map((t, i) => {
                const best = getBestRecord ? getBestRecord(t.id) : null
                const unlockCheck = checkUnlockCondition(t.unlockCondition, playerData, bestRecords)
                const matchingDiff = t.matchingDifficulty
                const sortedDiffs = sortDifficulties(t.difficulties || [])
                const diffSummary = t.difficultySummary
                return (
                  <div
                    key={t.id}
                    style={{
                      ...styles.trackCard,
                      ...(viewMode === 'grid' ? styles.trackCardGrid : {}),
                      ...(i === selectedTrackIndex ? styles.trackCardActive : {}),
                      ...(i === hoverIndex ? styles.trackCardHover : {}),
                      ...(!unlockCheck.unlocked ? styles.trackCardLocked : {})
                    }}
                    onClick={() => {
                      if (unlockCheck.unlocked) {
                        setSelectedTrackIndex(i)
                        if (matchingDiff) {
                          setSelectedDifficultyId(matchingDiff.id)
                        }
                      }
                    }}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(-1)}
                  >
                    {viewMode === 'grid' && t.preview?.coverGradient && (
                      <div
                        style={{
                          ...styles.trackCardCover,
                          background: `linear-gradient(135deg, ${t.preview.coverGradient[0]}, ${t.preview.coverGradient[1]})`
                        }}
                      >
                        <span style={styles.trackCardCoverIcon}>♪</span>
                        {diffSummary && diffSummary.total > 0 && (
                          <div style={styles.cardCoverProgress}>
                            <div style={styles.cardCoverProgressText}>
                              {diffSummary.progressText}
                            </div>
                            <div style={styles.cardCoverProgressBarBg}>
                              <div style={{
                                ...styles.cardCoverProgressBar,
                                width: `${diffSummary.progress}%`,
                                background: diffSummary.statusColor
                              }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={styles.trackCardContent}>
                      {viewMode === 'list' && (
                        <div style={styles.trackIndex}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                      )}
                      <div style={styles.trackInfo}>
                        <div style={styles.trackTitleRow}>
                          <div style={styles.trackTitle}>{t.title}</div>
                          {!unlockCheck.unlocked && <span style={styles.lockIconSmall}>🔒</span>}
                          {diffSummary && diffSummary.total > 0 && (
                            <span
                              style={{
                                ...styles.cardClearBadge,
                                borderColor: diffSummary.statusColor,
                                color: diffSummary.statusColor,
                                background: diffSummary.statusColor + '15'
                              }}
                            >
                              {diffSummary.statusBadge} {diffSummary.progressText}
                            </span>
                          )}
                        </div>
                        <div style={styles.trackArtist}>{t.artist}</div>
                        {t.genre && (
                          <div style={styles.trackGenre}>{t.genre}</div>
                        )}
                        {t.tags && (
                          <div style={styles.cardTagsRow}>
                            {t.tags.genre?.slice(0, 2).map((g, i) => (
                              <span
                                key={`g-${i}`}
                                style={{
                                  ...styles.cardTag,
                                  color: getTagColor('genre', g),
                                  borderColor: getTagColor('genre', g) + '44',
                                  background: getTagColor('genre', g) + '11'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedGenre(selectedGenre === g ? null : g)
                                  setShowTagFilters(true)
                                }}
                              >
                                {getTagIcon('genre', g)} {getTagDisplayName('genre', g)}
                              </span>
                            ))}
                            {t.tags.scene?.slice(0, 2).map((s, i) => (
                              <span
                                key={`s-${i}`}
                                style={{
                                  ...styles.cardTag,
                                  color: getTagColor('scene', s),
                                  borderColor: getTagColor('scene', s) + '44',
                                  background: getTagColor('scene', s) + '11'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedScene(selectedScene === s ? null : s)
                                  setShowTagFilters(true)
                                }}
                              >
                                {getTagIcon('scene', s)} {getTagDisplayName('scene', s)}
                              </span>
                            ))}
                          </div>
                        )}
                        {best && (
                          <div style={styles.trackBest}>
                            <span style={{ ...styles.bestRank, color: RANK_COLORS[best.rank] }}>{best.rank}</span>
                            {best.tier && (() => {
                              const ti = getTierInfo(best.tier)
                              return (
                                <span style={{
                                  padding: '1px 6px',
                                  background: `${ti.color}22`,
                                  border: `1px solid ${ti.color}44`,
                                  borderRadius: '4px',
                                  color: ti.color,
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  letterSpacing: '0.5px'
                                }}>
                                  {best.tier}
                                </span>
                              )
                            })()}
                            <span style={styles.bestScore}>{best.score.toLocaleString()}</span>
                          </div>
                        )}
                        {!unlockCheck.unlocked && (
                          <div style={styles.unlockHint}>{unlockCheck.reason}</div>
                        )}
                      </div>
                      <div style={styles.trackMeta}>
                        <div style={styles.difficultyList}>
                          {(viewMode === 'grid' ? sortedDiffs.slice(0, 2) : sortedDiffs).map(d => {
                            const isMatching = matchingDiff && normalizeDifficultyId(d.id) === normalizeDifficultyId(matchingDiff.id)
                            const diffRec = getBestRecord ? getBestRecord(t.id, d.id) : null
                            const isCleared = diffRec?.cleared
                            return (
                              <div
                                key={d.id}
                                style={{
                                  position: 'relative'
                                }}
                              >
                                <span
                                  style={{
                                    ...styles.difficultyDot,
                                    backgroundColor: isMatching ? d.color + '66' : (isCleared ? d.color + '44' : d.color + '22'),
                                    borderColor: d.color,
                                    boxShadow: isMatching ? `0 0 8px ${d.color}88` : (isCleared ? `0 0 4px ${d.color}44` : 'none'),
                                    transform: isMatching ? 'scale(1.1)' : 'scale(1)',
                                    fontWeight: isMatching ? 800 : 700
                                  }}
                                  title={`${d.name} Lv.${d.level}${isCleared ? ` ✓ ${diffRec.score.toLocaleString()}` : ''}${isMatching ? ' ✓ 匹配筛选' : ''}`}
                                >
                                  {isCleared && !isMatching && '✓'}
                                  {isMatching && '★ '}
                                  Lv.{d.level}
                                </span>
                                {isCleared && viewMode === 'list' && diffRec && (
                                  <span style={{
                                    ...styles.diffMiniScore,
                                    color: RANK_COLORS[diffRec.rank] || '#fff',
                                    borderColor: RANK_COLORS[diffRec.rank] || '#fff'
                                  }}>
                                    {diffRec.rank}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {viewMode === 'list' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={styles.bpmBadge}>
                              {t.bpm} BPM
                            </span>
                            {diffSummary && diffSummary.total > 1 && viewMode === 'list' && (
                              <div style={styles.cardMiniProgress}>
                                <div style={{
                                  ...styles.cardMiniProgressFill,
                                  width: `${diffSummary.progress}%`,
                                  background: diffSummary.statusColor
                                }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {track && (
          <div style={styles.previewPanel}>
            {track.preview?.coverGradient && (
              <div
                style={{
                  ...styles.previewCover,
                  background: `linear-gradient(135deg, ${track.preview.coverGradient[0]}44, ${track.preview.coverGradient[1]}44)`
                }}
              >
                <div style={styles.previewCoverOverlay}>
                  <div style={styles.previewCoverIcon}>♪</div>
                </div>
              </div>
            )}

            <div style={styles.previewHeader}>
              <div style={styles.previewHeaderLeft}>
                <span style={styles.bpmLabel}>BPM {track.bpm}</span>
                {currentDifficulty && (
                  <span style={{
                    ...styles.difficultyBadge,
                    backgroundColor: currentDifficulty.color + '22',
                    color: currentDifficulty.color,
                    borderColor: currentDifficulty.color
                  }}>
                    {currentDifficulty.name} Lv.{currentDifficulty.level}
                  </span>
                )}
                <span style={styles.noteCountLabel}>
                  {currentDifficulty?.totalNotes || track.notes?.length} 音符
                </span>
              </div>
              {bestRecord && (
                <span style={styles.bestRecordLabel}>
                  最高分: <strong>{bestRecord.score.toLocaleString()}</strong>
                  {' '}<span style={{ color: RANK_COLORS[bestRecord.rank] }}>[{bestRecord.rank}]</span>
                </span>
              )}
            </div>

            {!trackUnlockCheck.unlocked && (
              <div style={styles.lockedBanner}>
                <span style={styles.lockedIcon}>🔒</span>
                <span style={styles.lockedText}>{trackUnlockCheck.reason}</span>
              </div>
            )}

            <div style={styles.previewTitle}>{track.title}</div>
            <div style={styles.previewArtist}>{track.artist}</div>

            {track.difficultyStats && track.difficultyStats.total > 0 && (
              <div style={styles.previewDifficultyProgress}>
                <div style={styles.diffProgressHeader}>
                  <span style={styles.diffProgressLabel}>
                    难度进度
                  </span>
                  <span style={{
                    ...styles.diffProgressBadge,
                    color: track.difficultySummary.statusColor,
                    borderColor: track.difficultySummary.statusColor
                  }}>
                    {track.difficultySummary.statusBadge}
                  </span>
                  <span style={styles.diffProgressCount}>
                    {track.difficultySummary.progressText}
                  </span>
                </div>
                <div style={styles.diffProgressBarBg}>
                  <div style={{
                    ...styles.diffProgressBar,
                    width: `${track.difficultyStats.progress}%`,
                    background: `linear-gradient(90deg, ${track.difficultySummary.statusColor}, ${track.difficultySummary.statusColor}aa)`
                  }} />
                </div>
                <div style={styles.diffProgressCleared}>
                  已通关: {track.difficultySummary.clearedText}
                </div>
              </div>
            )}

            {track.difficulties?.length >= 1 && (
              <div style={styles.difficultySelector}>
                <span style={styles.diffSelectorLabel}>选择难度:</span>
                <div style={styles.diffSelectorButtons}>
                  {sortDifficulties(track.difficulties).map(diff => {
                    const diffRecord = getBestRecord ? getBestRecord(track.id, diff.id) : null
                    const isSelected = normalizeDifficultyId(selectedDifficultyId) === normalizeDifficultyId(diff.id)
                    return (
                      <button
                        key={diff.id}
                        style={{
                          ...styles.diffSelectorBtn,
                          borderColor: diff.color,
                          ...(isSelected ? {
                            backgroundColor: diff.color + '33',
                            color: diff.color,
                            boxShadow: `0 0 15px ${diff.color}44`
                          } : (diffRecord?.cleared ? {
                            backgroundColor: diff.color + '18',
                            borderColor: diff.color + '88'
                          } : {}))
                        }}
                        onClick={() => setSelectedDifficultyId(diff.id)}
                        title={diffRecord?.cleared
                          ? `最佳: ${diffRecord.score.toLocaleString()} [${diffRecord.rank}]${diffRecord.tier ? ` ⚔${diffRecord.tier}` : ''} ${diffRecord.accuracy.toFixed(2)}%`
                          : `${diff.name} Lv.${diff.level}`
                        }
                      >
                        <div style={styles.diffSelectorBtnTop}>
                          <span style={styles.diffSelectorBtnName}>{diff.name}</span>
                          {diffRecord?.cleared && (
                            <span style={{
                              ...styles.diffSelectorBtnRank,
                              color: RANK_COLORS[diffRecord.rank] || '#fff'
                            }}>
                              {diffRecord.rank}
                            </span>
                          )}
                        </div>
                        <span style={styles.diffSelectorBtnLevel}>Lv.{diff.level}</span>
                        {diffRecord?.cleared && (
                          <span style={styles.diffSelectorBtnScore}>
                            {(diffRecord.score / 10000).toFixed(1)}万
                          </span>
                        )}
                        {!diffRecord?.cleared && (
                          <span style={styles.diffSelectorBtnScore}>
                            {diff.totalNotes || 0} 音符
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={styles.previewInfoRow}>
              {track.preview?.description && (
                <div style={styles.previewDescription}>
                  "{track.preview.description}"
                </div>
              )}
            </div>

            {track.tags && (
              <div style={styles.structuredTagsContainer}>
                {track.tags.genre?.length > 0 && (
                  <div style={styles.tagGroup}>
                    <span style={styles.tagGroupLabel}>🎵 风格</span>
                    <div style={styles.tagGroupTags}>
                      {track.tags.genre.map((g, i) => (
                        <span
                          key={`g-${i}`}
                          style={{
                            ...styles.structuredTag,
                            color: getTagColor('genre', g),
                            borderColor: getTagColor('genre', g),
                            background: getTagColor('genre', g) + '15'
                          }}
                          onClick={() => {
                            setSelectedGenre(selectedGenre === g ? null : g)
                            setShowTagFilters(true)
                          }}
                        >
                          {getTagIcon('genre', g)} {getTagDisplayName('genre', g)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {track.tags.scene?.length > 0 && (
                  <div style={styles.tagGroup}>
                    <span style={styles.tagGroupLabel}>🎬 场景</span>
                    <div style={styles.tagGroupTags}>
                      {track.tags.scene.map((s, i) => (
                        <span
                          key={`s-${i}`}
                          style={{
                            ...styles.structuredTag,
                            color: getTagColor('scene', s),
                            borderColor: getTagColor('scene', s),
                            background: getTagColor('scene', s) + '15'
                          }}
                          onClick={() => {
                            setSelectedScene(selectedScene === s ? null : s)
                            setShowTagFilters(true)
                          }}
                          title={getTagInfo('scene', s)?.description}
                        >
                          {getTagIcon('scene', s)} {getTagDisplayName('scene', s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {track.tags.mood?.length > 0 && (
                  <div style={styles.tagGroup}>
                    <span style={styles.tagGroupLabel}>🎭 情绪</span>
                    <div style={styles.tagGroupTags}>
                      {track.tags.mood.map((m, i) => (
                        <span
                          key={`m-${i}`}
                          style={{
                            ...styles.structuredTag,
                            color: getTagColor('mood', m),
                            borderColor: getTagColor('mood', m),
                            background: getTagColor('mood', m) + '15'
                          }}
                          onClick={() => {
                            setSelectedMood(selectedMood === m ? null : m)
                            setShowTagFilters(true)
                          }}
                        >
                          {getTagIcon('mood', m)} {getTagDisplayName('mood', m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {track.tags.feature?.length > 0 && (
                  <div style={styles.tagGroup}>
                    <span style={styles.tagGroupLabel}>⚡ 谱面特征</span>
                    <div style={styles.tagGroupTags}>
                      {track.tags.feature.map((f, i) => (
                        <span
                          key={`f-${i}`}
                          style={{
                            ...styles.structuredTag,
                            color: getTagColor('feature', f),
                            borderColor: getTagColor('feature', f),
                            background: getTagColor('feature', f) + '15'
                          }}
                        >
                          {getTagIcon('feature', f)} {getTagDisplayName('feature', f)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {track.preview?.tags?.length > 0 && (
              <div style={styles.tagsContainer}>
                {track.preview.tags.map((tag, i) => (
                  <span key={i} style={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div style={styles.heatmapContainer}>
              <RhythmHeatmap track={getPlayableTrack() || track} />
            </div>

            <div style={styles.waveformContainer}>
              <WaveformPreview track={getPlayableTrack() || track} />
            </div>

            {track.packIds?.length > 0 && (
              <div style={styles.packsRow}>
                <span style={styles.packsLabel}>所属曲包:</span>
                <div style={styles.packsList}>
                  {track.packIds.map(packId => {
                    const pack = TRACK_PACKS.find(p => p.id === packId)
                    return pack ? (
                      <span
                        key={packId}
                        style={{
                          ...styles.packBadge,
                          borderColor: pack.color,
                          color: pack.color
                        }}
                      >
                        {pack.icon} {pack.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {track.preview?.story && (
              <div style={styles.storyBox}>
                <div style={styles.storyLabel}>📖 曲目背景</div>
                <div style={styles.storyText}>{track.preview.story}</div>
              </div>
            )}

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
              style={{
                ...styles.startBtn,
                ...(!trackUnlockCheck.unlocked ? styles.startBtnDisabled : {})
              }}
              onClick={() => {
                const playable = getPlayableTrack()
                if (playable && trackUnlockCheck.unlocked) {
                  onSelectTrack(playable)
                }
              }}
              disabled={!trackUnlockCheck.unlocked}
              onMouseEnter={(e) => trackUnlockCheck.unlocked && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {trackUnlockCheck.unlocked ? '▶ 开始演奏' : `🔒 ${trackUnlockCheck.reason}`}
            </button>

            <button
              style={styles.practiceBtn}
              onClick={() => {
                const playable = getPlayableTrack()
                if (playable && onOpenPracticeLab) {
                  onOpenPracticeLab(playable)
                }
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🧪 练习实验室
            </button>

            <button
              style={styles.prepBtn}
              onClick={() => {
                const playable = getPlayableTrack()
                if (playable && onStartPrepMode) {
                  onStartPrepMode(playable)
                }
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🎵 预备模式
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
        )}
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
    if (!canvas || !track) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    ctx.clearRect(0, 0, w, h)

    const duration = track.duration || 60
    const visibleNotes = track.notes || []

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

function RhythmHeatmap({ track }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !track) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      timeRef.current += 0.015
      const t = timeRef.current
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.scale(2, 2)
      ctx.clearRect(0, 0, w, h)

      const notes = track.notes || []
      const duration = track.duration || 60
      const laneCount = 4
      const segmentCount = 64
      const segmentDuration = duration / segmentCount

      const densityData = []
      let maxDensity = 0
      let peakSegments = []

      for (let s = 0; s < segmentCount; s++) {
        const segStart = s * segmentDuration
        const segEnd = segStart + segmentDuration
        const segNotes = notes.filter(n => n.time >= segStart && n.time < segEnd)
        const laneDensity = [0, 0, 0, 0]
        segNotes.forEach(n => { laneDensity[n.lane]++ })
        const totalDensity = laneDensity.reduce((a, b) => a + b, 0)
        densityData.push({ segStart, segEnd, laneDensity, totalDensity })
        if (totalDensity > maxDensity) maxDensity = totalDensity
      }

      const peakThreshold = maxDensity * 0.7
      densityData.forEach((d, i) => {
        if (d.totalDensity >= peakThreshold) peakSegments.push(i)
      })

      const topPadding = 30
      const bottomPadding = 30
      const leftPadding = 50
      const rightPadding = 20
      const chartW = w - leftPadding - rightPadding
      const chartH = h - topPadding - bottomPadding
      const laneH = chartH / laneCount
      const segW = chartW / segmentCount

      const heatGradient = (intensity) => {
        const t = Math.min(1, intensity)
        if (t < 0.2) return `rgba(50, 50, 80, ${0.15 + t * 0.5})`
        if (t < 0.4) return `rgba(0, 153, 255, ${0.2 + t * 0.6})`
        if (t < 0.6) return `rgba(0, 255, 204, ${0.3 + t * 0.5})`
        if (t < 0.8) return `rgba(255, 204, 0, ${0.4 + t * 0.4})`
        return `rgba(255, 51, 102, ${0.5 + t * 0.5})`
      }

      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fillRect(leftPadding, topPadding, chartW, chartH)

      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let i = 0; i <= laneCount; i++) {
        const y = topPadding + laneH * i
        ctx.beginPath()
        ctx.moveTo(leftPadding, y)
        ctx.lineTo(leftPadding + chartW, y)
        ctx.stroke()
      }

      for (let i = 0; i <= 8; i++) {
        const x = leftPadding + (chartW / 8) * i
        ctx.beginPath()
        ctx.moveTo(x, topPadding)
        ctx.lineTo(x, topPadding + chartH)
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'
        ctx.stroke()
      }

      const laneColors = ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
      densityData.forEach((seg, sIdx) => {
        const x = leftPadding + segW * sIdx
        for (let lane = 0; lane < laneCount; lane++) {
          const y = topPadding + laneH * (laneCount - 1 - lane)
          const intensity = maxDensity > 0 ? seg.laneDensity[lane] / (maxDensity / laneCount) : 0
          if (intensity > 0.05) {
            ctx.fillStyle = heatGradient(intensity)
            const barH = Math.max(2, laneH * Math.min(1, intensity * 0.9))
            ctx.fillRect(x + 1, y + (laneH - barH) / 2, Math.max(2, segW - 2), barH)
          }
        }
      })

      for (let lane = 0; lane < laneCount; lane++) {
        const y = topPadding + laneH * (laneCount - 1 - lane)
        ctx.strokeStyle = laneColors[lane] + '33'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(leftPadding, y + laneH / 2)
        ctx.lineTo(leftPadding + chartW, y + laneH / 2)
        ctx.stroke()
      }

      const avgDensity = densityData.reduce((a, b) => a + b.totalDensity, 0) / segmentCount
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      for (let s = 0; s < segmentCount; s++) {
        const x = leftPadding + segW * (s + 0.5)
        const intensity = maxDensity > 0 ? densityData[s].totalDensity / maxDensity : 0
        const y = topPadding + chartH * (1 - intensity * 0.9) - 5
        if (s === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])

      peakSegments.forEach(sIdx => {
        const x = leftPadding + segW * sIdx
        const pulse = 0.5 + Math.sin(t * 2 + sIdx * 0.3) * 0.3
        ctx.fillStyle = `rgba(255, 51, 102, ${0.08 * pulse})`
        ctx.fillRect(x, topPadding, segW, chartH)

        const intensity = maxDensity > 0 ? densityData[sIdx].totalDensity / maxDensity : 0
        if (intensity > 0.85) {
          ctx.strokeStyle = `rgba(255, 100, 100, ${0.4 + pulse * 0.3})`
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, topPadding + 1, segW - 2, chartH - 2)
        }
      })

      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      for (let lane = 0; lane < laneCount; lane++) {
        const y = topPadding + laneH * (laneCount - 1 - lane) + laneH / 2 + 4
        ctx.fillStyle = laneColors[lane] + 'aa'
        ctx.fillText(`L${lane + 1}`, leftPadding - 8, y)
      }

      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      for (let i = 0; i <= 8; i++) {
        const x = leftPadding + (chartW / 8) * i
        const timeSec = Math.round((duration / 8) * i)
        const min = Math.floor(timeSec / 60)
        const sec = timeSec % 60
        ctx.fillText(`${min}:${sec.toString().padStart(2, '0')}`, x, topPadding + chartH + 16)
      }

      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🎯 节奏密度分布', leftPadding, topPadding - 12)

      ctx.textAlign = 'right'
      ctx.font = '9px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText(
        `峰值: ${maxDensity} 音符/段 · 均值: ${avgDensity.toFixed(1)} · 难点段: ${peakSegments.length}`,
        leftPadding + chartW,
        topPadding - 12
      )

      const legendX = leftPadding + chartW - 180
      const legendY = topPadding + chartH + 6
      const legendW = 170
      const legendH = 8
      for (let i = 0; i < legendW; i++) {
        ctx.fillStyle = heatGradient(i / legendW)
        ctx.fillRect(legendX + i, legendY, 1, legendH)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(legendX, legendY, legendW, legendH)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('低', legendX - 12, legendY + 7)
      ctx.textAlign = 'right'
      ctx.fillText('高', legendX + legendW + 12, legendY + 7)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(animRef.current)
  }, [track])

  return (
    <div style={styles.heatmapWrapper}>
      <canvas ref={canvasRef} style={styles.heatmapCanvas} />
    </div>
  )
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
  calibrationBtn: {
    background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,204,170,0.1))',
    border: '1px solid rgba(0,255,204,0.3)',
    color: '#00ffcc',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s'
  },
  themeBtn: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(204,102,255,0.1))',
    border: '1px solid rgba(255,51,102,0.3)',
    color: '#ff3366',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s'
  },
  storyBtn: {
    background: 'linear-gradient(135deg, rgba(102,51,255,0.15), rgba(51,102,255,0.1))',
    border: '1px solid rgba(102,51,255,0.4)',
    color: '#cc99ff',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s'
  },
  mainContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: '40px',
    padding: '0 40px 40px',
    height: 'calc(100% - 100px)'
  },
  trackList: {
    width: '480px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  filterSection: {
    marginBottom: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  viewModeToggle: {
    display: 'flex',
    gap: '4px'
  },
  viewModeBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  viewModeBtnActive: {
    background: 'rgba(255,51,102,0.15)',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#ff3366'
  },
  packFilterRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  filterLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    paddingTop: '6px',
    minWidth: '36px'
  },
  packChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    flex: 1
  },
  packChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  packChipActive: {
    background: 'rgba(255,51,102,0.15)',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#ff3366'
  },
  packChipLocked: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  packChipName: {
    whiteSpace: 'nowrap'
  },
  lockIcon: {
    fontSize: '10px'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  difficultyChips: {
    display: 'flex',
    gap: '6px'
  },
  diffChip: {
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  diffChipActive: {
    background: 'rgba(255,51,102,0.15)',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#ff3366'
  },
  sortSelect: {
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    outline: 'none'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkbox: {
    accentColor: '#ff3366'
  },
  advancedFilterBtn: {
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  advancedFilterBtnActive: {
    background: 'rgba(0,255,204,0.15)',
    borderColor: 'rgba(0,255,204,0.4)',
    color: '#00ffcc'
  },
  advancedFilters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '14px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(0,255,204,0.15)',
    borderRadius: '10px',
    marginTop: '4px'
  },
  rangeFilterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  rangeControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  rangeInput: {
    width: '70px',
    padding: '6px 8px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
    textAlign: 'center'
  },
  rangeSeparator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px'
  },
  statusChips: {
    display: 'flex',
    gap: '6px'
  },
  statusChip: {
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  statusChipActive: {
    background: 'rgba(255,51,102,0.15)',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#ff3366'
  },
  resetFiltersBtn: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: '8px',
    color: '#ff6699',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  tracksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '3px',
    margin: 0
  },
  trackCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace'
  },
  tracksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '8px'
  },
  tracksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    flexDirection: 'row'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'rgba(255,255,255,0.3)'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px'
  },
  emptyDesc: {
    fontSize: '13px'
  },
  trackCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  trackCardGrid: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '12px',
    gap: '10px'
  },
  trackCardActive: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.12), rgba(0,255,204,0.08))',
    borderColor: 'rgba(255,51,102,0.4)',
    boxShadow: '0 8px 32px rgba(255,51,102,0.15)'
  },
  trackCardHover: {
    transform: 'translateX(4px)'
  },
  trackCardLocked: {
    opacity: 0.5
  },
  trackCardCover: {
    width: '100%',
    height: '80px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px'
  },
  trackCardCoverIcon: {
    fontSize: '32px',
    color: 'rgba(255,255,255,0.8)',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  trackCardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  trackIndex: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    minWidth: '28px'
  },
  trackInfo: {
    flex: 1,
    minWidth: 0
  },
  trackTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  trackTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  lockIconSmall: {
    fontSize: '12px'
  },
  trackArtist: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  trackGenre: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '2px'
  },
  trackBest: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px'
  },
  bestRank: {
    fontSize: '13px',
    fontWeight: 900,
    lineHeight: 1
  },
  bestScore: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  unlockHint: {
    fontSize: '11px',
    color: '#ff6666',
    marginTop: '4px'
  },
  trackMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px'
  },
  difficultyList: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  difficultyDot: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid',
    transition: 'all 0.2s ease',
    display: 'inline-block'
  },
  bpmBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    background: 'rgba(102,153,255,0.15)',
    color: '#6699ff'
  },
  previewPanel: {
    flex: 1,
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px 32px',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  previewCover: {
    height: '100px',
    borderRadius: '12px',
    marginBottom: '20px',
    overflow: 'hidden',
    position: 'relative'
  },
  previewCoverOverlay: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.2)'
  },
  previewCoverIcon: {
    fontSize: '48px',
    color: 'rgba(255,255,255,0.6)',
    textShadow: '0 2px 20px rgba(0,0,0,0.3)'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  previewHeaderLeft: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  bpmLabel: {
    padding: '6px 14px',
    background: 'rgba(255,51,102,0.15)',
    color: '#ff3366',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600
  },
  difficultyBadge: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 700,
    border: '1px solid'
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
  lockedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'rgba(255,102,102,0.1)',
    border: '1px solid rgba(255,102,102,0.3)',
    borderRadius: '10px',
    marginBottom: '16px'
  },
  lockedIcon: {
    fontSize: '18px'
  },
  lockedText: {
    color: '#ff6666',
    fontSize: '13px',
    fontWeight: 500
  },
  previewTitle: {
    fontSize: '38px',
    fontWeight: 800,
    letterSpacing: '3px',
    background: 'linear-gradient(135deg, #fff 0%, #ff3366 50%, #00ffcc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '6px'
  },
  previewArtist: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '16px'
  },
  difficultySelector: {
    marginBottom: '16px'
  },
  diffSelectorLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px',
    display: 'block'
  },
  diffSelectorButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  diffSelectorBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 18px',
    background: 'rgba(0,0,0,0.3)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    gap: '2px'
  },
  diffSelectorBtnName: {
    fontSize: '13px',
    fontWeight: 700
  },
  diffSelectorBtnLevel: {
    fontSize: '11px',
    opacity: 0.8
  },
  previewInfoRow: {
    marginBottom: '12px'
  },
  previewDescription: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    lineHeight: 1.6
  },
  tagsContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  tag: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  heatmapContainer: {
    height: '200px',
    background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(20,10,30,0.4))',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    marginBottom: '14px',
    overflow: 'hidden',
    padding: '8px 10px'
  },
  heatmapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  heatmapCanvas: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  waveformContainer: {
    height: '140px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    marginBottom: '16px',
    overflow: 'hidden',
    padding: '12px'
  },
  waveformCanvas: {
    width: '100%',
    height: '100%'
  },
  packsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  packsLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  packsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  packBadge: {
    padding: '4px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600
  },
  storyBox: {
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    marginBottom: '16px'
  },
  storyLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px'
  },
  storyText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.6
  },
  keyHints: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  keyHint: {
    flex: 1,
    padding: '12px',
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
    padding: '18px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '4px',
    cursor: 'pointer',
    boxShadow: '0 8px 40px rgba(255,51,102,0.4)',
    transition: 'all 0.2s',
    marginBottom: '10px'
  },
  startBtnDisabled: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  practiceBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #6699ff 0%, #4477dd 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '10px',
    boxShadow: '0 4px 20px rgba(102,153,255,0.3)'
  },
  prepBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '10px',
    boxShadow: '0 4px 20px rgba(255,204,0,0.3)'
  },
  editBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.4)',
    borderRadius: '10px',
    color: '#00ffcc',
    fontSize: '13px',
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
  },
  playerInfoGlow: {
    boxShadow: '0 0 20px rgba(255,204,0,0.3)',
    borderColor: 'rgba(255,204,0,0.3)'
  },
  challengeBtn: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.12), rgba(255,51,102,0.08))',
    border: '1px solid rgba(255,204,0,0.25)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden'
  },
  challengeBtnNotify: {
    boxShadow: '0 0 24px rgba(255,51,102,0.4)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  challengeBtnIcon: {
    fontSize: '18px'
  },
  challengeBtnLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffcc00',
    letterSpacing: '1px'
  },
  challengeMultiplier: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    padding: '2px 6px',
    background: 'linear-gradient(135deg, #ff9900, #ffcc00)',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 800,
    color: '#000'
  },
  challengeBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    minWidth: '22px',
    height: '22px',
    padding: '0 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ff3366, #ff6699)',
    borderRadius: '11px',
    fontSize: '11px',
    fontWeight: 800,
    color: '#fff',
    boxShadow: '0 2px 8px rgba(255,51,102,0.5)',
    border: '2px solid rgba(10,10,20,0.8)'
  },
  challengeMiniProgress: {
    width: '100%',
    height: '3px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '2px'
  },
  challengeMiniProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffcc00, #ff3366)',
    borderRadius: '2px',
    transition: 'width 0.5s ease-out'
  },
  challengeAlertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    marginBottom: '16px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.12), rgba(255,204,0,0.08))',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    animation: 'slideIn 0.5s ease-out, pulse 2s ease-in-out infinite 0.5s'
  },
  challengeAlertIcon: {
    fontSize: '28px',
    flexShrink: 0
  },
  challengeAlertContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  challengeAlertTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#ffcc00'
  },
  challengeAlertDesc: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)'
  },
  challengeAlertArrow: {
    fontSize: '20px',
    color: 'rgba(255,204,0,0.6)',
    flexShrink: 0
  },
  dailyChallengeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(255,153,0,0.12), rgba(255,204,0,0.06))',
    border: '1px solid rgba(255,153,0,0.25)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '8px'
  },
  dailyChallengeBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  dailyChallengeBannerIcon: {
    fontSize: '28px'
  },
  dailyChallengeBannerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  dailyChallengeBannerTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#ff9900',
    letterSpacing: '2px'
  },
  dailyChallengeBannerTrack: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)'
  },
  dailyChallengeBannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  dailyChallengePassed: {
    padding: '4px 12px',
    background: 'rgba(0,255,204,0.15)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#00ffcc'
  },
  dailyChallengeFailed: {
    padding: '4px 12px',
    background: 'rgba(255,51,102,0.15)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#ff6666'
  },
  dailyChallengePending: {
    padding: '4px 12px',
    background: 'rgba(255,153,0,0.15)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#ff9900'
  },
  dailyChallengeBannerArrow: {
    fontSize: '18px',
    color: 'rgba(255,153,0,0.6)'
  },
  cardClearBadge: {
    padding: '2px 8px',
    border: '1px solid',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 700,
    marginLeft: '8px',
    letterSpacing: '1px'
  },
  cardCoverProgress: {
    position: 'absolute',
    left: '10px',
    right: '10px',
    bottom: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cardCoverProgressText: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    letterSpacing: '1px'
  },
  cardCoverProgressBarBg: {
    height: '4px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  cardCoverProgressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease-out'
  },
  cardMiniProgress: {
    width: '60px',
    height: '3px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  cardMiniProgressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.5s ease-out'
  },
  diffMiniScore: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    fontSize: '9px',
    fontWeight: 800,
    padding: '1px 5px',
    borderRadius: '8px',
    border: '1px solid',
    background: 'rgba(10,10,20,0.95)',
    backdropFilter: 'blur(4px)',
    zIndex: 2,
    minWidth: '18px',
    textAlign: 'center'
  },
  previewDifficultyProgress: {
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    marginBottom: '16px'
  },
  diffProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  diffProgressLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '2px'
  },
  diffProgressBadge: {
    padding: '3px 10px',
    border: '1px solid',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    background: 'rgba(0,0,0,0.3)'
  },
  diffProgressCount: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 'auto',
    fontFamily: 'monospace'
  },
  diffProgressBarBg: {
    height: '8px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  diffProgressBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.6s ease-out',
    boxShadow: '0 0 12px rgba(255,255,255,0.15)'
  },
  diffProgressCleared: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  diffSelectorBtnTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    justifyContent: 'center'
  },
  diffSelectorBtnRank: {
    fontSize: '11px',
    fontWeight: 900,
    fontFamily: 'monospace'
  },
  diffSelectorBtnScore: {
    fontSize: '10px',
    opacity: 0.7,
    letterSpacing: '1px'
  },
  tagFilters: {
    marginTop: '12px',
    padding: '16px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  tagFilterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  tagChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  tagChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  tagChipActive: {
    background: 'rgba(255,51,102,0.15)',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#ff3366'
  },
  recommendationSection: {
    marginBottom: '24px',
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.08), rgba(204,102,255,0.06))',
    border: '1px solid rgba(255,51,102,0.15)',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden'
  },
  recommendationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  recommendationHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  preferenceHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic'
  },
  refreshRecBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  recommendationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  recommendationCard: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  recCardCover: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  recRankBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    padding: '2px 8px',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 800,
    color: '#ffcc00',
    fontFamily: 'monospace'
  },
  recCardCoverIcon: {
    fontSize: '28px',
    color: 'rgba(255,255,255,0.8)'
  },
  recCardContent: {
    padding: '10px 12px'
  },
  recCardTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  recCardArtist: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px'
  },
  recReasons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '8px'
  },
  recReasonBadge: {
    padding: '2px 6px',
    background: 'rgba(255,51,102,0.1)',
    borderRadius: '6px',
    fontSize: '9px',
    color: 'rgba(255,51,102,0.8)',
    fontWeight: 500
  },
  recCardTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px'
  },
  recCardTag: {
    padding: '2px 6px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '9px',
    fontWeight: 500
  },
  cardTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '6px'
  },
  cardTag: {
    padding: '2px 6px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  structuredTagsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px'
  },
  tagGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  tagGroupLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  },
  tagGroupTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  structuredTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: '1px solid',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
}
