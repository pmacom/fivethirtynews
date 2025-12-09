'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useSectionExitStore } from './store'
import './styles.css'

export function SectionExitOverlay() {
  const isVisible = useSectionExitStore(state => state.isVisible)
  const currentCategoryTitle = useSectionExitStore(state => state.currentCategoryTitle)
  const leftCategory = useSectionExitStore(state => state.leftCategory)
  const rightCategory = useSectionExitStore(state => state.rightCategory)
  const selectedSide = useSectionExitStore(state => state.selectedSide)
  const setSelectedSide = useSectionExitStore(state => state.setSelectedSide)
  const selectLeft = useSectionExitStore(state => state.selectLeft)
  const selectRight = useSectionExitStore(state => state.selectRight)
  const hide = useSectionExitStore(state => state.hide)
  const confirmSelection = useSectionExitStore(state => state.confirmSelection)

  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      hide()
      setIsClosing(false)
    }, 500)
  }

  // First click selects, second click confirms
  const handleClickLeft = () => {
    if (selectedSide === 'left') {
      // Already selected - confirm navigation
      setIsClosing(true)
      setTimeout(() => {
        selectLeft()
        setIsClosing(false)
      }, 500)
    } else {
      // First click - just select/highlight
      setSelectedSide('left')
    }
  }

  const handleClickRight = () => {
    if (selectedSide === 'right') {
      // Already selected - confirm navigation
      setIsClosing(true)
      setTimeout(() => {
        selectRight()
        setIsClosing(false)
      }, 500)
    } else {
      // First click - just select/highlight
      setSelectedSide('right')
    }
  }

  // Confirm whichever side is selected (for Enter key)
  const handleConfirm = () => {
    if (selectedSide === 'left') {
      setIsClosing(true)
      setTimeout(() => {
        selectLeft()
        setIsClosing(false)
      }, 500)
    } else if (selectedSide === 'right') {
      setIsClosing(true)
      setTimeout(() => {
        selectRight()
        setIsClosing(false)
      }, 500)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setSelectedSide('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          setSelectedSide('right')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          handleClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, selectedSide, setSelectedSide])

  if (!isVisible) return null

  return (
    <div className={`section-exit-container ${isClosing ? 'section-exit-closing' : ''}`}>
      {/* Backdrop */}
      <div className="section-exit-backdrop" onClick={handleClose} />

      {/* Content */}
      <div className="section-exit-content">
        {/* Background effects */}
        <div className="section-exit-grid-bg" />
        <div className="section-exit-scanlines" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center
                     text-white/50 hover:text-white border-2 border-white/20 hover:border-white/50
                     rounded transition-all hover:scale-110"
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="section-exit-header">
          <h1 className="section-exit-title">Section Complete</h1>
          <p className="section-exit-subtitle">
            Now leaving section, any final comments?
          </p>
        </div>

        {/* Current section indicator */}
        <div className="section-exit-current">
          <div className="section-exit-current-label">Currently in</div>
          <div className="section-exit-current-name">{currentCategoryTitle}</div>
        </div>

        {/* Category selection buttons */}
        <div className="section-exit-buttons">
          {/* Left category button */}
          {leftCategory && (
            <button
              className={`section-exit-button ${selectedSide === 'left' ? 'selected' : ''}`}
              onClick={handleClickLeft}
            >
              <div className="button-content">
                <span className="arrow">&larr;</span>
                <span className="direction">Previous</span>
                <span className="category-name">{leftCategory.title}</span>
              </div>
            </button>
          )}

          {/* Right category button */}
          {rightCategory && (
            <button
              className={`section-exit-button ${selectedSide === 'right' ? 'selected' : ''}`}
              onClick={handleClickRight}
            >
              <div className="button-content">
                <span className="arrow">&rarr;</span>
                <span className="direction">Next</span>
                <span className="category-name">{rightCategory.title}</span>
              </div>
            </button>
          )}
        </div>

        {/* Hint text */}
        <div className="section-exit-hint">
          <span><kbd>&larr;</kbd><kbd>&rarr;</kbd> to select</span>
          <span><kbd>Enter</kbd> or click again to confirm</span>
          <span><kbd>Esc</kbd> to cancel</span>
        </div>
      </div>
    </div>
  )
}

export default SectionExitOverlay
