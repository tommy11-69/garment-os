import { BaseRepository } from './BaseRepository.js?v=5.2';
import { db } from '../data/database.js?v=5.2';

class FinanceRepository extends BaseRepository {
    constructor() {
        super('transactions');
    }

    async searchTransactions(query, filters = {}, sort = 'newest') {
        await db._delay();
        let collection = await this.getAll();
        
        // 1. Filter by Search Query
        if (query) {
            const q = query.toLowerCase();
            collection = collection.filter(t => 
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.category && t.category.toLowerCase().includes(q)) ||
                (t.referenceNo && t.referenceNo.toLowerCase().includes(q)) ||
                (t.notes && t.notes.toLowerCase().includes(q)) ||
                (t.amount && t.amount.toString().includes(q)) ||
                (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
            );
        }

        // 2. Filter by Type (Income/Expense)
        if (filters.type && filters.type !== 'all') {
            const filterType = filters.type.toLowerCase();
            collection = collection.filter(t => {
                const tType = (t.type || '').toLowerCase();
                if (filterType === 'expense') {
                    return tType === 'expense' || tType === 'payment' || t.isNegative === 1 || t.isNegative === true;
                } else if (filterType === 'income') {
                    return tType === 'income' || (tType !== 'expense' && tType !== 'payment' && !t.isNegative);
                }
                return tType === filterType;
            });
        }

        // 3. Filter by Status
        if (filters.status && filters.status !== 'all') {
            const filterStatus = filters.status.toLowerCase();
            collection = collection.filter(t => (t.status || '').toLowerCase() === filterStatus);
        }

        // 4. Filter by Payment Method
        if (filters.paymentMethod && filters.paymentMethod !== 'all') {
            const filterMethod = filters.paymentMethod.toLowerCase();
            collection = collection.filter(t => (t.paymentMethod || '').toLowerCase() === filterMethod);
        }

        // 5. Filter by Category
        if (filters.category && filters.category !== 'all') {
            const filterCat = filters.category.toLowerCase();
            collection = collection.filter(t => (t.category || '').toLowerCase() === filterCat);
        }

        // 6. Filter by Date Range (Today, Week, Month, Custom)
        if (filters.dateRange && filters.dateRange !== 'all') {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            collection = collection.filter(t => {
                const tDate = new Date(t.date);
                tDate.setHours(0,0,0,0);
                
                if (filters.dateRange === 'today') {
                    return tDate.getTime() === today.getTime();
                } else if (filters.dateRange === 'this_week') {
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    return tDate >= startOfWeek;
                } else if (filters.dateRange === 'this_month') {
                    return tDate.getMonth() === today.getMonth() && tDate.getFullYear() === today.getFullYear();
                } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
                    const itemDate = (t.date || '').split('T')[0];
                    if (itemDate) {
                        return itemDate >= filters.startDate && itemDate <= filters.endDate;
                    }
                    const s = new Date(filters.startDate);
                    s.setHours(0, 0, 0, 0);
                    const e = new Date(filters.endDate);
                    e.setHours(23, 59, 59, 999);
                    return tDate >= s && tDate <= e;
                }
                return true;
            });
        }

        // 7. Sort
        collection.sort((a, b) => {
            if (sort === 'newest') return new Date(b.date) - new Date(a.date);
            if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
            if (sort === 'highest') return b.amount - a.amount;
            if (sort === 'lowest') return a.amount - b.amount;
            if (sort === 'income_first') {
                if (a.type === 'Income' && b.type !== 'Income') return -1;
                if (b.type === 'Income' && a.type !== 'Income') return 1;
                return new Date(b.date) - new Date(a.date);
            }
            if (sort === 'expense_first') {
                if (a.type === 'Expense' && b.type !== 'Expense') return -1;
                if (b.type === 'Expense' && a.type !== 'Expense') return 1;
                return new Date(b.date) - new Date(a.date);
            }
            return 0;
        });
        
        return collection;
    }
}

export const financeRepository = new FinanceRepository();
