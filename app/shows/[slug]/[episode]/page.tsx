'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, ArrowRight, Edit, LayoutGrid, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamic import of Viewer to avoid SSR issues with Three.js
const Viewer = dynamic(() => import('@/viewer/viewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span>Loading 3D Viewer...</span>
      </div>
    </div>
  ),
});

interface EpisodeData {
  show: {
    id: string;
    name: string;
    slug: string;
  };
  episode: {
    id: string;
    title: string;
    episode_number: number;
    date: string;
    status: string;
  };
  navigation: {
    prev: { id: string; episode_number: number; title: string } | null;
    next: { id: string; episode_number: number; title: string } | null;
  };
}

export default function EpisodeViewerPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const episodeNum = params.episode as string;

  const [data, setData] = useState<EpisodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEpisode() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/shows/${slug}/episodes/by-number/${episodeNum}`);
        const json = await res.json();

        if (!json.success) {
          setError(json.error || 'Failed to load episode');
          return;
        }

        setData(json.data);
      } catch (err) {
        console.error('Error fetching episode:', err);
        setError('Failed to load episode');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEpisode();
  }, [slug, episodeNum]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading episode...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400">{error || 'Episode not found'}</p>
          <Button
            variant="outline"
            onClick={() => router.push(`/shows/${slug}`)}
            className="bg-black/50 hover:bg-black/70 border-white/20 text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Show
          </Button>
        </div>
      </div>
    );
  }

  const { show, episode, navigation } = data;

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        {/* Left: Back and show info */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/shows/${slug}`)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {show.name}
          </Button>

          <div className="text-white/50">|</div>

          <span className="text-white font-medium">
            #{episode.episode_number}
          </span>
          {episode.title && (
            <span className="text-white/70 hidden sm:inline">
              {episode.title}
            </span>
          )}
        </div>

        {/* Center: Episode navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigation.prev && router.push(`/shows/${slug}/${navigation.prev.episode_number}`)}
            disabled={!navigation.prev}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">#{navigation.prev?.episode_number}</span>
          </Button>

          <span className="text-white/50 px-2">Episode {episode.episode_number}</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigation.next && router.push(`/shows/${slug}/${navigation.next.episode_number}`)}
            disabled={!navigation.next}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <span className="hidden sm:inline mr-1">#{navigation.next?.episode_number}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: Edit actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/show/${slug}/episode/${episode.id}/curate`)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Curate</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/show/${slug}/episode/${episode.id}/edit`)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {/* 3D Viewer */}
      <Viewer mode="episode" episodeId={episode.id} skipSplash={true} />
    </div>
  );
}
