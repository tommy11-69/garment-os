// js/services/NotificationService.js
import { api } from './api.js?v=5.2';

const NOTIF_STORAGE_KEY = 'gos_notifications_v1';
const SETTINGS_STORAGE_KEY = 'gos_notification_settings_v1';

class NotificationService {
    constructor() {
        this.settings = this.loadSettings();
        this.notifications = this.loadNotifications();
        this.listeners = new Set();

        this.init();
    }

    init() {
        // Register Service Worker if supported
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.warn('SW Registration warning:', err);
            });
        }

        // Run automated checks on startup and every 10 minutes
        setTimeout(() => this.checkAutomatedRules(), 3000);
        setInterval(() => this.checkAutomatedRules(), 10 * 60 * 1000);
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return {
            expenseReminder: true,
            expenseReminderTime: "20:00", // 8:00 PM
            orderReminder: true,
            milestoneAlerts: true,
            lastExpenseCheckDate: "",
            lastOrderCheckDate: ""
        };
    }

    saveSettings() {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
        } catch (_) {}
        this.notifyListeners();
    }

    loadNotifications() {
        try {
            const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return [
            {
                id: 'welcome_' + Date.now(),
                title: 'Welcome to Garment OS Notifications',
                message: 'Stay updated with daily expense reminders, order alerts, and production milestones.',
                type: 'info',
                read: false,
                timestamp: new Date().toISOString()
            }
        ];
    }

    saveNotifications() {
        try {
            localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(this.notifications));
        } catch (_) {}
        this.notifyListeners();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners() {
        this.listeners.forEach(l => l(this.notifications, this.settings));
    }

    // Request OS Browser permission
    async requestPermission() {
        if (!('Notification' in window)) {
            if (window.showToast) window.showToast('Browser does not support desktop notifications', 'warning');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            if (window.showToast) window.showToast('Notifications enabled!', 'success');
            this.send({
                title: 'Notifications Enabled 🎉',
                message: 'You will now receive daily reminders and production alerts.',
                type: 'success'
            });
            return true;
        } else {
            if (window.showToast) window.showToast('Notification permission denied', 'warning');
            return false;
        }
    }

    // Trigger notification (Both Native System Popup & In-App List)
    send({ title, message, type = 'info', actionUrl = '/pages/dashboard.html' }) {
        const item = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title,
            message,
            type,
            actionUrl,
            read: false,
            timestamp: new Date().toISOString()
        };

        this.notifications.unshift(item);
        if (this.notifications.length > 50) this.notifications.pop(); // Cap at 50
        this.saveNotifications();

        // Native Browser OS Popup
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, {
                            body: message,
                            icon: '/assets/icon-192.png',
                            badge: '/assets/icon-192.png',
                            data: { url: actionUrl }
                        });
                    });
                } else {
                    new Notification(title, {
                        body: message,
                        icon: '/assets/icon-192.png'
                    });
                }
            } catch (err) {
                console.warn('Native notification failed:', err);
            }
        }
    }

    // ── Automated Rule Engine ──
    async checkAutomatedRules() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentHoursMinutes = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        // 1. Daily Night Expense Reminder
        if (this.settings.expenseReminder && this.settings.lastExpenseCheckDate !== todayStr) {
            const targetTime = this.settings.expenseReminderTime || "20:00";
            if (currentHoursMinutes >= targetTime) {
                // Check if expenses were logged today
                try {
                    const billings = await api.getBillings().catch(() => []);
                    const loggedToday = Array.isArray(billings) && billings.some(b => {
                        const bDate = new Date(b.createdAt || b.date).toISOString().split('T')[0];
                        return bDate === todayStr;
                    });

                    if (!loggedToday) {
                        this.send({
                            title: "Daily Expense Reminder 💸",
                            message: "Don't forget to input today's factory expenses, bills, and purchase receipts!",
                            type: 'warning',
                            actionUrl: '/pages/more.html'
                        });
                    }

                    this.settings.lastExpenseCheckDate = todayStr;
                    this.saveSettings();

                } catch (e) {
                    console.warn('Expense check error:', e);
                }
            }
        }

        // 2. Inactivity Order Nudge
        if (this.settings.orderReminder && this.settings.lastOrderCheckDate !== todayStr) {
            if (currentHoursMinutes >= "19:00") { // 7:00 PM
                try {
                    const costings = await api.getCostings().catch(() => []);
                    const loggedToday = Array.isArray(costings) && costings.some(c => {
                        const cDate = new Date(c.createdAt || c.date).toISOString().split('T')[0];
                        return cDate === todayStr;
                    });

                    if (!loggedToday) {
                        this.send({
                            title: "Daily Order & Costing Check 📋",
                            message: "No new orders logged today. Need to draft a quick quote or cost calculation?",
                            type: 'info',
                            actionUrl: '/pages/calculator.html'
                        });
                    }

                    this.settings.lastOrderCheckDate = todayStr;
                    this.saveSettings();

                } catch (e) {
                    console.warn('Order check error:', e);
                }
            }
        }
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
    }

    markAsRead(id) {
        const item = this.notifications.find(n => n.id === id);
        if (item) {
            item.read = true;
            this.saveNotifications();
        }
    }

    clearAll() {
        this.notifications = [];
        this.saveNotifications();
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        if (newSettings.expenseReminder || newSettings.orderReminder) {
            this.requestPermission();
        }
    }
}

export const notificationService = new NotificationService();
window.notificationService = notificationService;
