/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js before the application starts.
 * We use it to ensure environment variables from .env.production are loaded
 * when running in production mode (especially important for PM2 deployments).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only load dotenv in production - Next.js handles .env.local in development
    if (process.env.NODE_ENV === 'production') {
      const dotenv = await import('dotenv');
      const path = await import('path');

      // Load .env.production from the project root
      const envPath = path.resolve(process.cwd(), '.env.production');
      const result = dotenv.config({ path: envPath });

      if (result.error) {
        console.warn('[Instrumentation] Could not load .env.production:', result.error.message);
      } else {
        console.log('[Instrumentation] Loaded environment from .env.production');

        // Log key env vars (redacted) for debugging
        console.log('[Instrumentation] Env check:', {
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT SET',
          DISCORD_REDIRECT: process.env.DISCORD_REDIRECT_URI ? 'SET' : 'NOT SET',
          NODE_ENV: process.env.NODE_ENV,
        });
      }
    }
  }
}


