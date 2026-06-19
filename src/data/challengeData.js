export const CHALLENGE_PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  EVENT: 'event'
}

export const CHALLENGE_TASK_TYPES = {
  PLAY_COUNT: 'play_count',
  CLEAR_COUNT: 'clear_count',
  TARGET_SCORE: 'target_score',
  TARGET_ACCURACY: 'target_accuracy',
  TARGET_COMBO: 'target_combo',
  PERFECT_COUNT: 'perfect_count',
  SPECIFIC_TRACK: 'specific_track',
  DIFFICULTY_CLEAR: 'difficulty_clear',
  NO_MISS: 'no_miss',
  RANK_ACHIEVE: 'rank_achieve'
}

export const REWARD_TYPES = {
  EXP_BONUS: 'exp_bonus',
  TITLE: 'title',
  ACHIEVEMENT: 'achievement',
  MULTIPLIER: 'multiplier',
  BADGE: 'badge'
}

export const DIFFICULTY_FILTERS = {
  简单: 'easy',
  普通: 'normal',
  困难: 'hard',
  专家: 'expert'
}

const today = new Date()
const weekStart = new Date(today)
weekStart.setDate(today.getDate() - today.getDay())
const weekEnd = new Date(weekStart)
weekEnd.setDate(weekStart.getDate() + 6)

export const ACTIVITIES = [
  {
    id: 'summer_festival_2026',
    name: '夏日节奏祭',
    description: '夏日限定活动！完成挑战赢取专属奖励',
    icon: '🎆',
    banner: 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 50%, #6bcb77 100%)',
    startDate: new Date(today.getFullYear(), 5, 1).toISOString(),
    endDate: new Date(today.getFullYear(), 7, 31).toISOString(),
    isActive: true,
    limitedTracks: ['nebula', 'void'],
    rewardMultiplier: 1.5,
    tags: ['限定', '夏日'],
    featured: true
  },
  {
    id: 'new_challenge_weekly',
    name: '每周挑战',
    description: '每周刷新的挑战任务，完成获得丰厚奖励',
    icon: '📅',
    banner: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    isActive: true,
    limitedTracks: null,
    rewardMultiplier: 1.2,
    tags: ['每周'],
    featured: false
  }
]

export const DAILY_TASKS = [
  {
    id: 'daily_play_3',
    activityId: null,
    period: CHALLENGE_PERIOD_TYPES.DAILY,
    type: CHALLENGE_TASK_TYPES.PLAY_COUNT,
    name: '每日练习',
    description: '任意游玩3次',
    icon: '🎵',
    target: 3,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 100 }
    ],
    progress: {
      current: 0,
      target: 3
    }
  },
  {
    id: 'daily_clear_2',
    activityId: null,
    period: CHALLENGE_PERIOD_TYPES.DAILY,
    type: CHALLENGE_TASK_TYPES.CLEAR_COUNT,
    name: '每日通关',
    description: '通关任意曲目2次',
    icon: '✅',
    target: 2,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 150 }
    ],
    progress: {
      current: 0,
      target: 2
    }
  },
  {
    id: 'daily_perfect_50',
    activityId: null,
    period: CHALLENGE_PERIOD_TYPES.DAILY,
    type: CHALLENGE_TASK_TYPES.PERFECT_COUNT,
    name: '精准打击',
    description: '累计获得50个Perfect判定',
    icon: '✨',
    target: 50,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 80 }
    ],
    progress: {
      current: 0,
      target: 50
    }
  },
  {
    id: 'daily_combo_30',
    activityId: null,
    period: CHALLENGE_PERIOD_TYPES.DAILY,
    type: CHALLENGE_TASK_TYPES.TARGET_COMBO,
    name: '连击练习',
    description: '单局最高连击达到30',
    icon: '🔥',
    target: 30,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 120 }
    ],
    progress: {
      current: 0,
      target: 30
    }
  }
]

export const WEEKLY_TASKS = [
  {
    id: 'weekly_play_15',
    activityId: 'new_challenge_weekly',
    period: CHALLENGE_PERIOD_TYPES.WEEKLY,
    type: CHALLENGE_TASK_TYPES.PLAY_COUNT,
    name: '勤奋乐手',
    description: '本周累计游玩15次',
    icon: '📈',
    target: 15,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 500 },
      { type: REWARD_TYPES.TITLE, value: 'weekly_dedicated' }
    ],
    progress: {
      current: 0,
      target: 15
    }
  },
  {
    id: 'weekly_clear_hard_3',
    activityId: 'new_challenge_weekly',
    period: CHALLENGE_PERIOD_TYPES.WEEKLY,
    type: CHALLENGE_TASK_TYPES.DIFFICULTY_CLEAR,
    name: '困难征服者',
    description: '通关困难及以上难度曲目3次',
    icon: '💪',
    target: 3,
    difficulty: ['困难', '专家'],
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 400 },
      { type: REWARD_TYPES.BADGE, value: 'hard_master' }
    ],
    progress: {
      current: 0,
      target: 3
    }
  },
  {
    id: 'weekly_score_800k',
    activityId: 'new_challenge_weekly',
    period: CHALLENGE_PERIOD_TYPES.WEEKLY,
    type: CHALLENGE_TASK_TYPES.TARGET_SCORE,
    name: '高分挑战',
    description: '任意曲目单局得分达到800,000',
    icon: '🎯',
    target: 800000,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 600 }
    ],
    progress: {
      current: 0,
      target: 800000
    }
  },
  {
    id: 'weekly_rank_a_5',
    activityId: 'new_challenge_weekly',
    period: CHALLENGE_PERIOD_TYPES.WEEKLY,
    type: CHALLENGE_TASK_TYPES.RANK_ACHIEVE,
    name: 'A级演奏者',
    description: '获得5次A及以上评级',
    icon: '🏅',
    target: 5,
    rank: ['S', 'A'],
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 350 },
      { type: REWARD_TYPES.MULTIPLIER, value: 1.2, duration: 3600000 }
    ],
    progress: {
      current: 0,
      target: 5
    }
  }
]

