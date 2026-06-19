import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'rhythm_circle_calibration'

const defaultCalibration = {
  audioOffset: 0,
  judgmentOffset: 0,
  keyLatencies: [],
  calibrationResults: [],
  lastCalibrated: null,
  autoApply: true
}

const loadCalibration = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...defaultCalibration, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load calibration data:', e)
  }
  return { ...defaultCalibration }
}

let globalCalibration = loadCalibration()
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach(fn => fn())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => globalCalibration

const setCalibration = (updater) => {
  const next = typeof updater === 'function' ? updater(globalCalibration) : { ...globalCalibration, ...updater }
  globalCalibration = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalCalibration))
  } catch (e) {
    console.error('Failed to save calibration data:', e)
  }
  notifyListeners()
}

const setAudioOffset = (offset) => {
  setCalibration(prev => ({ ...prev, audioOffset: offset }))
}

const setJudgmentOffset = (offset) => {
  setCalibration(prev => ({ ...prev, judgmentOffset: offset }))
}

const addKeyLatency = (latency) => {
  setCalibration(prev => {
    const latencies = [...prev.keyLatencies, latency].slice(-50)
    return { ...prev, keyLatencies: latencies }
  })
}

const clearKeyLatencies = () => {
  setCalibration(prev => ({ ...prev, keyLatencies: [] }))
}

const addCalibrationResult = (result) => {
  setCalibration(prev => {
    const results = [...prev.calibrationResults, {
      ...result,
      timestamp: Date.now()
    }].slice(-20)
    return { ...prev, calibrationResults: results, lastCalibrated: Date.now() }
  })
}

const setAutoApply = (enabled) => {
  setCalibration(prev => ({ ...prev, autoApply: enabled }))
}

const applyCalibrationResult = (audioOffset, judgmentOffset) => {
  setCalibration(prev => ({
    ...prev,
    audioOffset,
    judgmentOffset,
    lastCalibrated: Date.now()
  }))
}

const resetCalibration = () => {
  setCalibration({ ...defaultCalibration })
}

const getAverageKeyLatency = () => {
  if (globalCalibration.keyLatencies.length === 0) return 0
  const sum = globalCalibration.keyLatencies.reduce((a, b) => a + b, 0)
  return Math.round(sum / globalCalibration.keyLatencies.length)
}

export function useCalibrationStore() {
  const calibration = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    calibration,
    setAudioOffset,
    setJudgmentOffset,
    addKeyLatency,
    clearKeyLatencies,
    addCalibrationResult,
    setAutoApply,
    applyCalibrationResult,
    resetCalibration,
    getAverageKeyLatency
  }
}
