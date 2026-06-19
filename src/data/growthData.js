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

export const BADGE_CATEGORIES = {
  COMBO: 'combo',
  ACCURACY: 'accuracy',
  FLAWLESS: 'flawless',
  COLLECTION: 'collection',
  SPECIAL: 'special'
}

export const BADGE_CATEGORY_INFO = {
  [BADGE_CATEGORIES.COMBO]: {
    name: '连击系列',
    icon: '🔥',
    color: '#ff3366'
  },
  [BADGE_CATEGORIES.ACCURACY]: {
    name: '准度系列',
    icon: '🎯',
    color: '#00ffcc'
  },
  [BADGE_CATEGORIES.FLAWLESS]: {
    name: '无瑕系列',
    icon: '💎',
    color: '#ffcc00'
  },
  [BADGE_CATEGORIES.COLLECTION]: {
    name: '收集系列',
    icon: '📚',
    color: '#6699ff'
  },
  [BADGE_CATEGORIES.SPECIAL]: {
    name: '特殊系列',
    icon: '⭐',
    color: '#cc66ff'
  }
}

export const BADGES = [
  {
    id: 'combo_bronze',
    name: '连击青铜',
    description: '单局最高连击达到50',
    icon: '🥉',
    category: BADGE_CATEGORIES.COMBO,
    rarity: 'common',
    check: (playerData, bestRecords) => playerData.maxComboEver >= 50
  },
  {
    id: 'combo_silver',
    name: '连击白银',
    description: '单局最高连击达到100',
    icon: '🥈',
    category: BADGE_CATEGORIES.COMBO,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => playerData.maxComboEver >= 100
  },
  {
    id: 'combo_gold',
    name: '连击黄金',
    description: '单局最高连击达到200',
    icon: '🥇',
    category: BADGE_CATEGORIES.COMBO,
    rarity: 'rare',
    check: (playerData, bestRecords) => playerData.maxComboEver >= 200
  },
  {
    id: 'combo_platinum',
    name: '连击白金',
    description: '单局最高连击达到300',
    icon: '💠',
    category: BADGE_CATEGORIES.COMBO,
    rarity: 'epic',
    check: (playerData, bestRecords) => playerData.maxComboEver >= 300
  },
  {
    id: 'combo_master',
    name: '连击大师',
    description: '单局最高连击达到500',
    icon: '⚡',
    category: BADGE_CATEGORIES.COMBO,
    rarity: 'legendary',
    check: (playerData, bestRecords) => playerData.maxComboEver >= 500
  },
  {
    id: 'accuracy_bronze',
    name: '准度青铜',
    description: '任意曲目准确率达到85%',
    icon: '🎯',
    category: BADGE_CATEGORIES.ACCURACY,
    rarity: 'common',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.accuracy >= 85)
    }
  },
  {
    id: 'accuracy_silver',
    name: '准度白银',
    description: '任意曲目准确率达到90%',
    icon: '🎯',
    category: BADGE_CATEGORIES.ACCURACY,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.accuracy >= 90)
    }
  },
  {
    id: 'accuracy_gold',
    name: '准度黄金',
    description: '任意曲目准确率达到95%',
    icon: '🎯',
    category: BADGE_CATEGORIES.ACCURACY,
    rarity: 'rare',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.accuracy >= 95)
    }
  },
  {
    id: 'accuracy_platinum',
    name: '准度白金',
    description: '任意曲目准确率达到98%',
    icon: '🎯',
    category: BADGE_CATEGORIES.ACCURACY,
    rarity: 'epic',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.accuracy >= 98)
    }
  },
  {
    id: 'accuracy_master',
    name: '准度大师',
    description: '任意曲目准确率达到100%',
    icon: '🎯',
    category: BADGE_CATEGORIES.ACCURACY,
    rarity: 'legendary',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.accuracy >= 100)
    }
  },
  {
    id: 'flawless_bronze',
    name: '无瑕青铜',
    description: '无Miss通关任意1首曲目',
    icon: '💎',
    category: BADGE_CATEGORIES.FLAWLESS,
    rarity: 'common',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => r.stats.miss === 0 && r.cleared)
    }
  },
  {
    id: 'flawless_silver',
    name: '无瑕白银',
    description: '无Miss通关任意3首曲目',
    icon: '💎',
    category: BADGE_CATEGORIES.FLAWLESS,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      const flawlessTracks = new Set(
        records.filter(r => r.stats.miss === 0 && r.cleared).map(r => r.trackId)
      )
      return flawlessTracks.size >= 3
    }
  },
  {
    id: 'flawless_gold',
    name: '无瑕黄金',
    description: '无Miss通关所有默认曲目',
    icon: '💎',
    category: BADGE_CATEGORIES.FLAWLESS,
    rarity: 'rare',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      const flawlessTracks = new Set(
        records.filter(r => r.stats.miss === 0 && r.cleared).map(r => r.trackId)
      )
      return flawlessTracks.has('nebula') && flawlessTracks.has('void')
    }
  },
  {
    id: 'flawless_hard',
    name: '困难无瑕',
    description: '无Miss通关困难及以上难度曲目',
    icon: '💠',
    category: BADGE_CATEGORIES.FLAWLESS,
    rarity: 'epic',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => 
        r.stats.miss === 0 && r.cleared && 
        (r.difficulty === '困难' || r.difficulty === '专家')
      )
    }
  },
  {
    id: 'perfect_full',
    name: '全Perfect',
    description: '任意曲目全为Perfect判定',
    icon: '✨',
    category: BADGE_CATEGORIES.FLAWLESS,
    rarity: 'legendary',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      return records.some(r => 
        r.stats.great === 0 && r.stats.good === 0 && r.stats.miss === 0 && r.cleared)
    }
  },
  {
    id: 'collection_bronze',
    name: '收集青铜',
    description: '通关3首不同曲目',
    icon: '📚',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'common',
    check: (playerData, bestRecords) => {
      const clearedTracks = new Set(
        Object.values(bestRecords).filter(r => r.cleared).map(r => r.trackId)
      )
      return clearedTracks.size >= 3
    }
  },
  {
    id: 'collection_silver',
    name: '收集白银',
    description: '通关5首不同曲目',
    icon: '📚',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => {
      const clearedTracks = new Set(
        Object.values(bestRecords).filter(r => r.cleared).map(r => r.trackId)
      )
      return clearedTracks.size >= 5
    }
  },
  {
    id: 'collection_gold',
    name: '收集黄金',
    description: '通关10首不同曲目',
    icon: '📚',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'rare',
    check: (playerData, bestRecords) => {
      const clearedTracks = new Set(
        Object.values(bestRecords).filter(r => r.cleared).map(r => r.trackId)
      )
      return clearedTracks.size >= 10
    }
  },
  {
    id: 'all_default_cleared',
    name: '全曲制霸',
    description: '通关所有默认曲目',
    icon: '👑',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'epic',
    check: (playerData, bestRecords) => {
      const clearedTracks = new Set(
        Object.values(bestRecords).filter(r => r.cleared).map(r => r.trackId)
      )
      return clearedTracks.has('nebula') && clearedTracks.has('void')
    }
  },
  {
    id: 'all_difficulties',
    name: '全难度征服',
    description: '在所有难度都有通关记录',
    icon: '🏆',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'epic',
    check: (playerData, bestRecords) => {
      const difficulties = new Set(
        Object.values(bestRecords).filter(r => r.cleared).map(r => r.difficulty)
      )
      return difficulties.has('简单') && difficulties.has('普通') && 
             difficulties.has('困难') && difficulties.has('专家')
    }
  },
  {
    id: 'full_combo_all_default',
    name: '全连达人',
    description: '所有默认曲目全连达成',
    icon: '🌟',
    category: BADGE_CATEGORIES.COLLECTION,
    rarity: 'legendary',
    check: (playerData, bestRecords) => {
      const records = Object.values(bestRecords)
      const nebulaFC = records.some(r => r.trackId === 'nebula' && r.stats.miss === 0 && r.cleared)
      const voidFC = records.some(r => r.trackId === 'void' && r.stats.miss === 0 && r.cleared)
      return nebulaFC && voidFC
    }
  },
  {
    id: 'first_play',
    name: '初次邂逅',
    description: '完成第一次游戏',
    icon: '🎵',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'common',
    check: (playerData, bestRecords) => playerData.playCount >= 1
  },
  {
    id: 'play_10',
    name: '初窥门径',
    description: '累计游玩10次',
    icon: '🎶',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'common',
    check: (playerData, bestRecords) => playerData.playCount >= 10
  },
  {
    id: 'play_50',
    name: '勤奋乐手',
    description: '累计游玩50次',
    icon: '🎶',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => playerData.playCount >= 50
  },
  {
    id: 'play_100',
    name: '节奏狂热',
    description: '累计游玩100次',
    icon: '🎶',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'rare',
    check: (playerData, bestRecords) => playerData.playCount >= 100
  },
  {
    id: 'rank_s',
    name: 'S级徽章',
    description: '获得S评级徽章',
    icon: '🏅',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'rare',
    check: (playerData, bestRecords) => {
      return Object.values(bestRecords).some(r => r.rank === 'S')
    }
  },
  {
    id: 'speed_dedicated',
    name: '专注玩家',
    description: '连续游玩超过7天',
    icon: '📅',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'uncommon',
    check: (playerData, bestRecords) => {
      if (!playerData.firstPlayDate) return false
      const days = Math.ceil((Date.now() - new Date(playerData.firstPlayDate).getTime()) / (1000 * 60 * 60 * 24))
      return days >= 7 && playerData.playCount >= 7
    }
  },
  {
    id: 'perfect_1000',
    name: '千次完美',
    description: '累计获得1000个Perfect判定',
    icon: '✨',
    category: BADGE_CATEGORIES.SPECIAL,
    rarity: 'epic',
    check: (playerData, bestRecords) => playerData.totalStats.perfect >= 1000
  }
]

export const BADGE_RARITY_INFO = {
  common: { name: '普通', color: '#999999', bgColor: 'rgba(153,153,153,0.15)' },
  uncommon: { name: '稀有', color: '#66ff99', bgColor: 'rgba(102,255,153,0.15)' },
  rare: { name: '珍稀', color: '#6699ff', bgColor: 'rgba(102,153,255,0.15)' },
  epic: { name: '史诗', color: '#cc66ff', bgColor: 'rgba(204,102,255,0.15)' },
  legendary: { name: '传说', color: '#ffcc00', bgColor: 'rgba(255,204,0,0.15)' }
}

export const DIFFICULTY_WEIGHT = {
  '简单': 1.0,
  '普通': 1.2,
  '困难': 1.5,
  '专家': 2.0
}
