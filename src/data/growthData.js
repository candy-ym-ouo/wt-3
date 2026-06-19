export const LEVEL_CURVE = Array.from({ length: 100 }, (_, i) => {
  const level = i + 1
  return Math.floor(100 * Math.pow(level, 1.5))
})

export const EXP_PERFECT = 10
export const EXP_GREAT = 7
export const EXP_GOOD = 4
export const EXP_MISS = 0
export const EXP_CLEAR_BONUS = 50
export const EXP_RANK_BONUS = {
  S: 200,
  A: 150,
  B: 100,
  C: 60,
  D: 20
}

export const RANK_THRESHOLDS = {
  S: 95,
  A: 90,
  B: 80,
  C: 70,
  D: 0
}

export const ACHIEVEMENTS = [
  {
    id: 'first_clear',
    name: '初出茅庐',
    description: '完成第一首曲目',
    icon: '🎵',
    check: (playerData) => playerData.trackRecords.length >= 1
  },
  {
    id: 'perfect_10',
    name: '完美初学者',
    description: '累计获得10个Perfect判定',
    icon: '✨',
    check: (playerData) => playerData.totalStats.perfect >= 10
  },
  {
    id: 'perfect_100',
    name: '完美猎手',
    description: '累计获得100个Perfect判定',
    icon: '🌟',
    check: (playerData) => playerData.totalStats.perfect >= 100
  },
  {
    id: 'perfect_500',
    name: '完美大师',
    description: '累计获得500个Perfect判定',
    icon: '💫',
    check: (playerData) => playerData.totalStats.perfect >= 500
  },
  {
    id: 'combo_50',
    name: '连击新星',
    description: '最高连击达到50',
    icon: '🔥',
    check: (playerData) => playerData.maxComboEver >= 50
  },
  {
    id: 'combo_100',
    name: '连击达人',
    description: '最高连击达到100',
    icon: '💥',
    check: (playerData) => playerData.maxComboEver >= 100
  },
  {
    id: 'combo_200',
    name: '连击传奇',
    description: '最高连击达到200',
    icon: '⚡',
    check: (playerData) => playerData.maxComboEver >= 200
  },
  {
    id: 'rank_s',
    name: 'S级演奏家',
    description: '获得首个S评级',
    icon: '🏆',
    check: (playerData) => playerData.trackRecords.some(r => r.rank === 'S')
  },
  {
    id: 'all_ranks',
    name: '评级收藏家',
    description: '获得S、A、B、C、D所有评级',
    icon: '🎖️',
    check: (playerData) => {
      const ranks = new Set(playerData.trackRecords.map(r => r.rank))
      return ['S', 'A', 'B', 'C', 'D'].every(r => ranks.has(r))
    }
  },
  {
    id: 'clear_5',
    name: '节奏探索者',
    description: '通关5首不同曲目',
    icon: '🎼',
    check: (playerData) => {
      const cleared = new Set(playerData.trackRecords.filter(r => r.cleared).map(r => r.trackId))
      return cleared.size >= 5
    }
  },
  {
    id: 'clear_all_default',
    name: '默认曲目制霸',
    description: '通关所有默认曲目',
    icon: '👑',
    check: (playerData) => {
      const cleared = new Set(playerData.trackRecords.filter(r => r.cleared).map(r => r.trackId))
      return cleared.has('nebula') && cleared.has('void')
    }
  },
  {
    id: 'level_5',
    name: '进阶玩家',
    description: '等级达到5级',
    icon: '⭐',
    check: (playerData) => playerData.level >= 5
  },
  {
    id: 'level_10',
    name: '资深玩家',
    description: '等级达到10级',
    icon: '🌟',
    check: (playerData) => playerData.level >= 10
  },
  {
    id: 'level_20',
    name: '大师级玩家',
    description: '等级达到20级',
    icon: '🔮',
    check: (playerData) => playerData.level >= 20
  },
  {
    id: 'no_miss',
    name: '零失误挑战',
    description: '无Miss通关任意曲目',
    icon: '💎',
    check: (playerData) => playerData.trackRecords.some(r => r.stats.miss === 0 && r.cleared)
  },
  {
    id: 'play_count_10',
    name: '勤奋练习生',
    description: '累计游玩10次',
    icon: '📈',
    check: (playerData) => playerData.playCount >= 10
  },
  {
    id: 'play_count_50',
    name: '节奏狂热者',
    description: '累计游玩50次',
    icon: '🎯',
    check: (playerData) => playerData.playCount >= 50
  }
]

export const TITLES = [
  {
    id: 'rookie',
    name: '节奏新手',
    requirement: '等级1',
    icon: '🎵',
    check: (playerData) => playerData.level >= 1
  },
  {
    id: 'explorer',
    name: '音乐探险家',
    requirement: '等级5',
    icon: '🎶',
    check: (playerData) => playerData.level >= 5
  },
  {
    id: 'performer',
    name: '舞台表演者',
    requirement: '等级10',
    icon: '🎤',
    check: (playerData) => playerData.level >= 10
  },
  {
    id: 'veteran',
    name: '资深节奏师',
    requirement: '等级20',
    icon: '🎸',
    check: (playerData) => playerData.level >= 20
  },
  {
    id: 'master',
    name: '节奏大师',
    requirement: '等级30',
    icon: '🎹',
    check: (playerData) => playerData.level >= 30
  },
  {
    id: 'legend',
    name: '传奇演奏家',
    requirement: '等级50',
    icon: '🎻',
    check: (playerData) => playerData.level >= 50
  },
  {
    id: 'combo_king',
    name: '连击之王',
    requirement: '最高连击200',
    icon: '⚡',
    check: (playerData) => playerData.maxComboEver >= 200
  },
  {
    id: 's_rank',
    name: 'S级猎手',
    requirement: '获得S评级',
    icon: '🏆',
    check: (playerData) => playerData.trackRecords.some(r => r.rank === 'S')
  },
  {
    id: 'perfect_machine',
    name: '完美机器',
    requirement: '累计500个Perfect',
    icon: '💫',
    check: (playerData) => playerData.totalStats.perfect >= 500
  },
  {
    id: 'clear_master',
    name: '曲目制霸者',
    requirement: '通关所有默认曲目',
    icon: '👑',
    check: (playerData) => {
      const cleared = new Set(playerData.trackRecords.filter(r => r.cleared).map(r => r.trackId))
      return cleared.has('nebula') && cleared.has('void')
    }
  }
]

export const RANK_COLORS = {
  S: '#ffcc00',
  A: '#ff3366',
  B: '#00ffcc',
  C: '#6699ff',
  D: '#999999'
}

export const DIFFICULTY_WEIGHT = {
  '简单': 1.0,
  '普通': 1.2,
  '困难': 1.5,
  '专家': 2.0
}
