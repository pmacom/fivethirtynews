'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Trash2, Plus, Loader2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import '@/viewer/ui/stageselect/styles.css';

interface ProfileLink {
  label: string;
  url: string;
}

const MAX_BIO_LENGTH = 200;
const MAX_LINKS = 4;
const MAX_LABEL_LENGTH = 50;

export default function MyProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/characters/me');
    }
  }, [authLoading, isAuthenticated, router]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setBio((user as any).bio || '');
      setLinks((user as any).profile_links || []);
      setBackgroundImage((user as any).background_image_url || null);
    }
  }, [user]);

  // Handle ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/characters');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bio: bio || null,
          profile_links: links,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to save profile');
        return;
      }

      // Refresh user data
      await refreshUser?.();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [bio, links, refreshUser]);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/users/profile/image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to upload image');
        return;
      }

      setBackgroundImage(data.data.background_image_url);
      await refreshUser?.();
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, [refreshUser]);

  const handleRemoveImage = useCallback(async () => {
    setError(null);
    setUploadingImage(true);

    try {
      const response = await fetch('/api/users/profile/image', {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to remove image');
        return;
      }

      setBackgroundImage(null);
      await refreshUser?.();
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    } finally {
      setUploadingImage(false);
    }
  }, [refreshUser]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Invalid file type. Allowed: JPEG, PNG, WebP');
        return;
      }
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('File too large. Maximum size: 2MB');
        return;
      }
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const addLink = useCallback(() => {
    if (links.length < MAX_LINKS) {
      setLinks([...links, { label: '', url: '' }]);
    }
  }, [links]);

  const removeLink = useCallback((index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  }, [links]);

  const updateLink = useCallback((index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  }, [links]);

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-arcade-cyan animate-pulse text-xl font-orbitron">LOADING...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const remainingChars = MAX_BIO_LENGTH - bio.length;

  return (
    <div className="min-h-screen bg-black text-white font-orbitron select-none">
      {/* Background Effects */}
      <div className="fixed inset-0 grid-bg opacity-30" />
      <div className="fixed inset-0 scanlines opacity-10 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6 md:mb-8">
          <button
            onClick={() => router.push('/characters')}
            className="flex items-center justify-center w-10 h-10
                       text-white/50 hover:text-white border-2 border-white/20 hover:border-white/50
                       rounded transition-all hover:scale-110 bg-black/50"
            title="Back (Esc)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-arcade-cyan text-xs md:text-sm tracking-[0.3em]">
              PLAYER CUSTOMIZATION
            </h2>
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
              MY PROFILE
            </h1>
          </div>
        </header>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm font-share-tech flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="p-1 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm font-share-tech">
            Profile saved successfully!
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 space-y-6">
          {/* Background Image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70 font-share-tech tracking-wider">
              BACKGROUND IMAGE
            </label>
            <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border-2 border-white/20 hover:border-white/30 transition-colors">
              {backgroundImage ? (
                <>
                  <img
                    src={backgroundImage}
                    alt="Profile background"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-800/50 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="w-10 h-10 text-arcade-cyan animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-white/40 mb-2" />
                      <span className="text-sm text-white/50 font-share-tech">Click to upload</span>
                      <span className="text-xs text-white/30 mt-1 font-share-tech">JPEG, PNG, WebP • Max 2MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-white/70 font-share-tech tracking-wider">
                BIO
              </label>
              <span className={`text-xs font-share-tech ${remainingChars < 20 ? 'text-arcade-yellow' : 'text-white/40'}`}>
                {remainingChars} CHARS LEFT
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-900 border-2 border-white/20 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none resize-none font-share-tech"
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-white/70 font-share-tech tracking-wider">
                LINKS
              </label>
              <span className="text-xs text-white/40 font-share-tech">
                {links.length}/{MAX_LINKS}
              </span>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(index, 'label', e.target.value.slice(0, MAX_LABEL_LENGTH))}
                    placeholder="Label"
                    className="w-28 px-3 py-2 bg-zinc-900 border-2 border-white/20 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none text-sm font-share-tech"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-zinc-900 border-2 border-white/20 rounded-lg text-white placeholder-white/30 focus:border-arcade-cyan focus:outline-none text-sm font-share-tech"
                  />
                  <button
                    onClick={() => removeLink(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border-2 border-transparent hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {links.length < MAX_LINKS && (
                <button
                  onClick={addLink}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-arcade-cyan hover:bg-arcade-cyan/10 rounded-lg border-2 border-dashed border-white/20 hover:border-arcade-cyan/50 transition-colors w-full justify-center font-share-tech"
                >
                  <Plus className="w-4 h-4" />
                  ADD LINK
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer / Action Buttons */}
        <footer className="mt-8 pt-6 border-t-2 border-white/10">
          <div className="flex gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-6 py-4
                         bg-white/5 hover:bg-white/10 border-2 border-white/30 hover:border-white/50
                         text-white/70 hover:text-white rounded-lg transition-all
                         font-share-tech text-lg tracking-wider disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
              BACK
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4
                         bg-arcade-cyan/20 hover:bg-arcade-cyan/30 border-2 border-arcade-cyan
                         text-arcade-cyan hover:text-white rounded-lg transition-all
                         font-share-tech text-lg tracking-wider disabled:opacity-50
                         shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  SAVING...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  SAVE CHANGES
                </>
              )}
            </button>
          </div>
          <p className="text-center text-white/40 font-share-tech text-xs mt-3 tracking-wider">
            Press ESC to go back
          </p>
        </footer>
      </div>
    </div>
  );
}
