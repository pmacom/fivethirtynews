'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowLeft, Tv, Users, Calendar } from 'lucide-react';
import { useShowsStore } from '@/viewer/ui/shows/store';
import {
  Show,
  getShowStatus,
  getShowStatusColor,
  getScheduleDisplay,
  getShowHosts,
  getShowImageUrl,
  getMemberAvatarUrl,
} from '@/viewer/ui/shows/types';
import { GlobalSettingsButton } from '@/viewer/ui/components/GlobalSettingsButton';
import '@/viewer/ui/stageselect/styles.css';

export default function ShowsPage() {
  const router = useRouter();
  const {
    shows,
    loading,
    error,
    selectedIndex,
    fetchShows,
    setSelectedIndex,
  } = useShowsStore();

  const selectedShow = shows[selectedIndex] || null;

  // Fetch shows on mount
  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const cols = 2;
      const len = shows.length;
      if (len === 0) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((selectedIndex + 1) % len);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((selectedIndex - 1 + len) % len);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((selectedIndex + cols) % len);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((selectedIndex - cols + len) % len);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedShow) {
          router.push(`/show/${selectedShow.slug}`);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        router.back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shows.length, selectedIndex, setSelectedIndex, router, selectedShow]);

  const handleSelectShow = useCallback((show: Show) => {
    router.push(`/show/${show.slug}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white font-orbitron select-none overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 grid-bg opacity-30" />
      <div className="fixed inset-0 scanlines opacity-10 pointer-events-none" />

      {/* Top Right Buttons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <GlobalSettingsButton className="!fixed !top-auto !right-auto relative" zIndex={50} />
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center
                     text-white/50 hover:text-white border-2 border-white/20 hover:border-white/50
                     rounded transition-all hover:scale-110 bg-black/50 backdrop-blur-sm"
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-start mb-6 md:mb-8">
          <div className="space-y-1">
            <h2 className="text-arcade-cyan text-sm md:text-base tracking-[0.5em] animate-pulse">
              BROADCAST
            </h2>
            <h1 className="text-3xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              SELECT SHOW
            </h1>
          </div>
          <div className="hidden md:block text-right font-share-tech text-arcade-yellow">
            <div className="text-xl md:text-2xl">CREDITS: 02</div>
            <div className="text-sm opacity-70">ID: 530-SOC</div>
          </div>
        </header>

        {/* Content Area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-arcade-cyan animate-pulse text-xl">LOADING SCHEDULE...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-arcade-red text-xl">{error}</div>
          </div>
        ) : shows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/50 text-xl">NO SHOWS FOUND</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-8 min-h-0">
            {/* Left: Show Grid */}
            <div className="w-full md:w-1/2 lg:w-2/5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {shows.map((show, index) => (
                  <ShowTile
                    key={show.id}
                    show={show}
                    index={index}
                    isSelected={selectedIndex === index}
                    onSelect={() => setSelectedIndex(index)}
                    onActivate={() => handleSelectShow(show)}
                  />
                ))}
              </div>
            </div>

            {/* Right: Preview Card */}
            <div className="w-full md:w-1/2 lg:w-3/5 h-64 md:h-auto">
              {selectedShow && (
                <ShowPreview
                  show={selectedShow}
                  index={selectedIndex}
                  onSelect={() => handleSelectShow(selectedShow)}
                />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-6 md:mt-8 text-center space-y-2">
          <div className="inline-block bg-arcade-red/20 border border-arcade-red/50 px-6 md:px-8 py-2 skew-x-[-20deg]">
            <p className="text-arcade-red font-bold animate-pulse skew-x-[20deg] tracking-widest text-sm md:text-base">
              PRESS START TO WATCH
            </p>
          </div>
          <p className="text-white/40 font-share-tech text-[10px] md:text-xs tracking-[0.2em] uppercase">
            ←→↑↓ Navigate • Enter Select • Esc Back
          </p>
        </footer>
      </div>

      {/* Back Button - Bottom Left */}
      <button
        onClick={() => router.back()}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3
                   bg-white/5 hover:bg-white/10 border-2 border-white/30 hover:border-white/50
                   text-white/70 hover:text-white rounded-lg transition-all hover:scale-105
                   font-share-tech text-sm tracking-wider backdrop-blur-sm"
        title="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="hidden sm:inline">BACK</span>
      </button>
    </div>
  );
}

// --- Show Tile Component ---

interface ShowTileProps {
  show: Show;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

function ShowTile({ show, index, isSelected, onSelect, onActivate }: ShowTileProps) {
  const statusColor = getShowStatusColor(show);
  const imageUrl = getShowImageUrl(show);

  return (
    <button
      onClick={onActivate}
      onMouseEnter={onSelect}
      className={`
        relative group aspect-[4/3] w-full border-2 transform transition-all duration-100 skew-x-[-10deg]
        ${isSelected
          ? 'border-arcade-yellow bg-arcade-yellow/10 scale-105 z-10'
          : 'border-white/20 bg-black/50 hover:border-white/50'
        }
      `}
      style={{
        boxShadow: isSelected ? '0 0 20px rgba(255, 215, 0, 0.4)' : 'none',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center skew-x-[10deg]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={show.name}
            className={`
              w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover
              transition-all duration-300
              ${isSelected
                ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]'
                : 'grayscale opacity-60'
              }
            `}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Tv className={`
            w-12 h-12 md:w-16 md:h-16 transition-all duration-300
            ${isSelected
              ? 'text-arcade-yellow scale-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]'
              : 'text-white/30 grayscale opacity-60'
            }
          `} />
        )}
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />

      {/* Selection label */}
      {isSelected && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-arcade-yellow text-black text-xs font-bold px-2 py-0.5 skew-x-[10deg] whitespace-nowrap z-10">
          CH{index + 1}
        </div>
      )}

      {/* Status indicator */}
      {show.status === 'hiatus' && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full skew-x-[10deg]" />
      )}
    </button>
  );
}

// --- Show Preview Component ---

interface ShowPreviewProps {
  show: Show;
  index: number;
  onSelect: () => void;
}

function ShowPreview({ show, index, onSelect }: ShowPreviewProps) {
  const status = getShowStatus(show);
  const statusColor = getShowStatusColor(show);
  const schedule = getScheduleDisplay(show);
  const hosts = getShowHosts(show);
  const imageUrl = getShowImageUrl(show);

  return (
    <div
      className="w-full h-full border-4 border-white/20 bg-black/80 relative overflow-hidden cursor-pointer hover:border-arcade-yellow/50 transition-colors"
      onClick={onSelect}
    >
      {/* Background Image or Gradient */}
      <div className="absolute inset-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className="w-full h-full opacity-30 bg-gradient-to-br from-purple-500 to-black" />
        )}
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 space-y-3 md:space-y-4">
        {/* Name + Status Row */}
        <div className="flex items-end justify-between border-b-2 border-white/20 pb-3 md:pb-4">
          <div>
            <h2
              className="text-2xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-purple-400"
              style={{ textShadow: '0 0 30px currentColor' }}
            >
              {show.name}
            </h2>
            <p className="text-white/70 font-share-tech text-sm md:text-base tracking-widest">
              {schedule}
            </p>
          </div>
          <div className="text-3xl md:text-5xl opacity-20 font-black hidden sm:block">
            0{index + 1}
          </div>
        </div>

        {/* Description */}
        {show.description && (
          <p className="text-white/80 font-share-tech text-sm md:text-base leading-relaxed line-clamp-2">
            {show.description}
          </p>
        )}

        {/* Hosts */}
        {hosts.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/50" />
            <div className="flex -space-x-2">
              {hosts.slice(0, 4).map((member) => (
                <img
                  key={member.id}
                  src={getMemberAvatarUrl(member)}
                  alt={member.users.display_name}
                  className="w-8 h-8 rounded-full border-2 border-black object-cover"
                  title={member.users.display_name}
                  onError={(e) => {
                    e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
              ))}
            </div>
            <span className="text-white/50 font-share-tech text-xs ml-2">
              {hosts.map(h => h.users.display_name).join(', ')}
            </span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 font-share-tech text-xs md:text-sm pt-2">
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Status</div>
            <div className={`font-bold ${statusColor}`}>{status}</div>
          </div>
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Duration</div>
            <div className="text-arcade-cyan font-bold">
              {show.duration_minutes ? `${show.duration_minutes}m` : 'TBD'}
            </div>
          </div>
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Hosts</div>
            <div className="text-arcade-yellow font-bold">{hosts.length}</div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end z-20">
        <div className="w-12 md:w-16 h-1 bg-white/50" />
        <div className="w-6 md:w-8 h-1 bg-white/30" />
        <div className="w-3 md:w-4 h-1 bg-white/10" />
      </div>

      {/* Show icon in top left */}
      <div className="absolute top-4 left-4 z-20">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-black/50 border-2 border-white/20 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={show.name}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <Tv className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
          )}
        </div>
      </div>
    </div>
  );
}
