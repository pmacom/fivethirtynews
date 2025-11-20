"use client"

import { useEffect, useState, useRef, Suspense } from 'react'
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
import * as THREE from 'three'
import { useStageSelectStore } from '../stageselect/store'

// --- 3D Components ---

function Logo3D() {
  const { scene } = useGLTF('/models/colorLogo1.glb')
  const meshRef = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial
          // Enhance the material for that glossy arcade look
          material.emissive = new THREE.Color(0x0055ff)
          material.emissiveIntensity = 0.4
          material.metalness = 0.8
          material.roughness = 0.2
        }
      }
    })
  }, [scene])

  useFrame(() => {
    if (meshRef.current) {
      // Classic arcade idle rotation
      meshRef.current.rotation.y += 0.01
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
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
      // Move grid towards camera to create infinite runner effect
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 2
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
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
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

// --- Main Splash Screen Component ---

export const SplashScreen = () => {
  const showSplash = useStageSelectStore(state => state.showSplash)
  const [isPressed, setIsPressed] = useState(false)

  const handleStart = () => {
    setIsPressed(true)
    // Play a sound here if we had one
    setTimeout(() => {
      useStageSelectStore.setState({
        showSplash: false,
        showStageSelect: true
      })
    }, 800) // Longer delay for effect
  }

  useEffect(() => {
    if (!showSplash || isPressed) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleStart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSplash, isPressed])

  if (!showSplash) return null

  return (
    <div className="h-screen w-screen bg-black overflow-hidden fixed inset-0 z-[210] font-orbitron select-none">

      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <PerspectiveCamera makeDefault position={[0, 1, 8]} fov={60} />
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

            {/* Floating "Data" Particles */}
            <FloatingGeometry position={[-4, 2, -2]} color="#00ffff" speed={0.02} />
            <FloatingGeometry position={[4, -1, -3]} color="#ff00ff" speed={0.03} />
            <FloatingGeometry position={[-3, -2, 1]} color="#ffff00" speed={0.01} />

            <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={50} scale={8} size={4} speed={0.4} opacity={0.5} color="#00ffff" />

            <Environment preset="city" />
          </Suspense>
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

          {/* PRESS START BUTTON - The Star of the Show */}
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
