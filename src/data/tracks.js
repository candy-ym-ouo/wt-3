export const defaultKeyConfig = {
  lanes: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  labels: ['D', 'F', 'J', 'K'],
  colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const DIFFICULTIES = {
  EASY: { id: 'easy', name: '简单', color: '#66ff99', levelRange: [1, 5] },
  NORMAL: { id: 'normal', name: '普通', color: '#ffcc00', levelRange: [6, 10] },
  HARD: { id: 'hard', name: '困难', color: '#ff6666', levelRange: [11, 15] },
  EXPERT: { id: 'expert', name: '专家', color: '#cc66ff', levelRange: [16, 20] }
}

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

function generateEasyVariant(baseData, noteReduction = 2) {
  const filteredNotes = baseData.gameNotes.filter((_, i) => i % noteReduction === 0)
  filteredNotes.sort((a, b) => a.time - b.time)
  filteredNotes.forEach((n, i) => { n.id = i })
  return { ...baseData, gameNotes: filteredNotes }
}

function generateHardVariant(baseData, extraNoteFactor = 1.5) {
  const extraNotes = []
  const beat = 60 / baseData.bpm
  baseData.gameNotes.forEach(note => {
    if (Math.random() < 0.4) {
      extraNotes.push({
        id: 0,
        time: note.time + beat * 0.125,
        lane: (note.lane + 1) % 4,
        type: 'normal'
      })
    }
  })
  const allNotes = [...baseData.gameNotes, ...extraNotes]
  allNotes.sort((a, b) => a.time - b.time)
  allNotes.forEach((n, i) => { n.id = i })
  return { ...baseData, gameNotes: allNotes }
}

const track1Data = generateTrack1()
const track2Data = generateTrack2()
const track1Easy = generateEasyVariant(track1Data, 3)
const track1Hard = generateHardVariant(track1Data, 1.8)
const track2Easy = generateEasyVariant(track2Data, 4)
const track2Hard = generateHardVariant(track2Data, 2)

export const TRACK_PACKS = [
  {
    id: 'starter',
    name: '新手启程',
    description: '适合新手的入门曲包，包含基础节奏练习曲目',
    icon: '🌟',
    color: '#66ff99',
    order: 1,
    unlockCondition: { type: 'none' },
    trackIds: ['nebula', 'crystal_dream']
  },
  {
    id: 'electronic',
    name: '电子脉冲',
    description: '充满电子能量的曲目，挑战你的节奏感',
    icon: '⚡',
    color: '#6699ff',
    order: 2,
    unlockCondition: { type: 'level', minLevel: 3 },
    trackIds: ['void', 'neon_runner']
  },
  {
    id: 'cosmic',
    name: '星际漫游',
    description: '来自宇宙深处的旋律，沉浸式音乐体验',
    icon: '🌌',
    color: '#cc66ff',
    order: 3,
    unlockCondition: { type: 'trackClear', trackId: 'void', difficulty: 'normal' },
    trackIds: ['nebula', 'void', 'cosmic_dust']
  },
  {
    id: 'master',
    name: '大师殿堂',
    description: '高手专属，极限挑战等待着你',
    icon: '👑',
    color: '#ffcc00',
    order: 4,
    unlockCondition: { type: 'clearedCount', count: 5 },
    trackIds: ['void', 'neon_runner']
  }
]

export const TRACKS = [
  {
    id: 'nebula',
    title: '星云脉冲',
    artist: 'Sonic Drift',
    genre: '电子 / 合成器',
    bpm: track1Data.bpm,
    duration: track1Data.duration,
    synth: {
      leadOsc: 'sawtooth',
      bassOsc: 'sine',
      padOsc: 'triangle',
      root: 'C4'
    },
    preview: {
      coverGradient: ['#ff3366', '#6633ff'],
      description: '穿越星云的脉冲之旅，感受宇宙的节奏律动',
      tags: ['合成器', '太空', '入门'],
      lyrics: null,
      story: '在遥远的星云深处，古老的脉冲信号穿越光年，唤醒沉睡的节奏之魂...'
    },
    difficulties: [
      {
        id: 'easy',
        name: '简单',
        level: 3,
        color: '#66ff99',
        notes: track1Easy.gameNotes,
        songData: {
          lead: track1Easy.lead,
          bass: track1Easy.bass,
          chords: track1Easy.chords,
          drums: track1Easy.drums
        },
        totalNotes: track1Easy.gameNotes.length
      },
      {
        id: 'normal',
        name: '普通',
        level: 6,
        color: '#ffcc00',
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
        id: 'hard',
        name: '困难',
        level: 11,
        color: '#ff6666',
        notes: track1Hard.gameNotes,
        songData: {
          lead: track1Hard.lead,
          bass: track1Hard.bass,
          chords: track1Hard.chords,
          drums: track1Hard.drums
        },
        totalNotes: track1Hard.gameNotes.length
      }
    ],
    packIds: ['starter', 'cosmic'],
    unlockCondition: { type: 'none' },
    createdAt: '2024-01-15'
  },
  {
    id: 'void',
    title: '虚空回响',
    artist: 'Neon Abyss',
    genre: '电子 / Dubstep',
    bpm: track2Data.bpm,
    duration: track2Data.duration,
    synth: {
      leadOsc: 'square',
      bassOsc: 'sawtooth',
      padOsc: 'sine',
      root: 'G4'
    },
    preview: {
      coverGradient: ['#00ffcc', '#ff3366'],
      description: '来自虚空深处的回响，重低音轰炸你的感官',
      tags: ['Dubstep', '重低音', '挑战'],
      lyrics: null,
      story: '在虚空中，一切声音都化为回响。只有最强的节奏才能穿越这片寂静...'
    },
    difficulties: [
      {
        id: 'easy',
        name: '简单',
        level: 5,
        color: '#66ff99',
        notes: track2Easy.gameNotes,
        songData: {
          lead: track2Easy.lead,
          bass: track2Easy.bass,
          chords: track2Easy.chords,
          drums: track2Easy.drums
        },
        totalNotes: track2Easy.gameNotes.length
      },
      {
        id: 'normal',
        name: '普通',
        level: 9,
        color: '#ffcc00',
        notes: track2Data.gameNotes,
        songData: {
          lead: track2Data.lead,
          bass: track2Data.bass,
          chords: track2Data.chords,
          drums: track2Data.drums
        },
        totalNotes: track2Data.gameNotes.length
      },
      {
        id: 'hard',
        name: '困难',
        level: 14,
        color: '#ff6666',
        notes: track2Hard.gameNotes,
        songData: {
          lead: track2Hard.lead,
          bass: track2Hard.bass,
          chords: track2Hard.chords,
          drums: track2Hard.drums
        },
        totalNotes: track2Hard.gameNotes.length
      },
      {
        id: 'expert',
        name: '专家',
        level: 18,
        color: '#cc66ff',
        notes: track2Hard.gameNotes,
        songData: {
          lead: track2Hard.lead,
          bass: track2Hard.bass,
          chords: track2Hard.chords,
          drums: track2Hard.drums
        },
        totalNotes: Math.floor(track2Hard.gameNotes.length * 1.3)
      }
    ],
    packIds: ['electronic', 'cosmic', 'master'],
    unlockCondition: { type: 'level', minLevel: 2 },
    createdAt: '2024-02-20'
  },
  {
    id: 'crystal_dream',
    title: '水晶梦境',
    artist: 'Aurora Bell',
    genre: '氛围 / 钢琴',
    bpm: 96,
    duration: 180,
    synth: {
      leadOsc: 'triangle',
      bassOsc: 'sine',
      padOsc: 'sine',
      root: 'C4'
    },
    preview: {
      coverGradient: ['#66ccff', '#cc99ff'],
      description: '在水晶般透明的梦境中，旋律如水般流淌',
      tags: ['氛围', '治愈', '慢速'],
      lyrics: null,
      story: '沉睡时进入的水晶世界，每一个音符都折射出七彩光芒...'
    },
    difficulties: [
      {
        id: 'easy',
        name: '简单',
        level: 1,
        color: '#66ff99',
        notes: track1Easy.gameNotes.slice(0, 60),
        songData: {
          lead: track1Easy.lead,
          bass: track1Easy.bass,
          chords: track1Easy.chords,
          drums: track1Easy.drums
        },
        totalNotes: 60
      },
      {
        id: 'normal',
        name: '普通',
        level: 4,
        color: '#ffcc00',
        notes: track1Easy.gameNotes.slice(0, 100),
        songData: {
          lead: track1Data.lead,
          bass: track1Data.bass,
          chords: track1Data.chords,
          drums: track1Data.drums
        },
        totalNotes: 100
      }
    ],
    packIds: ['starter'],
    unlockCondition: { type: 'none' },
    createdAt: '2024-03-10'
  },
  {
    id: 'neon_runner',
    title: '霓虹狂奔',
    artist: 'Cyber Wave',
    genre: '赛博朋克 / 电子',
    bpm: 175,
    duration: 150,
    synth: {
      leadOsc: 'sawtooth',
      bassOsc: 'square',
      padOsc: 'sawtooth',
      root: 'A4'
    },
    preview: {
      coverGradient: ['#ff0066', '#00ffff'],
      description: '霓虹都市的深夜狂奔，肾上腺素飙升的极速体验',
      tags: ['赛博朋克', '高速', '高难度'],
      lyrics: null,
      story: '2077年的霓虹都市，你是最后的奔跑者。在雨幕与光影间穿梭...'
    },
    difficulties: [
      {
        id: 'normal',
        name: '普通',
        level: 8,
        color: '#ffcc00',
        notes: track2Data.gameNotes,
        songData: {
          lead: track2Data.lead,
          bass: track2Data.bass,
          chords: track2Data.chords,
          drums: track2Data.drums
        },
        totalNotes: track2Data.gameNotes.length
      },
      {
        id: 'hard',
        name: '困难',
        level: 13,
        color: '#ff6666',
        notes: track2Hard.gameNotes,
        songData: {
          lead: track2Hard.lead,
          bass: track2Hard.bass,
          chords: track2Hard.chords,
          drums: track2Hard.drums
        },
        totalNotes: track2Hard.gameNotes.length
      },
      {
        id: 'expert',
        name: '专家',
        level: 17,
        color: '#cc66ff',
        notes: track2Hard.gameNotes,
        songData: {
          lead: track2Hard.lead,
          bass: track2Hard.bass,
          chords: track2Hard.chords,
          drums: track2Hard.drums
        },
        totalNotes: Math.floor(track2Hard.gameNotes.length * 1.4)
      }
    ],
    packIds: ['electronic', 'master'],
    unlockCondition: { type: 'trackClear', trackId: 'nebula', difficulty: 'normal' },
    createdAt: '2024-04-05'
  },
  {
    id: 'cosmic_dust',
    title: '宇宙尘埃',
    artist: 'Stellar Echo',
    genre: '氛围 / 电子',
    bpm: 110,
    duration: 200,
    synth: {
      leadOsc: 'sine',
      bassOsc: 'triangle',
      padOsc: 'triangle',
      root: 'F4'
    },
    preview: {
      coverGradient: ['#9966ff', '#ff66cc'],
      description: '漂浮在宇宙尘埃中，感受时间与空间的交织',
      tags: ['宇宙', '氛围', '中速'],
      lyrics: null,
      story: '每一粒尘埃都是一个星系的过去。在浩瀚中，你听到了什么？'
    },
    difficulties: [
      {
        id: 'easy',
        name: '简单',
        level: 2,
        color: '#66ff99',
        notes: track1Easy.gameNotes.slice(0, 80),
        songData: {
          lead: track1Easy.lead,
          bass: track1Easy.bass,
          chords: track1Easy.chords,
          drums: track1Easy.drums
        },
        totalNotes: 80
      },
      {
        id: 'normal',
        name: '普通',
        level: 7,
        color: '#ffcc00',
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
        id: 'hard',
        name: '困难',
        level: 12,
        color: '#ff6666',
        notes: track1Hard.gameNotes,
        songData: {
          lead: track1Hard.lead,
          bass: track1Hard.bass,
          chords: track1Hard.chords,
          drums: track1Hard.drums
        },
        totalNotes: track1Hard.gameNotes.length
      }
    ],
    packIds: ['cosmic'],
    unlockCondition: { type: 'trackClear', trackId: 'nebula', difficulty: 'normal' },
    createdAt: '2024-05-18'
  }
]

export const getTrackById = (id) => TRACKS.find(t => t.id === id)
export const getPackById = (id) => TRACK_PACKS.find(p => p.id === id)

export const getTracksByPack = (packId) => {
  const pack = getPackById(packId)
  if (!pack) return []
  return pack.trackIds.map(id => getTrackById(id)).filter(Boolean)
}

export const getTrackWithDifficulty = (trackId, difficultyId) => {
  const track = getTrackById(trackId)
  if (!track) return null
  const diff = track.difficulties.find(d => d.id === difficultyId)
  if (!diff) return null
  return {
    ...track,
    difficulty: diff.name,
    level: diff.level,
    notes: diff.notes,
    songData: diff.songData,
    totalNotes: diff.totalNotes,
    difficultyId: diff.id,
    difficultyColor: diff.color
  }
}

const getDifficultyName = (diffId) => {
  return DIFFICULTIES[diffId?.toUpperCase()]?.name || diffId
}

const getDifficultyId = (diffName) => {
  const entry = Object.values(DIFFICULTIES).find(d => d.name === diffName)
  return entry?.id || diffName
}

const findBestRecord = (trackId, difficulty, bestRecords) => {
  const diffName = getDifficultyName(difficulty)
  const diffId = getDifficultyId(difficulty)
  const keyWithName = `${trackId}_${diffName}`
  const keyWithId = `${trackId}_${diffId}`

  if (bestRecords[keyWithName]?.cleared) {
    return bestRecords[keyWithName]
  }
  if (bestRecords[keyWithId]?.cleared) {
    return bestRecords[keyWithId]
  }
  return null
}

const getClearedTrackCount = (bestRecords) => {
  const clearedTracks = new Set()
  Object.values(bestRecords).forEach(record => {
    if (record.cleared && record.trackId) {
      clearedTracks.add(record.trackId)
    }
  })
  return clearedTracks.size
}

export const checkUnlockCondition = (condition, playerData, bestRecords = {}) => {
  if (!condition || condition.type === 'none') return { unlocked: true, reason: null }

  switch (condition.type) {
    case 'level':
      if (playerData.level >= condition.minLevel) {
        return { unlocked: true, reason: null }
      }
      return { unlocked: false, reason: `需要等级 Lv.${condition.minLevel}` }

    case 'trackClear': {
      const difficulty = condition.difficulty || 'normal'
      const record = findBestRecord(condition.trackId, difficulty, bestRecords)
      if (record) {
        return { unlocked: true, reason: null }
      }
      const trackName = getTrackById(condition.trackId)?.title || condition.trackId
      const diffName = getDifficultyName(difficulty)
      return { unlocked: false, reason: `需要通关「${trackName}」(${diffName})` }
    }

    case 'clearedCount': {
      const clearedCount = getClearedTrackCount(bestRecords)
      if (clearedCount >= condition.count) {
        return { unlocked: true, reason: null }
      }
      return { unlocked: false, reason: `需要通关 ${condition.count} 首曲目 (${clearedCount}/${condition.count})` }
    }

    default:
      return { unlocked: true, reason: null }
  }
}

export const tracks = TRACKS.map(t => {
  const normalDiff = t.difficulties.find(d => d.id === 'normal') || t.difficulties[0]
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    bpm: t.bpm,
    difficulty: normalDiff.name,
    level: normalDiff.level,
    duration: t.duration,
    synth: t.synth,
    notes: normalDiff.notes,
    songData: normalDiff.songData,
    totalNotes: normalDiff.totalNotes,
    genre: t.genre,
    preview: t.preview,
    difficulties: t.difficulties,
    packIds: t.packIds,
    unlockCondition: t.unlockCondition
  }
})
