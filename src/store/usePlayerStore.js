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

const STORAGE_KEY = 'rhythm_circle_player_data'
const BEST_RECORDS_KEY = 'rhythm_circle_best_records'
const HISTORY_KEY = 'rhythm_circle_history'
const MAX_HISTORY_PER_TRACK = 20

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

  const [newlyUnlocked, setNewlyUnlocked] = useState({
    achievements: [],
    titles: [],
    levelUps: []
  })

  useEffect(() => {
    saveToStorage(STORAGE_KEY, playerData)
  }, [playerData])

  useEffect(() => {
    saveToStorage(BEST_RECORDS_KEY, bestRecords)
  }, [bestRecords])

  useEffect(() => {
    saveToStorage(HISTORY_KEY, playHistory)
  }, [playHistory])

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

  const resetPlayerData = useCallback(() => {
    if (confirm('确定要重置所有玩家数据吗？此操作不可撤销！')) {
      setPlayerData({ ...defaultPlayerData })
      setBestRecords({})
      setPlayHistory([])
      setNewlyUnlocked({ achievements: [], titles: [], levelUps: [] })
      localStorage.removeItem(BEST_RECORDS_KEY)
      localStorage.removeItem(HISTORY_KEY)
    }
  }, [])

  return {
    playerData,
    expToNextLevel,
    expProgress,
    newlyUnlocked,
    bestRecords,
    playHistory,
    processGameResult,
    getBestRecord,
    checkIsNewRecord,
    getTrackLeaderboard,
    getDifficultyLeaderboard,
    getTrackHistory,
    getOverallStats,
    setCurrentTitle,
    clearNewlyUnlocked,
    resetPlayerData,
    getExpForLevel
  }
}
