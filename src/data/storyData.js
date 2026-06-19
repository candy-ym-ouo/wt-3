export const CHAPTERS = [
  {
    id: 'chapter1',
    title: '第一章：初遇节奏',
    subtitle: '命运的音符开始跳动',
    description: '在这个充满音乐的世界里，你意外发现了一座神秘的节奏塔。传说中，只要能够征服所有关卡，就能唤醒沉睡的节奏之神...',
    icon: '🎵',
    color: '#66ff99',
    gradient: ['#0a2a1a', '#0d3d20'],
    unlockCondition: { type: 'none' },
    storyBefore: '你站在节奏塔的入口，古老的石门上刻满了音符。一阵微风吹过，仿佛有旋律在空气中流动。深吸一口气，你踏入了这段未知的旅程...',
    storyAfter: '第一关的音符在你指尖流淌，你感受到了节奏的脉动。远处，更深处的光芒在闪烁，仿佛在召唤着你继续前进...',
    rewards: {
      exp: 200,
      title: '节奏探索者',
      badge: 'chapter1_clear'
    }
  },
  {
    id: 'chapter2',
    title: '第二章：霓虹都市',
    subtitle: '赛博朋克的夜曲',
    description: '穿越节奏塔的第一层后，你来到了一座霓虹闪烁的未来都市。这里的居民都在用音乐交流，而城市的中心似乎隐藏着更大的秘密...',
    icon: '🌃',
    color: '#ff66cc',
    gradient: ['#2a0a1a', '#3d0d28'],
    unlockCondition: { type: 'chapterClear', chapterId: 'chapter1' },
    storyBefore: '霓虹灯光在雨后的街道上折射出七彩光芒。你听到远处传来强烈的贝斯声，那是城市的心跳。跟着节奏，深入这座不夜城吧。',
    storyAfter: '当最后一个音符落下，整座城市的霓虹灯同时亮起，仿佛在为你喝彩。你发现了一张古老的地图，上面标记着下一个目的地...',
    rewards: {
      exp: 500,
      title: '霓虹漫步者',
      badge: 'chapter2_clear'
    }
  },
  {
    id: 'chapter3',
    title: '第三章：星际迷航',
    subtitle: '宇宙深处的回响',
    description: '根据地图的指引，你来到了一座废弃的太空站。传说这里曾是宇宙最伟大音乐家的居所，他留下的乐谱据说能穿越时空...',
    icon: '🚀',
    color: '#6699ff',
    gradient: ['#0a1a2a', '#0d283d'],
    unlockCondition: { type: 'chapterClear', chapterId: 'chapter2' },
    storyBefore: '失重的感觉让你有些不适应，但周围漂浮的音符让你很快平静下来。在星空的背景下，每一个节拍都像是一颗超新星的爆发...',
    storyAfter: '当最后一个回响消散，你看到了宇宙的全貌。原来每一颗星星都是一个音符，整个宇宙就是一首永不停歇的交响曲。',
    rewards: {
      exp: 800,
      title: '星际旅者',
      badge: 'chapter3_clear'
    }
  },
  {
    id: 'chapter4',
    title: '第四章：虚空深渊',
    subtitle: '最终的考验',
    description: '在宇宙的尽头，存在着一片虚空。据说只有真正的节奏大师才能在虚空中保持自我，而那里沉睡着传说中的节奏之神...',
    icon: '🌀',
    color: '#cc66ff',
    gradient: ['#1a0a2a', '#280d3d'],
    unlockCondition: { type: 'chapterClear', chapterId: 'chapter3' },
    storyBefore: '虚空之中，一切声音都在消散。你必须用内心的节奏对抗这片寂静。记住，音乐不在外界，而在你心中...',
    storyAfter: '当你奏响了属于自己的最终乐章，虚空开始崩塌，光明重新降临。节奏之神在光芒中微笑，你已成为新的传说...',
    rewards: {
      exp: 1500,
      title: '节奏之神',
      badge: 'chapter4_clear'
    }
  }
]

