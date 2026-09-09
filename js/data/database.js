import { getApiBaseUrl } from '../config.js';

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

    const STAGE_SEQUENCES = {
        default:             ['Fabric', 'Cutting', 'Stitching', 'Printing/Embroidery', 'Ironing & Packing', 'Dispatch'],
        print_before_stitch: ['Fabric', 'Cutting', 'Printing/Embroidery', 'Stitching', 'Ironing & Packing', 'Dispatch'],
        wash_before_stitch:  ['Fabric', 'Cutting', 'Wash', 'Stitching', 'Printing/Embroidery', 'Ironing & Packing', 'Dispatch'],
        direct_fulfillment:  ['Procurement', 'Dispatch'],
    };

    const wf = order.workflowType || 'default';
    const stages = STAGE_SEQUENCES[wf] || STAGE_SEQUENCES.default;
    const status = order.status || 'Fabric';

    const isFinished = ['Dispatched', 'Delivered', 'Closed', 'Archived'].includes(status);
    if (isFinished) {
        return {
            progressPercentage: 100,
            progressLabel: 'Completed',
            progressColor: 'bg-[#008A00]'
        };
    }

    let stageIdx = stages.findIndex(s =>
        status.toLowerCase().includes(s.toLowerCase().split('/')[0]) ||
        s.toLowerCase().includes(status.toLowerCase())
    );
    if (stageIdx < 0) {
        return {
            progressPercentage: 0,
            progressLabel: status,
            progressColor: 'bg-surface-variant'
        };
    }

    const numStages = stages.length;
    const baseProgress = (stageIdx / numStages) * 100;

    const tasks = order.tasks || [];
    let parsedTasks = tasks;
    if (typeof tasks === 'string') {
        try { parsedTasks = JSON.parse(tasks); } catch { parsedTasks = []; }
    }
    if (!Array.isArray(parsedTasks)) parsedTasks = [];

    let taskPct = 0;
    if (parsedTasks.length > 0) {
        const completedTasks = parsedTasks.filter(t => t.completed === true || t.status === 'Completed' || t.status === 'completed').length;
        taskPct = completedTasks / parsedTasks.length;
    }

    const progressWeight = 100 / numStages;
    const progressPercentage = Math.round(baseProgress + (taskPct * progressWeight));

    let progressColor = 'bg-primary';
    if (progressPercentage >= 90) {
        progressColor = 'bg-[#008A00]';
    } else if (progressPercentage >= 40) {
        progressColor = 'bg-[#FF9F0A]';
    }

    let progressLabel = status;
    if (parsedTasks.length > 0) {
        const completedTasks = parsedTasks.filter(t => t.completed === true || t.status === 'Completed' || t.status === 'completed').length;
        progressLabel = `${status} (${completedTasks}/${parsedTasks.length} tasks)`;
    }

    return {
        progressPercentage,
        progressLabel,
        progressColor
    };
}
