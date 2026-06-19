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
import { defaultKeyConfig, tracks } from './data/tracks.js'
import { tutorialTrack, resetTutorial } from './data/tutorialData.js'
import { usePlayerStore } from './store/usePlayerStore.js'

export default function App() {
  const [screen, setScreen] = useState('select')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [editingTrack, setEditingTrack] = useState(null)
  const [keyConfig, setKeyConfig] = useState(defaultKeyConfig)
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
    challengeData
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
    setScreen('result')

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
          keyConfig={keyConfig}
          playerData={playerStore.playerData}
          expProgress={playerStore.expProgress}
          onOpenGrowthCenter={() => setShowGrowthCenter(true)}
          getBestRecord={playerStore.getBestRecord}
          challengeSummary={challengeSummary}
          onOpenChallengeCenter={() => setShowChallengeCenter(true)}
          activeMultiplier={activeMultiplier}
        />
      )}
      {screen === 'settings' && (
        <KeySettings
          keyConfig={keyConfig}
          onSave={(config) => {
            setKeyConfig(config)
            setScreen('select')
          }}
          onCancel={() => setScreen('select')}
        />
      )}
      {screen === 'practice' && selectedTrack && (
        <PracticeLab
          track={selectedTrack}
          keyConfig={keyConfig}
          onStartPractice={handleStartPractice}
          onBack={() => setScreen('select')}
        />
      )}
      {screen === 'editor' && (
        <Editor
          initialTrack={editingTrack}
          keyConfig={keyConfig}
          onSave={handleSaveTrack}
          onChange={handleEditorChange}
          onBack={handleBackToSelect}
          onPlay={handlePlayFromEditor}
        />
      )}
      {screen === 'game' && selectedTrack && (
        <Game
          track={selectedTrack}
          keyConfig={keyConfig}
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
        />
      )}
      {tutorialState.showTutorial && tutorialState.isInTutorialFlow && (
        <Tutorial
          currentStep={tutorialState.currentStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
          onOpenKeySettings={handleOpenKeySettingsFromTutorial}
          onStartPractice={handleStartPracticeFromTutorial}
          keyConfig={keyConfig}
          tracks={allTracks}
          onSelectTrack={handleTutorialTrackSelect}
          selectedTrackIndex={selectedTutorialTrackIndex}
          onTrackSelect={handleTutorialTrackIndexSelect}
        />
      )}
    </div>
  )
}
