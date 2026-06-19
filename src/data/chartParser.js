import { DIFFICULTIES } from './tracks.js'

export const SUPPORTED_FORMATS = [
  { id: 'json', name: 'JSON谱面', extension: '.json', description: '原生谱面格式，完整支持所有特性' },
  { id: 'simple', name: '简易文本格式', extension: '.txt', description: '纯文本格式，适合快速编写' },
  { id: 'stepmania', name: 'StepMania格式', extension: '.sm', description: 'StepMania .sm 格式导入' }
]

export class ChartParseError extends Error {
  constructor(message, { line, column, field, value } = {}) {
    super(message)
    this.name = 'ChartParseError'
    this.line = line
    this.column = column
    this.field = field
    this.value = value
  }
}

function generateId(title) {
  const clean = (title || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `custom_${clean}_${Date.now().toString(36)}`
}

function generateDefaultSongData(track) {
  const bpm = track.bpm || 120
  const beat = 60 / bpm
  const totalBars = Math.ceil((track.duration || 60) / (beat * 4))
  const lead = []
  const bass = []
  const chords = []
  const drums = []
  const scale = [0, 3, 5, 7, 10, 12]
  const root = track.synth?.root || 'C4'

  for (let barIdx = 0; barIdx < totalBars; barIdx++) {
    const barStart = barIdx * beat * 4
    const chordRoot = scale[barIdx % scale.length]

    chords.push({
      time: barStart,
      duration: beat * 3.8,
      note: transposeNote(root, chordRoot - 12),
      velocity: 0.2
    })

    bass.push({
      time: barStart,
      duration: beat * 0.8,
      note: transposeNote(root, chordRoot - 24),
      velocity: 0.5
    })
    bass.push({
      time: barStart + beat * 2,
      duration: beat * 0.6,
      note: transposeNote(root, chordRoot - 24 + 7),
      velocity: 0.35
    })

    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const t = barStart + beatIdx * beat
      drums.push({ time: t, type: beatIdx % 2 === 0 ? 'kick' : 'snare', velocity: 0.6 })
      drums.push({ time: t + beat * 0.5, type: 'hihat', velocity: 0.25 })
    }

    const barNotes = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
    barNotes.forEach((offset, i) => {
      lead.push({
        time: barStart + offset * beat,
        duration: beat * 0.4,
        note: transposeNote(root, scale[(i + barIdx) % scale.length]),
        velocity: 0.3
      })
    })
  }

  return { lead, bass, chords, drums }
}

