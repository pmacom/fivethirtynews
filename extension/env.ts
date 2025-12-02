// Environment configuration injected at build time by Vite
// These values are replaced during the build process

export const ENV = {
  API_URL: __API_URL__,
  APP_URL: __APP_URL__,
  IS_DEV: __IS_DEV__,
  ENV_NAME: __ENV_NAME__,
  ENV_COLOR: __ENV_COLOR__,
} as const;

// Type declarations for Vite's define replacements
declare const __API_URL__: string;
declare const __APP_URL__: string;
declare const __IS_DEV__: boolean;
declare const __ENV_NAME__: 'development' | 'production';
declare const __ENV_COLOR__: string;

// Helper to log environment info on load
export function logEnvironment(): void {
  const style = `
    background: ${ENV.ENV_COLOR};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
  `;
  console.log(`%c530 News (${ENV.ENV_NAME})`, style, `→ ${ENV.API_URL}`);
}
