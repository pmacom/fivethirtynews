"use client"

import { useEffect, useState, useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  Float,
  useGLTF,
  Stars,
  Sparkles,
  PerspectiveCamera,
  Grid
} from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useStageSelectStore } from '../stageselect/store'
import { useContentStore } from '../../core/store/contentStore'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

// --- 3D Components ---

function Logo3D() {
  const { scene } = useGLTF('/models/colorLogo1.glb')
  const meshRef = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          // Upgrade to chrome/metallic material for PS2/Xbox era look
          const oldMaterial = mesh.material as THREE.MeshStandardMaterial
          const chromeMaterial = new THREE.MeshPhysicalMaterial({
            color: oldMaterial.color || new THREE.Color(0xffffff),
            emissive: new THREE.Color(0x0055ff),
            emissiveIntensity: 0.6,
            metalness: 1.0,        // Fully metallic (chrome)
            roughness: 0.1,        // Very smooth/polished
            clearcoat: 1.0,        // Glossy clear coat layer
            clearcoatRoughness: 0.1, // Smooth clearcoat
            envMapIntensity: 2.0,  // Strong environment reflections
          })
          mesh.material = chromeMaterial
          oldMaterial.dispose() // Clean up old material
        }
      }
    })
  }, [scene])

  useFrame(() => {
    if (meshRef.current) {
      // Slow, dramatic rotation for cinematic feel
      meshRef.current.rotation.y += 0.003
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
      <primitive
        ref={meshRef}
        object={scene}
        scale={3}
        rotation={[0, Math.PI * 0.25, 0]}
      />
    </Float>
  )
}

function MovingGrid() {
  const gridRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (gridRef.current) {
      // Slow, cinematic grid movement
      gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 2
    }
  })

  return (
    <group ref={gridRef} position={[0, -2, 0]}>
      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={1}
        cellColor="#0055ff"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#00ffff"
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid
      />
    </group>
  )
}

function FloatingGeometry({ position, color, speed }: { position: [number, number, number], color: string, speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += speed
      meshRef.current.rotation.y += speed * 0.5
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={color}
          wireframe
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.6}
        />
      </mesh>
    </Float>
  )
}

function CinematicCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  useFrame((state) => {
    if (cameraRef.current) {
      // Orbital rotation - 30 second period for full circle
      const time = state.clock.elapsedTime
      const radius = 8
      const speed = (Math.PI * 2) / 30 // Full rotation in 30 seconds

      // Calculate position on circular orbit
      const x = Math.sin(time * speed) * radius
      const z = Math.cos(time * speed) * radius
      const y = 1 + Math.sin(time * speed * 0.5) * 0.5 // Slight vertical movement

      cameraRef.current.position.set(x, y, z)
      cameraRef.current.lookAt(0, 0, 0) // Always look at center
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1, 8]} fov={60} />
}

// --- Main Splash Screen Component ---

type MenuState = 'initial' | 'menu' | 'transitioning'

interface MenuItem {
  label: string
  action: () => void
}

