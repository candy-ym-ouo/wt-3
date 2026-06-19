import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import CanvasRenderer from './CanvasRenderer.jsx'
import ScorePanel from './ScorePanel.jsx'

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

export default function Game({ track, keyConfig, onEnd, onQuit }) {
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

  const gameDataRef = useRef({
    notes: [],
    activeNotes: [],
    hitEffects: [],
    particles: [],
    ringPulses: [],
    lanePressed: [false, false, false, false],
    currentTime: 0
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

    const leadSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: track.synth.leadOsc },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.5 },
      volume: -10
    })
    leadSynth.connect(reverb)
    toneRef.current.leadSynth = leadSynth

    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: track.synth.bassOsc },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.3, baseFrequency: 80, octaves: 4, release: 0.2 },
      volume: -8
    })
    bassSynth.connect(reverb)
    toneRef.current.bassSynth = bassSynth

    const padSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: track.synth.padOsc },
      envelope: { attack: 0.5, decay: 0.3, sustain: 0.6, release: 2 },
      volume: -18
    })
    padSynth.connect(reverb)
    toneRef.current.padSynth = padSynth

    const kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.2 },
      volume: -6
    })
    kickSynth.connect(reverb)
    kickSynth.connect(masterGain)
    toneRef.current.kickSynth = kickSynth

    const snareFilter = new Tone.Filter(3000, 'highpass')
    const snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -10
    })
    snareSynth.connect(snareFilter)
    snareFilter.connect(reverb)
    snareFilter.connect(masterGain)
    toneRef.current.snareSynth = snareSynth
    toneRef.current.snareFilter = snareFilter

    const hihatFilter = new Tone.Filter(8000, 'highpass')
    const hihatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
      volume: -16
    })
    hihatSynth.connect(hihatFilter)
    hihatFilter.connect(reverb)
    hihatFilter.connect(masterGain)
    toneRef.current.hihatSynth = hihatSynth
    toneRef.current.hihatFilter = hihatFilter

    toneRef.current.audioReady = true
  }, [track.bpm, track.synth])

  const scheduleSong = useCallback(() => {
    const { songData } = track
    const { leadSynth, bassSynth, padSynth, kickSynth, snareSynth, hihatSynth } = toneRef.current
    const events = []

    if (songData.lead) {
      songData.lead.forEach(note => {
        const eid = Tone.Transport.schedule((time) => {
          try {
            leadSynth.triggerAttackRelease(note.note, note.duration * 0.9, time, note.velocity)
          } catch(e) {}
        }, note.time)
        events.push(eid)
      })
    }

    if (songData.bass) {
      songData.bass.forEach(note => {
        const eid = Tone.Transport.schedule((time) => {
          try {
            bassSynth.triggerAttackRelease(note.note, note.duration * 0.9, time, note.velocity)
          } catch(e) {}
        }, note.time)
        events.push(eid)
      })
    }

    if (songData.chords) {
      songData.chords.forEach(note => {
        const eid = Tone.Transport.schedule((time) => {
          try {
            padSynth.triggerAttackRelease(note.note, note.duration * 0.95, time, note.velocity)
          } catch(e) {}
        }, note.time)
        events.push(eid)
      })
    }

    if (songData.drums) {
      songData.drums.forEach(drum => {
        const eid = Tone.Transport.schedule((time) => {
          try {
            if (drum.type === 'kick') {
              kickSynth.triggerAttackRelease('C2', '8n', time, drum.velocity)
            } else if (drum.type === 'snare') {
              snareSynth.triggerAttackRelease('16n', time, drum.velocity)
            } else if (drum.type === 'hihat') {
              hihatSynth.triggerAttackRelease('32n', time, drum.velocity)
            }
          } catch(e) {}
        }, drum.time)
        events.push(eid)
      })
    }

    toneRef.current.scheduledEvents = events
  }, [track])

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

  const judgeNote = useCallback((lane, timeNow) => {
    const data = gameDataRef.current
    let closestNote = null
    let closestDiff = Infinity

    for (let i = 0; i < data.activeNotes.length; i++) {
      const note = data.activeNotes[i]
      if (note.lane !== lane || note.hit || note.missed) continue
      const diff = Math.abs(note.time - timeNow)
      if (diff < closestDiff && diff < JUDGE_WINDOWS.miss) {
        closestDiff = diff
        closestNote = { note, index: i }
      }
    }

    if (!closestNote) return null

    const { note, index } = closestNote
    let judgeType = 'miss'

    if (closestDiff <= JUDGE_WINDOWS.perfect) judgeType = 'perfect'
    else if (closestDiff <= JUDGE_WINDOWS.great) judgeType = 'great'
    else if (closestDiff <= JUDGE_WINDOWS.good) judgeType = 'good'

    data.activeNotes[index].hit = true
    data.activeNotes[index].judgeType = judgeType

    const baseScore = SCORE_VALUES[judgeType]
    const comboBonus = Math.floor(comboRef.current / 10) * 50
    const totalScore = baseScore + comboBonus

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
  }, [keyConfig.colors, playHitSound])

  const endGame = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }

    try {
      Tone.Transport.stop()
    } catch(e) {}

    const finalStats = { ...statsRef.current }
    const totalNotes = track.notes.length
    const accuracy = totalNotes > 0
      ? ((finalStats.perfect * 100 + finalStats.great * 75 + finalStats.good * 50) / totalNotes)
      : 0

    let rank = 'D'
    if (accuracy >= 95) rank = 'S'
    else if (accuracy >= 90) rank = 'A'
    else if (accuracy >= 80) rank = 'B'
    else if (accuracy >= 70) rank = 'C'

    const result = {
      score: scoreRef.current,
      maxCombo: maxComboRef.current,
      stats: finalStats,
      accuracy: Math.round(accuracy * 100) / 100,
      rank,
      totalNotes,
      health: healthRef.current,
      cleared: healthRef.current > 0
    }

    setTimeout(() => {
      onEnd(result)
    }, 300)
  }, [track.notes, onEnd])

  const startGame = useCallback(async () => {
    if (isStartingRef.current || gameEndedRef.current) return
    
    isStartingRef.current = true

    try {
      if (!toneRef.current.audioReady) {
        await Tone.start()
        createSynths()
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }

      gameDataRef.current.notes = track.notes.map(n => ({
        ...n,
        hit: false,
        missed: false,
        judgeType: null
      }))
      gameDataRef.current.activeNotes = gameDataRef.current.notes.map(n => ({ ...n }))
      gameDataRef.current.hitEffects = []
      gameDataRef.current.particles = []
      gameDataRef.current.ringPulses = []
      gameDataRef.current.currentTime = 0

      statsRef.current = { perfect: 0, great: 0, good: 0, miss: 0 }
      comboRef.current = 0
      scoreRef.current = 0
      healthRef.current = 100
      maxComboRef.current = 0
      gameEndedRef.current = false
      hasStartedRef.current = true

      setStats({ perfect: 0, great: 0, good: 0, miss: 0 })
      setCombo(0)
      setScore(0)
      setHealth(100)
      setMaxCombo(0)
      setCurrentTime(0)
      setProgress(0)

      try {
        Tone.Transport.cancel()
      } catch(e) {}
      toneRef.current.scheduledEvents = []
      scheduleSong()

      try {
        Tone.Transport.seconds = 0
        Tone.Transport.start()
      } catch(e) {
          console.error('Transport start error:', e)
        }

      setGameState('playing')

      let lastTime = 0
      const gameLoop = () => {
        if (gameEndedRef.current) {
          return
        }

        let now = 0
        try {
          now = Tone.Transport.seconds
        } catch(e) {}

        gameDataRef.current.currentTime = now
        setCurrentTime(now)
        setProgress(Math.min(1, now / track.duration))

        const activeData = gameDataRef.current

        activeData.activeNotes.forEach(note => {
          if (!note.hit && !note.missed && note.time + JUDGE_WINDOWS.miss < now) {
            note.missed = true
            comboRef.current = 0
            setCombo(0)
            statsRef.current.miss += 1
            setStats({ ...statsRef.current })
            healthRef.current = Math.max(0, healthRef.current - 8)
            setHealth(healthRef.current)

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

        if (now >= track.duration + 1.5 && !gameEndedRef.current) {
          gameEndedRef.current = true
          endGame()
          return
        }

        if (healthRef.current <= 0 && !gameEndedRef.current) {
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
  }, [track, createSynths, scheduleSong, playHitSound, endGame])

  const handleKeyDown = useCallback((e) => {
    if (gameState === 'ready') {
      startGame()
      return
    }

    if (gameState !== 'playing') return

    const laneIndex = keyConfig.lanes.indexOf(e.code)
    if (laneIndex === -1) return

    e.preventDefault()
    if (gameDataRef.current.lanePressed[laneIndex]) return

    gameDataRef.current.lanePressed[laneIndex] = true

    let timeNow = 0
    try {
      timeNow = Tone.Transport.seconds
    } catch(e) {}

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
  }, [keyConfig.lanes])

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

  return (
    <div style={styles.container}>
      <CanvasRenderer
        track={track}
        keyConfig={keyConfig}
        gameDataRef={gameDataRef}
        currentTime={currentTime}
        analyser={toneRef.current.analyser}
        judgeFeedback={judgeFeedback}
      />

      <ScorePanel
        score={score}
        combo={combo}
        maxCombo={maxCombo}
        health={health}
        progress={progress}
        currentTime={currentTime}
        duration={track.duration}
        stats={stats}
        trackTitle={track.title}
        judgeFeedback={judgeFeedback}
      />

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

      <button style={styles.quitBtn} onClick={onQuit}>
        ✕ 退出
      </button>

      {gameState === 'ready' && (
        <div style={styles.overlay} onClick={handleStartClick}>
          <div style={styles.readyCard}>
            <div style={styles.readyTitle}>{track.title}</div>
            <div style={styles.readySub}>{track.artist} · {track.difficulty}</div>
            <div style={styles.readyBpm}>BPM {track.bpm} · {track.notes.length} NOTES</div>
            <div style={styles.startBtn}>
              ▶ 点击开始
            </div>
            <div style={styles.startHint}>
              或按任意游戏键（{keyConfig.labels.join(' ')}）开始
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
  quitBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 20,
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
    marginBottom: '36px'
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
  }
}