export const EVENT_TASKS = [
  {
    id: 'event_nebula_score',
    activityId: 'summer_festival_2026',
    period: CHALLENGE_PERIOD_TYPES.EVENT,
    type: CHALLENGE_TASK_TYPES.SPECIFIC_TRACK,
    name: '星云脉冲·高分挑战',
    description: '在「星云脉冲」中获得950,000分以上',
    icon: '🌟',
    trackId: 'nebula',
    minScore: 950000,
    target: 1,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 800 },
      { type: REWARD_TYPES.TITLE, value: 'nebula_master' }
    ],
    progress: {
      current: 0,
      target: 1
    }
  },
  {
    id: 'event_void_no_miss',
    activityId: 'summer_festival_2026',
    period: CHALLENGE_PERIOD_TYPES.EVENT,
    type: CHALLENGE_TASK_TYPES.NO_MISS,
    name: '虚空回响·零失误',
    description: '无Miss通关「虚空回响」',
    icon: '💎',
    trackId: 'void',
    target: 1,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 1000 },
      { type: REWARD_TYPES.ACHIEVEMENT, value: 'void_flawless' }
    ],
    progress: {
      current: 0,
      target: 1
    }
  },
  {
    id: 'event_accuracy_95',
    activityId: 'summer_festival_2026',
    period: CHALLENGE_PERIOD_TYPES.EVENT,
    type: CHALLENGE_TASK_TYPES.TARGET_ACCURACY,
    name: '精准大师',
    description: '任意限定曲目准确度达到95%以上',
    icon: '🎯',
    minAccuracy: 95,
    limitedTracksOnly: true,
    target: 1,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 700 },
      { type: REWARD_TYPES.BADGE, value: 'precision_master' }
    ],
    progress: {
      current: 0,
      target: 1
    }
  },
  {
    id: 'event_play_10',
    activityId: 'summer_festival_2026',
    period: CHALLENGE_PERIOD_TYPES.EVENT,
    type: CHALLENGE_TASK_TYPES.SPECIFIC_TRACK,
    name: '夏日狂欢',
    description: '限定曲目累计游玩10次',
    icon: '🎊',
    trackId: null,
    limitedTracksOnly: true,
    countPlays: true,
    target: 10,
    rewards: [
      { type: REWARD_TYPES.EXP_BONUS, value: 500 },
      { type: REWARD_TYPES.MULTIPLIER, value: 1.5, duration: 7200000 }
    ],
    progress: {
      current: 0,
      target: 10
    }
  }
]

export const EVENT_TITLES = {
  nebula_master: {
    id: 'nebula_master',
    name: '星云征服者',
    icon: '🌌',
    requirement: '夏日活动：星云脉冲挑战达成',
    isEvent: true
  },
  weekly_dedicated: {
    id: 'weekly_dedicated',
    name: '每周勤奋者',
    icon: '⏰',
    requirement: '完成每周挑战',
    isEvent: true
  }
}

export const EVENT_ACHIEVEMENTS = {
  void_flawless: {
    id: 'void_flawless',
    name: '虚空无瑕',
    icon: '💠',
    description: '夏日活动：虚空回响零失误通关'
  }
}

export const EVENT_BADGES = {
  hard_master: {
    id: 'hard_master',
    name: '困难征服者徽章',
    icon: '🛡️'
  },
  precision_master: {
    id: 'precision_master',
    name: '精准大师徽章',
    icon: '🎖️'
  }
}

export const getAllTasks = () => [...DAILY_TASKS, ...WEEKLY_TASKS, ...EVENT_TASKS]

export const getTasksByActivity = (activityId) => {
  const all = getAllTasks()
  if (!activityId) return all.filter(t => !t.activityId)
  return all.filter(t => t.activityId === activityId)
}

export const getActiveActivities = () => ACTIVITIES.filter(a => a.isActive)

export const getPeriodLabel = (period) => {
  const labels = {
    [CHALLENGE_PERIOD_TYPES.DAILY]: '每日',
    [CHALLENGE_PERIOD_TYPES.WEEKLY]: '每周',
    [CHALLENGE_PERIOD_TYPES.EVENT]: '活动'
  }
  return labels[period] || '未知'
}

export const getPeriodColor = (period) => {
  const colors = {
    [CHALLENGE_PERIOD_TYPES.DAILY]: '#00ffcc',
    [CHALLENGE_PERIOD_TYPES.WEEKLY]: '#6699ff',
    [CHALLENGE_PERIOD_TYPES.EVENT]: '#ffcc00'
  }
  return colors[period] || '#fff'
}
