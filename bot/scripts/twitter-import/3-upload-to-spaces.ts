#!/usr/bin/env tsx

import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import SpacesClient from './utils/spaces-client'
import { getFileExtension, batchArray, formatProgress, delay } from './utils/twitter-parser'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Wrap everything in async IIFE to support top-level await
;(async () => {

console.log('☁️  Uploading Media to Digital Ocean Spaces...\n')

// Configuration
const BATCH_SIZE = parseInt(process.env.UPLOAD_BATCH_SIZE || '10')
const DELAY_MS = parseInt(process.env.UPLOAD_DELAY_MS || '500')

// Paths
const RENAMED_DIR = join(process.cwd(), 'data/twitter-export/tweets_media_renamed')
const MANIFEST_FILE = join(process.cwd(), 'data/twitter-export/upload-manifest.json')

// Check if renamed directory exists
if (!existsSync(RENAMED_DIR)) {
  console.error('❌ Error: Renamed media directory not found at:', RENAMED_DIR)
  console.error('📝 Please run: npm run import:rename')
  process.exit(1)
}

console.log('✅ Found renamed media directory')

// Initialize Spaces client
let spacesClient: SpacesClient
try {
  spacesClient = new SpacesClient()
  console.log('✅ Connected to Digital Ocean Spaces')
  console.log(`   Bucket: ${process.env.DO_SPACES_BUCKET}`)
  console.log(`   Region: ${process.env.DO_SPACES_REGION}`)
  console.log(`   Base path: ${process.env.DO_SPACES_BASE_PATH}/twitter-likes\n`)
} catch (error) {
  console.error('❌ Error connecting to Digital Ocean Spaces:', error)
  console.error('📝 Please configure .env with your DO Spaces credentials')
  process.exit(1)
}

// Get all renamed files
const mediaFiles = readdirSync(RENAMED_DIR).filter(file => {
  const fullPath = join(RENAMED_DIR, file)
  return statSync(fullPath).isFile()
})

console.log(`✅ Found ${mediaFiles.length} files to upload`)
console.log(`⚙️  Batch size: ${BATCH_SIZE} files`)
console.log(`⏱️  Delay between batches: ${DELAY_MS}ms\n`)

// Load existing manifest if it exists (for resume capability)
interface MediaFile {
  url: string
  extension: string
  index: number
  uploadedAt: string
}

interface UploadManifest {
  [tweetId: string]: {
    files: MediaFile[]
  }
}

let manifest: UploadManifest = {}
let uploadedFilesSet = new Set<string>()

if (existsSync(MANIFEST_FILE)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'))
    // Build set of already uploaded filenames
    Object.values(manifest).forEach(({ files }) => {
      files.forEach(file => {
        uploadedFilesSet.add(`${file.index === 0 ? '' : `-${file.index}`}.${file.extension}`)
      })
    })
    const totalUploaded = Object.values(manifest).reduce((sum, { files }) => sum + files.length, 0)
    console.log(`📋 Loaded existing manifest: ${Object.keys(manifest).length} tweets, ${totalUploaded} files uploaded`)
    console.log('   Will skip already uploaded files\n')
  } catch (error) {
    console.warn('⚠️  Could not load existing manifest, starting fresh')
  }
}

// Prepare upload list (filter out already uploaded individual files)
const filesToUpload = mediaFiles.filter(file => {
  const fileWithoutExt = file.replace(/\.[^.]+$/, '')
  const parts = fileWithoutExt.split('-')

  // Check if this specific file was already uploaded
  // Format: tweetId.ext or tweetId-N.ext
  return !uploadedFilesSet.has(file.substring(file.lastIndexOf('-')))
})

if (filesToUpload.length === 0) {
  console.log('✨ All files already uploaded!')
  console.log(`📄 Manifest: ${MANIFEST_FILE}\n`)
  process.exit(0)
}

console.log(`🚀 Uploading ${filesToUpload.length} new files (${mediaFiles.length - filesToUpload.length} already uploaded)`)

// Batch the files
const batches = batchArray(filesToUpload, BATCH_SIZE)
let uploadedCount = 0
let errorCount = 0
const errors: Array<{ file: string; error: string }> = []

console.log(`📦 Processing ${batches.length} batches...\n`)

// Process batches
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  const batch = batches[batchIndex]
  const batchNum = batchIndex + 1

  console.log(`📤 Batch ${batchNum}/${batches.length} (${batch.length} files)`)

  // Upload batch in parallel
  const uploadPromises = batch.map(async (file) => {
    try {
      const localPath = join(RENAMED_DIR, file)
      const fileWithoutExt = file.replace(/\.[^.]+$/, '')
      const extension = getFileExtension(file)

      // Extract tweetId and index from filename
      // Format: tweetId.ext or tweetId-1.ext
      const dashIndex = fileWithoutExt.lastIndexOf('-')
      const tweetId = dashIndex > 0 && /^\d+$/.test(fileWithoutExt.substring(dashIndex + 1))
        ? fileWithoutExt.substring(0, dashIndex)
        : fileWithoutExt

      const indexStr = dashIndex > 0 && /^\d+$/.test(fileWithoutExt.substring(dashIndex + 1))
        ? fileWithoutExt.substring(dashIndex + 1)
        : '0'
      const index = parseInt(indexStr)

      // Create unique remote path for this file
      const remotePath = index === 0
        ? spacesClient.getRemotePath(tweetId, extension)
        : `${process.env.DO_SPACES_BASE_PATH || 'content'}/twitter-likes/${tweetId}-${index}.${extension}`

      // Check if already exists (double check)
      const exists = await spacesClient.fileExists(remotePath)
      if (exists) {
        const url = `https://${process.env.DO_SPACES_CDN || '530society.nyc3.cdn.digitaloceanspaces.com'}/${remotePath}`

        // Initialize manifest entry if needed
        if (!manifest[tweetId]) {
          manifest[tweetId] = { files: [] }
        }

        // Add file to manifest if not already there
        if (!manifest[tweetId].files.some(f => f.index === index)) {
          manifest[tweetId].files.push({
            url,
            extension,
            index,
            uploadedAt: new Date().toISOString()
          })
        }

        return { success: true, file, tweetId, skipped: true }
      }

      // Upload
      const url = await spacesClient.uploadFile(localPath, remotePath, 'public-read')

      // Initialize manifest entry if needed
      if (!manifest[tweetId]) {
        manifest[tweetId] = { files: [] }
      }

      // Add file to manifest
      manifest[tweetId].files.push({
        url,
        extension,
        index,
        uploadedAt: new Date().toISOString()
      })

      // Sort files by index
      manifest[tweetId].files.sort((a, b) => a.index - b.index)

      return { success: true, file, tweetId, url }
    } catch (error: any) {
      return { success: false, file, error: error.message }
    }
  })

  const results = await Promise.all(uploadPromises)

  // Process results
  for (const result of results) {
    if (result.success) {
      uploadedCount++
      if ('skipped' in result) {
        console.log(`   ⏭️  ${result.file} (already exists)`)
      } else {
        console.log(`   ✅ ${result.file}`)
      }
    } else {
      errorCount++
      errors.push({ file: result.file, error: result.error })
      console.log(`   ❌ ${result.file}: ${result.error}`)
    }
  }

  // Save manifest after each batch
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2))

  // Show progress
  const totalProcessed = uploadedCount + errorCount
  console.log(`   Progress: ${formatProgress(totalProcessed, filesToUpload.length)}\n`)

  // Delay before next batch (except for last batch)
  if (batchIndex < batches.length - 1) {
    await delay(DELAY_MS)
  }
}

