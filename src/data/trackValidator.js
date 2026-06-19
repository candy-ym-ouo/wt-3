import { DIFFICULTIES } from './tracks.js'

export const ValidationSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

export class ValidationIssue {
  constructor(severity, code, message, { field, value, suggestion, line } = {}) {
    this.severity = severity
    this.code = code
    this.message = message
    this.field = field
    this.value = value
    this.suggestion = suggestion
    this.line = line
  }
}

export class ValidationResult {
  constructor(issues = [], track = null) {
    this.issues = issues
    this.track = track
  }

  get isValid() {
    return !this.issues.some(i => i.severity === ValidationSeverity.ERROR)
  }

  get errors() {
    return this.issues.filter(i => i.severity === ValidationSeverity.ERROR)
  }

  get warnings() {
    return this.issues.filter(i => i.severity === ValidationSeverity.WARNING)
  }

  get infos() {
    return this.issues.filter(i => i.severity === ValidationSeverity.INFO)
  }
}

const VALID_OSC_TYPES = ['sine', 'square', 'sawtooth', 'triangle', 'pulse']
const VALID_DIFFICULTY_IDS = ['easy', 'normal', 'hard', 'expert']
const VALID_NOTE_TYPES = ['normal']

function isInRange(value, min, max) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= min && value <= max
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateTrack(track, existingTracks = []) {
  const issues = []
  const t = track || {}

  if (!t || typeof t !== 'object') {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'TRACK_INVALID_TYPE',
      '曲目数据格式错误，必须是对象'
    ))
    return new ValidationResult(issues, null)
  }

  if (!isNonEmptyString(t.id)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'ID_MISSING',
      '曲目ID不能为空',
      { field: 'id', value: t.id, suggestion: '系统会自动生成唯一ID' }
    ))
  } else if (existingTracks.some(et => et.id === t.id && et !== track)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.WARNING,
      'ID_DUPLICATE',
      `曲目ID "${t.id}" 已存在，可能会覆盖现有曲目`,
      { field: 'id', value: t.id, suggestion: '建议修改为唯一ID' }
    ))
  }

  if (!isNonEmptyString(t.title)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'TITLE_MISSING',
      '曲目标题不能为空',
      { field: 'title', value: t.title, suggestion: '请输入曲目标题' }
    ))
  } else if (t.title.length > 100) {
    issues.push(new ValidationIssue(
      ValidationSeverity.WARNING,
      'TITLE_TOO_LONG',
      `曲目标题过长 (${t.title.length}/100)，可能会显示不完整`,
      { field: 'title', value: t.title }
    ))
  }

  if (!isNonEmptyString(t.artist)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.WARNING,
      'ARTIST_MISSING',
      '艺术家名称为空，建议填写',
      { field: 'artist', value: t.artist, suggestion: '请输入艺术家/作曲家名称' }
    ))
  } else if (t.artist.length > 100) {
    issues.push(new ValidationIssue(
      ValidationSeverity.WARNING,
      'ARTIST_TOO_LONG',
      `艺术家名称过长 (${t.artist.length}/100)`,
      { field: 'artist', value: t.artist }
    ))
  }

  if (!isInRange(t.bpm, 30, 600)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'BPM_INVALID',
      `BPM必须在30-600之间 (当前: ${t.bpm})`,
      { field: 'bpm', value: t.bpm, suggestion: '正常音乐BPM范围通常在60-200之间' }
    ))
  }

  if (!isInRange(t.duration, 1, 3600)) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'DURATION_INVALID',
      `曲目时长必须在1-3600秒之间 (当前: ${t.duration})`,
      { field: 'duration', value: t.duration, suggestion: '请设置合理的曲目时长' }
    ))
  }

  if (t.synth && typeof t.synth === 'object') {
    const s = t.synth
    if (s.leadOsc && !VALID_OSC_TYPES.includes(s.leadOsc)) {
      issues.push(new ValidationIssue(
        ValidationSeverity.WARNING,
        'SYNTH_INVALID_LEAD_OSC',
        `无效的主旋律波形类型: ${s.leadOsc}`,
        { field: 'synth.leadOsc', value: s.leadOsc, suggestion: `可选值: ${VALID_OSC_TYPES.join(', ')}` }
      ))
    }
    if (s.bassOsc && !VALID_OSC_TYPES.includes(s.bassOsc)) {
      issues.push(new ValidationIssue(
        ValidationSeverity.WARNING,
        'SYNTH_INVALID_BASS_OSC',
        `无效的贝斯波形类型: ${s.bassOsc}`,
        { field: 'synth.bassOsc', value: s.bassOsc, suggestion: `可选值: ${VALID_OSC_TYPES.join(', ')}` }
      ))
    }
    if (s.root && !/^[A-G]#?[0-8]$/.test(s.root)) {
      issues.push(new ValidationIssue(
        ValidationSeverity.WARNING,
        'SYNTH_INVALID_ROOT',
        `无效的根音格式: ${s.root}`,
        { field: 'synth.root', value: s.root, suggestion: '格式示例: C4, G#5, F3' }
      ))
    }
  }

  if (t.preview && typeof t.preview === 'object') {
    if (t.preview.coverGradient) {
      if (!Array.isArray(t.preview.coverGradient) || t.preview.coverGradient.length < 2) {
        issues.push(new ValidationIssue(
          ValidationSeverity.WARNING,
          'COVER_GRADIENT_INVALID',
          '封面渐变需要至少2个颜色值',
          { field: 'preview.coverGradient', value: t.preview.coverGradient }
        ))
      }
    }
  }

  if (!Array.isArray(t.difficulties) || t.difficulties.length === 0) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'DIFFICULTIES_MISSING',
      '至少需要定义1个难度',
      { field: 'difficulties', value: t.difficulties, suggestion: '请添加至少一个难度的谱面' }
    ))
  } else {
    t.difficulties.forEach((diff, diffIndex) => {
      if (!diff || typeof diff !== 'object') {
        issues.push(new ValidationIssue(
          ValidationSeverity.ERROR,
          'DIFFICULTY_INVALID',
          `第 ${diffIndex + 1} 个难度数据格式错误`,
          { field: `difficulties[${diffIndex}]` }
        ))
        return
      }

      if (!VALID_DIFFICULTY_IDS.includes(diff.id)) {
        issues.push(new ValidationIssue(
          ValidationSeverity.WARNING,
          'DIFFICULTY_ID_INVALID',
          `难度 "${diff.name}" 的ID无效: ${diff.id}`,
          { field: `difficulties[${diffIndex}].id`, value: diff.id, suggestion: `可选值: ${VALID_DIFFICULTY_IDS.join(', ')}` }
        ))
      }

      if (!isInRange(diff.level, 1, 20)) {
        issues.push(new ValidationIssue(
          ValidationSeverity.ERROR,
          'LEVEL_INVALID',
          `难度 "${diff.name}" 的等级必须在1-20之间 (当前: ${diff.level})`,
          { field: `difficulties[${diffIndex}].level`, value: diff.level }
        ))
      }

      if (!Array.isArray(diff.notes)) {
        issues.push(new ValidationIssue(
          ValidationSeverity.ERROR,
          'NOTES_INVALID',
          `难度 "${diff.name}" 的谱面数据必须是数组`,
          { field: `difficulties[${diffIndex}].notes` }
        ))
      } else if (diff.notes.length === 0) {
        issues.push(new ValidationIssue(
          ValidationSeverity.WARNING,
          'NOTES_EMPTY',
          `难度 "${diff.name}" 的谱面为空`,
          { field: `difficulties[${diffIndex}].notes`, suggestion: '空谱面将无法正常游戏' }
        ))
      } else {
        const noteIssues = validateNotes(diff.notes, diff.name, diffIndex, t.duration)
        issues.push(...noteIssues)

        if (diff.notes.length > 0) {
          const lastNoteTime = diff.notes[diff.notes.length - 1].time
          if (lastNoteTime > t.duration) {
            issues.push(new ValidationIssue(
              ValidationSeverity.WARNING,
              'NOTES_EXCEED_DURATION',
              `难度 "${diff.name}" 的最后一个音符时间(${lastNoteTime.toFixed(2)}s)超过曲目时长(${t.duration}s)`,
              { field: `difficulties[${diffIndex}].notes`, value: lastNoteTime, suggestion: '请调整曲目时长或谱面位置' }
            ))
          }
        }

        if (diff.totalNotes !== undefined && diff.totalNotes !== diff.notes.length) {
          issues.push(new ValidationIssue(
            ValidationSeverity.WARNING,
            'TOTAL_NOTES_MISMATCH',
            `难度 "${diff.name}" 的totalNotes(${diff.totalNotes})与实际音符数(${diff.notes.length})不一致`,
            { field: `difficulties[${diffIndex}].totalNotes`, value: diff.totalNotes }
          ))
        }
      }

      if (!diff.songData || typeof diff.songData !== 'object') {
        issues.push(new ValidationIssue(
          ValidationSeverity.INFO,
          'SONG_DATA_MISSING',
          `难度 "${diff.name}" 未提供音乐数据，将使用自动生成的背景音乐`,
          { field: `difficulties[${diffIndex}].songData`, suggestion: '建议提供自定义音乐数据以获得更好的体验' }
        ))
      }
    })

    const seenDiffIds = new Set()
    for (const diff of t.difficulties) {
      if (diff.id) {
        if (seenDiffIds.has(diff.id)) {
          issues.push(new ValidationIssue(
            ValidationSeverity.ERROR,
            'DIFFICULTY_ID_DUPLICATE',
            `存在重复的难度ID: ${diff.id}`,
            { field: 'difficulties.id', value: diff.id, suggestion: '每个难度的ID必须唯一' }
          ))
        }
        seenDiffIds.add(diff.id)
      }
    }
  }

  return new ValidationResult(issues, track)
}