export const STAGES = [
  {
    id: 'stage1_1',
    chapterId: 'chapter1',
    stageNumber: 1,
    title: '初醒之音',
    description: '一切的开始，让我们先熟悉最基础的节奏。',
    trackId: 'crystal_dream',
    difficultyId: 'easy',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true }
    ],
    rewards: {
      exp: 50,
      coins: 100
    },
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '欢迎来到节奏塔，年轻的旅人。' },
        { speaker: '神秘声音', text: '在这里，音乐就是力量，节奏就是生命。' },
        { speaker: '你', text: '你是谁？我为什么会在这里？' },
        { speaker: '神秘声音', text: '答案需要你自己去寻找。先通过这第一关吧。' }
      ],
      after: [
        { speaker: '神秘声音', text: '做得好！你果然有天赋。' },
        { speaker: '神秘声音', text: '继续前进吧，更多挑战在等着你。' }
      ]
    }
  },
  {
    id: 'stage1_2',
    chapterId: 'chapter1',
    stageNumber: 2,
    title: '星云初探',
    description: '难度稍有提升，注意观察音符的规律。',
    trackId: 'nebula',
    difficultyId: 'easy',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'accuracy', value: 70, description: '准确率达到70%以上', required: false, bonus: true }
    ],
    rewards: {
      exp: 80,
      coins: 150
    },
    bonusRewards: {
      exp: 30,
      coins: 50
    },
    dialogue: {
      before: [
        { speaker: '你', text: '这星云...好美啊。' },
        { speaker: '神秘声音', text: '星云之中隐藏着古老的节奏密码。' },
        { speaker: '神秘声音', text: '试着感受它的脉动。' }
      ],
      after: [
        { speaker: '你', text: '我感觉到了...那种流动的感觉。' },
        { speaker: '神秘声音', text: '很好，你正在逐渐觉醒。' }
      ]
    }
  },
  {
    id: 'stage1_3',
    chapterId: 'chapter1',
    stageNumber: 3,
    title: '脉冲试炼',
    description: '第一章的最终考验，拿出你的全部实力！',
    trackId: 'nebula',
    difficultyId: 'normal',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'rank', value: 'C', description: '获得C级以上评价', required: true },
      { type: 'combo', value: 30, description: '最高连击达到30', required: false, bonus: true }
    ],
    rewards: {
      exp: 120,
      coins: 200
    },
    bonusRewards: {
      exp: 50,
      coins: 80
    },
    isBoss: true,
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '这是第一章的最终试炼。' },
        { speaker: '神秘声音', text: '通过它，你将正式成为节奏行者。' },
        { speaker: '你', text: '我准备好了！' }
      ],
      after: [
        { speaker: '神秘声音', text: '恭喜你，第一章完成！' },
        { speaker: '神秘声音', text: '霓虹都市的大门已为你敞开。' }
      ]
    }
  },
  {
    id: 'stage2_1',
    chapterId: 'chapter2',
    stageNumber: 1,
    title: '雨夜漫步',
    description: '霓虹都市的第一站，感受都市的节奏。',
    trackId: 'neon_runner',
    difficultyId: 'normal',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true }
    ],
    rewards: {
      exp: 100,
      coins: 180
    },
    dialogue: {
      before: [
        { speaker: '你', text: '哇，这就是霓虹都市吗？好壮观！' },
        { speaker: '神秘声音', text: '这里是音乐与科技的交汇处。' },
        { speaker: '神秘声音', text: '跟上城市的节拍吧。' }
      ],
      after: [
        { speaker: '你', text: '城市的节奏...让人兴奋！' },
        { speaker: '神秘声音', text: '继续深入，你会发现更多。' }
      ]
    }
  },
  {
    id: 'stage2_2',
    chapterId: 'chapter2',
    stageNumber: 2,
    title: '极速狂奔',
    description: '加快速度，体验肾上腺素飙升的感觉！',
    trackId: 'neon_runner',
    difficultyId: 'hard',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'accuracy', value: 75, description: '准确率达到75%以上', required: false, bonus: true }
    ],
    rewards: {
      exp: 150,
      coins: 250
    },
    bonusRewards: {
      exp: 60,
      coins: 100
    },
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '准备好了吗？接下来会很快。' },
        { speaker: '你', text: '越快越好！我喜欢挑战！' }
      ],
      after: [
        { speaker: '你', text: '呼...好刺激！' },
        { speaker: '神秘声音', text: '你的反应速度提升了不少。' }
      ]
    }
  },
  {
    id: 'stage2_3',
    chapterId: 'chapter2',
    stageNumber: 3,
    title: '虚空回响',
    description: '都市最深处的秘密，虚空的力量正在觉醒。',
    trackId: 'void',
    difficultyId: 'normal',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'rank', value: 'B', description: '获得B级以上评价', required: true },
      { type: 'combo', value: 50, description: '最高连击达到50', required: false, bonus: true }
    ],
    rewards: {
      exp: 200,
      coins: 300
    },
    bonusRewards: {
      exp: 80,
      coins: 120
    },
    isBoss: true,
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '小心，这里的虚空力量很强。' },
        { speaker: '神秘声音', text: '不要被黑暗吞噬了你的节奏。' },
        { speaker: '你', text: '我不会输的！' }
      ],
      after: [
        { speaker: '神秘声音', text: '太惊人了...你居然征服了虚空。' },
        { speaker: '神秘声音', text: '看来你有资格前往星际。' }
      ]
    }
  },
  {
    id: 'stage3_1',
    chapterId: 'chapter3',
    stageNumber: 1,
    title: '宇宙尘埃',
    description: '漂浮在宇宙中，感受时间的缓慢流逝。',
    trackId: 'cosmic_dust',
    difficultyId: 'easy',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true }
    ],
    rewards: {
      exp: 120,
      coins: 200
    },
    dialogue: {
      before: [
        { speaker: '你', text: '宇宙...好安静。' },
        { speaker: '神秘声音', text: '安静中蕴含着无限可能。' },
        { speaker: '神秘声音', text: '用你的音乐点亮这片星空吧。' }
      ],
      after: [
        { speaker: '你', text: '每一粒尘埃都在闪光...' },
        { speaker: '神秘声音', text: '那是你的音符在闪耀。' }
      ]
    }
  },
  {
    id: 'stage3_2',
    chapterId: 'chapter3',
    stageNumber: 2,
    title: '星云进阶',
    description: '在星云中锤炼你的技巧。',
    trackId: 'nebula',
    difficultyId: 'hard',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'rank', value: 'B', description: '获得B级以上评价', required: false, bonus: true }
    ],
    rewards: {
      exp: 200,
      coins: 300
    },
    bonusRewards: {
      exp: 80,
      coins: 120
    },
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '星云的力量会考验你的极限。' },
        { speaker: '你', text: '让暴风雨来得更猛烈些吧！' }
      ],
      after: [
        { speaker: '神秘声音', text: '你的光芒已经盖过了星云。' },
        { speaker: '神秘声音', text: '继续向宇宙深处前进吧。' }
      ]
    }
  },
  {
    id: 'stage3_3',
    chapterId: 'chapter3',
    stageNumber: 3,
    title: '星际风暴',
    description: '第三章的最终考验，穿越星际风暴！',
    trackId: 'void',
    difficultyId: 'hard',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'rank', value: 'A', description: '获得A级以上评价', required: true },
      { type: 'combo', value: 100, description: '最高连击达到100', required: false, bonus: true }
    ],
    rewards: {
      exp: 300,
      coins: 500
    },
    bonusRewards: {
      exp: 120,
      coins: 200
    },
    isBoss: true,
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '这是星际中最猛烈的风暴。' },
        { speaker: '神秘声音', text: '只有最强的节奏才能穿越它。' },
        { speaker: '你', text: '我会证明给你看的！' }
      ],
      after: [
        { speaker: '神秘声音', text: '不可思议...你真的做到了！' },
        { speaker: '神秘声音', text: '虚空深渊就在前方，那里是最终的考验。' }
      ]
    }
  },
  {
    id: 'stage4_1',
    chapterId: 'chapter4',
    stageNumber: 1,
    title: '深渊边缘',
    description: '站在虚空的边缘，你感受到了什么？',
    trackId: 'void',
    difficultyId: 'expert',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true }
    ],
    rewards: {
      exp: 350,
      coins: 550
    },
    dialogue: {
      before: [
        { speaker: '你', text: '这里...好黑。' },
        { speaker: '神秘声音', text: '虚空会吞噬一切声音。' },
        { speaker: '神秘声音', text: '但只要你的心在跳动，音乐就不会消失。' }
      ],
      after: [
        { speaker: '你', text: '我...听到了自己的心跳。' },
        { speaker: '神秘声音', text: '那就是最强大的节奏。' }
      ]
    }
  },
  {
    id: 'stage4_2',
    chapterId: 'chapter4',
    stageNumber: 2,
    title: '虚空之心',
    description: '深入虚空，找到它的核心。',
    trackId: 'neon_runner',
    difficultyId: 'expert',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'accuracy', value: 80, description: '准确率达到80%以上', required: false, bonus: true }
    ],
    rewards: {
      exp: 400,
      coins: 600
    },
    bonusRewards: {
      exp: 150,
      coins: 250
    },
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '虚空的核心就在前方。' },
        { speaker: '神秘声音', text: '记住，用你的心去感受，而不是耳朵。' }
      ],
      after: [
        { speaker: '你', text: '原来...虚空本身就是一首歌。' },
        { speaker: '神秘声音', text: '你终于领悟了。' }
      ]
    }
  },
  {
    id: 'stage4_3',
    chapterId: 'chapter4',
    stageNumber: 3,
    title: '最终乐章',
    description: '最终的决战，奏响属于你的乐章！',
    trackId: 'void',
    difficultyId: 'expert',
    objectives: [
      { type: 'clear', description: '通关曲目', required: true },
      { type: 'rank', value: 'S', description: '获得S级评价', required: true },
      { type: 'noMiss', description: '无Miss通关', required: false, bonus: true }
    ],
    rewards: {
      exp: 600,
      coins: 1000
    },
    bonusRewards: {
      exp: 300,
      coins: 500
    },
    isBoss: true,
    isFinal: true,
    dialogue: {
      before: [
        { speaker: '神秘声音', text: '这是最后的考验了。' },
        { speaker: '神秘声音', text: '节奏之神在等待着真正的继承者。' },
        { speaker: '你', text: '我已经准备好了。' },
        { speaker: '你', text: '让我奏响...最终乐章！' }
      ],
      after: [
        { speaker: '节奏之神', text: '千年了...终于有人能够演奏我的乐章。' },
        { speaker: '节奏之神', text: '年轻人，你愿意成为新的节奏守护者吗？' },
        { speaker: '你', text: '我愿意！' },
        { speaker: '节奏之神', text: '很好...从此，你就是新的...节奏之神。' }
      ]
    }
  }
]

