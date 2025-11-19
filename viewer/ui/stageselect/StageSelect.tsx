import React, { useCallback } from 'react'
import { IoLayersOutline } from 'react-icons/io5'
import { useStageSelectStore } from './store'
import { StageSelectOverlay } from './StageSelectOverlay'

export const StageSelect = () => {
  const showStageSelect = useStageSelectStore(state => state.showStageSelect)

  const toggleStageSelect = useCallback(() => {
    useStageSelectStore.setState({ showStageSelect: !showStageSelect })
  }, [showStageSelect])

  return (
    <>
      {/* Stage Select Button */}
      <div className="wtf--ui cursor-pointer z-[103]">
        <div
          onClick={toggleStageSelect}
          className="wtf--ui--container rounded fixed top-0 right-0"
          style={{ margin: '1rem' }}
          title="Stage Select"
        >
          <IoLayersOutline />
        </div>
      </div>

      {/* Overlay */}
      <StageSelectOverlay />
    </>
  )
}

export default StageSelect
