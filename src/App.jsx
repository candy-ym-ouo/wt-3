import { useState } from 'react'
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
    setScreen('select')
  }

  const handleOpenEditor = (track) => {
    setEditingTrack(track || null)
    setScreen('editor')
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
    alert('谱面已保存！')
  }

  const handlePlayFromEditor = (track) => {
    setSelectedTrack(track)
    setScreen('game')
  }

  const allTracks = [...tracks, ...customTracks]

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
          onBack={() => {
            setEditingTrack(null)
            setScreen('select')
          }}
          onPlay={handlePlayFromEditor}
        />
      )}
      {screen === 'game' && selectedTrack && (
        <Game
          track={selectedTrack}
          keyConfig={keyConfig}
          onEnd={handleGameEnd}
          onQuit={() => {
            if (editingTrack) {
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
            if (editingTrack) {
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
