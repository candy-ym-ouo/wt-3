import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  LEVEL_CURVE,
  EXP_PERFECT,
  EXP_GREAT,
  EXP_GOOD,
  EXP_MISS,
  EXP_CLEAR_BONUS,
  EXP_RANK_BONUS,
  ACHIEVEMENTS,
  TITLES,
  DIFFICULTY_WEIGHT
} from '../data/growthData.js'
import {
  isTutorialCompleted,
  setTutorialCompleted,
  resetTutorial,
  TUTORIAL_STEPS
} from '../data/tutorialData.js'

const STORAGE_KEY = 'rhythm_circle_player_data'
const BEST_RECORDS_KEY = 'rhythm_circle_best_records'
const HISTORY_KEY = 'rhythm_circle_history'
const REPLAYS_KEY = 'rhythm_circle_replays'
const MAX_HISTORY_PER_TRACK = 20
const MAX_REPLAYS_PER_TRACK = 5

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error(`Failed to load ${key}:`, e)
  }
  return defaultValue
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to save ${key}:`, e)
  }
}

const defaultPlayerData = {
  level: 1,
  exp: 0,
  totalExp: 0,
  playCount: 0,
  totalPlayTime: 0,
  maxComboEver: 0,
  totalStats: {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0
  },
  trackRecords: [],
  unlockedAchievements: [],
  unlockedTitles: [],
  currentTitle: null,
  firstPlayDate: null,
  lastPlayDate: null
}

export function usePlayerStore() {
  const [playerData, setPlayerData] = useState(() => {
    return { ...defaultPlayerData, ...loadFromStorage(STORAGE_KEY, {}) }
  })

  const [bestRecords, setBestRecords] = useState(() => {
    return loadFromStorage(BEST_RECORDS_KEY, {})
  })

  const [playHistory, setPlayHistory] = useState(() => {
    return loadFromStorage(HISTORY_KEY, [])
  })

  const [replays, setReplays] = useState(() => {
    return loadFromStorage(REPLAYS_KEY, [])
  })

  const [newlyUnlocked, setNewlyUnlocked] = useState({
    achievements: [],
    titles: [],
    levelUps: []
  })

  const [tutorialState, setTutorialState] = useState(() => ({
    showTutorial: !isTutorialCompleted(),
    currentStep: 0,
    completedSteps: [],
    hasCompletedFirstGame: false,
    isInTutorialFlow: false
  }))

  useEffect(() => {
    saveToStorage(STORAGE_KEY, playerData)
  }, [playerData])

  useEffect(() => {
    saveToStorage(BEST_RECORDS_KEY, bestRecords)
  }, [bestRecords])

  useEffect(() => {
    saveToStorage(HISTORY_KEY, playHistory)
  }, [playHistory])

  useEffect(() => {
    saveToStorage(REPLAYS_KEY, replays)
  }, [replays])

  const expToNextLevel = useMemo(() => {
    return LEVEL_CURVE[playerData.level - 1] || LEVEL_CURVE[LEVEL_CURVE.length - 1]
  }, [playerData.level])

  const expProgress = useMemo(() => {
    return Math.min(100, (playerData.exp / expToNextLevel) * 100)
  }, [playerData.exp, expToNextLevel])

  const getExpForLevel = useCallback((level) => {
    let total = 0
    for (let i = 0; i < level - 1; i++) {
      total += LEVEL_CURVE[i] || LEVEL_CURVE[LEVEL_CURVE.length - 1]
    }
    return total
  }, [])

  const calculateGainedExp = useCallback((result, track) => {
    let exp = 0

    exp += result.stats.perfect * EXP_PERFECT
    exp += result.stats.great * EXP_GREAT
    exp += result.stats.good * EXP_GOOD
    exp += result.stats.miss * EXP_MISS

    if (result.cleared) {
      exp += EXP_CLEAR_BONUS
    }

    exp += EXP_RANK_BONUS[result.rank] || 0

    const difficultyWeight = DIFFICULTY_WEIGHT[track.difficulty] || 1.0
    exp = Math.floor(exp * difficultyWeight)

    return exp
  }, [])

  const checkAchievements = useCallback((data) => {
    const unlocked = []
    ACHIEVEMENTS.forEach(achievement => {
      if (!data.unlockedAchievements.includes(achievement.id)) {
        if (achievement.check(data)) {
          unlocked.push(achievement)
        }
      }
    })
    return unlocked
  }, [])

  const checkTitles = useCallback((data) => {
    const unlocked = []
    TITLES.forEach(title => {
      if (!data.unlockedTitles.includes(title.id)) {
        if (title.check(data)) {
          unlocked.push(title)
        }
      }
    })
    return unlocked
  }, [])

  const checkIsNewRecord = useCallback((result, track) => {
    if (!result.cleared) return { isNewBest: false, isNewAccuracy: false, isNewCombo: false }
    
    const recordKey = `${track.id}_${track.difficulty}`
    const existing = bestRecords[recordKey]
    
    if (!existing) {
      return { isNewBest: true, isNewAccuracy: true, isNewCombo: true }
    }
    
    return {
      isNewBest: result.score > existing.score,
      isNewAccuracy: result.accuracy > existing.accuracy,
      isNewCombo: result.maxCombo > existing.maxCombo
    }
  }, [bestRecords])

  const updateBestRecord = useCallback((result, track) => {
    if (!result.cleared) return { isNewBest: false, isNewAccuracy: false, isNewCombo: false }
    
    const recordKey = `${track.id}_${track.difficulty}`
    const existing = bestRecords[recordKey]
    
    const checks = checkIsNewRecord(result, track)
    const hasAnyNew = checks.isNewBest || checks.isNewAccuracy || checks.isNewCombo
    
    if (!existing || hasAnyNew) {
      const newRecord = {
        trackId: track.id,
        trackTitle: track.title,
        difficulty: track.difficulty,
        level: track.level,
        artist: track.artist,
        score: existing && !checks.isNewBest ? existing.score : result.score,
        rank: existing && !checks.isNewBest ? existing.rank : result.rank,
        accuracy: existing && !checks.isNewAccuracy ? existing.accuracy : result.accuracy,
        maxCombo: existing && !checks.isNewCombo ? existing.maxCombo : result.maxCombo,
        stats: existing && !checks.isNewBest ? existing.stats : { ...result.stats },
        totalNotes: existing && !checks.isNewBest ? existing.totalNotes : result.totalNotes,
        cleared: true,
        updatedAt: new Date().toISOString(),
        previousScore: existing?.score || 0,
        scoreDelta: checks.isNewBest ? (result.score - (existing?.score || 0)) : 0
      }
      
      setBestRecords(prev => ({
        ...prev,
        [recordKey]: newRecord
      }))
    }
    
    return checks
  }, [bestRecords, checkIsNewRecord])

  const addToHistory = useCallback((result, track) => {
    const historyEntry = {
      id: Date.now() + Math.random(),
      trackId: track.id,
      trackTitle: track.title,
      difficulty: track.difficulty,
      level: track.level,
      artist: track.artist,
      score: result.score,
      rank: result.rank,
      accuracy: result.accuracy,
      maxCombo: result.maxCombo,
      stats: { ...result.stats },
      totalNotes: result.totalNotes,
      cleared: result.cleared,
      playedAt: new Date().toISOString(),
      playbackSpeed: result.playbackSpeed || 1,
      isPracticeMode: result.isPracticeMode || false
    }
    
    setPlayHistory(prev => {
      let updated = [historyEntry, ...prev]
      const trackCount = {}
      updated = updated.filter(h => {
        const key = `${h.trackId}_${h.difficulty}`
        trackCount[key] = (trackCount[key] || 0) + 1
        return trackCount[key] <= MAX_HISTORY_PER_TRACK
      })
      return updated.slice(0, 500)
    })

    if (result.replayData) {
      const replayEntry = {
        ...result.replayData,
        score: result.score,
        rank: result.rank,
        accuracy: result.accuracy,
        maxCombo: result.maxCombo
      }
      setReplays(prev => {
        const trackKey = `${track.id}_${track.difficulty}`
        const filtered = prev.filter(r => `${r.trackId}_${r.difficulty}` === trackKey)
        const others = prev.filter(r => `${r.trackId}_${r.difficulty}` !== trackKey)
        const updated = [replayEntry, ...filtered].slice(0, MAX_REPLAYS_PER_TRACK)
        return [...updated, ...others]
      })
    }
    
    return historyEntry
  }, [])

  const processGameResult = useCallback((result, track) => {
    const gainedExp = calculateGainedExp(result, track)
    const levelUps = []

    let nextData = { ...playerData }

    nextData.playCount += 1
    nextData.totalPlayTime += track.duration
    nextData.lastPlayDate = new Date().toISOString()
    if (!nextData.firstPlayDate) {
      nextData.firstPlayDate = new Date().toISOString()
    }

    nextData.maxComboEver = Math.max(nextData.maxComboEver, result.maxCombo)

    nextData.totalStats = {
      perfect: nextData.totalStats.perfect + result.stats.perfect,
      great: nextData.totalStats.great + result.stats.great,
      good: nextData.totalStats.good + result.stats.good,
      miss: nextData.totalStats.miss + result.stats.miss
    }

    const recordChecks = updateBestRecord(result, track)
    addToHistory(result, track)

    const record = {
      id: Date.now(),
      trackId: track.id,
      trackTitle: track.title,
      difficulty: track.difficulty,
      level: track.level,
      score: result.score,
      rank: result.rank,
      accuracy: result.accuracy,
      maxCombo: result.maxCombo,
      stats: { ...result.stats },
      totalNotes: result.totalNotes,
      cleared: result.cleared,
      playedAt: new Date().toISOString(),
      isNewBest: recordChecks.isNewBest
    }

    nextData.trackRecords = [record, ...nextData.trackRecords].slice(0, 200)

    nextData.totalExp += gainedExp
    nextData.exp += gainedExp

    while (nextData.exp >= (LEVEL_CURVE[nextData.level - 1] || LEVEL_CURVE[LEVEL_CURVE.length - 1]) && nextData.level < 100) {
      nextData.exp -= LEVEL_CURVE[nextData.level - 1] || LEVEL_CURVE[LEVEL_CURVE.length - 1]
      nextData.level += 1
      levelUps.push(nextData.level)
    }

    const newAchievements = checkAchievements(nextData)
    if (newAchievements.length > 0) {
      nextData.unlockedAchievements = [
        ...nextData.unlockedAchievements,
        ...newAchievements.map(a => a.id)
      ]
    }

    const newTitles = checkTitles(nextData)
    if (newTitles.length > 0) {
      nextData.unlockedTitles = [
        ...nextData.unlockedTitles,
        ...newTitles.map(t => t.id)
      ]
    }

    setPlayerData(nextData)
    setNewlyUnlocked({
      achievements: newAchievements,
      titles: newTitles,
      levelUps
    })

    return { 
      gainedExp, 
      levelUps, 
      newAchievements, 
      newTitles,
      recordChecks 
    }
  }, [playerData, calculateGainedExp, checkAchievements, checkTitles, updateBestRecord, addToHistory])

  const getBestRecord = useCallback((trackId, difficulty = null) => {
    if (difficulty) {
      const recordKey = `${trackId}_${difficulty}`
      return bestRecords[recordKey] || null
    }
    const records = Object.values(bestRecords).filter(r => r.trackId === trackId)
    if (records.length === 0) return null
    return records.reduce((best, curr) =>
      curr.score > best.score ? curr : best
    )
  }, [bestRecords])

  const getTrackLeaderboard = useCallback((trackId, difficulty, limit = 10) => {
    return playHistory
      .filter(h => h.trackId === trackId && h.difficulty === difficulty && h.cleared && !h.isPracticeMode)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }, [playHistory])

  const getDifficultyLeaderboard = useCallback((difficulty, limit = 10) => {
    const trackBest = {}
    Object.values(bestRecords)
      .filter(r => r.difficulty === difficulty)
      .forEach(r => {
        const key = r.trackId
        if (!trackBest[key] || r.score > trackBest[key].score) {
          trackBest[key] = r
        }
      })
    return Object.values(trackBest)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }, [bestRecords])

  const getTrackHistory = useCallback((trackId, difficulty, limit = 10) => {
    return playHistory
      .filter(h => h.trackId === trackId && h.difficulty === difficulty)
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, limit)
  }, [playHistory])

  const getOverallStats = useCallback(() => {
    const clearedRecords = Object.values(bestRecords).filter(r => r.cleared)
    const totalBestScore = clearedRecords.reduce((sum, r) => sum + r.score, 0)
    const avgAccuracy = clearedRecords.length > 0
      ? clearedRecords.reduce((sum, r) => sum + r.accuracy, 0) / clearedRecords.length
      : 0
    
    return {
      totalTracksCleared: clearedRecords.length,
      totalBestScore,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      totalHistoryPlays: playHistory.length,
      bestRecords
    }
  }, [bestRecords, playHistory])

  const getReplayAnalysis = useCallback((replayId) => {
    const replay = replays.find(r => r.id === replayId)
    if (!replay) return null

    const { judgeEvents, keyEvents, scoreHistory, healthHistory, summary } = replay
    const judgeEvs = judgeEvents || []
    const keyEvs = keyEvents || []

    const laneStats = [0, 1, 2, 3].map(lane => {
      const laneJudges = judgeEvs.filter(j => j.lane === lane)
      const perfect = laneJudges.filter(j => j.judgeType === 'perfect').length
      const great = laneJudges.filter(j => j.judgeType === 'great').length
      const good = laneJudges.filter(j => j.judgeType === 'good').length
      const miss = laneJudges.filter(j => j.judgeType === 'miss').length
      const total = perfect + great + good + miss
      const accuracy = total > 0
        ? ((perfect * 100 + great * 75 + good * 50) / total)
        : 0
      return { lane, perfect, great, good, miss, total, accuracy: Math.round(accuracy * 100) / 100 }
    })

    let early = 0
    let late = 0
    let perfectTiming = 0
    let totalDiff = 0
    let diffCount = 0
    judgeEvs.forEach(j => {
      if (j.judgeType === 'miss') return
      if (j.timeDiff === undefined || j.timeDiff === null) return
      const diffMs = Math.round(j.timeDiff * 1000)
      const noteTime = j.noteTime !== undefined ? j.noteTime : j.time
      if (j.time < noteTime) {
        early++
      } else if (j.time > noteTime) {
        late++
      } else {
        perfectTiming++
      }
      totalDiff += diffMs
      diffCount++
    })
    const averageDiff = diffCount > 0 ? Math.round(totalDiff / diffCount) : 0

    const duration = summary?.duration || replay.duration || 60
    const segmentCount = Math.max(1, Math.ceil(duration / 15))
    const timeSegments = []
    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * 15
      const endTime = Math.min((i + 1) * 15, duration)
      const segJudges = judgeEvs.filter(j => j.time >= startTime && j.time < endTime)
      const perfect = segJudges.filter(j => j.judgeType === 'perfect').length
      const great = segJudges.filter(j => j.judgeType === 'great').length
      const good = segJudges.filter(j => j.judgeType === 'good').length
      const miss = segJudges.filter(j => j.judgeType === 'miss').length
      const total = perfect + great + good + miss
      const accuracy = total > 0
        ? ((perfect * 100 + great * 75 + good * 50) / total)
        : 0
      timeSegments.push({ startTime, endTime, perfect, great, good, miss, total, accuracy: Math.round(accuracy * 100) / 100 })
    }

    const comboBreaks = []
    judgeEvs.forEach(j => {
      if ((j.judgeType === 'miss' || j.comboAfter === 0) && j.comboBefore > 0) {
        comboBreaks.push({
          time: j.time,
          lane: j.lane,
          judgeType: j.judgeType,
          comboBefore: j.comboBefore,
          timeDiff: j.timeDiff
        })
      }
    })

    return {
      laneStats,
      earlyLate: { early, late, perfectTiming, averageDiff },
      timeSegments,
      comboBreaks,
      totalJudges: judgeEvs.length,
      totalKeys: keyEvs.length,
      scoreSnapshots: scoreHistory || [],
      healthSnapshots: healthHistory || []
    }
  }, [replays])

  const getTrackReplays = useCallback((trackId, difficulty, limit = 5) => {
    return replays
      .filter(r => r.trackId === trackId && r.difficulty === difficulty)
      .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
      .slice(0, limit)
  }, [replays])

  const deleteReplay = useCallback((replayId) => {
    setReplays(prev => prev.filter(r => r.id !== replayId))
  }, [])

  const setCurrentTitle = useCallback((titleId) => {
    setPlayerData(prev => ({
      ...prev,
      currentTitle: titleId
    }))
  }, [])

  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked({
      achievements: [],
      titles: [],
      levelUps: []
    })
  }, [])

  const startTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      showTutorial: true,
      currentStep: 0,
      completedSteps: [],
      isInTutorialFlow: true
    }))
  }, [])

  const nextTutorialStep = useCallback(() => {
    setTutorialState(prev => {
      const nextStep = prev.currentStep + 1
      const newCompletedSteps = [...prev.completedSteps, prev.currentStep]
      
      if (nextStep >= TUTORIAL_STEPS.length) {
        setTutorialCompleted(true)
        return {
          ...prev,
          showTutorial: false,
          currentStep: TUTORIAL_STEPS.length - 1,
          completedSteps: newCompletedSteps,
          isInTutorialFlow: false
        }
      }
      
      return {
        ...prev,
        currentStep: nextStep,
        completedSteps: newCompletedSteps
      }
    })
  }, [])

  const goToTutorialStep = useCallback((stepIndex) => {
    setTutorialState(prev => ({
      ...prev,
      showTutorial: true,
      currentStep: Math.max(0, Math.min(stepIndex, TUTORIAL_STEPS.length - 1))
    }))
  }, [])

  const skipTutorial = useCallback(() => {
    setTutorialCompleted(true)
    setTutorialState(prev => ({
      ...prev,
      showTutorial: false,
      isInTutorialFlow: false
    }))
  }, [])

  const markFirstGameCompleted = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      hasCompletedFirstGame: true
    }))
  }, [])

  const hideTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      showTutorial: false
    }))
  }, [])

  const resetTutorialState = useCallback(() => {
    setTutorialState({
      showTutorial: true,
      currentStep: 0,
      completedSteps: [],
      hasCompletedFirstGame: false,
      isInTutorialFlow: false
    })
  }, [])

  const showTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      showTutorial: true
    }))
  }, [])

  const resetTutorialProgress = useCallback(() => {
    resetTutorial()
    setTutorialState({
      showTutorial: true,
      currentStep: 0,
      completedSteps: [],
      hasCompletedFirstGame: false,
      isInTutorialFlow: false
    })
  }, [])

  const resetPlayerData = useCallback(() => {
    if (confirm('确定要重置所有玩家数据吗？此操作不可撤销！')) {
      setPlayerData({ ...defaultPlayerData })
      setBestRecords({})
      setPlayHistory([])
      setReplays([])
      setNewlyUnlocked({ achievements: [], titles: [], levelUps: [] })
      resetTutorial()
      setTutorialState({
        showTutorial: true,
        currentStep: 0,
        completedSteps: [],
        hasCompletedFirstGame: false,
        isInTutorialFlow: false
      })
      localStorage.removeItem(BEST_RECORDS_KEY)
      localStorage.removeItem(HISTORY_KEY)
      localStorage.removeItem(REPLAYS_KEY)
    }
  }, [])

  return {
    playerData,
    expToNextLevel,
    expProgress,
    newlyUnlocked,
    bestRecords,
    playHistory,
    replays,
    tutorialState,
    processGameResult,
    getBestRecord,
    checkIsNewRecord,
    getTrackLeaderboard,
    getDifficultyLeaderboard,
    getTrackHistory,
    getOverallStats,
    getReplayAnalysis,
    getTrackReplays,
    deleteReplay,
    setCurrentTitle,
    clearNewlyUnlocked,
    resetPlayerData,
    getExpForLevel,
    startTutorial,
    nextTutorialStep,
    goToTutorialStep,
    skipTutorial,
    markFirstGameCompleted,
    hideTutorial,
    showTutorial,
    resetTutorialProgress,
    resetTutorialState
  }
}
