'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCurateStore } from '@/stores/curateStore';
import { KanbanBoard } from '@/components/curate';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, RefreshCw, Check, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EpisodeCuratePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const episodeId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const {
    show,
    episode,
    contentWindow,
    isLoading,
    isSaving,
    error,
    includeUnapproved,
    fetchCurateData,
    setIncludeUnapproved,
    setError,
    reset,
  } = useCurateStore();

  // Fetch data on mount - reset first to clear stale data, then fetch fresh
  useEffect(() => {
    if (authLoading) return;

    // Reset state before fetching to ensure fresh data
    reset();
    fetchCurateData(slug, episodeId);

    return () => {
      reset();
    };
  }, [authLoading, slug, episodeId]);

  // Refetch when includeUnapproved changes
  useEffect(() => {
    if (!authLoading && show) {
      fetchCurateData(slug, episodeId);
    }
  }, [includeUnapproved]);

  const handleRefresh = () => {
    fetchCurateData(slug, episodeId);
  };

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

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="px-4 py-4">
          <button
            onClick={() => router.push(`/show/${slug}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {show?.name || 'Show'}
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold">Curate Episode Content</h1>
              <p className="text-muted-foreground text-sm">
                {episode?.title || 'Episode'}{' '}
                {episode?.date && `- ${formatDate(episode.date)}`}
              </p>
              {contentWindow && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Content window: {formatDate(contentWindow.since_date)} →{' '}
                  {contentWindow.until_date
                    ? formatDate(contentWindow.until_date)
                    : 'now'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Toggle for unapproved content */}
              <div className="flex items-center gap-2">
                <Switch
                  id="include-unapproved"
                  checked={includeUnapproved}
                  onCheckedChange={setIncludeUnapproved}
                />
                <Label htmlFor="include-unapproved" className="text-sm cursor-pointer">
                  Show unapproved
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')}
                />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/show/${slug}/episode/${episodeId}/pillar`)}
                className="bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/50 text-purple-300"
              >
                <Play className="w-4 h-4 mr-2" />
                3D View
              </Button>

              <Button
                size="sm"
                onClick={() => router.push(`/show/${slug}`)}
                className="bg-green-600 hover:bg-green-500"
              >
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto hover:opacity-70"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2 shadow-lg">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm">Saving...</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <KanbanBoard showSlug={slug} episodeId={episodeId} />
    </div>
  );
}
