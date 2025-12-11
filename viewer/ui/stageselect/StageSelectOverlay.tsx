'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowLeft } from 'lucide-react'
import { useContentStore } from '../../core/store/contentStore'
import { useStageSelectStore } from './store'
import { GlobalSettingsButton } from '../components/GlobalSettingsButton'
import './styles.css'

type Level = {
  id: string
  name: string
  icon: string
  color: string
  description: string
  stats: {
    difficulty: number
    complexity: number
    players: string
  }
}

const levels: Level[] = [
  {
    id: 'preshow',
    name: 'Preshow',
    icon: '🎬',
    color: 'text-purple-400',
    description: 'BEHIND THE CURTAIN',
    stats: { difficulty: 1, complexity: 2, players: '1-100' }
  },
  {
    id: 'general',
    name: 'General',
    icon: '⚡',
    color: 'text-blue-400',
    description: 'MAIN HUB ZONE',
    stats: { difficulty: 2, complexity: 3, players: 'ALL' }
  },
  {
    id: 'thirddimension',
    name: '3rdDimension',
    icon: '🔷',
    color: 'text-cyan-400',
    description: 'SPATIAL REALM',
    stats: { difficulty: 5, complexity: 5, players: '1-4' }
  },
  {
    id: 'ai',
    name: 'AI',
    icon: '🤖',
    color: 'text-emerald-400',
    description: 'NEURAL NETWORK',
    stats: { difficulty: 4, complexity: 5, players: 'BOTS' }
  },
  {
    id: 'code',
    name: 'Code',
    icon: '💻',
    color: 'text-yellow-400',
    description: 'MATRIX ZONE',
    stats: { difficulty: 5, complexity: 4, players: 'DEVS' }
  },
  {
    id: 'metaverse',
    name: 'Metaverse',
    icon: '🌐',
    color: 'text-indigo-400',
    description: 'VIRTUAL WORLD',
    stats: { difficulty: 3, complexity: 5, players: 'MMO' }
  },
  {
    id: 'robotics',
    name: 'Robotics',
    icon: '🦾',
    color: 'text-orange-400',
    description: 'MECH FACTORY',
    stats: { difficulty: 4, complexity: 4, players: 'BOTS' }
  },
  {
    id: 'medicine',
    name: 'Medicine',
    icon: '🧬',
    color: 'text-rose-400',
    description: 'BIO LAB',
    stats: { difficulty: 5, complexity: 5, players: 'DOCS' }
  },
  {
    id: 'misc',
    name: 'Misc',
    icon: '✨',
    color: 'text-pink-400',
    description: 'RANDOM ACCESS',
    stats: { difficulty: 1, complexity: 1, players: 'ANY' }
  }
]

