import { useState, useCallback } from 'react'

export const LANE_COLOR_SCHEMES = [
  { id: 'classic', name: '经典', colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff'] },
  { id: 'neon', name: '霓虹', colors: ['#ff00ff', '#00ffff', '#ff6600', '#66ff00'] },
  { id: 'sakura', name: '樱华', colors: ['#ff69b4', '#ffb6c1', '#dda0dd', '#9370db'] },
  { id: 'fire', name: '烈焰', colors: ['#ff0000', '#ff6600', '#ffcc00', '#ffff00'] },
  { id: 'ocean', name: '深海', colors: ['#0066cc', '#0099ff', '#00cccc', '#00ff99'] },
  { id: 'cyberpunk', name: '赛博', colors: ['#ff0055', '#00ff88', '#ff8800', '#8800ff'] },
  { id: 'pastel', name: '柔光', colors: ['#ff99cc', '#ffcc99', '#99ccff', '#cc99ff'] },
  { id: 'midnight', name: '午夜', colors: ['#4466aa', '#6688cc', '#88aadd', '#aaccff'] },
  { id: 'aurora', name: '极光', colors: ['#00ff88', '#00ccff', '#8855ff', '#ff55aa'] },
  { id: 'ember', name: '余烬', colors: ['#cc3300', '#ff6633', '#ff9966', '#ffcc99'] },
]

export const HIT_EFFECT_STYLES = [
  { id: 'rings', name: '涟漪', desc: '经典圆环扩散' },
  { id: 'sparks', name: '火花', desc: '粒子爆裂飞溅' },
  { id: 'wave', name: '声波', desc: '波浪向外推进' },
  { id: 'diamond', name: '菱光', desc: '几何菱形绽放' },
  { id: 'bloom', name: '绽放', desc: '花瓣旋转盛开' },
]

export const BACKGROUND_SCHEMES = [
  { id: 'nebula', name: '星云', desc: '深空星云粒子' },
  { id: 'grid', name: '网格', desc: '赛博网格线条' },
  { id: 'rain', name: '雨帘', desc: '数字雨滴下落' },
  { id: 'aurora', name: '极光', desc: '流动极光色彩' },
  { id: 'minimal', name: '极简', desc: '纯净暗色背景' },
  { id: 'retro', name: '复古', desc: '像素扫描线' },
]

export const RESULT_STYLES = [
  { id: 'neon', name: '霓虹辉光', desc: '经典霓虹光效' },
  { id: 'minimal', name: '极简暗色', desc: '简洁无装饰风格' },
  { id: 'gradient', name: '渐变浪潮', desc: '流动渐变色彩' },
  { id: 'retro', name: '复古街机', desc: '像素复古风' },
]

const DEFAULT_THEME = {
  laneSchemeId: 'classic',
  hitEffectId: 'rings',
  backgroundId: 'nebula',
  resultStyleId: 'neon',
}

const STORAGE_KEY = 'rhythm_circle_theme'

const loadTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_THEME, ...parsed }
    }
  } catch (e) {}
  return { ...DEFAULT_THEME }
}

const saveTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  } catch (e) {}
}

export function useThemeStore() {
  const [theme, setThemeState] = useState(loadTheme)

  const setTheme = useCallback((updates) => {
    setThemeState(prev => {
      const next = { ...prev, ...updates }
      saveTheme(next)
      return next
    })
  }, [])

  const setLaneScheme = useCallback((id) => {
    setTheme({ laneSchemeId: id })
  }, [setTheme])

  const setHitEffect = useCallback((id) => {
    setTheme({ hitEffectId: id })
  }, [setTheme])

  const setBackground = useCallback((id) => {
    setTheme({ backgroundId: id })
  }, [setTheme])

  const setResultStyle = useCallback((id) => {
    setTheme({ resultStyleId: id })
  }, [setTheme])

  const resetTheme = useCallback(() => {
    setThemeState({ ...DEFAULT_THEME })
    saveTheme(DEFAULT_THEME)
  }, [])

  const getLaneColors = useCallback(() => {
    const scheme = LANE_COLOR_SCHEMES.find(s => s.id === theme.laneSchemeId)
    return scheme ? scheme.colors : LANE_COLOR_SCHEMES[0].colors
  }, [theme.laneSchemeId])

  return {
    theme,
    setTheme,
    setLaneScheme,
    setHitEffect,
    setBackground,
    setResultStyle,
    resetTheme,
    getLaneColors
  }
}
