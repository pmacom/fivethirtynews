import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { lookup } from 'mime-types'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export interface SpacesConfig {
  key: string
  secret: string
  bucket: string
  region: string
  endpoint: string
  cdn: string
  basePath: string
}

export class SpacesClient {
  private client: S3Client
  private config: SpacesConfig

  constructor() {
    this.config = {
      key: process.env.DO_SPACES_KEY || '',
      secret: process.env.DO_SPACES_SECRET || '',
      bucket: process.env.DO_SPACES_BUCKET || '530society',
      region: process.env.DO_SPACES_REGION || 'nyc3',
      endpoint: process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com',
      cdn: process.env.DO_SPACES_CDN || '530society.nyc3.cdn.digitaloceanspaces.com',
      basePath: process.env.DO_SPACES_BASE_PATH || 'content'
    }

    if (!this.config.key || !this.config.secret) {
      throw new Error('DO_SPACES_KEY and DO_SPACES_SECRET must be set in .env')
    }

    this.client = new S3Client({
      endpoint: `https://${this.config.endpoint}`,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.key,
        secretAccessKey: this.config.secret
      }
    })
  }

  /**
   * Upload a file to Digital Ocean Spaces
   */
  async uploadFile(
    localPath: string,
    remotePath: string,
    acl: 'public-read' | 'private' = 'public-read'
  ): Promise<string> {
    const fileBuffer = readFileSync(localPath)
    const contentType = lookup(localPath) || 'application/octet-stream'

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: remotePath,
      Body: fileBuffer,
      ACL: acl,
      ContentType: contentType
    })

    await this.client.send(command)

    // Return CDN URL for better performance
    return `https://${this.config.cdn}/${remotePath}`
  }

  /**
   * Check if a file exists in Spaces
   */
  async fileExists(remotePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: remotePath
      })
      await this.client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Get the remote path for a tweet media file
   */
  getRemotePath(tweetId: string, extension: string): string {
    return `${this.config.basePath}/twitter-likes/${tweetId}.${extension}`
  }

  /**
   * Get the CDN URL for a tweet media file
   */
  getCdnUrl(tweetId: string, extension: string): string {
    const remotePath = this.getRemotePath(tweetId, extension)
    return `https://${this.config.cdn}/${remotePath}`
  }

  /**
   * Delay helper for rate limiting
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default SpacesClient
