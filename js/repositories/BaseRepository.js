import { db } from '../data/database.js';

export class BaseRepository {
    constructor(collectionName) {
        this.collection = collectionName;
    }

    async getAll() {
        return await db.getCollection(this.collection);
    }

    async getById(id) {
        return await db.getById(this.collection, id);
    }

    async create(data) {
        return await db.insert(this.collection, data);
    }

    async update(id, data) {
        return await db.update(this.collection, id, data);
    }

    async delete(id) {
        return await db.delete(this.collection, id);
    }
    
    async archive(id) {
        return await this.update(id, { status: 'Archived', statusColor: 'bg-surface-variant text-secondary' });
    }
    
    async restore(id) {
        return await this.update(id, { status: 'Active', statusColor: 'bg-success-container/30 text-success' });
    }

    async search(query, fields) {
        return await db.search(this.collection, query, fields);
    }
}
