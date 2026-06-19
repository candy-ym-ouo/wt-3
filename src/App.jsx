import { useState } from 'react'
import TrackSelect from './components/TrackSelect.jsx'
import Game from './components/Game.jsx'
import KeySettings from './components/KeySettings.jsx'
import Result from './components/Result.jsx'
import { defaultKeyConfig } from './data/tracks.js'

export default function App() {
  const [screen, setScreen] = useState('select')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [keyConfig, setKeyConfig] = useState(defaultKeyConfig)
  const [gameResult, setGameResult] = useState(null)

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

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {screen === 'select' && (
        <TrackSelect
          onSelectTrack={handleSelectTrack}
          onOpenSettings={() => setScreen('settings')}
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
      {screen === 'game' && selectedTrack && (
        <Game
          track={selectedTrack}
          keyConfig={keyConfig}
          onEnd={handleGameEnd}
          onQuit={handleBackToSelect}
        />
      )}
      {screen === 'result' && gameResult && (
        <Result
          result={gameResult}
          track={selectedTrack}
          onRetry={() => setScreen('game')}
          onBack={handleBackToSelect}
        />
      )}
    </div>
  )
}
