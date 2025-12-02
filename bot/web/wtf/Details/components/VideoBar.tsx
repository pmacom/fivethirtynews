import { cn } from "@/lib/utils"
import ContentStore from "@/wtf/Content/contentStore"
import { useEffect, useRef, useState } from "react"
import { useStoreValue } from 'zustand-x'

export const VideoBar = () => {
  const isVideoSeeking = useStoreValue(ContentStore, 'isVideoSeeking')
  const videoSeekTime = useStoreValue(ContentStore, 'videoSeekTime')
  
  const barRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const videoBarRef = useRef<HTMLDivElement>(null)

  const [isHovered, setIsHovered] = useState(false)
  const [mousePercent, setMousePercent] = useState(0)

  const classes = cn({
    'bg-red-500': !isHovered,
    'bg-orange-500': isHovered,
    'transition-all duration-500': true,
    'h-2 my-1 mt-2 rounded-full': true,
    'flex items-center relative': true,
  })

  useEffect(() => {
    ContentStore.set('isVideoSeeking', isHovered)
  },[isHovered])

  useEffect(() => {
    if(isVideoSeeking || !sliderRef || !sliderRef.current) return
    if (sliderRef.current){
      sliderRef.current.style.left = `${videoSeekTime * 100}%`
    }
  },[videoSeekTime, isVideoSeeking, sliderRef])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const percent = Math.min(Math.max((mouseX - rect.left) / (rect.width - rect.left), 0), 1)
      ContentStore.set('videoSeekTime', percent)

      if (sliderRef.current) {
        sliderRef.current.style.left = `${percent * 100}%`
      }
    }
  }

  const wrapperClasses = cn({
    'py-2': true,
    'w-full': true,
  })

  return (
    <div 
      ref={videoBarRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={wrapperClasses}
    >
      <div ref={barRef} className={classes}>
        <div ref={sliderRef} className="relative flex items-center">
          <div className="w-[10px] h-[20px] border-2 bg-white"></div>
        </div>
      </div>
    </div>
  )
}

export default VideoBar