import React, { useEffect } from 'react'
import { useUIStore } from './store';
import { useStageSelectStore } from './stageselect/store';
import RevealOnMovement from './components/RevealOnMovement';
import './styles.css'

interface WTFUIProps {
  children?: React.ReactNode
}
export const UI = ({ children }:WTFUIProps) => {
  // Hide UI when splash screen or stage select is showing
  const showSplash = useStageSelectStore(state => state.showSplash);
  const showStageSelect = useStageSelectStore(state => state.showStageSelect);

  if (showSplash || showStageSelect) return null;

  return (
    <>
      <UIListener />
      <RevealOnMovement startHidden={false}>
        {children}
      </RevealOnMovement>
    </>
  )
}


interface UIListenerProps {
  children?: React.ReactNode
}
const UIListener = ({ children }:UIListenerProps) => {

  useEffect(() => {
    let timer: NodeJS.Timeout
    const handleMouseMove = () => {
      useUIStore.setState({ isHovered: true })
      clearTimeout(timer)
      timer = setTimeout(() => {
        // Only fade if preventFade is not set (e.g., input not focused)
        if (!useUIStore.getState().preventFade) {
          useUIStore.setState({ isHovered: false })
        }
      }, 2000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return children
}

export default UIListener