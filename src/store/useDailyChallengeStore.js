import { useSyncExternalStore, useEffect } from 'react'
import {
  generateDailyChallenge,
  getTodayKey,
  checkDailyChallengeResult,
  getChallengeExpReward
} from '../data/dailyChallengeData.js'

const STORAGE_KEY = 'rhythm_circle_daily_challenge'
const LEADERBOARD_KEY = 'rhythm_circle_daily_leaderboard'

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return defaultValue
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {}
}

const buildFreshState = (dateKey) => {
  const challenge = generateDailyChallenge(dateKey)
  return {
    dateKey,
    challenge,
    completionStatus: 'pending',
    bestScore: 0,
    bestAccuracy: 0,
    attempts: 0,
    passed: false,
    lastPlayedAt: null
  }
}

const initializeState = () => {
  const todayKey = getTodayKey()
  const saved = loadFromStorage(STORAGE_KEY, {})

  if (saved.dateKey !== todayKey) {
    const fresh = buildFreshState(todayKey)
    saveToStorage(STORAGE_KEY, fresh)
    return fresh
  }

  const challenge = generateDailyChallenge(todayKey)
  return {
    dateKey: saved.dateKey,
    challenge,
    completionStatus: saved.completionStatus || 'pending',
    bestScore: saved.bestScore || 0,
    bestAccuracy: saved.bestAccuracy || 0,
    attempts: saved.attempts || 0,
    passed: saved.passed || false,
    lastPlayedAt: saved.lastPlayedAt || null
  }
}

let globalState = initializeState()
const listeners = new Set()
let pollTimer = null
let visibilityHandler = null

const notifyListeners = () => {
  listeners.forEach(fn => fn())
}

const ensurePollTimer = () => {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    checkAndRefresh()
  }, 60 * 1000)
}

const cleanupPollTimer = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const ensureVisibilityListener = () => {
  if (visibilityHandler) return
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      checkAndRefresh()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
}

const cleanupVisibilityListener = () => {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
}

const subscribe = (listener) => {
  listeners.add(listener)
  ensurePollTimer()
  ensureVisibilityListener()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      cleanupPollTimer()
      cleanupVisibilityListener()
    }
  }
}

const checkAndRefresh = () => {
  const todayKey = getTodayKey()
  if (globalState.dateKey !== todayKey) {
    const fresh = buildFreshState(todayKey)
    globalState = fresh
    saveToStorage(STORAGE_KEY, globalState)
    notifyListeners()
  }
}

const getSnapshot = () => globalState

const setState = (updater) => {
  const next = typeof updater === 'function' ? updater(globalState) : { ...globalState, ...updater }
  globalState = next
  saveToStorage(STORAGE_KEY, globalState)
  notifyListeners()
}

const submitDailyResult = (result) => {
  checkAndRefresh()

  const challenge = globalState.challenge
  const check = checkDailyChallengeResult(challenge, result)
  const expReward = getChallengeExpReward(challenge, result)

  const isNewBest = result.score > globalState.bestScore
  const isNewBestAcc = result.accuracy > globalState.bestAccuracy

  const newStatus = check.passed ? 'passed' : (result.cleared ? 'failed' : 'failed')
  const finalStatus = globalState.completionStatus === 'passed' ? 'passed' : newStatus

  setState(prev => ({
    ...prev,
    completionStatus: finalStatus,
    bestScore: Math.max(prev.bestScore, result.score),
    bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
    attempts: prev.attempts + 1,
    passed: prev.passed || check.passed,
    lastPlayedAt: Date.now()
  }))

  const todayKey = getTodayKey()
  const leaderboard = loadFromStorage(LEADERBOARD_KEY, {})
  if (!leaderboard[todayKey]) {
    leaderboard[todayKey] = []
  }
  const entry = {
    score: result.score,
    accuracy: result.accuracy,
    maxCombo: result.maxCombo,
    rank: result.rank,
    stats: { ...result.stats },
    passed: check.passed,
    playedAt: Date.now()
  }
  leaderboard[todayKey].push(entry)
  leaderboard[todayKey].sort((a, b) => b.score - a.score)
  leaderboard[todayKey] = leaderboard[todayKey].slice(0, 50)
  saveToStorage(LEADERBOARD_KEY, leaderboard)

  return {
    passed: check.passed,
    failedConstraints: check.failedConstraints,
    expReward,
    isNewBest,
    isNewBestAcc
  }
}

const getTodayLeaderboard = () => {
  checkAndRefresh()
  const todayKey = getTodayKey()
  const leaderboard = loadFromStorage(LEADERBOARD_KEY, {})
  return leaderboard[todayKey] || []
}

const getTodayChallenge = () => {
  checkAndRefresh()
  return globalState.challenge
}

const getCompletionStatus = () => {
  checkAndRefresh()
  return {
    status: globalState.completionStatus,
    bestScore: globalState.bestScore,
    bestAccuracy: globalState.bestAccuracy,
    attempts: globalState.attempts,
    passed: globalState.passed,
    lastPlayedAt: globalState.lastPlayedAt
  }
}

const isDailyChallengeTrack = (trackId, difficultyId) => {
  checkAndRefresh()
  const challenge = globalState.challenge
  return challenge.trackId === trackId && challenge.difficultyId === difficultyId
}

const resetDailyChallenge = () => {
  const todayKey = getTodayKey()
  const fresh = buildFreshState(todayKey)
  globalState = fresh
  saveToStorage(STORAGE_KEY, globalState)
  notifyListeners()
}

const forceRefresh = () => {
  checkAndRefresh()
}

export function useDailyChallengeStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    checkAndRefresh()
  }, [])

  return {
    dailyChallengeState: state,
    submitDailyResult,
    getTodayLeaderboard,
    getTodayChallenge,
    getCompletionStatus,
    isDailyChallengeTrack,
    resetDailyChallenge,
    checkAndRefresh: forceRefresh
  }
}
