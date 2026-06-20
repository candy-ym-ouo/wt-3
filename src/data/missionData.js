export const MISSION_TYPES = {
  CONSECUTIVE_PERFECT: 'consecutive_perfect',
  LANE_ZERO_MISS: 'lane_zero_miss',
  TOTAL_PERFECT: 'total_perfect',
  NO_MISS: 'no_miss',
  MIN_COMBO: 'min_combo',
  ACCURACY_THRESHOLD: 'accuracy_threshold'
}

export const MISSION_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard'
}

const MISSION_TEMPLATES = {
  [MISSION_TYPES.CONSECUTIVE_PERFECT]: {
    name: '连续 Perfect',
    description: (target) => `连续达成 ${target} 次 Perfect 判定`,
    icon: '✨',
    color: '#ffcc00',
    getTarget: (track, difficulty) => {
      const baseTargets = { easy: 10, normal: 20, hard: 30 }
      const multiplier = Math.max(1, Math.floor(track.level / 5))
      return baseTargets[difficulty] * multiplier
    },
    formatProgress: (current, target) => `${current} / ${target}`
  },
  [MISSION_TYPES.LANE_ZERO_MISS]: {
    name: '指定轨道零失误',
    description: (target, laneLabel) => `${laneLabel} 轨道全程零失误`,
    icon: '💎',
    color: '#00ffcc',
    getTarget: () => 1,
    formatProgress: (current, target, laneLabel) => current ? '✓ 达成' : `保持 ${laneLabel} 轨道零 Miss`
  },
  [MISSION_TYPES.TOTAL_PERFECT]: {
    name: 'Perfect 总数',
    description: (target) => `单局获得 ${target} 个 Perfect 判定`,
    icon: '⭐',
    color: '#ffcc00',
    getTarget: (track, difficulty) => {
      const noteCount = track.notes?.length || 100
      const ratios = { easy: 0.3, normal: 0.5, hard: 0.7 }
      return Math.floor(noteCount * ratios[difficulty])
    },
    formatProgress: (current, target) => `${current} / ${target}`
  },
  [MISSION_TYPES.NO_MISS]: {
    name: '零失误通关',
    description: () => `全程零 Miss 通关`,
    icon: '🏆',
    color: '#ff3366',
    getTarget: () => 1,
    formatProgress: (current) => current ? '✓ 达成' : '保持零 Miss'
  },
  [MISSION_TYPES.MIN_COMBO]: {
    name: '最低连击',
    description: (target) => `单局最高连击达到 ${target}`,
    icon: '🔥',
    color: '#ff9900',
    getTarget: (track, difficulty) => {
      const noteCount = track.notes?.length || 100
      const ratios = { easy: 0.2, normal: 0.4, hard: 0.6 }
      return Math.floor(noteCount * ratios[difficulty])
    },
    formatProgress: (current, target) => `${current} / ${target}`
  },
  [MISSION_TYPES.ACCURACY_THRESHOLD]: {
    name: '准确率目标',
    description: (target) => `最终准确率达到 ${target}%`,
    icon: '🎯',
    color: '#6699ff',
    getTarget: (track, difficulty) => {
      const targets = { easy: 85, normal: 90, hard: 95 }
      return targets[difficulty]
    },
    formatProgress: (current, target) => `${current.toFixed(1)}% / ${target}%`
  }
}

export function generateMissions(track, count = 3) {
  const difficulty = getMissionDifficulty(track)
  const availableTypes = Object.values(MISSION_TYPES)
  const shuffled = [...availableTypes].sort(() => Math.random() - 0.5)
  const selectedTypes = shuffled.slice(0, count)

  return selectedTypes.map((type, index) => {
    const template = MISSION_TEMPLATES[type]
    const target = template.getTarget(track, difficulty)
    const lane = type === MISSION_TYPES.LANE_ZERO_MISS ? Math.floor(Math.random() * 4) : null

    return {
      id: `mission_${Date.now()}_${index}`,
      type,
      name: template.name,
      description: template.description(
        target,
        lane !== null ? ['D', 'F', 'J', 'K'][lane] : ''
      ),
      icon: template.icon,
      color: template.color,
      target,
      lane,
      laneLabel: lane !== null ? ['D', 'F', 'J', 'K'][lane] : null,
      difficulty,
      completed: false,
      currentValue: 0,
      bonusExp: getBonusExp(difficulty, type),
      template
    }
  })
}

function getMissionDifficulty(track) {
  const level = track.level || 5
  if (level <= 5) return MISSION_DIFFICULTY.EASY
  if (level <= 10) return MISSION_DIFFICULTY.NORMAL
  return MISSION_DIFFICULTY.HARD
}

