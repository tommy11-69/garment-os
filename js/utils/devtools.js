// import { BottomSheet } from '../components/index.js';
// import './states.js';

// export function initDevTools() {
//     // Only load dev tools on actual app pages, skip for auth/404
//     const skipPages = ['login', 'forgot-password', '404', 'maintenance', 'network-error'];
//     const path = window.location.pathname;
//     const currentPage = path.split('/').pop().replace('.html', '');
//     if (skipPages.includes(currentPage)) return;

//     // 1. Inject FAB
//     const fabHtml = `
//         <button onclick="openSheet('devToolsSheet')" class="fixed bottom-32 left-6 w-14 h-14 bg-error text-white rounded-2xl shadow-lg flex items-center justify-center z-50 hover:scale-105 active-scale transition-apple">
//             <span class="material-symbols-outlined text-[24px]">developer_mode</span>
//         </button>
//     `;
//     const fabContainer = document.createElement('div');
//     fabContainer.innerHTML = fabHtml;
//     document.body.appendChild(fabContainer);

//     // 2. Inject Sheet
//     const content = `
//         <div class="flex flex-col gap-4">
//             <div class="bg-error/10 text-error p-3 rounded-xl text-[14px] font-medium mb-2">
//                 Use these toggles to test UI states on the current page.
//             </div>

//             <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mt-2">Page States</h3>
//             <div class="grid grid-cols-2 gap-3">
//                 <button onclick="window.setLoading('main-content-area')" class="bg-surface-container-highest py-3 rounded-xl font-medium active-scale transition-apple text-on-surface">Loading Skeleton</button>
//                 <button onclick="window.setEmpty('main-content-area')" class="bg-surface-container-highest py-3 rounded-xl font-medium active-scale transition-apple text-on-surface">Empty State</button>
//                 <button onclick="window.setEmpty('main-content-area', {icon: 'search_off', title: 'No results found'})" class="bg-surface-container-highest py-3 rounded-xl font-medium active-scale transition-apple text-on-surface">No Search Results</button>
//                 <button onclick="window.setError('main-content-area')" class="bg-error/10 text-error py-3 rounded-xl font-medium active-scale transition-apple">Error State</button>
//             </div>
//             <button onclick="window.restoreContent('main-content-area')" class="w-full bg-primary text-white py-3 rounded-xl font-bold mt-2 active-scale transition-apple">Restore Content</button>

//             <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mt-6">Toast Notifications</h3>
//             <div class="grid grid-cols-2 gap-3">
//                 <button onclick="window.showToast('Action completed successfully!', 'success')" class="bg-[#008A00]/10 text-[#008A00] py-3 rounded-xl font-medium active-scale transition-apple">Success Toast</button>
//                 <button onclick="window.showToast('Failed to save changes.', 'error')" class="bg-error/10 text-error py-3 rounded-xl font-medium active-scale transition-apple">Error Toast</button>
//                 <button onclick="window.showToast('You are currently offline.', 'offline')" class="bg-[#1B1B1D] text-white py-3 rounded-xl font-medium active-scale transition-apple">Offline Toast</button>
//                 <button onclick="window.showToast('Stock running low.', 'warning')" class="bg-warning/10 text-warning py-3 rounded-xl font-medium active-scale transition-apple">Warning Toast</button>
//             </div>
            
//             <h3 class="text-[14px] font-semibold text-secondary uppercase tracking-wider mt-6">Dialogs</h3>
//             <button onclick="window.showConfirmation({title: 'Discard Changes?', message: 'You have unsaved changes. Are you sure you want to discard them?', confirmText: 'Discard', type: 'danger'})" class="w-full bg-surface-container-highest text-on-surface py-3 rounded-xl font-medium active-scale transition-apple">Unsaved Changes Warning</button>
            
//             <div class="h-8"></div>
//         </div>
//     `;

//     const sheetContainer = document.createElement('div');
//     sheetContainer.innerHTML = BottomSheet({
//         id: 'devToolsSheet',
//         title: 'Developer Tools',
//         content: content
//     });
    
//     // We append this right away
//     document.body.appendChild(sheetContainer);
// }
