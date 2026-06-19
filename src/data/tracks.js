export const defaultKeyConfig = {
  lanes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  labels: ['D', 'F', 'J', 'K'],
  colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
}

const generatePatternA = (bpm) => {
  const beat = 60 / bpm
  const notes = []
  const totalBeats = 64
  let noteId = 0

  for (let i = 0; i < totalBeats; i++) {
    const t = i * beat
    const lane = i % 4
    notes.push({ id: noteId++, time: t, lane: lane, type: 'normal' })

    if (i % 4 === 2) {
      notes.push({ id: noteId++, time: t + beat / 2, lane: (lane + 2) % 4, type: 'normal' })
    }

    if (i > 8 && i % 8 === 7) {
      notes.push({ id: noteId++, time: t + beat, lane: 0, type: 'normal' })
      notes.push({ id: noteId++, time: t + beat, lane: 3, type: 'normal' })
    }
  }

  return notes
}

const generatePatternB = (bpm) => {
  const beat = 60 / bpm
  const notes = []
  const totalBeats = 80
  let noteId = 0

  for (let i = 0; i < totalBeats; i++) {
    const t = i * beat
    const pattern = i % 8

    if (pattern === 0 || pattern === 4) {
      notes.push({ id: noteId++, time: t, lane: 0, type: 'normal' })
      notes.push({ id: noteId++, time: t, lane: 3, type: 'normal' })
    } else if (pattern === 1 || pattern === 5) {
      notes.push({ id: noteId++, time: t, lane: 1, type: 'normal' })
    } else if (pattern === 2 || pattern === 6) {
      notes.push({ id: noteId++, time: t, lane: 2, type: 'normal' })
    } else {
      notes.push({ id: noteId++, time: t + beat / 4, lane: 0, type: 'normal' })
      notes.push({ id: noteId++, time: t + beat / 2, lane: 1, type: 'normal' })
      notes.push({ id: noteId++, time: t + beat * 0.75, lane: 2, type: 'normal' })
      notes.push({ id: noteId++, time: t + beat, lane: 3, type: 'normal' })
    }

    if (i > 16 && i % 16 === 15) {
      for (let j = 0; j < 4; j++) {
        notes.push({ id: noteId++, time: t + beat + j * beat / 8, lane: j, type: 'normal' })
        notes.push({ id: noteId++, time: t + beat + j * beat / 8, lane: 3 - j, type: 'normal' })
      }
    }
  }

  return notes
}

export const tracks = [
  {
    id: 'nebula',
    title: '星云脉冲',
    artist: 'Sonic Drift',
    bpm: 128,
    difficulty: '普通',
    level: 6,
    duration: 32,
    previewNotes: [0, 128, 256, 384, 512, 640, 768, 896],
    synth: {
      type: 'pad',
      root: 'C4',
      scale: [0, 3, 5, 7, 10, 12, 15, 17],
      bass: 'C2'
    },
    notes: generatePatternA(128)
  },
  {
    id: 'void',
    title: '虚空回响',
    artist: 'Neon Abyss',
    bpm: 150,
    difficulty: '困难',
    level: 9,
    duration: 40,
    previewNotes: [0, 150, 300, 450, 600, 750, 900, 1050],
    synth: {
      type: 'lead',
      root: 'G4',
      scale: [0, 2, 4, 5, 7, 9, 11, 12],
      bass: 'G2'
    },
    notes: generatePatternB(150)
  }
]
