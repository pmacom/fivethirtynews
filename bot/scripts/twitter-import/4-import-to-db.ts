#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { parseTwitterLikesFile, batchArray, formatProgress, delay, extractUsernameFromUrl } from './utils/twitter-parser'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Wrap everything in async IIFE to support top-level await
;(async () => {

console.log('💾 Importing Twitter Likes to Database...\n')

// Configuration
const BATCH_SIZE = parseInt(process.env.DB_INSERT_BATCH_SIZE || '50')
const DELAY_MS = parseInt(process.env.DB_INSERT_DELAY_MS || '100')

// Paths
const LIKES_FILE = join(process.cwd(), 'data/twitter-export/likes.js')
const MANIFEST_FILE = join(process.cwd(), 'data/twitter-export/upload-manifest.json')
const REPORT_FILE = join(process.cwd(), 'data/twitter-export/import-report.json')

// Check if likes file exists
if (!existsSync(LIKES_FILE)) {
  console.error('❌ Error: likes.js not found at:', LIKES_FILE)
  console.error('📝 Please place your Twitter likes export file at: data/twitter-export/likes.js')
  process.exit(1)
}

console.log('✅ Found likes.js file')

// Load upload manifest (optional)
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
if (existsSync(MANIFEST_FILE)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'))
    const totalTweets = Object.keys(manifest).length
    const totalFiles = Object.values(manifest).reduce((sum, { files }) => sum + files.length, 0)
    console.log(`✅ Loaded upload manifest: ${totalTweets} tweets, ${totalFiles} media files`)
  } catch (error) {
    console.warn('⚠️  Could not load upload manifest, continuing without media URLs')
  }
} else {
  console.log('⚠️  Upload manifest not found, tweets will be imported without media')
  console.log('   Run: npm run import:upload to upload media first\n')
}

// Parse likes data
let likesData
try {
  likesData = parseTwitterLikesFile(LIKES_FILE)
  console.log(`✅ Parsed ${likesData.totalCount} liked tweets\n`)
} catch (error) {
  console.error('❌ Error parsing likes.js:', error)
  process.exit(1)
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not configured')
  console.error('📝 Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
console.log('✅ Connected to Supabase')
console.log(`   URL: ${supabaseUrl}\n`)

// Prepare data for insertion
interface ContentRecord {
  id: string
  platform: string
  platform_content_id: string
  url: string
  content: string
  description: string
  thumbnail_url: string | null
  tags: string[]
  metadata: any
  media_assets: any[] | null
  user_id: string
  author_id: string | null
  author_username: string | null
  author_name: string | null
}

interface CreatorRecord {
  id: string
  platform: string
  username: string
  display_name: string | null
  metadata: any
}

// Prepare creators map to batch upsert
const creatorsMap = new Map<string, CreatorRecord>()

const records: ContentRecord[] = likesData.likes.map(like => {
  const mediaInfo = manifest[like.tweetId]

  // Build media_assets array from all files
  let mediaAssets: any[] | null = null
  let thumbnailUrl: string | null = null

  if (mediaInfo && mediaInfo.files && mediaInfo.files.length > 0) {
    // Use first file as thumbnail
    thumbnailUrl = mediaInfo.files[0].url

    // Build media_assets array with all files
    mediaAssets = mediaInfo.files.map(file => {
      const isVideo = ['mp4', 'mov', 'webm', 'avi'].includes(file.extension.toLowerCase())
      return {
        type: isVideo ? 'video' : 'image',
        url: file.url,
        index: file.index,
        extension: file.extension,
        duration: isVideo ? null : undefined // Videos can have duration added later
      }
    })
  }

  // Handle missing fullText
  const fullText = like.fullText || ''

  // Extract author username from URL
  const username = extractUsernameFromUrl(like.expandedUrl)
  const authorId = username ? `twitter:${username}` : null

  // Add to creators map if we have a username
  if (username && !creatorsMap.has(authorId!)) {
    creatorsMap.set(authorId!, {
      id: authorId!,
      platform: 'twitter',
      username: username,
      display_name: null, // Will be enriched later via API
      metadata: {
        source: 'twitter_export_url',
        imported_at: new Date().toISOString()
      }
    })
  }

  return {
    id: `twitter:${like.tweetId}`,
    platform: 'twitter',
    platform_content_id: like.tweetId,
    url: like.expandedUrl,
    content: fullText,
    description: fullText.substring(0, 500), // Truncate for description
    thumbnail_url: thumbnailUrl,
    tags: ['liked-tweets'],
    metadata: {
      source: 'twitter_export',
      original_url: like.expandedUrl,
      has_media: !!mediaInfo,
      media_count: mediaInfo?.files?.length || 0
    },
    media_assets: mediaAssets,
    user_id: 'twitter-import',
    author_id: authorId,
    author_username: username,
    author_name: username // Use username as display name for now
  }
})

console.log(`📦 Prepared ${records.length} records for import`)
console.log(`📊 Records with media: ${records.filter(r => r.thumbnail_url).length}`)
console.log(`📊 Records without media: ${records.filter(r => !r.thumbnail_url).length}`)
console.log(`👤 Unique creators found: ${creatorsMap.size}`)

const multiMediaRecords = records.filter(r => r.media_assets && r.media_assets.length > 1)
if (multiMediaRecords.length > 0) {
  console.log(`📸 Records with multiple media files: ${multiMediaRecords.length}`)
  const maxFiles = Math.max(...multiMediaRecords.map(r => r.media_assets?.length || 0))
  console.log(`📸 Max files in single tweet: ${maxFiles}`)
}

console.log(`⚙️  Batch size: ${BATCH_SIZE} records`)
console.log(`⏱️  Delay between batches: ${DELAY_MS}ms\n`)

// First, upsert all creators
console.log('👥 Upserting creators to database...')
const creatorsArray = Array.from(creatorsMap.values())
const creatorBatches = batchArray(creatorsArray, BATCH_SIZE)

for (let i = 0; i < creatorBatches.length; i++) {
  const batch = creatorBatches[i]
  console.log(`   Batch ${i + 1}/${creatorBatches.length} (${batch.length} creators)`)

  try {
    const { error } = await supabase
      .from('creators')
      .upsert(batch, {
        onConflict: 'platform,username',
        ignoreDuplicates: false
      })

    if (error) {
      console.warn(`   ⚠️  Creator batch warning: ${error.message}`)
    } else {
      console.log(`   ✅ Upserted ${batch.length} creators`)
    }
  } catch (error: any) {
    console.error(`   ❌ Creator batch failed: ${error.message}`)
  }

  if (i < creatorBatches.length - 1) {
    await delay(DELAY_MS)
  }
}

console.log(`✅ Creators upserted: ${creatorsMap.size}\n`)

// Batch the records
const batches = batchArray(records, BATCH_SIZE)
let insertedCount = 0
let skippedCount = 0
let errorCount = 0
const errors: Array<{ tweetId: string; error: string }> = []

console.log(`🚀 Processing ${batches.length} content batches...\n`)

// Process batches
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  const batch = batches[batchIndex]
  const batchNum = batchIndex + 1

  console.log(`💾 Batch ${batchNum}/${batches.length} (${batch.length} records)`)

  try {
    const { data, error } = await supabase
      .from('content')
      .upsert(batch, {
        onConflict: 'platform,platform_content_id',
        ignoreDuplicates: false
      })

    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`   ⏭️  Batch contains duplicates, skipping...`)
        skippedCount += batch.length
      } else {
        throw error
      }
    } else {
      insertedCount += batch.length
      console.log(`   ✅ Inserted ${batch.length} records`)
    }
  } catch (error: any) {
    console.error(`   ❌ Batch failed: ${error.message}`)

    // Try individual inserts for this batch
    console.log(`   🔄 Retrying batch records individually...`)
    for (const record of batch) {
      try {
        const { error: individualError } = await supabase
          .from('content')
          .upsert([record], {
            onConflict: 'platform,platform_content_id',
            ignoreDuplicates: true
          })

        if (individualError) {
          if (individualError.code === '23505' || individualError.message.includes('duplicate')) {
            skippedCount++
          } else {
            errorCount++
            errors.push({ tweetId: record.platform_content_id, error: individualError.message })
          }
        } else {
          insertedCount++
        }
      } catch (individualError: any) {
        errorCount++
        errors.push({ tweetId: record.platform_content_id, error: individualError.message })
      }
    }
  }

  // Show progress
  const totalProcessed = insertedCount + skippedCount + errorCount
  console.log(`   Progress: ${formatProgress(totalProcessed, records.length)}\n`)

  // Delay before next batch (except for last batch)
  if (batchIndex < batches.length - 1) {
    await delay(DELAY_MS)
  }
}

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  totalLikes: likesData.totalCount,
  inserted: insertedCount,
  skipped: skippedCount,
  errors: errorCount,
  withMedia: records.filter(r => r.thumbnail_url).length,
  withoutMedia: records.filter(r => !r.thumbnail_url).length,
  errorDetails: errors
}

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))

