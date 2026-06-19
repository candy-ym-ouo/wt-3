import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as Tone from 'tone'

const LANE_COUNT = 4
const NOTE_HEIGHT = 6
const LANE_GAP = 8
const PADDING_LEFT = 80
const PADDING_RIGHT = 20
const PADDING_TOP = 60
const PADDING_BOTTOM = 100
const SNAP_OPTIONS = [
  { label: '1/1', value: 1 },
  { label: '1/2', value: 0.5 },
  { label: '1/4', value: 0.25 },
  { label: '1/8', value: 0.125 },
  { label: '1/16', value: 0.0625 },
  { label: '1/32', value: 0.03125 }
]

const DEFAULT_TRACK = {
  id: 'custom',
  title: '自定义曲目',
  artist: '未知艺术家',
  bpm: 120,
  difficulty: '普通',
  level: 5,
  duration: 30,
  synth: {
    leadOsc: 'sawtooth',
    bassOsc: 'sine',
    padOsc: 'triangle',
    root: 'C4'
  },
  notes: [],
  songData: {
    lead: [],
    bass: [],
    chords: [],
    drums: []
  },
  totalNotes: 0
}

export default function Editor({ initialTrack, onSave, onBack, onPlay, onChange, keyConfig }) {
  const [track, setTrack] = useState(initialTrack || { ...DEFAULT_TRACK, notes: [] })
  const [notes, setNotes] = useState((initialTrack?.notes || []).map((n, i) => ({ ...n, id: i })))
  const [snapValue, setSnapValue] = useState(0.25)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [editingField, setEditingField] = useState(null)

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const toneRef = useRef({
    synth: null,
    kickSynth: null,
    snareSynth: null,
    hihatSynth: null,
    masterGain: null,
    ready: false
  })
  const playStateRef = useRef({
    isPlaying: false,
    startTime: 0,
    startOffset: 0,
    rafId: null
  })
  const dragRef = useRef({
    isDragging: false,
    dragType: null,
    noteId: null,
    startY: 0,
    startNote: null,
    lane: null
  })

  const beatDuration = 60 / track.bpm
  const pixelsPerBeat = 60 * zoom
  const totalPixels = track.duration / beatDuration * pixelsPerBeat

  const timeToY = useCallback((time) => {
    return PADDING_TOP + (time / beatDuration) * pixelsPerBeat
  }, [beatDuration, pixelsPerBeat])

  const yToTime = useCallback((y) => {
    const relY = y - PADDING_TOP
    return (relY / pixelsPerBeat) * beatDuration
  }, [beatDuration, pixelsPerBeat])

  const getLaneX = useCallback((lane, canvasWidth) => {
    const trackWidth = canvasWidth - PADDING_LEFT - PADDING_RIGHT
    const laneWidth = (trackWidth - (LANE_COUNT - 1) * LANE_GAP) / LANE_COUNT
    return PADDING_LEFT + lane * (laneWidth + LANE_GAP) + laneWidth / 2
  }, [])

  const getLaneWidth = useCallback((canvasWidth) => {
    const trackWidth = canvasWidth - PADDING_LEFT - PADDING_RIGHT
    return (trackWidth - (LANE_COUNT - 1) * LANE_GAP) / LANE_COUNT
  }, [])

  const snapTime = useCallback((time) => {
    if (!snapEnabled) return time
    const snapBeats = snapValue
    const beats = time / beatDuration
    const snappedBeats = Math.round(beats / snapBeats) * snapBeats
    return snappedBeats * beatDuration
  }, [snapEnabled, snapValue, beatDuration])

  const initAudio = useCallback(async () => {
    if (toneRef.current.ready) return

    try {
      await Tone.start()

      const masterGain = new Tone.Gain(0.5).toDestination()
      toneRef.current.masterGain = masterGain

      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: track.synth.leadOsc },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
        volume: -8
      })
      synth.connect(masterGain)
      toneRef.current.synth = synth

      const kickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.2 },
        volume: -6
      })
      kickSynth.connect(masterGain)
      toneRef.current.kickSynth = kickSynth

      const snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
        volume: -10
      })
      snareSynth.connect(masterGain)
      toneRef.current.snareSynth = snareSynth

      const hihatSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
        volume: -14
      })
      hihatSynth.connect(masterGain)
      toneRef.current.hihatSynth = hihatSynth

      toneRef.current.ready = true
    } catch (e) {
      console.error('Audio init error:', e)
    }
  }, [track.synth.leadOsc])

  const playNoteSound = useCallback((lane) => {
    if (!toneRef.current.ready) return
    const { synth } = toneRef.current
    const notes = ['C4', 'E4', 'G4', 'B4']
    try {
      synth.triggerAttackRelease(notes[lane], '8n')
    } catch (e) {}
  }, [])

  const playMetronome = useCallback((isDownbeat) => {
    if (!toneRef.current.ready) return
    const { kickSynth, hihatSynth } = toneRef.current
    try {
      if (isDownbeat) {
        kickSynth.triggerAttackRelease('C2', '32n')
      } else {
        hihatSynth.triggerAttackRelease('64n')
      }
    } catch (e) {}
  }, [])

  const startPlayback = useCallback(async (fromTime = 0) => {
    await initAudio()

    if (playStateRef.current.isPlaying) {
      cancelAnimationFrame(playStateRef.current.rafId)
    }

    playStateRef.current.isPlaying = true
    playStateRef.current.startTime = performance.now()
    playStateRef.current.startOffset = fromTime
    setIsPlaying(true)

    let lastBeat = -1

    const tick = () => {
      if (!playStateRef.current.isPlaying) return

      const elapsed = (performance.now() - playStateRef.current.startTime) / 1000
      const time = playStateRef.current.startOffset + elapsed

      if (time >= track.duration) {
        stopPlayback()
        setCurrentTime(0)
        return
      }

      const currentBeat = Math.floor(time / beatDuration)
      if (currentBeat > lastBeat) {
        lastBeat = currentBeat
        playMetronome(currentBeat % 4 === 0)
      }

      setCurrentTime(time)
      playStateRef.current.rafId = requestAnimationFrame(tick)
    }

    playStateRef.current.rafId = requestAnimationFrame(tick)
  }, [initAudio, track.duration, beatDuration, playMetronome])

  const stopPlayback = useCallback(() => {
    playStateRef.current.isPlaying = false
    if (playStateRef.current.rafId) {
      cancelAnimationFrame(playStateRef.current.rafId)
      playStateRef.current.rafId = null
    }
    setIsPlaying(false)
  }, [])

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      stopPlayback()
    } else {
      await startPlayback(currentTime)
    }
  }, [isPlaying, currentTime, startPlayback, stopPlayback])

  const addNote = useCallback((time, lane) => {
    const snappedTime = snapTime(Math.max(0, Math.min(track.duration, time)))
    const newNote = {
      id: Date.now() + Math.random(),
      time: snappedTime,
      lane: lane,
      type: 'normal'
    }
    setNotes(prev => {
      const updated = [...prev, newNote].sort((a, b) => a.time - b.time)
      return updated.map((n, i) => ({ ...n, id: i }))
    })
    playNoteSound(lane)
  }, [snapTime, track.duration, playNoteSound])

  const deleteNote = useCallback((noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId).map((n, i) => ({ ...n, id: i })))
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
  }, [selectedNoteId])

  const moveNote = useCallback((noteId, newTime, newLane) => {
    const snappedTime = snapTime(Math.max(0, Math.min(track.duration, newTime)))
    const lane = Math.max(0, Math.min(LANE_COUNT - 1, newLane))
    setNotes(prev => {
      const updated = prev.map(n =>
        n.id === noteId ? { ...n, time: snappedTime, lane } : n
      ).sort((a, b) => a.time - b.time)
      return updated.map((n, i) => ({ ...n, id: i }))
    })
  }, [snapTime, track.duration])

  const handleCanvasMouseDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top + scrollTop

    const laneWidth = getLaneWidth(canvas.width)
    const trackWidth = canvas.width - PADDING_LEFT - PADDING_RIGHT

    if (x < PADDING_LEFT || x > canvas.width - PADDING_RIGHT) return
    if (y < PADDING_TOP || y > PADDING_TOP + totalPixels) return

    const relX = x - PADDING_LEFT
    const lane = Math.floor(relX / (laneWidth + LANE_GAP))

    const clickedNote = notes.find(note => {
      const noteY = timeToY(note.time)
      const noteX = getLaneX(note.lane, canvas.width)
      return Math.abs(y - noteY) < NOTE_HEIGHT * 2 && Math.abs(x - noteX) < laneWidth / 2
    })

    if (clickedNote) {
      if (e.button === 2 || e.shiftKey) {
        deleteNote(clickedNote.id)
      } else {
        setSelectedNoteId(clickedNote.id)
        dragRef.current = {
          isDragging: true,
          dragType: 'move',
          noteId: clickedNote.id,
          startY: y,
          startNote: { ...clickedNote },
          lane: clickedNote.lane
        }
      }
    } else if (e.button === 0) {
      const time = yToTime(y)
      addNote(time, lane)
    }
  }, [notes, timeToY, yToTime, getLaneX, getLaneWidth, scrollTop, totalPixels, addNote, deleteNote])

  const handleCanvasMouseMove = useCallback((e) => {
    if (!dragRef.current.isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top + scrollTop
    const x = e.clientX - rect.left

    const laneWidth = getLaneWidth(canvas.width)
    const relX = x - PADDING_LEFT
    const lane = Math.floor(relX / (laneWidth + LANE_GAP))

    const time = yToTime(y)

    if (dragRef.current.dragType === 'move') {
      moveNote(dragRef.current.noteId, time, lane)
    }
  }, [scrollTop, yToTime, getLaneWidth, moveNote])

  const handleCanvasMouseUp = useCallback(() => {
    dragRef.current.isDragging = false
    dragRef.current.dragType = null
  }, [])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(z => Math.max(0.3, Math.min(5, z * delta)))
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    let animId = null

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = (container.clientHeight + totalPixels) * dpr
      canvas.style.width = container.clientWidth + 'px'
      canvas.style.height = container.clientHeight + totalPixels + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      const laneWidth = getLaneWidth(w)

      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < LANE_COUNT; i++) {
        const x = getLaneX(i, w) - laneWidth / 2
        const laneGrad = ctx.createLinearGradient(x, 0, x + laneWidth, 0)
        laneGrad.addColorStop(0, `${keyConfig.colors[i]}05`)
        laneGrad.addColorStop(0.5, `${keyConfig.colors[i]}10`)
        laneGrad.addColorStop(1, `${keyConfig.colors[i]}05`)

        ctx.fillStyle = laneGrad
        ctx.fillRect(x, PADDING_TOP, laneWidth, totalPixels)

        ctx.strokeStyle = `${keyConfig.colors[i]}20`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, PADDING_TOP)
        ctx.lineTo(x, PADDING_TOP + totalPixels)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + laneWidth, PADDING_TOP)
        ctx.lineTo(x + laneWidth, PADDING_TOP + totalPixels)
        ctx.stroke()
      }

      const totalBeats = track.duration / beatDuration
      for (let beat = 0; beat <= totalBeats; beat++) {
        const y = PADDING_TOP + beat * pixelsPerBeat
        const isDownbeat = beat % 4 === 0

        ctx.strokeStyle = isDownbeat ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'
        ctx.lineWidth = isDownbeat ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(PADDING_LEFT, y)
        ctx.lineTo(w - PADDING_RIGHT, y)
        ctx.stroke()

        if (isDownbeat) {
          const barNum = Math.floor(beat / 4) + 1
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.font = '11px monospace'
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${barNum}`, PADDING_LEFT - 12, y)
        }
      }

      if (snapEnabled && snapValue < 0.25) {
        const snapBeats = snapValue
        for (let t = 0; t <= track.duration; t += snapBeats * beatDuration) {
          const y = timeToY(t)
          if (Math.abs((t / beatDuration) % 1) < 0.001) continue

          ctx.strokeStyle = 'rgba(255,255,255,0.03)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(PADDING_LEFT, y)
          ctx.lineTo(w - PADDING_RIGHT, y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      notes.forEach(note => {
        const noteY = timeToY(note.time)
        const noteX = getLaneX(note.lane, w)
        const color = keyConfig.colors[note.lane]
        const isSelected = note.id === selectedNoteId

        const glowGrad = ctx.createRadialGradient(noteX, noteY, 0, noteX, noteY, laneWidth * 0.6)
        glowGrad.addColorStop(0, `${color}40`)
        glowGrad.addColorStop(1, `${color}00`)
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.ellipse(noteX, noteY, laneWidth * 0.6, NOTE_HEIGHT * 2.5, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.ellipse(noteX, noteY, laneWidth * 0.4, NOTE_HEIGHT, 0, 0, Math.PI * 2)
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.ellipse(noteX, noteY, laneWidth * 0.5, NOTE_HEIGHT * 1.8, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      })

      const playheadY = timeToY(currentTime)
      if (playheadY >= PADDING_TOP && playheadY <= PADDING_TOP + totalPixels) {
        ctx.strokeStyle = '#ff3366'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(PADDING_LEFT - 10, playheadY)
        ctx.lineTo(w - PADDING_RIGHT + 10, playheadY)
        ctx.stroke()

        ctx.fillStyle = '#ff3366'
        ctx.beginPath()
        ctx.moveTo(PADDING_LEFT - 10, playheadY - 8)
        ctx.lineTo(PADDING_LEFT - 2, playheadY)
        ctx.lineTo(PADDING_LEFT - 10, playheadY + 8)
        ctx.closePath()
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [track, notes, currentTime, selectedNoteId, snapEnabled, snapValue, beatDuration, pixelsPerBeat, totalPixels, timeToY, getLaneX, getLaneWidth, keyConfig.colors])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    const savedTrack = {
      ...track,
      notes: notes.map((n, i) => ({ ...n, id: i })),
      totalNotes: notes.length
    }
    if (onSave) {
      onSave(savedTrack)
    }
  }

  const handlePlayTest = () => {
    const testTrack = {
      ...track,
      notes: notes.map((n, i) => ({ ...n, id: i })),
      totalNotes: notes.length
    }
    if (onPlay) {
      onPlay(testTrack)
    }
  }

  const handleExport = () => {
    const savedTrack = {
      ...track,
      notes: notes.map((n, i) => ({ ...n, id: i })),
      totalNotes: notes.length
    }
    const json = JSON.stringify(savedTrack, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${track.id || 'track'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result)
        if (data.notes) {
          setTrack(data)
          setNotes(data.notes.map((n, i) => ({ ...n, id: i })))
        }
      } catch (err) {
        alert('导入失败：文件格式错误')
      }
    }
    reader.readAsText(file)
  }

  const updateTrackField = (field, value) => {
    setTrack(prev => ({ ...prev, [field]: value }))
  }

  const clearAllNotes = () => {
    if (confirm('确定要清空所有音符吗？')) {
      setNotes([])
      setSelectedNoteId(null)
    }
  }

  useEffect(() => {
    if (onChange) {
      const currentTrack = {
        ...track,
        notes: notes.map((n, i) => ({ ...n, id: i })),
        totalNotes: notes.length
      }
      onChange(currentTrack)
    }
  }, [track, notes, onChange])

  useEffect(() => {
    return () => {
      if (playStateRef.current.isPlaying) {
        stopPlayback()
      }
      if (toneRef.current.synth) toneRef.current.synth.dispose()
      if (toneRef.current.kickSynth) toneRef.current.kickSynth.dispose()
      if (toneRef.current.snareSynth) toneRef.current.snareSynth.dispose()
      if (toneRef.current.hihatSynth) toneRef.current.hihatSynth.dispose()
      if (toneRef.current.masterGain) toneRef.current.masterGain.dispose()
    }
  }, [stopPlayback])

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>
          ← 返回
        </button>

        <div style={styles.titleSection}>
          <div style={styles.title}>{track.title}</div>
          <div style={styles.subtitle}>谱面编辑器</div>
        </div>

        <div style={styles.topActions}>
          <button style={styles.settingsBtn} onClick={() => setShowSettings(!showSettings)}>
            ⚙ 曲目设置
          </button>
          <button style={styles.playTestBtn} onClick={handlePlayTest}>
            🎮 试打
          </button>
          <button style={styles.saveBtn} onClick={handleSave}>
            💾 保存
          </button>
        </div>
      </div>

      {showSettings && (
        <div style={styles.settingsPanel}>
          <div style={styles.settingsGrid}>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>曲目ID</label>
              <input
                style={styles.settingInput}
                value={track.id}
                onChange={(e) => updateTrackField('id', e.target.value)}
              />
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>曲名</label>
              <input
                style={styles.settingInput}
                value={track.title}
                onChange={(e) => updateTrackField('title', e.target.value)}
              />
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>艺术家</label>
              <input
                style={styles.settingInput}
                value={track.artist}
                onChange={(e) => updateTrackField('artist', e.target.value)}
              />
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>BPM</label>
              <input
                style={styles.settingInput}
                type="number"
                value={track.bpm}
                onChange={(e) => updateTrackField('bpm', parseFloat(e.target.value) || 120)}
              />
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>时长 (秒)</label>
              <input
                style={styles.settingInput}
                type="number"
                value={track.duration}
                onChange={(e) => updateTrackField('duration', parseFloat(e.target.value) || 30)}
              />
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>难度</label>
              <select
                style={styles.settingInput}
                value={track.difficulty}
                onChange={(e) => updateTrackField('difficulty', e.target.value)}
              >
                <option value="简单">简单</option>
                <option value="普通">普通</option>
                <option value="困难">困难</option>
                <option value="专家">专家</option>
              </select>
            </div>
            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>等级</label>
              <input
                style={styles.settingInput}
                type="number"
                value={track.level}
                onChange={(e) => updateTrackField('level', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>
      )}

      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <button
            style={{ ...styles.toolBtn, ...(isPlaying ? styles.toolBtnActive : {}) }}
            onClick={togglePlayback}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <button style={styles.toolBtn} onClick={() => { stopPlayback(); setCurrentTime(0) }}>
            ⏮ 重置
          </button>
          <button style={styles.playTestToolBtn} onClick={handlePlayTest}>
            🎮 试打谱面
          </button>
        </div>

        <div style={styles.toolGroup}>
          <span style={styles.timeDisplay}>{formatTime(currentTime)}</span>
          <span style={styles.timeDivider}> / </span>
          <span style={styles.timeDisplay}>{formatTime(track.duration)}</span>
        </div>

        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>吸附:</span>
          <button
            style={{ ...styles.snapBtn, ...(snapEnabled ? styles.snapBtnActive : {}) }}
            onClick={() => setSnapEnabled(!snapEnabled)}
          >
            {snapEnabled ? '✓ 开启' : '✗ 关闭'}
          </button>
          {SNAP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              style={{
                ...styles.snapBtn,
                ...(snapValue === opt.value && snapEnabled ? styles.snapBtnActive : {})
              }}
              onClick={() => { setSnapEnabled(true); setSnapValue(opt.value) }}
              disabled={!snapEnabled}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={styles.toolGroup}>
          <span style={styles.toolLabel}>缩放:</span>
          <button style={styles.toolBtn} onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>
            −
          </button>
          <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button style={styles.toolBtn} onClick={() => setZoom(z => Math.min(5, z * 1.2))}>
            +
          </button>
        </div>

        <div style={styles.toolGroup}>
          <label style={styles.importBtn}>
            📂 导入
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
          <button style={styles.toolBtn} onClick={handleExport}>
            📤 导出
          </button>
          <button style={styles.dangerBtn} onClick={clearAllNotes}>
            🗑 清空
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={styles.editorArea}
        onWheel={handleWheel}
        onScroll={(e) => setScrollTop(e.target.scrollTop)}
      >
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={handleContextMenu}
        />
      </div>

      <div style={styles.statusBar}>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>音符数:</span>
          <span style={styles.statusValue}>{notes.length}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>BPM:</span>
          <span style={styles.statusValue}>{track.bpm}</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>节拍间隔:</span>
          <span style={styles.statusValue}>{beatDuration.toFixed(3)}s</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>当前时间:</span>
          <span style={styles.statusValue}>{formatTime(currentTime)}</span>
        </div>
        <div style={styles.statusHint}>
          💡 左键添加音符 · 拖拽移动 · Shift+左键/右键删除 · Ctrl+滚轮缩放
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    color: '#fff',
    overflow: 'hidden'
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'rgba(10, 10, 20, 0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    zIndex: 10
  },
  backBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  titleSection: {
    textAlign: 'center'
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '2px',
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '3px',
    marginTop: '2px'
  },
  topActions: {
    display: 'flex',
    gap: '10px'
  },
  settingsBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  playTestBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,200,180,0.2))',
    border: '1px solid rgba(0,255,204,0.4)',
    color: '#00ffcc',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  saveBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #ff3366 0%, #cc2255 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  settingsPanel: {
    padding: '16px 24px',
    background: 'rgba(15, 15, 30, 0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  settingLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500
  },
  settingInput: {
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '12px 24px',
    background: 'rgba(10, 10, 20, 0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap'
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  toolBtn: {
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.15s'
  },
  toolBtnActive: {
    background: 'rgba(255, 51, 102, 0.2)',
    borderColor: 'rgba(255, 51, 102, 0.5)',
    color: '#ff3366'
  },
  snapBtn: {
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.15s'
  },
  snapBtnActive: {
    background: 'rgba(0, 255, 204, 0.15)',
    borderColor: 'rgba(0, 255, 204, 0.4)',
    color: '#00ffcc'
  },
  toolLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginRight: '4px'
  },
  timeDisplay: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#00ffcc',
    fontWeight: 600
  },
  timeDivider: {
    color: 'rgba(255,255,255,0.2)'
  },
  zoomLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    minWidth: '48px',
    textAlign: 'center'
  },
  importBtn: {
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500
  },
  playTestToolBtn: {
    padding: '8px 14px',
    background: 'rgba(0, 255, 204, 0.15)',
    border: '1px solid rgba(0, 255, 204, 0.4)',
    color: '#00ffcc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.15s'
  },
  dangerBtn: {
    padding: '8px 14px',
    background: 'rgba(255, 51, 102, 0.1)',
    border: '1px solid rgba(255, 51, 102, 0.3)',
    color: '#ff3366',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500
  },
  editorArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative'
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair'
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '10px 24px',
    background: 'rgba(10, 10, 20, 0.95)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    fontSize: '12px'
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.4)'
  },
  statusValue: {
    color: '#fff',
    fontWeight: 600,
    fontFamily: 'monospace'
  },
  statusHint: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic'
  }
}
