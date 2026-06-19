export const defaultKeyConfig = {
  lanes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  labels: ['D', 'F', 'J', 'K'],
  colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function semitonesFromRoot(root, semitones) {
  const rootIndex = NOTE_NAMES.indexOf(root.replace(/[0-9]/g, ''))
  const rootOctave = parseInt(root.match(/[0-9]/g)?.join('') || '4')
  const totalSemitones = rootIndex + semitones
  const newOctave = rootOctave + Math.floor(totalSemitones / 12)
  const newNoteIndex = ((totalSemitones % 12) + 12) % 12
  return NOTE_NAMES[newNoteIndex] + newOctave
}

function generateTrack1() {
  const bpm = 128
  const beat = 60 / bpm
  const bar = beat * 4
  const totalBars = 16
  const totalDuration = totalBars * bar

  const scale = [0, 3, 5, 7, 10, 12, 15, 17]
  const root = 'C4'

  const lead = []
  const bass = []
  const chords = []
  const drums = []
  const gameNotes = []
  let noteId = 0

  for (let barIdx = 0; barIdx < totalBars; barIdx++) {
    const barStart = barIdx * bar
    const chordRoot = scale[(barIdx * 2) % scale.length]
    const chordNotes = [chordRoot, chordRoot + 3, chordRoot + 7, chordRoot + 10]

    chordNotes.forEach((semitone, i) => {
      chords.push({
        time: barStart,
        duration: bar * 0.95,
        note: semitonesFromRoot(root, semitone - 12),
        velocity: 0.25 + i * 0.05
      })
    })

    bass.push({
      time: barStart,
      duration: bar * 0.8,
      note: semitonesFromRoot(root, chordRoot - 24),
      velocity: 0.6
    })
    bass.push({
      time: barStart + beat * 2,
      duration: bar * 0.5,
      note: semitonesFromRoot(root, chordRoot - 24 + 7),
      velocity: 0.4
    })

    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const t = barStart + beatIdx * beat
      drums.push({ time: t, type: beatIdx % 2 === 0 ? 'kick' : 'snare', velocity: 0.7 })
      drums.push({ time: t + beat * 0.5, type: 'hihat', velocity: 0.3 })
    }

    const notesInBar = [
      { offset: 0, degree: 0 },
      { offset: 0.5, degree: 2 },
      { offset: 1, degree: 4 },
      { offset: 1.5, degree: 3 },
      { offset: 2, degree: 5 },
      { offset: 2.5, degree: 4 },
      { offset: 3, degree: 2 },
      { offset: 3.5, degree: 1 }
    ]

    notesInBar.forEach((n, i) => {
      const t = barStart + n.offset * beat
      const degree = (n.degree + barIdx) % scale.length
      const octave = barIdx > 8 ? 0 : 0
      lead.push({
        time: t,
        duration: beat * 0.45,
        note: semitonesFromRoot(root, scale[degree] + octave * 12),
        velocity: 0.35 + Math.random() * 0.15
      })

      if (i % 2 === 0) {
        const lane = Math.floor((degree * 4) / scale.length) % 4
        gameNotes.push({
          id: noteId++,
          time: t,
          lane: lane,
          type: 'normal'
        })
      }
    })

    if (barIdx >= 4 && barIdx % 2 === 0) {
      for (let i = 0; i < 4; i++) {
        const t = barStart + beat * 3.5 + i * (beat / 8)
        const lane = i % 4
        gameNotes.push({
          id: noteId++,
          time: t,
          lane: lane,
          type: 'normal'
        })
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    const t = totalDuration - bar * 2 + i * (beat / 4)
    gameNotes.push({
      id: noteId++,
      time: t,
      lane: i % 4,
      type: 'normal'
    })
    gameNotes.push({
      id: noteId++,
      time: t,
      lane: 3 - (i % 4),
      type: 'normal'
    })
  }

  gameNotes.sort((a, b) => a.time - b.time)
  gameNotes.forEach((n, i) => { n.id = i })

  return {
    bpm,
    duration: totalDuration,
    totalBars,
    lead,
    bass,
    chords,
    drums,
    gameNotes
  }
}

function generateTrack2() {
  const bpm = 150
  const beat = 60 / bpm
  const bar = beat * 4
  const totalBars = 20
  const totalDuration = totalBars * bar

  const scale = [0, 2, 4, 5, 7, 9, 11, 12]
  const root = 'G4'

  const lead = []
  const bass = []
  const chords = []
  const drums = []
  const gameNotes = []
  let noteId = 0

  for (let barIdx = 0; barIdx < totalBars; barIdx++) {
    const barStart = barIdx * bar
    const chordProg = [0, 5, 7, 3]
    const chordRoot = scale[chordProg[barIdx % 4]]
    const chordNotes = [chordRoot, chordRoot + 4, chordRoot + 7, chordRoot + 11]

    chordNotes.forEach((semitone, i) => {
      chords.push({
        time: barStart,
        duration: bar * 0.95,
        note: semitonesFromRoot(root, semitone - 12),
        velocity: 0.2 + i * 0.04
      })
    })

    const bassPattern = [0, 7, 0, 5]
    for (let i = 0; i < 4; i++) {
      bass.push({
        time: barStart + i * beat,
        duration: beat * 0.7,
        note: semitonesFromRoot(root, chordRoot + bassPattern[i] - 24),
        velocity: 0.5
      })
    }

    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const t = barStart + beatIdx * beat
      drums.push({ time: t, type: beatIdx % 2 === 0 ? 'kick' : 'snare', velocity: 0.8 })
      drums.push({ time: t + beat * 0.25, type: 'hihat', velocity: 0.25 })
      drums.push({ time: t + beat * 0.5, type: 'hihat', velocity: 0.35 })
      drums.push({ time: t + beat * 0.75, type: 'hihat', velocity: 0.25 })
    }

    const notesInBar = [
      { offset: 0, degree: 0, lane: 0 },
      { offset: 0.25, degree: 2, lane: 1 },
      { offset: 0.5, degree: 4, lane: 2 },
      { offset: 0.75, degree: 5, lane: 3 },
      { offset: 1, degree: 7, lane: 3 },
      { offset: 1.25, degree: 5, lane: 2 },
      { offset: 1.5, degree: 4, lane: 1 },
      { offset: 1.75, degree: 2, lane: 0 },
      { offset: 2, degree: 0, lane: 0 },
      { offset: 2.25, degree: 4, lane: 2 },
      { offset: 2.5, degree: 7, lane: 3 },
      { offset: 2.75, degree: 9, lane: 3 },
      { offset: 3, degree: 11, lane: 2 },
      { offset: 3.25, degree: 9, lane: 1 },
      { offset: 3.5, degree: 7, lane: 0 },
      { offset: 3.75, degree: 5, lane: 1 }
    ]

    notesInBar.forEach((n, i) => {
      const t = barStart + n.offset * beat
      const degree = (n.degree + Math.floor(barIdx / 2)) % scale.length
      lead.push({
        time: t,
        duration: beat * 0.22,
        note: semitonesFromRoot(root, scale[degree]),
        velocity: 0.3 + Math.random() * 0.2
      })

      if (barIdx < 4) {
        if (i % 4 === 0) {
          gameNotes.push({
            id: noteId++,
            time: t,
            lane: n.lane,
            type: 'normal'
          })
        }
      } else if (barIdx < 10) {
        if (i % 2 === 0) {
          gameNotes.push({
            id: noteId++,
            time: t,
            lane: n.lane,
            type: 'normal'
          })
        }
      } else {
        gameNotes.push({
          id: noteId++,
          time: t,
          lane: n.lane,
          type: 'normal'
        })
      }
    })

    if (barIdx >= 12 && barIdx % 4 === 3) {
      for (let i = 0; i < 8; i++) {
        const t = barStart + beat * 3.5 + i * (beat / 16)
        gameNotes.push({
          id: noteId++,
          time: t,
          lane: i % 4,
          type: 'normal'
        })
      }
    }
  }

  for (let i = 0; i < 16; i++) {
    const t = totalDuration - bar * 2 + i * (beat / 8)
    gameNotes.push({
      id: noteId++,
      time: t,
      lane: i % 4,
      type: 'normal'
    })
    gameNotes.push({
      id: noteId++,
      time: t,
      lane: 3 - (i % 4),
      type: 'normal'
    })
  }

  gameNotes.sort((a, b) => a.time - b.time)
  gameNotes.forEach((n, i) => { n.id = i })

  return {
    bpm,
    duration: totalDuration,
    totalBars,
    lead,
    bass,
    chords,
    drums,
    gameNotes
  }
}

const track1Data = generateTrack1()
const track2Data = generateTrack2()

export const tracks = [
  {
    id: 'nebula',
    title: '星云脉冲',
    artist: 'Sonic Drift',
    bpm: track1Data.bpm,
    difficulty: '普通',
    level: 6,
    duration: track1Data.duration,
    synth: {
      leadOsc: 'sawtooth',
      bassOsc: 'sine',
      padOsc: 'triangle',
      root: 'C4'
    },
    notes: track1Data.gameNotes,
    songData: {
      lead: track1Data.lead,
      bass: track1Data.bass,
      chords: track1Data.chords,
      drums: track1Data.drums
    },
    totalNotes: track1Data.gameNotes.length
  },
  {
    id: 'void',
    title: '虚空回响',
    artist: 'Neon Abyss',
    bpm: track2Data.bpm,
    difficulty: '困难',
    level: 9,
    duration: track2Data.duration,
    synth: {
      leadOsc: 'square',
      bassOsc: 'sawtooth',
      padOsc: 'sine',
      root: 'G4'
    },
    notes: track2Data.gameNotes,
    songData: {
      lead: track2Data.lead,
      bass: track2Data.bass,
      chords: track2Data.chords,
      drums: track2Data.drums
    },
    totalNotes: track2Data.gameNotes.length
  }
]
