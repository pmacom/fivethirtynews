import { ViewMode } from '../store/viewModeStore'

export interface KeyboardShortcut {
  keys: string[]
  action: string
  description?: string
}

export interface ViewModeShortcuts {
  navigation: KeyboardShortcut[]
  actions: KeyboardShortcut[]
}

// Browse mode shortcuts (apply when browse mode is active)
export const BROWSE_MODE_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ['Tab'], action: 'Exit Browse', description: 'Exit browse mode and restore camera' },
  { keys: ['Esc'], action: 'Exit Browse', description: 'Exit browse mode and restore camera' },
  { keys: ['W'], action: 'Forward', description: 'Move camera forward (WASD mode)' },
  { keys: ['S'], action: 'Backward', description: 'Move camera backward (WASD mode)' },
  { keys: ['A'], action: 'Strafe Left', description: 'Move camera left (WASD mode)' },
  { keys: ['D'], action: 'Strafe Right', description: 'Move camera right (WASD mode)' },
  { keys: ['Q'], action: 'Move Down', description: 'Move camera down (WASD mode)' },
  { keys: ['E'], action: 'Move Up', description: 'Move camera up (WASD mode)' },
  { keys: ['R'], action: 'Rotate Left', description: 'Rotate camera left (WASD mode)' },
  { keys: ['F'], action: 'Rotate Right', description: 'Rotate camera right (WASD mode)' },
]

// Global shortcuts that work in any view mode
export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ['Tab'], action: 'Browse Mode', description: 'Toggle browse mode for free camera exploration' },
]

export const KEYBOARD_SHORTCUTS: Record<ViewMode, ViewModeShortcuts> = {
  pillar: {
    navigation: [
      { keys: ['←', '↑'], action: 'Previous' },
      { keys: ['→', '↓'], action: 'Next' },
    ],
    actions: [
      { keys: ['Enter'], action: 'Focus' },
      { keys: ['Esc'], action: 'Back' },
    ],
  },
  cloud: {
    navigation: [
      { keys: ['←', '↑'], action: 'Previous' },
      { keys: ['→', '↓'], action: 'Next' },
    ],
    actions: [
      { keys: ['Space'], action: 'Toggle Zoom' },
      { keys: ['Esc'], action: 'Zoom Out' },
    ],
  },
  stack: {
    navigation: [
      { keys: ['←', '↑'], action: 'Previous' },
      { keys: ['→', '↓'], action: 'Next' },
    ],
    actions: [
      { keys: ['Space'], action: 'Toggle Focus' },
      { keys: ['Esc'], action: 'Unfocus' },
    ],
  },
  carousel: {
    navigation: [
      { keys: ['←', '↑'], action: 'Previous' },
      { keys: ['→', '↓'], action: 'Next' },
    ],
    actions: [
      { keys: ['Enter'], action: 'Focus' },
      { keys: ['Esc'], action: 'Back' },
    ],
  },
}
