'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  GripVertical,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';

interface ContentItem {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  description: string | null;
  author_name: string | null;
  author_avatar: string | null;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  created_at: string;
}

interface CategorySuggestion {
  template_id: string;
  template_name: string;
  template_slug: string;
  template_icon: string | null;
  items: ContentItem[];
}

interface ContentBlock {
  id: string;
  title: string;
  description: string | null;
  weight: number;
  template_id: string | null;
  content_block_items: {
    id: string;
    weight: number;
    news_id: string;
    content: ContentItem;
  }[];
}

export default function EpisodeCuratePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const episodeId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showName, setShowName] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDate, setEpisodeDate] = useState('');

  // Content blocks (populated episode content)
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  // Suggestions (for adding new content)
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [sinceDate, setSinceDate] = useState<string | null>(null);

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Fetch episode data and content blocks
  const fetchEpisodeData = useCallback(async () => {
    try {
      // Fetch episode details
      const episodeRes = await fetch(`/api/shows/${slug}/episodes/${episodeId}`);
      const episodeData = await episodeRes.json();

      if (episodeData.success && episodeData.data) {
        setEpisodeTitle(episodeData.data.title || `Episode ${episodeData.data.episode_number || ''}`);
        setEpisodeDate(episodeData.data.date || episodeData.data.scheduled_at?.split('T')[0] || '');
      }

      // Fetch show name
      const showRes = await fetch(`/api/shows/${slug}`);
      const showData = await showRes.json();
      if (showData.success && showData.data) {
        setShowName(showData.data.name);
      }

      // Fetch content blocks for this episode
      const blocksRes = await fetch(`/api/shows/${slug}/episodes/${episodeId}/blocks`);
      const blocksData = await blocksRes.json();

      if (blocksData.success) {
        setBlocks(blocksData.data || []);
      }

      // Fetch suggestions for adding more content
      const suggestionsRes = await fetch(`/api/shows/${slug}/episodes/${episodeId}/suggestions`);
      const suggestionsData = await suggestionsRes.json();

      if (suggestionsData.success) {
        setSuggestions(suggestionsData.data.suggestions || []);
        setSinceDate(suggestionsData.data.since_date);
      }
    } catch (err) {
      console.error('Error fetching episode data:', err);
      setError('Failed to load episode data');
    }
  }, [slug, episodeId]);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);
    fetchEpisodeData().finally(() => setLoading(false));
  }, [authLoading, fetchEpisodeData]);

  // Refresh suggestions
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}/suggestions`);
      const data = await res.json();

      if (data.success) {
        setSuggestions(data.data.suggestions || []);
        setSinceDate(data.data.since_date);
      }
    } catch (err) {
      console.error('Error refreshing suggestions:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Remove item from block
  const handleRemoveItem = async (blockId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}/blocks/${blockId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBlocks((prev) =>
          prev.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  content_block_items: block.content_block_items.filter((item) => item.id !== itemId),
                }
              : block
          )
        );
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  // Add item to block
  const handleAddItem = async (blockId: string, contentId: string) => {
    try {
      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}/blocks/${blockId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId }),
      });

      if (res.ok) {
        // Refresh blocks
        fetchEpisodeData();
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  // Search for content
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/content?search=${encodeURIComponent(searchQuery)}&status=approved&limit=20`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setSearching(false);
    }
  };

  // Open search modal for a specific block
  const openSearchForBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchModal(true);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/show/${slug}`)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {showName || 'Show'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Curate Episode Content</h1>
              <p className="text-zinc-400 text-sm">
                {episodeTitle} {episodeDate && `- ${formatDate(episodeDate)}`}
              </p>
              {sinceDate && (
                <p className="text-zinc-500 text-xs mt-1">
                  Showing content since {formatDate(sinceDate)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => router.push(`/show/${slug}`)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {blocks.length === 0 && suggestions.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-zinc-400 mb-4">No category templates configured for this show.</p>
            <button
              onClick={() => router.push(`/show/${slug}/settings/templates`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Set Up Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Render content blocks or suggestions */}
            {(blocks.length > 0 ? blocks : suggestions).map((category: any) => {
              const isBlock = 'content_block_items' in category;
              const items = isBlock ? category.content_block_items?.map((i: any) => ({ ...i.content, block_item_id: i.id })) || [] : category.items || [];
              const title = isBlock ? category.title : category.template_name;
              const icon = isBlock ? null : category.template_icon;
              const blockId = isBlock ? category.id : null;

              return (
                <div
                  key={isBlock ? category.id : category.template_id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {icon && <span className="text-lg">{icon}</span>}
                        <h3 className="font-medium">{title}</h3>
                        <span className="text-xs text-zinc-500">({items.length})</span>
                      </div>
                      {blockId && (
                        <button
                          onClick={() => openSearchForBlock(blockId)}
                          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                          title="Add content"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="max-h-96 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500 text-sm">
                        No content found
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 hover:bg-zinc-800/50 group"
                          >
                            <div className="flex gap-3">
                              {/* Drag handle (for blocks only) */}
                              {blockId && (
                                <div className="flex-shrink-0 cursor-grab text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                              )}

                              {/* Thumbnail */}
                              <div className="flex-shrink-0 w-16 h-16 bg-zinc-800 rounded overflow-hidden">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-zinc-600" />
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {item.title || item.description || 'Untitled'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                  {item.author_name} &middot; {item.platform}
                                </p>
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.tags.slice(0, 3).map((tag: string) => (
                                      <span
                                        key={tag}
                                        className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-zinc-400 hover:text-white"
                                  title="Open"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                {blockId && item.block_item_id && (
                                  <button
                                    onClick={() => handleRemoveItem(blockId, item.block_item_id)}
                                    className="p-1 text-zinc-400 hover:text-red-400"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Add Content</h2>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search approved content..."
                    className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  {searching ? 'Searching...' : 'Search for content to add'}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-zinc-800/50 flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-zinc-800 rounded overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.title || item.description || 'Untitled'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.author_name} &middot; {item.platform}
                        </p>
                      </div>
                      <button
                        onClick={() => selectedBlockId && handleAddItem(selectedBlockId, item.id)}
                        className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
