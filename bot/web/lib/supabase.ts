import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface TaggedPost {
  id: string
  tweetId: string
  tweetText: string
  author: string
  url: string
  timestamp: string
  userId: string
  category: string
  tags: Array<{
    category: string
    tag: string
  }>
  categories?: {
    [key: string]: string[]
  }
}

export interface TagCategory {
  title: string
  icon: string
  tags: string[]
}

// Tag categories matching the extension
export const TAG_CATEGORIES: Record<string, TagCategory> = {
  content: {
    title: 'Content Type',
    icon: '📝',
    tags: ['Article', 'Thread', 'Meme', 'News', 'Tutorial', 'Opinion', 'Question']
  },
  topic: {
    title: 'Topic',
    icon: '🏷️',
    tags: ['Tech', 'AI/ML', 'Design', 'Business', 'Politics', 'Science', 'Sports', 'Entertainment']
  },
  quality: {
    title: 'Quality',
    icon: '⭐',
    tags: ['Must Read', 'Important', 'Interesting', 'Controversial', 'Funny', 'Inspirational']
  },
  action: {
    title: 'Action',
    icon: '🎯',
    tags: ['Read Later', 'Research', 'Share', 'Follow Up', 'Bookmark', 'Archive']
  }
}
