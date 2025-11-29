import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  Box,
  Brain,
  Code,
  FolderOpen,
  Coffee,
  Globe,
  Star,
  X,
  Check,
  Megaphone,
  Gamepad2,
  Bot,
  Laptop,
  FlaskConical,
  Music,
  Image,
  Video,
  Zap,
  Scale,
  Cpu,
  Stethoscope,
  Shield,
  Battery,
  Coins,
  Briefcase,
  HandMetal,
  Palette,
  Target,
  Puzzle,
  Search,
  Tag,
  FileText,
} from 'lucide-react';
import { NotesSection } from './NotesSection';

// Icon mapping for channel groups and channels
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Groups
  'general': Home,
  'thirddimension': Box,
  'ai': Brain,
  'code': Code,
  'misc': Globe,
  // Channels - General
  'main-events': Megaphone,
  'intros': HandMetal,
  'jobhunt': Briefcase,
  // Channels - ThirdDimension
  '3d-models': Box,
  'blender': Box,
  'godot': Gamepad2,
  'playcanvas': Palette,
  'splats': FlaskConical,
  'threejs': Box,
  'unity': Gamepad2,
  'unreal': Gamepad2,
  'shaders': Palette,
  // Channels - AI
  'ai-tips': Zap,
  'art': Image,
  'audio': Music,
  'llm': Brain,
  'showcase': Star,
  'video': Video,
  'workflows': Zap,
  // Channels - Code
  'nocode': Puzzle,
  'design': Palette,
  'ux': Target,
  // Channels - Misc
  'science': FlaskConical,
  'law': Scale,
  'robotics': Bot,
  'medicine': Stethoscope,
  'security': Shield,
  'energy': Battery,
  'crypto': Coins,
};

// Get icon component by slug
function getIcon(slug: string): React.ComponentType<{ size?: number; className?: string }> {
  return ICON_MAP[slug.toLowerCase()] || FolderOpen;
}

// Types
interface Channel {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
}

interface ChannelGroup {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
  channels: Channel[];
}

interface PostData {
  platform: string;
  platformContentId: string;
  contentId?: string | null; // Database UUID if content already exists
  [key: string]: any;
}

interface AvailableTag {
  id: string;
  slug: string;
  name: string;
  usage_count: number;
}

interface User {
  id: string;
  discord_id: string;
  display_name: string;
  avatar: string | null;
}

