'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Play, Calendar, Hash, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  date: string;
  status: string;
  scheduled_at: string | null;
}

export default function ShowPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShowData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch show and episodes in parallel
        const [showRes, episodesRes] = await Promise.all([
          fetch(`/api/shows/${slug}`),
          fetch(`/api/shows/${slug}/episodes?limit=50`),
        ]);

        const showJson = await showRes.json();
        const episodesJson = await episodesRes.json();

        if (!showJson.success) {
          setError(showJson.error || 'Show not found');
          return;
        }

        setShow(showJson.data);
        setEpisodes(episodesJson.data || []);
      } catch (err) {
        console.error('Error fetching show:', err);
        setError('Failed to load show');
      } finally {
        setIsLoading(false);
      }
    }

    fetchShowData();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span>Loading show...</span>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive">{error || 'Show not found'}</p>
          <Button variant="outline" onClick={() => router.push('/shows')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Shows
          </Button>
        </div>
      </div>
    );
  }

  // Find the latest episode with content
  const latestEpisode = episodes.find(e => e.episode_number != null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/shows')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            All Shows
          </button>

          <h1 className="text-3xl font-bold">{show.name}</h1>
          {show.description && (
            <p className="text-muted-foreground mt-2">{show.description}</p>
          )}

          {latestEpisode && (
            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => router.push(`/shows/${slug}/${latestEpisode.episode_number}`)}
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Latest (#{latestEpisode.episode_number})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Episodes List */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Episodes</h2>

        {episodes.length === 0 ? (
          <p className="text-muted-foreground">No episodes yet.</p>
        ) : (
          <div className="space-y-2">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => episode.episode_number && router.push(`/shows/${slug}/${episode.episode_number}`)}
                disabled={!episode.episode_number}
                className="w-full flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold">
                  {episode.episode_number != null ? (
                    <span>#{episode.episode_number}</span>
                  ) : (
                    <Hash className="w-5 h-5 opacity-50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {episode.title || `Episode ${episode.episode_number}`}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(episode.date || episode.scheduled_at || '')}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-muted">
                      {episode.status}
                    </span>
                  </div>
                </div>

                <Play className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
