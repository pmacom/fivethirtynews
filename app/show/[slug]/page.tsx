'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscordMembers } from '@/utils/storage/useDiscordMembers';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Radio,
  Plus,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  X,
  Search,
  Trash2,
  RefreshCw,
  Pencil,
} from 'lucide-react';

interface ShowMember {
  id: string;
  user_id: string;
  role: string;
  can_manage_members: boolean;
  can_manage_show: boolean;
  can_create_episodes: boolean;
  users: {
    id: string;
    display_name: string;
    discord_avatar: string | null;
    discord_username: string | null;
  };
}

interface Episode {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  scheduled_at: string | null;
  episode_number: number | null;
  status: string;
}

interface UserPermissions {
  isSiteAdmin: boolean;
  isSiteModerator: boolean;
  canManageShow: boolean;
  canManageMembers: boolean;
  canCreateEpisodes: boolean;
  membership: {
    role: string;
  } | null;
}

interface Show {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  schedule_text: string | null;
  schedule_frequency: string | null;
  schedule_day_of_week: number | null;
  schedule_time: string | null;
  schedule_timezone: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  show_members: ShowMember[];
  episodes: Episode[];
  userPermissions: UserPermissions | null;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  showrunner: { label: 'Showrunner', color: 'bg-purple-500/20 text-purple-400' },
  cohost: { label: 'Co-Host', color: 'bg-blue-500/20 text-blue-400' },
  producer: { label: 'Producer', color: 'bg-green-500/20 text-green-400' },
  moderator: { label: 'Moderator', color: 'bg-yellow-500/20 text-yellow-400' },
  guest: { label: 'Guest', color: 'bg-zinc-500/20 text-zinc-400' },
};

const statusIcons: Record<string, { icon: typeof Play; color: string }> = {
  scheduled: { icon: Calendar, color: 'text-blue-400' },
  live: { icon: Radio, color: 'text-red-400' },
  completed: { icon: CheckCircle, color: 'text-green-400' },
  cancelled: { icon: XCircle, color: 'text-zinc-500' },
};

interface SearchUser {
  id: string;
  display_name: string;
  discord_avatar: string | null;
  discord_username: string | null;
  is_admin?: boolean;
  is_moderator?: boolean;
  // For Discord members not yet in users table
  isFromDiscord?: boolean;
}

