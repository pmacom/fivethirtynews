'use client';

import { TrendingUp, Sparkles, AlertCircle, Zap, BookOpen, Play, MessageCircle, Wrench } from 'lucide-react';

interface LabelBadgeProps {
  slug: string;
  name: string;
  color: string;
  textColor: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'trending-up': TrendingUp,
  'sparkles': Sparkles,
  'alert-circle': AlertCircle,
  'zap': Zap,
  'book-open': BookOpen,
  'play': Play,
  'message-circle': MessageCircle,
  'wrench': Wrench,
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export default function LabelBadge({
  slug,
  name,
  color,
  textColor,
  icon,
  size = 'md',
}: LabelBadgeProps) {
  const IconComponent = icon ? iconMap[icon] : null;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-lg shadow-md transition-transform hover:scale-105 ${sizeClasses[size]}`}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      title={name}
    >
      {IconComponent && <IconComponent className={iconSizes[size]} />}
      <span>{name}</span>
    </span>
  );
}
