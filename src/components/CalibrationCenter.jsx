import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { useCalibrationStore } from '../store/useCalibrationStore.js'

const CALIBRATION_TAPS = 10
const BEAT_INTERVAL = 0.5
const OFFSET_RANGE = 100
const OFFSET_STEP = 1
const KEYBOARD_BPM = 120
const KEYBOARD_TAPS = 20

export default function CalibrationCenter({ keyConfig, onClose }) {
  const {
    calibration,
    setAudioOffset,
    setJudgmentOffset,
    addKeyLatency,
    clearKeyLatencies,
    addCalibrationResult,
    setAutoApply,
    applyCalibrationResult,
    resetCalibration,
    getAverageKeyLatency
  } = useCalibrationStore()

  const [activeTab, setActiveTab] = useState('avsync')

  const [avState, setAvState] = useState('idle')
  const [avTapCount, setAvTapCount] = useState(0)
  const [avTapResults, setAvTapResults] = useState([])
  const [avCalculatedOffset, setAvCalculatedOffset] = useState(null)
  const [avFlash, setAvFlash] = useState(false)
  const [avBeatCount, setAvBeatCount] = useState(0)

  const [keyEvents, setKeyEvents] = useState([])
  const [keyPressed, setKeyPressed] = useState({})
  const [keyDetecting, setKeyDetecting] = useState(false)
  const [keyBeatState, setKeyBeatState] = useState('idle')
  const [keyBeatCount, setKeyBeatCount] = useState(0)
  const [keyTapCount, setKeyTapCount] = useState(0)
  const [keyTapResults, setKeyTapResults] = useState([])
  const [keyBeatFlash, setKeyBeatFlash] = useState(false)

  const [judgmentOffsetLocal, setJudgmentOffsetLocal] = useState(calibration.judgmentOffset)
  const [audioOffsetLocal, setAudioOffsetLocal] = useState(calibration.audioOffset)

  const avTimerRef = useRef(null)
  const avBeatTimesRef = useRef([])
  const avStartRef = useRef(null)
  const keyDetectRef = useRef(null)
  const keyEventsRef = useRef([])
  const keyBeatTimerRef = useRef(null)
  const keyBeatTimesRef = useRef([])
  const synthRef = useRef(null)
  const lastFrameRef = useRef(0)
  const animRef = useRef(null)

  useEffect(() => {
    setJudgmentOffsetLocal(calibration.judgmentOffset)
    setAudioOffsetLocal(calibration.audioOffset)
  }, [calibration.judgmentOffset, calibration.audioOffset])

  const startAvCalibration = useCallback(async () => {
    try {
      await Tone.start()
      if (!synthRef.current) {
        synthRef.current = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 4,
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
          volume: -10
        }).toDestination()
      }
    } catch (e) {
      console.error('Audio init failed:', e)
      return
    }

    setAvState('countdown')
    setAvTapCount(0)
    setAvTapResults([])
    setAvCalculatedOffset(null)
    avBeatTimesRef.current = []

    await new Promise(r => setTimeout(r, 1000))

    const startTime = performance.now()
    avStartRef.current = startTime
    let beatIndex = 0

    setAvState('running')
    setAvBeatCount(0)

    const tick = () => {
      const now = performance.now()
      const elapsed = (now - startTime) / 1000
      const nextBeatTime = beatIndex * BEAT_INTERVAL

      if (elapsed >= nextBeatTime) {
        try {
          synthRef.current.triggerAttackRelease('C4', '16n', Tone.now(), 0.8)
        } catch (e) {}

        avBeatTimesRef.current.push(now)
        setAvFlash(true)
        setAvBeatCount(beatIndex + 1)
        setTimeout(() => setAvFlash(false), 100)

        beatIndex++
      }

      if (beatIndex < CALIBRATION_TAPS + 5) {
        avTimerRef.current = requestAnimationFrame(tick)
      } else {
        setAvState('done')
      }
    }

    avTimerRef.current = requestAnimationFrame(tick)
  }, [])

  const stopAvCalibration = useCallback(() => {
    if (avTimerRef.current) {
      cancelAnimationFrame(avTimerRef.current)
      avTimerRef.current = null
    }
    setAvState('idle')
    setAvTapCount(0)
    setAvBeatCount(0)
  }, [])

  const handleAvTap = useCallback(() => {
    if (avState !== 'running') return

    const tapTime = performance.now()
    const newTapCount = avTapCount + 1
    setAvTapCount(newTapCount)

    let closestDiff = Infinity
    for (const beatTime of avBeatTimesRef.current) {
      const diff = tapTime - beatTime
      if (Math.abs(diff) < Math.abs(closestDiff)) {
        closestDiff = diff
      }
    }

    const offsetMs = Math.round(closestDiff)
    setAvTapResults(prev => [...prev, offsetMs])

    if (newTapCount >= CALIBRATION_TAPS) {
      if (avTimerRef.current) {
        cancelAnimationFrame(avTimerRef.current)
        avTimerRef.current = null
      }
      setAvState('done')
    }
  }, [avState, avTapCount])

  const applyAvResult = useCallback(() => {
    if (avTapResults.length === 0) return
    const avg = Math.round(avTapResults.reduce((a, b) => a + b, 0) / avTapResults.length)
    const offsetToApply = -avg
    setAvCalculatedOffset(offsetToApply)
    setAudioOffset(offsetToApply)
    setAudioOffsetLocal(offsetToApply)
    addCalibrationResult({
      type: 'avsync',
      audioOffset: offsetToApply,
      tapCount: avTapResults.length,
      avgLatency: avg,
      rawResults: [...avTapResults]
    })
  }, [avTapResults, setAudioOffset, addCalibrationResult])

  const startKeyDetection = useCallback(async () => {
    try {
      await Tone.start()
      if (!synthRef.current) {
        synthRef.current = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 4,
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
          volume: -12
        }).toDestination()
      }
    } catch (e) {
      console.error('Audio init failed:', e)
      return
    }

    setKeyBeatState('countdown')
    setKeyTapCount(0)
    setKeyTapResults([])
    setKeyEvents([])
    keyEventsRef.current = []
    keyBeatTimesRef.current = []
    clearKeyLatencies()

    await new Promise(r => setTimeout(r, 1000))

    const beatIntervalSec = 60 / KEYBOARD_BPM
    const startTime = performance.now()
    let beatIndex = 0

    setKeyBeatState('running')
    setKeyBeatCount(0)
    setKeyDetecting(true)

    const tick = () => {
      const now = performance.now()
      const elapsed = (now - startTime) / 1000
      const nextBeatTime = beatIndex * beatIntervalSec

      if (elapsed >= nextBeatTime) {
        try {
          synthRef.current.triggerAttackRelease('C4', '16n', Tone.now(), 0.6)
        } catch (e) {}

        keyBeatTimesRef.current.push(now)
        setKeyBeatFlash(true)
        setKeyBeatCount(beatIndex + 1)
        setTimeout(() => setKeyBeatFlash(false), 80)

        beatIndex++
      }

      if (beatIndex < KEYBOARD_TAPS + 4) {
        keyBeatTimerRef.current = requestAnimationFrame(tick)
      } else {
        setKeyBeatState('done')
        setKeyDetecting(false)
      }
    }

    keyBeatTimerRef.current = requestAnimationFrame(tick)
  }, [clearKeyLatencies])

  const stopKeyDetection = useCallback(() => {
    if (keyBeatTimerRef.current) {
      cancelAnimationFrame(keyBeatTimerRef.current)
      keyBeatTimerRef.current = null
    }
    setKeyBeatState('idle')
    setKeyBeatCount(0)
    setKeyTapCount(0)
    setKeyDetecting(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault()

      if (activeTab === 'avsync' && avState === 'running') {
        handleAvTap()
        return
      }

      if (activeTab === 'keyboard' && keyDetecting) {
        const now = performance.now()

        setKeyPressed(prev => ({ ...prev, [e.code]: now }))

        let closestDiff = Infinity
        let closestBeatIndex = -1
        for (let i = 0; i < keyBeatTimesRef.current.length; i++) {
          const diff = now - keyBeatTimesRef.current[i]
          if (Math.abs(diff) < Math.abs(closestDiff)) {
            closestDiff = diff
            closestBeatIndex = i
          }
        }

        const deviationMs = Math.round(closestDiff)
        addKeyLatency(Math.abs(deviationMs))

        const laneIndex = keyConfig.lanes.indexOf(e.code)
        const label = laneIndex >= 0 ? keyConfig.labels[laneIndex] : e.key.toUpperCase()

        const event = {
          code: e.code,
          label,
          lane: laneIndex,
          timestamp: now,
          deviation: deviationMs,
          beatIndex: closestBeatIndex,
          type: 'down'
        }
        keyEventsRef.current = [event, ...keyEventsRef.current].slice(0, 100)
        setKeyEvents([...keyEventsRef.current])

        if (closestBeatIndex >= 0 && closestBeatIndex >= keyTapCount) {
          setKeyTapCount(prev => prev + 1)
          setKeyTapResults(prev => [...prev, deviationMs])
        }
      }
    }

    const handleKeyUp = (e) => {
      setKeyPressed(prev => {
        const next = { ...prev }
        delete next[e.code]
        return next
      })

      if (activeTab === 'keyboard' && keyDetecting) {
        const now = performance.now()
        const laneIndex = keyConfig.lanes.indexOf(e.code)
        const label = laneIndex >= 0 ? keyConfig.labels[laneIndex] : e.key.toUpperCase()

        keyEventsRef.current = [{
          code: e.code,
          label,
          lane: laneIndex,
          timestamp: now,
          type: 'up'
        }, ...keyEventsRef.current].slice(0, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeTab, avState, keyDetecting, keyConfig, keyTapCount, handleAvTap, addKeyLatency])

  useEffect(() => {
    return () => {
      if (avTimerRef.current) cancelAnimationFrame(avTimerRef.current)
      if (keyBeatTimerRef.current) cancelAnimationFrame(keyBeatTimerRef.current)
      if (keyDetectRef.current) cancelAnimationFrame(keyDetectRef.current)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      try {
        if (synthRef.current) {
          synthRef.current.dispose()
          synthRef.current = null
        }
      } catch (e) {}
    }
  }, [])

  const handleApplyAll = useCallback(() => {
    setJudgmentOffset(judgmentOffsetLocal)
    setAudioOffset(audioOffsetLocal)
    applyCalibrationResult(audioOffsetLocal, judgmentOffsetLocal)
  }, [judgmentOffsetLocal, audioOffsetLocal, setJudgmentOffset, setAudioOffset, applyCalibrationResult])

  const handleReset = useCallback(() => {
    resetCalibration()
    setJudgmentOffsetLocal(0)
    setAudioOffsetLocal(0)
    setAvTapResults([])
    setAvCalculatedOffset(null)
    setAvState('idle')
    setAvTapCount(0)
    setKeyTapResults([])
    setKeyBeatState('idle')
    setKeyTapCount(0)
    setKeyEvents([])
  }, [resetCalibration])

  const renderAvSyncTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.avMainArea}>
        <div
          style={{
            ...styles.avRing,
            ...(avFlash ? styles.avRingFlash : {}),
            borderColor: avState === 'running'
              ? '#00ffcc'
              : avState === 'done'
                ? '#ffcc00'
                : 'rgba(255,255,255,0.15)'
          }}
        >
          <div style={styles.avRingInner}>
            {avState === 'idle' && (
              <>
                <div style={styles.avIcon}>🎯</div>
                <div style={styles.avStatusText}>准备校准</div>
                <div style={styles.avDesc}>
                  系统将播放 {CALIBRATION_TAPS} 次节拍声，<br />
                  每次看到闪光时立即按下任意键
                </div>
              </>
            )}
            {avState === 'countdown' && (
              <>
                <div style={styles.avIcon}>⏳</div>
                <div style={styles.avStatusText}>准备...</div>
              </>
            )}
            {avState === 'running' && (
              <>
                <div style={styles.avTapCount}>
                  {avTapCount} / {CALIBRATION_TAPS}
                </div>
                <div style={styles.avHint}>
                  看到闪光时按键！
                </div>
              </>
            )}
            {avState === 'done' && (
              <>
                <div style={styles.avIcon}>✅</div>
                <div style={styles.avStatusText}>校准完成</div>
                {avTapResults.length > 0 && (
                  <div style={styles.avResultValue}>
                    平均延迟: {Math.round(avTapResults.reduce((a, b) => a + b, 0) / avTapResults.length)}ms
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {avTapResults.length > 0 && (
        <div style={styles.avResultPanel}>
          <div style={styles.avResultHeader}>
            <span style={styles.avResultTitle}>📊 校准结果</span>
            <span style={styles.avResultCount}>{avTapResults.length} 次采样</span>
          </div>
          <div style={styles.avResultBars}>
            {avTapResults.map((offset, i) => {
              const barWidth = Math.min(100, Math.abs(offset) / 2)
              const isLeft = offset < 0
              return (
                <div key={i} style={styles.avResultBarRow}>
                  <span style={styles.avResultBarIndex}>#{i + 1}</span>
                  <div style={styles.avResultBarTrack}>
                    <div style={styles.avResultBarCenter} />
                    <div
                      style={{
                        ...styles.avResultBarFill,
                        width: `${barWidth}%`,
                        left: isLeft ? `${50 - barWidth}%` : '50%',
                        background: Math.abs(offset) <= 20
                          ? 'linear-gradient(90deg, #00ffcc, #00ccaa)'
                          : Math.abs(offset) <= 50
                            ? 'linear-gradient(90deg, #ffcc00, #ff9900)'
                            : 'linear-gradient(90deg, #ff3366, #cc2255)'
                      }}
                    />
                  </div>
                  <span style={{
                    ...styles.avResultBarValue,
                    color: offset < 0 ? '#ff6633' : offset > 0 ? '#6699ff' : '#00ffcc'
                  }}>
                    {offset > 0 ? '+' : ''}{offset}ms
                  </span>
                </div>
              )
            })}
          </div>
          <div style={styles.avResultSummary}>
            <div style={styles.avSummaryItem}>
              <span style={styles.avSummaryLabel}>平均延迟</span>
              <span style={styles.avSummaryValue}>
                {Math.round(avTapResults.reduce((a, b) => a + b, 0) / avTapResults.length)}ms
              </span>
            </div>
            <div style={styles.avSummaryItem}>
              <span style={styles.avSummaryLabel}>最小偏差</span>
              <span style={styles.avSummaryValue}>
                {Math.min(...avTapResults.map(Math.abs))}ms
              </span>
            </div>
            <div style={styles.avSummaryItem}>
              <span style={styles.avSummaryLabel}>最大偏差</span>
              <span style={styles.avSummaryValue}>
                {Math.max(...avTapResults.map(Math.abs))}ms
              </span>
            </div>
          </div>
          {avCalculatedOffset !== null && (
            <div style={styles.avAppliedBanner}>
              ✅ 已应用音画偏移: {avCalculatedOffset > 0 ? '+' : ''}{avCalculatedOffset}ms
            </div>
          )}
          <div style={styles.avResultActions}>
            <button style={styles.avApplyBtn} onClick={applyAvResult}>
              应用校准结果
            </button>
            <button style={styles.avRetryBtn} onClick={startAvCalibration}>
              重新校准
            </button>
          </div>
        </div>
      )}

      <div style={styles.avControlRow}>
        {avState === 'idle' || avState === 'done' ? (
          <button style={styles.startBtn} onClick={startAvCalibration}>
            ▶ 开始校准
          </button>
        ) : (
          <button style={styles.stopBtn} onClick={stopAvCalibration}>
            ■ 停止
          </button>
        )}
      </div>
    </div>
  )

  const renderKeyboardTab = () => {
    const avgLatency = getAverageKeyLatency()

    let stdDev = 0
    let minDev = 0
    let maxDev = 0
    let avgDev = 0
    let earlyCount = 0
    let lateCount = 0

    if (keyTapResults.length > 0) {
      avgDev = keyTapResults.reduce((a, b) => a + b, 0) / keyTapResults.length
      const variance = keyTapResults.reduce((sum, val) => sum + Math.pow(val - avgDev, 2), 0) / keyTapResults.length
      stdDev = Math.sqrt(variance)
      minDev = Math.min(...keyTapResults)
      maxDev = Math.max(...keyTapResults)
      earlyCount = keyTapResults.filter(v => v < 0).length
      lateCount = keyTapResults.filter(v => v > 0).length
    }

    const recentEvents = keyEvents.slice(0, 15)

    return (
      <div style={styles.tabContent}>
        <div style={styles.keyBeatMainArea}>
          <div
            style={{
              ...styles.keyBeatRing,
              ...(keyBeatFlash ? styles.keyBeatRingFlash : {}),
              borderColor: keyBeatState === 'running'
                ? '#ffcc00'
                : keyBeatState === 'done'
                  ? '#00ffcc'
                  : 'rgba(255,255,255,0.15)'
            }}
          >
            <div style={styles.keyBeatRingInner}>
              {keyBeatState === 'idle' && (
                <>
                  <div style={styles.keyBeatIcon}>🎹</div>
                  <div style={styles.keyBeatStatusText}>准备检测</div>
                  <div style={styles.keyBeatDesc}>
                    跟随节拍器节拍按下任意键<br />
                    BPM {KEYBOARD_BPM} · 共 {KEYBOARD_TAPS} 拍
                  </div>
                </>
              )}
              {keyBeatState === 'countdown' && (
                <>
                  <div style={styles.keyBeatIcon}>⏳</div>
                  <div style={styles.keyBeatStatusText}>准备...</div>
                </>
              )}
              {keyBeatState === 'running' && (
                <>
                  <div style={styles.keyBeatTapCount}>
                    {keyTapCount} / {KEYBOARD_TAPS}
                  </div>
                  <div style={styles.keyBeatHint}>
                    听到节拍声时按键！
                  </div>
                </>
              )}
              {keyBeatState === 'done' && (
                <>
                  <div style={styles.keyBeatIcon}>✅</div>
                  <div style={styles.keyBeatStatusText}>检测完成</div>
                  {keyTapResults.length > 0 && (
                    <div style={styles.keyBeatResultValue}>
                      平均偏差: {avgDev > 0 ? '+' : ''}{Math.round(avgDev)}ms
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={styles.keyLaneVisualRow}>
          {keyConfig.labels.map((label, i) => (
            <div
              key={i}
              style={{
                ...styles.keyLaneMiniBox,
                borderColor: keyConfig.colors[i],
                background: keyPressed[keyConfig.lanes[i]]
                  ? `${keyConfig.colors[i]}33`
                  : 'rgba(255,255,255,0.02)',
                boxShadow: keyPressed[keyConfig.lanes[i]]
                  ? `0 0 20px ${keyConfig.colors[i]}44`
                  : 'none'
              }}
            >
              <span style={{
                ...styles.keyLaneMiniLabel,
                color: keyConfig.colors[i],
                transform: keyPressed[keyConfig.lanes[i]] ? 'scale(1.15)' : 'scale(1)'
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={styles.keyStatsRow}>
          <div style={styles.keyStatCard}>
            <span style={styles.keyStatLabel}>平均偏差</span>
            <span style={{
              ...styles.keyStatValue,
              color: Math.abs(avgDev) <= 10 ? '#00ffcc' : Math.abs(avgDev) <= 30 ? '#ffcc00' : '#ff3366'
            }}>
              {avgDev > 0 ? '+' : ''}{Math.round(avgDev)}ms
            </span>
          </div>
          <div style={styles.keyStatCard}>
            <span style={styles.keyStatLabel}>标准差</span>
            <span style={{
              ...styles.keyStatValue,
              color: stdDev <= 15 ? '#00ffcc' : stdDev <= 30 ? '#ffcc00' : '#ff3366'
            }}>
              {Math.round(stdDev)}ms
            </span>
          </div>
          <div style={styles.keyStatCard}>
            <span style={styles.keyStatLabel}>最早 / 最晚</span>
            <span style={styles.keyStatValue}>
              <span style={{ color: '#ff6633' }}>{minDev}ms</span>
              {' · '}
              <span style={{ color: '#6699ff' }}>{maxDev}ms</span>
            </span>
          </div>
          <div style={styles.keyStatCard}>
            <span style={styles.keyStatLabel}>采样数</span>
            <span style={styles.keyStatValue}>{keyTapResults.length}</span>
          </div>
        </div>

        {keyTapResults.length > 0 && (
          <div style={styles.keyResultPanel}>
            <div style={styles.keyResultHeader}>
              <span style={styles.keyResultTitle}>📊 偏差分布</span>
              <span style={styles.keyResultMeta}>
                <span style={{ color: '#ff6633' }}>偏早 {earlyCount}</span>
                {' · '}
                <span style={{ color: '#6699ff' }}>偏晚 {lateCount}</span>
              </span>
            </div>
            <div style={styles.keyResultBars}>
              {keyTapResults.map((deviation, i) => {
                const barWidth = Math.min(100, Math.abs(deviation) / 1.2)
                const isEarly = deviation < 0
                return (
                  <div key={i} style={styles.keyResultBarRow}>
                    <span style={styles.keyResultBarIndex}>#{i + 1}</span>
                    <div style={styles.keyResultBarTrack}>
                      <div style={styles.keyResultBarCenter} />
                      <div
                        style={{
                          ...styles.keyResultBarFill,
                          width: `${barWidth}%`,
                          left: isEarly ? `${50 - barWidth}%` : '50%',
                          background: Math.abs(deviation) <= 15
                            ? 'linear-gradient(90deg, #00ffcc, #00ccaa)'
                            : Math.abs(deviation) <= 40
                              ? 'linear-gradient(90deg, #ffcc00, #ff9900)'
                              : 'linear-gradient(90deg, #ff3366, #cc2255)'
                        }}
                      />
                    </div>
                    <span style={{
                      ...styles.keyResultBarValue,
                      color: deviation < 0 ? '#ff6633' : deviation > 0 ? '#6699ff' : '#00ffcc'
                    }}>
                      {deviation > 0 ? '+' : ''}{deviation}ms
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={styles.keyResultSummary}>
              <div style={styles.keySummaryItem}>
                <span style={styles.keySummaryLabel}>平均绝对偏差</span>
                <span style={styles.keySummaryValue}>{avgLatency}ms</span>
              </div>
              <div style={styles.keySummaryItem}>
                <span style={styles.keySummaryLabel}>一致性</span>
                <span style={{
                  ...styles.keySummaryValue,
                  color: stdDev <= 10 ? '#00ffcc' : stdDev <= 25 ? '#ffcc00' : '#ff3366'
                }}>
                  {stdDev <= 10 ? '优秀' : stdDev <= 25 ? '良好' : '待提高'}
                </span>
              </div>
              <div style={styles.keySummaryItem}>
                <span style={styles.keySummaryLabel}>节拍器 BPM</span>
                <span style={styles.keySummaryValue}>{KEYBOARD_BPM}</span>
              </div>
            </div>
          </div>
        )}

        {recentEvents.length > 0 && (
          <div style={styles.keyEventLog}>
            <div style={styles.keyEventHeader}>
              <span>按键事件记录</span>
              <span style={styles.keyEventCount}>{keyEvents.length} 条</span>
            </div>
            <div style={styles.keyEventList}>
              {recentEvents.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.keyEventItem,
                    borderLeftColor: ev.lane >= 0 ? keyConfig.colors[ev.lane] : 'rgba(255,255,255,0.2)'
                  }}
                >
                  <span style={styles.keyEventLabel}>{ev.label}</span>
                  <span style={styles.keyEventCode}>{ev.code}</span>
                  {ev.type === 'down' && ev.deviation !== undefined && (
                    <span style={{
                      ...styles.keyEventDeviation,
                      color: ev.deviation < 0 ? '#ff6633' : ev.deviation > 0 ? '#6699ff' : '#00ffcc'
                    }}>
                      {ev.deviation > 0 ? '+' : ''}{ev.deviation}ms
                    </span>
                  )}
                  <span style={{
                    ...styles.keyEventType,
                    color: ev.type === 'down' ? '#00ffcc' : '#ff6633'
                  }}>
                    {ev.type === 'down' ? '↓ 按下' : '↑ 释放'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.keyControlRow}>
          {keyBeatState === 'idle' || keyBeatState === 'done' ? (
            <button style={styles.startBtn} onClick={startKeyDetection}>
              ▶ 开始检测
            </button>
          ) : (
            <button style={styles.stopBtn} onClick={stopKeyDetection}>
              ■ 停止检测
            </button>
          )}
          <button style={styles.clearBtn} onClick={() => {
            setKeyEvents([])
            setKeyTapResults([])
            setKeyTapCount(0)
            clearKeyLatencies()
          }}>
            清除记录
          </button>
        </div>
      </div>
    )
  }

  const renderOffsetTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.offsetSection}>
        <div style={styles.offsetCard}>
          <div style={styles.offsetCardHeader}>
            <span style={styles.offsetCardIcon}>🔊</span>
            <span style={styles.offsetCardTitle}>音画偏移</span>
          </div>
          <div style={styles.offsetDesc}>
            调整音频与画面的时间偏移。正值表示音频提前，负值表示音频延后。
          </div>
          <div style={styles.offsetSliderRow}>
            <span style={styles.offsetSliderLabel}>-{OFFSET_RANGE}ms</span>
            <div style={styles.offsetSliderTrack}>
              <div
                style={{
                  ...styles.offsetSliderFill,
                  width: `${((audioOffsetLocal + OFFSET_RANGE) / (OFFSET_RANGE * 2)) * 100}%`,
                  background: audioOffsetLocal === 0
                    ? 'rgba(255,255,255,0.2)'
                    : audioOffsetLocal > 0
                      ? 'linear-gradient(90deg, rgba(255,255,255,0.1), #6699ff)'
                      : 'linear-gradient(270deg, rgba(255,255,255,0.1), #ff6633)'
                }}
              />
              <div
                style={{
                  ...styles.offsetSliderCenter,
                  left: `${(OFFSET_RANGE / (OFFSET_RANGE * 2)) * 100}%`
                }}
              />
              <input
                type="range"
                min={-OFFSET_RANGE}
                max={OFFSET_RANGE}
                step={OFFSET_STEP}
                value={audioOffsetLocal}
                onChange={e => setAudioOffsetLocal(Number(e.target.value))}
                style={styles.offsetSliderInput}
              />
            </div>
            <span style={styles.offsetSliderLabel}>+{OFFSET_RANGE}ms</span>
          </div>
          <div style={styles.offsetValue}>
            <span style={{
              ...styles.offsetValueNum,
              color: audioOffsetLocal === 0 ? 'rgba(255,255,255,0.5)' : audioOffsetLocal > 0 ? '#6699ff' : '#ff6633'
            }}>
              {audioOffsetLocal > 0 ? '+' : ''}{audioOffsetLocal}ms
            </span>
          </div>
          <div style={styles.offsetPresets}>
            {[-50, -20, 0, 20, 50].map(v => (
              <button
                key={v}
                style={{
                  ...styles.offsetPresetBtn,
                  background: audioOffsetLocal === v
                    ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                    : 'rgba(255,255,255,0.05)',
                  color: audioOffsetLocal === v ? '#00332a' : 'rgba(255,255,255,0.7)'
                }}
                onClick={() => setAudioOffsetLocal(v)}
              >
                {v > 0 ? '+' : ''}{v}ms
              </button>
            ))}
          </div>
        </div>

        <div style={styles.offsetCard}>
          <div style={styles.offsetCardHeader}>
            <span style={styles.offsetCardIcon}>🎯</span>
            <span style={styles.offsetCardTitle}>判定偏移</span>
          </div>
          <div style={styles.offsetDesc}>
            调整判定窗口的整体偏移。正值判定窗口后移（适合按键偏早），负值前移（适合按键偏晚）。
          </div>
          <div style={styles.offsetSliderRow}>
            <span style={styles.offsetSliderLabel}>-{OFFSET_RANGE}ms</span>
            <div style={styles.offsetSliderTrack}>
              <div
                style={{
                  ...styles.offsetSliderFill,
                  width: `${((judgmentOffsetLocal + OFFSET_RANGE) / (OFFSET_RANGE * 2)) * 100}%`,
                  background: judgmentOffsetLocal === 0
                    ? 'rgba(255,255,255,0.2)'
                    : judgmentOffsetLocal > 0
                      ? 'linear-gradient(90deg, rgba(255,255,255,0.1), #00ffcc)'
                      : 'linear-gradient(270deg, rgba(255,255,255,0.1), #ffcc00)'
                }}
              />
              <div
                style={{
                  ...styles.offsetSliderCenter,
                  left: `${(OFFSET_RANGE / (OFFSET_RANGE * 2)) * 100}%`
                }}
              />
              <input
                type="range"
                min={-OFFSET_RANGE}
                max={OFFSET_RANGE}
                step={OFFSET_STEP}
                value={judgmentOffsetLocal}
                onChange={e => setJudgmentOffsetLocal(Number(e.target.value))}
                style={styles.offsetSliderInput}
              />
            </div>
            <span style={styles.offsetSliderLabel}>+{OFFSET_RANGE}ms</span>
          </div>
          <div style={styles.offsetValue}>
            <span style={{
              ...styles.offsetValueNum,
              color: judgmentOffsetLocal === 0 ? 'rgba(255,255,255,0.5)' : judgmentOffsetLocal > 0 ? '#00ffcc' : '#ffcc00'
            }}>
              {judgmentOffsetLocal > 0 ? '+' : ''}{judgmentOffsetLocal}ms
            </span>
          </div>
          <div style={styles.offsetPresets}>
            {[-50, -20, 0, 20, 50].map(v => (
              <button
                key={v}
                style={{
                  ...styles.offsetPresetBtn,
                  background: judgmentOffsetLocal === v
                    ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                    : 'rgba(255,255,255,0.05)',
                  color: judgmentOffsetLocal === v ? '#00332a' : 'rgba(255,255,255,0.7)'
                }}
                onClick={() => setJudgmentOffsetLocal(v)}
              >
                {v > 0 ? '+' : ''}{v}ms
              </button>
            ))}
          </div>

          <div style={styles.judgeWindowPreview}>
            <span style={styles.judgeWindowLabel}>判定窗口预览</span>
            <div style={styles.judgeWindowTrack}>
              {[
                { label: 'MISS', range: 220, color: '#ff3366' },
                { label: 'GOOD', range: 160, color: '#ffcc00' },
                { label: 'GREAT', range: 100, color: '#00ffcc' },
                { label: 'PERFECT', range: 50, color: '#fff' }
              ].map((w, i) => {
                const offsetShift = (judgmentOffsetLocal / 220) * 50
                return (
                  <div key={i} style={styles.judgeWindowRow}>
                    <span style={{ ...styles.judgeWindowName, color: w.color }}>{w.label}</span>
                    <div style={styles.judgeWindowBar}>
                      <div
                        style={{
                          ...styles.judgeWindowFill,
                          width: `${(w.range / 220) * 100}%`,
                          background: `${w.color}44`,
                          border: `1px solid ${w.color}66`,
                          transform: `translateX(${offsetShift}%)`
                        }}
                      />
                      <div style={styles.judgeWindowCenter} />
                    </div>
                    <span style={styles.judgeWindowMs}>±{w.range}ms</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConfigTab = () => {
    const hasData = calibration.lastCalibrated !== null
    return (
      <div style={styles.tabContent}>
        <div style={styles.configSummary}>
          <div style={styles.configSummaryTitle}>📋 当前校准配置</div>
          <div style={styles.configGrid}>
            <div style={styles.configItem}>
              <span style={styles.configItemLabel}>音画偏移</span>
              <span style={{
                ...styles.configItemValue,
                color: calibration.audioOffset !== 0 ? '#6699ff' : 'rgba(255,255,255,0.5)'
              }}>
                {calibration.audioOffset > 0 ? '+' : ''}{calibration.audioOffset}ms
              </span>
            </div>
            <div style={styles.configItem}>
              <span style={styles.configItemLabel}>判定偏移</span>
              <span style={{
                ...styles.configItemValue,
                color: calibration.judgmentOffset !== 0 ? '#00ffcc' : 'rgba(255,255,255,0.5)'
              }}>
                {calibration.judgmentOffset > 0 ? '+' : ''}{calibration.judgmentOffset}ms
              </span>
            </div>
            <div style={styles.configItem}>
              <span style={styles.configItemLabel}>键盘平均延迟</span>
              <span style={{
                ...styles.configItemValue,
                color: getAverageKeyLatency() <= 5 ? '#00ffcc' : '#ffcc00'
              }}>
                {getAverageKeyLatency()}ms
              </span>
            </div>
            <div style={styles.configItem}>
              <span style={styles.configItemLabel}>自动应用</span>
              <button
                style={{
                  ...styles.toggleBtn,
                  background: calibration.autoApply
                    ? 'linear-gradient(135deg, #00ffcc, #00ccaa)'
                    : 'rgba(255,255,255,0.1)'
                }}
                onClick={() => setAutoApply(!calibration.autoApply)}
              >
                <div style={{
                  ...styles.toggleKnob,
                  transform: calibration.autoApply ? 'translateX(20px)' : 'translateX(0)'
                }} />
              </button>
            </div>
          </div>
        </div>

        {calibration.calibrationResults.length > 0 && (
          <div style={styles.configHistory}>
            <div style={styles.configHistoryTitle}>📜 校准历史</div>
            {calibration.calibrationResults.slice().reverse().map((result, i) => (
              <div key={i} style={styles.configHistoryItem}>
                <span style={styles.configHistoryType}>
                  {result.type === 'avsync' ? '🎯 音画校准' : '⚙ 手动调整'}
                </span>
                <span style={styles.configHistoryDetail}>
                  音画: {result.audioOffset > 0 ? '+' : ''}{result.audioOffset}ms
                  {' / '}
                  判定: {result.judgmentOffset > 0 ? '+' : ''}{result.judgmentOffset}ms
                </span>
                <span style={styles.configHistoryTime}>
                  {new Date(result.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.configActions}>
          <button style={styles.applyBtn} onClick={handleApplyAll}>
            ✅ 应用当前设置
          </button>
          <button style={styles.resetBtn} onClick={handleReset}>
            🔄 恢复默认
          </button>
        </div>

        {hasData && (
          <div style={styles.configSaved}>
            💾 上次校准: {new Date(calibration.lastCalibrated).toLocaleString('zh-CN')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.bgDecor}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.decorRing,
              width: `${120 + i * 70}px`,
              height: `${120 + i * 70}px`,
              borderColor: `${keyConfig.colors[i % 4]}15`,
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>

      <div style={styles.panel}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎯 演奏校准中心</h1>
          <p style={styles.subtitle}>调整音画延迟、检测键盘输入、校准判定偏移</p>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabBar}>
          {[
            { id: 'avsync', icon: '🔊', label: '音画延迟' },
            { id: 'keyboard', icon: '🎹', label: '键盘检测' },
            { id: 'offset', icon: '🎯', label: '判定偏移' },
            { id: 'config', icon: '⚙', label: '配置管理' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === tab.id ? '#00ffcc' : 'transparent',
                color: activeTab === tab.id ? '#00ffcc' : 'rgba(255,255,255,0.4)'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.contentArea}>
          {activeTab === 'avsync' && renderAvSyncTab()}
          {activeTab === 'keyboard' && renderKeyboardTab()}
          {activeTab === 'offset' && renderOffsetTab()}
          {activeTab === 'config' && renderConfigTab()}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,8,0.95)',
    zIndex: 100,
    backdropFilter: 'blur(20px)'
  },
  bgDecor: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  decorRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid',
    animation: 'pulse 4s ease-in-out infinite'
  },
  panel: {
    position: 'relative',
    zIndex: 1,
    width: '800px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(10,10,20,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 30px 100px rgba(0,0,0,0.6)'
  },
  header: {
    padding: '32px 40px 20px',
    textAlign: 'center',
    position: 'relative'
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #ff3366, #ffcc00, #00ffcc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    margin: 0
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  tabBar: {
    display: 'flex',
    gap: '2px',
    padding: '0 40px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  tabBtn: {
    flex: 1,
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 40px 32px'
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  avMainArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0'
  },
  avRing: {
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    position: 'relative'
  },
  avRingFlash: {
    boxShadow: '0 0 60px rgba(0,255,204,0.4), inset 0 0 40px rgba(0,255,204,0.15)',
    background: 'rgba(0,255,204,0.08)'
  },
  avRingInner: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  avIcon: {
    fontSize: '40px'
  },
  avStatusText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '2px'
  },
  avDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: '1.6'
  },
  avTapCount: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#00ffcc',
    letterSpacing: '2px'
  },
  avHint: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    animation: 'blink 1s ease-in-out infinite'
  },
  avResultValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffcc00'
  },
  avResultPanel: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px'
  },
  avResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  avResultTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff'
  },
  avResultCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  avResultBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px'
  },
  avResultBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  avResultBarIndex: {
    width: '28px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right'
  },
  avResultBarTrack: {
    flex: 1,
    height: '12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden'
  },
  avResultBarCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.2)'
  },
  avResultBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: '6px',
    transition: 'all 0.3s'
  },
  avResultBarValue: {
    width: '60px',
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'right'
  },
  avResultSummary: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  avSummaryItem: {
    flex: 1,
    textAlign: 'center'
  },
  avSummaryLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '4px'
  },
  avSummaryValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff'
  },
  avAppliedBanner: {
    padding: '10px 16px',
    background: 'rgba(0,255,204,0.1)',
    border: '1px solid rgba(0,255,204,0.2)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#00ffcc',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '12px'
  },
  avResultActions: {
    display: 'flex',
    gap: '10px'
  },
  avApplyBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '8px',
    color: '#00332a',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  avRetryBtn: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  avControlRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px'
  },
  startBtn: {
    padding: '14px 40px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '10px',
    color: '#00332a',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,255,204,0.3)',
    transition: 'all 0.2s'
  },
  stopBtn: {
    padding: '14px 40px',
    background: 'linear-gradient(135deg, #ff3366, #cc2255)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255,51,102,0.3)',
    transition: 'all 0.2s'
  },
  clearBtn: {
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  keyBeatMainArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0 8px'
  },
  keyBeatRing: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    position: 'relative'
  },
  keyBeatRingFlash: {
    boxShadow: '0 0 50px rgba(255,204,0,0.45), inset 0 0 30px rgba(255,204,0,0.15)',
    background: 'rgba(255,204,0,0.08)',
    transform: 'scale(1.04)'
  },
  keyBeatRingInner: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  keyBeatIcon: {
    fontSize: '32px'
  },
  keyBeatStatusText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '2px'
  },
  keyBeatDesc: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: '1.6'
  },
  keyBeatTapCount: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#ffcc00',
    letterSpacing: '2px'
  },
  keyBeatHint: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    animation: 'blink 1s ease-in-out infinite'
  },
  keyBeatResultValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#00ffcc'
  },
  keyLaneVisualRow: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    padding: '4px 0 8px'
  },
  keyLaneMiniBox: {
    width: '70px',
    height: '56px',
    border: '2px solid',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.08s',
    overflow: 'hidden'
  },
  keyLaneMiniLabel: {
    fontSize: '20px',
    fontWeight: 800,
    transition: 'all 0.1s'
  },
  keyVisualArea: {
    padding: '20px 0'
  },
  keyLaneRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center'
  },
  keyLaneBox: {
    width: '120px',
    height: '120px',
    border: '2px solid',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.08s',
    position: 'relative',
    overflow: 'hidden'
  },
  keyLaneLabel: {
    fontSize: '32px',
    fontWeight: 800,
    transition: 'all 0.1s'
  },
  keyLaneCode: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '1px'
  },
  keyLaneRipple: {
    position: 'absolute',
    inset: 0,
    borderRadius: '16px',
    border: '2px solid',
    animation: 'ripple 0.5s ease-out forwards'
  },
  keyStatsRow: {
    display: 'flex',
    gap: '12px'
  },
  keyStatCard: {
    flex: 1,
    padding: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  keyStatLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '6px',
    letterSpacing: '1px'
  },
  keyStatValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff'
  },
  keyResultPanel: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px'
  },
  keyResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  keyResultTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff'
  },
  keyResultMeta: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600
  },
  keyResultBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px'
  },
  keyResultBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  keyResultBarIndex: {
    width: '26px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'right'
  },
  keyResultBarTrack: {
    flex: 1,
    height: '10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '5px',
    position: 'relative',
    overflow: 'hidden'
  },
  keyResultBarCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.15)'
  },
  keyResultBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: '5px',
    transition: 'all 0.3s'
  },
  keyResultBarValue: {
    width: '50px',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'right',
    fontFamily: 'monospace'
  },
  keyResultSummary: {
    display: 'flex',
    gap: '12px',
    padding: '10px 0 4px',
    borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  keySummaryItem: {
    flex: 1,
    textAlign: 'center'
  },
  keySummaryLabel: {
    display: 'block',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.25)',
    marginBottom: '3px',
    letterSpacing: '1px'
  },
  keySummaryValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff'
  },
  keyEventDeviation: {
    width: '55px',
    fontWeight: 700,
    fontSize: '11px',
    fontFamily: 'monospace',
    textAlign: 'right'
  },
  keyEventLog: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  keyEventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)'
  },
  keyEventCount: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)'
  },
  keyEventList: {
    maxHeight: '240px',
    overflowY: 'auto'
  },
  keyEventItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    borderLeft: '3px solid',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontSize: '12px'
  },
  keyEventLabel: {
    width: '30px',
    fontWeight: 700,
    color: '#fff'
  },
  keyEventCode: {
    flex: 1,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace'
  },
  keyEventType: {
    fontWeight: 600,
    fontSize: '11px'
  },
  keyEventTime: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    fontSize: '11px'
  },
  keyControlRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px'
  },
  offsetSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  offsetCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px'
  },
  offsetCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  offsetCardIcon: {
    fontSize: '22px'
  },
  offsetCardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#fff'
  },
  offsetDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  offsetSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  offsetSliderLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    width: '50px',
    textAlign: 'center'
  },
  offsetSliderTrack: {
    flex: 1,
    height: '8px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden'
  },
  offsetSliderFill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: '4px',
    transition: 'all 0.15s'
  },
  offsetSliderCenter: {
    position: 'absolute',
    top: '-2px',
    bottom: '-2px',
    width: '2px',
    background: 'rgba(255,255,255,0.2)',
    transform: 'translateX(-50%)'
  },
  offsetSliderInput: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    margin: 0
  },
  offsetValue: {
    textAlign: 'center',
    marginBottom: '16px'
  },
  offsetValueNum: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '2px',
    fontFamily: 'monospace'
  },
  offsetPresets: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center'
  },
  offsetPresetBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  judgeWindowPreview: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  judgeWindowLabel: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: '10px',
    letterSpacing: '1px'
  },
  judgeWindowTrack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  judgeWindowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  judgeWindowName: {
    width: '60px',
    fontSize: '11px',
    fontWeight: 700,
    textAlign: 'right'
  },
  judgeWindowBar: {
    flex: 1,
    height: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden'
  },
  judgeWindowFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: '4px',
    transition: 'transform 0.2s'
  },
  judgeWindowCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.3)',
    transform: 'translateX(-50%)'
  },
  judgeWindowMs: {
    width: '50px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace'
  },
  configSummary: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px'
  },
  configSummaryTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '16px',
    letterSpacing: '1px'
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  configItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px'
  },
  configItemLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500
  },
  configItemValue: {
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'monospace'
  },
  toggleBtn: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '2px'
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'all 0.2s'
  },
  configHistory: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px'
  },
  configHistoryTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '12px',
    letterSpacing: '1px'
  },
  configHistoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: '12px'
  },
  configHistoryType: {
    fontWeight: 600,
    color: '#fff',
    width: '100px'
  },
  configHistoryDetail: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace'
  },
  configHistoryTime: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px'
  },
  configActions: {
    display: 'flex',
    gap: '12px'
  },
  applyBtn: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #00ffcc, #00ccaa)',
    border: 'none',
    borderRadius: '10px',
    color: '#00332a',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '1px',
    boxShadow: '0 4px 20px rgba(0,255,204,0.3)',
    transition: 'all 0.2s'
  },
  resetBtn: {
    padding: '14px 24px',
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.2)',
    borderRadius: '10px',
    color: '#ff3366',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  configSaved: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.25)',
    padding: '8px 0'
  }
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.2; }
    50% { transform: scale(1.03); opacity: 0.4; }
  }
  @keyframes ripple {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.3); opacity: 0; }
  }
`
document.head.appendChild(styleSheet)