export function StageSelectOverlay() {
  const router = useRouter()
  const showStageSelect = useStageSelectStore(state => state.showStageSelect)
  const [hoveredLevel, setHoveredLevel] = useState<Level>(levels[0])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isClosing, setIsClosing] = useState(false)

  const selectLevel = (index: number) => {
    console.log('[StageSelect] selectLevel called with index:', index)
    const level = levels[index]

    // Start closing animation
    setIsClosing(true)

    // Wait for animation before navigating to browse page
    setTimeout(() => {
      console.log('[StageSelect] Navigating to browse page for:', level.id)

      // Close both the stage select and splash screen
      useStageSelectStore.setState({
        showStageSelect: false,
        showSplash: false
      })
      setIsClosing(false)

      // Navigate to the browse page for this category
      router.push(`/browse/${level.id}`)
    }, 600) // Match animation duration
  }

  // Keyboard navigation
  useEffect(() => {
    if (!showStageSelect) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % levels.length)
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + levels.length) % levels.length)
      } else if (e.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 2) % levels.length)
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 2 + levels.length) % levels.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        selectLevel(selectedIndex)
      } else if (e.key === 'Escape') {
        useStageSelectStore.setState({ showStageSelect: false })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showStageSelect, selectedIndex])

  useEffect(() => {
    setHoveredLevel(levels[selectedIndex])
  }, [selectedIndex])

  if (!showStageSelect) return null

  return (
    <div className={`stage-select-container ${isClosing ? 'stage-select-closing' : ''}`}>
      {/* Backdrop with blur */}
      <div className="stage-select-backdrop" onClick={() => useStageSelectStore.setState({ showStageSelect: false })} />

      {/* Main Content */}
      <div className="stage-select-content">
        {/* Top Right Buttons: Settings + Close */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <GlobalSettingsButton className="!fixed !top-auto !right-auto relative" zIndex={30} />
          <button
            onClick={() => useStageSelectStore.setState({ showStageSelect: false })}
            className="w-10 h-10 flex items-center justify-center
                       text-white/50 hover:text-white border-2 border-white/20 hover:border-white/50
                       rounded transition-all hover:scale-110 bg-black/50 backdrop-blur-sm"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0 scanlines z-50 opacity-20 pointer-events-none" />
        <div className="absolute inset-0 crt-overlay z-50 pointer-events-none" />

        {/* Main Container */}
        <div className="relative z-10 h-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto">

          {/* Header */}
          <header className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h2 className="text-arcade-cyan text-sm md:text-base tracking-[0.5em] animate-pulse font-orbitron">
                INSERT COIN
              </h2>
              <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] font-orbitron">
                SELECT STAGE
              </h1>
            </div>
            <div className="hidden md:block text-right font-share-tech text-arcade-yellow">
              <div className="text-2xl">CREDITS: 02</div>
              <div className="text-sm opacity-70">ID: 530-SOC</div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-center min-h-0">

            {/* Left: Level Grid */}
            <div className="w-full md:w-1/2 grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
              {levels.map((level, index) => {
                const isSelected = selectedIndex === index
                return (
                  <button
                    key={level.id}
                    onClick={() => {
                      setSelectedIndex(index)
                      selectLevel(index)
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      relative group h-24 md:h-32 w-full border-2 transform transition-all duration-100 skew-x-[-10deg]
                      ${isSelected
                        ? "border-arcade-yellow bg-arcade-yellow/10 scale-105 z-10 box-glow"
                        : "border-white/20 bg-black/50 hover:border-white/50"
                      }
                    `}
                  >
                    <div className="absolute inset-0 flex items-center justify-center skew-x-[10deg]">
                      <span className={`
                        text-4xl md:text-5xl transition-all duration-300
                        ${isSelected ? "scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" : "opacity-50 grayscale"}
                      `}>
                        {level.icon}
                      </span>
                    </div>

                    {/* Corner accents */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />

                    {/* Label (only visible on selection) */}
                    {isSelected && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-arcade-yellow text-black text-xs font-bold px-2 py-0.5 skew-x-[10deg] whitespace-nowrap font-orbitron">
                        P{index + 1}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right: Preview Card */}
            <div className="w-full md:w-1/2 h-[40vh] md:h-[60vh] relative">
              <div className="w-full h-full border-4 border-white/20 bg-black/80 relative overflow-hidden transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/80 before:to-transparent before:z-10">
                {/* Preview Image Placeholder */}
                <div className="absolute inset-0 bg-gray-900">
                  <div className={`
                    w-full h-full opacity-50 bg-gradient-to-br transition-all duration-500
                    ${hoveredLevel.color.replace('text-', 'from-')} to-black
                  `} />
                  {/* Animated grid overlay on image */}
                  <div className="absolute inset-0 grid-bg opacity-20" />
                </div>

                {/* Level Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 space-y-4">
                  <div className="flex items-end justify-between border-b-2 border-white/20 pb-4">
                    <div>
                      <h2 className={`
                        text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-glow font-orbitron
                        ${hoveredLevel.color}
                      `}>
                        {hoveredLevel.name}
                      </h2>
                      <p className="text-white/70 font-share-tech text-lg tracking-widest">
                        {hoveredLevel.description}
                      </p>
                    </div>
                    <div className="text-6xl opacity-20 font-black font-orbitron">
                      0{selectedIndex + 1}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 font-share-tech text-sm">
                    <div>
                      <div className="text-white/40 uppercase text-xs">Difficulty</div>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`
                            h-2 w-full skew-x-[-20deg]
                            ${i < Math.ceil(hoveredLevel.stats.difficulty / 2) ? "bg-arcade-yellow" : "bg-white/10"}
                          `} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 uppercase text-xs">Complexity</div>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`
                            h-2 w-full skew-x-[-20deg]
                            ${i < hoveredLevel.stats.complexity ? "bg-arcade-cyan" : "bg-white/10"}
                          `} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 uppercase text-xs">Players</div>
                      <div className="text-arcade-red font-bold tracking-widest">
                        {hoveredLevel.stats.players}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                  <div className="w-16 h-1 bg-white/50" />
                  <div className="w-8 h-1 bg-white/30" />
                  <div className="w-4 h-1 bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <div className="inline-block bg-arcade-red/20 border border-arcade-red/50 px-8 py-2 skew-x-[-20deg]">
              <p className="text-arcade-red font-bold animate-pulse skew-x-[20deg] tracking-widest font-orbitron">
                PRESS START TO ENTER
              </p>
            </div>
          </footer>
        </div>

        {/* Back Button - Bottom Left */}
        <button
          onClick={() => useStageSelectStore.setState({ showStageSelect: false })}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3
                     bg-white/5 hover:bg-white/10 border-2 border-white/30 hover:border-white/50
                     text-white/70 hover:text-white rounded-lg transition-all hover:scale-105
                     font-share-tech text-sm tracking-wider backdrop-blur-sm"
          title="Go back (Esc)"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">BACK</span>
        </button>
      </div>
    </div>
  )
}