export const OBJECTIVE_TYPES = {
  CLEAR: 'clear',
  ACCURACY: 'accuracy',
  COMBO: 'combo',
  RANK: 'rank',
  NO_MISS: 'noMiss',
  SCORE: 'score'
}

export const CHAPTER_BADGES = {
  chapter1_clear: {
    id: 'chapter1_clear',
    name: '第一章通关',
    description: '完成第一章：初遇节奏',
    icon: '🎵',
    rarity: 'common'
  },
  chapter2_clear: {
    id: 'chapter2_clear',
    name: '第二章通关',
    description: '完成第二章：霓虹都市',
    icon: '🌃',
    rarity: 'uncommon'
  },
  chapter3_clear: {
    id: 'chapter3_clear',
    name: '第三章通关',
    description: '完成第三章：星际迷航',
    icon: '🚀',
    rarity: 'rare'
  },
  chapter4_clear: {
    id: 'chapter4_clear',
    name: '第四章通关',
    description: '完成第四章：虚空深渊',
    icon: '🌀',
    rarity: 'legendary'
  }
}

export const getChapterById = (id) => CHAPTERS.find(c => c.id === id)
export const getStageById = (id) => STAGES.find(s => s.id === id)
export const getStagesByChapter = (chapterId) => STAGES.filter(s => s.chapterId === chapterId)

export const checkObjectiveComplete = (objective, result) => {
  switch (objective.type) {
    case 'clear':
      return result.cleared
    case 'accuracy':
      return result.cleared && result.accuracy >= objective.value
    case 'combo':
      return result.cleared && result.maxCombo >= objective.value
    case 'rank':
      if (!result.cleared) return false
      const rankOrder = ['S', 'A', 'B', 'C', 'D']
      const targetIndex = rankOrder.indexOf(objective.value)
      const actualIndex = rankOrder.indexOf(result.rank)
      return actualIndex <= targetIndex && actualIndex !== -1
    case 'noMiss':
      return result.cleared && result.stats.miss === 0
    case 'score':
      return result.cleared && result.score >= objective.value
    default:
      return false
  }
}