// Final statistics
console.log('📊 UPLOAD RESULTS')
console.log('═'.repeat(60))
console.log(`✅ Successfully uploaded: ${uploadedCount}`)
if (errorCount > 0) {
  console.log(`❌ Errors: ${errorCount}`)
  console.log('\n❌ Failed uploads:')
  errors.forEach(({ file, error }) => {
    console.log(`   ${file}: ${error}`)
  })
}

console.log(`\n💾 Manifest saved to: ${MANIFEST_FILE}`)
const totalTweets = Object.keys(manifest).length
const totalFiles = Object.values(manifest).reduce((sum, { files }) => sum + files.length, 0)
console.log(`📁 Total tweets in manifest: ${totalTweets}`)
console.log(`📁 Total files in manifest: ${totalFiles}`)

// Show multi-file tweets
const multiFileTweets = Object.entries(manifest).filter(([_, { files }]) => files.length > 1)
if (multiFileTweets.length > 0) {
  console.log(`📸 Tweets with multiple files: ${multiFileTweets.length}`)
}

// Show CDN URL example
const firstTweetId = Object.keys(manifest)[0]
if (firstTweetId && manifest[firstTweetId].files.length > 0) {
  console.log(`\n🌐 Example CDN URLs:`)
  manifest[firstTweetId].files.forEach((file, idx) => {
    console.log(`   [${idx}] ${file.url}`)
  })
}

// Next steps
console.log('\n📋 NEXT STEPS')
console.log('═'.repeat(60))
console.log('1. Verify uploads in Digital Ocean Spaces dashboard')
console.log('2. Run: npm run import:db    # Import to database')
console.log('\n✨ Upload complete!\n')

})().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
