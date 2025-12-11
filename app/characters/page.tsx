'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink, User, ArrowLeft } from 'lucide-react';
import { useCharactersStore } from '@/viewer/ui/characters/store';
import {
  Character,
  getCharacterRole,
  getCharacterRoleColor,
  getAvatarUrl,
} from '@/viewer/ui/characters/types';
import { GlobalSettingsButton } from '@/viewer/ui/components/GlobalSettingsButton';
import { useAuth } from '@/contexts/AuthContext';
import '@/viewer/ui/stageselect/styles.css';

export default function CharactersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const {
    characters,
    loading,
    error,
    selectedIndex,
    fetchCharacters,
    setSelectedIndex,
  } = useCharactersStore();

  const selectedCharacter = characters[selectedIndex] || null;

  // Fetch characters on mount
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

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
      const len = characters.length;
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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [characters.length, selectedIndex, setSelectedIndex, router]);

  const handleClose = useCallback(() => {
    router.push('/');
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
          onClick={handleClose}
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
              INSERT COIN
            </h2>
            <h1 className="text-3xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              SELECT CHARACTER
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
            <div className="text-arcade-cyan animate-pulse text-xl">LOADING ROSTER...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-arcade-red text-xl">{error}</div>
          </div>
        ) : characters.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/50 text-xl">NO CHARACTERS FOUND</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-8 min-h-0">
            {/* Left: Character Grid */}
            <div className="w-full md:w-1/2 lg:w-2/5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {characters.map((character, index) => (
                  <CharacterTile
                    key={character.id}
                    character={character}
                    index={index}
                    isSelected={selectedIndex === index}
                    onSelect={() => setSelectedIndex(index)}
                  />
                ))}
              </div>
            </div>

            {/* Right: Preview Card */}
            <div className="w-full md:w-1/2 lg:w-3/5 h-64 md:h-auto">
              {selectedCharacter && (
                <CharacterPreview character={selectedCharacter} index={selectedIndex} />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-6 md:mt-8 text-center space-y-2">
          <div className="inline-block bg-arcade-red/20 border border-arcade-red/50 px-6 md:px-8 py-2 skew-x-[-20deg]">
            <p className="text-arcade-red font-bold animate-pulse skew-x-[20deg] tracking-widest text-sm md:text-base">
              SELECT YOUR FIGHTER
            </p>
          </div>
          <p className="text-white/40 font-share-tech text-[10px] md:text-xs tracking-[0.2em] uppercase">
            ←→↑↓ Navigate • Esc Back
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

      {/* My Profile Button - Bottom Right */}
      {isAuthenticated && (
        <button
          onClick={() => router.push('/characters/me')}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3
                     bg-arcade-cyan/20 hover:bg-arcade-cyan/30 border-2 border-arcade-cyan/50 hover:border-arcade-cyan
                     text-arcade-cyan hover:text-white rounded-lg transition-all hover:scale-105
                     font-share-tech text-sm tracking-wider backdrop-blur-sm
                     shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]"
          title="Edit your profile"
        >
          <User className="w-5 h-5" />
          <span className="hidden sm:inline">MY PROFILE</span>
        </button>
      )}
    </div>
  );
}

// --- Character Tile Component ---

interface CharacterTileProps {
  character: Character;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function CharacterTile({ character, index, isSelected, onSelect }: CharacterTileProps) {
  const avatarUrl = getAvatarUrl(character);
  const roleColor = getCharacterRoleColor(character);

  return (
    <button
      onClick={onSelect}
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
        <img
          src={avatarUrl}
          alt={character.display_name}
          className={`
            w-12 h-12 md:w-16 md:h-16 rounded-full object-cover
            transition-all duration-300 ring-2
            ${isSelected
              ? 'scale-110 ring-arcade-yellow drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]'
              : 'ring-white/20 grayscale opacity-60'
            }
          `}
          onError={(e) => {
            e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
          }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />

      {/* Selection label */}
      {isSelected && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-arcade-yellow text-black text-xs font-bold px-2 py-0.5 skew-x-[10deg] whitespace-nowrap z-10">
          P{index + 1}
        </div>
      )}
    </button>
  );
}

// --- Character Preview Component ---

interface CharacterPreviewProps {
  character: Character;
  index: number;
}

function CharacterPreview({ character, index }: CharacterPreviewProps) {
  const avatarUrl = getAvatarUrl(character);
  const role = getCharacterRole(character);
  const roleColor = getCharacterRoleColor(character);

  return (
    <div className="w-full h-full border-4 border-white/20 bg-black/80 relative overflow-hidden">
      {/* Background Image or Gradient */}
      <div className="absolute inset-0">
        {character.background_image_url ? (
          <img
            src={character.background_image_url}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className={`w-full h-full opacity-30 bg-gradient-to-br ${roleColor.replace('text-', 'from-')} to-black`} />
        )}
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 space-y-3 md:space-y-4">
        {/* Name + Role Row */}
        <div className="flex items-end justify-between border-b-2 border-white/20 pb-3 md:pb-4">
          <div>
            <h2
              className={`text-2xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter ${roleColor}`}
              style={{ textShadow: '0 0 30px currentColor' }}
            >
              {character.display_name}
            </h2>
            <p className="text-white/70 font-share-tech text-sm md:text-base tracking-widest">
              {role}
              {character.shows.length > 0 && (
                <span className="text-white/50">
                  {' • '}Host of {character.shows.map((s) => s.name).join(', ')}
                </span>
              )}
            </p>
          </div>
          <div className="text-3xl md:text-5xl opacity-20 font-black hidden sm:block">
            0{index + 1}
          </div>
        </div>

        {/* Bio */}
        {character.bio && (
          <p className="text-white/80 font-share-tech text-sm md:text-base leading-relaxed line-clamp-3">
            {character.bio}
          </p>
        )}

        {/* Links */}
        {character.profile_links && character.profile_links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {character.profile_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20
                           border border-white/20 rounded text-xs font-share-tech text-white/80
                           hover:text-white transition-colors"
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 font-share-tech text-xs md:text-sm pt-2">
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Role</div>
            <div className={`font-bold ${roleColor}`}>{role}</div>
          </div>
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Shows</div>
            <div className="text-arcade-cyan font-bold">{character.shows.length}</div>
          </div>
          <div>
            <div className="text-white/40 uppercase text-[10px] md:text-xs">Status</div>
            <div className="text-arcade-yellow font-bold">ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end z-20">
        <div className="w-12 md:w-16 h-1 bg-white/50" />
        <div className="w-6 md:w-8 h-1 bg-white/30" />
        <div className="w-3 md:w-4 h-1 bg-white/10" />
      </div>

      {/* Avatar in top left */}
      <div className="absolute top-4 left-4 z-20">
        <img
          src={avatarUrl}
          alt={character.display_name}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-white/20"
          onError={(e) => {
            e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
          }}
        />
      </div>
    </div>
  );
}
