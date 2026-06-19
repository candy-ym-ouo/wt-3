import { useState, useMemo } from 'react'
import TrackSelect from './components/TrackSelect.jsx'
import Game from './components/Game.jsx'
import KeySettings from './components/KeySettings.jsx'
import Result from './components/Result.jsx'
import Editor from './components/Editor.jsx'
import { defaultKeyConfig, tracks } from './data/tracks.js'

export default function App() {
  const [screen, setScreen] = useState('select')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [editingTrack, setEditingTrack] = useState(null)
  const [keyConfig, setKeyConfig] = useState(defaultKeyConfig)
  const [gameResult, setGameResult] = useState(null)
  const [customTracks, setCustomTracks] = useState([])
  const [isEditingMode, setIsEditingMode] = useState(false)

  const handleSelectTrack = (track) => {
    setSelectedTrack(track)
    setScreen('game')
  }

  const handleGameEnd = (result) => {
    setGameResult(result)
    setScreen('result')
  }

  const handleBackToSelect = () => {
    setSelectedTrack(null)
    setGameResult(null)
    setIsEditingMode(false)
    setEditingTrack(null)
    setScreen('select')
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
        />
      )}
    </div>
  )
}