function transposeNote(note, semitones) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const match = note.match(/^([A-G]#?)(\d)$/)
  if (!match) return note
  const [, name, octStr] = match
  const octave = parseInt(octStr)
  const idx = names.indexOf(name)
  const newIdx = ((idx + semitones) % 12 + 12) % 12
  const newOct = octave + Math.floor((idx + semitones) / 12)
  return names[newIdx] + newOct
}

function normalizeNotes(notes, duration, bpm) {
  if (!Array.isArray(notes)) return []
  const beat = 60 / (bpm || 120)

  const normalized = notes.map((n, i) => {
    if (typeof n === 'object' && n !== null) {
      return {
        id: i,
        time: typeof n.time === 'number' ? n.time : (typeof n.beat === 'number' ? n.beat * beat : 0),
        lane: typeof n.lane === 'number' ? Math.max(0, Math.min(3, n.lane)) : 0,
        type: n.type || 'normal'
      }
    }
    if (typeof n === 'string') {
      const parts = n.split(/[,|:]/).map(p => p.trim())
      if (parts.length >= 2) {
        const time = parseFloat(parts[0])
        const lane = parseInt(parts[1])
        if (!isNaN(time) && !isNaN(lane)) {
          return { id: i, time, lane: Math.max(0, Math.min(3, lane)), type: parts[2] || 'normal' }
        }
      }
    }
    return null
  }).filter(Boolean)

  normalized.sort((a, b) => a.time - b.time)
  normalized.forEach((n, i) => { n.id = i })
  return normalized
}

export function parseJSONChart(rawContent) {
  let data
  try {
    data = JSON.parse(rawContent)
  } catch (e) {
    throw new ChartParseError(`JSON解析失败: ${e.message}`, { field: 'root' })
  }

  if (!data || typeof data !== 'object') {
    throw new ChartParseError('谱面数据必须是对象', { field: 'root' })
  }

  const title = data.title || data.name || '未命名曲目'
  const artist = data.artist || data.author || '未知艺术家'
  const bpm = data.bpm || 120
  const duration = data.duration || data.length || 60
  const genre = data.genre || '自定义'

  const id = data.id || generateId(title)

  const synth = {
    leadOsc: data.synth?.leadOsc || 'sawtooth',
    bassOsc: data.synth?.bassOsc || 'sine',
    padOsc: data.synth?.padOsc || 'triangle',
    root: data.synth?.root || 'C4'
  }

  const preview = {
    coverGradient: data.preview?.coverGradient || ['#ff3366', '#6633ff'],
    description: data.preview?.description || data.description || '',
    tags: data.preview?.tags || data.tags || [],
    lyrics: data.preview?.lyrics || data.lyrics || null,
    story: data.preview?.story || ''
  }

  let difficulties = []
  if (Array.isArray(data.difficulties) && data.difficulties.length > 0) {
    difficulties = data.difficulties.map((d, i) => {
      const diffMeta = Object.values(DIFFICULTIES)[i] || DIFFICULTIES.NORMAL
      const notes = normalizeNotes(d.notes || d.chart || [], duration, bpm)
      const songData = d.songData || generateDefaultSongData({ bpm, duration, synth })
      return {
        id: d.id || diffMeta.id,
        name: d.name || diffMeta.name,
        level: d.level || diffMeta.levelRange[0],
        color: d.color || diffMeta.color,
        notes,
        songData,
        totalNotes: notes.length
      }
    })
  } else if (data.notes || data.chart) {
    const notes = normalizeNotes(data.notes || data.chart, duration, bpm)
    const songData = data.songData || generateDefaultSongData({ bpm, duration, synth })
    difficulties.push({
      id: 'normal',
      name: '普通',
      level: data.level || 6,
      color: '#ffcc00',
      notes,
      songData,
      totalNotes: notes.length
    })
  }

  return {
    id,
    title,
    artist,
    genre,
    bpm,
    duration,
    synth,
    preview,
    difficulties,
    packIds: ['custom'],
    unlockCondition: { type: 'none' },
    createdAt: new Date().toISOString().split('T')[0],
    isCustom: true
  }
}

export function parseSimpleChart(rawContent) {
  const lines = rawContent.split(/\r?\n/).map(l => l.trim())
  const metadata = {}
  const noteLines = []
  let inNotes = false
  let lineNum = 0

  for (const line of lines) {
    lineNum++
    if (!line || line.startsWith('//') || line.startsWith('#')) continue

    if (line === '---NOTES---' || line === 'NOTES:') {
      inNotes = true
      continue
    }

    if (!inNotes) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().toLowerCase()
        const value = line.slice(colonIdx + 1).trim()
        if (key === 'tags' || key === 'covergradient') {
          metadata[key] = value.split(',').map(v => v.trim())
        } else if (key === 'bpm' || key === 'duration' || key === 'level') {
          metadata[key] = parseFloat(value)
        } else {
          metadata[key] = value
        }
      }
    } else {
      noteLines.push({ line, lineNum })
    }
  }

  const title = metadata.title || '未命名曲目'
  const artist = metadata.artist || '未知艺术家'
  const bpm = metadata.bpm || 120
  const duration = metadata.duration || 60
  const beat = 60 / bpm

  const notes = []
  let parseLine = 0
  for (const { line, lineNum: ln } of noteLines) {
    parseLine++
    const parts = line.split(/[\s,|:]+/).filter(Boolean)
    if (parts.length < 2) continue

    let time = parseFloat(parts[0])
    if (isNaN(time)) {
      throw new ChartParseError(`时间格式错误: ${parts[0]}`, { line: ln, field: 'time', value: parts[0] })
    }

    if (parts[0].toLowerCase().endsWith('b') || parts[0].toLowerCase().endsWith('beat')) {
      const beatNum = parseFloat(parts[0])
      time = beatNum * beat
    }

    for (let i = 1; i < parts.length; i++) {
      const lane = parseInt(parts[i])
      if (isNaN(lane) || lane < 0 || lane > 3) {
        throw new ChartParseError(`轨道编号必须是0-3之间的整数: ${parts[i]}`, { line: ln, field: 'lane', value: parts[i] })
      }
      notes.push({ time, lane, type: 'normal' })
    }
  }

  const normalizedNotes = normalizeNotes(notes, duration, bpm)
  const synth = {
    leadOsc: metadata.leadosc || 'sawtooth',
    bassOsc: metadata.bassosc || 'sine',
    padOsc: metadata.padosc || 'triangle',
    root: metadata.root || 'C4'
  }
  const songData = generateDefaultSongData({ bpm, duration, synth })

  const level = metadata.level || 6
  const diffColor = level <= 5 ? '#66ff99' : level <= 10 ? '#ffcc00' : level <= 15 ? '#ff6666' : '#cc66ff'
  const diffName = level <= 5 ? '简单' : level <= 10 ? '普通' : level <= 15 ? '困难' : '专家'
  const diffId = level <= 5 ? 'easy' : level <= 10 ? 'normal' : level <= 15 ? 'hard' : 'expert'

  return {
    id: generateId(title),
    title,
    artist,
    genre: metadata.genre || '自定义',
    bpm,
    duration,
    synth,
    preview: {
      coverGradient: metadata.covergradient || ['#ff3366', '#6633ff'],
      description: metadata.description || '',
      tags: metadata.tags || [],
      lyrics: null,
      story: metadata.story || ''
    },
    difficulties: [{
      id: diffId,
      name: diffName,
      level,
      color: diffColor,
      notes: normalizedNotes,
      songData,
      totalNotes: normalizedNotes.length
    }],
    packIds: ['custom'],
    unlockCondition: { type: 'none' },
    createdAt: new Date().toISOString().split('T')[0],
    isCustom: true
  }
}

