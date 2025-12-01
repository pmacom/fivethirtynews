'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Save,
  Radio,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Schedule' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'UTC', label: 'UTC' },
];

const WEEK_OF_MONTH = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' },
];

export default function CreateShowPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    schedule_frequency: 'weekly',
    schedule_day_of_week: 3, // Wednesday
    schedule_week_of_month: null as number | null,
    schedule_time: '17:30',
    schedule_timezone: 'America/New_York',
    schedule_text: '',
    duration_minutes: 60,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Redirect if not admin/mod
  useEffect(() => {
    if (!authLoading && user && !user.is_admin && !user.is_moderator) {
      router.push('/show');
    }
  }, [user, authLoading, router]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, slugManuallyEdited]);

  // Auto-generate schedule text
  useEffect(() => {
    const dayName = DAYS_OF_WEEK.find(d => d.value === formData.schedule_day_of_week)?.label || '';
    const tzLabel = TIMEZONES.find(t => t.value === formData.schedule_timezone)?.label || '';

    let timeFormatted = '';
    if (formData.schedule_time) {
      const [hours, minutes] = formData.schedule_time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      timeFormatted = `${hour12}:${minutes} ${ampm}`;
    }

    let scheduleText = '';
    switch (formData.schedule_frequency) {
      case 'weekly':
        scheduleText = `Every ${dayName} at ${timeFormatted} ${tzLabel}`;
        break;
      case 'biweekly':
        scheduleText = `Every other ${dayName} at ${timeFormatted} ${tzLabel}`;
        break;
      case 'monthly':
        const weekLabel = WEEK_OF_MONTH.find(w => w.value === formData.schedule_week_of_month)?.label || '';
        scheduleText = `${weekLabel} ${dayName} of each month at ${timeFormatted} ${tzLabel}`;
        break;
      case 'custom':
        scheduleText = 'Custom schedule';
        break;
    }

    setFormData(prev => ({ ...prev, schedule_text: scheduleText }));
  }, [
    formData.schedule_frequency,
    formData.schedule_day_of_week,
    formData.schedule_week_of_month,
    formData.schedule_time,
    formData.schedule_timezone,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/show/${data.data.slug}`);
      } else {
        setError(data.error || 'Failed to create show');
      }
    } catch (err) {
      console.error('Error creating show:', err);
      setError('Failed to create show');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
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

  if (!user?.is_admin && !user?.is_moderator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/show')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back to Shows
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-arcade-cyan/20 rounded-xl flex items-center justify-center">
            <Radio className="text-arcade-cyan" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create New Show</h1>
            <p className="text-zinc-400 text-sm">Set up a new recurring show</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg mb-4">Basic Information</h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Show Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Model Chat"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                URL Slug *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">/show/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => {
                    setSlugManuallyEdited(true);
                    setFormData(prev => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    }));
                  }}
                  placeholder="model-chat"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
                  required
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of the show..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan resize-none"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Cover Image URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-arcade-cyan"
              />
              {formData.image_url && (
                <div className="mt-3 aspect-video bg-zinc-900 rounded-lg overflow-hidden max-w-xs">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Schedule
            </h2>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Frequency
              </label>
              <select
                value={formData.schedule_frequency}
                onChange={e => setFormData(prev => ({ ...prev, schedule_frequency: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Day of Week
              </label>
              <select
                value={formData.schedule_day_of_week}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    schedule_day_of_week: parseInt(e.target.value),
                  }))
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Week of Month (only for monthly) */}
            {formData.schedule_frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Week of Month
                </label>
                <select
                  value={formData.schedule_week_of_month || 1}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      schedule_week_of_month: parseInt(e.target.value),
                    }))
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                >
                  {WEEK_OF_MONTH.map(w => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time and Timezone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Clock size={14} className="inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={formData.schedule_time}
                  onChange={e => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Globe size={14} className="inline mr-1" />
                  Timezone
                </label>
                <select
                  value={formData.schedule_timezone}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, schedule_timezone: e.target.value }))
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    duration_minutes: parseInt(e.target.value) || 60,
                  }))
                }
                min={15}
                max={480}
                step={15}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-arcade-cyan"
              />
            </div>

            {/* Schedule Preview */}
            {formData.schedule_text && formData.schedule_frequency !== 'custom' && (
              <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
                <p className="text-sm text-zinc-400">Schedule Preview:</p>
                <p className="text-arcade-cyan font-medium mt-1">{formData.schedule_text}</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.push('/show')}
              className="px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.slug}
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
                  Create Show
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
