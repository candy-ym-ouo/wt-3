import { TRACKS } from './tracks.js'

export const CONSTRAINT_TYPES = {
  SPEED_UP: 'speed_up',
  NO_MISS: 'no_miss',
  MIN_ACCURACY: 'min_accuracy',
  MIN_COMBO: 'min_combo',
  TARGET_SCORE: 'target_score',
  HIDDEN_NOTES: 'hidden_notes',
  SUDDEN_DEATH: 'sudden_death'
}

export const CONSTRAINTS = [
  {
    type: CONSTRAINT_TYPES.SPEED_UP,
    name: '加速挑战',
    icon: '⚡',
    description: '播放速度提升',
    color: '#ff9900',
    apply: (value) => ({ playbackSpeed: value })
  },
  {
    type: CONSTRAINT_TYPES.NO_MISS,
    name: '零失误',
    icon: '💎',
    description: '不允许出现Miss判定',
    color: '#00ffcc',
    apply: () => ({ allowMiss: false })
  },
  {
    type: CONSTRAINT_TYPES.MIN_ACCURACY,
    name: '精准要求',
    icon: '🎯',
    description: '准确度需达到目标',
    color: '#ff3366',
    apply: (value) => ({ minAccuracy: value })
  },
  {
    type: CONSTRAINT_TYPES.MIN_COMBO,
    name: '连击要求',
    icon: '🔥',
    description: '最低连击数要求',
    color: '#ffcc00',
    apply: (value) => ({ minCombo: value })
  },
  {
    type: CONSTRAINT_TYPES.TARGET_SCORE,
    name: '目标分数',
    icon: '🏆',
    description: '需达到指定分数',
    color: '#cc66ff',
    apply: (value) => ({ targetScore: value })
  },
  {
    type: CONSTRAINT_TYPES.HIDDEN_NOTES,
    name: '隐身音符',
    icon: '👻',
    description: '音符接近判定线时才显示',
    color: '#6699ff',
    apply: () => ({ hiddenNotes: true })
  },
  {
    type: CONSTRAINT_TYPES.SUDDEN_DEATH,
    name: '一命通关',
    icon: '💀',
    description: '出现一个Miss即失败',
    color: '#ff3366',
    apply: () => ({ suddenDeath: true })
  }
]

const seededRandom = (seed) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

const hashDate = (dateStr) => {
  let hash = 5381
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash + dateStr.charCodeAt(i)) & 0xFFFFFFFF
  }
  return hash >>> 0
}

export const getTodayKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const DIFFICULTY_TIERS = ['easy', 'normal', 'hard', 'expert']

export const generateDailyChallenge = (dateStr) => {
  const seed = hashDate(dateStr)
  const rng = seededRandom(seed)

  const eligibleTracks = TRACKS.filter(t => t.difficulties && t.difficulties.length > 0)
  const trackIndex = Math.floor(rng() * eligibleTracks.length)
  const track = eligibleTracks[trackIndex]

  const diffIndex = Math.floor(rng() * track.difficulties.length)
  const difficulty = track.difficulties[diffIndex]

  const constraintCount = 1 + Math.floor(rng() * 3)
  const selectedConstraints = []
  const usedTypes = new Set()

  const speedValues = [1.1, 1.2, 1.3, 1.5]
  const accuracyValues = [85, 90, 95, 98]
  const comboValues = [30, 50, 80, 100, 150]

  for (let i = 0; i < constraintCount; i++) {
    let attempts = 0
    while (attempts < 20) {
      const cIndex = Math.floor(rng() * CONSTRAINTS.length)
      const constraint = CONSTRAINTS[cIndex]
      if (usedTypes.has(constraint.type)) {
        attempts++
        continue
      }
      usedTypes.add(constraint.type)

      let value = undefined
      switch (constraint.type) {
        case CONSTRAINT_TYPES.SPEED_UP:
          value = speedValues[Math.floor(rng() * speedValues.length)]
          break
        case CONSTRAINT_TYPES.MIN_ACCURACY:
          value = accuracyValues[Math.floor(rng() * accuracyValues.length)]
          break
        case CONSTRAINT_TYPES.MIN_COMBO:
          value = comboValues[Math.floor(rng() * comboValues.length)]
          break
        case CONSTRAINT_TYPES.TARGET_SCORE: {
          const baseScore = difficulty.totalNotes * 800
          const multipliers = [0.7, 0.8, 0.9, 0.95]
          value = Math.floor(baseScore * multipliers[Math.floor(rng() * multipliers.length)])
          break
        }
      }

      selectedConstraints.push({
        ...constraint,
        value,
        applyResult: constraint.apply(value)
      })
      break
    }
  }

  const baseExpReward = 200
  const expPerConstraint = 100
  const expReward = baseExpReward + selectedConstraints.length * expPerConstraint

  return {
    dateKey: dateStr,
    trackId: track.id,
    trackTitle: track.title,
    trackArtist: track.artist,
    difficultyId: difficulty.id,
    difficultyName: difficulty.name,
    difficultyLevel: difficulty.level,
    constraints: selectedConstraints,
    expReward,
    generatedAt: dateStr
  }
}

export const getConstraintModifiers = (constraints) => {
  const modifiers = {
    playbackSpeed: 1.0,
    allowMiss: true,
    minAccuracy: 0,
    minCombo: 0,
    targetScore: 0,
    hiddenNotes: false,
    suddenDeath: false
  }
  constraints.forEach(c => {
    if (c.applyResult) {
      Object.assign(modifiers, c.applyResult)
    }
  })
  return modifiers
}

export const checkDailyChallengeResult = (challenge, result) => {
  if (!challenge || !result) return { passed: false, failedConstraints: [] }
  if (!result.cleared) return { passed: false, failedConstraints: ['未通关'] }

  const modifiers = getConstraintModifiers(challenge.constraints)
  const failedConstraints = []

  if (modifiers.minAccuracy > 0 && result.accuracy < modifiers.minAccuracy) {
    failedConstraints.push(`准确度未达 ${modifiers.minAccuracy}%`)
  }
  if (modifiers.minCombo > 0 && result.maxCombo < modifiers.minCombo) {
    failedConstraints.push(`连击未达 ${modifiers.minCombo}`)
  }
  if (modifiers.targetScore > 0 && result.score < modifiers.targetScore) {
    failedConstraints.push(`分数未达 ${modifiers.targetScore.toLocaleString()}`)
  }
  if (!modifiers.allowMiss && result.stats.miss > 0) {
    failedConstraints.push('出现了Miss判定')
  }

  return {
    passed: failedConstraints.length === 0,
    failedConstraints
  }
}

export const getChallengeExpReward = (challenge, result) => {
  if (!challenge || !result) return 0
  const check = checkDailyChallengeResult(challenge, result)
  if (!check.passed) return Math.floor(challenge.expReward * 0.3)
  return challenge.expReward
}