interface ChannelSelectorPopupProps {
  anchorElement: HTMLElement;
  postData: PostData;
  existingChannels: string[];
  existingPrimaryChannel: string | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function ChannelSelectorPopup({
  anchorElement,
  postData,
  existingChannels,
  existingPrimaryChannel,
  onSave,
  onClose,
}: ChannelSelectorPopupProps) {
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(existingChannels));
  const [primaryChannel, setPrimaryChannel] = useState<string | null>(existingPrimaryChannel);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [subPosition, setSubPosition] = useState({ top: 0, left: 0 });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contentId, setContentId] = useState<string | null>(postData.contentId || null);

  // Tags state (NEW)
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagsLoading, setTagsLoading] = useState(true);

  // Tab state (NEW)
  const [activeTab, setActiveTab] = useState<'tags' | 'notes'>('tags');

  // Pending note state (for drafting before content is saved)
  const [pendingNote, setPendingNote] = useState<string>('');

  const popupRef = useRef<HTMLDivElement>(null);
  const subPopupRef = useRef<HTMLDivElement>(null);
  const activeGroupBtnRef = useRef<HTMLButtonElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Fetch channel groups on mount
  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getChannelGroups' });
        if (response.success && response.data) {
          setGroups(response.data);
        }
      } catch (error) {
        console.error('530: Failed to fetch channels', error);
      } finally {
        setLoading(false);
      }
    }
    fetchChannels();
  }, []);

  // Fetch available tags on mount (preload for autocomplete)
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'fetchTags' });
        if (response.success && response.tags) {
          setAvailableTags(response.tags);
          console.log('530: Loaded', response.tags.length, 'tags for autocomplete');
        }
      } catch (error) {
        console.error('530: Failed to fetch tags', error);
      } finally {
        setTagsLoading(false);
      }
    }
    fetchTags();
  }, []);

  // Fetch auth state on mount
  useEffect(() => {
    async function fetchAuthState() {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getAuthState' });
        if (response.success && response.data?.user) {
          setCurrentUser({
            id: response.data.user.id,
            discord_id: response.data.user.discord_id,
            display_name: response.data.user.display_name,
            avatar: response.data.user.discord_avatar,
          });
        }
      } catch (error) {
        console.error('530: Failed to fetch auth state', error);
      }
    }
    fetchAuthState();
  }, []);

  // Position the popup near the anchor element
  useEffect(() => {
    if (!anchorElement) return;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const popupWidth = 280;
      const popupHeight = 200; // Approximate
      const padding = 8;

      let top = rect.bottom + padding;
      let left = rect.left - (popupWidth / 2) + (rect.width / 2); // Center under button

      // Check if popup would go off-screen right
      if (left + popupWidth > window.innerWidth - padding) {
        left = window.innerWidth - popupWidth - padding;
      }
      // Check if popup would go off-screen left
      if (left < padding) {
        left = padding;
      }
      // Check if popup would go off-screen bottom - flip to top
      if (top + popupHeight > window.innerHeight - padding) {
        top = rect.top - popupHeight - padding;
      }
      // Make sure it's not off-screen top
      if (top < padding) {
        top = padding;
      }

      setPosition({ top, left });
    };

    // Small delay to ensure anchor is properly positioned
    requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorElement]);

  // Position sub-popup near the active group button (with viewport bounds checking)
  useEffect(() => {
    if (!activeGroup || !activeGroupBtnRef.current || !popupRef.current) return;

    const btnRect = activeGroupBtnRef.current.getBoundingClientRect();
    const popupRect = popupRef.current.getBoundingClientRect();
    const subWidth = 280;
    const subHeight = 300; // Approximate max height of sub-popup
    const padding = 8;

    // Horizontal positioning: prefer right of button, fall back to left
    let left = btnRect.right + padding;
    if (left + subWidth > window.innerWidth - padding) {
      left = btnRect.left - subWidth - padding;
    }

    // Vertical positioning: align with button, but respect viewport bounds
    let top = btnRect.top;

    // Check if sub-popup would go off-screen bottom
    if (top + subHeight > window.innerHeight - padding) {
      // Option 1: Align bottom of sub-popup with bottom of viewport
      top = window.innerHeight - subHeight - padding;

      // Option 2: Don't go above the main popup's top
      if (top < popupRect.top) {
        top = popupRect.top;
      }
    }

    // Don't let it go above the viewport
    if (top < padding) {
      top = padding;
    }

    setSubPosition({ top, left });
  }, [activeGroup]);

  // Handle click outside to close (layered dismissal)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Use composedPath() to properly detect clicks inside Shadow DOM
      const path = e.composedPath();

      // Check if clicked inside sub-popup
      const clickedInsideSubPopup = path.some((el) => {
        if (!(el instanceof HTMLElement)) return false;
        return el.classList?.contains('ft-sub-popup') ||
               (subPopupRef.current && el === subPopupRef.current);
      });

      // Check if clicked inside main popup
      const clickedInsideMainPopup = path.some((el) => {
        if (!(el instanceof HTMLElement)) return false;
        return el.classList?.contains('ft-popup') ||
               (popupRef.current && el === popupRef.current);
      });

      // Click on anchor button - do nothing
      if (anchorElement.contains(e.target as Node)) return;

      // Layered dismissal logic
      if (clickedInsideSubPopup) {
        return; // Inside sub-popup - let channel handlers work
      }

      if (clickedInsideMainPopup) {
        // Inside main popup but outside sub-popup - close sub-popup only
        if (activeGroup) {
          setActiveGroup(null);
        }
        return;
      }

      // Outside both - close everything
      onClose();
    };

    // Use click instead of mousedown to allow button clicks to process first
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [anchorElement, onClose, activeGroup]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeGroup) {
          setActiveGroup(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeGroup, onClose]);

  // Toggle channel selection
  const toggleChannel = useCallback((channelSlug: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelSlug)) {
        next.delete(channelSlug);
        if (primaryChannel === channelSlug) {
          setPrimaryChannel(next.size > 0 ? Array.from(next)[0] : null);
        }
      } else {
        next.add(channelSlug);
        if (!primaryChannel) {
          setPrimaryChannel(channelSlug);
        }
      }
      return next;
    });
  }, [primaryChannel]);

  // Set primary channel
  const handleSetPrimary = useCallback((channelSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedChannels.has(channelSlug)) {
      setPrimaryChannel(channelSlug);
    }
  }, [selectedChannels]);

  // Remove channel
  const removeChannel = useCallback((channelSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      next.delete(channelSlug);
      if (primaryChannel === channelSlug) {
        setPrimaryChannel(next.size > 0 ? Array.from(next)[0] : null);
      }
      return next;
    });
  }, [primaryChannel]);

  // Filter tags based on search query (min 1 char)
  const filteredTags = useCallback(() => {
    if (tagSearchQuery.length < 1) return [];
    const query = tagSearchQuery.toLowerCase();
    return availableTags
      .filter((t) =>
        (t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)) &&
        !selectedTags.has(t.slug)
      )
      .slice(0, 10);
  }, [tagSearchQuery, availableTags, selectedTags]);

  // Add tag to selection
  const addTag = useCallback((tagSlug: string) => {
    setSelectedTags((prev) => new Set([...prev, tagSlug]));
    setTagSearchQuery('');
  }, []);

  // Remove tag from selection
  const removeTag = useCallback((tagSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.delete(tagSlug);
      return next;
    });
  }, []);

  // Get tag name by slug
  const getTagName = useCallback((slug: string): string => {
    const tag = availableTags.find((t) => t.slug === slug);
    return tag?.name || slug;
  }, [availableTags]);

  // Handle auth required - trigger Discord login
  const handleAuthRequired = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'login' });
      if (response.success && response.data?.user) {
        setCurrentUser({
          id: response.data.user.id,
          discord_id: response.data.user.discord_id,
          display_name: response.data.user.display_name,
          avatar: response.data.user.discord_avatar,
        });
      }
    } catch (error) {
      console.error('530: Login failed', error);
    }
  }, []);

  // Save and close
  const handleDone = useCallback(async () => {
    if (selectedChannels.size === 0 && selectedTags.size === 0) {
      onClose();
      return;
    }

    const channelsArray = Array.from(selectedChannels);
    const tagsArray = Array.from(selectedTags);
    console.log('530: Saving channels', channelsArray, 'primary:', primaryChannel, 'tags:', tagsArray);
    console.log('530: Post data', postData);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateContentChannels',
        data: {
          ...postData,
          channels: channelsArray,
          primaryChannel: primaryChannel || channelsArray[0] || null,
          tags: tagsArray, // Include selected tags
          pendingNote: pendingNote.trim() || null, // Include draft note
        },
      });

      console.log('530: Save response', response);

      if (response.success) {
        console.log('530: Save successful!');
        // Update contentId if returned from save
        if (response.data?.contentId) {
          setContentId(response.data.contentId);
        }
        onSave({
          channels: channelsArray,
          primary_channel: primaryChannel || channelsArray[0] || null,
          tags: tagsArray,
          contentId: response.data?.contentId || contentId,
        });
      } else {
        console.error('530: Save failed', response.error);
      }
    } catch (error) {
      console.error('530: Failed to save', error);
    }

    onClose();
  }, [selectedChannels, selectedTags, primaryChannel, postData, onSave, onClose, contentId]);

  // Get channel info by slug
  const getChannelBySlug = useCallback((slug: string): Channel | undefined => {
    for (const group of groups) {
      const channel = group.channels.find((c) => c.slug === slug);
      if (channel) return channel;
    }
    return undefined;
  }, [groups]);

  // Check if a group has selected channels
  const groupHasSelection = useCallback((group: ChannelGroup): boolean => {
    return group.channels.some((c) => selectedChannels.has(c.slug));
  }, [selectedChannels]);

  // Check if a group has the primary channel
  const groupHasPrimary = useCallback((group: ChannelGroup): boolean => {
    return group.channels.some((c) => c.slug === primaryChannel);
  }, [primaryChannel]);

  // Get the active group data
  const activeGroupData = groups.find((g) => g.id === activeGroup);

  const matchingTags = filteredTags();
  const showDropdown = tagSearchQuery.length >= 1;

  return (
    <>
      {/* Main Popup - Two Column Layout */}
      <div
        ref={popupRef}
        className="ft-popup"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ft-popup-content ft-two-column">
          {/* Two Column Body */}
          <div className="ft-body">
            {/* Left Column - Categories */}
            <div className="ft-categories-column">
              {loading ? (
                <span style={{ color: '#71717a', fontSize: 11, padding: 12 }}>Loading...</span>
              ) : (
                groups.map((group) => {
                  const IconComponent = getIcon(group.slug);
                  const isActive = activeGroup === group.id;
                  const hasSelection = groupHasSelection(group);
                  const hasPrimary = groupHasPrimary(group);

                  return (
                    <button
                      key={group.id}
                      ref={isActive ? (el) => (activeGroupBtnRef.current = el) : undefined}
                      className={`ft-category-btn ${isActive ? 'active' : ''} ${hasSelection ? 'has-selection' : ''} ${hasPrimary ? 'has-primary' : ''}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGroup(isActive ? null : group.id);
                      }}
                      title={group.name}
                    >
                      <span className="icon">
                        <IconComponent size={16} />
                      </span>
                      <span className="name">{group.name}</span>
                      {hasPrimary && <span className="star">★</span>}
                      {hasSelection && !hasPrimary && <span className="dot" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Panel - Tabs */}
            <div className="ft-right-panel">
              {/* Tab Bar */}
              <div className="ft-tab-bar">
                <button
                  className={`ft-tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tags')}
                >
                  <Tag size={12} />
                  <span>Tags</span>
                </button>
                <button
                  className={`ft-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  <FileText size={12} />
                  <span>Notes</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="ft-tab-content">
                {activeTab === 'tags' ? (
                  /* Tags Tab */
                  <div className="ft-tags-tab">
                    {/* Tag Search Input */}
                    <div className="ft-tag-input-container">
                      <Search size={14} className="ft-search-icon" />
                      <input
                        ref={tagInputRef}
                        type="text"
                        className="ft-tag-search"
                        placeholder="Search or create tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        autoComplete="off"
                      />
                      {/* Autocomplete Dropdown */}
                      {showDropdown && (
                        <div className="ft-tag-dropdown">
                          {matchingTags.length > 0 ? (
                            matchingTags.map((tag) => (
                              <button
                                key={tag.id}
                                className="ft-tag-dropdown-item"
                                onClick={() => addTag(tag.slug)}
                              >
                                <span>{tag.name}</span>
                                <span className="usage-count">({tag.usage_count})</span>
                              </button>
                            ))
                          ) : (
                            <button
                              className="ft-tag-dropdown-item create-new"
                              onClick={() => addTag(tagSearchQuery)}
                            >
                              Create "{tagSearchQuery}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selected Tags */}
                    <div className="ft-selected-tags">
                      {selectedTags.size > 0 ? (
                        Array.from(selectedTags).map((slug) => (
                          <span key={slug} className="ft-tag-chip">
                            <span>{getTagName(slug)}</span>
                            <button
                              className="ft-tag-remove"
                              onClick={(e) => removeTag(slug, e)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <div className="ft-tags-empty">
                          {tagsLoading ? 'Loading tags...' : 'No tags added yet'}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Notes Tab */
                  <div className="ft-notes-tab">
                    <NotesSection
                      contentId={contentId}
                      currentUser={currentUser}
                      onAuthRequired={handleAuthRequired}
                      embedded={true}
                      pendingNote={pendingNote}
                      onPendingNoteChange={setPendingNote}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Channels */}
          <div className="ft-selected">
            {selectedChannels.size === 0 ? (
              <div className="ft-empty">Click a category to add channels</div>
            ) : (
              <div className="ft-chips">
                {Array.from(selectedChannels).map((slug) => {
                  const channel = getChannelBySlug(slug);
                  if (!channel) return null;
                  const isPrimary = primaryChannel === slug;
                  const IconComponent = getIcon(slug);

                  return (
                    <div
                      key={slug}
                      className={`ft-chip ${isPrimary ? 'primary' : ''}`}
                      onClick={() => setPrimaryChannel(slug)}
                      title={isPrimary ? 'Primary channel' : 'Click to make primary'}
                    >
                      {isPrimary && <span className="star">★</span>}
                      <IconComponent size={14} />
                      <span>{channel.name}</span>
                      <span
                        className="remove"
                        onClick={(e) => removeChannel(slug, e)}
                        title="Remove"
                      >
                        <X size={14} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Done Button */}
          <div className="ft-done">
            <button
              className="ft-done-btn"
              onClick={handleDone}
              disabled={selectedChannels.size === 0 && selectedTags.size === 0}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Sub-popup for channel list */}
      {activeGroup && activeGroupData && (
        <div
          ref={subPopupRef}
          className="ft-sub-popup"
          style={{ top: subPosition.top, left: subPosition.left }}
        >
          <div className="ft-sub-header">
            <span className="icon">
              {React.createElement(getIcon(activeGroupData.slug), { size: 18 })}
            </span>
            <span className="name">{activeGroupData.name}</span>
          </div>
          <div className="ft-sub-channels">
            {activeGroupData.channels.map((channel) => {
              const isSelected = selectedChannels.has(channel.slug);
              const isPrimary = primaryChannel === channel.slug;
              const ChannelIcon = getIcon(channel.slug);

              return (
                <button
                  key={channel.id}
                  className={`ft-channel ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleChannel(channel.slug)}
                >
                  <span className="check">
                    {isSelected && <Check size={12} />}
                  </span>
                  <span className="channel-icon">
                    <ChannelIcon size={16} />
                  </span>
                  <span className="info">
                    <span className="channel-name">{channel.name}</span>
                    {channel.description && (
                      <span className="channel-desc">{channel.description}</span>
                    )}
                  </span>
                  {isSelected && (
                    <button
                      className={`channel-star ${isPrimary ? 'active' : ''}`}
                      onClick={(e) => handleSetPrimary(channel.slug, e)}
                      title={isPrimary ? 'Primary channel' : 'Make primary'}
                    >
                      <Star size={14} fill={isPrimary ? '#f59e0b' : 'none'} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
