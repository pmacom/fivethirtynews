'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  AlertCircle,
  Hash,
  Trash2,
  History,
} from 'lucide-react';

interface Episode {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  scheduled_at: string | null;
  episode_number: number | null;
  status: string;
  content_starts_at: string | null;
}

interface Show {
  id: string;
  slug: string;
  name: string;
  schedule_time: string | null;
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CONTENT_WINDOW_OPTIONS = [
  { value: '1day', label: '1 Day', days: 1 },
  { value: '1week', label: '1 Week', days: 7 },
  { value: '2weeks', label: '2 Weeks', days: 14 },
  { value: '1month', label: '1 Month', days: 30 },
  { value: 'custom', label: 'Custom Date', days: null },
];

export default function EditEpisodePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const episodeId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [show, setShow] = useState<Show | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    episode_number: '',
    status: 'scheduled',
    contentWindow: '1week',
    contentStartsAt: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [showRes, episodeRes] = await Promise.all([
          fetch(`/api/shows/${slug}`),
          fetch(`/api/shows/${slug}/episodes/${episodeId}`),
        ]);

        const showData = await showRes.json();
        const episodeData = await episodeRes.json();

        if (!showData.success) {
          setError(showData.error || 'Failed to load show');
          return;
        }

        if (!episodeData.success) {
          setError(episodeData.error || 'Failed to load episode');
          return;
        }

        setShow(showData.data);
        setEpisode(episodeData.data);

        const ep = episodeData.data;
        let time = '';
        if (ep.scheduled_at) {
          const scheduledDate = new Date(ep.scheduled_at);
          time = scheduledDate.toTimeString().slice(0, 5);
        }

        // Determine content window from existing data
        let contentWindow = '1week';
        let contentStartsAt = '';
        if (ep.content_starts_at && ep.date) {
          const startDate = new Date(ep.content_starts_at);
          const episodeDate = new Date(ep.date);
          const diffDays = Math.round((episodeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          // Try to match to a preset
          const matchedOption = CONTENT_WINDOW_OPTIONS.find(o => o.days === diffDays);
          if (matchedOption) {
            contentWindow = matchedOption.value;
          } else {
            contentWindow = 'custom';
            contentStartsAt = startDate.toISOString().split('T')[0];
          }
        }

        setFormData({
          title: ep.title || '',
          description: ep.description || '',
          date: ep.date || '',
          time,
          episode_number: ep.episode_number?.toString() || '',
          status: ep.status || 'scheduled',
          contentWindow,
          contentStartsAt,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load episode');
      } finally {
        setLoading(false);
      }
    }

    if (slug && episodeId) {
      fetchData();
    }
  }, [slug, episodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let scheduled_at = null;
      if (formData.date && formData.time) {
        const timeParts = formData.time.split(':');
        const normalizedTime = timeParts.length === 2
          ? `${formData.time}:00`
          : formData.time;
        scheduled_at = `${formData.date}T${normalizedTime}`;
      }

      // Calculate content_starts_at based on selection
      let content_starts_at = null;
      if (formData.contentWindow === 'custom' && formData.contentStartsAt) {
        content_starts_at = `${formData.contentStartsAt}T00:00:00`;
      } else if (formData.contentWindow !== 'custom' && formData.date) {
        const option = CONTENT_WINDOW_OPTIONS.find(o => o.value === formData.contentWindow);
        if (option?.days) {
          const episodeDate = new Date(formData.date);
          episodeDate.setDate(episodeDate.getDate() - option.days);
          content_starts_at = episodeDate.toISOString();
        }
      }

      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || null,
          description: formData.description || null,
          date: formData.date,
          scheduled_at,
          episode_number: formData.episode_number ? parseInt(formData.episode_number) : null,
          status: formData.status,
          content_starts_at,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/show/${slug}`);
      } else {
        setError(data.error || 'Failed to update episode');
      }
    } catch (err) {
      console.error('Error updating episode:', err);
      setError('Failed to update episode');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/shows/${slug}/episodes/${episodeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/show/${slug}`);
      } else {
        setError(data.error || 'Failed to delete episode');
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Error deleting episode:', err);
      setError('Failed to delete episode');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-32 mb-8"></div>
            <div className="h-12 bg-zinc-800 rounded mb-4"></div>
            <div className="h-12 bg-zinc-800 rounded mb-4"></div>
            <div className="h-32 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !episode) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push(`/show/${slug}`)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
          >
            <ArrowLeft size={20} />
            Back to Show
          </button>
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push(`/show/${slug}`)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back to {show?.name}
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-arcade-cyan/20 rounded-xl flex items-center justify-center">
              <Calendar className="text-arcade-cyan" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Episode</h1>
              <p className="text-zinc-400 text-sm">
                {episode?.title || `Episode #${episode?.episode_number}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <Hash size={14} className="inline mr-1" />
                Episode Number
              </label>
              <input
                type="number"
                value={formData.episode_number}
                onChange={e => setFormData(prev => ({ ...prev, episode_number: e.target.value }))}
                min={1}
                className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Episode title"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Episode description or topics..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Clock size={14} className="inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Aggregation Window */}
            <div className="border-t border-zinc-700/50 pt-4 mt-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <History size={14} className="inline mr-1" />
                Content Window
              </label>
              <p className="text-xs text-zinc-500 mb-3">
                How far back should we look for content to include in this episode?
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_WINDOW_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contentWindow: option.value }))}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      formData.contentWindow === option.value
                        ? 'bg-arcade-cyan text-black font-medium'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {formData.contentWindow === 'custom' && (
                <div className="mt-3">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Content Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.contentStartsAt}
                    onChange={e => setFormData(prev => ({ ...prev, contentStartsAt: e.target.value }))}
                    max={formData.date || undefined}
                    className="w-48 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-arcade-cyan"
                  />
                </div>
              )}
            </div>

            {formData.date && (
              <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 mt-4 space-y-3">
                <div>
                  <p className="text-sm text-zinc-400">Scheduled for:</p>
                  <p className="text-arcade-cyan font-medium mt-1">
                    {new Date(formData.date + 'T' + (formData.time || '00:00')).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {formData.time && ` at ${formatTime(formData.time)}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Content aggregation range:</p>
                  <p className="text-zinc-300 text-sm mt-1">
                    {(() => {
                      let startDate: Date;
                      if (formData.contentWindow === 'custom' && formData.contentStartsAt) {
                        startDate = new Date(formData.contentStartsAt);
                      } else {
                        const option = CONTENT_WINDOW_OPTIONS.find(o => o.value === formData.contentWindow);
                        startDate = new Date(formData.date);
                        if (option?.days) {
                          startDate.setDate(startDate.getDate() - option.days);
                        }
                      }
                      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/show/${slug}`)}
              className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.date}
              className="flex items-center gap-2 bg-arcade-cyan text-black px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Episode?</h3>
            <p className="text-zinc-400 mb-6">
              This will permanently delete "{episode?.title || `Episode #${episode?.episode_number}`}".
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Episode
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
