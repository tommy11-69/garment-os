// js/components/notificationCenter.js
import { notificationService as ns } from '../services/NotificationService.js?v=5.2';

let currentTab = 'list'; // 'list' or 'settings'

export function openNotificationCenter() {
    let modal = document.getElementById('notif-center-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notif-center-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-200';
        document.body.appendChild(modal);
    }

    renderModalContent(modal);
    modal.classList.remove('hidden');

    // Subscribe to live updates
    const unsubscribe = ns.subscribe(() => {
        if (!modal.classList.contains('hidden')) {
            renderModalContent(modal);
        }
        updateTopbarBadge();
    });

    modal.dataset.unsubscribe = unsubscribe;
}

export function closeNotificationCenter() {
    const modal = document.getElementById('notif-center-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function updateTopbarBadge() {
    const count = ns.getUnreadCount();
    const badges = document.querySelectorAll('.notif-badge');
    badges.forEach(b => {
        if (count > 0) {
            b.classList.remove('hidden');
            b.textContent = count > 9 ? '9+' : count;
        } else {
            b.classList.add('hidden');
        }
    });
}

function renderModalContent(modal) {
    const notifs = ns.notifications;
    const settings = ns.settings;
    const unreadCount = ns.getUnreadCount();
    const isGranted = 'Notification' in window && Notification.permission === 'granted';

    modal.innerHTML = `
        <div class="bg-surface dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-800 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            <!-- Header -->
            <div class="p-4 border-b border-outline-variant/30 dark:border-slate-800 flex items-center justify-between bg-surface-container-lowest/60 dark:bg-slate-900/60">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">notifications</span>
                    </div>
                    <div>
                        <h3 class="text-[16px] font-bold text-on-surface dark:text-white flex items-center gap-2">
                            Notifications
                            ${unreadCount > 0 ? `<span class="bg-error text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">${unreadCount} new</span>` : ''}
                        </h3>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Tab Toggle -->
                    <div class="inline-flex bg-surface-container-high dark:bg-slate-800 p-0.5 rounded-xl border border-outline-variant/20">
                        <button type="button" id="notif-tab-list" class="px-3 py-1 text-[12px] font-bold rounded-lg ${currentTab === 'list' ? 'bg-surface dark:bg-slate-700 text-on-surface dark:text-white shadow-sm' : 'text-secondary'}">
                            Alerts
                        </button>
                        <button type="button" id="notif-tab-settings" class="px-3 py-1 text-[12px] font-bold rounded-lg ${currentTab === 'settings' ? 'bg-surface dark:bg-slate-700 text-on-surface dark:text-white shadow-sm' : 'text-secondary'}">
                            Settings
                        </button>
                    </div>
                    <button type="button" id="notif-close-btn" class="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center text-secondary transition-colors">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                ${currentTab === 'list' ? renderListTab(notifs) : renderSettingsTab(settings, isGranted)}
            </div>

            <!-- Footer -->
            ${currentTab === 'list' && notifs.length > 0 ? `
                <div class="p-3 border-t border-outline-variant/30 dark:border-slate-800 bg-surface-container-lowest/60 dark:bg-slate-900/60 flex items-center justify-between">
                    <button type="button" id="notif-read-all-btn" class="text-[12px] font-bold text-primary hover:underline">Mark all as read</button>
                    <button type="button" id="notif-clear-all-btn" class="text-[12px] font-semibold text-error hover:underline">Clear history</button>
                </div>
            ` : ''}

        </div>
    `;

    // Bind modal actions
    modal.querySelector('#notif-close-btn')?.addEventListener('click', closeNotificationCenter);
    modal.querySelector('#notif-tab-list')?.addEventListener('click', () => { currentTab = 'list'; renderModalContent(modal); });
    modal.querySelector('#notif-tab-settings')?.addEventListener('click', () => { currentTab = 'settings'; renderModalContent(modal); });
    modal.querySelector('#notif-read-all-btn')?.addEventListener('click', () => { ns.markAllAsRead(); updateTopbarBadge(); });
    modal.querySelector('#notif-clear-all-btn')?.addEventListener('click', () => { ns.clearAll(); updateTopbarBadge(); });

    if (currentTab === 'settings') {
        modal.querySelector('#notif-enable-btn')?.addEventListener('click', () => ns.requestPermission());
        modal.querySelector('#notif-test-btn')?.addEventListener('click', () => {
            ns.send({
                title: 'Test Notification 🔔',
                message: 'Smart notifications are active and working on Garment OS!',
                type: 'success'
            });
            if (window.showToast) window.showToast('Test notification sent!', 'success');
        });

        modal.querySelector('#toggle-expense-rem')?.addEventListener('change', (e) => {
            ns.updateSettings({ expenseReminder: e.target.checked });
        });
        modal.querySelector('#toggle-order-rem')?.addEventListener('change', (e) => {
            ns.updateSettings({ orderReminder: e.target.checked });
        });
        modal.querySelector('#input-expense-time')?.addEventListener('change', (e) => {
            ns.updateSettings({ expenseReminderTime: e.target.value });
        });
    }
}

function renderListTab(notifs) {
    if (!notifs || notifs.length === 0) {
        return `
            <div class="py-12 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined text-[48px] text-secondary/40 mb-2">notifications_off</span>
                <p class="text-[14px] font-semibold text-on-surface dark:text-slate-200">No notifications yet</p>
                <p class="text-[12px] text-secondary">You're all caught up!</p>
            </div>
        `;
    }

    return notifs.map(n => {
        const iconName = n.type === 'warning' ? 'warning' : (n.type === 'success' ? 'check_circle' : 'info');
        const iconColor = n.type === 'warning' ? 'text-error bg-error/10' : (n.type === 'success' ? 'text-[#34C759] bg-[#34C759]/10' : 'text-primary bg-primary/10');
        const timeAgo = formatTimeAgo(n.timestamp);

        return `
            <div class="p-3.5 rounded-2xl border ${n.read ? 'bg-surface-container-lowest/50 dark:bg-slate-800/40 border-outline-variant/20 dark:border-slate-800' : 'bg-primary/5 border-primary/20 dark:bg-blue-950/20'} flex items-start gap-3 cursor-pointer hover:opacity-90 transition-all"
                 onclick="window.handleNotifClick('${n.id}', '${n.actionUrl}')">
                <div class="w-9 h-9 rounded-full ${iconColor} flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-[20px]">${iconName}</span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <h4 class="text-[14px] font-bold text-on-surface dark:text-white leading-snug">${n.title}</h4>
                        <span class="text-[10px] text-secondary font-medium shrink-0">${timeAgo}</span>
                    </div>
                    <p class="text-[12.5px] text-secondary dark:text-slate-300 leading-relaxed">${n.message}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderSettingsTab(settings, isGranted) {
    return `
        <div class="flex flex-col gap-4">
            <!-- OS Permission Card -->
            <div class="p-4 rounded-2xl bg-surface-container-lowest/80 dark:bg-slate-800/60 border border-outline-variant/30 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[24px] ${isGranted ? 'text-[#34C759]' : 'text-error'}">
                        ${isGranted ? 'verified' : 'notifications_active'}
                    </span>
                    <div>
                        <h4 class="text-[13px] font-bold text-on-surface dark:text-white">Desktop / Phone Popups</h4>
                        <p class="text-[11px] text-secondary">${isGranted ? 'Permission Granted' : 'Enable system popups when minimized'}</p>
                    </div>
                </div>
                ${!isGranted ? `
                    <button type="button" id="notif-enable-btn" class="px-3 py-1.5 text-[12px] font-bold bg-primary text-white rounded-xl shadow-sm hover:opacity-90 transition-all">
                        Enable Popups
                    </button>
                ` : `
                    <span class="text-[11px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-1 rounded-full">Active</span>
                `}
            </div>

            <!-- Automated Reminders Form -->
            <div class="flex flex-col gap-3">
                <h4 class="text-[13px] font-bold text-on-surface dark:text-white uppercase tracking-wider text-secondary">Automated Smart Reminders</h4>
                
                <!-- Daily Expense Reminder -->
                <div class="p-3.5 rounded-2xl bg-surface-container-lowest/60 dark:bg-slate-800/40 border border-outline-variant/20 flex items-center justify-between">
                    <div>
                        <span class="text-[13px] font-bold text-on-surface dark:text-white block">Daily Night Expense Reminder</span>
                        <span class="text-[11px] text-secondary block">Reminds you to input today's bills &amp; expenses if none were logged</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="toggle-expense-rem" class="sr-only peer" ${settings.expenseReminder ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                <!-- Expense Reminder Time -->
                <div class="p-3.5 rounded-2xl bg-surface-container-lowest/60 dark:bg-slate-800/40 border border-outline-variant/20 flex items-center justify-between">
                    <div>
                        <span class="text-[13px] font-bold text-on-surface dark:text-white block">Night Reminder Time</span>
                        <span class="text-[11px] text-secondary block">Time to trigger daily check</span>
                    </div>
                    <input type="time" id="input-expense-time" value="${settings.expenseReminderTime || '20:00'}" 
                           class="bg-surface-variant/40 dark:bg-slate-700 border-none rounded-xl px-2.5 py-1 text-[13px] font-bold text-on-surface dark:text-white outline-none">
                </div>

                <!-- Daily Order Check -->
                <div class="p-3.5 rounded-2xl bg-surface-container-lowest/60 dark:bg-slate-800/40 border border-outline-variant/20 flex items-center justify-between">
                    <div>
                        <span class="text-[13px] font-bold text-on-surface dark:text-white block">Inactivity &amp; Order Nudge</span>
                        <span class="text-[11px] text-secondary block">Prompts if no costings or orders were created today</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="toggle-order-rem" class="sr-only peer" ${settings.orderReminder ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            <!-- Test Trigger -->
            <button type="button" id="notif-test-btn" class="w-full py-2.5 rounded-xl border border-primary/30 text-primary font-semibold text-[13px] hover:bg-primary/5 active-scale transition-all mt-2">
                🔔 Send Test Notification
            </button>
        </div>
    `;
}

window.handleNotifClick = function(id, actionUrl) {
    ns.markAsRead(id);
    updateTopbarBadge();
    closeNotificationCenter();
    if (actionUrl) {
        window.location.href = actionUrl;
    }
};

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
