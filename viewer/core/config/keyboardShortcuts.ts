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