// Final statistics
console.log('📊 IMPORT RESULTS')
console.log('═'.repeat(60))
console.log(`✅ Successfully inserted: ${insertedCount}`)
console.log(`⏭️  Skipped (duplicates): ${skippedCount}`)
if (errorCount > 0) {
  console.log(`❌ Errors: ${errorCount}`)
  console.log('\n❌ Failed imports (first 10):')
  errors.slice(0, 10).forEach(({ tweetId, error }) => {
    console.log(`   Tweet ${tweetId}: ${error}`)
  })
  if (errors.length > 10) {
    console.log(`   ... and ${errors.length - 10} more (see ${REPORT_FILE})`)
  }
}

console.log(`\n💾 Report saved to: ${REPORT_FILE}`)

// Verify database
console.log('\n🔍 Verifying import...')
const { count, error: countError } = await supabase
  .from('content')
  .select('*', { count: 'exact', head: true })
  .eq('platform', 'twitter')
  .contains('tags', ['liked-tweets'])

if (countError) {
  console.error('❌ Error verifying import:', countError)
} else {
  console.log(`✅ Database contains ${count} Twitter liked tweets`)
}

// Next steps
console.log('\n📋 NEXT STEPS')
console.log('═'.repeat(60))
console.log('1. Visit http://localhost:3000/embed to view your imported tweets')
console.log('2. Run: npm run db:counts    # Verify database counts')
console.log('3. Filter by tag "liked-tweets" to see only imported content')
console.log('\n✨ Import complete!\n')

})().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