export function parseStepManiaChart(rawContent) {
  const lines = rawContent.split(/\r?\n/)
  const metadata = {}
  let currentTag = null
  let currentValue = ''
  let bpms = []
  let difficulties = []
  let currentDiff = null
  let inMeasures = false
  let measureLines = []
  let lineNum = 0

  for (const rawLine of lines) {
    lineNum++
    const line = rawLine.trim()

    if (line.startsWith('//') || line.startsWith('#') && !line.match(/^#\w+:/)) {
      continue
    }

    const tagMatch = line.match(/^#(\w+):(.*)$/)
    if (tagMatch && !inMeasures) {
      if (currentTag && currentValue) {
        if (currentTag === 'BPMS') {
          bpms = parseBPMs(currentValue)
        } else {
          metadata[currentTag.toLowerCase()] = currentValue.replace(/;$/, '').trim()
        }
      }
      currentTag = tagMatch[1].toUpperCase()
      currentValue = tagMatch[2]
      if (currentTag === 'NOTES') {
        const noteParts = currentValue.split(':').map(p => p.trim())
        currentDiff = {
          type: noteParts[0] || 'dance-single',
          description: noteParts[1] || '',
          difficultyClass: noteParts[2] || 'Hard',
          meter: parseInt(noteParts[3]) || 10,
          radarValues: noteParts[4] || '',
          notes: [],
          measures: []
        }
        inMeasures = true
        measureLines = []
      }
      continue
    }

    if (inMeasures) {
      if (line === ';' || line.startsWith('#NOTES:')) {
        if (measureLines.length > 0) {
          const measure = []
          for (const ml of measureLines) {
            if (ml && !ml.startsWith('//')) {
              measure.push(ml)
            }
          }
          if (measure.length > 0) {
            currentDiff.measures.push(measure)
          }
        }
        measureLines = []
        if (line === ';') {
          inMeasures = false
          if (currentDiff) {
            difficulties.push(currentDiff)
            currentDiff = null
          }
        } else if (line.startsWith('#NOTES:')) {
          currentTag = 'NOTES'
          const noteParts = line.slice(7).split(':').map(p => p.trim())
          currentDiff = {
            type: noteParts[0] || 'dance-single',
            description: noteParts[1] || '',
            difficultyClass: noteParts[2] || 'Hard',
            meter: parseInt(noteParts[3]) || 10,
            radarValues: noteParts[4] || '',
            notes: [],
            measures: []
          }
        }
      } else if (line === ',') {
        if (measureLines.length > 0) {
          const measure = []
          for (const ml of measureLines) {
            if (ml && !ml.startsWith('//')) {
              measure.push(ml)
            }
          }
          if (measure.length > 0) {
            currentDiff.measures.push(measure)
          }
        }
        measureLines = []
      } else {
        measureLines.push(line)
      }
    } else if (currentTag) {
      currentValue += '\n' + line
    }
  }

  if (currentTag && currentValue && !inMeasures) {
    metadata[currentTag.toLowerCase()] = currentValue.replace(/;$/, '').trim()
  }

  const title = metadata.title || '未命名曲目'
  const artist = metadata.artist || '未知艺术家'
  const bpm = bpms.length > 0 ? bpms[0].bpm : 120
  const beat = 60 / bpm

  const diffMap = {
    'beginner': { id: 'easy', name: '简单', color: '#66ff99' },
    'easy': { id: 'easy', name: '简单', color: '#66ff99' },
    'light': { id: 'easy', name: '简单', color: '#66ff99' },
    'basic': { id: 'normal', name: '普通', color: '#ffcc00' },
    'normal': { id: 'normal', name: '普通', color: '#ffcc00' },
    'standard': { id: 'normal', name: '普通', color: '#ffcc00' },
    'difficult': { id: 'hard', name: '困难', color: '#ff6666' },
    'hard': { id: 'hard', name: '困难', color: '#ff6666' },
    'expert': { id: 'expert', name: '专家', color: '#cc66ff' },
    'challenge': { id: 'expert', name: '专家', color: '#cc66ff' },
    'oni': { id: 'expert', name: '专家', color: '#cc66ff' }
  }

  const convertedDifficulties = []

  for (const diff of difficulties) {
    if (diff.type !== 'dance-single' && diff.type !== 'pump-single') {
      continue
    }
    const diffClass = (diff.difficultyClass || 'normal').toLowerCase()
    const meta = diffMap[diffClass] || diffMap['normal']
    const parsedNotes = []
    let measureTime = 0

    for (const measure of diff.measures) {
      const rows = measure.length
      const rowDuration = (beat * 4) / Math.max(1, rows)

      measure.forEach((row, rowIdx) => {
        const chars = row.padEnd(4, '0').slice(0, 4)
        const time = measureTime + rowIdx * rowDuration

        for (let lane = 0; lane < 4; lane++) {
          const ch = chars[lane]
          if (ch === '1' || ch === '2') {
            parsedNotes.push({
              time,
              lane,
              type: 'normal'
            })
          }
        }
      })

      measureTime += beat * 4
    }

    const normalizedNotes = normalizeNotes(parsedNotes, measureTime, bpm)
    const duration = measureTime + beat * 4
    const synth = {
      leadOsc: 'sawtooth',
      bassOsc: 'sine',
      padOsc: 'triangle',
      root: 'C4'
    }
    const songData = generateDefaultSongData({ bpm, duration, synth })

    convertedDifficulties.push({
      id: meta.id,
      name: meta.name,
      level: diff.meter || 6,
      color: meta.color,
      notes: normalizedNotes,
      songData,
      totalNotes: normalizedNotes.length
    })
  }

  if (convertedDifficulties.length === 0) {
    throw new ChartParseError('未找到有效的谱面数据 (仅支持 dance-single 4轨格式)', { field: 'NOTES' })
  }

  const totalDuration = Math.max(...convertedDifficulties.map(d => {
    const notes = d.notes
    return notes.length > 0 ? notes[notes.length - 1].time + beat * 4 : 60
  }))

  return {
    id: generateId(title),
    title,
    artist,
    genre: metadata.genre || metadata.subtitle || '自定义',
    bpm,
    duration: totalDuration,
    synth: {
      leadOsc: 'sawtooth',
      bassOsc: 'sine',
      padOsc: 'triangle',
      root: 'C4'
    },
    preview: {
      coverGradient: ['#6699ff', '#cc66ff'],
      description: metadata.subtitle || metadata.comment || '',
      tags: [metadata.genre || 'StepMania导入'].filter(Boolean),
      lyrics: null,
      story: ''
    },
    difficulties: convertedDifficulties,
    packIds: ['custom'],
    unlockCondition: { type: 'none' },
    createdAt: new Date().toISOString().split('T')[0],
    isCustom: true
  }
}

function parseBPMs(value) {
  const bpms = []
  const parts = value.replace(/;$/, '').split(',').map(p => p.trim())
  for (const part of parts) {
    const [beat, bpm] = part.split('=').map(v => parseFloat(v.trim()))
    if (!isNaN(beat) && !isNaN(bpm)) {
      bpms.push({ beat, bpm })
    }
  }
  return bpms.sort((a, b) => a.beat - b.beat)
}

export function detectFormat(filename, content) {
  if (filename.endsWith('.json')) return 'json'
  if (filename.endsWith('.sm')) return 'stepmania'
  if (filename.endsWith('.txt')) return 'simple'

  const trimmed = content.trim()
  if (trimmed.startsWith('{')) return 'json'
  if (trimmed.startsWith('#TITLE:') || /^#\w+:/m.test(trimmed)) return 'stepmania'
  return 'simple'
}

export function parseChart(content, format) {
  switch (format) {
    case 'json':
      return parseJSONChart(content)
    case 'simple':
      return parseSimpleChart(content)
    case 'stepmania':
      return parseStepManiaChart(content)
    default:
      throw new ChartParseError(`不支持的格式: ${format}`, { field: 'format' })
  }
}

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new ChartParseError('文件读取失败'))
    reader.readAsText(file)
  })
}
