import { environment } from '../../environments/environment';

export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://pi4emebackend.onrender.com';
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'https://pi4emebackend.onrender.com';
  }
  return environment.apiUrl;
}

export const BACKEND_URL = getBackendUrl();
