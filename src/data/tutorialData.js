import { semitonesFromRoot } from './tracks.js'

const TUTORIAL_STORAGE_KEY = 'rhythm_circle_tutorial_completed'

export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: '欢迎来到圈层节奏',
    subtitle: '让我们开始你的音乐之旅',
    type: 'intro',
    content: [
      '🎵 圈层节奏是一款4键位的音乐节奏游戏',
      '🎯 通过准确按下对应按键来击中下落的音符',
      '✨ 跟着节拍，创造完美的演奏！',
    ],
    buttonText: '开始学习',
  },
  {
    id: 'track_select',
    title: '第一步：选择曲目',
    subtitle: '点击下方卡片选择一首歌',
    type: 'track_select',
    highlight: 'trackList',
    content: [
      '📋 左侧列表显示所有可用曲目',
      '🎚️ 每首歌都有不同的难度等级',
      '👆 点击卡片选中，然后点击"开始演奏"',
      '💡 建议新手从【普通】难度开始',
    ],
    buttonText: '我知道了',
  },
  {
    id: 'key_settings',
    title: '第二步：设置键位',
    subtitle: '点击右上角"⚙ 键位设置"',
    type: 'key_settings',
    highlight: 'settingsBtn',
    content: [
      '⌨️ 默认键位是 D、F、J、K',
      '🎨 每个轨道有不同的颜色标识',
      '🔧 你可以自定义按键和颜色',
      '💡 建议使用你最舒适的手指位置',
    ],
    buttonText: '去设置键位',
  },
  {
    id: 'judge_explain',
    title: '第三步：了解判定',
    subtitle: '不同的时机有不同的判定',
    type: 'judge',
    content: [
      { type: 'perfect', label: 'PERFECT', color: '#ffcc00', desc: '完美命中，获得最高分', window: '±50ms' },
      { type: 'great', label: 'GREAT', color: '#00ffcc', desc: '优秀，稍微偏差', window: '±100ms' },
      { type: 'good', label: 'GOOD', color: '#6699ff', desc: '不错，明显偏差', window: '±160ms' },
      { type: 'miss', label: 'MISS', color: '#ff3366', desc: '错过，没有击中', window: '>±220ms' },
    ],
    buttonText: '明白了',
  },
  {
    id: 'practice_intro',
    title: '第四步：试打教学',
    subtitle: '我们将进行一次简单的试打练习',
    type: 'practice',
    content: [
      '🎮 接下来会进入教学模式',
      '📝 音符会放慢速度，并且有提示',
      '💪 跟着引导，尝试击中每个音符',
      '🎯 不用担心失误，这只是练习！',
    ],
    buttonText: '开始试打',
  },
  {
    id: 'complete',
    title: '恭喜完成教学！',
    subtitle: '你已经准备好开始正式游戏了',
    type: 'complete',
    content: [
      '🎉 你已经掌握了基本操作',
      '🚀 现在可以挑战更多曲目',
      '📈 不断提高分数，解锁成就',
      '🏆 成为圈层节奏大师！',
    ],
    buttonText: '开始游戏',
  },
]

export const JUDGE_WINDOWS = {
  perfect: 0.05,
  great: 0.10,
  good: 0.16,
  miss: 0.22,
}

export const SCORE_VALUES = {
  perfect: 1000,
  great: 700,
  good: 400,
  miss: 0,
}

function generateTutorialTrack() {
  const bpm = 90
  const beat = 60 / bpm
  const bar = beat * 4
  const totalBars = 8
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
        velocity: 0.25 + i * 0.05,
      })
    })

    bass.push({
      time: barStart,
      duration: bar * 0.8,
      note: semitonesFromRoot(root, chordRoot - 24),
      velocity: 0.6,
    })

    for (let beatIdx = 0; beatIdx < 4; beatIdx++) {
      const t = barStart + beatIdx * beat
      drums.push({ time: t, type: beatIdx % 2 === 0 ? 'kick' : 'snare', velocity: 0.7 })
      drums.push({ time: t + beat * 0.5, type: 'hihat', velocity: 0.3 })
    }

    const notesInBar = [
      { offset: 0, lane: 0 },
      { offset: 1, lane: 1 },
      { offset: 2, lane: 2 },
      { offset: 3, lane: 3 },
    ]

    notesInBar.forEach((n, i) => {
      const t = barStart + n.offset * beat
      const degree = (i + barIdx) % scale.length
      lead.push({
        time: t,
        duration: beat * 0.45,
        note: semitonesFromRoot(root, scale[degree]),
        velocity: 0.35,
      })

      gameNotes.push({
        id: noteId++,
        time: t,
        lane: n.lane,
        type: 'normal',
        isTutorial: true,
      })
    })

    if (barIdx >= 4) {
      const extraNotes = [
        { offset: 0.5, lane: 1 },
        { offset: 1.5, lane: 2 },
        { offset: 2.5, lane: 1 },
        { offset: 3.5, lane: 2 },
      ]
      extraNotes.forEach((n, i) => {
        const t = barStart + n.offset * beat
        lead.push({
          time: t,
          duration: beat * 0.3,
          note: semitonesFromRoot(root, scale[(i + 2) % scale.length]),
          velocity: 0.3,
        })
        gameNotes.push({
          id: noteId++,
          time: t,
          lane: n.lane,
          type: 'normal',
          isTutorial: true,
        })
      })
    }
  }

  for (let i = 0; i < 4; i++) {
    const t = totalDuration - bar + i * (beat / 2)
    gameNotes.push({
      id: noteId++,
      time: t,
      lane: i,
      type: 'normal',
      isTutorial: true,
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
    gameNotes,
  }
}

const tutorialTrackData = generateTutorialTrack()

export const tutorialTrack = {
  id: 'tutorial',
  title: '教学练习曲',
  artist: '新手引导',
  bpm: tutorialTrackData.bpm,
  difficulty: '教学',
  level: 1,
  duration: tutorialTrackData.duration,
  synth: {
    leadOsc: 'sine',
    bassOsc: 'sine',
    padOsc: 'triangle',
    root: 'C4',
  },
  notes: tutorialTrackData.gameNotes,
  songData: {
    lead: tutorialTrackData.lead,
    bass: tutorialTrackData.bass,
    chords: tutorialTrackData.chords,
    drums: tutorialTrackData.drums,
  },
  totalNotes: tutorialTrackData.gameNotes.length,
  isTutorial: true,
}

export const isTutorialCompleted = () => {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true'
  } catch (e) {
    return false
  }
}

export const setTutorialCompleted = (completed = true) => {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(completed))
  } catch (e) {
    console.error('Failed to save tutorial state:', e)
  }
}

export const resetTutorial = () => {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch (e) {
    console.error('Failed to reset tutorial:', e)
  }
}
