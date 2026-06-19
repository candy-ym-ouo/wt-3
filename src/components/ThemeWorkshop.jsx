import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useThemeStore,
  LANE_COLOR_SCHEMES,
  HIT_EFFECT_STYLES,
  BACKGROUND_SCHEMES,
  RESULT_STYLES
} from '../store/useThemeStore.js'

const TABS = [
  { id: 'lane', icon: '🎨', label: '轨道配色' },
  { id: 'hit', icon: '💥', label: '命中特效' },
  { id: 'bg', icon: '🌌', label: '背景方案' },
  { id: 'result', icon: '🏆', label: '结果页风格' }
]

export default function ThemeWorkshop({ keyConfig, onClose }) {
  const {
    theme,
    setLaneScheme,
    setHitEffect,
    setBackground,
    setResultStyle,
    resetTheme,
    getLaneColors
  } = useThemeStore()

  const [activeTab, setActiveTab] = useState('lane')
  const previewCanvasRef = useRef(null)
  const previewAnimRef = useRef(null)
  const previewTimeRef = useRef(0)

  const currentColors = getLaneColors()

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const drawPreview = () => {
      previewTimeRef.current += 0.016
      const t = previewTimeRef.current
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      if (theme.backgroundId === 'nebula') {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 1.5)
        grad.addColorStop(0, `rgba(${20 + Math.sin(t * 0.3) * 15}, ${10 + Math.sin(t * 0.2) * 8}, ${40 + Math.sin(t * 0.4) * 25}, 1)`)
        grad.addColorStop(1, '#050508')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        for (let ring = 0; ring < 5; ring++) {
          const r = 30 + ring * 22 + Math.sin(t * 0.5 + ring) * 5
          ctx.beginPath()
          ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.sin(t + ring) * 0.02})`
          ctx.lineWidth = 1
          for (let i = 0; i <= Math.PI * 2; i += 0.03) {
            const noise = Math.sin(i * 6 + t * 1.5 + ring) * 4
            const px = cx + Math.cos(i) * (r + noise)
            const py = cy + Math.sin(i) * (r + noise)
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }
      } else if (theme.backgroundId === 'grid') {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h))
        grad.addColorStop(0, 'rgba(0,20,40,0.5)')
        grad.addColorStop(1, '#050508')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        ctx.strokeStyle = `${currentColors[2]}15`
        ctx.lineWidth = 0.5
        const gridSize = 20
        const offsetX = (t * 10) % gridSize
        const offsetY = (t * 15) % gridSize
        for (let x = -gridSize + offsetX; x < w + gridSize; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = -gridSize + offsetY; y < h + gridSize; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }

        const horizonY = h * 0.5
        for (let i = -10; i <= 10; i++) {
          ctx.beginPath()
          ctx.strokeStyle = `${currentColors[Math.abs(i) % 4]}10`
          ctx.moveTo(cx, horizonY)
          ctx.lineTo(cx + i * w * 0.15, h)
          ctx.stroke()
        }
      } else if (theme.backgroundId === 'rain') {
        ctx.fillStyle = '#050508'
        ctx.fillRect(0, 0, w, h)
        const chars = '01アイウエオカキクケコ'
        ctx.font = '10px monospace'
        for (let i = 0; i < 60; i++) {
          const x = (i * 17 + t * 5 * ((i % 3) + 1)) % w
          const y = (i * 31 + t * 40 * ((i % 4) + 1)) % h
          const colorIdx = i % 4
          const alpha = 0.2 + Math.sin(t + i) * 0.15
          ctx.fillStyle = `${currentColors[colorIdx]}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
          ctx.fillText(chars[i % chars.length], x, y)
          for (let j = 1; j < 5; j++) {
            const trailAlpha = alpha * (1 - j * 0.2)
            ctx.fillStyle = `${currentColors[colorIdx]}${Math.floor(trailAlpha * 255).toString(16).padStart(2, '0')}`
            ctx.fillText(chars[(i + j) % chars.length], x, y - j * 12)
          }
        }
      } else if (theme.backgroundId === 'aurora') {
        ctx.fillStyle = '#050510'
        ctx.fillRect(0, 0, w, h)
        for (let band = 0; band < 4; band++) {
          ctx.beginPath()
          const baseY = h * (0.2 + band * 0.15)
          for (let x = 0; x <= w; x += 2) {
            const y = baseY + Math.sin(x * 0.02 + t * (0.5 + band * 0.3) + band * 2) * 25
              + Math.sin(x * 0.05 + t * 1.2 + band) * 10
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          const grad = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 60)
          const c = currentColors[band]
          grad.addColorStop(0, 'transparent')
          grad.addColorStop(0.3, `${c}30`)
          grad.addColorStop(0.6, `${c}18`)
          grad.addColorStop(1, 'transparent')
          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fillStyle = grad
          ctx.fill()
        }
      } else if (theme.backgroundId === 'minimal') {
        ctx.fillStyle = '#080810'
        ctx.fillRect(0, 0, w, h)
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.4)
        grad.addColorStop(0, 'rgba(255,255,255,0.02)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      } else if (theme.backgroundId === 'retro') {
        ctx.fillStyle = '#0a0a12'
        ctx.fillRect(0, 0, w, h)
        for (let y = 0; y < h; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.fillRect(0, y, w, 1)
        }
        const scanY = (t * 50) % h
        const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20)
        scanGrad.addColorStop(0, 'transparent')
        scanGrad.addColorStop(0.5, `${currentColors[0]}15`)
        scanGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, scanY - 20, w, 40)
      }

      const hitY = h * 0.78
      const laneW = w * 0.065
      const laneStart = cx - laneW * 2 - 6

      for (let i = 0; i < 4; i++) {
        const lx = laneStart + i * (laneW + 4)
        const laneGrad = ctx.createLinearGradient(lx, 0, lx, hitY)
        laneGrad.addColorStop(0, `${currentColors[i]}00`)
        laneGrad.addColorStop(0.7, `${currentColors[i]}0a`)
        laneGrad.addColorStop(1, `${currentColors[i]}22`)
        ctx.fillStyle = laneGrad
        ctx.fillRect(lx, 0, laneW, hitY + 10)

        ctx.setLineDash([4, 8])
        ctx.strokeStyle = `${currentColors[i]}2a`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(lx + laneW / 2, 0)
        ctx.lineTo(lx + laneW / 2, hitY)
        ctx.stroke()
        ctx.setLineDash([])

        const pressed = Math.sin(t * 3 + i * 1.5) > 0.3
        const r = laneW / 2 + (pressed ? 3 : 0)
        ctx.beginPath()
        ctx.strokeStyle = pressed ? currentColors[i] : `${currentColors[i]}88`
        ctx.lineWidth = pressed ? 2.5 : 1.5
        ctx.arc(lx + laneW / 2, hitY, r, 0, Math.PI * 2)
        ctx.stroke()
        if (pressed) {
          ctx.fillStyle = `${currentColors[i]}40`
          ctx.fill()
        }
      }

      const notePhase = t % 2
      for (let i = 0; i < 4; i++) {
        const lx = laneStart + i * (laneW + 4)
        const noteProgress = (notePhase + i * 0.15) % 1.2
        if (noteProgress < 1) {
          const ny = hitY * noteProgress
          const size = laneW * 0.3 * (0.5 + noteProgress * 0.5)
          const alpha = Math.min(1, noteProgress * 2)
          const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0')

          const glow = ctx.createRadialGradient(lx + laneW / 2, ny, 0, lx + laneW / 2, ny, size * 1.5)
          glow.addColorStop(0, `${currentColors[i]}${Math.floor(alpha * 80).toString(16).padStart(2, '0')}`)
          glow.addColorStop(1, `${currentColors[i]}00`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(lx + laneW / 2, ny, size * 1.5, 0, Math.PI * 2)
          ctx.fill()

          ctx.beginPath()
          ctx.strokeStyle = `${currentColors[i]}${alphaHex}`
          ctx.lineWidth = 2
          ctx.arc(lx + laneW / 2, ny, size, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      const effectLane = Math.floor(t * 0.8) % 4
      const effectAge = (t * 0.8) % 1
      const ex = laneStart + effectLane * (laneW + 4) + laneW / 2
      const ey = hitY
      const eAlpha = Math.max(0, 1 - effectAge)

      if (theme.hitEffectId === 'rings') {
        for (let ring = 0; ring < 3; ring++) {
          const r = 8 + effectAge * (40 + ring * 15)
          ctx.beginPath()
          ctx.strokeStyle = `${currentColors[effectLane]}${Math.floor(eAlpha * (1 - ring * 0.25) * 200).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 2 - ring * 0.5
          ctx.arc(ex, ey, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (theme.hitEffectId === 'sparks') {
        for (let p = 0; p < 12; p++) {
          const angle = (p / 12) * Math.PI * 2 + effectLane * 0.5
          const dist = effectAge * (30 + Math.sin(p * 3) * 15)
          const px = ex + Math.cos(angle) * dist
          const py = ey + Math.sin(angle) * dist
          const pAlpha = eAlpha * 0.8
          ctx.fillStyle = `${currentColors[effectLane]}${Math.floor(pAlpha * 255).toString(16).padStart(2, '0')}`
          ctx.beginPath()
          ctx.arc(px, py, 2 * (1 - effectAge), 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (theme.hitEffectId === 'wave') {
        for (let wave = 0; wave < 3; wave++) {
          const waveR = 10 + effectAge * (50 + wave * 12)
          const waveW = 15 + wave * 8
          ctx.beginPath()
          ctx.strokeStyle = `${currentColors[effectLane]}${Math.floor(eAlpha * (1 - wave * 0.25) * 180).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 2 - wave * 0.5
          ctx.ellipse(ex, ey, waveR, waveW, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (theme.hitEffectId === 'diamond') {
        const diamondSize = 8 + effectAge * 40
        ctx.save()
        ctx.translate(ex, ey)
        ctx.rotate(effectAge * Math.PI * 0.5)
        for (let d = 0; d < 3; d++) {
          const ds = diamondSize + d * 8
          const dAlpha = eAlpha * (1 - d * 0.3)
          ctx.beginPath()
          ctx.strokeStyle = `${currentColors[effectLane]}${Math.floor(dAlpha * 200).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 2 - d * 0.5
          ctx.moveTo(0, -ds)
          ctx.lineTo(ds * 0.6, 0)
          ctx.lineTo(0, ds)
          ctx.lineTo(-ds * 0.6, 0)
          ctx.closePath()
          ctx.stroke()
        }
        ctx.restore()
      } else if (theme.hitEffectId === 'bloom') {
        ctx.save()
        ctx.translate(ex, ey)
        const petals = 6
        const bloomR = 6 + effectAge * 35
        const rot = effectAge * Math.PI * 0.3
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + rot
          const px = Math.cos(angle) * bloomR
          const py = Math.sin(angle) * bloomR
          const petalAlpha = eAlpha * 0.6
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 8)
          grad.addColorStop(0, `${currentColors[effectLane]}${Math.floor(petalAlpha * 255).toString(16).padStart(2, '0')}`)
          grad.addColorStop(1, `${currentColors[effectLane]}00`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, 8 * (1 - effectAge * 0.5), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      previewAnimRef.current = requestAnimationFrame(drawPreview)
    }

    drawPreview()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(previewAnimRef.current)
    }
  }, [theme, currentColors])

  const renderLaneTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.sectionDesc}>选择轨道配色方案，实时预览效果</div>
      <div style={styles.schemeGrid}>
        {LANE_COLOR_SCHEMES.map(scheme => (
          <button
            key={scheme.id}
            style={{
              ...styles.schemeCard,
              borderColor: theme.laneSchemeId === scheme.id ? scheme.colors[0] : 'rgba(255,255,255,0.08)',
              boxShadow: theme.laneSchemeId === scheme.id ? `0 0 20px ${scheme.colors[0]}33` : 'none',
              background: theme.laneSchemeId === scheme.id ? `${scheme.colors[0]}0a` : 'rgba(255,255,255,0.02)'
            }}
            onClick={() => setLaneScheme(scheme.id)}
          >
            <div style={styles.schemeName}>{scheme.name}</div>
            <div style={styles.colorRow}>
              {scheme.colors.map((color, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.colorDot,
                    background: color,
                    boxShadow: `0 0 8px ${color}66`
                  }}
                />
              ))}
            </div>
            <div style={styles.colorBar}>
              {scheme.colors.map((color, i) => (
                <div key={i} style={{ ...styles.colorBarSeg, background: color }} />
              ))}
            </div>
            {theme.laneSchemeId === scheme.id && (
              <div style={{ ...styles.activeTag, color: scheme.colors[0], borderColor: `${scheme.colors[0]}55` }}>
                ✓ 使用中
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const renderHitTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.sectionDesc}>选择命中特效风格</div>
      <div style={styles.effectGrid}>
        {HIT_EFFECT_STYLES.map(effect => (
          <button
            key={effect.id}
            style={{
              ...styles.effectCard,
              borderColor: theme.hitEffectId === effect.id ? '#00ffcc' : 'rgba(255,255,255,0.08)',
              boxShadow: theme.hitEffectId === effect.id ? '0 0 20px rgba(0,255,204,0.2)' : 'none',
              background: theme.hitEffectId === effect.id ? 'rgba(0,255,204,0.06)' : 'rgba(255,255,255,0.02)'
            }}
            onClick={() => setHitEffect(effect.id)}
          >
            <div style={styles.effectIcon}>
              {effect.id === 'rings' && '◎'}
              {effect.id === 'sparks' && '✦'}
              {effect.id === 'wave' && '≋'}
              {effect.id === 'diamond' && '◇'}
              {effect.id === 'bloom' && '❀'}
            </div>
            <div style={{
              ...styles.effectName,
              color: theme.hitEffectId === effect.id ? '#00ffcc' : '#fff'
            }}>
              {effect.name}
            </div>
            <div style={styles.effectDesc}>{effect.desc}</div>
            {theme.hitEffectId === effect.id && (
              <div style={styles.activeTagSmall}>✓ 使用中</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const renderBgTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.sectionDesc}>选择游戏背景方案</div>
      <div style={styles.bgGrid}>
        {BACKGROUND_SCHEMES.map(bg => (
          <button
            key={bg.id}
            style={{
              ...styles.bgCard,
              borderColor: theme.backgroundId === bg.id ? '#6699ff' : 'rgba(255,255,255,0.08)',
              boxShadow: theme.backgroundId === bg.id ? '0 0 20px rgba(102,153,255,0.2)' : 'none',
              background: theme.backgroundId === bg.id ? 'rgba(102,153,255,0.06)' : 'rgba(255,255,255,0.02)'
            }}
            onClick={() => setBackground(bg.id)}
          >
            <div style={styles.bgPreviewThumb}>
              <BgThumbPreview id={bg.id} colors={currentColors} />
            </div>
            <div style={{
              ...styles.bgName,
              color: theme.backgroundId === bg.id ? '#6699ff' : '#fff'
            }}>
              {bg.name}
            </div>
            <div style={styles.bgDesc}>{bg.desc}</div>
            {theme.backgroundId === bg.id && (
              <div style={{ ...styles.activeTagSmall, color: '#6699ff', borderColor: 'rgba(102,153,255,0.4)' }}>✓ 使用中</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const renderResultTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.sectionDesc}>选择结果页展示风格</div>
      <div style={styles.resultGrid}>
        {RESULT_STYLES.map(style => (
          <button
            key={style.id}
            style={{
              ...styles.resultCard,
              borderColor: theme.resultStyleId === style.id ? '#ff3366' : 'rgba(255,255,255,0.08)',
              boxShadow: theme.resultStyleId === style.id ? '0 0 20px rgba(255,51,102,0.2)' : 'none',
              background: theme.resultStyleId === style.id ? 'rgba(255,51,102,0.06)' : 'rgba(255,255,255,0.02)'
            }}
            onClick={() => setResultStyle(style.id)}
          >
            <div style={styles.resultStylePreview}>
              <ResultThumbPreview id={style.id} colors={currentColors} />
            </div>
            <div style={{
              ...styles.resultName,
              color: theme.resultStyleId === style.id ? '#ff3366' : '#fff'
            }}>
              {style.name}
            </div>
            <div style={styles.resultDesc}>{style.desc}</div>
            {theme.resultStyleId === style.id && (
              <div style={{ ...styles.activeTagSmall, color: '#ff3366', borderColor: 'rgba(255,51,102,0.4)' }}>✓ 使用中</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.bgDecor}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.decorRing,
              width: `${100 + i * 60}px`,
              height: `${100 + i * 60}px`,
              borderColor: `${currentColors[i % 4]}10`,
              animationDelay: `${i * 0.12}s`
            }}
          />
        ))}
      </div>

      <div style={styles.panel}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎨 主题皮肤工坊</h1>
          <p style={styles.subtitle}>定制你的游戏视觉风格 · 全局即时预览</p>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.previewSection}>
          <div style={styles.previewLabel}>👁 实时预览</div>
          <canvas ref={previewCanvasRef} style={styles.previewCanvas} />
        </div>

        <div style={styles.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === tab.id ? currentColors[2] : 'transparent',
                color: activeTab === tab.id ? currentColors[2] : 'rgba(255,255,255,0.4)'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.contentArea}>
          {activeTab === 'lane' && renderLaneTab()}
          {activeTab === 'hit' && renderHitTab()}
          {activeTab === 'bg' && renderBgTab()}
          {activeTab === 'result' && renderResultTab()}
        </div>

        <div style={styles.footer}>
          <div style={styles.currentThemeInfo}>
            <span style={styles.currentThemeLabel}>当前方案:</span>
            <span style={styles.currentThemeTag}>
              🎨 {LANE_COLOR_SCHEMES.find(s => s.id === theme.laneSchemeId)?.name}
            </span>
            <span style={styles.currentThemeTag}>
              💥 {HIT_EFFECT_STYLES.find(s => s.id === theme.hitEffectId)?.name}
            </span>
            <span style={styles.currentThemeTag}>
              🌌 {BACKGROUND_SCHEMES.find(s => s.id === theme.backgroundId)?.name}
            </span>
            <span style={styles.currentThemeTag}>
              🏆 {RESULT_STYLES.find(s => s.id === theme.resultStyleId)?.name}
            </span>
          </div>
          <button style={styles.resetBtn} onClick={resetTheme}>
            🔄 恢复默认
          </button>
        </div>
      </div>
    </div>
  )
}

function BgThumbPreview({ id, colors }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      tRef.current += 0.01
      const t = tRef.current
      const w = 120
      const h = 60

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, w, h)

      if (id === 'nebula') {
        const grad = ctx.createRadialGradient(60, 30, 0, 60, 30, 60)
        grad.addColorStop(0, `rgba(30, 15, 50, 1)`)
        grad.addColorStop(1, '#050508')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
        ctx.beginPath()
        ctx.arc(60 + Math.sin(t) * 10, 30, 15 + Math.sin(t * 2) * 3, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      } else if (id === 'grid') {
        ctx.strokeStyle = `${colors[2]}20`
        ctx.lineWidth = 0.5
        for (let x = 0; x < w; x += 10) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += 10) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
      } else if (id === 'rain') {
        ctx.font = '5px monospace'
        for (let i = 0; i < 20; i++) {
          const x = (i * 7) % w
          const y = (i * 11 + t * 30) % h
          ctx.fillStyle = `${colors[i % 4]}40`
          ctx.fillText('0', x, y)
        }
      } else if (id === 'aurora') {
        for (let band = 0; band < 3; band++) {
          ctx.beginPath()
          for (let x = 0; x <= w; x += 2) {
            const y = 15 + band * 12 + Math.sin(x * 0.05 + t * (0.5 + band * 0.3)) * 6
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fillStyle = `${colors[band]}18`
          ctx.fill()
        }
      } else if (id === 'minimal') {
        ctx.fillStyle = '#080810'
        ctx.fillRect(0, 0, w, h)
        const grad = ctx.createRadialGradient(60, 30, 0, 60, 30, 40)
        grad.addColorStop(0, 'rgba(255,255,255,0.03)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      } else if (id === 'retro') {
        ctx.fillStyle = '#0a0a12'
        ctx.fillRect(0, 0, w, h)
        for (let y = 0; y < h; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'
          ctx.fillRect(0, y, w, 1)
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [id, colors])

  return <canvas ref={canvasRef} width={120} height={60} style={{ width: '100%', height: '100%' }} />
}

function ResultThumbPreview({ id, colors }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const tRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      tRef.current += 0.01
      const t = tRef.current
      const w = 120
      const h = 60

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, w, h)

      if (id === 'neon') {
        ctx.shadowColor = colors[0]
        ctx.shadowBlur = 8
        ctx.font = 'bold 24px sans-serif'
        ctx.fillStyle = colors[0]
        ctx.textAlign = 'center'
        ctx.fillText('S', 60, 38)
        ctx.shadowBlur = 0
      } else if (id === 'minimal') {
        ctx.font = 'bold 24px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.textAlign = 'center'
        ctx.fillText('S', 60, 38)
      } else if (id === 'gradient') {
        const grad = ctx.createLinearGradient(20, 20, 100, 40)
        grad.addColorStop(0, colors[0])
        grad.addColorStop(0.5, colors[2])
        grad.addColorStop(1, colors[3])
        ctx.font = 'bold 24px sans-serif'
        ctx.fillStyle = grad
        ctx.textAlign = 'center'
        ctx.fillText('S', 60, 38)
      } else if (id === 'retro') {
        for (let y = 0; y < h; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.fillRect(0, y, w, 1)
        }
        ctx.font = 'bold 22px monospace'
        ctx.fillStyle = colors[0]
        ctx.textAlign = 'center'
        ctx.fillText('S', 60, 38)
        ctx.strokeStyle = colors[0]
        ctx.lineWidth = 1
        ctx.strokeRect(40, 12, 40, 36)
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [id, colors])

  return <canvas ref={canvasRef} width={120} height={60} style={{ width: '100%', height: '100%' }} />
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
    width: '860px',
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
    padding: '28px 40px 16px',
    textAlign: 'center',
    position: 'relative'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: '0 0 6px 0',
    background: 'linear-gradient(135deg, #ff3366, #ffcc00, #00ffcc, #6699ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '2px',
    margin: 0
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '18px',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '15px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  previewSection: {
    padding: '0 40px 12px'
  },
  previewLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginBottom: '8px',
    fontWeight: 600
  },
  previewCanvas: {
    width: '100%',
    height: '180px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#050508'
  },
  tabBar: {
    display: 'flex',
    gap: '2px',
    padding: '0 40px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  tabBtn: {
    flex: 1,
    padding: '12px 14px',
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
    padding: '20px 40px 16px'
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  schemeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  schemeCard: {
    padding: '14px 16px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    position: 'relative',
    background: 'rgba(255,255,255,0.02)'
  },
  schemeName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '10px',
    letterSpacing: '1px'
  },
  colorRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  colorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    transition: 'all 0.2s'
  },
  colorBar: {
    display: 'flex',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  colorBarSeg: {
    flex: 1,
    transition: 'all 0.2s'
  },
  activeTag: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 8px',
    border: '1px solid',
    borderRadius: '10px',
    letterSpacing: '1px'
  },
  activeTagSmall: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#00ffcc',
    marginTop: '6px',
    letterSpacing: '1px'
  },
  effectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  effectCard: {
    padding: '18px 14px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)'
  },
  effectIcon: {
    fontSize: '28px',
    marginBottom: '8px',
    lineHeight: 1
  },
  effectName: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '4px'
  },
  effectDesc: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.5px'
  },
  bgGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
  },
  bgCard: {
    padding: '12px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)'
  },
  bgPreviewThumb: {
    width: '100%',
    height: '50px',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  bgName: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '2px'
  },
  bgDesc: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.35)'
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  resultCard: {
    padding: '14px',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)'
  },
  resultStylePreview: {
    width: '100%',
    height: '50px',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  resultName: {
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '2px'
  },
  resultDesc: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)'
  },
  footer: {
    padding: '14px 40px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currentThemeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  currentThemeLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '1px'
  },
  currentThemeTag: {
    fontSize: '10px',
    padding: '3px 8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    letterSpacing: '0.5px'
  },
  resetBtn: {
    padding: '8px 18px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '1px'
  }
}
