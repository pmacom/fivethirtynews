import { delay } from './twitter-parser'

export interface TwitterUser {
  id: string
  username: string
  name: string
  profile_image_url?: string
  description?: string
  verified?: boolean
  public_metrics?: {
    followers_count: number
    following_count: number
    tweet_count: number
  }
}

export interface TwitterTweet {
  id: string
  text: string
  author_id: string
}

export interface TwitterAPIResponse {
  data?: TwitterTweet[]
  includes?: {
    users?: TwitterUser[]
  }
  errors?: Array<{
    resource_id: string
    detail: string
    type: string
    title: string
  }>
}

export class TwitterAPIClient {
  private bearerToken: string
  private baseUrl = 'https://api.twitter.com/2'

  constructor(bearerToken: string) {
    if (!bearerToken) {
      throw new Error('Twitter API Bearer Token is required')
    }
    this.bearerToken = bearerToken
  }

  /**
   * Fetch tweets by IDs (max 100 per request)
   * Includes author data via expansions
   */
  async fetchTweets(tweetIds: string[]): Promise<TwitterAPIResponse> {
    if (tweetIds.length === 0) {
      return { data: [] }
    }

    if (tweetIds.length > 100) {
      throw new Error('Cannot fetch more than 100 tweets per request')
    }

    const params = new URLSearchParams({
      ids: tweetIds.join(','),
      'tweet.fields': 'author_id,created_at',
      expansions: 'author_id',
      'user.fields': 'id,username,name,profile_image_url,description,verified,public_metrics'
    })

    const url = `${this.baseUrl}/tweets?${params}`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()

        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before retrying.')
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication error: ${response.status} - ${errorText}. Please check your TWITTER_BEARER_TOKEN.`)
        }

        throw new Error(`Twitter API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data: TwitterAPIResponse = await response.json()
      return data
    } catch (error: any) {
      throw new Error(`Failed to fetch tweets: ${error.message}`)
    }
  }

  /**
   * Fetch tweets with automatic rate limiting and retry
   */
  async fetchTweetsWithRetry(
    tweetIds: string[],
    maxRetries: number = 3
  ): Promise<TwitterAPIResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.fetchTweets(tweetIds)
      } catch (error: any) {
        lastError = error

        if (error.message.includes('Rate limit exceeded')) {
          if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
            console.log(`   ⏸️  Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt}/${maxRetries}...`)
            await delay(waitTime)
            continue
          }
        }

        // For other errors, throw immediately
        throw error
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }
}

export default TwitterAPIClient
