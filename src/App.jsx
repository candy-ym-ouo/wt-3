import { useState, useMemo } from 'react'
import TrackSelect from './components/TrackSelect.jsx'
import Game from './components/Game.jsx'
import KeySettings from './components/KeySettings.jsx'
import Result from './components/Result.jsx'
import Editor from './components/Editor.jsx'
import PlayerGrowthCenter from './components/PlayerGrowthCenter.jsx'
import { defaultKeyConfig, tracks } from './data/tracks.js'
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
  const [growthInfo, setGrowthInfo] = useState(null)

  const playerStore = usePlayerStore()

  const handleSelectTrack = (track) => {
    setSelectedTrack(track)
    setScreen('game')
  }

  const handleGameEnd = (result) => {
    const growthResult = playerStore.processGameResult(result, selectedTrack)
    setGrowthInfo({
      gainedExp: growthResult.gainedExp,
      levelUps: growthResult.levelUps,
      newAchievements: playerStore.newlyUnlocked.achievements,
      newTitles: playerStore.newlyUnlocked.titles
    })
    setGameResult(result)
    setScreen('result')
  }

  const handleBackToSelect = () => {
    setSelectedTrack(null)
    setGameResult(null)
    setGrowthInfo(null)
    setIsEditingMode(false)
    setEditingTrack(null)
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
    setSelectedTrack(track)
    setScreen('game')
  }

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
          keyConfig={keyConfig}
          playerData={playerStore.playerData}
          expProgress={playerStore.expProgress}
          onOpenGrowthCenter={() => setShowGrowthCenter(true)}
          getBestRecord={playerStore.getBestRecord}
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
        />
      )}
      {screen === 'result' && gameResult && (
        <Result
          result={gameResult}
          track={selectedTrack}
          onRetry={() => setScreen('game')}
          onBack={() => {
            if (isEditingMode) {
              setScreen('editor')
            } else {
              handleBackToSelect()
            }
          }}
          growthInfo={growthInfo}
          playerData={playerStore.playerData}
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
    </div>
  )
}
