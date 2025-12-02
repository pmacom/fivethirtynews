import React from 'react'
import { UIStore } from '../uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useStoreValue } from 'zustand-x';

interface WTFUIWrapperProps {
  children?: React.ReactNode;
  startHidden?: boolean
  ignoreHide?: boolean
}

export const RevealOnMovement: React.FC<WTFUIWrapperProps> = ({ children, startHidden }) => {
  const isHovered = useStoreValue(UIStore, 'isHovered')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: startHidden ? 0 : 1 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        exit={{ opacity: startHidden ? 0 : 1 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default RevealOnMovement