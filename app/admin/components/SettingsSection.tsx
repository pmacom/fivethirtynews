'use client';

import { useEffect, useState } from 'react';

interface Setting {
  key: string;
  value: boolean | string | number;
  description: string | null;
}

export function SettingsSection() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: string, currentValue: boolean) => {
    setSaving(key);
    setError(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: !currentValue }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchSettings();
      } else {
        setError(data.error || 'Failed to update setting');
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
      setError('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return null;
  }

  // Filter to only boolean settings for toggle UI
  const booleanSettings = settings.filter(
    (s) => typeof s.value === 'boolean'
  );

  if (booleanSettings.length === 0) {
    return null;
  }

  // Format setting key to readable label
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">System Settings</h2>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {booleanSettings.map((setting) => (
          <div
            key={setting.key}
            className="flex items-center justify-between py-3 border-b border-zinc-700 last:border-0"
          >
            <div className="flex-1">
              <div className="font-medium">{formatLabel(setting.key)}</div>
              {setting.description && (
                <div className="text-sm text-zinc-400 mt-0.5">{setting.description}</div>
              )}
            </div>
            <button
              onClick={() => toggleSetting(setting.key, setting.value as boolean)}
              disabled={saving === setting.key}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                setting.value ? 'bg-arcade-cyan' : 'bg-zinc-600'
              } ${saving === setting.key ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  setting.value ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-700 text-xs text-zinc-500">
        Changes take effect immediately. Broadcast setting controls whether approved content is posted to Discord.
      </div>
    </div>
  );
}
