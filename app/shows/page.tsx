'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tv, ChevronRight } from 'lucide-react';

interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export default function ShowsPage() {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShows() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/shows');
        const json = await res.json();

        if (!json.success) {
          setError(json.error || 'Failed to load shows');
          return;
        }

        setShows(json.data || []);
      } catch (err) {
        console.error('Error fetching shows:', err);
        setError('Failed to load shows');
      } finally {
        setIsLoading(false);
      }
    }

    fetchShows();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span>Loading shows...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-2">
            Browse available shows and their episodes
          </p>
        </div>
      </div>

      {/* Shows List */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {shows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No shows available.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shows.map((show) => (
              <button
                key={show.id}
                onClick={() => router.push(`/shows/${show.slug}`)}
                className="flex items-center gap-4 p-6 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary">
                  <Tv className="w-7 h-7" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">{show.name}</p>
                  {show.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {show.description}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
