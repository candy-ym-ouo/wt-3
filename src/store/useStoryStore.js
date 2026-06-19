import { useState, useCallback, useEffect } from 'react'
import {
  CHAPTERS,
  STAGES,
  getChapterById,
  getStageById,
  getStagesByChapter,
  checkObjectiveComplete,
  CHAPTER_BADGES
} from '../data/storyData.js'

const STORAGE_KEY = 'rhythm_circle_story_data'

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.error(`Failed to load ${key}:`, e)
  }
  return defaultValue
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to save ${key}:`, e)
  }
}

const defaultStoryData = {
  currentChapter: null,
  currentStage: null,
  completedStages: {},
  chapterProgress: {},
  totalCoins: 0,
  storyUnlockedChapters: ['chapter1'],
  unlockedBadges: [],
  unlockedTitles: [],
  dialogueShown: {},
  retryCount: {},
  bestStageRecords: {}
}

export function useStoryStore() {
  const [storyData, setStoryData] = useState(() => {
    return { ...defaultStoryData, ...loadFromStorage(STORAGE_KEY, {}) }
  })

  const [storyResult, setStoryResult] = useState(null)
  const [showDialogue, setShowDialogue] = useState(null)

  useEffect(() => {
    saveToStorage(STORAGE_KEY, storyData)
  }, [storyData])

  const isStageUnlocked = useCallback((stageId) => {
    const stage = getStageById(stageId)
    if (!stage) return false

    const stages = getStagesByChapter(stage.chapterId)
    const stageIndex = stages.findIndex(s => s.id === stageId)

    if (stageIndex === 0) {
      return isChapterUnlocked(stage.chapterId)
    }

    const prevStage = stages[stageIndex - 1]
    return !!storyData.completedStages[prevStage.id]
  }, [storyData])

  const isChapterUnlocked = useCallback((chapterId) => {
    const chapter = getChapterById(chapterId)
    if (!chapter) return false

    if (storyData.storyUnlockedChapters.includes(chapterId)) {
      return true
    }

    const condition = chapter.unlockCondition
    if (!condition || condition.type === 'none') return true

    switch (condition.type) {
      case 'chapterClear':
        return !!storyData.chapterProgress[condition.chapterId]?.completed
      default:
        return false
    }
  }, [storyData])

  const getChapterProgress = useCallback((chapterId) => {
    const stages = getStagesByChapter(chapterId)
    const completedCount = stages.filter(s => storyData.completedStages[s.id]).length
    const totalCount = stages.length
    const isCompleted = completedCount === totalCount && totalCount > 0

    return {
      completedCount,
      totalCount,
      percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      isCompleted
    }
  }, [storyData])

  const getStageRecord = useCallback((stageId) => {
    return storyData.bestStageRecords[stageId] || null
  }, [storyData])

  const getStageRetryCount = useCallback((stageId) => {
    return storyData.retryCount[stageId] || 0
  }, [storyData])

  const startStage = useCallback((stageId) => {
    const stage = getStageById(stageId)
    if (!stage) return null
    if (!isStageUnlocked(stageId)) return null

    setStoryData(prev => ({
      ...prev,
      currentStage: stageId,
      currentChapter: stage.chapterId
    }))

    const hasShownBefore = storyData.dialogueShown[`${stageId}_before`]
    if (!hasShownBefore && stage.dialogue?.before) {
      setShowDialogue({
        stageId,
        type: 'before',
        dialogues: stage.dialogue.before,
        currentIndex: 0
      })
    }

    return stage
  }, [storyData, isStageUnlocked])

  const advanceDialogue = useCallback(() => {
    if (!showDialogue) return false

    const nextIndex = showDialogue.currentIndex + 1
    if (nextIndex >= showDialogue.dialogues.length) {
      setStoryData(prev => ({
        ...prev,
        dialogueShown: {
          ...prev.dialogueShown,
          [`${showDialogue.stageId}_${showDialogue.type}`]: true
        }
      }))
      setShowDialogue(null)
      return true
    }

    setShowDialogue(prev => ({
      ...prev,
      currentIndex: nextIndex
    }))
    return false
  }, [showDialogue])

  const skipDialogue = useCallback(() => {
    if (!showDialogue) return

    setStoryData(prev => ({
      ...prev,
      dialogueShown: {
        ...prev.dialogueShown,
        [`${showDialogue.stageId}_${showDialogue.type}`]: true
      }
    }))
    setShowDialogue(null)
  }, [showDialogue])

  const processStageResult = useCallback((result, track) => {
    const stageId = storyData.currentStage
    if (!stageId) return null

    const stage = getStageById(stageId)
    if (!stage) return null

    const objectives = stage.objectives || []
    const objectiveResults = objectives.map(obj => ({
      ...obj,
      completed: checkObjectiveComplete(obj, result)
    }))

    const requiredObjectives = objectives.filter(obj => obj.required)
    const allRequiredCompleted = requiredObjectives.every(obj => 
      checkObjectiveComplete(obj, result)
    )

    const bonusObjectives = objectives.filter(obj => obj.bonus)
    const allBonusCompleted = bonusObjectives.every(obj => 
      checkObjectiveComplete(obj, result)
    )

    const baseRewards = stage.rewards || {}
    const bonusRewards = stage.bonusRewards || {}

    let earnedExp = 0
    let earnedCoins = 0
    const earnedItems = []

    if (allRequiredCompleted) {
      earnedExp += baseRewards.exp || 0
      earnedCoins += baseRewards.coins || 0

      if (allBonusCompleted) {
        earnedExp += bonusRewards.exp || 0
        earnedCoins += bonusRewards.coins || 0
      }
    }

    const wasCompletedBefore = !!storyData.completedStages[stageId]
    const isNewCompletion = allRequiredCompleted && !wasCompletedBefore

    const chapter = getChapterById(stage.chapterId)
    const stagesInChapter = getStagesByChapter(stage.chapterId)
    const isLastStage = stagesInChapter[stagesInChapter.length - 1].id === stageId
    const isChapterComplete = isLastStage && allRequiredCompleted

    const chapterRewards = []
    if (isChapterComplete && chapter && !storyData.chapterProgress[chapter.id]?.completed) {
      if (chapter.rewards) {
        if (chapter.rewards.exp) {
          earnedExp += chapter.rewards.exp
          chapterRewards.push({ type: 'exp', value: chapter.rewards.exp, label: '章节通关奖励' })
        }
        if (chapter.rewards.badge && CHAPTER_BADGES[chapter.rewards.badge]) {
          earnedItems.push({ type: 'badge', data: CHAPTER_BADGES[chapter.rewards.badge] })
        }
      }
    }

    const prevRecord = storyData.bestStageRecords[stageId]
    const isNewRecord = !prevRecord || (result.cleared && result.score > (prevRecord.score || 0))

    setStoryData(prev => {
      const nextData = { ...prev }

      if (allRequiredCompleted) {
        nextData.completedStages = {
          ...prev.completedStages,
          [stageId]: true
        }
      }

      if (isNewRecord && result.cleared) {
        nextData.bestStageRecords = {
          ...prev.bestStageRecords,
          [stageId]: {
            score: result.score,
            rank: result.rank,
            accuracy: result.accuracy,
            maxCombo: result.maxCombo,
            stats: { ...result.stats },
            completedAt: new Date().toISOString()
          }
        }
      }

      if (!allRequiredCompleted) {
        nextData.retryCount = {
          ...prev.retryCount,
          [stageId]: (prev.retryCount[stageId] || 0) + 1
        }
      }

      if (isChapterComplete) {
        nextData.chapterProgress = {
          ...prev.chapterProgress,
          [chapter.id]: {
            completed: true,
            completedAt: new Date().toISOString()
          }
        }

        const chapterIndex = CHAPTERS.findIndex(c => c.id === chapter.id)
        if (chapterIndex < CHAPTERS.length - 1) {
          const nextChapter = CHAPTERS[chapterIndex + 1]
          if (!prev.storyUnlockedChapters.includes(nextChapter.id)) {
            nextData.storyUnlockedChapters = [
              ...prev.storyUnlockedChapters,
              nextChapter.id
            ]
          }
        }

        if (chapter.rewards?.badge) {
          if (!prev.unlockedBadges.includes(chapter.rewards.badge)) {
            nextData.unlockedBadges = [
              ...prev.unlockedBadges,
              chapter.rewards.badge
            ]
          }
        }
      }

      nextData.totalCoins = prev.totalCoins + earnedCoins

      return nextData
    })

    const storyResultData = {
      stageId,
      stage,
      allRequiredCompleted,
      allBonusCompleted,
      isNewCompletion,
      isChapterComplete,
      isNewRecord,
      objectiveResults,
      earnedExp,
      earnedCoins,
      earnedItems,
      chapterRewards,
      result
    }

    setStoryResult(storyResultData)

    return storyResultData
  }, [storyData])

  const hasAfterDialogue = useCallback(() => {
    if (!storyResult) return false
    const stage = storyResult.stage
    if (!stage?.dialogue?.after) return false
    return !storyData.dialogueShown[`${stage.id}_after`]
  }, [storyResult, storyData])

  const showAfterDialogue = useCallback(() => {
    if (!storyResult) return
    const stage = storyResult.stage
    if (!stage?.dialogue?.after) return

    setShowDialogue({
      stageId: stage.id,
      type: 'after',
      dialogues: stage.dialogue.after,
      currentIndex: 0
    })
  }, [storyResult])

  const clearStoryResult = useCallback(() => {
    setStoryResult(null)
  }, [])

  const resetStoryProgress = useCallback(() => {
    if (confirm('确定要重置剧情模式进度吗？此操作不可撤销！')) {
      setStoryData({ ...defaultStoryData })
    }
  }, [])

  const getStorySummary = useCallback(() => {
    const totalChapters = CHAPTERS.length
    const completedChapters = CHAPTERS.filter(c => 
      storyData.chapterProgress[c.id]?.completed
    ).length

    const totalStages = STAGES.length
    const completedStages = Object.keys(storyData.completedStages).length

    return {
      totalChapters,
      completedChapters,
      totalStages,
      completedStages,
      totalCoins: storyData.totalCoins,
      percent: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0
    }
  }, [storyData])

  return {
    storyData,
    storyResult,
    showDialogue,
    isStageUnlocked,
    isChapterUnlocked,
    getChapterProgress,
    getStageRecord,
    getStageRetryCount,
    startStage,
    advanceDialogue,
    skipDialogue,
    processStageResult,
    hasAfterDialogue,
    showAfterDialogue,
    clearStoryResult,
    resetStoryProgress,
    getStorySummary
  }
}
