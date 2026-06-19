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
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultPlayerData, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load player data:', e)
    }
    return { ...defaultPlayerData }
  })

  const [newlyUnlocked, setNewlyUnlocked] = useState({
    achievements: [],
    titles: [],
    levelUps: []
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData))
    } catch (e) {
      console.error('Failed to save player data:', e)
    }
  }, [playerData])

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
      playedAt: new Date().toISOString()
    }

    nextData.trackRecords = [record, ...nextData.trackRecords]

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

    return { gainedExp, levelUps, newAchievements, newTitles }
  }, [playerData, calculateGainedExp, checkAchievements, checkTitles])

  const getBestRecord = useCallback((trackId) => {
    const records = playerData.trackRecords.filter(r => r.trackId === trackId && r.cleared)
    if (records.length === 0) return null
    return records.reduce((best, curr) =>
      curr.score > best.score ? curr : best
    )
  }, [playerData.trackRecords])

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
      setNewlyUnlocked({ achievements: [], titles: [], levelUps: [] })
    }
  }, [])

  return {
    playerData,
    expToNextLevel,
    expProgress,
    newlyUnlocked,
    processGameResult,
    getBestRecord,
    setCurrentTitle,
    clearNewlyUnlocked,
    resetPlayerData,
    getExpForLevel
  }
}
