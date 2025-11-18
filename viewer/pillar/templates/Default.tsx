import { ContentBlockItem } from "@/viewer/core/content/types"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Fullscreen, Container, Root, Content, Text, Image } from "@react-three/uikit";

import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'


interface TemplateDefaultProps {
  item: LiveViewContentBlockItems
  active: boolean
  itemIndex: number
  categoryId: string
}
export const TemplateDefault = ({ item, itemIndex, categoryId }: TemplateDefaultProps) => {
  const { size: { width, height } } = useThree()
  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])
  const activeItemId = useContentStore(state => state.activeItemId)
  const active = useMemo(() => item.content.content_id == activeItemId, [item])
  const containerRef = useRef(null)

  const onClick = useCallback(() => {
    // console.log('WTF', item.content.content_id)
    containerRef.current && console.log('findme WTF', containerRef.current)

    useContentStore.setState({
      activeCategoryId: categoryId,
      activeItemId: item.id,
      activeItemIndex: itemIndex,
      activeItemData: item
    })
  }, [])

  useEffect(() => {
    const maxWindowDimension = Math.max(width, height)
    const windowWidth = width / maxWindowDimension
    const windowHeight = height / maxWindowDimension
    setScreenAspect([windowWidth, windowHeight])
  },[])


  return (
    <group onClick={onClick}>
      <Root
        width={100}
        height={100}
      >
  
        <Container
          width={100}
          height={100}
          justifyContent="center"
          alignItems="center"
          padding={2}
          backgroundColor={active ? "hotpink" : "white"}
        >
          <mesh ref={containerRef} position={[0, 0, .01]}>
            <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
            <meshBasicMaterial transparent opacity={0} />
            <Container width={screenAspect[0]*100} height={screenAspect[1*100]}>
              <Text transformTranslateZ={.1} fontSize={3} backgroundColor={"yellow"}>
                {item.content.description}
              </Text>
              <Image src={item.content.thumbnail_url} width={50} height={50} />
            </Container>
          </mesh>
       
          {/* {item.note && (
            <Text fontSize={5} >
              {item.content.description}
            </Text>
          )} */}
   
        </Container>


      </Root>


      {/* <mesh ref={screenRef} onClick={onClick}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        {hidePanel ? <meshBasicMaterial transparent opacity={0} visible={false} /> :
        <meshBasicMaterial color={active ? "hotpink" : "black"} transparent opacity={.5} /> }
      </mesh> */}

      

    </group>
  )
}

export default TemplateDefault