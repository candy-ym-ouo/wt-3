import { useState, useEffect, useRef, useMemo } from 'react'
import { TITLES, RANK_COLORS } from '../data/growthData.js'
import { TRACK_PACKS, TRACKS, DIFFICULTIES, checkUnlockCondition, getTrackWithDifficulty } from '../data/tracks.js'

export default function TrackSelect({
  tracks,
  onSelectTrack,
  onOpenSettings,
  onOpenEditor,
  onEditTrack,
  onOpenPracticeLab,
  keyConfig,
  playerData,
  expProgress,
  onOpenGrowthCenter,
  getBestRecord,
  challengeSummary,
  onOpenChallengeCenter,
  activeMultiplier,
  bestRecords,
  onOpenCalibrationCenter
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

  const filteredTracks = useMemo(() => {
    let result = [...tracks]

    if (selectedPackId !== 'all') {
      result = result.filter(t => t.packIds?.includes(selectedPackId))
    }

    if (filterDifficulty !== 'all') {
      result = result.filter(t =>
        t.difficulties?.some(d => d.id === filterDifficulty)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q) ||
        t.preview?.tags?.some(tag => tag.toLowerCase().includes(q))
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
        result.sort((a, b) => a.level - b.level)
        break
      case 'level_desc':
        result.sort((a, b) => b.level - a.level)
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
        break
      case 'artist':
        result.sort((a, b) => a.artist.localeCompare(b.artist, 'zh-CN'))
        break
      case 'bpm':
        result.sort((a, b) => a.bpm - b.bpm)
        break
      default:
        break
    }

    return result
  }, [tracks, selectedPackId, filterDifficulty, searchQuery, showOnlyUnlocked, sortBy, playerData, bestRecords])

  useEffect(() => {
    if (filteredTracks.length > 0 && selectedTrackIndex >= filteredTracks.length) {
      setSelectedTrackIndex(0)
    }
  }, [filteredTracks, selectedTrackIndex])

  useEffect(() => {
    if (filteredTracks.length > 0) {
      const defaultDiff = filteredTracks[selectedTrackIndex]?.difficulties?.find(d => d.id === 'normal')
        || filteredTracks[selectedTrackIndex]?.difficulties?.[0]
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
    return TRACK_PACKS.map(pack => ({
      ...pack,
      unlock: checkUnlockCondition(pack.unlockCondition, playerData, bestRecords)
    }))
  }, [playerData, bestRecords])

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
          <button style={styles.settingsBtn} onClick={onOpenSettings}>
            ⚙ 键位设置
          </button>
          <button style={styles.calibrationBtn} onClick={onOpenCalibrationCenter}>
            🎯 校准中心
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
                  <option value="level_asc">难度 ↑</option>
                  <option value="level_desc">难度 ↓</option>
                  <option value="title">曲目名</option>
                  <option value="artist">艺术家</option>
                  <option value="bpm">BPM</option>
                </select>
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showOnlyUnlocked}
                  onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
                  style={styles.checkbox}
                />
                仅显示已解锁
              </label>
            </div>
          </div>

          <div style={styles.tracksHeader}>
            <h2 style={styles.sectionTitle}>选择曲目</h2>
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
                    onClick={() => unlockCheck.unlocked && setSelectedTrackIndex(i)}
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
                        </div>
                        <div style={styles.trackArtist}>{t.artist}</div>
                        {t.genre && (
                          <div style={styles.trackGenre}>{t.genre}</div>
                        )}
                        {best && (
                          <div style={styles.trackBest}>
                            <span style={{ ...styles.bestRank, color: RANK_COLORS[best.rank] }}>{best.rank}</span>
                            <span style={styles.bestScore}>{best.score.toLocaleString()}</span>
                          </div>
                        )}
                        {!unlockCheck.unlocked && (
                          <div style={styles.unlockHint}>{unlockCheck.reason}</div>
                        )}
                      </div>
                      <div style={styles.trackMeta}>
                        <div style={styles.difficultyList}>
                          {t.difficulties?.slice(0, viewMode === 'grid' ? 2 : 4).map(d => (
                            <span
                              key={d.id}
                              style={{
                                ...styles.difficultyDot,
                                backgroundColor: d.color + '33',
                                borderColor: d.color
                              }}
                              title={`${d.name} Lv.${d.level}`}
                            >
                              Lv.{d.level}
                            </span>
                          ))}
                        </div>
                        {viewMode === 'list' && (
                          <span style={styles.bpmBadge}>
                            {t.bpm} BPM
                          </span>
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

            {track.difficulties?.length > 1 && (
              <div style={styles.difficultySelector}>
                <span style={styles.diffSelectorLabel}>选择难度:</span>
                <div style={styles.diffSelectorButtons}>
                  {track.difficulties.map(diff => (
                    <button
                      key={diff.id}
                      style={{
                        ...styles.diffSelectorBtn,
                        borderColor: diff.color,
                        ...(selectedDifficultyId === diff.id ? {
                          backgroundColor: diff.color + '33',
                          color: diff.color,
                          boxShadow: `0 0 15px ${diff.color}44`
                        } : {})
                      }}
                      onClick={() => setSelectedDifficultyId(diff.id)}
                    >
                      <span style={styles.diffSelectorBtnName}>{diff.name}</span>
                      <span style={styles.diffSelectorBtnLevel}>Lv.{diff.level}</span>
                    </button>
                  ))}
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

            {track.preview?.tags?.length > 0 && (
              <div style={styles.tagsContainer}>
                {track.preview.tags.map((tag, i) => (
                  <span key={i} style={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

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
    border: '1px solid'
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
  }
}
