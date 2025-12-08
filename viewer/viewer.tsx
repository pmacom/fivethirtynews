"use client"

import React, { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BackgroundScene from './models/BackgroundScene'
import AudioResponsiveSphere from './models/AudioResponsiveSphere'
import Logo530 from './models/Logo530'
import { LayoutSwitcher } from './layouts/LayoutSwitcher'
import { FloatingContentOrbit } from './floating/FloatingContentOrbit'
import Scene from './scene/scene'
import TopToolbar from './ui/TopToolbar'
import CloudControls from './ui/CloudControls'
import FloatingContentFeedback from './ui/FloatingContentFeedback'
import RevealOnMovement from './ui/components/RevealOnMovement'
import { UI } from './ui/ui'
import Legend from './ui/legend/legend'
import Details from './ui/details/details'
import Settings from './ui/settings/settings'
import SettingsOptions from './ui/settings/options'
import { StageSelectOverlay } from './ui/stageselect/StageSelectOverlay'
import SplashScreen from './ui/splash/SplashScreen'
import Chyron from './ui/chyron/chyron'
import ErrorBoundary from './ErrorBoundary'
import BehaviorDetection from './common/BehaviorDetection'
import { TunnelThing } from './scene/components/TunnelThing'
import { useStageSelectStore } from './ui/stageselect/store'
import { useContentStore } from './core/store/contentStore'
import { useViewModeStore } from './core/store/viewModeStore'
import videoPreloadManager from './core/video/VideoPreloadManager'
import './ui/splash/styles.css'

export type ContentMode = 'latest' | 'this-week' | 'episode';

interface ContentLoaderProps {
  mode: ContentMode;
  episodeId?: string;
}

// Component to ensure content loads even when Pillar is hidden
const ContentLoader = ({ mode, episodeId }: ContentLoaderProps) => {
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate fetches in StrictMode
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    const store = useContentStore.getState()

    switch (mode) {
      case 'this-week':
        console.log('[ContentLoader] Fetching recent content with hardcoded categories...')
        store.fetchRecentContent()
        break
      case 'episode':
        if (episodeId) {
          console.log('[ContentLoader] Fetching episode content...', episodeId)
          store.fetchEpisodeContent(episodeId)
        }
        break
      case 'latest':
      default:
        console.log('[ContentLoader] Fetching latest episode...')
        store.fetchLatestEpisode()
        break
    }
  }, [mode, episodeId])

  return null
}

interface EpisodeNavigation {
  prev: { id: string; episode_number: number; title: string } | null;
  next: { id: string; episode_number: number; title: string } | null;
}

interface ViewerProps {
  mode?: ContentMode;
  episodeId?: string;
  showSlug?: string;
  showName?: string;
  episodeNumber?: number;
  episodeTitle?: string;
  navigation?: EpisodeNavigation;
  skipSplash?: boolean;
}

const Viewer = ({
  mode = 'latest',
  episodeId,
  showSlug,
  showName,
  episodeNumber,
  episodeTitle,
  navigation,
  skipSplash = false
}: ViewerProps) => {
  const viewMode = useViewModeStore(state => state.viewMode)

  // Skip splash screen when skipSplash prop is true (e.g., on /recent route)
  useEffect(() => {
    if (skipSplash) {
      useStageSelectStore.setState({ showSplash: false, showStageSelect: false })
    }
  }, [skipSplash])

  // Initialize video preload manager only for pillar view mode
  // Other view modes use thumbnails only for better performance
  useEffect(() => {
    if (viewMode === 'pillar') {
      videoPreloadManager.initialize()
    } else {
      // Pause/cleanup video preloading for non-pillar views
      videoPreloadManager.destroy()
    }

    return () => {
      videoPreloadManager.destroy()
    }
  }, [viewMode])
  // Hide Pillar content when splash screen or stage select is showing
  const showSplash = useStageSelectStore(state => state.showSplash)
  const showStageSelect = useStageSelectStore(state => state.showStageSelect)

  // Debug logging
  console.log('[Viewer] State:', { showSplash, showStageSelect, shouldShowPillar: !showSplash && !showStageSelect })

  return (
    <ErrorBoundary>
      <BehaviorDetection>
        <ContentLoader mode={mode} episodeId={episodeId} />
        <Scene>
          {/* <ambientLight intensity={Math.PI / 2} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
          <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} /> */}

          {/* <AudioResponsiveSphere /> */}
          {!showSplash && !showStageSelect && (
            <Suspense fallback={null}>
              <LayoutSwitcher />
              <FloatingContentOrbit />
            </Suspense>
          )}

        </Scene>
        <UI>
          <Legend />
          <Details />
          <Settings>
            <SettingsOptions />
          </Settings>
        </UI>
        {/* Top Toolbar - episode nav, view modes, curate, edit, stage select, settings */}
        <RevealOnMovement>
          <TopToolbar
            showSlug={showSlug}
            episodeId={episodeId}
            showName={showName}
            episodeNumber={episodeNumber}
            episodeTitle={episodeTitle}
            navigation={navigation}
          />
        </RevealOnMovement>
        {/* Cloud Controls - only shows in cloud view mode */}
        <CloudControls />
        {/* Floating Content Feedback - thumbs on hover for suggested content */}
        <FloatingContentFeedback />
        <Chyron />
        {/* Stage Select Overlay and Splash */}
        <StageSelectOverlay />
        <SplashScreen />
      </BehaviorDetection>
    </ErrorBoundary>
  )
}

export default Viewer


/*

      <Scene>
        
        <BackgroundScene />
        <AudioResponsiveSphere />
      
        <Pillar />

        <Logo530 />
        <OrbitControls />
      </Scene>

      */