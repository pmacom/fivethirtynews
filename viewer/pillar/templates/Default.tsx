import React, { useCallback, useMemo } from 'react'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'

interface TemplateDefaultProps {
  item: LiveViewContentBlockItems
  active: boolean
  itemIndex: number
  categoryId: string
}

export const TemplateDefault = ({ item, itemIndex, categoryId }: TemplateDefaultProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const active = useMemo(() => item.content?.content_id === activeItemId, [item, activeItemId])

  const onClick = useCallback(() => {
    useContentStore.setState({
      activeCategoryId: categoryId,
      activeItemId: item.content?.content_id,
      activeItemIndex: itemIndex,
    })
  }, [categoryId, item.content?.content_id, itemIndex])

  return (
    <mesh onClick={onClick}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        color={active ? "#ec4899" : "#64748b"}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

export default TemplateDefault