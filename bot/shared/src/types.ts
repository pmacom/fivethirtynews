/**
 * Shared TypeScript types for 530 Project
 * Used across extension, admin UI, and backend
 */

/**
 * Platform enum - social media platforms supported by the extension
 */
export type Platform = 'twitter' | 'reddit' | 'tiktok' | 'instagram' | 'youtube';

/**
 * User roles for authorization
 */
export type UserRole = 'moderator' | 'admin';

/**
 * Tag entity with hierarchical structure
 */
export interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  path: string[];
}

/**
 * Post entity from social media platforms
 */
export interface Post {
  id: string;
  platform: Platform;
  platform_post_id: string;
  url: string;
  content_preview?: string;
  created_at: string;
}

/**
 * Post-tag association with user attribution
 */
export interface PostTag {
  post_id: string;
  tag_id: string;
  user_id: string | null;
  created_at: string;
}

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

/**
 * Post data extracted from social media (before saving to DB)
 */
export interface PostData {
  platform: Platform;
  platform_post_id: string;
  url: string;
  content_preview?: string;
}

/**
 * Tag with nested children (for tree views)
 */
export interface TagNode extends Tag {
  children: TagNode[];
}

/**
 * Message types for Chrome extension message passing
 */
export type ExtensionMessage =
  | { action: 'TAG_POST'; data: PostData }
  | { action: 'GET_TAGS'; data?: never }
  | { action: 'CREATE_TAG'; data: { name: string; parent_id: string | null } }
  | { action: 'LOGIN'; data: { email: string; password: string } }
  | { action: 'LOGOUT'; data?: never };

/**
 * Response types for extension messages
 */
export type ExtensionResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; needsLogin?: boolean };

/**
 * Supabase auth session type
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}
