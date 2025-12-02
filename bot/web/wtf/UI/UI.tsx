import React, { useEffect } from 'react'
import { UIStore } from './uiStore';
import RevealOnMovement from './components/RevealOnMovement';
import './styles.css'

interface WTFUIProps {
  children?: React.ReactNode
}
export const UI = ({ children }:WTFUIProps) => {

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
      UIStore.set('isHovered', true)
      clearTimeout(timer)
      timer = setTimeout(() => UIStore.set('isHovered', false), 2000)
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