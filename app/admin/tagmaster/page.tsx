'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [primaryChannel, setPrimaryChannel] = useState<string | null>(null);

  // Game state
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sessionTagged, setSessionTagged] = useState(0);
  const [showPoints, setShowPoints] = useState<{ points: number; x: number; y: number } | null>(null);
  const [comboMessage, setComboMessage] = useState<string | null>(null);

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
        setSelectedChannels([]);
        setPrimaryChannel(null);
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
      // If clicking an already selected channel, make it primary (or deselect if already primary)
      if (primaryChannel === slug) {
        // Deselect if clicking the primary channel
        setSelectedChannels((prev) => prev.filter((c) => c !== slug));
        setPrimaryChannel(selectedChannels.length > 1 ? selectedChannels.find(c => c !== slug) || null : null);
      } else {
        // Make it the primary channel
        setPrimaryChannel(slug);
      }
    } else {
      // Add new channel
      setSelectedChannels((prev) => [...prev, slug]);
      // Auto-set as primary if it's the first one
      if (selectedChannels.length === 0) {
        setPrimaryChannel(slug);
      }
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
          skip,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (!skip) {
          // Update game state
          const points = data.pointsEarned * (1 + Math.floor(combo / 5));
          setScore((prev) => prev + points);
          setCombo((prev) => prev + 1);
          setSessionTagged((prev) => prev + 1);

          // Show floating points
          setShowPoints({ points, x: Math.random() * 100, y: Math.random() * 50 });
          setTimeout(() => setShowPoints(null), 1000);

          // Check for combo message
          const comboMsg = COMBO_MESSAGES.filter((c) => combo + 1 >= c.threshold).pop();
          if (comboMsg && (combo + 1) % comboMsg.threshold === 0) {
            setComboMessage(comboMsg.message);
            setTimeout(() => setComboMessage(null), 1500);
          }
        } else {
          // Reset combo on skip
          setCombo(0);
        }

        setStats(data.stats);
        setCurrentItem(data.nextItem);
        setSelectedChannels([]);
        setPrimaryChannel(null);
      }
    } catch (error) {
      console.error('Failed to submit tag:', error);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && selectedChannels.length > 0) {
        e.preventDefault();
        submitTag();
      } else if (e.key === 'Escape') {
        submitTag(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannels, primaryChannel, currentItem]);

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
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Content Preview */}
            <div className="bg-zinc-800/80 rounded-lg border-2 border-zinc-700 overflow-hidden">
              {/* Platform Badge */}
              <div className={`px-4 py-2 ${PLATFORM_COLORS[currentItem.platform] || 'bg-zinc-700'}`}>
                <span className="font-bold uppercase tracking-wider">
                  {currentItem.platform}
                </span>
              </div>

              {/* Twitter Embed */}
              {currentItem.platform === 'twitter' && currentItem.platform_content_id ? (
                <div className="p-4 max-h-[60vh] overflow-y-auto [&_.react-tweet-theme]:!bg-transparent">
                  <Tweet id={currentItem.platform_content_id} />
                </div>
              ) : (
                <>
                  {/* Thumbnail for non-Twitter */}
                  {currentItem.thumbnail_url && (
                    <div className="aspect-video bg-black">
                      <img
                        src={currentItem.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="p-6 space-y-4">
                    <h3 className="text-xl font-bold line-clamp-2">
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

              {/* View Original Link */}
              <div className="px-6 pb-4">
                <a
                  href={currentItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm transition-colors"
                >
                  View Original →
                </a>
              </div>
            </div>

            {/* Channel Picker */}
            <div className="space-y-4">
              <div className="bg-zinc-800/80 rounded-lg border-2 border-zinc-700 p-4">
                <h3 className="text-lg font-bold text-arcade-yellow mb-4">SELECT CHANNELS</h3>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {channelGroups.map((group) => (
                    <div key={group.id}>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>{group.icon}</span>
                        <span>{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.channels.map((channel) => {
                          const isSelected = selectedChannels.includes(channel.slug);
                          const isPrimary = primaryChannel === channel.slug;
                          return (
                            <button
                              key={channel.id}
                              onClick={() => toggleChannel(channel.slug)}
                              className={`
                                px-3 py-1.5 rounded text-sm font-medium transition-all
                                ${isSelected
                                  ? isPrimary
                                    ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 ring-offset-2 ring-offset-zinc-800 font-bold shadow-[0_0_20px_rgba(250,204,21,0.6)]'
                                    : 'bg-green-500 text-white ring-2 ring-green-400 ring-offset-1 ring-offset-zinc-800 font-semibold shadow-[0_0_12px_rgba(34,197,94,0.5)]'
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
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-2">
                      SELECTED: <span className="text-green-400">{selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''}</span>
                      {primaryChannel && (
                        <span className="ml-2">| PRIMARY: <span className="text-arcade-yellow">{primaryChannel}</span></span>
                      )}
                    </div>
                  </div>
                )}
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
              <div className="text-xs text-zinc-500 text-center">
                <p>Click to add <span className="text-green-400">●</span> • Click again to make primary <span className="text-arcade-yellow">●</span> • Click primary to remove • Enter to submit</p>
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
