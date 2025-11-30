'use client';

import { Pin, AlertTriangle, Lightbulb, HelpCircle, MessageSquare } from 'lucide-react';

interface ModCommentProps {
  id: string;
  commentText: string;
  commentType: 'note' | 'context' | 'warning' | 'highlight' | 'question';
  isPinned: boolean;
  authorName: string;
  authorAvatar?: string;
  authorRole: 'admin' | 'moderator';
  createdAt: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  context: Lightbulb,
  warning: AlertTriangle,
  highlight: Lightbulb,
  question: HelpCircle,
};

const typeColors: Record<string, string> = {
  note: 'border-l-zinc-500',
  context: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  highlight: 'border-l-green-500',
  question: 'border-l-purple-500',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  moderator: 'bg-green-500/20 text-green-400',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ModComment({
  commentText,
  commentType,
  isPinned,
  authorName,
  authorAvatar,
  authorRole,
  createdAt,
}: ModCommentProps) {
  const TypeIcon = typeIcons[commentType] || MessageSquare;

  return (
    <div
      className={`bg-zinc-800/50 rounded-lg p-3 border-l-4 ${typeColors[commentType]}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-white">{authorName}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${roleBadgeColors[authorRole]}`}>
          {authorRole}
        </span>
        {isPinned && (
          <Pin className="w-3 h-3 text-amber-400" />
        )}
        <span className="text-xs text-zinc-500 ml-auto">
          {formatRelativeTime(createdAt)}
        </span>
      </div>

      {/* Content */}
      <div className="flex gap-2">
        <TypeIcon className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
          {commentText}
        </p>
      </div>
    </div>
  );
}
