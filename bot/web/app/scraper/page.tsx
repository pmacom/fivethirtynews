'use client'

import { useEffect, useState } from 'react'
import { Tweet } from 'react-tweet'

interface TweetData {
  id: string
  platform_content_id: string
  url: string
  content: string
}

interface AuthorData {
  username: string
  displayName: string
  avatarUrl: string | null
  verified: boolean
}

export default function ScraperPage() {
  const [tweets, setTweets] = useState<TweetData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  })
  const [autoMode, setAutoMode] = useState(false)
  const [status, setStatus] = useState('Idle')

  // Load tweets without authors
  useEffect(() => {
    fetchTweets()
  }, [])

  const fetchTweets = async () => {
    try {
      setStatus('Fetching tweets without authors...')
      const response = await fetch('/api/content/missing-authors?limit=1000')
      const data = await response.json()

      if (data.tweets) {
        setTweets(data.tweets)
        setStats(prev => ({ ...prev, total: data.tweets.length }))
        setStatus(`Loaded ${data.tweets.length} tweets to process`)
      }
    } catch (error) {
      console.error('Error fetching tweets:', error)
      setStatus('Error fetching tweets')
    }
  }

  // Extract author data from react-tweet component
  const extractAuthorFromEmbed = (): AuthorData | null => {
    try {
      // Debug: Log all elements to see what's available
      console.log('=== Starting extraction ===')

      // react-tweet uses article element with specific classes
      const tweetArticle = document.querySelector('article[data-theme]') ||
                          document.querySelector('article') ||
                          document.querySelector('[class*="tweet"]')

      console.log('Tweet article found:', !!tweetArticle)

      if (!tweetArticle) {
        console.log('No tweet article found')
        console.log('All articles:', document.querySelectorAll('article'))
        console.log('All divs with tweet:', document.querySelectorAll('[class*="tweet"]'))
        return null
      }

      // Look for author link - react-tweet has links to author profile
      const allLinks = tweetArticle.querySelectorAll('a')
      console.log('Found links:', allLinks.length)

      let authorLink: HTMLAnchorElement | null = null
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || ''
        console.log('Link href:', href)
        if (href.includes('twitter.com/') || href.includes('x.com/')) {
          if (!href.includes('/status/') && !href.includes('/i/')) {
            authorLink = link
            console.log('Found author link:', href)
          }
        }
      })

      if (!authorLink) {
        console.log('No author link found in links')
        return null
      }

      const href = authorLink.getAttribute('href') || ''
      const pathParts = href.split('/').filter(Boolean)
      const username = pathParts[pathParts.length - 1]

      console.log('Extracted username:', username)

      // Find display name - usually in the first text content near the link
      const displayNameElement = tweetArticle.querySelector('[class*="name"]') ||
                                  tweetArticle.querySelector('div > span') ||
                                  authorLink.closest('div')?.querySelector('span')

      const displayName = displayNameElement?.textContent?.trim() || username

      console.log('Display name:', displayName)

      // Find avatar image
      const avatarImg = tweetArticle.querySelector('img[src*="profile"]') ||
                        tweetArticle.querySelector('img[alt]')
      const avatarUrl = avatarImg?.getAttribute('src') || null

      console.log('Avatar URL:', avatarUrl)

      // Check for verified badge
      const verified = !!tweetArticle.querySelector('svg[aria-label*="Verified"]') ||
                       !!tweetArticle.querySelector('[title*="Verified"]')

      console.log('Verified:', verified)

      if (username) {
        const result = {
          username: username.replace('@', '').trim(),
          displayName: displayName.replace('@', '').trim(),
          avatarUrl,
          verified
        }
        console.log('=== Extraction successful ===', result)
        return result
      }

      console.log('No username found')
      return null
    } catch (error) {
      console.error('Error extracting author data:', error)
      return null
    }
  }

  // Process current tweet
  const processCurrentTweet = async () => {
    if (currentIndex >= tweets.length) {
      setStatus('All tweets processed!')
      setAutoMode(false)
      return
    }

    const tweet = tweets[currentIndex]
    setProcessing(true)
    setStatus(`Processing tweet ${currentIndex + 1} of ${tweets.length}...`)

    try {
      // Wait for embed to load (give it 3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Extract author data
      const authorData = extractAuthorFromEmbed()

      if (authorData) {
        // Update database
        const response = await fetch('/api/content/update-author', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: tweet.id,
            authorData
          })
        })

        const result = await response.json()

        if (result.success) {
          setStats(prev => ({
            ...prev,
            processed: prev.processed + 1,
            successful: prev.successful + 1
          }))
          setStatus(`✅ Saved: @${authorData.username}`)
        } else {
          throw new Error(result.error || 'Update failed')
        }
      } else {
        // Could not extract author data
        setStats(prev => ({
          ...prev,
          processed: prev.processed + 1,
          failed: prev.failed + 1
        }))
        setStatus('⚠️ Could not extract author data')
      }

      // Move to next tweet
      if (autoMode) {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1)
        }, 1000)
      }
    } catch (error: any) {
      console.error('Error processing tweet:', error)
      setStats(prev => ({
        ...prev,
        processed: prev.processed + 1,
        failed: prev.failed + 1
      }))
      setStatus(`❌ Error: ${error.message}`)

      if (autoMode) {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1)
        }, 2000)
      }
    } finally {
      setProcessing(false)
    }
  }

  const currentTweet = tweets[currentIndex]

  // Auto-process when index changes in auto mode
  useEffect(() => {
    if (autoMode && currentIndex < tweets.length && !processing) {
      processCurrentTweet()
    }
  }, [currentIndex, autoMode])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Twitter Author Scraper</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Automatically extracts author data from Twitter embeds and updates the database
        </p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.processed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.successful}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status:</div>
          <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{status}</div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800 mb-8 flex gap-4">
          <button
            onClick={() => setAutoMode(!autoMode)}
            disabled={processing || currentIndex >= tweets.length}
            className={`px-6 py-2 rounded-lg font-semibold ${
              autoMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed`}
          >
            {autoMode ? 'Stop Auto Mode' : 'Start Auto Mode'}
          </button>

          <button
            onClick={processCurrentTweet}
            disabled={processing || autoMode || currentIndex >= tweets.length}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Process Current
          </button>

          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={processing || autoMode || currentIndex === 0}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentIndex(prev => Math.min(tweets.length - 1, prev + 1))}
            disabled={processing || autoMode || currentIndex >= tweets.length - 1}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Next
          </button>

          <button
            onClick={fetchTweets}
            disabled={processing || autoMode}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Refresh List
          </button>
        </div>

        {/* Current Tweet Info */}
        {currentTweet && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800 mb-8">
            <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
              Tweet {currentIndex + 1} of {tweets.length}
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              ID: {currentTweet.platform_content_id}
            </div>
            <div className="text-sm mb-4 line-clamp-3 text-gray-900 dark:text-gray-100">
              {currentTweet.content}
            </div>
          </div>
        )}

        {/* Twitter Embed */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800">
          <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Twitter Embed Preview</h3>
          <div className="flex justify-center">
            {currentTweet?.platform_content_id && (
              <Tweet id={currentTweet.platform_content_id} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