function validateNotes(notes, diffName, diffIndex, duration) {
  const issues = []
  const beat = duration ? 60 / 120 : 0.5
  let prevTime = -Infinity
  let gapCount = 0
  let clusterCount = 0
  let invalidLanes = 0
  let invalidTimes = 0
  let invalidTypes = 0

  notes.forEach((note, i) => {
    const fieldBase = `difficulties[${diffIndex}].notes[${i}]`

    if (!note || typeof note !== 'object') {
      issues.push(new ValidationIssue(
        ValidationSeverity.ERROR,
        'NOTE_INVALID',
        `${diffName} - 第 ${i + 1} 个音符格式错误`,
        { field: fieldBase }
      ))
      return
    }

    if (!isInRange(note.time, 0, Infinity)) {
      invalidTimes++
      if (invalidTimes <= 5) {
        issues.push(new ValidationIssue(
          ValidationSeverity.ERROR,
          'NOTE_TIME_INVALID',
          `${diffName} - 第 ${i + 1} 个音符的时间无效: ${note.time}`,
          { field: `${fieldBase}.time`, value: note.time }
        ))
      }
    } else {
      if (note.time < prevTime) {
        issues.push(new ValidationIssue(
          ValidationSeverity.WARNING,
          'NOTE_TIME_UNSORTED',
          `${diffName} - 第 ${i + 1} 个音符(${note.time.toFixed(3)}s)早于前一个音符(${prevTime.toFixed(3)}s)`,
          { field: `${fieldBase}.time`, value: note.time, suggestion: '谱面会自动按时间排序' }
        ))
      }
      if (note.time - prevTime < 0.03 && prevTime > -Infinity) {
        clusterCount++
      }
      if (note.time - prevTime > beat * 8 && prevTime > -Infinity) {
        gapCount++
      }
      prevTime = note.time
    }

    if (!isInRange(note.lane, 0, 3) || !Number.isInteger(note.lane)) {
      invalidLanes++
      if (invalidLanes <= 5) {
        issues.push(new ValidationIssue(
          ValidationSeverity.ERROR,
          'NOTE_LANE_INVALID',
          `${diffName} - 第 ${i + 1} 个音符的轨道无效: ${note.lane}`,
          { field: `${fieldBase}.lane`, value: note.lane, suggestion: '轨道必须是0-3之间的整数' }
        ))
      }
    }

    if (note.type && !VALID_NOTE_TYPES.includes(note.type)) {
      invalidTypes++
      if (invalidTypes <= 3) {
        issues.push(new ValidationIssue(
          ValidationSeverity.WARNING,
          'NOTE_TYPE_INVALID',
          `${diffName} - 第 ${i + 1} 个音符的类型无效: ${note.type}`,
          { field: `${fieldBase}.type`, value: note.type, suggestion: `支持的类型: ${VALID_NOTE_TYPES.join(', ')}` }
        ))
      }
    }
  })

  if (invalidTimes > 5) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'NOTE_TIME_INVALID_MULTIPLE',
      `${diffName} - 共有 ${invalidTimes} 个音符的时间无效`,
      { field: `difficulties[${diffIndex}].notes` }
    ))
  }

  if (invalidLanes > 5) {
    issues.push(new ValidationIssue(
      ValidationSeverity.ERROR,
      'NOTE_LANE_INVALID_MULTIPLE',
      `${diffName} - 共有 ${invalidLanes} 个音符的轨道无效`,
      { field: `difficulties[${diffIndex}].notes` }
    ))
  }

  if (clusterCount > 0) {
    issues.push(new ValidationIssue(
      ValidationSeverity.WARNING,
      'NOTE_CLUSTERS',
      `${diffName} - 检测到 ${clusterCount} 处可能过于密集的音符序列（间隔<30ms）`,
      { field: `difficulties[${diffIndex}].notes`, suggestion: '过于密集的音符可能影响游戏体验' }
    ))
  }

  if (gapCount > 0) {
    issues.push(new ValidationIssue(
      ValidationSeverity.INFO,
      'NOTE_LONG_GAPS',
      `${diffName} - 检测到 ${gapCount} 处较长的空白（>8拍无音符）`,
      { field: `difficulties[${diffIndex}].notes` }
    ))
  }

  return issues
}

