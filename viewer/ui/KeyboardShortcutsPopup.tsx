"use client"

import { useViewModeStore } from '../core/store/viewModeStore'
import { KEYBOARD_SHORTCUTS } from '../core/config/keyboardShortcuts'
import { Kbd, KbdGroup } from '@/components/ui/kbd'

interface KeyboardShortcutsPopupProps {
  visible: boolean
}

/**
 * Keyboard shortcuts tooltip - appears when hovering the (?) button
 * Shows current view mode's navigation and action shortcuts
 */
export function KeyboardShortcutsPopup({ visible }: KeyboardShortcutsPopupProps) {
  const viewMode = useViewModeStore(state => state.viewMode)
  const shortcuts = KEYBOARD_SHORTCUTS[viewMode]

  if (!visible) return null

  return (
    <div className="absolute top-[calc(100%+0.5rem)] right-0 z-[200] min-w-[180px] rounded-lg bg-black/95 backdrop-blur-md border border-white/20 p-3 shadow-2xl">
      <div className="text-xs text-white/50 uppercase tracking-wide mb-3">
        Keyboard Shortcuts
      </div>

      {/* Navigation */}
      <div className="space-y-2 mb-4">
        <div className="text-xs text-white/40 mb-1">Navigation</div>
        {shortcuts.navigation.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/80">{shortcut.action}</span>
            <KbdGroup>
              {shortcut.keys.map((key, j) => (
                <Kbd key={j} className="bg-white/10 text-white/90 border border-white/20">
                  {key}
                </Kbd>
              ))}
            </KbdGroup>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="text-xs text-white/40 mb-1">Actions</div>
        {shortcuts.actions.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/80">{shortcut.action}</span>
            <KbdGroup>
              {shortcut.keys.map((key, j) => (
                <Kbd key={j} className="bg-white/10 text-white/90 border border-white/20">
                  {key}
                </Kbd>
              ))}
            </KbdGroup>
          </div>
        ))}
      </div>
    </div>
  )
}

export default KeyboardShortcutsPopup
