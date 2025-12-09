import React from 'react'
import { useUIStore } from '../store';
import { AnimatePresence, motion } from 'framer-motion';

interface WTFUIWrapperProps {
  children?: React.ReactNode;
  startHidden?: boolean
  ignoreHide?: boolean
}

export const RevealOnMovement: React.FC<WTFUIWrapperProps> = ({ children, startHidden }) => {
  const isHovered = useUIStore(state => state.isHovered)
  const preventFade = useUIStore(state => state.preventFade)

  // Stay visible if hovered OR if fade is prevented (e.g., input focused)
  const shouldShow = isHovered || preventFade

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: startHidden ? 0 : 1 }}
        animate={{ opacity: shouldShow ? 1 : 0 }}
        exit={{ opacity: startHidden ? 0 : 1 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default RevealOnMovement