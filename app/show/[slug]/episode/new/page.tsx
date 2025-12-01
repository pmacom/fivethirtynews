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
} from 'lucide-react';

interface Show {
  id: string;
  slug: string;
  name: string;
  schedule_frequency: string | null;
  schedule_day_of_week: number | null;
  schedule_time: string | null;
  schedule_timezone: string;
  duration_minutes: number;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CreateEpisodePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user, isLoading: authLoading } = useAuth();

  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    episode_number: '',
  });

  // Fetch show data
  useEffect(() => {
    async function fetchShow() {
      try {
        const res = await fetch(`/api/shows/${slug}`);
        const data = await res.json();

        if (data.success) {
          setShow(data.data);

          // Auto-fill based on show schedule
          const nextDate = calculateNextScheduledDate(data.data);
          const nextEpisodeNumber = getNextEpisodeNumber(data.data.episodes || []);

          setFormData(prev => ({
            ...prev,
            title: `${data.data.name} #${nextEpisodeNumber}`,
            date: nextDate,
            time: data.data.schedule_time || '17:30',
            episode_number: String(nextEpisodeNumber),
          }));
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

  // Calculate next scheduled date based on show schedule
  function calculateNextScheduledDate(showData: Show): string {
    const today = new Date();
    const dayOfWeek = showData.schedule_day_of_week;

    if (dayOfWeek === null || dayOfWeek === undefined) {
      // Default to tomorrow if no schedule
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Find the next occurrence of the scheduled day
    const currentDay = today.getDay();
    let daysUntilNext = dayOfWeek - currentDay;

    if (daysUntilNext <= 0) {
      daysUntilNext += 7;
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilNext);

    return nextDate.toISOString().split('T')[0];
  }

  // Get next episode number
  function getNextEpisodeNumber(episodes: { episode_number: number | null }[]): number {
    const maxNumber = episodes.reduce((max, ep) => {
      return ep.episode_number && ep.episode_number > max ? ep.episode_number : max;
    }, 0);
    return maxNumber + 1;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Combine date and time into scheduled_at
      let scheduled_at = null;
      if (formData.date && formData.time) {
        // Time input may return HH:MM or HH:MM:SS, normalize to HH:MM:SS
        const timeParts = formData.time.split(':');
        const normalizedTime = timeParts.length === 2
          ? `${formData.time}:00`
          : formData.time;
        scheduled_at = `${formData.date}T${normalizedTime}`;
      }

      const res = await fetch(`/api/shows/${slug}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || undefined,
          description: formData.description || undefined,
          date: formData.date,
          scheduled_at,
          episode_number: formData.episode_number ? parseInt(formData.episode_number) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/show/${slug}`);
      } else {
        setError(data.error || 'Failed to create episode');
      }
    } catch (err) {
      console.error('Error creating episode:', err);
      setError('Failed to create episode');
    } finally {
      setSaving(false);
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

  if (error && !show) {
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
        {/* Back Button */}
        <button
          onClick={() => router.push(`/show/${slug}`)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back to {show?.name}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-arcade-cyan/20 rounded-xl flex items-center justify-center">
            <Calendar className="text-arcade-cyan" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">New Episode</h1>
            <p className="text-zinc-400 text-sm">Schedule a new episode for {show?.name}</p>
          </div>
        </div>

        {/* Schedule Info */}
        {show?.schedule_day_of_week !== null && (
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-300 font-medium">Regular Schedule:</span>{' '}
              {DAYS_OF_WEEK[show.schedule_day_of_week!]}s at{' '}
              {show.schedule_time ? formatTime(show.schedule_time) : 'TBD'}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-4">
            {/* Episode Number */}
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

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`${show?.name} #${formData.episode_number}`}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
              />
            </div>

            {/* Description */}
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

            {/* Date and Time */}
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

            {/* Preview */}
            {formData.date && (
              <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 mt-4">
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
            )}
          </div>

          {/* Submit */}
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
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create Episode
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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
