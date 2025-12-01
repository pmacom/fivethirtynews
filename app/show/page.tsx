'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, Clock, Users, Radio } from 'lucide-react';

interface ShowMember {
  id: string;
  user_id: string;
  role: string;
  users: {
    id: string;
    display_name: string;
    discord_avatar: string | null;
  };
}

interface Show {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  schedule_text: string | null;
  schedule_frequency: string | null;
  duration_minutes: number;
  status: string;
  show_members: ShowMember[];
}

export default function ShowsListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreateShow = user?.is_admin || user?.is_moderator;

  useEffect(() => {
    async function fetchShows() {
      try {
        const res = await fetch('/api/shows');
        const data = await res.json();

        if (data.success) {
          setShows(data.data);
        } else {
          setError(data.error || 'Failed to load shows');
        }
      } catch (err) {
        console.error('Error fetching shows:', err);
        setError('Failed to load shows');
      } finally {
        setLoading(false);
      }
    }

    fetchShows();
  }, []);

  // Get showrunners for a show
  const getShowrunners = (show: Show) => {
    return show.show_members?.filter(m => m.role === 'showrunner') || [];
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-zinc-800 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-zinc-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shows</h1>
            <p className="text-zinc-400 mt-1">Browse all shows and their episodes</p>
          </div>

          {canCreateShow && (
            <button
              onClick={() => router.push('/show/new')}
              className="flex items-center gap-2 bg-arcade-cyan text-black px-4 py-2 rounded-lg font-medium hover:bg-cyan-400 transition-colors"
            >
              <Plus size={20} />
              Create Show
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Shows Grid */}
        {shows.length === 0 ? (
          <div className="text-center py-16">
            <Radio size={48} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-xl font-medium text-zinc-400">No shows yet</h3>
            {canCreateShow && (
              <p className="text-zinc-500 mt-2">
                Create your first show to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map(show => (
              <div
                key={show.id}
                onClick={() => router.push(`/show/${show.slug}`)}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 hover:bg-zinc-800 transition-all group"
              >
                {/* Show Image */}
                {show.image_url ? (
                  <div className="aspect-video bg-zinc-900 overflow-hidden">
                    <img
                      src={show.image_url}
                      alt={show.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                    <Radio size={48} className="text-zinc-700" />
                  </div>
                )}

                {/* Show Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg group-hover:text-arcade-cyan transition-colors">
                      {show.name}
                    </h3>
                    {show.status === 'hiatus' && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        On Hiatus
                      </span>
                    )}
                  </div>

                  {show.description && (
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                      {show.description}
                    </p>
                  )}

                  {/* Schedule */}
                  {show.schedule_text && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-zinc-500">
                      <Calendar size={14} />
                      <span>{show.schedule_text}</span>
                    </div>
                  )}

                  {/* Duration */}
                  {show.duration_minutes && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                      <Clock size={14} />
                      <span>{show.duration_minutes} min</span>
                    </div>
                  )}

                  {/* Hosts */}
                  {getShowrunners(show).length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700/50">
                      <Users size={14} className="text-zinc-500" />
                      <div className="flex -space-x-2">
                        {getShowrunners(show).slice(0, 3).map(member => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-800 overflow-hidden"
                            title={member.users.display_name}
                          >
                            {member.users.discord_avatar ? (
                              <img
                                src={member.users.discord_avatar}
                                alt={member.users.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                                {member.users.display_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {getShowrunners(show).map(m => m.users.display_name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
