'use client';

import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Smile, Loader2 } from 'lucide-react';

interface DiscordEmoji {
  id: string;
  name: string;
  url: string;
  animated: boolean;
}

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

export function EmojiPicker({ value, onChange, placeholder = 'Select emoji' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch emojis when popover opens
  useEffect(() => {
    if (open && emojis.length === 0 && !loading) {
      fetchEmojis();
    }
  }, [open]);

  async function fetchEmojis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/discord/emojis');
      const data = await res.json();
      if (data.success) {
        setEmojis(data.data || []);
      } else {
        setError(data.error || 'Failed to load emojis');
      }
    } catch (err) {
      console.error('Failed to fetch emojis:', err);
      setError('Failed to load emojis');
    } finally {
      setLoading(false);
    }
  }

  // Filter emojis by search
  const filteredEmojis = useMemo(() => {
    if (!search) return emojis;
    const lower = search.toLowerCase();
    return emojis.filter(e => e.name.toLowerCase().includes(lower));
  }, [emojis, search]);

  // Find current emoji from value
  const currentEmoji = useMemo(() => {
    if (!value) return null;
    // Value could be in format <:name:id> or <a:name:id> for animated
    const match = value.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      return emojis.find(e => e.id === match[2]) || null;
    }
    return null;
  }, [value, emojis]);

  function handleSelect(emoji: DiscordEmoji) {
    // Format: <:name:id> or <a:name:id> for animated
    const prefix = emoji.animated ? 'a' : '';
    onChange(`<${prefix}:${emoji.name}:${emoji.id}>`);
    setOpen(false);
    setSearch('');
  }

  function handleClear() {
    onChange('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-left hover:border-zinc-600 focus:outline-none focus:border-arcade-cyan transition-colors min-w-[140px]"
        >
          {currentEmoji ? (
            <>
              <img
                src={currentEmoji.url}
                alt={currentEmoji.name}
                className="w-5 h-5 object-contain"
              />
              <span className="text-zinc-300 text-sm truncate">:{currentEmoji.name}:</span>
            </>
          ) : value ? (
            <span className="text-zinc-300 text-sm">{value}</span>
          ) : (
            <>
              <Smile size={18} className="text-zinc-500" />
              <span className="text-zinc-500 text-sm">{placeholder}</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-700" align="start">
        {/* Search */}
        <div className="p-2 border-b border-zinc-800">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search emojis..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              autoFocus
            />
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="p-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-zinc-500" size={24} />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={fetchEmojis}
                className="mt-2 text-xs text-arcade-cyan hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredEmojis.length === 0 ? (
            <div className="text-center py-4 text-zinc-500 text-sm">
              {search ? 'No emojis match your search' : 'No custom emojis found'}
            </div>
          ) : (
            <>
              {/* Clear option */}
              {value && (
                <button
                  onClick={handleClear}
                  className="w-full text-left px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 rounded mb-2"
                >
                  Clear selection
                </button>
              )}
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map(emoji => (
                  <button
                    key={emoji.id}
                    onClick={() => handleSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors group relative"
                    title={`:${emoji.name}:`}
                  >
                    <img
                      src={emoji.url}
                      alt={emoji.name}
                      className="w-6 h-6 object-contain"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer with count */}
        {emojis.length > 0 && (
          <div className="px-2 py-1.5 border-t border-zinc-800 text-xs text-zinc-500">
            {filteredEmojis.length} emoji{filteredEmojis.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
