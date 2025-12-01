'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Tag,
  Hash,
  Loader2,
  Check,
} from 'lucide-react';

interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ChannelGroup {
  id: string;
  slug: string;
  name: string;
  channels: Channel[];
}

interface AvailableTag {
  id: string;
  slug: string;
  name: string;
  usage_count: number;
}

interface TagChannelSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagChannelSelector({
  selectedTags,
  onTagsChange,
  placeholder = 'Select tags...',
}: TagChannelSelectorProps) {
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Fetch channels and tags on mount
  useEffect(() => {
    Promise.all([fetchChannels(), fetchTags()]).finally(() => setLoading(false));
  }, []);

  async function fetchChannels() {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (data.success) {
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }

  async function fetchTags() {
    try {
      const res = await fetch('/api/tags?limit=200');
      const data = await res.json();
      if (data.success) {
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }

  // Get all channel slugs as a Set for quick lookup
  const channelSlugs = useMemo(() => {
    const slugs = new Set<string>();
    groups.forEach(g => g.channels.forEach(c => slugs.add(c.slug)));
    return slugs;
  }, [groups]);

  // Separate selected items into channels and tags
  const selectedChannels = useMemo(() => {
    return selectedTags.filter(t => channelSlugs.has(t));
  }, [selectedTags, channelSlugs]);

  const selectedTagsOnly = useMemo(() => {
    return selectedTags.filter(t => !channelSlugs.has(t));
  }, [selectedTags, channelSlugs]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!search) return availableTags.slice(0, 20);
    const lower = search.toLowerCase();
    return availableTags
      .filter(t => t.name.toLowerCase().includes(lower) || t.slug.toLowerCase().includes(lower))
      .slice(0, 20);
  }, [availableTags, search]);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Toggle tag/channel selection
  const toggleSelection = useCallback((slug: string) => {
    const current = new Set(selectedTags);
    if (current.has(slug)) {
      current.delete(slug);
    } else {
      current.add(slug);
    }
    onTagsChange(Array.from(current));
  }, [selectedTags, onTagsChange]);

  // Select all channels in a group
  const selectAllInGroup = useCallback((group: ChannelGroup) => {
    const current = new Set(selectedTags);
    const allSelected = group.channels.every(c => current.has(c.slug));

    if (allSelected) {
      // Deselect all
      group.channels.forEach(c => current.delete(c.slug));
    } else {
      // Select all
      group.channels.forEach(c => current.add(c.slug));
    }
    onTagsChange(Array.from(current));
  }, [selectedTags, onTagsChange]);

  // Remove a selected item
  const removeSelection = useCallback((slug: string) => {
    onTagsChange(selectedTags.filter(t => t !== slug));
  }, [selectedTags, onTagsChange]);

  // Get display name for a selection
  const getDisplayName = useCallback((slug: string): string => {
    // Check if it's a channel
    for (const group of groups) {
      const channel = group.channels.find(c => c.slug === slug);
      if (channel) return channel.name;
    }
    // Check if it's a tag
    const tag = availableTags.find(t => t.slug === slug);
    if (tag) return tag.name;
    // Fallback to slug
    return slug;
  }, [groups, availableTags]);

  // Check if all channels in group are selected
  const isGroupFullySelected = useCallback((group: ChannelGroup): boolean => {
    return group.channels.every(c => selectedTags.includes(c.slug));
  }, [selectedTags]);

  // Check if some channels in group are selected
  const isGroupPartiallySelected = useCallback((group: ChannelGroup): boolean => {
    const selected = group.channels.filter(c => selectedTags.includes(c.slug));
    return selected.length > 0 && selected.length < group.channels.length;
  }, [selectedTags]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Items as Chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(slug => {
            const isChannel = channelSlugs.has(slug);
            return (
              <span
                key={slug}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  isChannel
                    ? 'bg-arcade-cyan/20 text-arcade-cyan border border-arcade-cyan/30'
                    : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600'
                }`}
              >
                {isChannel ? <Hash size={12} /> : <Tag size={12} />}
                {getDisplayName(slug)}
                <button
                  type="button"
                  onClick={() => removeSelection(slug)}
                  className="ml-0.5 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Two Panel Layout */}
      <div className="grid grid-cols-2 gap-3 min-h-[200px]">
        {/* Left Panel - Channels */}
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/30">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Channels
            </span>
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            {groups.map(group => {
              const isExpanded = expandedGroups.has(group.id);
              const fullySelected = isGroupFullySelected(group);
              const partiallySelected = isGroupPartiallySelected(group);

              return (
                <div key={group.id}>
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 text-left group"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-zinc-500" />
                    ) : (
                      <ChevronRight size={14} className="text-zinc-500" />
                    )}
                    <span className="flex-1 text-sm text-zinc-300">{group.name}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        selectAllInGroup(group);
                      }}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        fullySelected
                          ? 'bg-arcade-cyan/20 text-arcade-cyan'
                          : partiallySelected
                          ? 'bg-zinc-700 text-zinc-300'
                          : 'bg-zinc-800 text-zinc-500 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {fullySelected ? 'All' : partiallySelected ? `${group.channels.filter(c => selectedTags.includes(c.slug)).length}/${group.channels.length}` : 'All'}
                    </button>
                  </button>

                  {/* Channels */}
                  {isExpanded && (
                    <div className="bg-zinc-900/30">
                      {group.channels.map(channel => {
                        const isSelected = selectedTags.includes(channel.slug);
                        return (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => toggleSelection(channel.slug)}
                            className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-zinc-800/50 text-left ${
                              isSelected ? 'bg-arcade-cyan/10' : ''
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected
                                  ? 'bg-arcade-cyan border-arcade-cyan'
                                  : 'border-zinc-600'
                              }`}
                            >
                              {isSelected && <Check size={12} className="text-black" />}
                            </div>
                            <Hash size={12} className="text-zinc-500" />
                            <span className="text-sm text-zinc-300">{channel.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Tags */}
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/30">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Tags
            </span>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-zinc-700/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Tag List */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="px-3 py-4 text-center text-zinc-500 text-sm">
                {search ? 'No tags match your search' : 'No tags available'}
              </div>
            ) : (
              filteredTags.map(tag => {
                const isSelected = selectedTags.includes(tag.slug);
                // Skip if it's also a channel (shown in left panel)
                if (channelSlugs.has(tag.slug)) return null;

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleSelection(tag.slug)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 text-left ${
                      isSelected ? 'bg-zinc-700/30' : ''
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-arcade-cyan border-arcade-cyan'
                          : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-black" />}
                    </div>
                    <Tag size={12} className="text-zinc-500" />
                    <span className="flex-1 text-sm text-zinc-300">{tag.name}</span>
                    <span className="text-xs text-zinc-500">({tag.usage_count})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-zinc-500">
        Select channels (left) or tags (right). Click "All" to select all channels in a group.
      </p>
    </div>
  );
}
