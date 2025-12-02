#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { batchArray, formatProgress, delay } from './utils/twitter-parser'
import TwitterAPIClient from './utils/twitter-api-client'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Wrap everything in async IIFE to support top-level await
;(async () => {

console.log('👥 Enriching Author Data from Twitter API...\n')

// Configuration
const BATCH_SIZE = parseInt(process.env.TWITTER_API_BATCH_SIZE || '100') // Twitter allows max 100 per request
const DELAY_MS = parseInt(process.env.TWITTER_API_DELAY_MS || '1000') // 1 second between batches to respect rate limits
const PROGRESS_FILE = join(process.cwd(), 'data/twitter-export/enrichment-progress.json')

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

// Initialize Twitter API client
const bearerToken = process.env.TWITTER_API_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN

if (!bearerToken) {
  console.error('❌ Error: Twitter API Bearer Token not configured')
  console.error('📝 Please set TWITTER_API_BEARER_TOKEN or TWITTER_BEARER_TOKEN in .env')
  console.error('\nHow to get a Bearer Token:')
  console.error('1. Go to https://developer.twitter.com/en/portal/dashboard')
  console.error('2. Create an app (Free tier is sufficient)')
  console.error('3. Generate a Bearer Token under "Keys and tokens"')
  console.error('4. Add to .env: TWITTER_BEARER_TOKEN=your_token_here\n')
  process.exit(1)
}

const twitterClient = new TwitterAPIClient(bearerToken)
console.log('✅ Connected to Twitter API\n')

// Load progress if exists (for resume capability)
interface Progress {
  processedTweetIds: string[]
  enrichedCreators: string[]
  lastProcessedIndex: number
}

let progress: Progress = {
  processedTweetIds: [],
  enrichedCreators: [],
  lastProcessedIndex: 0
}

if (existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    console.log(`📋 Loaded progress: ${progress.processedTweetIds.length} tweets processed, ${progress.enrichedCreators.length} creators enriched`)
  } catch (error) {
    console.warn('⚠️  Could not load progress file, starting fresh')
  }
}

// Fetch all content records that need enrichment
console.log('🔍 Fetching content records from database...')
const { data: contentRecords, error: fetchError } = await supabase
  .from('content')
  .select('platform_content_id, author_id, author_name')
  .eq('platform', 'twitter')
  .order('created_at', { ascending: true })

if (fetchError) {
  console.error('❌ Error fetching content:', fetchError)
  process.exit(1)
}

if (!contentRecords || contentRecords.length === 0) {
  console.log('✅ No content records found to enrich')
  process.exit(0)
}

console.log(`✅ Found ${contentRecords.length} Twitter content records\n`)

// Filter out already processed tweets
const tweetsToProcess = contentRecords.filter(
  record => !progress.processedTweetIds.includes(record.platform_content_id)
)

if (tweetsToProcess.length === 0) {
  console.log('✅ All tweets have already been processed!')
  console.log(`📄 Progress file: ${PROGRESS_FILE}\n`)
  process.exit(0)
}

console.log(`🚀 Processing ${tweetsToProcess.length} tweets (${contentRecords.length - tweetsToProcess.length} already processed)`)
console.log(`⚙️  Batch size: ${BATCH_SIZE} tweets per API call`)
console.log(`⏱️  Delay between batches: ${DELAY_MS}ms\n`)

// Batch the tweet IDs
const tweetIds = tweetsToProcess.map(r => r.platform_content_id)
const batches = batchArray(tweetIds, BATCH_SIZE)

let apiCallCount = 0
let enrichedCount = 0
let errorCount = 0
const errors: Array<{ tweetId: string; error: string }> = []
const creatorsCache = new Map<string, any>() // Cache creators to avoid duplicate upserts

console.log(`📦 Processing ${batches.length} API batches...\n`)

// Process batches
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  const batch = batches[batchIndex]
  const batchNum = batchIndex + 1

  console.log(`🌐 API Batch ${batchNum}/${batches.length} (${batch.length} tweets)`)

  try {
    // Fetch tweets and author data from Twitter API
    const response = await twitterClient.fetchTweetsWithRetry(batch)
    apiCallCount++

    // Handle errors from API
    if (response.errors && response.errors.length > 0) {
      console.log(`   ⚠️  API returned errors for ${response.errors.length} tweets`)
      for (const error of response.errors) {
        errors.push({
          tweetId: error.resource_id,
          error: `${error.title}: ${error.detail}`
        })

        // Store error in content metadata
        await supabase
          .from('content')
          .update({
            metadata: {
              api_error: {
                code: error.type,
                message: error.detail,
                checked_at: new Date().toISOString()
              }
            }
          })
          .eq('platform', 'twitter')
          .eq('platform_content_id', error.resource_id)
      }
    }

    // Process successful tweets
    if (response.data && response.data.length > 0) {
      console.log(`   ✅ Received ${response.data.length} tweets from API`)

      // Extract and store creators
      if (response.includes?.users && response.includes.users.length > 0) {
        console.log(`   👥 Processing ${response.includes.users.length} unique creators`)

        for (const user of response.includes.users) {
          const creatorId = `twitter:${user.username}`

          // Skip if already in cache
          if (creatorsCache.has(creatorId)) {
            continue
          }

          // Prepare creator record
          const creatorRecord = {
            id: creatorId,
            platform: 'twitter',
            username: user.username,
            display_name: user.name,
            bio: user.description || null,
            avatar_url: user.profile_image_url || null,
            verified: user.verified || false,
            follower_count: user.public_metrics?.followers_count || null,
            metadata: {
              source: 'twitter_api_v2',
              twitter_user_id: user.id,
              following_count: user.public_metrics?.following_count || null,
              tweet_count: user.public_metrics?.tweet_count || null,
              api_fetched_at: new Date().toISOString()
            }
          }

          // Upsert creator
          const { error: creatorError } = await supabase
            .from('creators')
            .upsert([creatorRecord], {
              onConflict: 'platform,username',
              ignoreDuplicates: false
            })

          if (creatorError) {
            console.warn(`   ⚠️  Failed to upsert creator ${user.username}: ${creatorError.message}`)
          } else {
            creatorsCache.set(creatorId, creatorRecord)
            enrichedCount++
          }
        }

        // Update content records with author links
        for (const tweet of response.data) {
          const user = response.includes.users.find(u => u.id === tweet.author_id)
          if (user) {
            const authorId = `twitter:${user.username}`

            await supabase
              .from('content')
              .update({
                author_id: authorId,
                author_username: user.username,
                author_name: user.name,
                author_url: `https://twitter.com/${user.username}`,
                author_avatar_url: user.profile_image_url || null
              })
              .eq('platform', 'twitter')
              .eq('platform_content_id', tweet.id)
          }

          // Mark as processed
          progress.processedTweetIds.push(tweet.id)
        }
      }
    }

    // Save progress
    progress.enrichedCreators = Array.from(creatorsCache.keys())
    progress.lastProcessedIndex = (batchIndex + 1) * BATCH_SIZE
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))

    // Show progress
    const totalProcessed = progress.processedTweetIds.length
    console.log(`   Progress: ${formatProgress(totalProcessed, tweetIds.length)}`)
    console.log(`   Creators enriched: ${enrichedCount}`)
    console.log(`   API calls made: ${apiCallCount}\n`)

    // Delay before next batch (except for last batch)
    if (batchIndex < batches.length - 1) {
      await delay(DELAY_MS)
    }

  } catch (error: any) {
    console.error(`   ❌ Batch failed: ${error.message}`)
    errorCount++

    // Save progress even on error
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))

    // If rate limited, wait longer
    if (error.message.includes('Rate limit')) {
      console.log('   ⏸️  Waiting 60 seconds due to rate limit...')
      await delay(60000)
    }
  }
}

