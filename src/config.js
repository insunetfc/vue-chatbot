function getDefaultGoogleRedirectUri() {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/auth/google/callback`;
  }

  return 'http://localhost:5173/auth/google/callback';
}

export const API_HOST =
  process.env.VUE_APP_API_HOST ?? process.env.API_HOST ?? 'http://localhost:3000';

export const GOOGLE_CLIENT_ID =
  process.env.VUE_APP_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? '';

export const GOOGLE_REDIRECT_URI =
  process.env.VUE_APP_GOOGLE_REDIRECT_URI ??
  process.env.GOOGLE_REDIRECT_URI ??
  getDefaultGoogleRedirectUri();
