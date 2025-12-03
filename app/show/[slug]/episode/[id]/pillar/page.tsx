'use client';

import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
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

export default function EpisodePillarPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const episodeId = params.id as string;

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Back button overlay */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/show/${slug}/episode/${episodeId}/curate`)}
          className="bg-black/50 hover:bg-black/70 border-white/20 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Curate
        </Button>
      </div>

      {/* 3D Pillar Viewer */}
      <Viewer mode="episode" episodeId={episodeId} skipSplash={true} />
    </div>
  );
}
