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
  const [gameState, setGameState] = useState('loading')
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

  const canvasRef = useRef(null)
  const gameDataRef = useRef({
    notes: [],
    activeNotes: [],
    hitEffects: [],
    particles: [],
    ringPulses: [],
    lanePressed: [false, false, false, false],
    audioStarted: false
  })
  const toneSynthRef = useRef(null)
  const toneBassRef = useRef(null)
  const toneNoiseRef = useRef(null)
  const toneAnalyserRef = useRef(null)
  const startTimeRef = useRef(0)
  const animFrameRef = useRef(null)
  const transportIdRef = useRef(null)
  const notesToScheduleRef = useRef([])
  const statsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 })
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const healthRef = useRef(100)
  const maxComboRef = useRef(0)

  const initAudio = useCallback(async () => {
    await Tone.start()
    Tone.Transport.bpm.value = track.bpm

    const analyser = new Tone.Analyser('waveform', 256)
    toneAnalyserRef.current = analyser

    const compressor = new Tone.Compressor(-20, 4).toDestination()
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).connect(compressor)
    analyser.connect(compressor)

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: track.synth.type === 'lead' ? 'sawtooth' : 'triangle' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.8 },
      volume: -8
    }).connect(reverb)
    toneSynthRef.current = synth

    const bass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.5 },
      filterEnvelope: { attack: 0.01, decay: 0.4, baseFrequency: 100, octaves: 3, release: 0.2 },
      volume: -6
    }).connect(reverb)
    toneBassRef.current = bass

    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -15
    }).connect(compressor)
    toneNoiseRef.current = noise

    gameDataRef.current.audioStarted = true
  }, [track.bpm, track.synth.type])

  const playNoteSound = useCallback((noteIndex) => {
    if (!gameDataRef.current.audioStarted) return

    const { synth, bass, noise } = {
      synth: toneSynthRef.current,
      bass: toneBassRef.current,
      noise: toneNoiseRef.current
    }

    const scale = track.synth.scale
    const semitone = scale[noteIndex % scale.length]
    const octaveShift = Math.floor(noteIndex / scale.length) * 12

    const rootFreq = new Tone.Frequency(track.synth.root)
    const noteFreq = rootFreq.transpose(semitone + octaveShift)

    synth.triggerAttackRelease(noteFreq, '8n')

    if (noteIndex % 4 === 0) {
      const bassFreq = new Tone.Frequency(track.synth.bass)
      bass.triggerAttackRelease(bassFreq.transpose(semitone % 12), '4n')
    }

    if (noteIndex % 8 === 4) {
      noise.triggerAttackRelease('32n')
    }
  }, [track.synth])

  const playHitSound = useCallback((type) => {
    if (!toneNoiseRef.current || !gameDataRef.current.audioStarted) return

    if (type === 'perfect') {
      toneNoiseRef.current.volume.value = -10
      toneNoiseRef.current.triggerAttackRelease('16n')
    } else if (type === 'miss') {
      toneNoiseRef.current.volume.value = -20
      toneNoiseRef.current.triggerAttackRelease('64n')
    }
  }, [])

  const judgeNote = useCallback((lane, timeNow) => {
    const data = gameDataRef.current
    let closestNote = null
    let closestDiff = Infinity

    for (let i = 0; i < data.activeNotes.length; i++) {
      const note = data.activeNotes[i]
      if (note.lane !== lane || note.hit) continue
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

    for (let p = 0; p < (judgeType === 'perfect' ? 16 : judgeType === 'great' ? 10 : 6); p++) {
      const angle = (p / 16) * Math.PI * 2 + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
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

  const handleKeyDown = useCallback((e) => {
    if (gameState !== 'playing') return

    const laneIndex = keyConfig.lanes.indexOf(e.code)
    if (laneIndex === -1) return

    e.preventDefault()
    if (gameDataRef.current.lanePressed[laneIndex]) return

    gameDataRef.current.lanePressed[laneIndex] = true

    const timeNow = (Tone.now() - startTimeRef.current)
    const judgeType = judgeNote(laneIndex, timeNow)

    if (judgeType) {
      playNoteSound(laneIndex + Math.floor(timeNow * track.bpm / 60))
      setJudgeFeedback({ type: judgeType, lane: laneIndex, id: Date.now() })
      setTimeout(() => setJudgeFeedback(null), 400)
    }
  }, [gameState, keyConfig.lanes, judgeNote, playNoteSound, track.bpm])

  const handleKeyUp = useCallback((e) => {
    const laneIndex = keyConfig.lanes.indexOf(e.code)
    if (laneIndex === -1) return
    gameDataRef.current.lanePressed[laneIndex] = false
  }, [keyConfig.lanes])

  useEffect(() => {
    const init = async () => {
      gameDataRef.current.notes = track.notes.map(n => ({
        ...n,
        hit: false,
        judgeType: null
      }))
      gameDataRef.current.activeNotes = gameDataRef.current.notes.map(n => ({ ...n }))

      await initAudio()
      setGameState('ready')
    }
    init()
  }, [track, initAudio])

  useEffect(() => {
    if (gameState !== 'ready') return

    const timer = setTimeout(() => {
      startGame()
    }, 500)

    return () => clearTimeout(timer)
  }, [gameState])

  const startGame = useCallback(() => {
    const lookAhead = 3
    startTimeRef.current = Tone.now() + lookAhead
    const data = gameDataRef.current

    notesToScheduleRef.current = data.notes.filter(n => n.time < track.duration).map(n => ({ ...n }))

    Tone.Transport.scheduleRepeat((time) => {
      const elapsed = time - startTimeRef.current
      const scheduled = notesToScheduleRef.current.filter(n =>
        n.time <= elapsed + 0.1 && n.time > elapsed - 0.05 && !n.scheduled
      )

      scheduled.forEach(n => {
        n.scheduled = true
      })
    }, '32n')

    const gameLoop = () => {
      if (!gameDataRef.current.audioStarted) return

      const now = Tone.now() - startTimeRef.current
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

      const allNotes = activeData.activeNotes
      const totalNotes = allNotes.length
      const notesProcessed = allNotes.filter(n => n.hit || n.missed).length

      if (now >= track.duration + 1) {
        endGame()
        return
      }

      if (healthRef.current <= 0) {
        endGame()
        return
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    Tone.Transport.start()
    animFrameRef.current = requestAnimationFrame(gameLoop)
    setGameState('playing')
  }, [track.duration, playHitSound])

  const endGame = useCallback(() => {
    Tone.Transport.stop()
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

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

    onEnd(result)
  }, [track.notes, onEnd])

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
      Tone.Transport.stop()
      Tone.Transport.cancel()
      if (toneSynthRef.current) toneSynthRef.current.dispose()
      if (toneBassRef.current) toneBassRef.current.dispose()
      if (toneNoiseRef.current) toneNoiseRef.current.dispose()
      if (toneAnalyserRef.current) toneAnalyserRef.current.dispose()
    }
  }, [])

  return (
    <div style={styles.container}>
      <CanvasRenderer
        ref={canvasRef}
        track={track}
        keyConfig={keyConfig}
        gameDataRef={gameDataRef}
        currentTime={currentTime}
        analyser={toneAnalyserRef.current}
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

      {gameState === 'loading' && (
        <div style={styles.overlay}>
          <div style={styles.loadingText}>加载中...</div>
          <div style={styles.loadingSub}>初始化音频引擎</div>
        </div>
      )}

      {gameState === 'ready' && (
        <div style={styles.overlay}>
          <div style={styles.countdownText}>准备</div>
          <div style={styles.countdownSub}>按 {keyConfig.labels.join(' / ')} 键演奏</div>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.85)',
    zIndex: 50,
    backdropFilter: 'blur(10px)'
  },
  loadingText: {
    fontSize: '48px',
    fontWeight: 800,
    letterSpacing: '8px',
    color: '#fff',
    marginBottom: '12px',
    textShadow: '0 0 40px rgba(0,255,204,0.5)'
  },
  loadingSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px'
  },
  countdownText: {
    fontSize: '72px',
    fontWeight: 900,
    letterSpacing: '12px',
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '16px'
  },
  countdownSub: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '4px'
  }
}