function getBonusExp(difficulty, type) {
  const baseExp = {
    [MISSION_DIFFICULTY.EASY]: 30,
    [MISSION_DIFFICULTY.NORMAL]: 50,
    [MISSION_DIFFICULTY.HARD]: 80
  }
  const typeMultiplier = {
    [MISSION_TYPES.CONSECUTIVE_PERFECT]: 1.2,
    [MISSION_TYPES.LANE_ZERO_MISS]: 1.5,
    [MISSION_TYPES.TOTAL_PERFECT]: 1.0,
    [MISSION_TYPES.NO_MISS]: 2.0,
    [MISSION_TYPES.MIN_COMBO]: 1.1,
    [MISSION_TYPES.ACCURACY_THRESHOLD]: 1.3
  }
  return Math.floor(baseExp[difficulty] * (typeMultiplier[type] || 1))
}

export function initializeMissionTracker(missions) {
  return missions.map(mission => ({
    ...mission,
    currentValue: 0,
    completed: false,
    failed: false,
    currentConsecutivePerfect: 0,
    maxConsecutivePerfect: 0,
    laneMissCount: mission.lane !== null ? 0 : undefined,
    totalPerfect: 0,
    totalMiss: 0,
    maxCombo: 0,
    finalAccuracy: 0
  }))
}

export function updateMissionProgress(tracker, judgeType, lane, combo, stats, totalNotes) {
  return tracker.map(mission => {
    if (mission.completed || mission.failed) return mission

    const updated = { ...mission }

    switch (mission.type) {
      case MISSION_TYPES.CONSECUTIVE_PERFECT:
        if (judgeType === 'perfect') {
          updated.currentConsecutivePerfect = (mission.currentConsecutivePerfect || 0) + 1
          updated.maxConsecutivePerfect = Math.max(
            mission.maxConsecutivePerfect || 0,
            updated.currentConsecutivePerfect
          )
        } else if (judgeType === 'miss') {
          updated.currentConsecutivePerfect = 0
        }
        updated.currentValue = updated.maxConsecutivePerfect || 0
        if (updated.currentValue >= mission.target) {
          updated.completed = true
        }
        break

      case MISSION_TYPES.LANE_ZERO_MISS:
        if (judgeType === 'miss' && lane === mission.lane) {
          updated.failed = true
          updated.laneMissCount = (mission.laneMissCount || 0) + 1
        }
        updated.currentValue = updated.failed ? 0 : 1
        break

      case MISSION_TYPES.TOTAL_PERFECT:
        if (judgeType === 'perfect') {
          updated.totalPerfect = (mission.totalPerfect || 0) + 1
        }
        updated.currentValue = updated.totalPerfect || 0
        if (updated.currentValue >= mission.target) {
          updated.completed = true
        }
        break

      case MISSION_TYPES.NO_MISS:
        if (judgeType === 'miss') {
          updated.failed = true
          updated.totalMiss = (mission.totalMiss || 0) + 1
        }
        updated.currentValue = updated.failed ? 0 : 1
        break

      case MISSION_TYPES.MIN_COMBO:
        updated.maxCombo = Math.max(mission.maxCombo || 0, combo)
        updated.currentValue = updated.maxCombo || 0
        if (updated.currentValue >= mission.target) {
          updated.completed = true
        }
        break

      case MISSION_TYPES.ACCURACY_THRESHOLD:
        if (stats && totalNotes > 0) {
          const totalJudged = stats.perfect + stats.great + stats.good + stats.miss
          if (totalJudged > 0) {
            updated.finalAccuracy = (stats.perfect * 100 + stats.great * 75 + stats.good * 50) / totalJudged
            updated.currentValue = updated.finalAccuracy
          }
        }
        break
    }

    return updated
  })
}

export function finalizeMissions(tracker, finalStats, totalNotes) {
  return tracker.map(mission => {
    if (mission.completed || mission.failed) return mission

    const updated = { ...mission }

    if (mission.type === MISSION_TYPES.ACCURACY_THRESHOLD) {
      const accuracy = totalNotes > 0
        ? ((finalStats.perfect * 100 + finalStats.great * 75 + finalStats.good * 50) / totalNotes)
        : 0
      updated.currentValue = accuracy
      updated.finalAccuracy = accuracy
      if (accuracy >= mission.target) {
        updated.completed = true
      }
    }

    return updated
  })
}

export function getMissionProgressText(mission) {
  const template = MISSION_TEMPLATES[mission.type]
  if (!template) return ''

  if (mission.completed) {
    return '✓ 已完成'
  }
  if (mission.failed) {
    return '✕ 已失败'
  }

  return template.formatProgress(
    mission.currentValue || 0,
    mission.target,
    mission.laneLabel
  )
}

export function calculateTotalBonusExp(missions) {
  return missions
    .filter(m => m.completed)
    .reduce((sum, m) => sum + (m.bonusExp || 0), 0)
}

export function getMissionsSummary(missions) {
  const completed = missions.filter(m => m.completed).length
  const failed = missions.filter(m => m.failed).length
  const total = missions.length
  const bonusExp = calculateTotalBonusExp(missions)

  return {
    completed,
    failed,
    total,
    inProgress: total - completed - failed,
    bonusExp,
    allCompleted: completed === total,
    anyFailed: failed > 0
  }
}
