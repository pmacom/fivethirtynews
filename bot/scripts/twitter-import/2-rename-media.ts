#!/usr/bin/env tsx

import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { extractTweetIdFromFilename, getFileExtension } from './utils/twitter-parser'

console.log('📝 Renaming Twitter Media Files...\n')

// Paths
const MEDIA_DIR = join(process.cwd(), 'data/twitter-export/tweets_media')
const RENAMED_DIR = join(process.cwd(), 'data/twitter-export/tweets_media_renamed')
const MAPPING_FILE = join(process.cwd(), 'data/twitter-export/media-mapping.json')

// Check if media directory exists
if (!existsSync(MEDIA_DIR)) {
  console.error('❌ Error: Media directory not found at:', MEDIA_DIR)
  console.error('📝 Please place your tweets_media folder at: data/twitter-export/tweets_media')
  process.exit(1)
}

console.log('✅ Found media directory')

// Create renamed directory
if (!existsSync(RENAMED_DIR)) {
  mkdirSync(RENAMED_DIR, { recursive: true })
  console.log('✅ Created renamed directory:', RENAMED_DIR)
} else {
  console.log('✅ Renamed directory already exists')
}

// Get all media files
const mediaFiles = readdirSync(MEDIA_DIR).filter(file => {
  const fullPath = join(MEDIA_DIR, file)
  return statSync(fullPath).isFile()
})

console.log(`✅ Found ${mediaFiles.length} media files to process\n`)

// Process files
interface FileMapping {
  original: string
  renamed: string
  tweetId: string
  extension: string
}

const mappings: FileMapping[] = []
const fileCountByTweetId = new Map<string, number>()
let processedCount = 0
let skippedCount = 0
let errorCount = 0

console.log('🔄 Processing files...\n')

for (const file of mediaFiles) {
  try {
    const tweetId = extractTweetIdFromFilename(file)
    const extension = getFileExtension(file)

    if (!tweetId) {
      console.warn(`⚠️  Skipping ${file} - could not extract tweet ID`)
      skippedCount++
      continue
    }

    if (!extension) {
      console.warn(`⚠️  Skipping ${file} - no file extension`)
      skippedCount++
      continue
    }

    // Handle multiple files for same tweet ID
    const count = fileCountByTweetId.get(tweetId) || 0
    fileCountByTweetId.set(tweetId, count + 1)

    const newFilename = count === 0
      ? `${tweetId}.${extension}`
      : `${tweetId}-${count}.${extension}`

    // Copy file (not move, to preserve originals)
    const sourcePath = join(MEDIA_DIR, file)
    const destPath = join(RENAMED_DIR, newFilename)

    copyFileSync(sourcePath, destPath)

    mappings.push({
      original: file,
      renamed: newFilename,
      tweetId,
      extension
    })

    processedCount++

    if (processedCount % 100 === 0) {
      console.log(`   Processed ${processedCount}/${mediaFiles.length} files...`)
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error)
    errorCount++
  }
}

// Save mapping file
const mappingData = {
  timestamp: new Date().toISOString(),
  totalOriginal: mediaFiles.length,
  processed: processedCount,
  skipped: skippedCount,
  errors: errorCount,
  mappings
}

writeFileSync(MAPPING_FILE, JSON.stringify(mappingData, null, 2))

// Generate statistics
console.log('\n📊 RENAMING RESULTS')
console.log('═'.repeat(60))
console.log(`✅ Successfully processed: ${processedCount}`)
console.log(`⚠️  Skipped: ${skippedCount}`)
if (errorCount > 0) {
  console.log(`❌ Errors: ${errorCount}`)
}

// Show duplicate handling
const duplicates = Array.from(fileCountByTweetId.entries()).filter(([_, count]) => count > 1)
if (duplicates.length > 0) {
  console.log(`\n🔄 Tweets with multiple media files: ${duplicates.length}`)
  console.log('   Examples:')
  for (let i = 0; i < Math.min(3, duplicates.length); i++) {
    const [tweetId, count] = duplicates[i]
    console.log(`   Tweet ${tweetId}: ${count} files`)
  }
}

// Show extension breakdown
const extensionCounts = new Map<string, number>()
for (const mapping of mappings) {
  extensionCounts.set(mapping.extension, (extensionCounts.get(mapping.extension) || 0) + 1)
}

console.log('\n📁 Files by extension:')
for (const [ext, count] of Array.from(extensionCounts.entries()).sort((a, b) => b[1] - a[1])) {
  console.log(`   .${ext}: ${count}`)
}

console.log(`\n💾 Mapping saved to: ${MAPPING_FILE}`)
console.log(`📂 Renamed files in: ${RENAMED_DIR}`)

// Next steps
console.log('\n📋 NEXT STEPS')
console.log('═'.repeat(60))
console.log('1. Review renamed files in:', RENAMED_DIR)
console.log('2. Configure .env with Digital Ocean Spaces credentials')
console.log('3. Run: npm run import:upload    # Upload to Digital Ocean Spaces')
console.log('\n✨ Renaming complete!\n')
