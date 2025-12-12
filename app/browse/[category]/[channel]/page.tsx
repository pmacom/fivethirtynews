'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SearchTrigger } from '@/components/search';
import NewsCard from '../components/NewsCard';

interface ChannelInfo {
  slug: string;
  name: string;
  icon: string | null;
}

interface ContentItem {
  id: string;
  title: string | null;
  description: string | null;
  url: string;
  content_url?: string;
  thumbnail_url: string | null;
  platform: string;
  platform_content_id?: string;
  author_name: string | null;
  author_username: string | null;
  created_at: string;
  primary_channel: string;
  channels?: string[];
  tags?: string[];
}

interface Pagination {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Channel group display names
const groupNames: Record<string, string> = {
  preshow: 'Pre-Show',
  general: 'General',
  thirddimension: '3D Graphics',
  ai: 'AI & Machine Learning',
  code: 'Code & Development',
  metaverse: 'Metaverse & VR',
  robotics: 'Robotics',
  medicine: 'Medicine & Biotech',
  misc: 'Miscellaneous',
  'off-topic': 'Off Topic',
};

export default function BrowseChannelPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
  const channel = params.channel as string;

  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    offset: 0,
    limit: 20,
    total: 0,
    hasMore: true
  });
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Fetch content with pagination - filter by both group and specific channel
  const fetchContent = useCallback(async (offset: number, isInitial: boolean = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(`/api/content?group=${category}&channel=${channel}&limit=20&offset=${offset}`);
      const data = await res.json();

      if (data.success) {
        setContent(prev => isInitial ? data.data : [...prev, ...data.data]);
        setPagination(data.pagination);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setError('Failed to load content');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [category, channel]);

  // Initial fetch when category or channel changes
  useEffect(() => {
    setContent([]);
    setPagination({ offset: 0, limit: 20, total: 0, hasMore: true });
    setExpandedCardId(null);
    fetchContent(0, true);
  }, [category, channel, fetchContent]);

  // Fetch channels for this category (for navigation pills)
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`/api/channels/by-group?group=${category}&withContent=true`);
        const data = await res.json();
        if (data.success && data.data) {
          setChannels(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    };
    fetchChannels();
  }, [category]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !isLoadingRef.current) {
          fetchContent(pagination.offset + pagination.limit, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [pagination, fetchContent]);

  const groupDisplayName = groupNames[category] || category;
  // Capitalize channel name for display
  const channelDisplayName = channel.charAt(0).toUpperCase() + channel.slice(1);

  const handleExpandChange = (contentId: string, expanded: boolean) => {
    setExpandedCardId(expanded ? contentId : null);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Top row: Back, breadcrumb, search */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/browse/${category}`)}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <Link href={`/browse/${category}`} className="hover:text-white transition-colors">
                  {groupDisplayName}
                </Link>
                <span>/</span>
                <span className="text-white">{channelDisplayName}</span>
              </div>
              <h1 className="text-xl font-bold">{channelDisplayName}</h1>
              <p className="text-sm text-zinc-400">
                {pagination.total} item{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
            <SearchTrigger
              variant="input"
              className="w-64"
              onSelectContent={(content) => {
                window.open(content.url, '_blank');
              }}
            />
          </div>

          {/* Channel navigation pills */}
          {channels.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs text-zinc-500 shrink-0">Channels:</span>
              {channels.map((ch) => (
                <Link
                  key={ch.slug}
                  href={`/browse/${category}/${ch.slug}`}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    ch.slug === channel
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {ch.icon && <span className="mr-1">{ch.icon}</span>}
                  {ch.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content List */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchContent(0, true)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400">No content found in this channel.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {content.map((item) => (
              <NewsCard
                key={item.id}
                content={item}
                isExpanded={expandedCardId === item.id}
                onExpandChange={(expanded) => handleExpandChange(item.id, expanded)}
              />
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {!loading && pagination.hasMore && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
            )}
          </div>
        )}

        {/* End of list */}
        {!loading && !pagination.hasMore && content.length > 0 && (
          <div className="py-8 text-center text-zinc-500">
            End of list
          </div>
        )}
      </main>
    </div>
  );
}
