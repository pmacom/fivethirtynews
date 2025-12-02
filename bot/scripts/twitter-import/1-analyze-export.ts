#!/usr/bin/env tsx

import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { parseTwitterLikesFile, extractTweetIdFromFilename, getFileExtension, isImageExtension, isVideoExtension } from './utils/twitter-parser'

console.log('🔍 Analyzing Twitter Export Data...\n')

// Paths
const LIKES_FILE = join(process.cwd(), 'data/twitter-export/likes.js')
const MEDIA_DIR = join(process.cwd(), 'data/twitter-export/tweets_media')

// Check if files exist
if (!existsSync(LIKES_FILE)) {
  console.error('❌ Error: likes.js not found at:', LIKES_FILE)
  console.error('📝 Please place your Twitter likes export file at: data/twitter-export/likes.js')
  process.exit(1)
}

console.log('✅ Found likes.js file')

// Parse likes data
let likesData
try {
  likesData = parseTwitterLikesFile(LIKES_FILE)
  console.log(`✅ Parsed ${likesData.totalCount} liked tweets\n`)
} catch (error) {
  console.error('❌ Error parsing likes.js:', error)
  process.exit(1)
}

// Analyze media directory
let mediaFiles: string[] = []
let mediaByTweetId: Map<string, string[]> = new Map()

if (!existsSync(MEDIA_DIR)) {
  console.log('⚠️  Media directory not found at:', MEDIA_DIR)
  console.log('📝 Please place your tweets_media folder at: data/twitter-export/tweets_media\n')
} else {
  console.log('✅ Found media directory')

  try {
    mediaFiles = readdirSync(MEDIA_DIR).filter(file => {
      const fullPath = join(MEDIA_DIR, file)
      return statSync(fullPath).isFile()
    })

    console.log(`✅ Found ${mediaFiles.length} media files\n`)

    // Organize media by tweet ID
    for (const file of mediaFiles) {
      const tweetId = extractTweetIdFromFilename(file)
      if (tweetId) {
        if (!mediaByTweetId.has(tweetId)) {
          mediaByTweetId.set(tweetId, [])
        }
        mediaByTweetId.get(tweetId)!.push(file)
      }
    }
  } catch (error) {
    console.error('❌ Error reading media directory:', error)
    process.exit(1)
  }
}

// Generate statistics
console.log('📊 ANALYSIS RESULTS')
console.log('═'.repeat(60))

// Likes statistics
console.log('\n📝 Liked Tweets:')
console.log(`   Total: ${likesData.totalCount}`)

// Sample tweet data
if (likesData.likes.length > 0) {
  const sample = likesData.likes[0]
  console.log('\n   Sample tweet:')
  console.log(`   ID: ${sample.tweetId}`)
  console.log(`   Text: ${sample.fullText.substring(0, 100)}${sample.fullText.length > 100 ? '...' : ''}`)
  console.log(`   URL: ${sample.expandedUrl}`)
}

// Media statistics
if (mediaFiles.length > 0) {
  console.log('\n🖼️  Media Files:')
  console.log(`   Total files: ${mediaFiles.length}`)
  console.log(`   Unique tweet IDs: ${mediaByTweetId.size}`)

  // Count by type
  const images = mediaFiles.filter(f => isImageExtension(getFileExtension(f))).length
  const videos = mediaFiles.filter(f => isVideoExtension(getFileExtension(f))).length
  const other = mediaFiles.length - images - videos

  console.log(`   Images: ${images}`)
  console.log(`   Videos: ${videos}`)
  if (other > 0) {
    console.log(`   Other: ${other}`)
  }

  // Show file extension breakdown
  const extensionCounts = new Map<string, number>()
  for (const file of mediaFiles) {
    const ext = getFileExtension(file)
    extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1)
  }

  console.log('\n   By extension:')
  for (const [ext, count] of Array.from(extensionCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`   .${ext}: ${count}`)
  }

  // Sample filenames
  console.log('\n   Sample filenames:')
  for (let i = 0; i < Math.min(3, mediaFiles.length); i++) {
    console.log(`   - ${mediaFiles[i]}`)
  }
}

