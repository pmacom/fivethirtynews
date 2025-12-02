#!/usr/bin/env tsx

import * as dotenv from 'dotenv'

dotenv.config()

const bearerToken = process.env.TWITTER_API_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN

if (!bearerToken) {
  console.error('❌ No bearer token found')
  process.exit(1)
}

console.log('🔑 Testing Twitter API with bearer token...')
console.log(`Token (first 20 chars): ${bearerToken.substring(0, 20)}...\n`)

// Test with a single known tweet ID
const testTweetId = '1977482213223764010' // First tweet from your export

const url = `https://api.twitter.com/2/tweets?ids=${testTweetId}&tweet.fields=author_id,created_at&expansions=author_id&user.fields=id,username,name,profile_image_url,description,verified,public_metrics`

console.log(`📡 Fetching tweet ${testTweetId}...\n`)

fetch(url, {
  headers: {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(async response => {
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))

    const text = await response.text()
    console.log(`\nResponse body:`)
    console.log(text)

    if (response.ok) {
      console.log('\n✅ API call successful!')
      const data = JSON.parse(text)
      if (data.data && data.data.length > 0) {
        console.log(`\n📝 Tweet text: ${data.data[0].text.substring(0, 100)}...`)
      }
      if (data.includes?.users && data.includes.users.length > 0) {
        const user = data.includes.users[0]
        console.log(`👤 Author: @${user.username} (${user.name})`)
      }
    } else {
      console.log('\n❌ API call failed!')
    }
  })
  .catch(error => {
    console.error('❌ Error:', error)
  })
