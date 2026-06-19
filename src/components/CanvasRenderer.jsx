import { useEffect, useRef } from 'react'

export default function CanvasRenderer({
  track,
  keyConfig,
  gameDataRef,
  currentTime,
  analyser,
  judgeFeedback
}) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

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

    const drawBackground = (t, waveData) => {
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

    const drawWaveform = (t, waveData) => {
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
      grad.addColorStop(0, 'rgba(0, 255, 204, 0.0)')
      grad.addColorStop(0.5, 'rgba(0, 255, 204, 0.2)')
      grad.addColorStop(1, 'rgba(255, 51, 102, 0.1)')
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
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const drawLanes = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const laneWidth = getLaneWidth()

      for (let i = 0; i < LANE_COUNT; i++) {
        const x = getLaneX(i)

        const laneGrad = ctx.createLinearGradient(x, 0, x, hitY)
        laneGrad.addColorStop(0, `${keyConfig.colors[i]}00`)
        laneGrad.addColorStop(0.5, `${keyConfig.colors[i]}0a`)
        laneGrad.addColorStop(1, `${keyConfig.colors[i]}22`)

        ctx.fillStyle = laneGrad
        ctx.fillRect(x - laneWidth / 2, 0, laneWidth, hitY + 30)

        ctx.strokeStyle = `${keyConfig.colors[i]}2a`
        ctx.lineWidth = 1
        ctx.setLineDash([8, 12])
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, hitY)
        ctx.stroke()
        ctx.setLineDash([])
      }

      const hitGlow = 0.5 + Math.sin(t * 4) * 0.3
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = getLaneX(i)
        const pressed = gameDataRef.current.lanePressed[i]

        const r = laneWidth / 2 + (pressed ? 6 : 0)

        ctx.beginPath()
        ctx.strokeStyle = pressed
          ? keyConfig.colors[i]
          : `${keyConfig.colors[i]}88`
        ctx.lineWidth = pressed ? 3.5 : 2.5
        ctx.arc(x, hitY, r, 0, Math.PI * 2)
        ctx.stroke()

        const fillAlpha = pressed ? 0.35 : hitGlow * 0.2
        const fillAlphaHex = Math.floor(fillAlpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${keyConfig.colors[i]}${fillAlphaHex}`
        ctx.fill()

        const glowR = r + 12 + Math.sin(t * 2.5 + i) * 5
        const glowAlpha = (pressed ? 0.7 : hitGlow * 0.4)
        const glowAlphaHex = Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.strokeStyle = `${keyConfig.colors[i]}${glowAlphaHex}`
        ctx.lineWidth = 1.5
        ctx.arc(x, hitY, glowR, 0, Math.PI * 2)
        ctx.stroke()

        if (pressed) {
          const innerR = r * 0.4
          const innerGrad = ctx.createRadialGradient(x, hitY, 0, x, hitY, innerR)
          innerGrad.addColorStop(0, `${keyConfig.colors[i]}ff`)
          innerGrad.addColorStop(1, `${keyConfig.colors[i]}44`)
          ctx.fillStyle = innerGrad
          ctx.beginPath()
          ctx.arc(x, hitY, innerR, 0, Math.PI * 2)
          ctx.fill()
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
        const alpha = Math.min(1, Math.max(0, progress * 1.8))

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

    const drawEffects = (t, time) => {
      const hitY = height * HIT_LINE_Y

      gameDataRef.current.ringPulses.forEach(rp => {
        const age = time - rp.time
        if (age > 1.0) return
        const progress = age / 1.0
        const x = getLaneX(rp.lane)
        const r = rp.radius * Math.min(width, height) * 2
        const alpha = (1 - progress) * 0.6

        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.strokeStyle = `${rp.color}${alphaHex}`
        ctx.lineWidth = (1 - progress) * 4
        ctx.arc(x, hitY, r, 0, Math.PI * 2)
        ctx.stroke()
      })

      gameDataRef.current.hitEffects.forEach(effect => {
        const age = time - effect.time
        if (age > 0.6) return
        const progress = age / 0.6
        const x = getLaneX(effect.lane)
        const y = hitY
        const alpha = 1 - progress

        const colors = {
          perfect: '#ffcc00',
          great: '#00ffcc',
          good: '#6699ff',
          miss: '#ff3366'
        }
        const color = colors[effect.type]

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
      })

      gameDataRef.current.particles.forEach(p => {
        const x = p.x * width
        const y = p.y * height
        const alpha = p.life

        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillStyle = `${p.color}${alphaHex}`
        ctx.beginPath()
        ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`
        ctx.beginPath()
        ctx.arc(x, y, (p.size * p.life) * 0.35, 0, Math.PI * 2)
        ctx.fill()
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
  }, [track, keyConfig, currentTime, analyser, judgeFeedback, gameDataRef])

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
