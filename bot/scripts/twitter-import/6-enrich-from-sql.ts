#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { batchArray, formatProgress, delay } from './utils/twitter-parser'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Wrap everything in async IIFE to support top-level await
;(async () => {

console.log('📊 Enriching Authors from SQL Data...\n')

// Configuration
const BATCH_SIZE = parseInt(process.env.DB_INSERT_BATCH_SIZE || '50')
const DELAY_MS = parseInt(process.env.DB_INSERT_DELAY_MS || '100')

// Paths
const SQL_FILE = join(process.cwd(), 'data/supabase_data/tweets_rows.sql')

// Check if SQL file exists
if (!existsSync(SQL_FILE)) {
  console.error('❌ Error: tweets_rows.sql not found at:', SQL_FILE)
  console.error('📝 Please place your SQL export file at: data/supabase_data/tweets_rows.sql')
  process.exit(1)
}

console.log('✅ Found tweets_rows.sql file')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not configured')
  console.error('📝 Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
console.log('✅ Connected to Supabase\n')

// Parse SQL file
console.log('📖 Reading SQL file...')
const sqlContent = readFileSync(SQL_FILE, 'utf-8')
console.log(`✅ Loaded ${(sqlContent.length / 1024 / 1024).toFixed(2)}MB of SQL data\n`)

// Extract tweet data from SQL INSERT statements
console.log('🔍 Parsing SQL INSERT statements...')

interface AuthorData {
  tweetId: string
  username: string
  displayName: string | null
  profileImage: string | null
  verified: boolean
  isBlueVerified: boolean
}

const authorMap = new Map<string, AuthorData>()
let parseErrors = 0

// The SQL file format:
// VALUES ('tweetId', 'jsonData...', "text", 'timestamp', 'screen_name', 'profile_image', thumbnail), ...
// We'll split by "), (" and parse each record

// Split into individual records - they're separated by '), ('
const records = sqlContent.split('), (').map(r => r.replace(/^INSERT.*VALUES \('/, '').replace(/'\);?$/, ''))

console.log(`   Found ${records.length} potential records`)

for (const record of records) {
  try {
    // Extract fields using a simpler approach
    // Find the 5th and 6th quoted strings (screen_name and profile_image)
    const quotes = []
    let inQuote = false
    let quoteStart = -1
    let escapeNext = false

    for (let i = 0; i < record.length; i++) {
      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (record[i] === '\\') {
        escapeNext = true
        continue
      }

      if (record[i] === "'") {
        if (inQuote) {
          // Check for doubled single quote (escape)
          if (i + 1 < record.length && record[i + 1] === "'") {
            i++ // Skip the next quote
            continue
          }
          quotes.push(record.substring(quoteStart + 1, i))
          inQuote = false
        } else {
          quoteStart = i
          inQuote = true
        }
      }
    }

    // quotes[0] = tweetId
    // quotes[1] = JSON data
    // quotes[2] = text
    // quotes[3] = timestamp
    // quotes[4] = screen_name
    // quotes[5] = profile_image (if exists)

    if (quotes.length >= 5) {
      const tweetId = quotes[0]
      const username = quotes[4]
      const profileImage = quotes.length >= 6 ? quotes[5] : null

      // Try to extract name and verified from JSON
      let displayName: string | null = null
      let verified = false
      let isBlueVerified = false

      try {
        const jsonStr = quotes[1].replace(/''/g, "'")
        const data = JSON.parse(jsonStr)
        if (data.user) {
          displayName = data.user.name || null
          verified = data.user.verified || false
          isBlueVerified = data.user.is_blue_verified || false
        }
      } catch {
        // JSON parse failed, continue with what we have
      }

      const author: AuthorData = {
        tweetId: tweetId,
        username: username,
        displayName: displayName,
        profileImage: profileImage,
        verified: verified,
        isBlueVerified: isBlueVerified
      }

      authorMap.set(tweetId, author)
    }
  } catch (error) {
    parseErrors++
  }
}

console.log(`✅ Parsed ${authorMap.size} tweets with author data`)
if (parseErrors > 0) {
  console.log(`⚠️  Skipped ${parseErrors} tweets due to parse errors\n`)
} else {
  console.log()
}

if (authorMap.size === 0) {
  console.error('❌ Error: No tweet data found in SQL file')
  process.exit(1)
}

// Fetch content from database to match
console.log('🔍 Fetching imported content from database...')
const { data: contentRecords, error: fetchError } = await supabase
  .from('content')
  .select('id, platform_content_id')
  .eq('platform', 'twitter')

if (fetchError) {
  console.error('❌ Error fetching content:', fetchError)
  process.exit(1)
}

if (!contentRecords || contentRecords.length === 0) {
  console.log('⚠️  No Twitter content found in database')
  process.exit(0)
}

console.log(`✅ Found ${contentRecords.length} Twitter content records\n`)

// Match content with SQL data
console.log('🔗 Matching content with SQL author data...')
const matched: Array<{ contentId: string; tweetId: string; author: AuthorData }> = []
const unmatched: string[] = []

for (const content of contentRecords) {
  const authorData = authorMap.get(content.platform_content_id)

  if (authorData) {
    matched.push({
      contentId: content.id,
      tweetId: content.platform_content_id,
      author: authorData
    })
  } else {
    unmatched.push(content.platform_content_id)
  }
}

console.log(`✅ Matched: ${matched.length} tweets (${((matched.length / contentRecords.length) * 100).toFixed(1)}%)`)
console.log(`⚠️  Unmatched: ${unmatched.length} tweets (${((unmatched.length / contentRecords.length) * 100).toFixed(1)}%)\n`)

if (matched.length === 0) {
  console.log('⚠️  No matches found between SQL data and imported content')
  console.log('   This might mean the SQL file contains different tweets than your likes export')
  process.exit(0)
}

// Build unique creators map
console.log('👥 Building creators list...')
const creatorsMap = new Map<string, any>()

for (const { author } of matched) {
  const creatorId = `twitter:${author.username}`

  if (!creatorsMap.has(creatorId)) {
    creatorsMap.set(creatorId, {
      id: creatorId,
      platform: 'twitter',
      username: author.username,
      display_name: author.displayName || author.username, // Fallback to username if no display name
      avatar_url: author.profileImage,
      verified: author.verified || author.isBlueVerified,
      metadata: {
        source: 'sql_export',
        is_blue_verified: author.isBlueVerified,
        imported_at: new Date().toISOString()
      }
    })
  }
}

console.log(`✅ Found ${creatorsMap.size} unique creators\n`)

// Upsert creators to database
console.log('💾 Upserting creators to database...')
const creatorsArray = Array.from(creatorsMap.values())
const creatorBatches = batchArray(creatorsArray, BATCH_SIZE)

let creatorsInserted = 0

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
      console.warn(`   ⚠️  Batch warning: ${error.message}`)
    } else {
      creatorsInserted += batch.length
      console.log(`   ✅ Upserted ${batch.length} creators`)
    }
  } catch (error: any) {
    console.error(`   ❌ Batch failed: ${error.message}`)
  }

  if (i < creatorBatches.length - 1) {
    await delay(DELAY_MS)
  }
}

