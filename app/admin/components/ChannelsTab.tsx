'use client';

import { useEffect, useState } from 'react';

interface Channel {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  discord_channel_id: string | null;
}

interface ChannelGroup {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  channels: Channel[];
}

export function ChannelsTab() {
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/admin/channels');
      const data = await response.json();
      if (data.success) {
        setGroups(data.data);
      } else {
        setError(data.error || 'Failed to fetch channels');
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      setError('Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (channel: Channel) => {
    setEditingId(channel.id);
    setEditValue(channel.discord_channel_id || '');
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
    setError(null);
  };

  const handleSave = async (channelId: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/channels/${channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_channel_id: editValue || null }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchChannels();
        setEditingId(null);
        setEditValue('');
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading channels...</div>;
  }

  const mappedCount = groups.reduce(
    (acc, group) => acc + group.channels.filter((c) => c.discord_channel_id).length,
    0
  );
  const totalCount = groups.reduce((acc, group) => acc + group.channels.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Channel Discord Mappings</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Map app channels to Discord channels for broadcasting approved content
          </p>
        </div>
        <div className="text-sm text-zinc-400">
          <span className="text-arcade-cyan font-medium">{mappedCount}</span>
          <span> / {totalCount} channels mapped</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {groups.map((group) => (
        <div key={group.id} className="bg-zinc-800 rounded-lg overflow-hidden">
          <div className="bg-zinc-700 px-4 py-3 flex items-center gap-2">
            <span className="text-lg">{group.icon}</span>
            <span className="font-medium">{group.name}</span>
            <span className="text-zinc-400 text-sm">
              ({group.channels.filter((c) => c.discord_channel_id).length}/{group.channels.length} mapped)
            </span>
          </div>

          <div className="divide-y divide-zinc-700">
            {group.channels.map((channel) => (
              <div
                key={channel.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-zinc-750"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{channel.icon}</span>
                  <span className="font-medium">{channel.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">{channel.slug}</span>
                  {channel.discord_channel_id && (
                    <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                      Mapped
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingId === channel.id ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Discord Channel ID"
                        className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1.5 text-sm w-52 font-mono focus:outline-none focus:border-arcade-cyan"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(channel.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-arcade-cyan text-black text-sm font-medium rounded hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-3 py-1.5 bg-zinc-600 text-sm rounded hover:bg-zinc-500 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-zinc-400 font-mono min-w-[180px] text-right">
                        {channel.discord_channel_id || 'Not mapped'}
                      </span>
                      <button
                        onClick={() => handleEdit(channel)}
                        className="px-3 py-1.5 bg-zinc-700 text-sm rounded hover:bg-zinc-600 transition-colors"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400">
        <p className="font-medium text-zinc-300 mb-2">How to get Discord Channel IDs:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)</li>
          <li>Right-click on a channel in your Discord server</li>
          <li>Click &quot;Copy Channel ID&quot;</li>
          <li>Paste the ID here</li>
        </ol>
      </div>
    </div>
  );
}
