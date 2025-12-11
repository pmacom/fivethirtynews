'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Upload, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileLink {
  label: string;
  url: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const MAX_BIO_LENGTH = 200;
const MAX_LINKS = 4;
const MAX_LABEL_LENGTH = 50;

export function ProfileEditModal({ isOpen, onClose, onSave }: ProfileEditModalProps) {
  const { user, refreshUser } = useAuth();

  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user && isOpen) {
      setBio((user as any).bio || '');
      setLinks((user as any).profile_links || []);
      setBackgroundImage((user as any).background_image_url || null);
    }
  }, [user, isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = useCallback(async () => {
    setError(null);
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
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [bio, links, onClose, onSave, refreshUser]);

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
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, []);

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
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    } finally {
      setUploadingImage(false);
    }
  }, []);

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

  if (!isOpen) return null;

  const remainingChars = MAX_BIO_LENGTH - bio.length;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-white/20 rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Background Image */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Background Image
            </label>
            <div className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
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
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-700/50 transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/40 mb-2" />
                      <span className="text-sm text-white/40">Click to upload</span>
                      <span className="text-xs text-white/30 mt-1">JPEG, PNG, WebP • Max 2MB</span>
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
              <label className="block text-sm font-medium text-white/70">
                Bio
              </label>
              <span className={`text-xs ${remainingChars < 20 ? 'text-yellow-400' : 'text-white/40'}`}>
                {remainingChars} characters left
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-white/30 focus:outline-none resize-none"
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-white/70">
                Links
              </label>
              <span className="text-xs text-white/40">
                {links.length}/{MAX_LINKS}
              </span>
            </div>

            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(index, 'label', e.target.value.slice(0, MAX_LABEL_LENGTH))}
                    placeholder="Label"
                    className="w-24 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-white/30 focus:outline-none text-sm"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-white/30 focus:outline-none text-sm"
                  />
                  <button
                    onClick={() => removeLink(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {links.length < MAX_LINKS && (
                <button
                  onClick={addLink}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg border border-dashed border-white/20 hover:border-white/40 transition-colors w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Link
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditModal;
