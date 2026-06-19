import { useSyncExternalStore } from 'react'
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

const defaultState = () => {
  const todayKey = getTodayKey()
  const challenge = generateDailyChallenge(todayKey)
  const saved = loadFromStorage(STORAGE_KEY, {})
  const leaderboard = loadFromStorage(LEADERBOARD_KEY, {})

  if (saved.dateKey !== todayKey) {
    const freshState = {
      dateKey: todayKey,
      challenge,
      completionStatus: 'pending',
      bestScore: 0,
      bestAccuracy: 0,
      attempts: 0,
      passed: false,
      lastPlayedAt: null
    }
    saveToStorage(STORAGE_KEY, freshState)
    return freshState
  }

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

let globalState = defaultState()
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach(fn => fn())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => globalState

const setState = (updater) => {
  const next = typeof updater === 'function' ? updater(globalState) : { ...globalState, ...updater }
  globalState = next
  saveToStorage(STORAGE_KEY, globalState)
  notifyListeners()
}

const checkAndRefresh = () => {
  const todayKey = getTodayKey()
  if (globalState.dateKey !== todayKey) {
    const challenge = generateDailyChallenge(todayKey)
    setState({
      dateKey: todayKey,
      challenge,
      completionStatus: 'pending',
      bestScore: 0,
      bestAccuracy: 0,
      attempts: 0,
      passed: false,
      lastPlayedAt: null
    })
  }
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
  const challenge = generateDailyChallenge(todayKey)
  setState({
    dateKey: todayKey,
    challenge,
    completionStatus: 'pending',
    bestScore: 0,
    bestAccuracy: 0,
    attempts: 0,
    passed: false,
    lastPlayedAt: null
  })
}

export function useDailyChallengeStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    dailyChallengeState: state,
    submitDailyResult,
    getTodayLeaderboard,
    getTodayChallenge,
    getCompletionStatus,
    isDailyChallengeTrack,
    resetDailyChallenge,
    checkAndRefresh
  }
}
