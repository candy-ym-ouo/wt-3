import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'rhythm_circle_calibration'

const defaultCalibration = {
  audioOffset: 0,
  judgmentOffset: 0,
  keyLatencies: [],
  calibrationResults: [],
  lastCalibrated: null,
  autoApply: true
}

export function useCalibrationStore() {
  const [calibration, setCalibration] = useState(() => {
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
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration))
    } catch (e) {
      console.error('Failed to save calibration data:', e)
    }
  }, [calibration])

  const setAudioOffset = useCallback((offset) => {
    setCalibration(prev => ({ ...prev, audioOffset: offset }))
  }, [])

  const setJudgmentOffset = useCallback((offset) => {
    setCalibration(prev => ({ ...prev, judgmentOffset: offset }))
  }, [])

  const addKeyLatency = useCallback((latency) => {
    setCalibration(prev => {
      const latencies = [...prev.keyLatencies, latency].slice(-50)
      return { ...prev, keyLatencies: latencies }
    })
  }, [])

  const clearKeyLatencies = useCallback(() => {
    setCalibration(prev => ({ ...prev, keyLatencies: [] }))
  }, [])

  const addCalibrationResult = useCallback((result) => {
    setCalibration(prev => {
      const results = [...prev.calibrationResults, {
        ...result,
        timestamp: Date.now()
      }].slice(-20)
      return { ...prev, calibrationResults: results, lastCalibrated: Date.now() }
    })
  }, [])

  const setAutoApply = useCallback((enabled) => {
    setCalibration(prev => ({ ...prev, autoApply: enabled }))
  }, [])

  const applyCalibrationResult = useCallback((audioOffset, judgmentOffset) => {
    setCalibration(prev => ({
      ...prev,
      audioOffset,
      judgmentOffset,
      lastCalibrated: Date.now()
    }))
  }, [])

  const resetCalibration = useCallback(() => {
    setCalibration({ ...defaultCalibration })
  }, [])

  const getAverageKeyLatency = useCallback(() => {
    if (calibration.keyLatencies.length === 0) return 0
    const sum = calibration.keyLatencies.reduce((a, b) => a + b, 0)
    return Math.round(sum / calibration.keyLatencies.length)
  }, [calibration.keyLatencies])

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
