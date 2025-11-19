/**
 * VideoLoadingIndicator
 *
 * Visual loading indicator for video content showing:
 * - Buffering spinner animation
 * - Loading progress bar
 * - "Video" content type badge
 * - Smooth fade in/out transitions
 */

import React from 'react'
import { Html } from '@react-three/drei'

interface VideoLoadingIndicatorProps {
  isLoading: boolean
  progress: number // 0-1
  itemId?: string
}

export const VideoLoadingIndicator: React.FC<VideoLoadingIndicatorProps> = ({
  isLoading,
  progress,
}) => {
  if (!isLoading && progress >= 1) return null

  return (
    <Html
      center
      distanceFactor={1}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: '200px',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Video badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span>Video</span>
        </div>

        {/* Buffering spinner */}
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />

        {/* Loading text */}
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {progress === 0 ? 'Initializing...' : `Loading ${Math.round(progress * 100)}%`}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
              borderRadius: '2px',
              width: `${progress * 100}%`,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </Html>
  )
}

export default VideoLoadingIndicator
