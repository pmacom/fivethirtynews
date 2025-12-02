/**
 * Creator Service
 *
 * Manages creator profiles, auto-linking, and analytics.
 * Automatically creates and updates creator records when content is saved.
 */

import { supabase } from '@/lib/supabase';

export interface Creator {
  id: string;
  platform: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  profile_url?: string;
  follower_count?: number;
  verified?: boolean;
  metadata?: Record<string, any>;
  content_count?: number;
  avg_quality_score?: number;
  first_seen?: string;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorInput {
  platform: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  profile_url?: string;
  follower_count?: number;
  verified?: boolean;
  metadata?: Record<string, any>;
}

export class CreatorService {
  /**
   * Generate deterministic creator ID
   */
  static generateId(platform: string, username: string): string {
    return `${platform}:${username.toLowerCase()}`;
  }

  /**
   * Get or create creator (upsert)
   * Returns creator ID for linking to content
   */
  static async getOrCreate(input: CreatorInput): Promise<string> {
    const id = this.generateId(input.platform, input.username);

    try {
      // Try to get existing creator
      const { data: existing, error: fetchError } = await supabase
        .from('creators')
        .select('id')
        .eq('id', id)
        .single();

      if (existing) {
        // Update last_seen and any new information
        const updateData: any = {
          last_seen: new Date().toISOString()
        };

        // Update optional fields if provided and different
        if (input.display_name) updateData.display_name = input.display_name;
        if (input.bio) updateData.bio = input.bio;
        if (input.avatar_url) updateData.avatar_url = input.avatar_url;
        if (input.profile_url) updateData.profile_url = input.profile_url;
        if (input.follower_count !== undefined) updateData.follower_count = input.follower_count;
        if (input.verified !== undefined) updateData.verified = input.verified;
        if (input.metadata) updateData.metadata = input.metadata;

        await supabase
          .from('creators')
          .update(updateData)
          .eq('id', id);

        return id;
      }

      // Create new creator
      const creatorData: any = {
        id,
        platform: input.platform,
        username: input.username.toLowerCase(),
        display_name: input.display_name || input.username,
        bio: input.bio,
        avatar_url: input.avatar_url,
        profile_url: input.profile_url,
        follower_count: input.follower_count,
        verified: input.verified || false,
        metadata: input.metadata || {},
        content_count: 0,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('creators')
        .insert(creatorData);

      if (insertError) {
        // Handle race condition - another request might have created it
        if (insertError.code === '23505') { // Unique violation
          return id;
        }
        throw insertError;
      }

      return id;
    } catch (error) {
      console.error('Error in getOrCreate creator:', error);
      throw error;
    }
  }

  /**
   * Update creator average quality score
   */
  static async updateQualityScore(creatorId: string): Promise<void> {
    try {
      // Calculate average quality score from all creator's content
      const { data: content, error } = await supabase
        .from('content')
        .select('metadata_quality')
        .eq('author_id', creatorId);

      if (error) throw error;

      if (!content || content.length === 0) {
        return;
      }

      // Calculate average score
      const scores = content
        .map(c => c.metadata_quality?.score)
        .filter((s): s is number => typeof s === 'number');

      if (scores.length === 0) {
        return;
      }

      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // Update creator record
      await supabase
        .from('creators')
        .update({ avg_quality_score: avgScore })
        .eq('id', creatorId);
    } catch (error) {
      console.error('Error updating creator quality score:', error);
    }
  }

  /**
   * Get top creators by content count
   */
  static async getTopCreators(options: {
    limit?: number;
    platform?: string;
    minContentCount?: number;
    sortBy?: 'content_count' | 'avg_quality_score' | 'last_seen';
  } = {}): Promise<Creator[]> {
    const {
      limit = 20,
      platform,
      minContentCount = 1,
      sortBy = 'content_count'
    } = options;

    try {
      let query = supabase
        .from('creators')
        .select('*')
        .gte('content_count', minContentCount);

      if (platform) {
        query = query.eq('platform', platform);
      }

      // Sort
      if (sortBy === 'content_count') {
        query = query.order('content_count', { ascending: false });
      } else if (sortBy === 'avg_quality_score') {
        query = query.order('avg_quality_score', { ascending: false, nullsFirst: false });
      } else if (sortBy === 'last_seen') {
        query = query.order('last_seen', { ascending: false });
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching top creators:', error);
      return [];
    }
  }

  /**
   * Get creator by ID
   */
  static async getById(id: string): Promise<Creator | null> {
    try {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching creator:', error);
      return null;
    }
  }

  /**
   * Get all content by creator
   */
  static async getCreatorContent(creatorId: string, options: {
    limit?: number;
    offset?: number;
  } = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('author_id', creatorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching creator content:', error);
      return [];
    }
  }

  /**
   * Get creator statistics
   */
  static async getCreatorStats(creatorId: string): Promise<{
    totalContent: number;
    avgQualityScore: number;
    platforms: string[];
    tags: string[];
    firstPost: string;
    lastPost: string;
  } | null> {
    try {
      const { data: creator } = await supabase
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (!creator) return null;

      const { data: content } = await supabase
        .from('content')
        .select('platform, tags, created_at, metadata_quality')
        .eq('author_id', creatorId)
        .order('created_at', { ascending: true });

      if (!content || content.length === 0) {
        return {
          totalContent: 0,
          avgQualityScore: 0,
          platforms: [creator.platform],
          tags: [],
          firstPost: creator.first_seen,
          lastPost: creator.last_seen
        };
      }

      // Calculate stats
      const platforms = [...new Set(content.map(c => c.platform))];
      const allTags = content.flatMap(c => c.tags || []);
      const uniqueTags = [...new Set(allTags)];

      return {
        totalContent: content.length,
        avgQualityScore: creator.avg_quality_score || 0,
        platforms,
        tags: uniqueTags,
        firstPost: content[0].created_at,
        lastPost: content[content.length - 1].created_at
      };
    } catch (error) {
      console.error('Error fetching creator stats:', error);
      return null;
    }
  }

  /**
   * Search creators by name or username
   */
  static async search(query: string, options: {
    limit?: number;
    platform?: string;
  } = {}): Promise<Creator[]> {
    const { limit = 20, platform } = options;

    try {
      let supabaseQuery = supabase
        .from('creators')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);

      if (platform) {
        supabaseQuery = supabaseQuery.eq('platform', platform);
      }

      supabaseQuery = supabaseQuery
        .order('content_count', { ascending: false })
        .limit(limit);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching creators:', error);
      return [];
    }
  }
}