console.log(`✅ Creators upserted: ${creatorsInserted}\n`)

// Update content records with author links
console.log('🔗 Linking content to creators...')
const updateBatches = batchArray(matched, BATCH_SIZE)

let contentUpdated = 0
let updateErrors = 0

for (let i = 0; i < updateBatches.length; i++) {
  const batch = updateBatches[i]
  console.log(`   Batch ${i + 1}/${updateBatches.length} (${batch.length} records)`)

  // Update each record individually to ensure proper linking
  for (const { contentId, author } of batch) {
    try {
      const authorId = `twitter:${author.username}`

      const { error } = await supabase
        .from('content')
        .update({
          author_id: authorId,
          author_username: author.username,
          author_name: author.displayName || author.username, // Fallback to username
          author_avatar_url: author.profileImage
        })
        .eq('id', contentId)

      if (error) {
        updateErrors++
      } else {
        contentUpdated++
      }
    } catch (error) {
      updateErrors++
    }
  }

  console.log(`   Progress: ${formatProgress(contentUpdated, matched.length)}`)

  if (i < updateBatches.length - 1) {
    await delay(DELAY_MS)
  }
}

console.log(`✅ Content updated: ${contentUpdated}`)
if (updateErrors > 0) {
  console.log(`❌ Update errors: ${updateErrors}`)
}
console.log()

// Final statistics
console.log('📊 ENRICHMENT RESULTS')
console.log('═'.repeat(60))
console.log(`✅ SQL tweets parsed: ${authorMap.size}`)
console.log(`✅ Content matched: ${matched.length}`)
console.log(`✅ Unique creators: ${creatorsMap.size}`)
console.log(`✅ Creators upserted: ${creatorsInserted}`)
console.log(`✅ Content updated: ${contentUpdated}`)
if (unmatched.length > 0) {
  console.log(`⚠️  Unmatched tweets: ${unmatched.length}`)
}

// Verify enrichment
console.log('\n🔍 Verifying enrichment...')
const { count: enrichedCount, error: countError } = await supabase
  .from('content')
  .select('*', { count: 'exact', head: true })
  .eq('platform', 'twitter')
  .not('author_id', 'is', null)

if (countError) {
  console.error('❌ Error verifying enrichment:', countError)
} else {
  console.log(`✅ Database contains ${enrichedCount} Twitter posts with author data`)
}

// Show sample enriched creators
console.log('\n👥 Sample enriched creators:')
const { data: sampleCreators } = await supabase
  .from('creators')
  .select('username, display_name, verified')
  .eq('platform', 'twitter')
  .limit(10)

if (sampleCreators && sampleCreators.length > 0) {
  sampleCreators.forEach((creator, idx) => {
    const verifiedBadge = creator.verified ? '✓' : ''
    console.log(`   ${idx + 1}. @${creator.username} ${verifiedBadge}`)
    console.log(`      ${creator.display_name}`)
  })
}

console.log('\n✨ Enrichment complete!\n')

})().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
