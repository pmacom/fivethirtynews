'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  X,
  Tag,
  Save,
  Edit2,
} from 'lucide-react';
import { EmojiPicker } from '@/components/EmojiPicker';
import { TagChannelSelector } from '@/components/TagChannelSelector';

interface CategoryTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  tags: string[];
}


export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user, isLoading: authLoading } = useAuth();

  const [templates, setTemplates] = useState<CategoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showName, setShowName] = useState<string>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CategoryTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    tags: [] as string[],
  });
  const [saving, setSaving] = useState(false);


  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/shows/${slug}/templates`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch templates');
        return;
      }

      setTemplates(data.data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    }
  }, [slug]);

  // Fetch show info
  const fetchShow = useCallback(async () => {
    try {
      const res = await fetch(`/api/shows/${slug}`);
      const data = await res.json();

      if (data.success && data.data) {
        setShowName(data.data.name);
      }
    } catch (err) {
      console.error('Error fetching show:', err);
    }
  }, [slug]);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);
    Promise.all([fetchShow(), fetchTemplates()]).finally(() => {
      setLoading(false);
    });
  }, [authLoading, fetchShow, fetchTemplates]);


  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Open modal for new template
  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', slug: '', description: '', icon: '', tags: [] });
    setShowModal(true);
  };

  // Open modal for editing
  const handleEditTemplate = (template: CategoryTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      slug: template.slug,
      description: template.description || '',
      icon: template.icon || '',
      tags: template.tags || [],
    });
    setShowModal(true);
  };

  // Save template
  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      setError('Name and slug are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate
        ? `/api/shows/${slug}/templates/${editingTemplate.id}`
        : `/api/shows/${slug}/templates`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save template');
        return;
      }

      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Delete template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const res = await fetch(`/api/shows/${slug}/templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete template');
        return;
      }

      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };


  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTemplates = [...templates];
    const [draggedItem] = newTemplates.splice(draggedIndex, 1);
    newTemplates.splice(index, 0, draggedItem);
    setTemplates(newTemplates);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    // Save new order
    try {
      const templateIds = templates.map((t) => t.id);
      await fetch(`/api/shows/${slug}/templates/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_ids: templateIds }),
      });
    } catch (err) {
      console.error('Error saving order:', err);
      fetchTemplates(); // Revert on error
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/show/${slug}`)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {showName || 'Show'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Category Templates</h1>
              <p className="text-zinc-400 mt-1">
                Define content categories for your show's episodes
              </p>
            </div>
            <button
              onClick={handleAddTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <Tag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Category Templates</h3>
            <p className="text-zinc-400 mb-4">
              Create templates to auto-populate episode content
            </p>
            <button
              onClick={handleAddTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Create First Category
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template, index) => (
              <div
                key={template.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="cursor-grab text-zinc-600 hover:text-zinc-400">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="text-2xl">{template.icon || '📁'}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{template.name}</h3>
                    {!template.is_active && (
                      <span className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-zinc-400 truncate">
                      {template.description}
                    </p>
                  )}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 5 && (
                        <span className="text-xs text-zinc-500">
                          +{template.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold">
                {editingTemplate ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Icon */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Icon</label>
                <EmojiPicker
                  value={formData.icon}
                  onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
                  placeholder="Select icon"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: editingTemplate ? formData.slug : generateSlug(name),
                    });
                  }}
                  placeholder="AI News"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                  }
                  placeholder="ai-news"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Latest AI developments and news"
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Tags & Channels */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tags & Channels</label>
                <p className="text-xs text-zinc-500 mb-3">
                  Content with these tags/channels will be auto-suggested for this category
                </p>
                <TagChannelSelector
                  selectedTags={formData.tags}
                  onTagsChange={(tags) => setFormData({ ...formData, tags })}
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.slug}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