// Match analysis
if (mediaByTweetId.size > 0) {
  let tweetsWithMedia = 0
  let tweetsWithoutMedia = 0

  // Debug: Show sample tweet IDs from both sources
  console.log('\n🔍 DETAILED DEBUG - Tweet ID Comparison:')
  console.log('═'.repeat(60))

  // Show first 5 tweet IDs from likes.js
  console.log('\n📝 Sample Tweet IDs from likes.js (first 5):')
  for (let i = 0; i < Math.min(5, likesData.likes.length); i++) {
    const tweetId = likesData.likes[i].tweetId
    console.log(`   [${i}] "${tweetId}" (type: ${typeof tweetId}, length: ${String(tweetId).length})`)
  }

  // Show first 5 tweet IDs from media files
  console.log('\n🖼️  Sample Tweet IDs from media files (first 5):')
  const mediaIds = Array.from(mediaByTweetId.keys())
  for (let i = 0; i < Math.min(5, mediaIds.length); i++) {
    const tweetId = mediaIds[i]
    console.log(`   [${i}] "${tweetId}" (type: ${typeof tweetId}, length: ${tweetId.length})`)
  }

  // Test if ANY media tweet IDs exist in likes
  console.log('\n🔍 Testing overlap:')
  let foundAny = false
  for (let i = 0; i < Math.min(5, mediaIds.length); i++) {
    const mediaTweetId = mediaIds[i]
    const existsInLikes = likesData.likes.some(like => String(like.tweetId) === mediaTweetId)
    console.log(`   Media tweet ${mediaTweetId} exists in likes: ${existsInLikes ? '✅ YES' : '❌ NO'}`)
    if (existsInLikes) foundAny = true
  }

  if (!foundAny) {
    console.log('\n⚠️  WARNING: No overlap found between first 5 media tweet IDs and likes!')
    console.log('   This suggests the tweet IDs are from different sets of tweets.')
    console.log('   Possible reasons:')
    console.log('   1. Media files are from tweets you liked BEFORE the export was created')
    console.log('   2. Media files are from a different Twitter account')
    console.log('   3. Tweet ID extraction from filenames is incorrect')
  }

  console.log('\n' + '═'.repeat(60))

  for (const like of likesData.likes) {
    // Ensure both are strings for comparison
    const likeTweetId = String(like.tweetId)
    if (mediaByTweetId.has(likeTweetId)) {
      tweetsWithMedia++
    } else {
      tweetsWithoutMedia++
    }
  }

  console.log('\n🔗 Media Matching:')
  console.log(`   Tweets with media: ${tweetsWithMedia} (${((tweetsWithMedia / likesData.totalCount) * 100).toFixed(1)}%)`)
  console.log(`   Tweets without media: ${tweetsWithoutMedia} (${((tweetsWithoutMedia / likesData.totalCount) * 100).toFixed(1)}%)`)

  // Show tweets with multiple media files
  const multiMediaTweets = Array.from(mediaByTweetId.entries()).filter(([_, files]) => files.length > 1)
  if (multiMediaTweets.length > 0) {
    console.log(`   Tweets with multiple media: ${multiMediaTweets.length}`)
    console.log('\n   Example multi-media tweets:')
    for (let i = 0; i < Math.min(3, multiMediaTweets.length); i++) {
      const [tweetId, files] = multiMediaTweets[i]
      console.log(`   Tweet ${tweetId}: ${files.length} files`)
      files.forEach(f => console.log(`     - ${f}`))
    }
  }
}

// Next steps
console.log('\n📋 NEXT STEPS')
console.log('═'.repeat(60))
console.log('1. Review the analysis above')
console.log('2. Run: npm run import:rename    # Rename media files')
console.log('3. Run: npm run import:upload    # Upload to Digital Ocean Spaces')
console.log('4. Run: npm run import:db        # Import to database')
console.log('\n✨ Analysis complete!\n')