export function autoFixTrack(track, validationResult) {
  if (!track) return track
  const fixed = { ...track }
  const issues = validationResult?.issues || []

  if (!fixed.id || issues.some(i => i.code === 'ID_MISSING')) {
    fixed.id = `custom_fixed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  }

  if (!fixed.title || issues.some(i => i.code === 'TITLE_MISSING')) {
    fixed.title = '未命名曲目'
  }

  if (!fixed.artist) {
    fixed.artist = '未知艺术家'
  }

  if (!isInRange(fixed.bpm, 30, 600)) {
    fixed.bpm = 120
  }

  if (!isInRange(fixed.duration, 1, 3600)) {
    let maxNoteTime = 0
    if (Array.isArray(fixed.difficulties)) {
      for (const diff of fixed.difficulties) {
        if (Array.isArray(diff.notes) && diff.notes.length > 0) {
          const lastNote = diff.notes[diff.notes.length - 1].time
          if (lastNote > maxNoteTime) maxNoteTime = lastNote
        }
      }
    }
    fixed.duration = Math.max(30, maxNoteTime + 5)
  }

  fixed.synth = {
    leadOsc: VALID_OSC_TYPES.includes(fixed.synth?.leadOsc) ? fixed.synth.leadOsc : 'sawtooth',
    bassOsc: VALID_OSC_TYPES.includes(fixed.synth?.bassOsc) ? fixed.synth.bassOsc : 'sine',
    padOsc: VALID_OSC_TYPES.includes(fixed.synth?.padOsc) ? fixed.synth.padOsc : 'triangle',
    root: /^[A-G]#?[0-8]$/.test(fixed.synth?.root) ? fixed.synth.root : 'C4'
  }

  if (!fixed.preview || typeof fixed.preview !== 'object') {
    fixed.preview = {}
  }
  if (!Array.isArray(fixed.preview.coverGradient) || fixed.preview.coverGradient.length < 2) {
    fixed.preview.coverGradient = ['#ff3366', '#6633ff']
  }
  if (!fixed.preview.description) fixed.preview.description = ''
  if (!Array.isArray(fixed.preview.tags)) fixed.preview.tags = []

  if (Array.isArray(fixed.difficulties)) {
    const seenIds = new Set()
    fixed.difficulties = fixed.difficulties.map((diff, i) => {
      const d = { ...diff }
      const meta = Object.values(DIFFICULTIES)[i] || DIFFICULTIES.NORMAL

      if (!VALID_DIFFICULTY_IDS.includes(d.id)) {
        const available = VALID_DIFFICULTY_IDS.filter(id => !seenIds.has(id))
        d.id = available[i] || meta.id
      }
      if (seenIds.has(d.id)) {
        const available = VALID_DIFFICULTY_IDS.filter(id => !seenIds.has(id))
        if (available.length > 0) d.id = available[0]
      }
      seenIds.add(d.id)

      if (!d.name) d.name = meta.name
      if (!isInRange(d.level, 1, 20)) d.level = meta.levelRange[0]
      if (!d.color) d.color = meta.color

      if (Array.isArray(d.notes)) {
        d.notes = d.notes
          .filter(n => n && typeof n === 'object' && isInRange(n.time, 0, Infinity) && isInRange(n.lane, 0, 3))
          .map(n => ({
            ...n,
            lane: Math.max(0, Math.min(3, Math.floor(n.lane || 0))),
            type: VALID_NOTE_TYPES.includes(n.type) ? n.type : 'normal'
          }))
          .sort((a, b) => a.time - b.time)
          .map((n, idx) => ({ ...n, id: idx }))
        d.totalNotes = d.notes.length
      } else {
        d.notes = []
        d.totalNotes = 0
      }

      return d
    }).filter(d => d.notes && d.notes.length > 0)
  }

  if (!fixed.packIds || !Array.isArray(fixed.packIds)) {
    fixed.packIds = ['custom']
  }
  if (!fixed.unlockCondition) {
    fixed.unlockCondition = { type: 'none' }
  }
  if (!fixed.createdAt) {
    fixed.createdAt = new Date().toISOString().split('T')[0]
  }
  fixed.isCustom = true

  return fixed
}

export function getValidationSummary(validationResult) {
  const result = validationResult
  return {
    valid: result.isValid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    infoCount: result.infos.length,
    totalCount: result.issues.length,
    categories: {
      metadata: result.issues.filter(i => /TITLE|ARTIST|BPM|DURATION|ID_/i.test(i.code)).length,
      synth: result.issues.filter(i => i.code.startsWith('SYNTH_')).length,
      cover: result.issues.filter(i => i.code.startsWith('COVER_')).length,
      difficulty: result.issues.filter(i => /DIFFICULTY_/i.test(i.code) || i.code === 'DIFFICULTIES_MISSING').length,
      notes: result.issues.filter(i => i.code.startsWith('NOTE_')).length,
      song: result.issues.filter(i => i.code.startsWith('SONG_')).length
    }
  }
}
