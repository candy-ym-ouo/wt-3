import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import CanvasRenderer from './CanvasRenderer.jsx'
import ScorePanel from './ScorePanel.jsx'
import { usePracticeStore } from '../store/usePracticeStore.js'
import { useCalibrationStore } from '../store/useCalibrationStore.js'

const JUDGE_WINDOWS = {
  perfect: 0.05,
  great: 0.10,
  good: 0.16,
  miss: 0.22
}

const SCORE_VALUES = {
  perfect: 1000,
  great: 700,
  good: 400,
  miss: 0
}

const JUDGE_RANK = {
  perfect: 4,
  great: 3,
  good: 2,
  miss: 1
}

export default function Game({ track, keyConfig, onEnd, onQuit, isPracticeMode = false, practiceSection = null, isTutorialMode = false }) {
  const practiceStore = usePracticeStore()
  const { settings: practiceSettings } = practiceStore
  const calibrationStore = useCalibrationStore()
  const { calibration } = calibrationStore

  const judgmentOffsetMs = calibration.judgmentOffset || 0
  const audioOffsetMs = calibration.audioOffset || 0
  const judgmentOffsetSec = judgmentOffsetMs / 1000
  const audioOffsetSec = audioOffsetMs / 1000

  const tutorialPlaybackSpeed = isTutorialMode ? 0.6 : 1.0
  const tutorialJudgeMultiplier = isTutorialMode ? 1.5 : 1.0

  const [gameState, setGameState] = useState('ready')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [health, setHealth] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [progress, setProgress] = useState(0)
  const [judgeFeedback, setJudgeFeedback] = useState(null)
  const [stats, setStats] = useState({
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0
  })
  const [showPracticePanel, setShowPracticePanel] = useState(false)
  const [currentPlaybackSpeed, setCurrentPlaybackSpeed] = useState(practiceSettings.playbackSpeed)

  const gameDataRef = useRef({
    notes: [],
    activeNotes: [],
    hitEffects: [],
    particles: [],
    ringPulses: [],
    lanePressed: [false, false, false, false],
    currentTime: 0
  })

  const replayDataRef = useRef({
    keyEvents: [],
    judgeEvents: [],
    scoreHistory: [],
    healthHistory: []
  })

  const toneRef = useRef({
    leadSynth: null,
    bassSynth: null,
    padSynth: null,
    kickSynth: null,
    snareSynth: null,
    hihatSynth: null,
    analyser: null,
    masterGain: null,
    reverb: null,
    snareFilter: null,
    hihatFilter: null,
    leadGain: null,
    bassGain: null,
    chordsGain: null,
    drumsGain: null,
    scheduledEvents: [],
    audioReady: false
  })

  const animFrameRef = useRef(null)
  const statsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 })
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const healthRef = useRef(100)
  const maxComboRef = useRef(0)
  const gameEndedRef = useRef(false)
  const isStartingRef = useRef(false)
  const hasStartedRef = useRef(false)
  const replayQueueRef = useRef([])
  const currentSectionRef = useRef(null)
  const loopCountRef = useRef(0)

  const beat = 60 / track.bpm
  const barDuration = beat * 4

  const practiceRange = useCallback(() => {
    if (isPracticeMode && practiceSection) {
      return {
        start: practiceSection.startBar * barDuration,
        end: practiceSection.endBar * barDuration
      }
    }
    if (practiceSettings.loopMode === 'section') {
      return {
        start: practiceSettings.loopStartBar * barDuration,
        end: practiceSettings.loopEndBar * barDuration
      }
    }
    return { start: 0, end: track.duration }
  }, [isPracticeMode, practiceSection, practiceSettings.loopMode, practiceSettings.loopStartBar, practiceSettings.loopEndBar, barDuration, track.duration])

  const createSynths = useCallback(() => {
    if (toneRef.current.audioReady) return

    Tone.Transport.bpm.value = track.bpm

    const masterGain = new Tone.Gain(0.7).toDestination()
    const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.2 })
    reverb.connect(masterGain)

    const analyser = new Tone.Analyser('waveform', 512)
    analyser.smoothing = 0.8
    masterGain.connect(analyser)

    toneRef.current.masterGain = masterGain
    toneRef.current.reverb = reverb
    toneRef.current.analyser = analyser

    const leadGain = new Tone.Gain(1.0)
    leadGain.connect(reverb)
    toneRef.current.leadGain = leadGain

    const bassGain = new Tone.Gain(1.0)
    bassGain.connect(reverb)
    toneRef.current.bassGain = bassGain

    const chordsGain = new Tone.Gain(1.0)
    chordsGain.connect(reverb)
    toneRef.current.chordsGain = chordsGain

    const drumsGain = new Tone.Gain(1.0)
    drumsGain.connect(reverb)
    drumsGain.connect(masterGain)
    toneRef.current.drumsGain = drumsGain

    const leadSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: track.synth.leadOsc },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.5 },
      volume: -10
    })
    leadSynth.connect(leadGain)
    toneRef.current.leadSynth = leadSynth

    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: track.synth.bassOsc },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.3, baseFrequency: 80, octaves: 4, release: 0.2 },
      volume: -8
    })
    bassSynth.connect(bassGain)
    toneRef.current.bassSynth = bassSynth

    const padSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: track.synth.padOsc },
      envelope: { attack: 0.5, decay: 0.3, sustain: 0.6, release: 2 },
      volume: -18
    })
    padSynth.connect(chordsGain)
    toneRef.current.padSynth = padSynth

    const kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.2 },
      volume: -6
    })
    kickSynth.connect(drumsGain)
    toneRef.current.kickSynth = kickSynth

    const snareFilter = new Tone.Filter(3000, 'highpass')
    const snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -10
    })
    snareSynth.connect(snareFilter)
    snareFilter.connect(drumsGain)
    toneRef.current.snareSynth = snareSynth
    toneRef.current.snareFilter = snareFilter

    const hihatFilter = new Tone.Filter(8000, 'highpass')
    const hihatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      volume: -16
    })
    hihatSynth.connect(hihatFilter)
    hihatFilter.connect(drumsGain)
    toneRef.current.hihatSynth = hihatSynth
    toneRef.current.hihatFilter = hihatFilter

    toneRef.current.audioReady = true
  }, [track.bpm, track.synth])

  const updateTrackGains = useCallback(() => {
    if (!toneRef.current.audioReady) return

    const { mutedTracks } = practiceSettings
    toneRef.current.leadGain.gain.value = mutedTracks.lead ? 0 : 1
    toneRef.current.bassGain.gain.value = mutedTracks.bass ? 0 : 1
    toneRef.current.chordsGain.gain.value = mutedTracks.chords ? 0 : 1
    toneRef.current.drumsGain.gain.value = mutedTracks.drums ? 0 : 1
  }, [practiceSettings])

  const updatePlaybackSpeed = useCallback((speed) => {
    try {
      const actualSpeed = isTutorialMode ? tutorialPlaybackSpeed : speed
      Tone.Transport.playbackRate = actualSpeed
      setCurrentPlaybackSpeed(actualSpeed)
    } catch(e) {}
  }, [isTutorialMode, tutorialPlaybackSpeed])

  const scheduleSong = useCallback(() => {
    const { songData } = track
    const { leadSynth, bassSynth, padSynth, kickSynth, snareSynth, hihatSynth } = toneRef.current
    const events = []
    const range = practiceRange()

    const scheduleNote = (note, callback, originalTime) => {
      if (originalTime < range.start - 0.5 || originalTime > range.end + 0.5) return null

      const adjustedTime = originalTime + audioOffsetSec
      const eid = Tone.Transport.schedule((time) => {
        try {
          callback(time, note)
        } catch(e) {}
      }, adjustedTime)
      return eid
    }

    if (songData.lead) {
      songData.lead.forEach(note => {
        const eid = scheduleNote(note, (time, n) => {
          leadSynth.triggerAttackRelease(n.note, n.duration * 0.9, time, n.velocity)
        }, note.time)
        if (eid) events.push(eid)
      })
    }

    if (songData.bass) {
      songData.bass.forEach(note => {
        const eid = scheduleNote(note, (time, n) => {
          bassSynth.triggerAttackRelease(n.note, n.duration * 0.9, time, n.velocity)
        }, note.time)
        if (eid) events.push(eid)
      })
    }

    if (songData.chords) {
      songData.chords.forEach(note => {
        const eid = scheduleNote(note, (time, n) => {
          padSynth.triggerAttackRelease(n.note, n.duration * 0.95, time, n.velocity)
        }, note.time)
        if (eid) events.push(eid)
      })
    }

    if (songData.drums) {
      songData.drums.forEach(drum => {
        const eid = scheduleNote(drum, (time, d) => {
          if (d.type === 'kick') {
            kickSynth.triggerAttackRelease('C2', '8n', time, d.velocity)
          } else if (d.type === 'snare') {
            snareSynth.triggerAttackRelease('16n', time, d.velocity)
          } else if (d.type === 'hihat') {
            hihatSynth.triggerAttackRelease('32n', time, d.velocity)
          }
        }, drum.time)
        if (eid) events.push(eid)
      })
    }

    toneRef.current.scheduledEvents = events
  }, [track, practiceRange, audioOffsetSec])

  const playHitSound = useCallback((type) => {
    if (!toneRef.current.audioReady) return
    const { hihatSynth, snareSynth } = toneRef.current

    try {
      if (type === 'perfect' || type === 'great') {
        snareSynth.triggerAttackRelease('32n', undefined, 0.3)
      } else if (type === 'good') {
        hihatSynth.triggerAttackRelease('16n', undefined, 0.25)
      } else if (type === 'miss') {
        hihatSynth.triggerAttackRelease('8n', undefined, 0.12)
      }
    } catch(e) {}
  }, [])

  const shouldReplayNote = useCallback((judgeType) => {
    if (!practiceSettings.replayMisses) return false

    const thresholdRank = JUDGE_RANK[practiceSettings.replayThreshold] || JUDGE_RANK.good
    const noteRank = JUDGE_RANK[judgeType] || 0

    return noteRank <= thresholdRank
  }, [practiceSettings.replayMisses, practiceSettings.replayThreshold])

  const addToReplayQueue = useCallback((note) => {
    if (!practiceSettings.replayMisses) return

    const beat = 60 / track.bpm
    const barDuration = beat * 4
    const noteBar = Math.floor(note.time / barDuration)
    const startBar = Math.max(0, noteBar - 1)
    const endBar = Math.min(Math.ceil(track.duration / barDuration), noteBar + 2)

    const existingIndex = replayQueueRef.current.findIndex(
      r => r.startBar === startBar && r.endBar === endBar
    )

    if (existingIndex === -1) {
      replayQueueRef.current.push({
        startBar,
        endBar,
        noteTime: note.time,
        attempts: 0
      })
    }
  }, [practiceSettings.replayMisses, track.bpm, track.duration])

  const judgeNote = useCallback((lane, timeNow) => {
    const data = gameDataRef.current
    let closestNote = null
    let closestDiff = Infinity

    const adjustedJudgeWindows = {
      perfect: JUDGE_WINDOWS.perfect * tutorialJudgeMultiplier,
      great: JUDGE_WINDOWS.great * tutorialJudgeMultiplier,
      good: JUDGE_WINDOWS.good * tutorialJudgeMultiplier,
      miss: JUDGE_WINDOWS.miss * tutorialJudgeMultiplier
    }

    for (let i = 0; i < data.activeNotes.length; i++) {
      const note = data.activeNotes[i]
      if (note.lane !== lane || note.hit || note.missed) continue
      const effectiveNoteTime = note.time + judgmentOffsetSec
      const diff = Math.abs(effectiveNoteTime - timeNow)
      if (diff < closestDiff && diff < adjustedJudgeWindows.miss) {
        closestDiff = diff
        closestNote = { note, index: i }
      }
    }

    if (!closestNote) return null

    const { note, index } = closestNote
    let judgeType = 'miss'

    if (closestDiff <= adjustedJudgeWindows.perfect) judgeType = 'perfect'
    else if (closestDiff <= adjustedJudgeWindows.great) judgeType = 'great'
    else if (closestDiff <= adjustedJudgeWindows.good) judgeType = 'good'

    data.activeNotes[index].hit = true
    data.activeNotes[index].judgeType = judgeType

    if (shouldReplayNote(judgeType)) {
      addToReplayQueue(note)
    }

    const baseScore = SCORE_VALUES[judgeType]
    const comboBonus = Math.floor(comboRef.current / 10) * 50
    const totalScore = baseScore + comboBonus
    const comboBefore = comboRef.current

    scoreRef.current += totalScore
    setScore(scoreRef.current)

    if (judgeType !== 'miss') {
      comboRef.current += 1
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current
        setMaxCombo(maxComboRef.current)
      }
    } else {
      comboRef.current = 0
    }
    setCombo(comboRef.current)

    statsRef.current[judgeType] += 1
    setStats({ ...statsRef.current })

    if (judgeType === 'miss') {
      healthRef.current = Math.max(0, healthRef.current - 8)
    } else if (judgeType === 'good') {
      healthRef.current = Math.min(100, healthRef.current + 2)
    } else if (judgeType === 'great') {
      healthRef.current = Math.min(100, healthRef.current + 4)
    } else if (judgeType === 'perfect') {
      healthRef.current = Math.min(100, healthRef.current + 6)
    }
    setHealth(healthRef.current)

    replayDataRef.current.judgeEvents.push({
      time: timeNow,
      noteTime: note.time,
      lane,
      judgeType,
      timeDiff: closestDiff,
      scoreChange: totalScore,
      comboBefore,
      comboAfter: comboRef.current
    })

    replayDataRef.current.scoreHistory.push({
      time: timeNow,
      score: scoreRef.current,
      combo: comboRef.current
    })

    replayDataRef.current.healthHistory.push({
      time: timeNow,
      health: healthRef.current
    })

    data.hitEffects.push({
      lane,
      type: judgeType,
      time: timeNow,
      y: 1
    })

    const particleCount = judgeType === 'perfect' ? 20 : judgeType === 'great' ? 12 : judgeType === 'good' ? 6 : 3
    for (let p = 0; p < particleCount; p++) {
      const angle = (p / particleCount) * Math.PI * 2 + Math.random() * 0.3
      const speed = 2 + Math.random() * 5
      data.particles.push({
        x: 0.5 + (lane - 1.5) * 0.12,
        y: 0.82,
        vx: Math.cos(angle) * speed * 0.01,
        vy: Math.sin(angle) * speed * 0.01 - 0.02,
        life: 1,
        color: keyConfig.colors[lane],
        size: 2 + Math.random() * 3
      })
    }

    data.ringPulses.push({
      lane,
      time: timeNow,
      radius: 0.05,
      color: keyConfig.colors[lane]
    })

    playHitSound(judgeType)

    return judgeType
  }, [keyConfig.colors, playHitSound, shouldReplayNote, addToReplayQueue, judgmentOffsetSec])

  const getFilteredNotes = useCallback(() => {
    const range = practiceRange()
    return track.notes.filter(n => n.time >= range.start && n.time <= range.end)
  }, [track.notes, practiceRange])

  const endGame = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    try {
      Tone.Transport.stop()
    } catch(e) {}

    const finalStats = { ...statsRef.current }
    const totalNotes = getFilteredNotes().length
    const accuracy = totalNotes > 0
      ? ((finalStats.perfect * 100 + finalStats.great * 75 + finalStats.good * 50) / totalNotes)
      : 0

    let rank = 'D'
    if (accuracy >= 95) rank = 'S'
    else if (accuracy >= 90) rank = 'A'
    else if (accuracy >= 80) rank = 'B'
    else if (accuracy >= 70) rank = 'C'

    const replayData = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trackId: track.id,
      trackTitle: track.title,
      difficulty: track.difficulty,
      level: track.level,
      artist: track.artist,
      bpm: track.bpm,
      duration: track.duration,
      playedAt: new Date().toISOString(),
      playbackSpeed: currentPlaybackSpeed,
      isPracticeMode,
      keyEvents: replayDataRef.current.keyEvents,
      judgeEvents: replayDataRef.current.judgeEvents,
      scoreHistory: replayDataRef.current.scoreHistory,
      healthHistory: replayDataRef.current.healthHistory,
      summary: {
        score: scoreRef.current,
        maxCombo: maxComboRef.current,
        accuracy: Math.round(accuracy * 100) / 100,
        rank,
        stats: finalStats,
        totalNotes,
        cleared: healthRef.current > 0
      }
    }

    const result = {
      score: scoreRef.current,
      maxCombo: maxComboRef.current,
      stats: finalStats,
      accuracy: Math.round(accuracy * 100) / 100,
      rank,
      totalNotes,
      health: healthRef.current,
      cleared: healthRef.current > 0,
      isPracticeMode,
      playbackSpeed: currentPlaybackSpeed,
      replayData
    }

    setTimeout(() => {
      onEnd(result)
    }, 300)
  }, [getFilteredNotes, onEnd, isPracticeMode, currentPlaybackSpeed, track])

  const jumpToSection = useCallback((startBar, endBar) => {
    const startTime = startBar * barDuration
    const endTime = endBar * barDuration

    try {
      Tone.Transport.seconds = startTime
    } catch(e) {}

    const notesInSection = getFilteredNotes()
    gameDataRef.current.notes = notesInSection.map(n => ({
      ...n,
      hit: false,
      missed: false,
      judgeType: null
    }))
    gameDataRef.current.activeNotes = gameDataRef.current.notes.map(n => ({ ...n }))
    gameDataRef.current.hitEffects = []
    gameDataRef.current.particles = []
    gameDataRef.current.ringPulses = []

    currentSectionRef.current = { startBar, endBar, startTime, endTime }
  }, [barDuration, getFilteredNotes])

  const startGame = useCallback(async () => {
    if (isStartingRef.current || gameEndedRef.current) return

    isStartingRef.current = true

    try {
      try {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        Tone.Transport.playbackRate = isTutorialMode ? tutorialPlaybackSpeed : 1.0
        Tone.Transport.position = 0
      } catch(e) {}

      if (!toneRef.current.audioReady) {
        await Tone.start()
        createSynths()
      }

      updateTrackGains()
      updatePlaybackSpeed(practiceSettings.playbackSpeed)

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }

      const range = practiceRange()
      const filteredNotes = getFilteredNotes()

      gameDataRef.current.notes = filteredNotes.map(n => ({
        ...n,
        hit: false,
        missed: false,
        judgeType: null
      }))
      gameDataRef.current.activeNotes = gameDataRef.current.notes.map(n => ({ ...n }))
      gameDataRef.current.hitEffects = []
      gameDataRef.current.particles = []
      gameDataRef.current.ringPulses = []
      gameDataRef.current.currentTime = range.start

      currentSectionRef.current = {
        startBar: Math.floor(range.start / barDuration),
        endBar: Math.ceil(range.end / barDuration),
        startTime: range.start,
        endTime: range.end
      }

      statsRef.current = { perfect: 0, great: 0, good: 0, miss: 0 }
      comboRef.current = 0
      scoreRef.current = 0
      healthRef.current = 100
      maxComboRef.current = 0
      gameEndedRef.current = false
      hasStartedRef.current = true
      replayQueueRef.current = []
      loopCountRef.current = 0

      replayDataRef.current = {
        keyEvents: [],
        judgeEvents: [],
        scoreHistory: [{ time: 0, score: 0, combo: 0 }],
        healthHistory: [{ time: 0, health: 100 }]
      }

      setStats({ perfect: 0, great: 0, good: 0, miss: 0 })
      setCombo(0)
      setScore(0)
      setHealth(100)
      setMaxCombo(0)
      setCurrentTime(range.start)
      setProgress(0)

      try {
        Tone.Transport.cancel()
      } catch(e) {}
      toneRef.current.scheduledEvents = []
      scheduleSong()

      try {
        Tone.Transport.seconds = range.start
        Tone.Transport.start()
      } catch(e) {
        console.error('Transport start error:', e)
      }

      setGameState('playing')

      const gameLoop = () => {
        if (gameEndedRef.current) {
          return
        }

        let now = 0
        try {
          now = Tone.Transport.seconds
        } catch(e) {}

        const range = practiceRange()
        const sectionEnd = currentSectionRef.current?.endTime || range.end
        const shouldCheckReplay = now >= sectionEnd
        const hasReplayItems = replayQueueRef.current.length > 0 && practiceSettings.replayMisses
        const shouldLoop = practiceSettings.loopMode !== 'off'

        if (shouldCheckReplay && (hasReplayItems || shouldLoop)) {
          if (hasReplayItems) {
            const nextReplay = replayQueueRef.current.shift()
            nextReplay.attempts += 1
            jumpToSection(nextReplay.startBar, nextReplay.endBar)

            try {
              Tone.Transport.cancel()
            } catch(e) {}
            scheduleSong()
            try {
              Tone.Transport.seconds = nextReplay.startBar * barDuration
            } catch(e) {}

            currentSectionRef.current = {
              startBar: nextReplay.startBar,
              endBar: nextReplay.endBar,
              startTime: nextReplay.startBar * barDuration,
              endTime: nextReplay.endBar * barDuration
            }
          } else if (practiceSettings.loopMode === 'section' || practiceSettings.loopMode === 'full') {
            loopCountRef.current += 1

            const filteredNotes = getFilteredNotes()
            gameDataRef.current.notes = filteredNotes.map(n => ({
              ...n,
              hit: false,
              missed: false,
              judgeType: null
            }))
            gameDataRef.current.activeNotes = gameDataRef.current.notes.map(n => ({ ...n }))
            gameDataRef.current.hitEffects = []
            gameDataRef.current.particles = []
            gameDataRef.current.ringPulses = []

            try {
              Tone.Transport.cancel()
            } catch(e) {}
            scheduleSong()
            try {
              Tone.Transport.seconds = range.start
            } catch(e) {}

            currentSectionRef.current = {
              startBar: Math.floor(range.start / barDuration),
              endBar: Math.ceil(range.end / barDuration),
              startTime: range.start,
              endTime: range.end
            }
          }
        } else if (shouldCheckReplay && !hasReplayItems && !shouldLoop) {
          gameEndedRef.current = true
          endGame()
          return
        }

        if (!isPracticeMode && now >= track.duration + 1.5 && !gameEndedRef.current) {
          gameEndedRef.current = true
          endGame()
          return
        }

        gameDataRef.current.currentTime = now
        setCurrentTime(now)

        const totalRange = range.end - range.start
        const progressInRange = Math.max(0, Math.min(1, (now - range.start) / totalRange))
        setProgress(progressInRange)

        const activeData = gameDataRef.current

        const adjustedMissWindow = JUDGE_WINDOWS.miss * tutorialJudgeMultiplier
        activeData.activeNotes.forEach(note => {
          if (!note.hit && !note.missed && note.time + judgmentOffsetSec + adjustedMissWindow < now) {
            note.missed = true
            const comboBefore = comboRef.current
            comboRef.current = 0
            setCombo(0)
            statsRef.current.miss += 1
            setStats({ ...statsRef.current })
            healthRef.current = Math.max(0, healthRef.current - 8)
            setHealth(healthRef.current)

            if (shouldReplayNote('miss')) {
              addToReplayQueue(note)
            }

            replayDataRef.current.judgeEvents.push({
              time: now,
              noteTime: note.time,
              lane: note.lane,
              judgeType: 'miss',
              timeDiff: adjustedMissWindow,
              scoreChange: 0,
              comboBefore,
              comboAfter: 0
            })

            replayDataRef.current.scoreHistory.push({
              time: now,
              score: scoreRef.current,
              combo: 0
            })

            replayDataRef.current.healthHistory.push({
              time: now,
              health: healthRef.current
            })

            activeData.hitEffects.push({
              lane: note.lane,
              type: 'miss',
              time: now,
              y: 1
            })

            playHitSound('miss')
          }
        })

        activeData.particles = activeData.particles.filter(p => {
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.001
          p.life -= 0.02
          return p.life > 0
        })

        activeData.ringPulses = activeData.ringPulses.filter(r => {
          r.radius += 0.02
          return r.radius < 0.25
        })

        if (healthRef.current <= 0 && !gameEndedRef.current && !isPracticeMode) {
          gameEndedRef.current = true
          endGame()
          return
        }

        animFrameRef.current = requestAnimationFrame(gameLoop)
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    } catch (e) {
      console.error('Start game error:', e)
    } finally {
      isStartingRef.current = false
    }
  }, [
    track,
    createSynths,
    scheduleSong,
    playHitSound,
    endGame,
    updateTrackGains,
    updatePlaybackSpeed,
    practiceSettings,
    practiceRange,
    getFilteredNotes,
    jumpToSection,
    shouldReplayNote,
    addToReplayQueue,
    isPracticeMode,
    isTutorialMode,
    tutorialPlaybackSpeed,
    tutorialJudgeMultiplier,
    barDuration
  ])

  const handleKeyDown = useCallback((e) => {
    if (gameState === 'ready') {
      startGame()
      return
    }

    if (gameState !== 'playing') return

    if (e.code === 'Space') {
      e.preventDefault()
      try {
        if (Tone.Transport.state === 'started') {
          Tone.Transport.pause()
          setGameState('paused')
        } else if (Tone.Transport.state === 'paused') {
          Tone.Transport.start()
          setGameState('playing')
        }
      } catch(e) {}
      return
    }

    const laneIndex = keyConfig.lanes.indexOf(e.code)
    if (laneIndex === -1) return

    e.preventDefault()
    if (gameDataRef.current.lanePressed[laneIndex]) return

    gameDataRef.current.lanePressed[laneIndex] = true

    let timeNow = 0
    try {
      timeNow = Tone.Transport.seconds
    } catch(e) {}

    replayDataRef.current.keyEvents.push({
      time: timeNow,
      lane: laneIndex,
      type: 'down',
      keyCode: e.code
    })

    const judgeType = judgeNote(laneIndex, timeNow)

    if (judgeType) {
      setJudgeFeedback({ type: judgeType, lane: laneIndex, id: Date.now() })
      setTimeout(() => setJudgeFeedback(null), 400)
    }
  }, [gameState, keyConfig.lanes, judgeNote, startGame])

  const handleKeyUp = useCallback((e) => {
    const laneIndex = keyConfig.lanes.indexOf(e.code)
    if (laneIndex === -1) return
    gameDataRef.current.lanePressed[laneIndex] = false

    if (gameState === 'playing') {
      let timeNow = 0
      try {
        timeNow = Tone.Transport.seconds
      } catch(e) {}
      replayDataRef.current.keyEvents.push({
        time: timeNow,
        lane: laneIndex,
        type: 'up',
        keyCode: e.code
      })
    }
  }, [gameState, keyConfig.lanes])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

      try {
        Tone.Transport.stop()
        Tone.Transport.cancel()
        Tone.Transport.playbackRate = 1
      } catch(e) {}

      try {
        if (toneRef.current.leadSynth) toneRef.current.leadSynth.dispose()
        if (toneRef.current.bassSynth) toneRef.current.bassSynth.dispose()
        if (toneRef.current.padSynth) toneRef.current.padSynth.dispose()
        if (toneRef.current.kickSynth) toneRef.current.kickSynth.dispose()
        if (toneRef.current.snareSynth) toneRef.current.snareSynth.dispose()
        if (toneRef.current.hihatSynth) toneRef.current.hihatSynth.dispose()
        if (toneRef.current.snareFilter) toneRef.current.snareFilter.dispose()
        if (toneRef.current.hihatFilter) toneRef.current.hihatFilter.dispose()
        if (toneRef.current.analyser) toneRef.current.analyser.dispose()
        if (toneRef.current.masterGain) toneRef.current.masterGain.dispose()
        if (toneRef.current.reverb) toneRef.current.reverb.dispose()
        if (toneRef.current.leadGain) toneRef.current.leadGain.dispose()
        if (toneRef.current.bassGain) toneRef.current.bassGain.dispose()
        if (toneRef.current.chordsGain) toneRef.current.chordsGain.dispose()
        if (toneRef.current.drumsGain) toneRef.current.drumsGain.dispose()
      } catch(e) {}

      toneRef.current.audioReady = false
      gameEndedRef.current = false
      hasStartedRef.current = false
      isStartingRef.current = false
    }
  }, [])

  const handleStartClick = () => {
    startGame()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const range = practiceRange()

  return (
    <div style={styles.container}>
      <CanvasRenderer
        track={track}
        keyConfig={keyConfig}
        gameDataRef={gameDataRef}
        currentTime={currentTime}
        analyser={toneRef.current.analyser}
        judgeFeedback={judgeFeedback}
        practiceRange={range}
      />

      <ScorePanel
        score={score}
        combo={combo}
        maxCombo={maxCombo}
        health={health}
        progress={progress}
        currentTime={currentTime}
        duration={range.end - range.start}
        stats={stats}
        trackTitle={track.title}
        judgeFeedback={judgeFeedback}
      />

      {isPracticeMode && (
        <div style={styles.practiceIndicator}>
          <span style={styles.practiceIcon}>🧪</span>
          <span style={styles.practiceText}>练习模式</span>
          <span style={styles.speedBadge}>{currentPlaybackSpeed}x</span>
          {practiceSettings.loopMode !== 'off' && (
            <span style={styles.loopBadge}>
              🔁 {practiceSettings.loopMode === 'section' ? '区段' : '全曲'}
            </span>
          )}
          {practiceSettings.replayMisses && (
            <span style={styles.replayBadge}>
              🎯 重放: {practiceSettings.replayThreshold}
            </span>
          )}
          {currentSectionRef.current && (
            <span style={styles.sectionBadge}>
              📍 第 {currentSectionRef.current.startBar + 1} - {currentSectionRef.current.endBar} 小节
            </span>
          )}
          {loopCountRef.current > 0 && (
            <span style={styles.loopCountBadge}>
              🔄 循环 x{loopCountRef.current}
            </span>
          )}
        </div>
      )}

      {isTutorialMode && (
        <div style={styles.tutorialIndicator}>
          <span style={styles.tutorialIcon}>🎓</span>
          <span style={styles.tutorialText}>教学模式</span>
          <span style={styles.tutorialSpeedBadge}>{tutorialPlaybackSpeed}x 速度</span>
          <span style={styles.tutorialJudgeBadge}>判定窗口 +50%</span>
        </div>
      )}

      {isTutorialMode && gameState === 'ready' && (
        <div style={styles.tutorialReadyOverlay}>
          <div style={styles.tutorialReadyContent}>
            <div style={styles.tutorialReadyIcon}>🎵</div>
            <h2 style={styles.tutorialReadyTitle}>教学模式已准备就绪</h2>
            <p style={styles.tutorialReadyDesc}>
              准备好了吗？按任意键或点击下方按钮开始练习
            </p>
            <div style={styles.tutorialKeyHints}>
              {keyConfig.labels.map((label, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.tutorialKeyHint,
                    borderColor: keyConfig.colors[i],
                    color: keyConfig.colors[i]
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <button
              style={styles.tutorialStartBtn}
              onClick={handleStartClick}
            >
              ▶ 开始练习
            </button>
          </div>
        </div>
      )}

      {isTutorialMode && gameState === 'playing' && (
        <div style={styles.tutorialHint}>
          <span style={styles.tutorialHintText}>
            💡 当音符到达判定线时，按下对应按键！
          </span>
        </div>
      )}

      <div style={styles.laneHintBar}>
        {keyConfig.labels.map((label, i) => (
          <div
            key={i}
            style={{
              ...styles.laneHint,
              borderColor: keyConfig.colors[i],
              color: keyConfig.colors[i],
              background: gameDataRef.current.lanePressed[i]
                ? `${keyConfig.colors[i]}44`
                : 'rgba(0,0,0,0.5)'
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={styles.topRightButtons}>
        {isPracticeMode && (
          <button
            style={styles.settingsBtn}
            onClick={() => setShowPracticePanel(!showPracticePanel)}
          >
            ⚙ 设置
          </button>
        )}
        <button style={styles.quitBtn} onClick={onQuit}>
          ✕ 退出
        </button>
      </div>

      {showPracticePanel && isPracticeMode && (
        <div style={styles.practicePanelOverlay} onClick={() => setShowPracticePanel(false)}>
          <div style={styles.practicePanel} onClick={e => e.stopPropagation()}>
            <h3 style={styles.panelTitle}>练习设置</h3>

            <div style={styles.panelSection}>
              <span style={styles.panelSectionTitle}>播放速度</span>
              <div style={styles.speedButtons}>
                {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map(speed => (
                  <button
                    key={speed}
                    style={{
                      ...styles.panelBtn,
                      background: currentPlaybackSpeed === speed
                        ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                        : 'rgba(255,255,255,0.05)',
                      color: currentPlaybackSpeed === speed ? '#00332a' : '#fff'
                    }}
                    onClick={() => {
                      practiceStore.setPlaybackSpeed(speed)
                      updatePlaybackSpeed(speed)
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.panelSection}>
              <span style={styles.panelSectionTitle}>轨道静音</span>
              <div style={styles.trackButtons}>
                {[
                  { key: 'lead', label: '主旋律', color: keyConfig.colors[0] },
                  { key: 'bass', label: '贝斯', color: keyConfig.colors[1] },
                  { key: 'chords', label: '和弦', color: keyConfig.colors[2] },
                  { key: 'drums', label: '鼓点', color: keyConfig.colors[3] }
                ].map(t => (
                  <button
                    key={t.key}
                    style={{
                      ...styles.trackBtn,
                      borderColor: t.color,
                      background: practiceSettings.mutedTracks[t.key]
                        ? `${t.color}22`
                        : 'rgba(255,255,255,0.05)',
                      opacity: practiceSettings.mutedTracks[t.key] ? 0.5 : 1
                    }}
                    onClick={() => {
                      practiceStore.toggleTrackMute(t.key)
                      setTimeout(() => updateTrackGains(), 10)
                    }}
                  >
                    {practiceSettings.mutedTracks[t.key] ? '🔇' : '🔊'} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.panelSection}>
              <span style={styles.panelSectionTitle}>循环模式</span>
              <div style={styles.loopButtons}>
                {[
                  { value: 'off', label: '关闭' },
                  { value: 'section', label: '区段循环' },
                  { value: 'full', label: '全曲循环' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    style={{
                      ...styles.panelBtn,
                      background: practiceSettings.loopMode === opt.value
                        ? 'linear-gradient(135deg, #6699ff, #4477dd)'
                        : 'rgba(255,255,255,0.05)',
                      color: practiceSettings.loopMode === opt.value ? '#fff' : 'rgba(255,255,255,0.7)'
                    }}
                    onClick={() => practiceStore.setLoopMode(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.closePanelBtn} onClick={() => setShowPracticePanel(false)}>
              关闭
            </button>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div style={styles.pauseOverlay}>
          <div style={styles.pauseCard}>
            <h2 style={styles.pauseTitle}>⏸ 暂停</h2>
            <p style={styles.pauseHint}>按空格键继续</p>
            <button style={styles.resumeBtn} onClick={() => {
              try {
                Tone.Transport.start()
                setGameState('playing')
              } catch(e) {}
            }}>
              ▶ 继续
            </button>
          </div>
        </div>
      )}

      {gameState === 'ready' && (
        <div style={styles.overlay} onClick={handleStartClick}>
          <div style={styles.readyCard}>
            <div style={styles.readyTitle}>{track.title}</div>
            <div style={styles.readySub}>{track.artist} · {track.difficulty}</div>
            <div style={styles.readyBpm}>
              BPM {track.bpm} · {getFilteredNotes().length} NOTES
              {isPracticeMode && ` · 第 ${Math.floor(range.start / barDuration) + 1}-${Math.ceil(range.end / barDuration)} 小节`}
            </div>
            {isPracticeMode && (
              <div style={styles.practiceReadyInfo}>
                <span style={styles.practiceReadyBadge}>🧪 练习模式</span>
                <span style={styles.practiceReadyBadge}>⏱ {practiceSettings.playbackSpeed}x 速度</span>
                {practiceSettings.loopMode !== 'off' && (
                  <span style={styles.practiceReadyBadge}>
                    🔁 {practiceSettings.loopMode === 'section' ? '区段' : '全曲'}循环
                  </span>
                )}
              </div>
            )}
            <div style={styles.startBtn}>
              ▶ 点击开始
            </div>
            <div style={styles.startHint}>
              或按任意游戏键（{keyConfig.labels.join(' ')}）开始 · 空格键暂停
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#050508'
  },
  laneHintBar: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    zIndex: 10
  },
  laneHint: {
    width: '64px',
    height: '64px',
    border: '2px solid',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 800,
    transition: 'all 0.08s',
    backdropFilter: 'blur(5px)'
  },
  topRightButtons: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '10px',
    zIndex: 20
  },
  quitBtn: {
    padding: '8px 16px',
    background: 'rgba(255,51,102,0.15)',
    border: '1px solid rgba(255,51,102,0.3)',
    color: '#ff3366',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  settingsBtn: {
    padding: '8px 16px',
    background: 'rgba(0,255,204,0.15)',
    border: '1px solid rgba(0,255,204,0.3)',
    color: '#00ffcc',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.9)',
    zIndex: 50,
    backdropFilter: 'blur(15px)',
    cursor: 'pointer'
  },
  readyCard: {
    textAlign: 'center',
    padding: '48px 64px',
    background: 'rgba(10,10,20,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    boxShadow: '0 20px 80px rgba(0,0,0,0.5)'
  },
  readyTitle: {
    fontSize: '42px',
    fontWeight: 900,
    letterSpacing: '6px',
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  readySub: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '16px'
  },
  readyBpm: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '2px',
    marginBottom: '20px'
  },
  practiceReadyInfo: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  practiceReadyBadge: {
    padding: '6px 12px',
    background: 'rgba(0,255,204,0.15)',
    border: '1px solid rgba(0,255,204,0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#00ffcc',
    fontWeight: 600
  },
  startBtn: {
    display: 'inline-block',
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '4px',
    boxShadow: '0 8px 40px rgba(255,51,102,0.4)',
    marginBottom: '16px'
  },
  startHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px'
  },
  practiceIndicator: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'rgba(10,10,20,0.9)',
    border: '1px solid rgba(0,255,204,0.3)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    zIndex: 15,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '80%'
  },
  practiceIcon: {
    fontSize: '16px'
  },
  practiceText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#00ffcc',
    letterSpacing: '2px'
  },
  speedBadge: {
    padding: '4px 10px',
    background: 'rgba(0,255,204,0.2)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#00ffcc',
    fontWeight: 600
  },
  loopBadge: {
    padding: '4px 10px',
    background: 'rgba(102,153,255,0.2)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#6699ff',
    fontWeight: 600
  },
  replayBadge: {
    padding: '4px 10px',
    background: 'rgba(255,204,0,0.2)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#ffcc00',
    fontWeight: 600
  },
  sectionBadge: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 600
  },
  loopCountBadge: {
    padding: '4px 10px',
    background: 'rgba(204,102,255,0.2)',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#cc66ff',
    fontWeight: 600
  },
  practicePanelOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    backdropFilter: 'blur(5px)'
  },
  practicePanel: {
    width: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    background: 'rgba(10,10,20,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(20px)'
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '3px',
    margin: '0 0 20px 0',
    color: '#00ffcc',
    textAlign: 'center'
  },
  panelSection: {
    marginBottom: '20px'
  },
  panelSectionTitle: {
    display: 'block',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px',
    letterSpacing: '1px'
  },
  speedButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px'
  },
  trackButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  loopButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  panelBtn: {
    padding: '10px 8px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  trackBtn: {
    padding: '10px 12px',
    border: '1.5px solid',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff'
  },
  closePanelBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '8px',
    color: '#00332a',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '10px'
  },
  pauseOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.85)',
    zIndex: 55,
    backdropFilter: 'blur(10px)'
  },
  pauseCard: {
    textAlign: 'center',
    padding: '40px 60px',
    background: 'rgba(10,10,20,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px'
  },
  pauseTitle: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 12px 0',
    color: '#fff'
  },
  pauseHint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '24px'
  },
  resumeBtn: {
    padding: '12px 40px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '10px',
    color: '#00332a',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer'
  },
  tutorialIndicator: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.2), rgba(255,153,0,0.15))',
    border: '1px solid rgba(255,204,0,0.4)',
    borderRadius: '12px',
    zIndex: 20,
    backdropFilter: 'blur(10px)'
  },
  tutorialIcon: {
    fontSize: '20px'
  },
  tutorialText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffcc00',
    letterSpacing: '1px'
  },
  tutorialSpeedBadge: {
    padding: '4px 10px',
    background: 'rgba(0,255,204,0.15)',
    border: '1px solid rgba(0,255,204,0.3)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#00ffcc',
    fontWeight: 600
  },
  tutorialJudgeBadge: {
    padding: '4px 10px',
    background: 'rgba(102,153,255,0.15)',
    border: '1px solid rgba(102,153,255,0.3)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#6699ff',
    fontWeight: 600
  },
  tutorialReadyOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.9)',
    zIndex: 60,
    backdropFilter: 'blur(15px)'
  },
  tutorialReadyContent: {
    textAlign: 'center',
    padding: '48px 60px',
    background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(10,10,20,0.95))',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '24px',
    boxShadow: '0 20px 80px rgba(255,204,0,0.15)'
  },
  tutorialReadyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    animation: 'bounce 1s ease-in-out infinite'
  },
  tutorialReadyTitle: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 12px 0',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  tutorialReadyDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '24px'
  },
  tutorialKeyHints: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '28px'
  },
  tutorialKeyHint: {
    width: '56px',
    height: '56px',
    border: '2px solid',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 800,
    background: 'rgba(0,0,0,0.3)'
  },
  tutorialStartBtn: {
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#332200',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(255,204,0,0.4)',
    transition: 'all 0.2s'
  },
  tutorialHint: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 15
  },
  tutorialHintText: {
    padding: '10px 20px',
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(255,204,0,0.3)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#ffcc00',
    backdropFilter: 'blur(10px)',
    animation: 'pulse 2s ease-in-out infinite'
  }
}
