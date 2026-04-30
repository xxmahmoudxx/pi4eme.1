export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  return `http://${host}:30000`;
}

export const BACKEND_URL = getBackendUrl();
