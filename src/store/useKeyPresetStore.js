import { useSyncExternalStore } from 'react'
import { defaultKeyConfig } from '../data/tracks.js'

const STORAGE_KEY = 'rhythm_circle_key_presets'

const DEFAULT_PRESETS = [
  {
    id: 'default',
    name: '默认方案',
    isDefault: true,
    ...defaultKeyConfig
  },
  {
    id: 'arrow',
    name: '方向键方案',
    isDefault: true,
    lanes: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'],
    labels: ['←', '↓', '↑', '→'],
    colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
  },
  {
    id: 'asdf',
    name: 'ASDF 方案',
    isDefault: true,
    lanes: ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
    labels: ['A', 'S', 'D', 'F'],
    colors: ['#ff3366', '#ffcc00', '#00ffcc', '#6699ff']
  }
]

const loadPresets = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        presets: parsed.presets || [...DEFAULT_PRESETS],
        currentPresetId: parsed.currentPresetId || 'default'
      }
    }
  } catch (e) {}
  return {
    presets: [...DEFAULT_PRESETS],
    currentPresetId: 'default'
  }
}

const savePresets = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {}
}

let state = loadPresets()
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach(fn => fn())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

const setState = (updater) => {
  const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
  state = next
  savePresets(state)
  notifyListeners()
}

const getCurrentPreset = () => {
  return state.presets.find(p => p.id === state.currentPresetId) || state.presets[0]
}

const switchPreset = (presetId) => {
  const preset = state.presets.find(p => p.id === presetId)
  if (preset) {
    setState(prev => ({ ...prev, currentPresetId: presetId }))
  }
}

const savePreset = (presetId, config) => {
  setState(prev => ({
    ...prev,
    presets: prev.presets.map(p =>
      p.id === presetId ? { ...p, ...config } : p
    )
  }))
}

const createPreset = (name, config) => {
  const newId = `custom_${Date.now()}`
  const newPreset = {
    id: newId,
    name: name || '未命名方案',
    isDefault: false,
    lanes: [...config.lanes],
    labels: [...config.labels],
    colors: [...config.colors]
  }
  setState(prev => ({
    presets: [...prev.presets, newPreset],
    currentPresetId: newId
  }))
  return newId
}

const renamePreset = (presetId, newName) => {
  setState(prev => ({
    ...prev,
    presets: prev.presets.map(p =>
      p.id === presetId ? { ...p, name: newName } : p
    )
  }))
}

const deletePreset = (presetId) => {
  setState(prev => {
    const filtered = prev.presets.filter(p => p.id !== presetId)
    let newCurrentId = prev.currentPresetId
    if (prev.currentPresetId === presetId && filtered.length > 0) {
      newCurrentId = filtered[0].id
    }
    return {
      presets: filtered,
      currentPresetId: newCurrentId
    }
  })
}

const checkConflicts = (lanes) => {
  const conflicts = []
  const seen = new Map()

  lanes.forEach((lane, index) => {
    if (seen.has(lane)) {
      const firstIndex = seen.get(lane)
      if (!conflicts.some(c => c.key === lane)) {
        conflicts.push({
          key: lane,
          indices: [firstIndex, index]
        })
      } else {
        const conflict = conflicts.find(c => c.key === lane)
        if (!conflict.indices.includes(index)) {
          conflict.indices.push(index)
        }
      }
    } else {
      seen.set(lane, index)
    }
  })

  return conflicts
}

const hasConflicts = (lanes) => {
  return checkConflicts(lanes).length > 0
}

const resetPresets = () => {
  state = {
    presets: [...DEFAULT_PRESETS],
    currentPresetId: 'default'
  }
  savePresets(state)
  notifyListeners()
}

export function useKeyPresetStore() {
  const storeState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    presets: storeState.presets,
    currentPresetId: storeState.currentPresetId,
    currentPreset: getCurrentPreset(),
    switchPreset,
    savePreset,
    createPreset,
    renamePreset,
    deletePreset,
    checkConflicts,
    hasConflicts,
    resetPresets,
    getCurrentPreset
  }
}
