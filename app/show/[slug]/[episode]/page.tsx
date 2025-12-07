'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft } from 'lucide-react';
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
            onClick={() => router.push(`/show/${slug}`)}
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

  // All UI is now handled by Viewer - just pass props
  return (
    <div className="w-full h-screen bg-black">
      <Viewer
        mode="episode"
        episodeId={episode.id}
        showSlug={slug}
        showName={show.name}
        episodeNumber={episode.episode_number}
        episodeTitle={episode.title}
        navigation={navigation}
        skipSplash={true}
      />
    </div>
  );
}
