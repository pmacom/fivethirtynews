'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ProfileLink {
  label: string;
  url: string;
}

interface User {
  id: string;
  discord_id: string;
  display_name: string;
  avatar: string | null;
  is_admin: boolean;
  is_moderator: boolean;
  // Profile fields
  bio?: string | null;
  background_image_url?: string | null;
  profile_links?: ProfileLink[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Use window.location for redirect-based logout
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  // refreshUser is an alias for refreshSession - both fetch the full user data
  const refreshUser = refreshSession;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refreshSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
