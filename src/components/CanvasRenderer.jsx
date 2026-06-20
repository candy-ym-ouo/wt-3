import { useEffect, useRef } from 'react'

export default function CanvasRenderer({
  track,
  keyConfig,
  gameDataRef,
  currentTime,
  analyser,
  judgeFeedback,
  theme,
  hiddenNotes = false
}) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  const bgId = theme?.backgroundId || 'nebula'
  const hitId = theme?.hitEffectId || 'rings'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let width = 0
    let height = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const NOTE_TRAVEL_TIME = 2.0
    const HIT_LINE_Y = 0.82
    const LANE_START = 0.34
    const LANE_END = 0.66
    const LANE_COUNT = 4

    const getLaneX = (lane) => {
      return width * (LANE_START + (LANE_END - LANE_START) * (lane + 0.5) / LANE_COUNT)
    }
    const getLaneWidth = () => {
      return (width * (LANE_END - LANE_START) / LANE_COUNT) * 0.75
    }

    const drawBackgroundNebula = (t, waveData) => {
      const cx = width / 2
      const cy = height / 2

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) / 1.2)
      bgGrad.addColorStop(0, `rgba(${20 + Math.sin(t * 0.3) * 15}, ${10 + Math.sin(t * 0.2) * 8}, ${40 + Math.sin(t * 0.4) * 25}, 1)`)
      bgGrad.addColorStop(1, '#050508')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      for (let ring = 0; ring < 10; ring++) {
        const baseR = Math.min(width, height) * 0.1 + ring * (Math.min(width, height) * 0.07)
        const r = baseR + Math.sin(t * 0.5 + ring * 0.7) * 18

        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${0.02 + ring * 0.006 + Math.sin(t * 0.8 + ring) * 0.01})`
        ctx.lineWidth = 1

        const segments = 100
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * Math.PI * 2
          const waveIdx = Math.floor((i / segments) * waveData.length)
          const waveVal = waveData[waveIdx] || 0
          const noise1 = Math.sin(a * 5 + t * 1.2 + ring) * 15
          const noise2 = Math.sin(a * 9 + t * 2.1 - ring * 0.6) * 8
          const noise3 = waveVal * 30
          const px = cx + Math.cos(a) * (r + noise1 + noise2 + noise3)
          const py = cy + Math.sin(a) * (r + noise1 + noise2 + noise3)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      const particleCount = 80
      for (let i = 0; i < particleCount; i++) {
        const ang = (i / particleCount) * Math.PI * 2 + t * 0.15 + Math.sin(t * 0.15 + i) * 0.15
        const dist = Math.min(width, height) * (0.25 + (i % 5) * 0.1) + Math.sin(t * 0.6 + i) * 25
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const size = 1.5 + Math.sin(t * 2.5 + i * 0.4) * 1
        const alpha = 0.25 + Math.sin(t * 1.3 + i) * 0.25
        const colorIdx = i % keyConfig.colors.length
        const color = keyConfig.colors[colorIdx]
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${color}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawBackgroundGrid = (t, waveData) => {
      const cx = width / 2
      const cy = height / 2

      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, width, height)

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6)
      grad.addColorStop(0, 'rgba(0,20,40,0.4)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      const gridSize = 40
      const offsetX = (t * 15) % gridSize
      const offsetY = (t * 20) % gridSize

      ctx.strokeStyle = `${keyConfig.colors[2]}12`
      ctx.lineWidth = 0.5
      for (let x = -gridSize + offsetX; x < width + gridSize; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = -gridSize + offsetY; y < height + gridSize; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const horizonY = height * 0.55
      for (let i = -15; i <= 15; i++) {
        ctx.beginPath()
        ctx.strokeStyle = `${keyConfig.colors[Math.abs(i) % 4]}0a`
        ctx.moveTo(cx, horizonY)
        ctx.lineTo(cx + i * width * 0.1, height)
        ctx.stroke()
      }

      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2 + t * 0.15
        const dist = 50 + (i % 6) * 30 + Math.sin(t * 0.5 + i) * 15
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const alpha = 0.15 + Math.sin(t + i) * 0.1
        const colorIdx = i % 4
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[colorIdx]}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawBackgroundRain = (t, waveData) => {
      const cx = width / 2
      const cy = height / 2

      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, width, height)

      const chars = '01アイウエオカキクケコサシスセソ'
      ctx.font = '12px monospace'
      for (let i = 0; i < 120; i++) {
        const col = i % 30
        const speed = 40 + (i % 5) * 15
        const x = (col * (width / 30))
        const baseY = (i * 47 + t * speed) % (height + 200) - 100
        const colorIdx = col % 4
        const alpha = 0.15 + Math.sin(t + i) * 0.08
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[colorIdx]}${alphaHex}`
        ctx.fillText(chars[i % chars.length], x, baseY)
        for (let j = 1; j < 8; j++) {
          const trailAlpha = alpha * (1 - j * 0.12)
          if (trailAlpha <= 0) break
          const trailAlphaHex = Math.floor(trailAlpha * 255).toString(16).padStart(2, '0')
          ctx.fillStyle = `${keyConfig.colors[colorIdx]}${trailAlphaHex}`
          ctx.fillText(chars[(i + j * 3) % chars.length], x, baseY - j * 14)
        }
      }

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.3)
      grad.addColorStop(0, `${keyConfig.colors[2]}08`)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }

    const drawBackgroundAurora = (t, waveData) => {
      ctx.fillStyle = '#050510'
      ctx.fillRect(0, 0, width, height)

      for (let band = 0; band < 5; band++) {
        ctx.beginPath()
        const baseY = height * (0.15 + band * 0.12)
        for (let x = 0; x <= width; x += 3) {
          const y = baseY
            + Math.sin(x * 0.003 + t * (0.3 + band * 0.2) + band * 2) * 40
            + Math.sin(x * 0.008 + t * 0.8 + band) * 15
            + (waveData[Math.floor((x / width) * waveData.length)] || 0) * 20
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const grad = ctx.createLinearGradient(0, baseY - 60, 0, baseY + 80)
        const c = keyConfig.colors[band % 4]
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.3, `${c}25`)
        grad.addColorStop(0.6, `${c}12`)
        grad.addColorStop(1, 'transparent')
        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
      }

      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2 + t * 0.1
        const dist = 80 + (i % 5) * 30 + Math.sin(t * 0.4 + i) * 20
        const x = width / 2 + Math.cos(ang) * dist
        const y = height / 2 + Math.sin(ang) * dist
        const alpha = 0.2 + Math.sin(t + i) * 0.1
        const colorIdx = i % 4
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[colorIdx]}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, 1.5 + Math.sin(t * 2 + i) * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawBackgroundMinimal = (t, waveData) => {
      ctx.fillStyle = '#080810'
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.35)
      grad.addColorStop(0, 'rgba(255,255,255,0.02)')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2 + t * 0.05
        const dist = 100 + (i % 4) * 30
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const alpha = 0.08 + Math.sin(t + i) * 0.04
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[i % 4]}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawBackgroundRetro = (t, waveData) => {
      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, width, height)

      for (let y = 0; y < height; y += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.fillRect(0, y, width, 1)
      }

      const scanY = (t * 60) % height
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30)
      scanGrad.addColorStop(0, 'transparent')
      scanGrad.addColorStop(0.5, `${keyConfig.colors[0]}12`)
      scanGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 30, width, 60)

      for (let i = 0; i < 30; i++) {
        const ang = (i / 30) * Math.PI * 2 + t * 0.1
        const dist = 80 + (i % 5) * 25
        const x = width / 2 + Math.cos(ang) * dist
        const y = height / 2 + Math.sin(ang) * dist
        const alpha = 0.2 + Math.sin(t * 2 + i) * 0.1
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[i % 4]}${alphaHex}`
        ctx.fillRect(x - 2, y - 2, 4, 4)
      }
    }

    const drawBackground = (t, waveData) => {
      switch (bgId) {
        case 'grid': drawBackgroundGrid(t, waveData); break
        case 'rain': drawBackgroundRain(t, waveData); break
        case 'aurora': drawBackgroundAurora(t, waveData); break
        case 'minimal': drawBackgroundMinimal(t, waveData); break
        case 'retro': drawBackgroundRetro(t, waveData); break
        default: drawBackgroundNebula(t, waveData); break
      }
      drawBackgroundPulse(t, time)
    }

    const drawBackgroundPulse = (t, time) => {
      const cx = width / 2
      const cy = height / 2

      gameDataRef.current.bgPulses.forEach(bp => {
        const age = time - bp.time
        if (age > 0.8) return
        const progress = age / 0.8
        const alpha = (1 - progress) * bp.intensity * 0.35

        const judgeColors = {
          perfect: '#ffcc00',
          great: '#00ffcc',
          good: '#6699ff',
          miss: '#ff3366'
        }
        const color = judgeColors[bp.type] || '#ffffff'

        const pulseLayers = bp.intensity >= 0.7 ? 3 : bp.intensity >= 0.4 ? 2 : 1
        for (let layer = 0; layer < pulseLayers; layer++) {
          const layerProgress = Math.max(0, progress - layer * 0.15)
          const r = Math.min(width, height) * (0.05 + layerProgress * 0.5)
          const layerAlpha = alpha * (1 - layer * 0.3)

          const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r)
          grad.addColorStop(0, `${color}00`)
          grad.addColorStop(0.6, `${color}${Math.floor(layerAlpha * 120).toString(16).padStart(2, '0')}`)
          grad.addColorStop(1, `${color}00`)
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, width, height)
        }

        if (bp.intensity >= 0.7) {
          ctx.strokeStyle = `${color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 2 * (1 - progress)
          const ringR = Math.min(width, height) * (0.1 + progress * 0.4)
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.stroke()
        }

        if (bp.type === 'perfect') {
          const flashAlpha = Math.max(0, (0.15 - progress) / 0.15) * bp.intensity * 0.25
          if (flashAlpha > 0) {
            ctx.fillStyle = `${color}${Math.floor(flashAlpha * 255).toString(16).padStart(2, '0')}`
            ctx.fillRect(0, 0, width, height)
          }
        }
      })
    }

    const drawWaveform = (t, waveData) => {
      if (bgId === 'minimal') return

      const barCount = 128
      const barWidth = width / barCount
      const centerY = height / 2
      const barHeight = height * 0.3

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * waveData.length)
        const val = Math.abs(waveData[idx] || 0)
        const h = val * barHeight
        const x = i * barWidth

        const hue = (i / barCount) * 360 + t * 30
        const alpha = 0.12 + val * 0.2
        ctx.fillStyle = `hsla(${hue}, 85%, 65%, ${alpha})`
        ctx.fillRect(x, centerY - h / 2, barWidth - 1, h)

        if (val > 0.3) {
          ctx.fillStyle = `hsla(${hue}, 95%, 85%, ${val * 0.5})`
          ctx.fillRect(x, centerY - 1.5, barWidth - 1, 3)
        }
      }
    }

    const drawBottomWave = (t, waveData) => {
      if (bgId === 'minimal' || bgId === 'retro') return

      const bottomY = height - 100
      const waveWidth = width
      const waveHeight = 80

      ctx.beginPath()
      ctx.moveTo(0, bottomY)

      const segments = 200
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * waveWidth
        const idx = Math.floor((i / segments) * waveData.length)
        const val = waveData[idx] || 0
        const y = bottomY - Math.abs(val) * waveHeight
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      for (let i = segments; i >= 0; i--) {
        const x = (i / segments) * waveWidth
        const idx = Math.floor((i / segments) * waveData.length)
        const val = waveData[idx] || 0
        const y = bottomY + Math.abs(val) * waveHeight * 0.5
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      const grad = ctx.createLinearGradient(0, bottomY - waveHeight, 0, bottomY + waveHeight * 0.5)
      grad.addColorStop(0, `${keyConfig.colors[2]}00`)
      grad.addColorStop(0.5, `${keyConfig.colors[2]}33`)
      grad.addColorStop(1, `${keyConfig.colors[0]}1a`)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * waveWidth
        const idx = Math.floor((i / segments) * waveData.length)
        const val = waveData[idx] || 0
        const y = bottomY - Math.abs(val) * waveHeight
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = `${keyConfig.colors[2]}99`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const drawLanes = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const laneWidth = getLaneWidth()

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }

      for (let i = 0; i < LANE_COUNT; i++) {
        const x = getLaneX(i)

        let laneFlashIntensity = 0
        let laneFlashColor = null
        gameDataRef.current.laneFlashes.forEach(lf => {
          if (lf.lane === i) {
            const age = time - lf.time
            if (age < 0.5) {
              const progress = age / 0.5
              const intensity = (1 - progress) * (lf.type === 'perfect' ? 1.0 : lf.type === 'great' ? 0.7 : lf.type === 'good' ? 0.45 : 0.35)
              if (intensity > laneFlashIntensity) {
                laneFlashIntensity = intensity
                laneFlashColor = judgeColors[lf.type]
              }
            }
          }
        })

        const baseGrad = ctx.createLinearGradient(x, 0, x, hitY)
        if (laneFlashIntensity > 0 && laneFlashColor) {
          baseGrad.addColorStop(0, `${laneFlashColor}00`)
          baseGrad.addColorStop(0.5, `${laneFlashColor}${Math.floor(laneFlashIntensity * 35).toString(16).padStart(2, '0')}`)
          baseGrad.addColorStop(1, `${laneFlashColor}${Math.floor(laneFlashIntensity * 70).toString(16).padStart(2, '0')}`)
        } else {
          baseGrad.addColorStop(0, `${keyConfig.colors[i]}00`)
          baseGrad.addColorStop(0.5, `${keyConfig.colors[i]}0a`)
          baseGrad.addColorStop(1, `${keyConfig.colors[i]}22`)
        }

        ctx.fillStyle = baseGrad
        ctx.fillRect(x - laneWidth / 2, 0, laneWidth, hitY + 30)

        const laneBorderAlpha = laneFlashIntensity > 0 ? Math.min(1, 0.15 + laneFlashIntensity * 0.6) : 0.15
        const laneBorderColor = laneFlashIntensity > 0 && laneFlashColor ? laneFlashColor : keyConfig.colors[i]
        ctx.strokeStyle = `${laneBorderColor}${Math.floor(laneBorderAlpha * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 1
        ctx.setLineDash([8, 12])
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, hitY)
        ctx.stroke()
        ctx.setLineDash([])

        if (laneFlashIntensity > 0.4) {
          ctx.strokeStyle = `${laneFlashColor}${Math.floor(laneFlashIntensity * 120).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x - laneWidth / 2, 0)
          ctx.lineTo(x - laneWidth / 2, hitY + 30)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x + laneWidth / 2, 0)
          ctx.lineTo(x + laneWidth / 2, hitY + 30)
          ctx.stroke()
        }
      }

      const hitGlow = 0.5 + Math.sin(t * 4) * 0.3
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = getLaneX(i)
        const pressed = gameDataRef.current.lanePressed[i]

        let hitFlashIntensity = 0
        let hitFlashColor = null
        gameDataRef.current.laneFlashes.forEach(lf => {
          if (lf.lane === i) {
            const age = time - lf.time
            if (age < 0.4) {
              const progress = age / 0.4
              const intensity = (1 - progress) * (lf.type === 'perfect' ? 1.0 : lf.type === 'great' ? 0.75 : lf.type === 'good' ? 0.5 : 0.4)
              if (intensity > hitFlashIntensity) {
                hitFlashIntensity = intensity
                hitFlashColor = judgeColors[lf.type]
              }
            }
          }
        })

        const baseColor = hitFlashIntensity > 0 && hitFlashColor ? hitFlashColor : keyConfig.colors[i]
        const r = laneWidth / 2 + (pressed ? 6 : 0) + hitFlashIntensity * 8

        ctx.beginPath()
        ctx.strokeStyle = pressed
          ? baseColor
          : `${baseColor}${Math.floor((hitFlashIntensity > 0 ? (128 + hitFlashIntensity * 127) : 136) / 255 * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = pressed ? 3.5 : (2.5 + hitFlashIntensity * 2)
        ctx.arc(x, hitY, r, 0, Math.PI * 2)
        ctx.stroke()

        const fillAlpha = pressed ? 0.35 : hitGlow * 0.2 + hitFlashIntensity * 0.35
        const fillAlphaHex = Math.floor(fillAlpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${baseColor}${fillAlphaHex}`
        ctx.fill()

        const glowR = r + 12 + Math.sin(t * 2.5 + i) * 5 + hitFlashIntensity * 15
        const glowAlpha = (pressed ? 0.7 : hitGlow * 0.4) + hitFlashIntensity * 0.3
        const glowAlphaHex = Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.strokeStyle = `${baseColor}${glowAlphaHex}`
        ctx.lineWidth = 1.5 + hitFlashIntensity * 1.5
        ctx.arc(x, hitY, glowR, 0, Math.PI * 2)
        ctx.stroke()

        if (pressed || hitFlashIntensity > 0.3) {
          const innerR = r * 0.4
          const innerGrad = ctx.createRadialGradient(x, hitY, 0, x, hitY, innerR)
          const innerAlpha = pressed ? 1 : (0.5 + hitFlashIntensity * 0.5)
          innerGrad.addColorStop(0, `${baseColor}${Math.floor(innerAlpha * 255).toString(16).padStart(2, '0')}`)
          innerGrad.addColorStop(1, `${baseColor}${Math.floor((0.3 + hitFlashIntensity * 0.4) * 255).toString(16).padStart(2, '0')}`)
          ctx.fillStyle = innerGrad
          ctx.beginPath()
          ctx.arc(x, hitY, innerR * (1 + hitFlashIntensity * 0.3), 0, Math.PI * 2)
          ctx.fill()
        }

        if (hitFlashIntensity > 0.5) {
          const shockR = r * (1.5 + hitFlashIntensity * 0.5)
          const shockAlpha = (hitFlashIntensity - 0.5) * 2
          ctx.beginPath()
          ctx.strokeStyle = `${hitFlashColor}${Math.floor(shockAlpha * 180).toString(16).padStart(2, '0')}`
          ctx.lineWidth = shockAlpha * 4
          ctx.arc(x, hitY, shockR, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    const drawNotes = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const laneWidth = getLaneWidth()

      const activeNotes = gameDataRef.current.activeNotes

      activeNotes.forEach(note => {
        if (note.hit || note.missed) return

        const noteAge = time - note.time
        if (noteAge > 0.3) return
        if (noteAge < -NOTE_TRAVEL_TIME) return

        const progress = 1 + (noteAge / NOTE_TRAVEL_TIME)
        if (progress < -0.1 || progress > 1.2) return

        const laneX = getLaneX(note.lane)
        const y = hitY - (HIT_LINE_Y * height) * (1 - progress)

        const scale = 0.25 + progress * 0.75
        const size = (laneWidth / 2) * scale
        let alpha = Math.min(1, Math.max(0, progress * 1.8))
        if (hiddenNotes && progress < 0.7) {
          alpha = 0
        } else if (hiddenNotes && progress < 0.85) {
          alpha = alpha * ((progress - 0.7) / 0.15)
        }

        const color = keyConfig.colors[note.lane]
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')

        const glowGrad = ctx.createRadialGradient(laneX, y, 0, laneX, y, size * 1.8)
        glowGrad.addColorStop(0, `${color}${Math.floor(alpha * 90).toString(16).padStart(2, '0')}`)
        glowGrad.addColorStop(0.5, `${color}${Math.floor(alpha * 40).toString(16).padStart(2, '0')}`)
        glowGrad.addColorStop(1, `${color}00`)
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(laneX, y, size * 1.8, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.strokeStyle = `${color}${alphaHex}`
        ctx.lineWidth = 3
        ctx.arc(laneX, y, size, 0, Math.PI * 2)
        ctx.stroke()

        ctx.beginPath()
        const innerGrad = ctx.createRadialGradient(laneX, y, 0, laneX, y, size * 0.6)
        innerGrad.addColorStop(0, `${color}${Math.floor(alpha * 220).toString(16).padStart(2, '0')}`)
        innerGrad.addColorStop(1, `${color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`)
        ctx.fillStyle = innerGrad
        ctx.arc(laneX, y, size * 0.55, 0, Math.PI * 2)
        ctx.fill()

        if (progress > 0.7 && progress < 1.1) {
          const pulseR = size * (1.1 + (progress - 0.7) * 1.2)
          const pulseAlpha = (1 - (progress - 0.7) / 0.5) * alpha
          const pulseAlphaHex = Math.floor(pulseAlpha * 180).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${color}${pulseAlphaHex}`
          ctx.lineWidth = 1.5
          ctx.arc(laneX, y, pulseR, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
    }

    const drawHitEffectRings = (effect, t, time) => {
      const hitY = height * HIT_LINE_Y
      const age = time - effect.time
      if (age > 0.6) return
      const progress = age / 0.6
      const x = getLaneX(effect.lane)
      const y = hitY

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }
      const color = judgeColors[effect.type]

      if (effect.type !== 'miss') {
        for (let ring = 0; ring < 4; ring++) {
          const r = 15 + progress * (80 + ring * 25)
          const ringAlpha = (1 - progress) * (1 - ring * 0.2)
          const ringAlphaHex = Math.floor(ringAlpha * 255).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${color}${ringAlphaHex}`
          ctx.lineWidth = 2.5 - ring * 0.5
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    const drawHitEffectSparks = (effect, t, time) => {
      const hitY = height * HIT_LINE_Y
      const age = time - effect.time
      if (age > 0.6) return
      const progress = age / 0.6
      const x = getLaneX(effect.lane)
      const y = hitY
      const alpha = 1 - progress

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }
      const color = judgeColors[effect.type]

      if (effect.type !== 'miss') {
        const sparkCount = effect.type === 'perfect' ? 16 : effect.type === 'great' ? 10 : 6
        for (let p = 0; p < sparkCount; p++) {
          const angle = (p / sparkCount) * Math.PI * 2 + effect.lane * 0.8
          const speed = 60 + Math.sin(p * 3.7) * 30
          const dist = progress * speed
          const px = x + Math.cos(angle) * dist
          const py = y + Math.sin(angle) * dist - progress * 20
          const sparkAlpha = alpha * (1 - p * 0.03)
          const sparkAlphaHex = Math.floor(sparkAlpha * 255).toString(16).padStart(2, '0')
          ctx.fillStyle = `${color}${sparkAlphaHex}`
          ctx.beginPath()
          ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = `rgba(255,255,255,${sparkAlpha * 0.5})`
          ctx.beginPath()
          ctx.arc(px, py, 1.2 * (1 - progress), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const drawHitEffectWave = (effect, t, time) => {
      const hitY = height * HIT_LINE_Y
      const age = time - effect.time
      if (age > 0.6) return
      const progress = age / 0.6
      const x = getLaneX(effect.lane)
      const y = hitY
      const alpha = 1 - progress

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }
      const color = judgeColors[effect.type]

      if (effect.type !== 'miss') {
        for (let wave = 0; wave < 3; wave++) {
          const waveR = 10 + progress * (70 + wave * 20)
          const waveW = 20 + wave * 10
          const waveAlpha = alpha * (1 - wave * 0.25)
          const waveAlphaHex = Math.floor(waveAlpha * 200).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${color}${waveAlphaHex}`
          ctx.lineWidth = 2.5 - wave * 0.5
          ctx.ellipse(x, y, waveR, waveW, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    const drawHitEffectDiamond = (effect, t, time) => {
      const hitY = height * HIT_LINE_Y
      const age = time - effect.time
      if (age > 0.6) return
      const progress = age / 0.6
      const x = getLaneX(effect.lane)
      const y = hitY
      const alpha = 1 - progress

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }
      const color = judgeColors[effect.type]

      if (effect.type !== 'miss') {
        const diamondSize = 10 + progress * 50
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(progress * Math.PI * 0.5)
        for (let d = 0; d < 3; d++) {
          const ds = diamondSize + d * 12
          const dAlpha = alpha * (1 - d * 0.3)
          const dAlphaHex = Math.floor(dAlpha * 200).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${color}${dAlphaHex}`
          ctx.lineWidth = 2.5 - d * 0.5
          ctx.moveTo(0, -ds)
          ctx.lineTo(ds * 0.6, 0)
          ctx.lineTo(0, ds)
          ctx.lineTo(-ds * 0.6, 0)
          ctx.closePath()
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    const drawHitEffectBloom = (effect, t, time) => {
      const hitY = height * HIT_LINE_Y
      const age = time - effect.time
      if (age > 0.6) return
      const progress = age / 0.6
      const x = getLaneX(effect.lane)
      const y = hitY
      const alpha = 1 - progress

      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }
      const color = judgeColors[effect.type]

      if (effect.type !== 'miss') {
        const petals = effect.type === 'perfect' ? 8 : effect.type === 'great' ? 6 : 4
        const bloomR = 8 + progress * 45
        const rot = progress * Math.PI * 0.4
        ctx.save()
        ctx.translate(x, y)
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + rot
          const px = Math.cos(angle) * bloomR
          const py = Math.sin(angle) * bloomR
          const petalAlpha = alpha * 0.7
          const petalAlphaHex = Math.floor(petalAlpha * 255).toString(16).padStart(2, '0')
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 10)
          grad.addColorStop(0, `${color}${petalAlphaHex}`)
          grad.addColorStop(1, `${color}00`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, 10 * (1 - progress * 0.4), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }

    const drawEffects = (t, time) => {
      const hitY = height * HIT_LINE_Y

      gameDataRef.current.ringPulses.forEach(rp => {
        const age = time - rp.time
        if (age > 1.0) return
        const progress = age / 1.0
        const x = getLaneX(rp.lane)
        const tier = rp.tier || 0
        const tierMultiplier = 1 + tier * 0.25
        const r = rp.radius * Math.min(width, height) * 2 * tierMultiplier
        const alpha = (1 - progress) * (0.4 + tier * 0.1)
        const lineWidth = (1 - progress) * (3 + tier * 1.5)

        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.strokeStyle = `${rp.color}${alphaHex}`
        ctx.lineWidth = lineWidth
        ctx.arc(x, hitY, r, 0, Math.PI * 2)
        ctx.stroke()

        if (tier >= 2) {
          const alpha2 = (1 - progress) * 0.3
          const alphaHex2 = Math.floor(alpha2 * 255).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${rp.color}${alphaHex2}`
          ctx.lineWidth = lineWidth * 0.5
          ctx.arc(x, hitY, r * 0.7, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (tier >= 3) {
          const alpha3 = (1 - progress) * 0.2
          const alphaHex3 = Math.floor(alpha3 * 255).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.strokeStyle = `${rp.color}${alphaHex3}`
          ctx.lineWidth = lineWidth * 0.3
          ctx.arc(x, hitY, r * 0.4, 0, Math.PI * 2)
          ctx.stroke()
        }
      })

      gameDataRef.current.hitEffects.forEach(effect => {
        switch (hitId) {
          case 'sparks': drawHitEffectSparks(effect, t, time); break
          case 'wave': drawHitEffectWave(effect, t, time); break
          case 'diamond': drawHitEffectDiamond(effect, t, time); break
          case 'bloom': drawHitEffectBloom(effect, t, time); break
          default: drawHitEffectRings(effect, t, time); break
        }
      })

      drawHitFeedbacks(t, time)

      gameDataRef.current.particles.forEach(p => {
        const x = p.x * width
        const y = p.y * height
        const alpha = p.life
        const tier = p.tier || 0

        if (p.trail && tier >= 2) {
          const trailLength = tier >= 3 ? 5 : 3
          for (let tr = 1; tr <= trailLength; tr++) {
            const trailAlpha = alpha * (1 - tr / (trailLength + 1)) * 0.4
            const trailX = x - p.vx * width * tr * 2
            const trailY = y - p.vy * height * tr * 2
            const trailSize = p.size * p.life * (1 - tr / (trailLength + 1)) * 0.6
            if (trailAlpha > 0 && trailSize > 0) {
              const trailAlphaHex = Math.floor(trailAlpha * 255).toString(16).padStart(2, '0')
              ctx.fillStyle = `${p.color}${trailAlphaHex}`
              ctx.beginPath()
              ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }

        const mainSize = p.size * p.life * (1 + tier * 0.15)
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${p.color}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, mainSize, 0, Math.PI * 2)
        ctx.fill()

        const coreSize = mainSize * (tier >= 2 ? 0.5 : 0.35)
        ctx.fillStyle = `rgba(255,255,255,${alpha * (tier >= 2 ? 0.9 : 0.7)})`
        ctx.beginPath()
        ctx.arc(x, y, coreSize, 0, Math.PI * 2)
        ctx.fill()

        if (tier >= 3) {
          const haloSize = mainSize * 2.5
          const haloAlpha = alpha * 0.25
          const haloAlphaHex = Math.floor(haloAlpha * 255).toString(16).padStart(2, '0')
          const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, haloSize)
          haloGrad.addColorStop(0, `${p.color}${haloAlphaHex}`)
          haloGrad.addColorStop(1, `${p.color}00`)
          ctx.fillStyle = haloGrad
          ctx.beginPath()
          ctx.arc(x, y, haloSize, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    const drawHitFeedbacks = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const judgeColors = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }

      gameDataRef.current.hitFeedbacks.forEach(hf => {
        const age = time - hf.time
        if (age > 0.6) return
        const progress = age / 0.6
        const x = getLaneX(hf.lane)
        const y = hitY
        const color = judgeColors[hf.type]

        if (hf.type === 'miss') {
          const shakeX = (Math.random() - 0.5) * (1 - progress) * 8
          const shakeY = (Math.random() - 0.5) * (1 - progress) * 8
          const missSize = 30 + progress * 20
          const missAlpha = (1 - progress) * 0.8
          const missAlphaHex = Math.floor(missAlpha * 255).toString(16).padStart(2, '0')

          ctx.strokeStyle = `${color}${missAlphaHex}`
          ctx.lineWidth = 3 * (1 - progress * 0.5)
          ctx.beginPath()
          ctx.moveTo(x + shakeX - missSize * 0.5, y + shakeY - missSize * 0.5)
          ctx.lineTo(x + shakeX + missSize * 0.5, y + shakeY + missSize * 0.5)
          ctx.moveTo(x + shakeX + missSize * 0.5, y + shakeY - missSize * 0.5)
          ctx.lineTo(x + shakeX - missSize * 0.5, y + shakeY + missSize * 0.5)
          ctx.stroke()
          return
        }

        const scale = 1 + progress * 1.2
        const alpha = 1 - progress
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')

        if (hf.type === 'perfect') {
          const starSize = 20 * scale
          ctx.save()
          ctx.translate(x, y - 40 - progress * 30)
          ctx.rotate(progress * Math.PI * 0.5)
          ctx.strokeStyle = `${color}${alphaHex}`
          ctx.lineWidth = 3 * alpha
          ctx.shadowColor = color
          ctx.shadowBlur = 20 * alpha
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            const innerAngle = angle + Math.PI / 5
            const outerX = Math.cos(angle) * starSize
            const outerY = Math.sin(angle) * starSize
            const innerX = Math.cos(innerAngle) * starSize * 0.4
            const innerY = Math.sin(innerAngle) * starSize * 0.4
            if (i === 0) ctx.moveTo(outerX, outerY)
            else ctx.lineTo(outerX, outerY)
            ctx.lineTo(innerX, innerY)
          }
          ctx.closePath()
          ctx.stroke()

          const fillAlphaHex = Math.floor(alpha * 120).toString(16).padStart(2, '0')
          ctx.fillStyle = `${color}${fillAlphaHex}`
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        if (hf.type === 'great') {
          ctx.save()
          ctx.translate(x, y - 40 - progress * 25)
          ctx.rotate(progress * Math.PI * 0.3)
          ctx.strokeStyle = `${color}${alphaHex}`
          ctx.lineWidth = 3 * alpha
          ctx.shadowColor = color
          ctx.shadowBlur = 15 * alpha
          const diamondSize = 18 * scale
          ctx.beginPath()
          ctx.moveTo(0, -diamondSize)
          ctx.lineTo(diamondSize * 0.6, 0)
          ctx.lineTo(0, diamondSize)
          ctx.lineTo(-diamondSize * 0.6, 0)
          ctx.closePath()
          ctx.stroke()
          const fillAlphaHex = Math.floor(alpha * 80).toString(16).padStart(2, '0')
          ctx.fillStyle = `${color}${fillAlphaHex}`
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        if (hf.type === 'good') {
          ctx.save()
          ctx.translate(x, y - 40 - progress * 20)
          ctx.strokeStyle = `${color}${alphaHex}`
          ctx.lineWidth = 3 * alpha
          ctx.shadowColor = color
          ctx.shadowBlur = 10 * alpha
          const dotSize = 12 * scale
          ctx.beginPath()
          ctx.arc(0, 0, dotSize, 0, Math.PI * 2)
          ctx.stroke()
          const fillAlphaHex = Math.floor(alpha * 60).toString(16).padStart(2, '0')
          ctx.fillStyle = `${color}${fillAlphaHex}`
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.restore()
        }

        const lineCount = hf.type === 'perfect' ? 8 : hf.type === 'great' ? 5 : 3
        for (let i = 0; i < lineCount; i++) {
          const lineAngle = (i / lineCount) * Math.PI * 2 + progress * 2
          const innerR = 30 * (1 + progress * 0.3)
          const outerR = 30 * (1 + progress * 1.5) + (hf.type === 'perfect' ? 40 : hf.type === 'great' ? 25 : 15)
          const lineAlpha = alpha * 0.8
          const lineAlphaHex = Math.floor(lineAlpha * 255).toString(16).padStart(2, '0')
          ctx.strokeStyle = `${color}${lineAlphaHex}`
          ctx.lineWidth = (1 - progress) * (hf.type === 'perfect' ? 3 : 2)
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(lineAngle) * innerR, y + Math.sin(lineAngle) * innerR)
          ctx.lineTo(x + Math.cos(lineAngle) * outerR, y + Math.sin(lineAngle) * outerR)
          ctx.stroke()
        }
      })
    }

    const drawJudgeFeedback = (t) => {
      if (!judgeFeedback) return
      const age = (Date.now() - judgeFeedback.id) / 450
      if (age > 1) return

      const cx = width / 2
      const cy = height * 0.62

      const progress = age
      const alpha = 1 - progress
      const offsetY = -progress * 70
      const scale = 1 + progress * 0.6

      const textMap = {
        perfect: 'PERFECT',
        great: 'GREAT',
        good: 'GOOD',
        miss: 'MISS'
      }
      const colorMap = {
        perfect: '#ffcc00',
        great: '#00ffcc',
        good: '#6699ff',
        miss: '#ff3366'
      }

      const text = textMap[judgeFeedback.type]
      const color = colorMap[judgeFeedback.type]
      const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')

      ctx.save()
      ctx.translate(cx, cy + offsetY)
      ctx.scale(scale, scale)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.shadowColor = color
      ctx.shadowBlur = 40 * alpha

      ctx.font = `900 ${48}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
      ctx.fillStyle = `${color}${alphaHex}`
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.6})`
      ctx.lineWidth = 4
      ctx.strokeText(text, 0, 0)
      ctx.fillText(text, 0, 0)

      ctx.restore()
    }

    const render = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      const time = currentTime

      let waveData = new Float32Array(256)
      if (analyser && analyser.getValue) {
        try {
          waveData = analyser.getValue()
        } catch (e) {}
      }

      ctx.clearRect(0, 0, width, height)

      drawBackground(t, waveData)
      drawWaveform(t, waveData)
      drawBottomWave(t, waveData)
      drawLanes(t, time)
      drawNotes(t, time)
      drawEffects(t, time)
      drawJudgeFeedback(t)

      animRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [track, keyConfig, currentTime, analyser, judgeFeedback, gameDataRef, bgId, hitId])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%'
      }}
    />
  )
}
