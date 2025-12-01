'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DiscordMember,
  getCacheMeta,
  getCachedMembers,
  cacheMembers,
  searchCachedMembers,
} from './discordMembersStore';

interface UseDiscordMembersOptions {
  showId?: string;
  enabled?: boolean;
}

interface UseDiscordMembersReturn {
  members: DiscordMember[];
  isLoading: boolean;
  error: string | null;
  lastFetched: string | null;
  memberCount: number;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<DiscordMember[]>;
}

/**
 * Hook to manage Discord member caching and fetching
 * Only fetches from API if cache is stale (member count changed)
 */
export function useDiscordMembers(
  options: UseDiscordMembersOptions = {}
): UseDiscordMembersReturn {
  const { showId, enabled = true } = options;

  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  /**
   * Fetch members from API and update cache
   */
  const fetchFromAPI = useCallback(async () => {
    try {
      const url = showId
        ? `/api/discord/members?showId=${showId}`
        : '/api/discord/members';

      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch members');
      }

      // Cache the results
      await cacheMembers(data.data, data.guildName || 'Discord Server');

      setMembers(data.data);
      setMemberCount(data.count);
      setLastFetched(data.fetchedAt);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch members';
      setError(message);
      throw err;
    }
  }, [showId]);

  /**
   * Check if cache needs refresh and fetch if necessary
   */
  const loadMembers = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, try to get cached data
      const [cachedMeta, cachedMembers] = await Promise.all([
        getCacheMeta(),
        getCachedMembers(),
      ]);

      // If we have cached data, use it immediately
      if (cachedMembers.length > 0 && cachedMeta) {
        setMembers(cachedMembers);
        setMemberCount(cachedMeta.count);
        setLastFetched(cachedMeta.fetchedAt);
      }

      // Check current count from server (lightweight call)
      const countUrl = showId
        ? `/api/discord/members?showId=${showId}&countOnly=true`
        : '/api/discord/members?countOnly=true';

      const countRes = await fetch(countUrl);
      const countData = await countRes.json();

      if (!countData.success) {
        // If count check fails but we have cache, use cache
        if (cachedMembers.length > 0) {
          console.log('[DiscordMembers] Count check failed, using cache');
          return;
        }
        throw new Error(countData.error || 'Failed to check member count');
      }

      // Compare counts to determine if refresh is needed
      const serverCount = countData.count;
      const needsRefresh = !cachedMeta || cachedMeta.count !== serverCount;

      if (needsRefresh) {
        console.log(
          `[DiscordMembers] Cache stale (cached: ${cachedMeta?.count || 0}, server: ${serverCount}). Fetching...`
        );
        await fetchFromAPI();
      } else {
        console.log('[DiscordMembers] Cache is fresh, using cached data');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members';
      setError(message);
      console.error('[DiscordMembers] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, showId, fetchFromAPI]);

  /**
   * Force refresh from API
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchFromAPI();
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromAPI]);

  /**
   * Search cached members
   */
  const search = useCallback(async (query: string): Promise<DiscordMember[]> => {
    if (!query.trim()) return members;
    return searchCachedMembers(query);
  }, [members]);

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    isLoading,
    error,
    lastFetched,
    memberCount,
    refresh,
    search,
  };
}
