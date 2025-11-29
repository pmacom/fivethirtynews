'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Tweet } from 'react-tweet';

interface ContentItem {
  id: string;
  platform: string;
  platform_content_id: string | null;
  title: string | null;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  author_name: string | null;
  author_username: string | null;
  created_at: string;
  tags?: string[];
}

interface Channel {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
}

interface ChannelGroup {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  channels: Channel[];
}

interface Tag {
  id: string;
  slug: string;
  name: string;
  usage_count: number;
}

interface Stats {
  total: number;
  tagged: number;
  untagged: number;
  percentComplete: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-blue-500',
  youtube: 'bg-red-500',
  reddit: 'bg-orange-500',
  tiktok: 'bg-black',
  bluesky: 'bg-sky-500',
  discord: 'bg-indigo-500',
};

const COMBO_MESSAGES = [
  { threshold: 3, message: 'COMBO x3!', color: 'text-yellow-400' },
  { threshold: 5, message: 'SUPER COMBO!', color: 'text-orange-400' },
  { threshold: 10, message: 'MEGA COMBO!!', color: 'text-red-400' },
  { threshold: 20, message: 'ULTRA COMBO!!!', color: 'text-purple-400' },
  { threshold: 50, message: 'LEGENDARY!!!', color: 'text-arcade-cyan' },
];

