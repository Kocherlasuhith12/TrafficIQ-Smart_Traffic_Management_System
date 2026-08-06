// Dynamic configuration for backend API and WebSocket connections
const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin;
};

const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const apiOrigin = getApiUrl();
  // Convert http/https to ws/wss protocols
  return apiOrigin.replace(/^http/, 'ws');
};

export const API_BASE_URL = getApiUrl().replace(/\/$/, ''); // Remove trailing slash if present
export const WS_BASE_URL = getWsUrl().replace(/\/$/, '');
