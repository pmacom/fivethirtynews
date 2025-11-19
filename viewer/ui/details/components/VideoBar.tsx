import { cn } from "@/lib/utils"
import { useContentStore } from "@/viewer/core/store/contentStore"
import { useEffect, useRef, useState } from "react"
import videoPreloadManager from "@/viewer/core/video/VideoPreloadManager"

/**
 * Format seconds into MM:SS or HH:MM:SS
 */
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00"

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const VideoBar = () => {
  const isVideoSeeking = useContentStore(state => state.isVideoSeeking)
  const videoSeekTime = useContentStore(state => state.videoSeekTime)
  const videoDuration = useContentStore(state => state.videoDuration)

  const barRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const videoBarRef = useRef<HTMLDivElement>(null)
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isHovered, setIsHovered] = useState(false)
  const [mousePercent, setMousePercent] = useState(0)
  const [hoverTime, setHoverTime] = useState(0)

  // Calculate current time and duration
  const currentTime = videoSeekTime * (videoDuration || 0)
  const duration = videoDuration || 0

  const classes = cn({
    'bg-red-500': !isHovered,
    'bg-orange-500': isHovered,
    'transition-all duration-500': true,
    'h-2 my-1 mt-2 rounded-full': true,
    'flex items-center relative': true,
  })

  useEffect(() => {
    // Clear any pending timeout
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }

    if (isHovered) {
      // Immediately pause video when hovering
      useContentStore.setState({ isVideoSeeking: true })
    } else {
      // Wait 2 seconds before resuming video after mouse leave
      resumeTimeoutRef.current = setTimeout(() => {
        useContentStore.setState({ isVideoSeeking: false })
        resumeTimeoutRef.current = null
      }, 2000)
    }

    // Cleanup timeout on unmount
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = null
      }
    }
  }, [isHovered])

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
      useContentStore.setState({ videoSeekTime: percent })

      // Update hover time for preview
      setHoverTime(percent * duration)
      setMousePercent(percent)

      if (sliderRef.current) {
        sliderRef.current.style.left = `${percent * 100}%`
      }
    }
  }

  const wrapperClasses = cn({
    'py-2': true,
    'w-full': true,
    'flex flex-col gap-1': true,
  })

  const timeDisplayClasses = cn({
    'text-xs text-white opacity-70': true,
    'flex justify-between items-center': true,
    'px-2': true,
  })

  return (
    <div
      ref={videoBarRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={wrapperClasses}
    >
      {/* Time Display */}
      <div className={timeDisplayClasses}>
        <span>{formatTime(currentTime)}</span>
        {isHovered && (
          <span className="opacity-50">
            Hover: {formatTime(hoverTime)}
          </span>
        )}
        <span>{formatTime(duration)}</span>
      </div>

      {/* Seek Bar */}
      <div ref={barRef} className={classes}>
        {/* Progress indicator */}
        <div
          className="absolute top-0 left-0 h-full bg-white opacity-30 rounded-full transition-all"
          style={{ width: `${videoSeekTime * 100}%` }}
        />

        {/* Slider handle */}
        <div ref={sliderRef} className="relative flex items-center">
          <div className={cn(
            "w-[10px] h-[20px] border-2 bg-white rounded transition-all",
            isHovered && "w-[12px] h-[24px]"
          )}></div>
        </div>
      </div>
    </div>
  )
}

export default VideoBar