export default function TagMasterPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [primaryChannel, setPrimaryChannel] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Game state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sessionTagged, setSessionTagged] = useState(0);
  const [showPoints, setShowPoints] = useState<{ points: number; x: number; y: number } | null>(null);
  const [comboMessage, setComboMessage] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tagmaster');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setCurrentItem(data.currentItem);
        setChannelGroups(data.channelGroups);
        setAvailableTags(data.availableTags || []);
        setSelectedChannels([]);
        setPrimaryChannel(null);
        setSelectedTags([]);
        setNewTagInput('');
      }
    } catch (error) {
      console.error('Failed to fetch tagmaster data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      fetchData();
    }
  }, [user, fetchData]);

  // Toggle channel selection - clicking already selected makes it primary
  const toggleChannel = (slug: string) => {
    const isAlreadySelected = selectedChannels.includes(slug);

    if (isAlreadySelected) {
      if (primaryChannel === slug) {
        setSelectedChannels((prev) => prev.filter((c) => c !== slug));
        setPrimaryChannel(selectedChannels.length > 1 ? selectedChannels.find(c => c !== slug) || null : null);
      } else {
        setPrimaryChannel(slug);
      }
    } else {
      setSelectedChannels((prev) => [...prev, slug]);
      if (selectedChannels.length === 0) {
        setPrimaryChannel(slug);
      }
    }
  };

  // Toggle additional tag
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tagName));
    } else {
      setSelectedTags((prev) => [...prev, tagName]);
    }
  };

  // Add new custom tag
  const addCustomTag = () => {
    const tag = newTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
      setNewTagInput('');
    }
  };

  // Handle tag input keydown
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addCustomTag();
    }
  };

  // Submit tag
  const submitTag = async (skip = false) => {
    if (!currentItem) return;
    if (!skip && (selectedChannels.length === 0 || !primaryChannel)) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/tagmaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: currentItem.id,
          channels: selectedChannels,
          primaryChannel,
          tags: selectedTags,
          skip,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (!skip) {
          const points = data.pointsEarned * (1 + Math.floor(combo / 5));
          setScore((prev) => prev + points);
          setCombo((prev) => prev + 1);
          setSessionTagged((prev) => prev + 1);

          setShowPoints({ points, x: Math.random() * 100, y: Math.random() * 50 });
          setTimeout(() => setShowPoints(null), 1000);

          const comboMsg = COMBO_MESSAGES.filter((c) => combo + 1 >= c.threshold).pop();
          if (comboMsg && (combo + 1) % comboMsg.threshold === 0) {
            setComboMessage(comboMsg.message);
            setTimeout(() => setComboMessage(null), 1500);
          }
        } else {
          setCombo(0);
        }

        setStats(data.stats);
        setCurrentItem(data.nextItem);
        setSelectedChannels([]);
        setPrimaryChannel(null);
        setSelectedTags([]);
        setNewTagInput('');
      }
    } catch (error) {
      console.error('Failed to submit tag:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete content
  const deleteContent = async () => {
    if (!currentItem) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/tagmaster', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: currentItem.id }),
      });

      const data = await response.json();
      if (data.success) {
        setCombo(0); // Reset combo on delete
        setStats(data.stats);
        setCurrentItem(data.nextItem);
        setSelectedChannels([]);
        setPrimaryChannel(null);
        setSelectedTags([]);
        setNewTagInput('');
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (document.activeElement === tagInputRef.current) return;

      if (e.key === 'Enter' && !e.shiftKey && selectedChannels.length > 0) {
        e.preventDefault();
        submitTag();
      } else if (e.key === 'Escape') {
        submitTag(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannels, primaryChannel, currentItem, selectedTags]);

  if (authLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white font-orbitron overflow-hidden">
      {/* Arcade Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black" />
        <div className="scanlines absolute inset-0 opacity-10" />
      </div>

      {/* Header HUD */}
      <header className="relative z-10 bg-black/80 border-b-2 border-arcade-cyan">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/admin')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-black text-arcade-yellow tracking-wider">
                  TAG MASTER
                </h1>
                <p className="text-xs text-zinc-400 tracking-widest">CONTENT CLASSIFICATION ARENA</p>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-xs text-zinc-500">SCORE</div>
                <div className="text-2xl font-bold text-arcade-cyan tabular-nums">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">COMBO</div>
                <div className={`text-2xl font-bold tabular-nums ${combo >= 10 ? 'text-arcade-yellow animate-pulse' : 'text-white'}`}>
                  x{combo}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-500">SESSION</div>
                <div className="text-2xl font-bold text-green-400 tabular-nums">
                  {sessionTagged}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {stats && (
        <div className="relative z-10 bg-black/50 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-arcade-cyan to-arcade-yellow transition-all duration-500"
                  style={{ width: `${stats.percentComplete}%` }}
                />
              </div>
              <div className="text-sm font-bold tabular-nums">
                <span className="text-green-400">{stats.tagged}</span>
                <span className="text-zinc-500"> / </span>
                <span className="text-white">{stats.total}</span>
                <span className="text-zinc-500 ml-2">({stats.percentComplete}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl animate-bounce">🎮</div>
            <div className="text-xl mt-4 text-arcade-cyan animate-pulse">LOADING ARENA...</div>
          </div>
        ) : !currentItem ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🏆</div>
            <h2 className="text-4xl font-black text-arcade-yellow mb-4">ALL CLEAR!</h2>
            <p className="text-xl text-zinc-400 mb-8">All content has been tagged. Great job!</p>
            <div className="text-6xl font-bold text-arcade-cyan mb-4">{score.toLocaleString()}</div>
            <p className="text-zinc-500">FINAL SCORE</p>
            <button
              onClick={() => router.push('/admin')}
              className="mt-8 px-8 py-3 bg-arcade-cyan text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              RETURN TO BASE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Content Preview - Left Side */}
            <div className="xl:col-span-4 bg-zinc-800/80 rounded-lg border-2 border-zinc-700 overflow-hidden">
              {/* Platform Badge */}
              <div className={`px-4 py-2 ${PLATFORM_COLORS[currentItem.platform] || 'bg-zinc-700'}`}>
                <span className="font-bold uppercase tracking-wider">
                  {currentItem.platform}
                </span>
              </div>

              {/* Twitter Embed */}
              {currentItem.platform === 'twitter' && currentItem.platform_content_id ? (
                <div className="p-4 max-h-[50vh] overflow-y-auto [&_.react-tweet-theme]:!bg-transparent">
                  <Tweet id={currentItem.platform_content_id} />
                </div>
              ) : (
                <>
                  {currentItem.thumbnail_url && (
                    <div className="aspect-video bg-black">
                      <img
                        src={currentItem.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <h3 className="text-lg font-bold line-clamp-2">
                      {currentItem.title || currentItem.description || 'Untitled Content'}
                    </h3>

                    {currentItem.description && currentItem.title && (
                      <p className="text-zinc-400 text-sm line-clamp-3">
                        {currentItem.description}
                      </p>
                    )}

                    {currentItem.author_name && (
                      <div className="text-sm text-zinc-500">
                        By: <span className="text-white">{currentItem.author_name}</span>
                        {currentItem.author_username && (
                          <span className="text-zinc-600"> @{currentItem.author_username}</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="px-4 pb-4 flex gap-2">
                <a
                  href={currentItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors"
                >
                  View Original →
                </a>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 hover:text-white rounded text-sm transition-colors border border-red-800 hover:border-red-600"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Tag Selection - Right Side (Two Columns) */}
            <div className="xl:col-span-8 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT: Channel Tags */}
                <div className="bg-zinc-800/80 rounded-lg border-2 border-zinc-700 p-4">
                  <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                    <span>📺</span> CHANNELS
                    <span className="text-xs font-normal text-zinc-500">(required)</span>
                  </h3>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {channelGroups.map((group) => (
                      <div key={group.id}>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <span>{group.icon}</span>
                          <span>{group.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.channels.map((channel) => {
                            const isSelected = selectedChannels.includes(channel.slug);
                            const isPrimary = primaryChannel === channel.slug;
                            return (
                              <button
                                key={channel.id}
                                onClick={() => toggleChannel(channel.slug)}
                                className={`
                                  px-2.5 py-1 rounded text-xs font-medium transition-all
                                  ${isSelected
                                    ? isPrimary
                                      ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 ring-offset-1 ring-offset-zinc-800 font-bold shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                                      : 'bg-green-500 text-white ring-1 ring-green-400 font-semibold shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white'
                                  }
                                `}
                              >
                                {channel.icon} {channel.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedChannels.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <div className="text-xs text-zinc-500">
                        <span className="text-green-400">{selectedChannels.length}</span> selected
                        {primaryChannel && (
                          <span className="ml-2">• Primary: <span className="text-yellow-400">{primaryChannel}</span></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Additional Tags */}
                <div className="bg-zinc-800/80 rounded-lg border-2 border-zinc-700 p-4">
                  <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <span>🏷️</span> ADDITIONAL TAGS
                    <span className="text-xs font-normal text-zinc-500">(optional)</span>
                  </h3>

                  {/* Custom Tag Input */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add custom tag..."
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        onClick={addCustomTag}
                        disabled={!newTagInput.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Press Enter to add tag</p>
                  </div>

                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Selected</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-purple-600 text-white ring-1 ring-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.4)] hover:bg-purple-500 transition-colors"
                          >
                            {tag} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Tags */}
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Popular Tags</div>
                    <div className="flex flex-wrap gap-1.5 max-h-[25vh] overflow-y-auto">
                      {availableTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.name);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.name)}
                            className={`
                              px-2.5 py-1 rounded text-xs font-medium transition-all
                              ${isSelected
                                ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white'
                              }
                            `}
                          >
                            {tag.name}
                            {tag.usage_count > 0 && (
                              <span className="ml-1 text-zinc-500">({tag.usage_count})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => submitTag(true)}
                  disabled={saving}
                  className="flex-1 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Skip (Esc)
                </button>
                <button
                  onClick={() => submitTag()}
                  disabled={saving || selectedChannels.length === 0}
                  className={`
                    flex-1 py-4 rounded-xl font-black uppercase tracking-wider transition-all text-lg
                    ${selectedChannels.length > 0
                      ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-cyan-400 text-black hover:from-green-400 hover:via-emerald-300 hover:to-cyan-300 hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.6),0_0_60px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.8),0_0_80px_rgba(34,197,94,0.4)] animate-pulse-glow ring-2 ring-green-300 ring-offset-2 ring-offset-zinc-900'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }
                  `}
                >
                  {saving ? 'Saving...' : '🎮 Tag It! (Enter)'}
                </button>
              </div>

              {/* Tips */}
              <div className="text-xs text-zinc-500 text-center space-y-1">
                <p>
                  <span className="text-yellow-400">Channels:</span> Click to add <span className="text-green-400">●</span> • Click again for primary <span className="text-yellow-400">●</span> • Click primary to remove
                </p>
                <p>
                  <span className="text-purple-400">Tags:</span> Click to toggle • Type custom tags in the input field
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Points Animation */}
      {showPoints && (
        <div
          className="fixed text-4xl font-black text-arcade-yellow animate-bounce pointer-events-none z-50"
          style={{
            left: `${50 + showPoints.x * 0.3}%`,
            top: `${30 + showPoints.y * 0.3}%`,
            animation: 'float-up 1s ease-out forwards',
          }}
        >
          +{showPoints.points}
        </div>
      )}

      {/* Combo Message */}
      {comboMessage && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-6xl font-black text-arcade-yellow animate-pulse drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]">
            {comboMessage}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border-2 border-red-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(220,38,38,0.3)]">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Delete Content?</h3>
              <p className="text-zinc-400 mb-4">
                This action cannot be undone. The following content will be permanently removed:
              </p>

              {/* Content Preview */}
              <div className="bg-zinc-800 rounded-lg p-4 mb-6 text-left">
                <div className="text-xs text-zinc-500 uppercase mb-1">{currentItem.platform}</div>
                <div className="text-sm text-white line-clamp-2">
                  {currentItem.title || currentItem.description || currentItem.url}
                </div>
                {currentItem.author_username && (
                  <div className="text-xs text-zinc-500 mt-1">@{currentItem.author_username}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteContent}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <span className="animate-spin">⏳</span> Deleting...
                    </>
                  ) : (
                    <>🗑️ Delete Forever</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}
