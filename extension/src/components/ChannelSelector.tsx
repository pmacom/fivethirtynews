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

  const popupRef = useRef<HTMLDivElement>(null);
  const subPopupRef = useRef<HTMLDivElement>(null);
  const activeGroupBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // Position sub-popup near the active group button
  useEffect(() => {
    if (!activeGroup || !activeGroupBtnRef.current) return;

    const rect = activeGroupBtnRef.current.getBoundingClientRect();
    const subWidth = 280;
    const padding = 8;

    let left = rect.right + padding;
    if (left + subWidth > window.innerWidth - padding) {
      left = rect.left - subWidth - padding;
    }

    setSubPosition({ top: rect.top, left });
  }, [activeGroup]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Use composedPath() to properly detect clicks inside Shadow DOM
      const path = e.composedPath();

      // Check if any element in the path is our popup or sub-popup
      const clickedInsidePopup = path.some((el) => {
        if (!(el instanceof HTMLElement)) return false;
        // Check for our popup classes
        if (el.classList?.contains('ft-popup')) return true;
        if (el.classList?.contains('ft-sub-popup')) return true;
        // Check refs as fallback
        if (popupRef.current && el === popupRef.current) return true;
        if (subPopupRef.current && el === subPopupRef.current) return true;
        return false;
      });

      if (clickedInsidePopup) return;

      // Check if click is on the anchor button
      if (anchorElement.contains(e.target as Node)) return;

      // Close the popup
      onClose();
    };

    // Use click instead of mousedown to allow button clicks to process first
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [anchorElement, onClose]);

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
    if (selectedChannels.size === 0) {
      onClose();
      return;
    }

    const channelsArray = Array.from(selectedChannels);
    console.log('530: Saving channels', channelsArray, 'primary:', primaryChannel);
    console.log('530: Post data', postData);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateContentChannels',
        data: {
          ...postData,
          channels: channelsArray,
          primaryChannel: primaryChannel || channelsArray[0],
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
          primary_channel: primaryChannel || channelsArray[0],
          contentId: response.data?.contentId || contentId,
        });
      } else {
        console.error('530: Save failed', response.error);
      }
    } catch (error) {
      console.error('530: Failed to save', error);
    }

    onClose();
  }, [selectedChannels, primaryChannel, postData, onSave, onClose]);

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

  return (
    <>
      {/* Main Popup */}
      <div
        ref={popupRef}
        className="ft-popup"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ft-popup-content">
          {/* Group Icons Row */}
          <div className="ft-groups">
            {loading ? (
              <span style={{ color: '#999', fontSize: 13 }}>Loading...</span>
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
                    className={`ft-group-btn ${isActive ? 'active' : ''} ${hasSelection ? 'has-selection' : ''} ${hasPrimary ? 'has-primary' : ''}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGroup(isActive ? null : group.id);
                    }}
                    title={group.name}
                  >
                    <span className="icon">
                      <IconComponent size={22} />
                    </span>
                    {hasPrimary && <span className="star">★</span>}
                    {hasSelection && !hasPrimary && <span className="dot" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Channels */}
          <div className="ft-selected">
            {selectedChannels.size === 0 ? (
              <div className="ft-empty">Click a category above to add channels</div>
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

          {/* Notes Section */}
          <NotesSection
            contentId={contentId}
            currentUser={currentUser}
            onAuthRequired={handleAuthRequired}
          />

          {/* Done Button */}
          <div className="ft-done">
            <button
              className="ft-done-btn"
              onClick={handleDone}
              disabled={selectedChannels.size === 0}
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
