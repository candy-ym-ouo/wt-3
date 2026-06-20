import { useState, useMemo, useEffect, useCallback } from 'react'
import TrackSelect from './components/TrackSelect.jsx'
import Game from './components/Game.jsx'
import KeySettings from './components/KeySettings.jsx'
import Result from './components/Result.jsx'
import Editor from './components/Editor.jsx'
import PlayerGrowthCenter from './components/PlayerGrowthCenter.jsx'
import PracticeLab from './components/PracticeLab.jsx'
import Tutorial from './components/Tutorial.jsx'
import ActivityChallengeCenter from './components/ActivityChallengeCenter.jsx'
import DailyChallenge from './components/DailyChallenge.jsx'
import StoryMode from './components/StoryMode.jsx'
import StoryDialogue from './components/StoryDialogue.jsx'
import StoryResult from './components/StoryResult.jsx'
import CustomTrackImporter from './components/CustomTrackImporter.jsx'
import { ToastContainer } from './components/Toast.jsx'
import { defaultKeyConfig, tracks, getTrackWithDifficulty } from './data/tracks.js'
import { tutorialTrack, resetTutorial } from './data/tutorialData.js'
import { usePlayerStore } from './store/usePlayerStore.js'
import { useCalibrationStore } from './store/useCalibrationStore.js'
import { useThemeStore } from './store/useThemeStore.js'
import { useDailyChallengeStore } from './store/useDailyChallengeStore.js'
import { useStoryStore } from './store/useStoryStore.js'
import { useKeyPresetStore } from './store/useKeyPresetStore.js'
import { getConstraintModifiers } from './data/dailyChallengeData.js'
import { getChapterById, getStagesByChapter, getStageById } from './data/storyData.js'
import CalibrationCenter from './components/CalibrationCenter.jsx'
import ThemeWorkshop from './components/ThemeWorkshop.jsx'

