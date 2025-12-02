export interface Show {
  id: string
  title: string
  description: string
  weekday: string
  time: string
  image: string
  slug: string
}

export interface Episode {
  id?: string
  showId: string
  description?: string
  time: string
  segmentIds: string[]
  date: string
}

export interface Segment {
  id?: string
  title: string
  description?: string
  imageUrl?: string
  itemsIds: string[]
  weight: number
}

export interface SegmentItem {
  id?: string
  note?: string
  newsId?: string
  weight?: number
}

export enum ContentType {
  VIDEO = 'video',
  TWITTER = 'twitter',
  WARPCAST = 'warpcast',
  WEBSITE = 'website',
  DISCORD = 'discord',
  IMAGE = "image",
}

export interface NewsItem {
  id?: string
  contentType: ContentType
  primary_category: string
  categories: string[]

  url: string
  userId?: string | null
  contentId?: string
  imageUrl?: string
  description?: string
  created_at?: string
}

export interface ContentBlock {
  id: string
  title: string
  episode_id: string
  description?: string
  weight: number
}

export interface ContentBlockItem {
  id: string
  note: string
  episode_id: string
  news_id: string
  weight: number
  content_block_id: string
  content?: Content
}

export interface Content {
  id: string | null
  version: number

  content_type: ContentType
  content_url: string

  content_id: string | null
  content_created_at: string | null
  thumbnail_url: string | null

  submitted_by: string
  submitted_at: string

  category: string | null
  categories: string[] | null
  description: string | null
}



export enum TopicType {
  ART = 'art',
  LLM = 'llm',
  CODE = 'code',
  ROBOTICS = 'robotics',
  NONSENSE = 'nonsense',
  SENSE = 'sense',
  SOCIETY = 'society',
  MEDICINE = 'medicine',
  CRYPTO = 'crypto',
  VIRTUAL = 'virtual',
  ENERGY = 'energy',
  AUDIO = 'audio',
  LAW = 'law',
  UX = 'ux',
  SECURITY = 'security',
  COMFYUI = 'comfyui',
  ANIMATION = 'animation',
  DESIGN = 'design',
}


export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
}




export interface LiveViewContentBlock {
  id: string
  title: string
  weight: number
  episode_id: string
  description: string
  content_block_items: LiveViewContentBlockItems[]
}

export interface LiveViewContentBlockItems {
  id: string
  note: string
  weight: number
  content_block_id: string
  news_id: string
  content: LiveViewContent
}

export interface LiveViewContent {
  id: string
  version: number
  content_type: ContentType
  content_url: string
  content_id: string
  content_created_at: string
  thumbnail_url: string
  submitted_by: string
  submitted_at: string
  category: string
  categories: string[]
  description: string
}