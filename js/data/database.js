class Database {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
    }

    async _delay(ms = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _fetchAPI(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
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
        return this._fetchAPI(`/${collectionName}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async update(collectionName, id, data) {
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
