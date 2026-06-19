import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

const CanvasRenderer = forwardRef(function CanvasRenderer(
  { track, keyConfig, gameDataRef, currentTime, analyser, judgeFeedback },
  ref
) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }))

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
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const NOTE_TRAVEL_TIME = 2.0
    const HIT_LINE_Y = 0.82
    const LANE_START = 0.38
    const LANE_END = 0.62

    const drawBackground = (t) => {
      const cx = width / 2
      const cy = height / 2

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) / 1.5)
      bgGrad.addColorStop(0, `rgba(${30 + Math.sin(t * 0.5) * 20}, ${10 + Math.sin(t * 0.3) * 10}, ${50 + Math.sin(t * 0.7) * 30}, 1)`)
      bgGrad.addColorStop(1, '#050508')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      for (let ring = 0; ring < 8; ring++) {
        const baseR = Math.min(width, height) * 0.15 + ring * (Math.min(width, height) * 0.08)
        const r = baseR + Math.sin(t * 0.6 + ring * 0.8) * 15

        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${0.025 + ring * 0.008 + Math.sin(t + ring) * 0.01})`
        ctx.lineWidth = 1

        const segments = 120
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * Math.PI * 2
          const noise1 = Math.sin(a * 6 + t * 1.5 + ring) * 12
          const noise2 = Math.sin(a * 11 + t * 2.3 - ring * 0.5) * 6
          const noise3 = Math.cos(a * 3 + t * 0.9 + ring * 1.2) * 8
          const px = cx + Math.cos(a) * (r + noise1 + noise2 + noise3)
          const py = cy + Math.sin(a) * (r + noise1 + noise2 + noise3)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2 + t * 0.2 + Math.sin(t * 0.1 + i) * 0.1
        const dist = Math.min(width, height) * (0.3 + (i % 6) * 0.08) + Math.sin(t * 0.8 + i) * 30
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const size = 1.5 + Math.sin(t * 2 + i * 0.5) * 1
        const alpha = 0.3 + Math.sin(t * 1.5 + i) * 0.3
        ctx.fillStyle = `rgba(${keyConfig.colors[i % 4]}, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawWaveform = (t) => {
      if (!analyser) return

      const values = analyser.getValue()
      const barCount = 80
      const barWidth = width / barCount

      for (let i = 0; i < barCount; i++) {
        const val = values[Math.floor(i * (values.length / barCount))]
        const barHeight = Math.abs(val) * height * 0.4
        const x = i * barWidth

        const hue = (i / barCount) * 360 + t * 20
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.15)`
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth - 1, barHeight)

        ctx.fillStyle = `hsla(${hue}, 90%, 75%, 0.4)`
        ctx.fillRect(x, height / 2 - 2, barWidth - 1, 4)
      }
    }

    const drawLanes = (t) => {
      const hitY = height * HIT_LINE_Y
      const laneXs = []
      for (let i = 0; i < 4; i++) {
        laneXs.push(width * (LANE_START + (LANE_END - LANE_START) * (i + 0.5) / 4))
      }

      for (let i = 0; i < 4; i++) {
        const x = laneXs[i]
        const laneWidth = (width * (LANE_END - LANE_START) / 4) * 0.85

        const laneGrad = ctx.createLinearGradient(x, 0, x, hitY)
        laneGrad.addColorStop(0, `${keyConfig.colors[i]}00`)
        laneGrad.addColorStop(0.6, `${keyConfig.colors[i]}08`)
        laneGrad.addColorStop(1, `${keyConfig.colors[i]}25`)

        ctx.fillStyle = laneGrad
        ctx.fillRect(x - laneWidth / 2, 0, laneWidth, hitY + 20)

        ctx.strokeStyle = `${keyConfig.colors[i]}33`
        ctx.lineWidth = 1
        ctx.setLineDash([6, 10])
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, hitY)
        ctx.stroke()
        ctx.setLineDash([])
      }

      const hitGlow = 0.6 + Math.sin(t * 3) * 0.4
      for (let i = 0; i < 4; i++) {
        const x = laneXs[i]
        const laneWidth = (width * (LANE_END - LANE_START) / 4) * 0.85
        const pressed = gameDataRef.current.lanePressed[i]

        ctx.beginPath()
        ctx.strokeStyle = pressed
          ? `${keyConfig.colors[i]}`
          : `${keyConfig.colors[i]}88`
        ctx.lineWidth = pressed ? 3 : 2
        ctx.arc(x, hitY, laneWidth / 2, 0, Math.PI * 2)
        ctx.stroke()

        const ringGlow = pressed ? 0.9 : hitGlow * 0.4
        ctx.fillStyle = `${keyConfig.colors[i]}${Math.floor(ringGlow * 30).toString(16).padStart(2, '0')}`
        ctx.fill()

        ctx.beginPath()
        ctx.strokeStyle = `${keyConfig.colors[i]}${Math.floor(hitGlow * 80).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 1
        ctx.arc(x, hitY, laneWidth / 2 + 8 + Math.sin(t * 2 + i) * 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const drawNotes = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const laneXs = []
      for (let i = 0; i < 4; i++) {
        laneXs.push(width * (LANE_START + (LANE_END - LANE_START) * (i + 0.5) / 4))
      }
      const laneWidth = (width * (LANE_END - LANE_START) / 4) * 0.65

      const activeNotes = gameDataRef.current.activeNotes

      activeNotes.forEach(note => {
        if (note.hit || note.missed) return

        const noteAge = time - note.time
        if (noteAge > 0.3) return
        if (noteAge < -NOTE_TRAVEL_TIME) return

        const progress = 1 + (noteAge / NOTE_TRAVEL_TIME)
        if (progress < 0 || progress > 1.15) return

        const laneX = laneXs[note.lane]
        const y = hitY - (HIT_LINE_Y * height) * (1 - progress)

        const scale = 0.3 + progress * 0.7
        const size = (laneWidth / 2) * scale
        const alpha = Math.min(1, progress * 1.5)

        const color = keyConfig.colors[note.lane]

        ctx.beginPath()
        const grad = ctx.createRadialGradient(laneX, y, 0, laneX, y, size * 1.5)
        grad.addColorStop(0, `${color}${Math.floor(alpha * 80).toString(16).padStart(2, '0')}`)
        grad.addColorStop(0.6, `${color}${Math.floor(alpha * 40).toString(16).padStart(2, '0')}`)
        grad.addColorStop(1, `${color}00`)
        ctx.fillStyle = grad
        ctx.arc(laneX, y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 2.5
        ctx.arc(laneX, y, size, 0, Math.PI * 2)
        ctx.stroke()

        ctx.beginPath()
        ctx.fillStyle = `${color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`
        ctx.arc(laneX, y, size * 0.55, 0, Math.PI * 2)
        ctx.fill()

        if (progress > 0.7) {
          const pulseR = size * (1.1 + (progress - 0.7) * 1.5)
          ctx.beginPath()
          ctx.strokeStyle = `${color}${Math.floor((1 - progress) * 150).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 1.5
          ctx.arc(laneX, y, pulseR, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
    }

    const drawEffects = (t, time) => {
      const hitY = height * HIT_LINE_Y
      const laneXs = []
      for (let i = 0; i < 4; i++) {
        laneXs.push(width * (LANE_START + (LANE_END - LANE_START) * (i + 0.5) / 4))
      }

      gameDataRef.current.ringPulses.forEach(rp => {
        const age = time - rp.time
        if (age > 0.8) return
        const progress = age / 0.8
        const x = laneXs[rp.lane]
        const maxR = Math.min(width, height) * 0.25
        const r = rp.radius * Math.min(width, height)
        const alpha = (1 - progress) * 0.5

        ctx.beginPath()
        ctx.strokeStyle = `${rp.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = (1 - progress) * 3
        ctx.arc(x, hitY, r, 0, Math.PI * 2)
        ctx.stroke()
      })

      gameDataRef.current.hitEffects.forEach(effect => {
        const age = time - effect.time
        if (age > 0.5) return
        const progress = age / 0.5
        const x = laneXs[effect.lane]
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
          for (let ring = 0; ring < 3; ring++) {
            const r = 10 + progress * (60 + ring * 20)
            ctx.beginPath()
            ctx.strokeStyle = `${color}${Math.floor(alpha * (1 - ring * 0.3) * 255).toString(16).padStart(2, '0')}`
            ctx.lineWidth = 2
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      })

      gameDataRef.current.particles.forEach(p => {
        const x = p.x * width
        const y = p.y * height
        const alpha = p.life

        ctx.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.beginPath()
        ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`
        ctx.beginPath()
        ctx.arc(x, y, (p.size * p.life) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const drawJudgeFeedback = (t) => {
      if (!judgeFeedback) return
      const age = (Date.now() - judgeFeedback.id) / 400
      if (age > 1) return

      const cx = width / 2
      const cy = height * 0.65

      const progress = age
      const alpha = 1 - progress
      const offsetY = -progress * 60
      const scale = 1 + progress * 0.5

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

      ctx.save()
      ctx.translate(cx, cy + offsetY)
      ctx.scale(scale, scale)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.shadowColor = color
      ctx.shadowBlur = 30 * alpha

      ctx.font = `800 ${42}px -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.5})`
      ctx.lineWidth = 3
      ctx.strokeText(text, 0, 0)
      ctx.fillText(text, 0, 0)

      ctx.restore()
    }

    const render = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      const time = currentTime

      ctx.clearRect(0, 0, width, height)

      drawBackground(t)
      drawWaveform(t)
      drawLanes(t)
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
})

export default CanvasRenderer
