import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Logout endpoint - clear session
// POST /api/auth/logout

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;

  // Clear session in database if we have a token
  if (sessionToken) {
    try {
      const supabase = await createClient();
      await supabase
        .from('users')
        .update({
          session_token: null,
          session_expires_at: null,
        })
        .eq('session_token', sessionToken);
    } catch (err) {
      console.error('Error clearing session in database:', err);
    }
  }

  // Clear cookies and redirect to login
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('530_session');
  response.cookies.delete('530_user');

  return response;
}

// Also support GET for simple link-based logout
export async function GET(request: NextRequest) {
  return POST(request);
}
