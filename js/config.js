/**
 * Garment OS — Centralized Frontend Configuration
 * 
 * Dynamic API Base URL resolution:
 * - When served via Cloudflare Worker (or same domain) in production or 'wrangler dev': uses same-origin '/api'
 * - When served via a split local dev server (e.g. static on :8000, express on :5000): falls back to 'http://localhost:5000/api'
 */
export function getApiBaseUrl() {
    if (typeof window !== 'undefined' && window.GARMENT_OS_CONFIG && window.GARMENT_OS_CONFIG.API_BASE_URL) {
        return window.GARMENT_OS_CONFIG.API_BASE_URL;
    }

    if (typeof window !== 'undefined' && window.location) {
        const port = window.location.port;
        const hostname = window.location.hostname;
        
        // If loaded on a static dev server port like 8000, 3000, 5500 while backend is on 5000:
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '5000' && port !== '8787') {
            return 'http://localhost:5000/api';
        }
    }

    // Default to same-origin /api in production and under Cloudflare Workers / wrangler dev (port 8787)
    return '/api';
}