export default function App() {
  const [screen, setScreen] = useState('select')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [editingTrack, setEditingTrack] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [customTracks, setCustomTracks] = useState([])
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [showGrowthCenter, setShowGrowthCenter] = useState(false)
  const [showChallengeCenter, setShowChallengeCenter] = useState(false)
  const [growthInfo, setGrowthInfo] = useState(null)
  const [practiceSection, setPracticeSection] = useState(null)
  const [recordChecks, setRecordChecks] = useState(null)
  const [selectedTutorialTrackIndex, setSelectedTutorialTrackIndex] = useState(-1)
  const [isTutorialGame, setIsTutorialGame] = useState(false)
  const [showTutorialComplete, setShowTutorialComplete] = useState(false)
  const [showCalibrationCenter, setShowCalibrationCenter] = useState(false)
  const [showThemeWorkshop, setShowThemeWorkshop] = useState(false)
  const [showDailyChallenge, setShowDailyChallenge] = useState(false)
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false)
  const [dailyChallengeModifiers, setDailyChallengeModifiers] = useState(null)
  const [dailyChallengeResult, setDailyChallengeResult] = useState(null)
  const [showStoryMode, setShowStoryMode] = useState(false)
  const [isStoryMode, setIsStoryMode] = useState(false)
  const [currentStoryStage, setCurrentStoryStage] = useState(null)
  const [storyResultData, setStoryResultData] = useState(null)
  const [showStoryResult, setShowStoryResult] = useState(false)
  const [showImporter, setShowImporter] = useState(false)

  const calibrationStore = useCalibrationStore()
  const storyStore = useStoryStore()
  const themeStore = useThemeStore()
  const dailyChallengeStore = useDailyChallengeStore()
  const keyPresetStore = useKeyPresetStore()

  const themedKeyConfig = useMemo(() => ({
    ...keyPresetStore.currentPreset,
    colors: themeStore.getLaneColors()
  }), [keyPresetStore.currentPreset, themeStore.theme.laneSchemeId])

  const playerStore = usePlayerStore()
  const {
    tutorialState,
    nextTutorialStep,
    skipTutorial,
    startTutorial,
    markFirstGameCompleted,
    goToTutorialStep,
    hideTutorial,
    resetTutorialState,
    getChallengeSummary,
    getActiveMultiplier,
    challengeData,
    bestRecords
  } = playerStore

  const challengeSummary = useMemo(() => getChallengeSummary(), [challengeData, getChallengeSummary])
  const activeMultiplier = useMemo(() => getActiveMultiplier(), [challengeData, getActiveMultiplier])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('clearTutorial') === '1') {
      resetTutorial()
      resetTutorialState()
    }
  }, [])

  useEffect(() => {
    if (tutorialState.showTutorial && tutorialState.currentStep === 0 && !tutorialState.isInTutorialFlow) {
      startTutorial()
    }
  }, [tutorialState.showTutorial, tutorialState.currentStep, tutorialState.isInTutorialFlow])

  const handleSelectTrack = (track) => {
    clearTutorialState()
    setSelectedTrack(track)
    setScreen('game')
  }

  const clearTutorialState = useCallback(() => {
    setIsTutorialGame(false)
    setShowTutorialComplete(false)
  }, [])

  const handleStartDailyChallenge = useCallback(() => {
    const state = dailyChallengeStore.dailyChallengeState
    const challenge = state.challenge
    const trackWithDiff = getTrackWithDifficulty(challenge.trackId, challenge.difficultyId)
    if (!trackWithDiff) return
    const modifiers = getConstraintModifiers(challenge.constraints)
    clearTutorialState()
    setSelectedTrack(trackWithDiff)
    setIsDailyChallengeMode(true)
    setDailyChallengeModifiers(modifiers)
    setDailyChallengeResult(null)
    setShowDailyChallenge(false)
    setScreen('game')
  }, [dailyChallengeStore])

  const handleStartStoryStage = useCallback((stage, track) => {
    if (!stage || !track) return
    storyStore.startStage(stage.id)
    setCurrentStoryStage(stage)
    setSelectedTrack(track)
    setIsStoryMode(true)
    setShowStoryMode(false)
    setShowStoryResult(false)
    setStoryResultData(null)
    setScreen('game')
  }, [storyStore])

  const handleStoryRetry = useCallback(() => {
    if (!currentStoryStage) return
    const track = getTrackWithDifficulty(currentStoryStage.trackId, currentStoryStage.difficultyId)
    if (!track) return
    setSelectedTrack(track)
    setShowStoryResult(false)
    setStoryResultData(null)
    setScreen('game')
  }, [currentStoryStage])

  const handleStoryNextStage = useCallback(() => {
    if (!currentStoryStage) return
    const stages = getStagesByChapter(currentStoryStage.chapterId)
    const currentIndex = stages.findIndex(s => s.id === currentStoryStage.id)
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1]
      const track = getTrackWithDifficulty(nextStage.trackId, nextStage.difficultyId)
      if (track) {
        storyStore.startStage(nextStage.id)
        setCurrentStoryStage(nextStage)
        setSelectedTrack(track)
        setShowStoryResult(false)
        setStoryResultData(null)
        setScreen('game')
      }
    } else {
      setShowStoryResult(false)
      setStoryResultData(null)
      setIsStoryMode(false)
      setCurrentStoryStage(null)
      setShowStoryMode(true)
      setScreen('select')
    }
  }, [currentStoryStage, storyStore])

  const handleBackToStoryChapter = useCallback(() => {
    setShowStoryResult(false)
    setStoryResultData(null)
    setIsStoryMode(false)
    setCurrentStoryStage(null)
    setShowStoryMode(true)
    setScreen('select')
    storyStore.clearStoryResult()
  }, [storyStore])

  const handleGameEnd = (result) => {
    const growthResult = playerStore.processGameResult(result, selectedTrack)
    setGrowthInfo({
      gainedExp: growthResult.gainedExp,
      levelUps: growthResult.levelUps,
      newAchievements: growthResult.newAchievements,
      newTitles: growthResult.newTitles,
      newBadges: growthResult.newBadges
    })
    setRecordChecks(growthResult.recordChecks)
    setGameResult(result)

    if (isStoryMode && currentStoryStage) {
      const storyResult = storyStore.processStageResult(result, selectedTrack)
      setStoryResultData(storyResult)
      setShowStoryResult(true)
      return
    }

    setScreen('result')

    if (isDailyChallengeMode) {
      const dailyResult = dailyChallengeStore.submitDailyResult(result)
      setDailyChallengeResult(dailyResult)
    }

    if (isTutorialGame && result.cleared) {
      markFirstGameCompleted()
      setShowTutorialComplete(true)
    }
  }

  const handleBackToSelect = () => {
    clearTutorialState()
    setSelectedTrack(null)
    setGameResult(null)
    setGrowthInfo(null)
    setIsEditingMode(false)
    setEditingTrack(null)
    setPracticeSection(null)
    setRecordChecks(null)
    setIsDailyChallengeMode(false)
    setDailyChallengeModifiers(null)
    setDailyChallengeResult(null)
    setScreen('select')
    playerStore.clearNewlyUnlocked()
  }

  const handleOpenEditor = (track) => {
    if (track) {
      const existingCustom = customTracks.find(t => t.id === track.id)
      setEditingTrack(existingCustom || { ...track })
    } else {
      setEditingTrack(null)
    }
    setIsEditingMode(true)
    setScreen('editor')
  }

  const handleEditorChange = (track) => {
    setEditingTrack(track)
  }

  const handleSaveTrack = (track) => {
    setCustomTracks(prev => {
      const existing = prev.findIndex(t => t.id === track.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = track
        return updated
      }
      return [...prev, track]
    })
    setEditingTrack(track)
    alert('谱面已保存！')
  }

  const handleImportTrack = useCallback((importedTrack) => {
    setCustomTracks(prev => {
      const existing = prev.findIndex(t => t.id === importedTrack.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = importedTrack
        return updated
      }
      return [...prev, importedTrack]
    })
  }, [])

  const handlePlayFromEditor = (track) => {
    clearTutorialState()
    setSelectedTrack(track)
    setScreen('game')
  }

  const handleOpenPracticeLab = (track) => {
    clearTutorialState()
    setSelectedTrack(track)
    setPracticeSection(null)
    setScreen('practice')
  }

  const handleStartPractice = (section) => {
    clearTutorialState()
    setPracticeSection(section)
    setScreen('game')
  }

  const handleTutorialNext = () => {
    nextTutorialStep()
  }

  const handleTutorialSkip = () => {
    skipTutorial()
  }

  const handleOpenKeySettingsFromTutorial = () => {
    hideTutorial()
    setScreen('settings')
  }

  const handleStartPracticeFromTutorial = () => {
    if (!selectedTrack) {
      setSelectedTrack(tutorialTrack)
      setSelectedTutorialTrackIndex(-1)
    }
    setIsTutorialGame(true)
    hideTutorial()
    setScreen('game')
  }

  const handleTutorialTrackSelect = (track) => {
    setSelectedTrack(track)
  }

  const handleTutorialTrackIndexSelect = (index) => {
    setSelectedTutorialTrackIndex(index)
  }

  const handleTutorialComplete = () => {
    setShowTutorialComplete(false)
    nextTutorialStep()
    setIsTutorialGame(false)
  }

  useEffect(() => {
    if (tutorialState.isInTutorialFlow && screen === 'select' && !tutorialState.showTutorial && tutorialState.currentStep === 2) {
      const timer = setTimeout(() => {
        goToTutorialStep(3)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [screen, tutorialState.isInTutorialFlow, tutorialState.showTutorial, tutorialState.currentStep])

  const allTracks = useMemo(() => {
    const trackMap = new Map()
    tracks.forEach(t => trackMap.set(t.id, t))
    customTracks.forEach(t => trackMap.set(t.id, t))
    return Array.from(trackMap.values())
  }, [customTracks])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {screen === 'select' && (
        <TrackSelect
          tracks={allTracks}
          onSelectTrack={handleSelectTrack}
          onOpenSettings={() => setScreen('settings')}
          onOpenEditor={() => handleOpenEditor(null)}
          onEditTrack={handleOpenEditor}
          onOpenPracticeLab={handleOpenPracticeLab}
          keyConfig={themedKeyConfig}
          playerData={playerStore.playerData}
          expProgress={playerStore.expProgress}
          onOpenGrowthCenter={() => setShowGrowthCenter(true)}
          getBestRecord={playerStore.getBestRecord}
          challengeSummary={challengeSummary}
          onOpenChallengeCenter={() => setShowChallengeCenter(true)}
          activeMultiplier={activeMultiplier}
          bestRecords={bestRecords}
          onOpenCalibrationCenter={() => setShowCalibrationCenter(true)}
          onOpenThemeWorkshop={() => setShowThemeWorkshop(true)}
          dailyChallengeState={dailyChallengeStore.dailyChallengeState}
          onOpenDailyChallenge={() => setShowDailyChallenge(true)}
          onOpenStoryMode={() => setShowStoryMode(true)}
          onOpenImporter={() => setShowImporter(true)}
        />
      )}
      {screen === 'settings' && (
        <KeySettings
          keyConfig={themedKeyConfig}
          onSave={() => {
            setScreen('select')
          }}
          onCancel={() => setScreen('select')}
        />
      )}
      {screen === 'practice' && selectedTrack && (
        <PracticeLab
          track={selectedTrack}
          keyConfig={themedKeyConfig}
          onStartPractice={handleStartPractice}
          onBack={() => setScreen('select')}
        />
      )}
      {screen === 'editor' && (
        <Editor
          initialTrack={editingTrack}
          keyConfig={themedKeyConfig}
          onSave={handleSaveTrack}
          onChange={handleEditorChange}
          onBack={handleBackToSelect}
          onPlay={handlePlayFromEditor}
        />
      )}
      {screen === 'game' && selectedTrack && (
        <Game
          track={selectedTrack}
          keyConfig={themedKeyConfig}
          onEnd={handleGameEnd}
          onQuit={() => {
            if (isEditingMode) {
              setScreen('editor')
            } else {
              handleBackToSelect()
            }
          }}
          isPracticeMode={practiceSection !== null}
          practiceSection={practiceSection}
          isTutorialMode={isTutorialGame}
          isDailyChallengeMode={isDailyChallengeMode}
          dailyChallengeModifiers={dailyChallengeModifiers}
          theme={themeStore.theme}
        />
      )}
      {screen === 'result' && gameResult && (
        <Result
          result={gameResult}
          track={selectedTrack}
          onRetry={() => {
            if (!selectedTrack?.isTutorial) {
              clearTutorialState()
            }
            setScreen('game')
          }}
          onBack={() => {
            if (isEditingMode) {
              setScreen('editor')
            } else {
              handleBackToSelect()
            }
          }}
          growthInfo={growthInfo}
          playerData={playerStore.playerData}
          recordChecks={recordChecks}
          trackLeaderboard={playerStore.getTrackLeaderboard(selectedTrack.id, selectedTrack.difficulty)}
          trackHistory={playerStore.getTrackHistory(selectedTrack.id, selectedTrack.difficulty)}
          bestRecord={playerStore.getBestRecord(selectedTrack.id, selectedTrack.difficulty)}
          difficultyLeaderboard={playerStore.getDifficultyLeaderboard(selectedTrack.difficulty)}
          isTutorialGame={isTutorialGame}
          showTutorialComplete={showTutorialComplete}
          onTutorialComplete={handleTutorialComplete}
          replayData={gameResult.replayData}
          getReplayAnalysis={playerStore.getReplayAnalysis}
          trackReplays={playerStore.getTrackReplays(selectedTrack.id, selectedTrack.difficulty)}
          onDeleteReplay={playerStore.deleteReplay}
          theme={themeStore.theme}
          isDailyChallengeMode={isDailyChallengeMode}
          dailyChallengeResult={dailyChallengeResult}
          trackAllBestRecords={playerStore.getTrackAllBestRecords(selectedTrack.id)}
          trackAllLeaderboards={playerStore.getTrackAllLeaderboards(selectedTrack.id)}
          allDifficultyLeaderboards={playerStore.getAllDifficultyLeaderboards()}
          overallDifficultyStats={playerStore.getOverallDifficultyStats()}
        />
      )}
      {showGrowthCenter && (
        <PlayerGrowthCenter
          playerData={playerStore.playerData}
          expProgress={playerStore.expProgress}
          expToNextLevel={playerStore.expToNextLevel}
          onClose={() => setShowGrowthCenter(false)}
          onSelectTitle={playerStore.setCurrentTitle}
          onResetData={playerStore.resetPlayerData}
        />
      )}
      {showChallengeCenter && (
        <ActivityChallengeCenter
          challengeData={playerStore.challengeData}
          challengeSummary={challengeSummary}
          onClose={() => setShowChallengeCenter(false)}
          onClaimReward={playerStore.claimTaskReward}
          getTaskStatus={playerStore.getTaskStatus}
          getEventTitles={playerStore.getEventTitles}
          getEventAchievements={playerStore.getEventAchievements}
          tracks={allTracks}
          dailyChallengeState={dailyChallengeStore.dailyChallengeState}
          onOpenDailyChallenge={() => { setShowChallengeCenter(false); setShowDailyChallenge(true) }}
        />
      )}
      {showDailyChallenge && (
        <DailyChallenge
          dailyChallengeState={dailyChallengeStore.dailyChallengeState}
          getTodayLeaderboard={dailyChallengeStore.getTodayLeaderboard}
          onStartChallenge={handleStartDailyChallenge}
          onClose={() => setShowDailyChallenge(false)}
          tracks={allTracks}
        />
      )}
      {showStoryMode && (
        <StoryMode
          onStartStage={handleStartStoryStage}
          onClose={() => setShowStoryMode(false)}
          storyStore={storyStore}
          playerData={playerStore.playerData}
          keyConfig={themedKeyConfig}
        />
      )}
      {showStoryResult && storyResultData && (
        <StoryResult
          storyResult={storyResultData}
          onRetry={handleStoryRetry}
          onNextStage={handleStoryNextStage}
          onBackToChapter={handleBackToStoryChapter}
          onShowDialogue={() => storyStore.showAfterDialogue()}
          hasAfterDialogue={storyStore.hasAfterDialogue()}
          chapterColor={getChapterById(currentStoryStage?.chapterId)?.color || '#66ff99'}
        />
      )}
      {storyStore.showDialogue && (
        <StoryDialogue
          dialogues={storyStore.showDialogue.dialogues}
          currentIndex={storyStore.showDialogue.currentIndex}
          onAdvance={storyStore.advanceDialogue}
          onSkip={storyStore.skipDialogue}
          chapterColor={getChapterById(storyStore.storyData.currentChapter)?.color || '#66ff99'}
        />
      )}
      {showCalibrationCenter && (
        <CalibrationCenter
          keyConfig={themedKeyConfig}
          onClose={() => setShowCalibrationCenter(false)}
        />
      )}
      {showThemeWorkshop && (
        <ThemeWorkshop
          keyConfig={themedKeyConfig}
          onClose={() => setShowThemeWorkshop(false)}
        />
      )}
      {tutorialState.showTutorial && tutorialState.isInTutorialFlow && (
        <Tutorial
          currentStep={tutorialState.currentStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
          onOpenKeySettings={handleOpenKeySettingsFromTutorial}
          onStartPractice={handleStartPracticeFromTutorial}
          keyConfig={themedKeyConfig}
          tracks={allTracks}
          onSelectTrack={handleTutorialTrackSelect}
          selectedTrackIndex={selectedTutorialTrackIndex}
          onTrackSelect={handleTutorialTrackIndexSelect}
        />
      )}
      <ToastContainer />
      <CustomTrackImporter
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onImport={handleImportTrack}
        existingTracks={allTracks}
      />
    </div>
  )
}
