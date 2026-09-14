import { getApiBaseUrl } from '../config.js?v=5.2';
import { calculateOrderRollup } from '../production/domain/workflowEngine.js?v=5.5';

class Database {
    constructor() {
        this.baseUrl = getApiBaseUrl();
    }

    async _delay(ms = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _fetchAPI(endpoint, options = {}) {
        // Ensure endpoint starts with a slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${formattedEndpoint}`;
        
        const token = localStorage.getItem('gos_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        
        // Handle unauthorized or expired token
        if (response.status === 401) {
            localStorage.removeItem('gos_token');
            window.location.replace('../auth/login.html');
            return Promise.reject(new Error("Unauthorized. Redirecting to login."));
        }
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP error ${response.status}`);
        }
        return response.json();
    }

    async getCollection(collectionName, options = {}) {
        let endpoint = `/${collectionName}`;
        if (options.limit) {
            endpoint += `?limit=${options.limit}&page=${options.page || 1}`;
        }
        return this._fetchAPI(endpoint);
    }

    async getById(collectionName, id) {
        return this._fetchAPI(`/${collectionName}/${id}`);
    }

    async insert(collectionName, data) {
        if (collectionName === 'orders') {
            const progressFields = recalculateOrderProgress(data);
            data = { ...data, ...progressFields };
        }
        return this._fetchAPI(`/${collectionName}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async update(collectionName, id, data) {
        if (collectionName === 'orders') {
            try {
                const existing = await this.getById('orders', id);
                const merged = { ...existing, ...data };
                const progressFields = recalculateOrderProgress(merged);
                data = { ...data, ...progressFields };
            } catch (e) {
                console.error("Failed to automatically recalculate progress:", e);
            }
        }
        return this._fetchAPI(`/${collectionName}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(collectionName, id) {
        await this._fetchAPI(`/${collectionName}/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    async search(collectionName, query, fields, options = {}) {
        const queryParams = new URLSearchParams({
            q: query,
            fields: fields.join(',')
        });
        
        if (options.limit) {
            queryParams.append('limit', options.limit);
            queryParams.append('page', options.page || 1);
        }

        return this._fetchAPI(`/${collectionName}?${queryParams.toString()}`);
    }
}

export const db = new Database();

function recalculateOrderProgress(order) {
    if (!order) return {};

    const roll = calculateOrderRollup(order);
    const pct = roll.overallPercentage;

    let progressColor = 'bg-primary';
    if (pct >= 90) {
        progressColor = 'bg-[#34C759]';
    } else if (pct >= 40) {
        progressColor = 'bg-[#FF9F0A]';
    }

    return {
        progressPercentage: pct,
        progressLabel: `${roll.activeStageDef.shortLabel} (${pct}%)`,
        progressColor
    };
}
