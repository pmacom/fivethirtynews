'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tweet } from 'react-tweet';
import {
  Clock,
  Calendar,
  ExternalLink,
  MessageSquare,
  Tag,
  Layers,
  ChevronLeft,
} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string | null;
  description: string | null;
  url: string;
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

interface ChannelInfo {
  slug: string;
  name: string;
  icon: string | null;
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

export default function LabChannelPage() {
  const params = useParams();
  const router = useRouter();
  const channel = params.channel as string;

  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    offset: 0,
    limit: 15,
    total: 0,
    hasMore: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({});

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Fetch content with pagination
  const fetchContent = useCallback(
    async (offset: number, isInitial: boolean = false) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(
          `/api/content?channel=${channel}&limit=15&offset=${offset}`
        );
        const data = await res.json();

        if (data.success) {
          setContent((prev) => (isInitial ? data.data : [...prev, ...data.data]));
          setPagination(data.pagination);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch content');
        }
      } catch {
        setError('Failed to load content');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [channel]
  );

  // Initial fetch when channel changes
  useEffect(() => {
    setContent([]);
    setPagination({ offset: 0, limit: 15, total: 0, hasMore: true });
    fetchContent(0, true);
  }, [channel, fetchContent]);

  // Fetch all channels for sidebar
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch('/api/channels');
        const data = await res.json();
        if (data.success && data.data) {
          // Flatten all channels from all groups
          const allChannels: ChannelInfo[] = [];
          data.data.forEach((group: { channels: ChannelInfo[] }) => {
            allChannels.push(...group.channels);
          });
          setChannels(allChannels.slice(0, 12)); // Show top 12
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    };
    fetchChannels();
  }, []);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getReadTime = (description: string | null) => {
    if (!description) return '1 min';
    const words = description.split(' ').length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min`;
  };

  const channelDisplayName = channel.charAt(0).toUpperCase() + channel.slice(1);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b-2 border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#ffd700] font-bold">
                  Lab Experiment
                </span>
              </div>
              <h1 className="text-2xl font-bold">{channelDisplayName}</h1>
              <p className="text-sm text-white/40">
                {pagination.total} items in this channel
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-10 px-6 flex flex-col lg:flex-row items-start gap-12">
        {/* Content Cards */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd700]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => fetchContent(0, true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/40">No content found in this channel.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {content.map((item) => (
                <BlogCard key={item.id} item={item} formatDate={formatDate} getReadTime={getReadTime} />
              ))}
            </div>
          )}

          {/* Load more trigger */}
          {!loading && pagination.hasMore && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#ffd700]"></div>
              )}
            </div>
          )}

          {/* End of list */}
          {!loading && !pagination.hasMore && content.length > 0 && (
            <div className="py-8 text-center text-white/30">End of list</div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="sticky top-24 shrink-0 lg:w-80 w-full">
          <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ffd700]" />
            Channels
          </h3>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {channels.map((ch) => (
              <Link
                key={ch.slug}
                href={`/lab/${ch.slug}`}
                className={`flex items-center justify-between gap-2 p-3 rounded-lg transition-all ${
                  ch.slug === channel
                    ? 'bg-[#ffd700]/20 border-2 border-[#ffd700]/50'
                    : 'bg-white/5 border-2 border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {ch.icon && <span className="text-lg">{ch.icon}</span>}
                  <span className={`font-medium ${ch.slug === channel ? 'text-[#ffd700]' : ''}`}>
                    {ch.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick stats */}
          <div className="mt-8 p-4 bg-white/5 border-2 border-white/10 rounded-lg">
            <h4 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-3">
              Current View
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Channel</span>
                <span className="text-[#00ffff]">{channelDisplayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Total Items</span>
                <span>{pagination.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Loaded</span>
                <span>{content.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Blog-style card component
function BlogCard({
  item,
  formatDate,
  getReadTime,
}: {
  item: ContentItem;
  formatDate: (date: string) => string;
  getReadTime: (desc: string | null) => string;
}) {
  const isTwitter = item.platform === 'twitter';
  const contentId = item.platform_content_id || '';

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-6 group">
      {/* Thumbnail / Media */}
      <div className="shrink-0 w-full sm:w-56 aspect-video sm:aspect-square rounded-lg overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-white/30 transition-colors">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isTwitter && contentId ? (
          <div className="w-full h-full flex items-center justify-center bg-black/50 text-[#00ffff]">
            <span className="text-4xl">𝕏</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <span className="text-4xl capitalize">{item.platform?.[0] || '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Tags/Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.primary_channel && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30">
              {item.primary_channel}
            </span>
          )}
          {item.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium rounded bg-white/5 text-white/60 border border-white/10"
            >
              {tag}
            </span>
          ))}
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30 capitalize">
            {item.platform}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-xl font-semibold tracking-tight group-hover:text-[#00ffff] transition-colors">
          {item.title || item.description?.slice(0, 80) || 'Untitled'}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="mt-2 text-white/60 line-clamp-2 text-sm">
            {item.description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-4 flex items-center gap-4 text-white/40 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {getReadTime(item.description)}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(item.created_at)}
          </div>
          {item.author_username && (
            <div className="flex items-center gap-1.5 text-white/60">
              @{item.author_username}
            </div>
          )}
        </div>

        {/* Action link */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[#00ffff] hover:text-white transition-colors group/link"
        >
          <ExternalLink className="w-4 h-4 group-hover/link:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
          <span className="group-hover/link:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
            View original
          </span>
        </a>
      </div>
    </div>
  );
}