// Final statistics
console.log('\n📊 ENRICHMENT RESULTS')
console.log('═'.repeat(60))
console.log(`✅ Tweets processed: ${progress.processedTweetIds.length}`)
console.log(`✅ Creators enriched: ${enrichedCount}`)
console.log(`🌐 API calls made: ${apiCallCount}`)

if (errorCount > 0 || errors.length > 0) {
  console.log(`❌ Errors: ${errors.length}`)
  if (errors.length > 0) {
    console.log('\n❌ Failed tweets (first 10):')
    errors.slice(0, 10).forEach(({ tweetId, error }) => {
      console.log(`   Tweet ${tweetId}: ${error}`)
    })
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`)
    }
  }
}

console.log(`\n💾 Progress saved to: ${PROGRESS_FILE}`)

// Verify enrichment
console.log('\n🔍 Verifying enrichment...')
const { count: enrichedCount2, error: countError } = await supabase
  .from('content')
  .select('*', { count: 'exact', head: true })
  .eq('platform', 'twitter')
  .not('author_id', 'is', null)

if (countError) {
  console.error('❌ Error verifying enrichment:', countError)
} else {
  console.log(`✅ Database contains ${enrichedCount2} Twitter posts with author data`)
}

// Show sample creators
console.log('\n👥 Sample enriched creators:')
const { data: sampleCreators } = await supabase
  .from('creators')
  .select('username, display_name, follower_count, verified')
  .eq('platform', 'twitter')
  .order('follower_count', { ascending: false })
  .limit(5)

if (sampleCreators && sampleCreators.length > 0) {
  sampleCreators.forEach((creator, idx) => {
    const verifiedBadge = creator.verified ? '✓' : ''
    const followers = creator.follower_count ? creator.follower_count.toLocaleString() : 'N/A'
    console.log(`   ${idx + 1}. @${creator.username} ${verifiedBadge}`)
    console.log(`      ${creator.display_name} (${followers} followers)`)
  })
}

console.log('\n✨ Enrichment complete!\n')

})().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
