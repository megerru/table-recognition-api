/**
 * API Configuration
 * 根據環境自動選擇 API 端點
 */

// Production API URL (Fly.io)
const PRODUCTION_API_URL = 'https://table-recognition-api.fly.dev';

// Development API URL (local)
const DEVELOPMENT_API_URL = '';

/**
 * 取得當前環境的 API Base URL
 */
export function getApiBaseUrl(): string {
  // 如果是 GitHub Pages (production)
  if (window.location.hostname === 'megerru.github.io') {
    return PRODUCTION_API_URL;
  }

  // 開發環境使用相對路徑（same origin）
  return DEVELOPMENT_API_URL;
}

/**
 * 建構完整的 API URL
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return baseUrl + cleanEndpoint;
}
