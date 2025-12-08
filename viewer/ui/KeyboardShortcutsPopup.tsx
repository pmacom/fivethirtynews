"use client"

import { useViewModeStore } from '../core/store/viewModeStore'
import { KEYBOARD_SHORTCUTS } from '../core/config/keyboardShortcuts'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { useMobileLayout } from './hooks/useMobileLayout'

/**
 * Keyboard shortcuts display - always visible when toolbar is visible
 * Shows current view mode's navigation and action shortcuts
 * Hidden on mobile (no keyboard!)
 */
export function KeyboardShortcutsPopup() {
  const viewMode = useViewModeStore(state => state.viewMode)
  const shortcuts = KEYBOARD_SHORTCUTS[viewMode]
  const { isMobile } = useMobileLayout()

  // Hide on mobile - no keyboard available
  if (isMobile) return null

  return (
    <div className="fixed top-16 right-4 z-[102] min-w-[180px] rounded-lg bg-black/80 backdrop-blur-md border border-white/10 p-3 shadow-xl">
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
