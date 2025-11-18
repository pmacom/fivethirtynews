"use client"

import React, { useEffect, useMemo, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'

import { Group } from 'three'
import { easePolyInOut } from 'd3-ease'
import { useContentStore } from '../core/store/contentStore'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../scene/store'
import PillarColumn from './components/PillarColumn'
import Logo530 from '../models/Logo530'
import { useControls } from 'leva'

export const Pillar = () => {
  const contents = useContentStore(state => state.content)
  const activeCategoryId = useContentStore(state => state.activeCategoryId)
  const activeItemIndex = useContentStore(state => state.activeItemIndex)
  const { size: { width: canvasWidth, height: canvasHeight } } = useThree()
  const episodeId = useContentStore(state => state.episodeId)
  const logoRef = useRef<Group>(null)

  // useEffect(() => {
  //   if(!episodeId) return
  //   useContentStore.getState().fetchEpisodeContent(episodeId)
  // }, [episodeId])

  useEffect(() => {
    useContentStore.getState().fetchLatestEpisode()
  }, [])

  useEffect(() => {
    if(!contents || contents.length === 0) return
    useContentStore.setState({
      activeCategoryId: contents[0].id,
      activeItemId: contents[0].content_block_items[0]?.content?.content_id,
      activeItemData: contents[0].content_block_items[0],
    })
  },[contents])

  const radius = useMemo(() => {
    if (!contents || contents.length === 0) return 0
    return 0.5 / Math.sin(Math.PI / contents.length)
  }, [contents])

  const angleStep = useMemo(() => {
    if (!contents || contents.length === 0) return 0
    return (2 * Math.PI) / contents.length
  }, [contents])

  // Calculate the index of the active category to determine rotation
  const activeIndex = useMemo(() => {
    if (!contents) return 0
    return contents.findIndex((col: any) => col.id === activeCategoryId)
  }, [contents, activeCategoryId])

  const angleOffset = Math.PI / 2  // Adjust this offset based on the initial alignment of the camera and first plane
  const selectedPlaneAngle = activeIndex * angleStep

  useEffect(() => {
    useSceneStore.setState({ canvasWidth, canvasHeight })
    useSceneStore.getState().fitToBox()
  },[canvasWidth, canvasHeight])

  // Use useSpring to animate the rotation smoothly
  const { rotationY, positionY } = useSpring({
    rotationY: selectedPlaneAngle - angleOffset,  // Subtract angleOffset to align the selected plane
    positionY: -(activeItemIndex),
    config: {
      duration: 2000, // Animation duration in milliseconds (e.g., 1 second)
      easing: easePolyInOut,
    },
    onStart: () => {
      useContentStore.setState({ isAnimating: true })
    },
    onRest: () => {
      useContentStore.setState({ isAnimating: false })
      useSceneStore.getState().fitToBox()
    }
  })


  const cols = useMemo(() => {
    if (!contents || contents.length === 0) return null
    return contents.map((col: any, i: number) => {
      const angle = i * angleStep
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      const columnRotationY = -angle + Math.PI // Rotate to face outward

      return (
        <PillarColumn
          key={col.id}
          data={col}
          position={[x, 0, z] as [number, number, number]}
          rotation={[0, columnRotationY - Math.PI / 2, 0] as [number, number, number]}
        />
      )
    })
  }, [contents, radius, angleStep])

  const { height } = useControls({
    height: { value: 10, min: 1, max: 400, step: 1 }
  })

  return (
    <animated.group rotation-y={rotationY} position-y={positionY}>
      {cols}
      {/* <group ref={logoRef} scale={10} position={[0, height, 0]} rotation={[0, 0, 0]}>
        <Logo530 />
      </group> */}
    </animated.group>
  )
}
