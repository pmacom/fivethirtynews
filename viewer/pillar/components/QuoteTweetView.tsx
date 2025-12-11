import React from 'react'
import { Container, Text } from '@react-three/uikit'
import { SafePlaneView } from './SafePlaneView'

interface QuoteTweetViewProps {
  thumbnailUrl: string
  videoUrl?: string
  itemId?: string
  active: boolean
  commentText: string
  commenterName: string
  commenterHandle: string
  quotedAuthor?: string
}

/**
 * QuoteTweetView displays a quote tweet with the quoted media
 * and an overlay showing the commenter's text.
 *
 * This is used when someone quote-tweets media content with their own comment.
 * The media from the quoted tweet is shown full-size, with the comment
 * displayed as an overlay at the bottom.
 */
export const QuoteTweetView: React.FC<QuoteTweetViewProps> = ({
  thumbnailUrl,
  videoUrl,
  itemId,
  active,
  commentText,
  commenterName,
  commenterHandle,
  quotedAuthor,
}) => {
  // Truncate comment if too long for overlay
  const maxLength = 200
  const displayText = commentText.length > maxLength
    ? commentText.substring(0, maxLength) + '...'
    : commentText

  return (
    <group>
      {/* The quoted tweet's media */}
      <SafePlaneView
        url={thumbnailUrl}
        active={active}
        videoUrl={videoUrl}
        itemId={itemId}
      />

      {/* Comment overlay - only show when active */}
      {active && (
        <group position={[0, -0.35, 0.01]}>
          <Container
            backgroundColor="rgba(0, 0, 0, 0.85)"
            padding={0.025}
            borderRadius={0.015}
            flexDirection="column"
            gap={0.012}
            alignItems="flex-start"
          >
            {/* Quote indicator */}
            <Text fontSize={0.016} color="rgba(255, 255, 255, 0.7)">
              {quotedAuthor ? `↩ Quoted ${quotedAuthor}` : '↩ Quote Tweet'}
            </Text>

            {/* Commenter info */}
            <Container flexDirection="row" gap={0.012} alignItems="center">
              <Text fontSize={0.02} fontWeight="bold" color="#ffffff">
                {commenterName}
              </Text>
              <Text fontSize={0.018} color="rgba(255, 255, 255, 0.5)">
                {commenterHandle}
              </Text>
            </Container>

            {/* Comment text */}
            <Text
              fontSize={0.022}
              color="#ffffff"
              lineHeight={1.4}
              maxWidth={0.6}
            >
              {displayText}
            </Text>
          </Container>
        </group>
      )}
    </group>
  )
}

export default QuoteTweetView
