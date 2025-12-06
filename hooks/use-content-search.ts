'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ContentSearchFilters {
  q?: string;
  tags?: string[];
  channels?: string[];
  platform?: string;
  since?: string;
  until?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'all';
  sort?: 'content_created_at' | 'created_at' | 'title';
  order?: 'asc' | 'desc';
}

export interface ContentItem {
  id: string;
  platform: string;
  platform_content_id: string;
  url: string;
  title: string | null;
  description: string | null;
  author_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  thumbnail_url: string | null;
  media_assets: any[];
  tags: string[];
  channels: string[];
  primary_channel: string | null;
  approval_status: string;
  content_created_at: string | null;
  created_at: string;
}

export interface ContentSearchResult {
  success: boolean;
  data: ContentItem[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  query: ContentSearchFilters;
}

export interface UseContentSearchOptions {
  initialFilters?: ContentSearchFilters;
  limit?: number;
  debounceMs?: number;
  autoSearch?: boolean;
}

export function useContentSearch(options: UseContentSearchOptions = {}) {
  const {
    initialFilters = {},
    limit = 50,
    debounceMs = 300,
    autoSearch = false,
  } = options;

  const [filters, setFilters] = useState<ContentSearchFilters>(initialFilters);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit,
    total: 0,
    hasMore: false,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildQueryString = useCallback((filterOverrides?: Partial<ContentSearchFilters>, offset = 0) => {
    const params = new URLSearchParams();
    const mergedFilters = { ...filters, ...filterOverrides };

    if (mergedFilters.q) params.set('q', mergedFilters.q);
    if (mergedFilters.tags?.length) params.set('tags', mergedFilters.tags.join(','));
    if (mergedFilters.channels?.length) params.set('channels', mergedFilters.channels.join(','));
    if (mergedFilters.platform) params.set('platform', mergedFilters.platform);
    if (mergedFilters.since) params.set('since', mergedFilters.since);
    if (mergedFilters.until) params.set('until', mergedFilters.until);
    if (mergedFilters.status) params.set('status', mergedFilters.status);
    if (mergedFilters.sort) params.set('sort', mergedFilters.sort);
    if (mergedFilters.order) params.set('order', mergedFilters.order);

    params.set('limit', String(limit));
    params.set('offset', String(offset));

    return params.toString();
  }, [filters, limit]);

  const search = useCallback(async (filterOverrides?: Partial<ContentSearchFilters>, append = false) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const offset = append ? pagination.offset + pagination.limit : 0;
    const queryString = buildQueryString(filterOverrides, offset);

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/content/search?${queryString}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: ContentSearchResult = await response.json();

      if (data.success) {
        setResults(prev => append ? [...prev, ...data.data] : data.data);
        setPagination(data.pagination);

        if (filterOverrides) {
          setFilters(prev => ({ ...prev, ...filterOverrides }));
        }
      } else {
        throw new Error('Search returned unsuccessful response');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      console.error('[useContentSearch]', message, err);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString, pagination.offset, pagination.limit]);

  const debouncedSearch = useCallback((filterOverrides?: Partial<ContentSearchFilters>) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(filterOverrides);
    }, debounceMs);
  }, [search, debounceMs]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !isLoading) {
      search(undefined, true);
    }
  }, [pagination.hasMore, isLoading, search]);

  const reset = useCallback(() => {
    setFilters(initialFilters);
    setResults([]);
    setPagination({ offset: 0, limit, total: 0, hasMore: false });
    setError(null);
  }, [initialFilters, limit]);

  const updateFilters = useCallback((newFilters: Partial<ContentSearchFilters>, immediate = false) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    if (immediate) {
      search(newFilters);
    } else {
      debouncedSearch(newFilters);
    }
  }, [search, debouncedSearch]);

  // Auto-search on mount if enabled
  useEffect(() => {
    if (autoSearch) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    results,
    isLoading,
    error,
    filters,
    pagination,

    // Actions
    search,
    debouncedSearch,
    loadMore,
    reset,
    updateFilters,
    setFilters,
  };
}
