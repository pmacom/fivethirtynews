'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EpisodeNavigation as EpisodeNavigationType } from '@/stores/curateStore';

interface EpisodeNavigationProps {
  showSlug: string;
  navigation: EpisodeNavigationType | null;
  basePath?: 'curate' | 'pillar' | 'edit';
}

export function EpisodeNavigation({
  showSlug,
  navigation,
  basePath = 'curate',
}: EpisodeNavigationProps) {
  const router = useRouter();

  if (!navigation) return null;

  const { prev, next } = navigation;

  const navigateTo = (episodeId: string) => {
    router.push(`/show/${showSlug}/episode/${episodeId}/${basePath}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => prev && navigateTo(prev.id)}
        disabled={!prev}
        className="flex items-center gap-1"
        title={prev ? `${prev.title} (${formatDate(prev.date)})` : 'No previous episode'}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">
          {prev ? `#${prev.episode_number}` : 'Prev'}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => next && navigateTo(next.id)}
        disabled={!next}
        className="flex items-center gap-1"
        title={next ? `${next.title} (${formatDate(next.date)})` : 'No next episode'}
      >
        <span className="hidden sm:inline">
          {next ? `#${next.episode_number}` : 'Next'}
        </span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default EpisodeNavigation;
