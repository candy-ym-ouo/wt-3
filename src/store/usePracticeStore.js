import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'rhythm_circle_practice_settings'

const defaultPracticeSettings = {
  playbackSpeed: 1.0,
  mutedTracks: {
    lead: false,
    bass: false,
    chords: false,
    drums: false
  },
  loopMode: 'off',
  loopStartBar: 0,
  loopEndBar: 1,
  replayMisses: false,
  replayThreshold: 'good',
  sectionStart: 0,
  sectionEnd: null,
  autoProgress: true,
  showNotePreview: true
}

export function usePracticeStore() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultPracticeSettings, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load practice settings:', e)
    }
    return { ...defaultPracticeSettings }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Failed to save practice settings:', e)
    }
  }, [settings])

  const setPlaybackSpeed = useCallback((speed) => {
    setSettings(prev => ({ ...prev, playbackSpeed: speed }))
  }, [])

  const toggleTrackMute = useCallback((track) => {
    setSettings(prev => ({
      ...prev,
      mutedTracks: {
        ...prev.mutedTracks,
        [track]: !prev.mutedTracks[track]
      }
    }))
  }, [])

  const setMutedTracks = useCallback((muted) => {
    setSettings(prev => ({ ...prev, mutedTracks: { ...muted } }))
  }, [])

  const setLoopMode = useCallback((mode) => {
    setSettings(prev => ({ ...prev, loopMode: mode }))
  }, [])

  const setLoopRange = useCallback((startBar, endBar) => {
    setSettings(prev => ({
      ...prev,
      loopStartBar: startBar,
      loopEndBar: endBar
    }))
  }, [])

  const setReplayMisses = useCallback((enabled) => {
    setSettings(prev => ({ ...prev, replayMisses: enabled }))
  }, [])

  const setReplayThreshold = useCallback((threshold) => {
    setSettings(prev => ({ ...prev, replayThreshold: threshold }))
  }, [])

  const setSectionRange = useCallback((start, end) => {
    setSettings(prev => ({
      ...prev,
      sectionStart: start,
      sectionEnd: end
    }))
  }, [])

  const setAutoProgress = useCallback((enabled) => {
    setSettings(prev => ({ ...prev, autoProgress: enabled }))
  }, [])

  const setShowNotePreview = useCallback((enabled) => {
    setSettings(prev => ({ ...prev, showNotePreview: enabled }))
  }, [])

  const resetPracticeSettings = useCallback(() => {
    setSettings({ ...defaultPracticeSettings })
  }, [])

  return {
    settings,
    setPlaybackSpeed,
    toggleTrackMute,
    setMutedTracks,
    setLoopMode,
    setLoopRange,
    setReplayMisses,
    setReplayThreshold,
    setSectionRange,
    setAutoProgress,
    setShowNotePreview,
    resetPracticeSettings
  }
}