export default function ShowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user, isLoading: authLoading } = useAuth();

  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Member management state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('cohost');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null);

  // Check if current user is a showrunner (for Discord member caching)
  const isShowrunner = useMemo(() => {
    if (!show || !user) return false;
    const membership = show.userPermissions?.membership;
    return (
      user.is_admin ||
      user.is_moderator ||
      membership?.role === 'showrunner'
    );
  }, [show, user]);

  // Discord members cache - only enabled for showrunners
  const {
    members: discordMembers,
    isLoading: discordMembersLoading,
    memberCount: discordMemberCount,
    refresh: refreshDiscordMembers,
  } = useDiscordMembers({
    showId: show?.id,
    enabled: isShowrunner && !!show?.id,
  });

  useEffect(() => {
    async function fetchShow() {
      try {
        const res = await fetch(`/api/shows/${slug}`);
        const data = await res.json();

        if (data.success) {
          setShow(data.data);
        } else {
          setError(data.error || 'Failed to load show');
        }
      } catch (err) {
        console.error('Error fetching show:', err);
        setError('Failed to load show');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchShow();
    }
  }, [slug]);

  // Group members by role
  const getMembersByRole = (role: string) => {
    return show?.show_members?.filter(m => m.role === role) || [];
  };

  const formatEpisodeDate = (episode: Episode) => {
    const date = episode.scheduled_at || episode.date;
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Search users for adding to show - uses cached Discord members if available
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);

    try {
      const existingUserIds = show?.show_members?.map(m => m.user_id) || [];
      const lowerQuery = query.toLowerCase();

      // If we have cached Discord members, search from cache (includes all server members)
      if (discordMembers.length > 0) {
        const filtered = discordMembers
          .filter(
            m =>
              (m.displayName.toLowerCase().includes(lowerQuery) ||
                m.username.toLowerCase().includes(lowerQuery)) &&
              !existingUserIds.includes(m.id)
          )
          .slice(0, 15)
          .map(m => ({
            id: m.id, // Discord ID
            display_name: m.displayName,
            discord_avatar: m.avatar,
            discord_username: m.username,
            is_admin: m.roles.some(r => r.toLowerCase().includes('admin')),
            is_moderator: m.roles.some(r => r.toLowerCase().includes('mod')),
            isFromDiscord: true, // Flag to indicate this is a Discord member
          }));

        // Sort: admins first, then mods, then alphabetically
        filtered.sort((a, b) => {
          const weightA = a.is_admin ? 0 : a.is_moderator ? 1 : 2;
          const weightB = b.is_admin ? 0 : b.is_moderator ? 1 : 2;
          if (weightA !== weightB) return weightA - weightB;
          return (a.display_name || '').localeCompare(b.display_name || '');
        });

        setSearchResults(filtered);
      } else {
        // Fallback to API search if no cached members
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data.filter((u: SearchUser) => !existingUserIds.includes(u.id)));
        }
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, discordMembers]);

  // Add member to show
  const handleAddMember = async () => {
    if (!selectedUser || !show) return;
    setAddingMember(true);
    try {
      // Build request body - different for Discord members vs registered users
      const requestBody = selectedUser.isFromDiscord
        ? {
            // Discord member - send Discord data for auto-create
            discord_id: selectedUser.id,
            discord_username: selectedUser.discord_username,
            discord_avatar: selectedUser.discord_avatar,
            display_name: selectedUser.display_name,
            role: selectedRole,
          }
        : {
            // Registered user - send user_id
            user_id: selectedUser.id,
            role: selectedRole,
          };

      const res = await fetch(`/api/shows/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh show data
        const showRes = await fetch(`/api/shows/${slug}`);
        const showData = await showRes.json();
        if (showData.success) setShow(showData.data);
        // Reset modal
        setShowAddMemberModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        alert(data.error || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      alert('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member from show
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the show?')) return;
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/shows/${slug}/members?member_id=${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Refresh show data
        const showRes = await fetch(`/api/shows/${slug}`);
        const showData = await showRes.json();
        if (showData.success) setShow(showData.data);
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Delete episode
  const handleDeleteEpisode = async (episodeId: string, episodeTitle: string) => {
    if (!confirm(`Delete "${episodeTitle}"? This cannot be undone.`)) return;
    setDeletingEpisodeId(episodeId);
    try {
      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Refresh show data
        const showRes = await fetch(`/api/shows/${slug}`);
        const showData = await showRes.json();
        if (showData.success) setShow(showData.data);
      } else {
        alert(data.error || 'Failed to delete episode');
      }
    } catch (err) {
      console.error('Error deleting episode:', err);
      alert('Failed to delete episode');
    } finally {
      setDeletingEpisodeId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-32 mb-8"></div>
            <div className="h-64 bg-zinc-800 rounded-xl mb-6"></div>
            <div className="h-6 bg-zinc-800 rounded w-48 mb-4"></div>
            <div className="h-4 bg-zinc-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/show')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8"
          >
            <ArrowLeft size={20} />
            Back to Shows
          </button>
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-400">{error || 'Show not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const permissions = show.userPermissions;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/show')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back to Shows
        </button>

        {/* Show Header */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden mb-8">
          {/* Show Image */}
          {show.image_url ? (
            <div className="aspect-[3/1] bg-zinc-900 overflow-hidden">
              <img
                src={show.image_url}
                alt={show.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[3/1] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Radio size={64} className="text-zinc-700" />
            </div>
          )}

          {/* Show Info */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{show.name}</h1>
                  {show.status === 'hiatus' && (
                    <span className="text-sm bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      On Hiatus
                    </span>
                  )}
                </div>

                {show.description && (
                  <p className="text-zinc-400 mt-2">{show.description}</p>
                )}

                <div className="flex flex-wrap gap-4 mt-4">
                  {show.schedule_text && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Calendar size={16} />
                      <span>{show.schedule_text}</span>
                    </div>
                  )}
                  {show.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Clock size={16} />
                      <span>{show.duration_minutes} minutes</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {permissions?.canManageShow && (
                  <>
                    <button
                      onClick={() => router.push(`/show/${slug}/settings/templates`)}
                      className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Plus size={16} />
                      Categories
                    </button>
                    <button
                      onClick={() => router.push(`/show/${slug}/edit`)}
                      className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Settings size={16} />
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Episodes */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Episodes</h2>
              {permissions?.canCreateEpisodes && (
                <button
                  onClick={() => router.push(`/show/${slug}/episode/new`)}
                  className="flex items-center gap-2 bg-arcade-cyan text-black px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
                >
                  <Plus size={16} />
                  New Episode
                </button>
              )}
            </div>

            {show.episodes.length === 0 ? (
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-8 text-center">
                <Calendar size={32} className="mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-500">No episodes yet</p>
                {permissions?.canCreateEpisodes && (
                  <button
                    onClick={() => router.push(`/show/${slug}/episode/new`)}
                    className="mt-4 text-sm text-arcade-cyan hover:underline"
                  >
                    Create the first episode
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {show.episodes.map(episode => {
                  const StatusIcon = statusIcons[episode.status]?.icon || Calendar;
                  const statusColor = statusIcons[episode.status]?.color || 'text-zinc-400';
                  const episodeTitle = episode.title || `Episode #${episode.episode_number}` || 'Untitled Episode';

                  return (
                    <div
                      key={episode.id}
                      className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => router.push(`/show/${slug}/episode/${episode.id}/curate`)}
                        >
                          <div className="flex items-center gap-2">
                            {episode.episode_number && (
                              <span className="text-sm text-zinc-500">
                                #{episode.episode_number}
                              </span>
                            )}
                            <h3 className="font-medium">
                              {episode.title || 'Untitled Episode'}
                            </h3>
                          </div>
                          {episode.description && (
                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                              {episode.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                            <span>{formatEpisodeDate(episode)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 ${statusColor}`}>
                            <StatusIcon size={16} />
                            <span className="text-sm capitalize">{episode.status}</span>
                          </div>
                          {permissions?.canCreateEpisodes && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/show/${slug}/episode/${episode.id}/edit`);
                                }}
                                className="p-1.5 text-zinc-500 hover:text-arcade-cyan rounded transition-colors"
                                title="Edit episode"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEpisode(episode.id, episodeTitle);
                                }}
                                disabled={deletingEpisodeId === episode.id}
                                className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                                title="Delete episode"
                              >
                                {deletingEpisodeId === episode.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Team */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users size={20} />
              Team
            </h2>

            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg divide-y divide-zinc-700/50">
              {['showrunner', 'cohost', 'producer', 'moderator', 'guest'].map(role => {
                const members = getMembersByRole(role);
                if (members.length === 0) return null;

                return (
                  <div key={role} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${roleLabels[role]?.color}`}>
                        {roleLabels[role]?.label}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {members.map(member => (
                        <div key={member.id} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                            {member.users.discord_avatar ? (
                              <img
                                src={member.users.discord_avatar}
                                alt={member.users.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                                {member.users.display_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {member.users.display_name}
                            </p>
                            {member.users.discord_username && (
                              <p className="text-xs text-zinc-500">
                                @{member.users.discord_username}
                              </p>
                            )}
                          </div>
                          {permissions?.canManageMembers && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removingMemberId === member.id}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all disabled:opacity-50"
                              title="Remove member"
                            >
                              {removingMemberId === member.id ? (
                                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {show.show_members.length === 0 && (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No team members yet
                </div>
              )}
            </div>

            {permissions?.canManageMembers && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
                Add Member
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="font-semibold text-lg">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUser(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Discord Members Status */}
              {isShowrunner && (
                <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-900/50 rounded-lg px-3 py-2">
                  <span>
                    {discordMembersLoading ? (
                      'Loading Discord members...'
                    ) : discordMembers.length > 0 ? (
                      `${discordMemberCount} Discord members cached`
                    ) : (
                      'Using database search'
                    )}
                  </span>
                  {discordMembers.length > 0 && (
                    <button
                      onClick={refreshDiscordMembers}
                      disabled={discordMembersLoading}
                      className="text-zinc-400 hover:text-white disabled:opacity-50"
                      title="Refresh Discord members"
                    >
                      <RefreshCw size={12} className={discordMembersLoading ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              )}

              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Search User
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or username..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
                  />
                </div>

                {/* Search Results */}
                {searching && (
                  <div className="mt-2 text-sm text-zinc-500">Searching...</div>
                )}
                {!searching && searchResults.length > 0 && (
                  <div className="mt-2 border border-zinc-700 rounded-lg divide-y divide-zinc-700 max-h-48 overflow-y-auto">
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700/50 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                          {u.discord_avatar ? (
                            <img src={u.discord_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                              {u.display_name?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{u.display_name}</p>
                            {u.is_admin && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                                Admin
                              </span>
                            )}
                            {u.is_moderator && !u.is_admin && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                Mod
                              </span>
                            )}
                          </div>
                          {u.discord_username && (
                            <p className="text-xs text-zinc-500">@{u.discord_username}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User */}
              {selectedUser && (
                <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-2">Selected:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                      {selectedUser.discord_avatar ? (
                        <img src={selectedUser.discord_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          {selectedUser.display_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedUser.display_name}</p>
                      {selectedUser.discord_username && (
                        <p className="text-sm text-zinc-500">@{selectedUser.discord_username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                >
                  <option value="showrunner">Showrunner</option>
                  <option value="cohost">Co-Host</option>
                  <option value="producer">Producer</option>
                  <option value="moderator">Moderator</option>
                  <option value="guest">Guest</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedRole === 'showrunner' && 'Full permissions: manage show, members, create episodes'}
                  {selectedRole === 'cohost' && 'Can create episodes'}
                  {selectedRole === 'producer' && 'Can manage show, members, create episodes'}
                  {selectedRole === 'moderator' && 'View-only permissions'}
                  {selectedRole === 'guest' && 'View-only permissions'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 justify-end p-4 border-t border-zinc-700">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUser(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUser || addingMember}
                className="flex items-center gap-2 bg-arcade-cyan text-black px-4 py-2 rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
