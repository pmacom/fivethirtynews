'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ChannelsTab } from './components/ChannelsTab';
import { SettingsSection } from './components/SettingsSection';

interface User {
  id: string;
  discord_id: string;
  discord_username: string;
  display_name: string;
  discord_avatar: string | null;
  is_admin: boolean;
  is_moderator: boolean;
  is_guild_member: boolean;
  created_at: string;
}

interface Stats {
  totalContent: number;
  pendingContent: number;
  approvedContent: number;
  rejectedContent: number;
  totalUsers: number;
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'channels'>('dashboard');

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch content stats
      const contentResponse = await fetch('/api/content?limit=1000');
      const contentData = await contentResponse.json();

      // Fetch pending content
      const pendingResponse = await fetch('/api/content/pending');
      const pendingData = await pendingResponse.json();

      if (contentData.success) {
        const content = contentData.data || [];
        setStats({
          totalContent: content.length,
          pendingContent: pendingData.count || 0,
          approvedContent: content.filter((c: { approval_status?: string }) => c.approval_status === 'approved' || !c.approval_status).length,
          rejectedContent: content.filter((c: { approval_status?: string }) => c.approval_status === 'rejected').length,
          totalUsers: 0, // Would need a users API endpoint
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-arcade-yellow">Admin Dashboard</h1>
            <p className="text-zinc-400 text-sm">530 Society Administration</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/moderate')}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            >
              Moderation Queue
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-8">
          <nav className="flex gap-1">
            {(['dashboard', 'users', 'content', 'channels'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-arcade-cyan border-b-2 border-arcade-cyan'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Total Content"
                value={stats?.totalContent ?? '-'}
                color="cyan"
              />
              <StatCard
                label="Pending Approval"
                value={stats?.pendingContent ?? '-'}
                color="yellow"
              />
              <StatCard
                label="Approved"
                value={stats?.approvedContent ?? '-'}
                color="green"
              />
              <StatCard
                label="Rejected"
                value={stats?.rejectedContent ?? '-'}
                color="red"
              />
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/admin/tagmaster')}
                  className="p-4 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-arcade-yellow/50 hover:border-arcade-yellow rounded-lg text-left transition-all hover:scale-105"
                >
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="font-medium text-arcade-yellow">Tag Master</div>
                  <div className="text-sm text-zinc-400">Gamified content tagging</div>
                </button>
                <button
                  onClick={() => router.push('/moderate')}
                  className="p-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-left transition-colors"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium">Review Pending Content</div>
                  <div className="text-sm text-zinc-400">
                    {stats?.pendingContent ?? 0} items waiting
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className="p-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-left transition-colors"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">Manage Content</div>
                  <div className="text-sm text-zinc-400">View all content</div>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-left transition-colors"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-zinc-400">View user list</div>
                </button>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">System Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Logged in as:</span>
                  <span className="ml-2">{user.display_name}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Role:</span>
                  <span className="ml-2 text-arcade-yellow">Administrator</span>
                </div>
                <div>
                  <span className="text-zinc-400">Discord ID:</span>
                  <span className="ml-2 font-mono">{user.discord_id}</span>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <SettingsSection />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <p className="text-zinc-400">
              User management features coming soon. Users are currently managed through Discord roles.
            </p>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Content Management</h2>
            <p className="text-zinc-400 mb-4">
              View and manage all content in the system.
            </p>
            <button
              onClick={() => router.push('/moderate')}
              className="px-4 py-2 bg-arcade-cyan text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              Go to Moderation Queue
            </button>
          </div>
        )}

        {activeTab === 'channels' && <ChannelsTab />}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-arcade-cyan',
    yellow: 'text-arcade-yellow',
    green: 'text-green-400',
    red: 'text-red-400',
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-6">
      <div className={`text-4xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