export const SplashScreen = () => {
  const showSplash = useStageSelectStore(state => state.showSplash)
  const [menuState, setMenuState] = useState<MenuState>('initial')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPressed, setIsPressed] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // Build menu items dynamically based on user role
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        label: 'THIS WEEK',
        action: () => {
          setMenuState('transitioning')
          setTimeout(() => {
            // Navigate to the /recent route for independent recent content view
            router.push('/recent')
          }, 800)
        }
      },
      {
        label: 'STAGE SELECT',
        action: () => {
          setMenuState('transitioning')
          setTimeout(() => {
            useStageSelectStore.setState({
              showSplash: false,
              showStageSelect: true
            })
          }, 800)
        }
      },
      {
        label: 'OPTIONS',
        action: () => {
          // TODO: Open settings
          console.log('OPTIONS selected')
        }
      }
    ]

    // Add MODERATE option for moderators and admins (hierarchical)
    if (user?.is_moderator) {
      items.push({
        label: 'MODERATE',
        action: () => {
          setMenuState('transitioning')
          setTimeout(() => {
            router.push('/moderate')
          }, 800)
        }
      })
    }

    // Add ADMIN option for admins only
    if (user?.is_admin) {
      items.push({
        label: 'ADMIN',
        action: () => {
          setMenuState('transitioning')
          setTimeout(() => {
            router.push('/admin')
          }, 800)
        }
      })
    }

    // Credits always last
    items.push({
      label: 'CREDITS',
      action: () => {
        // TODO: Show credits screen
        console.log('CREDITS selected')
      }
    })

    return items
  }, [user, router])

  const handleStart = () => {
    setIsPressed(true)
    setTimeout(() => {
      setMenuState('menu')
      setIsPressed(false)
    }, 500)
  }

  useEffect(() => {
    if (!showSplash) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Initial screen - Press Start
      if (menuState === 'initial' && !isPressed) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStart()
        }
      }

      // Menu navigation
      if (menuState === 'menu') {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % menuItems.length)
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          menuItems[selectedIndex].action()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setMenuState('initial')
          setSelectedIndex(0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSplash, menuState, isPressed, selectedIndex, menuItems])

  if (!showSplash) return null

  return (
    <div className="h-screen w-screen bg-black overflow-hidden fixed inset-0 z-[210] font-orbitron select-none">

      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <CinematicCamera />
          <Suspense fallback={null}>
            {/* Dramatic Lighting */}
            <ambientLight intensity={0.2} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.5}
              penumbra={1}
              intensity={200}
              color="#0055ff"
              castShadow
            />
            <pointLight position={[-10, -5, -10]} intensity={100} color="#ff00ff" />
            <pointLight position={[0, 5, 5]} intensity={50} color="#ffffff" />

            {/* Scene Elements */}
            <Logo3D />
            <MovingGrid />

            {/* Floating "Data" Particles - Slowed for cinematic effect */}
            <FloatingGeometry position={[-4, 2, -2]} color="#00ffff" speed={0.005} />
            <FloatingGeometry position={[4, -1, -3]} color="#ff00ff" speed={0.008} />
            <FloatingGeometry position={[-3, -2, 1]} color="#ffff00" speed={0.003} />

            <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={0.3} />
            <Sparkles count={50} scale={8} size={4} speed={0.2} opacity={0.5} color="#00ffff" />

            <Environment preset="city" />
          </Suspense>

          {/* Post-Processing Effects - PS2/Xbox Era Cinematic Look */}
          <EffectComposer>
            {/* Bloom - Glowing lights bleeding into darks (MGS2/Halo style) */}
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />

            {/* Depth of Field - Blur background, focus on logo */}
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.05}
              bokehScale={3}
            />

            {/* Chromatic Aberration - Subtle lens distortion */}
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={[0.001, 0.001]}
            />

            {/* Vignette - Darker edges for cinematic framing */}
            <Vignette
              offset={0.3}
              darkness={0.7}
              blendFunction={BlendFunction.NORMAL}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Overlay Layer - Arcade HUD Style */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 md:p-12">

        {/* Top HUD */}
        <div className="flex justify-between items-start w-full text-arcade-cyan font-share-tech text-xl md:text-2xl tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
          <div className="flex flex-col gap-1">
            <span className="animate-pulse">Credits 0</span>
            <span className="text-sm opacity-70">Insert Coin</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-arcade-yellow drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">Free Play</span>
            <span className="text-sm opacity-70">Ver. 2.0.25</span>
          </div>
        </div>

        {/* Center/Bottom Interaction Area */}
        <div className="flex flex-col items-center gap-12 mb-12 pointer-events-auto">

          {/* Main Title - 530 SOCIETY */}
          <div className="relative group">
             {/* This is visually handled by the 3D logo now, but we can add a subtle overlay if needed */}
          </div>

          {/* Initial State - PRESS START BUTTON */}
          {menuState === 'initial' && (
            <>
              <button
                onClick={handleStart}
                className={`
                  relative group
                  transition-all duration-100
                  ${isPressed ? 'scale-95 brightness-150' : 'hover:scale-110'}
                `}
              >
                {/* Glowing Background Container */}
                <div className={`
                  absolute inset-0 bg-gradient-to-r from-transparent via-arcade-yellow/20 to-transparent
                  blur-xl transition-opacity duration-300
                  ${isPressed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
                `} />

                {/* The Text Itself */}
                <div className={`
                  text-4xl md:text-6xl font-black italic tracking-widest
                  text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-arcade-yellow to-yellow-600
                  drop-shadow-[0_4px_0_rgba(184,134,11,1)]
                  ${!isPressed && 'animate-blink'}
                `}>
                  PRESS START
                </div>

                {/* Reflection/Shine effect on text */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-shimmer" />
              </button>

              {/* Prompt Text */}
              <div className="text-center space-y-2">
                <p className="text-white/50 font-share-tech text-sm tracking-[0.5em] uppercase">
                  Join the Society
                </p>
              </div>
            </>
          )}

          {/* Menu State - Main Menu */}
          {menuState === 'menu' && (
            <div className="flex flex-col gap-6 min-w-[400px]">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    relative group text-center py-4 px-8
                    text-2xl md:text-3xl font-bold tracking-widest uppercase
                    transition-all duration-200
                    ${selectedIndex === index
                      ? 'scale-110 text-arcade-yellow drop-shadow-[0_0_15px_rgba(255,215,0,1)]'
                      : 'text-white/70 hover:text-white/90'
                    }
                  `}
                >
                  {/* Selection Indicator */}
                  {selectedIndex === index && (
                    <>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-arcade-yellow animate-pulse">
                        ▶
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 text-arcade-yellow animate-pulse">
                        ◀
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-arcade-yellow/20 blur-xl" />
                    </>
                  )}

                  {/* Text with border effect */}
                  <span className="relative" style={{
                    textShadow: selectedIndex === index
                      ? '2px 2px 0 rgba(184,134,11,0.5), -2px -2px 0 rgba(184,134,11,0.5)'
                      : 'none'
                  }}>
                    {item.label}
                  </span>
                </button>
              ))}

              {/* Instructions */}
              <div className="text-center mt-8 space-y-1">
                <p className="text-white/40 font-share-tech text-xs tracking-[0.3em] uppercase">
                  ↑↓ Navigate • Enter Select • Esc Back
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="w-full text-center">
          <p className="text-white/30 font-share-tech text-xs tracking-widest uppercase">
            © 2025 530 Society • All Rights Reserved • Capcom / Sega Tribute
          </p>
        </div>
      </div>

      {/* Screen Effects Overlay */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        <div className="scanlines absolute inset-0 opacity-10 mix-blend-overlay" />
        <div className="crt-overlay absolute inset-0 opacity-40" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
      </div>

    </div>
  )
}

export default SplashScreen
