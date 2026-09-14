/**
 * Garment OS — Finance Attachment Feature
 * Complete client-side attachment management, image optimization,
 * drag-and-drop dropzone, mobile camera integration, and interactive full-screen Lightbox viewer.
 */

import { api } from '../services/api.js?v=5.5';

// ── State for Pending Form Attachments ─────────────────────────────
const pendingAttachmentsMap = new Map(); // key: form prefix (e.g., 'trans-', 'edit-trans-') -> Array of attachment objects

// ── File Helpers & Optimization ────────────────────────────────────

export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isImageMime(type = '', name = '') {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return t.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(n);
}

export function isPdfMime(type = '', name = '') {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return t === 'application/pdf' || n.endsWith('.pdf');
}

/**
 * Client-side image compression to prevent database bloat and ensure fast uploads.
 * Scales down high-res phone photos (often 5-12MB) to max 1600px with 0.82 JPEG quality (~100-250KB).
 */
export async function processUploadFile(file) {
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB max raw file
    if (file.size > maxSizeBytes) {
        throw new Error(`"${file.name}" exceeds the 5MB size limit.`);
    }

    const isImg = isImageMime(file.type, file.name);
    const isPdf = isPdfMime(file.type, file.name);

    if (!isImg && !isPdf) {
        throw new Error(`"${file.name}" is not a supported format. Please upload JPG, PNG, WebP, or PDF.`);
    }

    if (isPdf) {
        const dataUrl = await readFileAsDataUrl(file);
        return {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: 'application/pdf',
            size: file.size,
            dataUrl,
            uploadedAt: new Date().toISOString()
        };
    }

    // Compress & resize image
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 1600;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export as compressed JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                // Approximate base64 payload size
                const approxSize = Math.round((dataUrl.length * 3) / 4);

                resolve({
                    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                    type: 'image/jpeg',
                    size: approxSize,
                    dataUrl,
                    uploadedAt: new Date().toISOString()
                });
            };
            img.onerror = () => reject(new Error('Failed to decode image.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read document.'));
        reader.readAsDataURL(file);
    });
}

// ── Form Pending Attachments Management ────────────────────────────

export function initPendingAttachments(prefix, initialList = []) {
    // Clone array to avoid mutating original
    const cloned = Array.isArray(initialList) ? JSON.parse(JSON.stringify(initialList)) : [];
    pendingAttachmentsMap.set(prefix, cloned);
    renderFormAttachmentsUI(prefix);
}

export function getPendingAttachments(prefix) {
    return pendingAttachmentsMap.get(prefix) || [];
}

export function setPendingAttachments(prefix, list) {
    pendingAttachmentsMap.set(prefix, list || []);
    renderFormAttachmentsUI(prefix);
}

export async function handleFilesSelected(prefix, fileList) {
    if (!fileList || fileList.length === 0) return;
    const current = getPendingAttachments(prefix);
    const maxFiles = 5;

    if (current.length + fileList.length > maxFiles) {
        window.showToast?.(`Maximum ${maxFiles} attachments allowed per transaction.`, 'error');
        return;
    }

    window.showToast?.('Processing attachment(s)...', 'info');
    let addedCount = 0;

    for (const file of Array.from(fileList)) {
        try {
            const processed = await processUploadFile(file);
            current.push(processed);
            addedCount++;
        } catch (err) {
            window.showToast?.(err.message || 'Error processing file', 'error');
        }
    }

    if (addedCount > 0) {
        setPendingAttachments(prefix, current);
        window.showToast?.(`Added ${addedCount} attachment(s)`, 'success');
    }
}

export function removePendingAttachment(prefix, idOrIndex) {
    const current = getPendingAttachments(prefix);
    let updated;
    if (typeof idOrIndex === 'number') {
        updated = current.filter((_, idx) => idx !== idOrIndex);
    } else {
        updated = current.filter(att => att.id !== idOrIndex);
    }
    setPendingAttachments(prefix, updated);
}

// ── Dropzone & Thumbnail HTML Renderers ─────────────────────────────

export function getFormAttachmentSectionHTML(prefix) {
    return `
        <div class="mt-4 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px] text-primary">attach_file</span>
                    Receipts & Invoices
                </label>
                <span id="${prefix}attachment-count-badge" class="text-[11px] font-semibold text-secondary">0 files</span>
            </div>

            <!-- Dropzone Container -->
            <div 
                id="${prefix}dropzone"
                class="relative border-2 border-dashed border-outline-variant hover:border-primary/60 bg-surface-container/40 rounded-2xl p-4 transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 group cursor-pointer"
                onclick="document.getElementById('${prefix}file-input')?.click()"
            >
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-[22px]">cloud_upload</span>
                </div>
                <div>
                    <p class="text-[13px] font-semibold text-on-surface">
                        <span class="text-primary hover:underline">Click to upload</span> or drag & drop
                    </p>
                    <p class="text-[11px] text-secondary mt-0.5">Bills, UPI receipts, cheques or invoices (JPG, PNG, PDF up to 5MB)</p>
                </div>

                <!-- Action row with Camera trigger -->
                <div class="flex items-center gap-2 mt-1" onclick="event.stopPropagation()">
                    <button 
                        type="button" 
                        onclick="document.getElementById('${prefix}file-input')?.click()"
                        class="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-on-surface text-[11px] font-semibold flex items-center gap-1.5 active-scale hover:bg-surface-variant transition-apple"
                    >
                        <span class="material-symbols-outlined text-[14px]">folder_open</span> Browse Files
                    </button>
                    <button 
                        type="button" 
                        onclick="document.getElementById('${prefix}camera-input')?.click()"
                        class="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold flex items-center gap-1.5 active-scale hover:bg-primary/20 transition-apple"
                    >
                        <span class="material-symbols-outlined text-[15px]">photo_camera</span> Take Photo
                    </button>
                </div>

                <!-- Hidden file inputs -->
                <input 
                    type="file" 
                    id="${prefix}file-input" 
                    multiple 
                    accept="image/jpeg,image/png,image/webp,application/pdf" 
                    class="hidden" 
                    onchange="window.handleAttachmentInputChange('${prefix}', this)"
                />
                <input 
                    type="file" 
                    id="${prefix}camera-input" 
                    accept="image/*" 
                    capture="environment" 
                    class="hidden" 
                    onchange="window.handleAttachmentInputChange('${prefix}', this)"
                />
            </div>

            <!-- Preview Gallery of Selected Files -->
            <div id="${prefix}attachment-gallery" class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-1 empty:hidden"></div>
        </div>
    `;
}

export function renderFormAttachmentsUI(prefix) {
    const badge = document.getElementById(`${prefix}attachment-count-badge`);
    const gallery = document.getElementById(`${prefix}attachment-gallery`);
    const list = getPendingAttachments(prefix);

    if (badge) {
        const totalBytes = list.reduce((s, a) => s + (a.size || 0), 0);
        badge.textContent = list.length > 0 ? `${list.length} file${list.length > 1 ? 's' : ''} (${formatFileSize(totalBytes)})` : '0 files';
    }

    if (!gallery) return;

    if (list.length === 0) {
        gallery.innerHTML = '';
        return;
    }

    gallery.innerHTML = list.map((att, idx) => {
        const isPdf = isPdfMime(att.type, att.name);
        const sizeStr = formatFileSize(att.size);
        const thumbHTML = isPdf
            ? `<div class="w-full h-24 rounded-xl bg-error/5 border border-error/20 flex flex-col items-center justify-center p-2 text-error">
                 <span class="material-symbols-outlined text-[32px] mb-1">picture_as_pdf</span>
                 <span class="text-[10px] font-bold uppercase tracking-wider">PDF Document</span>
               </div>`
            : `<div class="w-full h-24 rounded-xl overflow-hidden bg-surface-variant border border-outline-variant/50 relative">
                 <img src="${att.dataUrl}" alt="${att.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
               </div>`;

        return `
            <div class="relative group bg-surface border border-outline-variant/60 rounded-2xl p-2 flex flex-col gap-1.5 shadow-2xs hover:shadow-xs transition-apple">
                <!-- Preview / Click to Zoom -->
                <div class="cursor-pointer" onclick="window.previewFormAttachment('${prefix}', ${idx})">
                    ${thumbHTML}
                </div>

                <div class="flex items-center justify-between min-w-0 px-1">
                    <span class="text-[11px] font-semibold text-on-surface truncate flex-1" title="${att.name}">${att.name}</span>
                    <span class="text-[9.5px] font-mono text-secondary ml-1 shrink-0">${sizeStr}</span>
                </div>

                <!-- Delete / Remove button -->
                <button 
                    type="button"
                    onclick="window.removeFormAttachment('${prefix}', '${att.id}')"
                    class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white hover:bg-error flex items-center justify-center active-scale transition-apple shadow-sm"
                    title="Remove attachment"
                >
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            </div>
        `;
    }).join('');
}

export function setupDropzoneEvents(prefix) {
    const dropzone = document.getElementById(`${prefix}dropzone`);
    if (!dropzone || dropzone.dataset.bound) return;
    dropzone.dataset.bound = 'true';

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('border-primary', 'bg-primary/5', 'scale-[1.01]');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.01]');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleFilesSelected(prefix, dt.files);
        }
    });
}

// ── Detail Sheet Attachment Gallery Renderer ───────────────────────

export function getTransactionAttachmentsDetailHTML(transaction) {
    if (!transaction) return '';
    const attachments = Array.isArray(transaction.attachments) ? transaction.attachments : [];
    const count = attachments.length;
    const totalBytes = attachments.reduce((s, a) => s + (a.size || 0), 0);

    return `
        <div class="pt-4 border-t border-outline-variant/30">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-[12px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1">
                        <span class="material-symbols-outlined text-[15px] text-primary">attach_file</span>
                        Receipts & Invoices
                    </span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-secondary'}">
                        ${count} ${count === 1 ? 'file' : 'files'}${count > 0 ? ` · ${formatFileSize(totalBytes)}` : ''}
                    </span>
                </div>
                
                <!-- Quick Add button inside details drawer -->
                <button 
                    onclick="document.getElementById('detail-quick-attach-input')?.click()"
                    class="text-[12px] font-bold text-primary flex items-center gap-1 hover:underline active-scale transition-apple"
                    title="Attach receipt directly"
                >
                    <span class="material-symbols-outlined text-[16px]">add_circle</span> Attach File
                </button>
                <input 
                    type="file" 
                    id="detail-quick-attach-input" 
                    multiple 
                    accept="image/jpeg,image/png,image/webp,application/pdf" 
                    class="hidden" 
                    onchange="window.quickAddAttachment('${transaction.id}', this)"
                />
            </div>

            ${count === 0 ? `
                <div 
                    onclick="document.getElementById('detail-quick-attach-input')?.click()"
                    class="p-4 rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container/30 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-surface-container/60 transition-apple"
                >
                    <div class="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-secondary mb-1.5">
                        <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                    </div>
                    <p class="text-[13px] font-medium text-on-surface">No receipts or bills attached</p>
                    <p class="text-[11px] text-secondary mt-0.5">Click here to upload invoice, cheque, or UPI screenshot</p>
                </div>
            ` : `
                <div class="grid grid-cols-2 gap-2.5">
                    ${attachments.map((att, idx) => {
                        const isPdf = isPdfMime(att.type, att.name);
                        const sizeStr = formatFileSize(att.size);
                        const dateStr = att.uploadedAt ? att.uploadedAt.split('T')[0] : '';
                        
                        return `
                        <div class="group relative bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-2.5 flex flex-col gap-2 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                            <!-- Thumbnail with click-to-lightbox -->
                            <div 
                                class="cursor-pointer overflow-hidden rounded-xl relative"
                                onclick="window.openAttachmentLightbox('${transaction.id}', ${idx})"
                            >
                                ${isPdf ? `
                                    <div class="w-full h-28 bg-error/5 border border-error/15 rounded-xl flex flex-col items-center justify-center text-error group-hover:bg-error/10 transition-colors">
                                        <span class="material-symbols-outlined text-[36px] mb-1">picture_as_pdf</span>
                                        <span class="text-[10px] font-bold tracking-wider uppercase">PDF Document</span>
                                    </div>
                                ` : `
                                    <div class="w-full h-28 bg-surface-variant rounded-xl overflow-hidden relative">
                                        <img src="${att.dataUrl}" alt="${att.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <span class="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-[24px]">zoom_in</span>
                                        </div>
                                    </div>
                                `}
                            </div>

                            <!-- Meta -->
                            <div class="flex-1 min-w-0 px-0.5">
                                <p class="text-[12px] font-bold text-on-surface truncate" title="${att.name}">${att.name}</p>
                                <div class="flex items-center justify-between text-[10.5px] text-secondary mt-0.5">
                                    <span>${sizeStr}</span>
                                    <span>${dateStr}</span>
                                </div>
                            </div>

                            <!-- Action bar -->
                            <div class="flex items-center justify-end gap-1 pt-1 border-t border-outline-variant/20">
                                <button 
                                    onclick="window.downloadAttachmentDirect('${transaction.id}', '${att.id}')" 
                                    class="w-7 h-7 rounded-lg hover:bg-surface-variant flex items-center justify-center text-secondary hover:text-on-surface active-scale transition-apple"
                                    title="Download"
                                >
                                    <span class="material-symbols-outlined text-[16px]">download</span>
                                </button>
                                <button 
                                    onclick="window.openAttachmentLightbox('${transaction.id}', ${idx})" 
                                    class="w-7 h-7 rounded-lg hover:bg-surface-variant flex items-center justify-center text-primary active-scale transition-apple"
                                    title="View Fullscreen"
                                >
                                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                                </button>
                                <button 
                                    onclick="window.deleteAttachmentDirect('${transaction.id}', '${att.id}')" 
                                    class="w-7 h-7 rounded-lg hover:bg-error/10 flex items-center justify-center text-secondary hover:text-error active-scale transition-apple"
                                    title="Delete"
                                >
                                    <span class="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

// ── Full-Screen Lightbox / Document Viewer ("Proper View When Clicked") ─────

let activeViewerState = {
    attachments: [],
    currentIndex: 0,
    zoom: 1,
    rotation: 0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panOffset: { x: 0, y: 0 }
};

export function ensureLightboxDOM() {
    let modal = document.getElementById('attachment-lightbox-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'attachment-lightbox-modal';
        modal.className = 'fixed inset-0 z-[500] hidden flex-col bg-black/90 backdrop-blur-md text-white transition-opacity duration-300 select-none';
        modal.innerHTML = `
            <!-- Top Header Bar -->
            <div class="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/40">
                <div class="flex items-center gap-3 min-w-0 pr-4">
                    <div id="lightbox-file-icon" class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px] text-white">description</span>
                    </div>
                    <div class="min-w-0">
                        <h3 id="lightbox-file-name" class="text-[14px] sm:text-[15px] font-bold text-white truncate max-w-[200px] sm:max-w-md">Attachment</h3>
                        <div class="flex items-center gap-2 text-[11px] text-white/60">
                            <span id="lightbox-file-size">0 KB</span>
                            <span>•</span>
                            <span id="lightbox-file-type" class="uppercase font-semibold">JPG</span>
                            <span id="lightbox-file-counter" class="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono text-[10px]">1/1</span>
                        </div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                    <!-- Image Zoom Controls (hidden on PDF) -->
                    <div id="lightbox-image-controls" class="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                        <button onclick="window.lightboxZoom(-0.25)" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white active-scale" title="Zoom Out (-)">
                            <span class="material-symbols-outlined text-[18px]">zoom_out</span>
                        </button>
                        <span id="lightbox-zoom-label" class="text-[11px] font-mono w-10 text-center text-white/80">100%</span>
                        <button onclick="window.lightboxZoom(0.25)" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white active-scale" title="Zoom In (+)">
                            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
                        </button>
                        <button onclick="window.lightboxResetZoom()" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white active-scale" title="Reset (1:1)">
                            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
                        </button>
                        <button onclick="window.lightboxRotate()" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white active-scale" title="Rotate 90° (R)">
                            <span class="material-symbols-outlined text-[18px]">rotate_right</span>
                        </button>
                    </div>

                    <!-- Direct Actions -->
                    <button onclick="window.lightboxOpenNewTab()" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active-scale transition-apple" title="Open in New Tab">
                        <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                    </button>
                    <button onclick="window.lightboxDownload()" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active-scale transition-apple" title="Download">
                        <span class="material-symbols-outlined text-[18px]">download</span>
                    </button>
                    <button onclick="window.closeAttachmentLightbox()" class="w-9 h-9 rounded-xl bg-white/20 hover:bg-error hover:text-white flex items-center justify-center text-white active-scale transition-apple ml-1" title="Close (Esc)">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            </div>

            <!-- Main Stage / Viewer -->
            <div id="lightbox-stage" class="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
                <!-- Image Viewer Container -->
                <div id="lightbox-image-container" class="relative max-w-full max-h-full transition-transform duration-100 ease-out flex items-center justify-center">
                    <img id="lightbox-img" src="" alt="" class="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl pointer-events-none" />
                </div>

                <!-- PDF Viewer Container -->
                <div id="lightbox-pdf-container" class="hidden w-full h-full max-w-4xl bg-surface rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                    <iframe id="lightbox-pdf-frame" src="" class="w-full flex-1 border-0"></iframe>
                    <div class="p-3 bg-surface-container border-t border-outline-variant flex items-center justify-between text-on-surface">
                        <span class="text-[12px] text-secondary">PDF Document Preview</span>
                        <a id="lightbox-pdf-fallback" href="" target="_blank" download class="px-3 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold flex items-center gap-1 active-scale">
                            <span class="material-symbols-outlined text-[16px]">download</span> Download PDF
                        </a>
                    </div>
                </div>

                <!-- Previous / Next Navigation Arrows -->
                <button 
                    id="lightbox-prev-btn" 
                    onclick="window.lightboxNav(-1)" 
                    class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center active-scale transition-apple shadow-lg"
                    title="Previous (Left Arrow)"
                >
                    <span class="material-symbols-outlined text-[28px]">chevron_left</span>
                </button>
                <button 
                    id="lightbox-next-btn" 
                    onclick="window.lightboxNav(1)" 
                    class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center active-scale transition-apple shadow-lg"
                    title="Next (Right Arrow)"
                >
                    <span class="material-symbols-outlined text-[28px]">chevron_right</span>
                </button>
            </div>

            <!-- Bottom Caption & Info Bar -->
            <div class="h-12 px-6 flex items-center justify-between border-t border-white/10 shrink-0 bg-black/40 text-[12px] text-white/70">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] text-white/50">info</span>
                    <span>Scroll to zoom · Drag to pan · Press <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Esc</kbd> to close</span>
                </div>
                <div id="lightbox-timestamp" class="text-[11px] text-white/50"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Bind interactive mousewheel and drag-to-pan on image stage
        setupLightboxInteractions();
    }
    return modal;
}

function setupLightboxInteractions() {
    const stage = document.getElementById('lightbox-stage');
    if (!stage) return;

    // Mouse wheel zoom
    stage.addEventListener('wheel', (e) => {
        if (!activeViewerState.attachments[activeViewerState.currentIndex]) return;
        const current = activeViewerState.attachments[activeViewerState.currentIndex];
        if (isPdfMime(current.type, current.name)) return;

        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        window.lightboxZoom(delta);
    }, { passive: false });

    // Drag to pan when zoomed
    const imgContainer = document.getElementById('lightbox-image-container');
    stage.addEventListener('mousedown', (e) => {
        if (activeViewerState.zoom <= 1) return;
        activeViewerState.isPanning = true;
        activeViewerState.panStart = { x: e.clientX - activeViewerState.panOffset.x, y: e.clientY - activeViewerState.panOffset.y };
        stage.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!activeViewerState.isPanning) return;
        activeViewerState.panOffset = {
            x: e.clientX - activeViewerState.panStart.x,
            y: e.clientY - activeViewerState.panStart.y
        };
        applyImageTransform();
    });

    window.addEventListener('mouseup', () => {
        if (activeViewerState.isPanning) {
            activeViewerState.isPanning = false;
            stage.style.cursor = '';
        }
    });

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('attachment-lightbox-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        if (e.key === 'Escape') {
            window.closeAttachmentLightbox();
        } else if (e.key === 'ArrowLeft') {
            window.lightboxNav(-1);
        } else if (e.key === 'ArrowRight') {
            window.lightboxNav(1);
        } else if (e.key === '+' || e.key === '=') {
            window.lightboxZoom(0.25);
        } else if (e.key === '-' || e.key === '_') {
            window.lightboxZoom(-0.25);
        } else if (e.key === 'r' || e.key === 'R') {
            window.lightboxRotate();
        }
    });
}

function applyImageTransform() {
    const container = document.getElementById('lightbox-image-container');
    if (!container) return;
    const { zoom, rotation, panOffset } = activeViewerState;
    container.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`;
    const zoomLabel = document.getElementById('lightbox-zoom-label');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

export function openLightboxViewer(attachments = [], startIndex = 0) {
    if (!attachments || attachments.length === 0) return;
    ensureLightboxDOM();

    activeViewerState.attachments = attachments;
    activeViewerState.currentIndex = Math.max(0, Math.min(startIndex, attachments.length - 1));
    activeViewerState.zoom = 1;
    activeViewerState.rotation = 0;
    activeViewerState.panOffset = { x: 0, y: 0 };

    const modal = document.getElementById('attachment-lightbox-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    renderCurrentLightboxItem();
}

export function closeLightboxViewer() {
    const modal = document.getElementById('attachment-lightbox-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderCurrentLightboxItem() {
    const { attachments, currentIndex } = activeViewerState;
    const att = attachments[currentIndex];
    if (!att) return;

    // Reset zoom & pan on slide change
    activeViewerState.zoom = 1;
    activeViewerState.rotation = 0;
    activeViewerState.panOffset = { x: 0, y: 0 };
    applyImageTransform();

    const isPdf = isPdfMime(att.type, att.name);

    // Meta Header
    document.getElementById('lightbox-file-name').textContent = att.name;
    document.getElementById('lightbox-file-size').textContent = formatFileSize(att.size);
    document.getElementById('lightbox-file-type').textContent = isPdf ? 'PDF' : (att.type ? att.type.split('/')[1] : 'IMG');
    document.getElementById('lightbox-file-counter').textContent = `${currentIndex + 1} / ${attachments.length}`;

    const timestampEl = document.getElementById('lightbox-timestamp');
    if (timestampEl) {
        timestampEl.textContent = att.uploadedAt ? `Uploaded on ${att.uploadedAt.replace('T', ' ').substring(0, 16)}` : '';
    }

    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');
    if (prevBtn) prevBtn.style.display = attachments.length > 1 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = attachments.length > 1 ? 'flex' : 'none';

    const imgContainer = document.getElementById('lightbox-image-container');
    const pdfContainer = document.getElementById('lightbox-pdf-container');
    const imgControls = document.getElementById('lightbox-image-controls');

    if (isPdf) {
        imgContainer.style.display = 'none';
        imgControls.style.display = 'none';
        pdfContainer.style.display = 'flex';

        const pdfFrame = document.getElementById('lightbox-pdf-frame');
        const pdfFallback = document.getElementById('lightbox-pdf-fallback');
        if (pdfFrame) pdfFrame.src = att.dataUrl;
        if (pdfFallback) {
            pdfFallback.href = att.dataUrl;
            pdfFallback.download = att.name;
        }
    } else {
        pdfContainer.style.display = 'none';
        imgContainer.style.display = 'flex';
        imgControls.style.display = 'flex';

        const imgEl = document.getElementById('lightbox-img');
        if (imgEl) imgEl.src = att.dataUrl;
    }
}

// ── Global Window Bindings for UI Events ───────────────────────────

window.handleAttachmentInputChange = function(prefix, input) {
    if (input.files && input.files.length > 0) {
        handleFilesSelected(prefix, input.files);
        input.value = ''; // Reset input so same file can be selected again if needed
    }
};

window.removeFormAttachment = function(prefix, id) {
    removePendingAttachment(prefix, id);
};

window.previewFormAttachment = function(prefix, index) {
    const list = getPendingAttachments(prefix);
    openLightboxViewer(list, index);
};

window.openAttachmentLightbox = async function(transactionId, index = 0) {
    // Look up transaction
    let t = window.financeStore?.getState()?.activeEntity;
    if (!t || t.id !== transactionId) {
        const all = window.financeStore?.getState()?.allTransactions || window.financeStore?.getState()?.entities || [];
        t = all.find(item => item.id === transactionId);
    }
    if (!t || !Array.isArray(t.attachments) || t.attachments.length === 0) return;
    openLightboxViewer(t.attachments, index);
};

window.closeAttachmentLightbox = function() {
    closeLightboxViewer();
};

window.lightboxNav = function(step) {
    const { attachments, currentIndex } = activeViewerState;
    if (attachments.length <= 1) return;
    let nextIdx = currentIndex + step;
    if (nextIdx < 0) nextIdx = attachments.length - 1;
    if (nextIdx >= attachments.length) nextIdx = 0;
    activeViewerState.currentIndex = nextIdx;
    renderCurrentLightboxItem();
};

window.lightboxZoom = function(delta) {
    activeViewerState.zoom = Math.max(0.5, Math.min(3.5, activeViewerState.zoom + delta));
    applyImageTransform();
};

window.lightboxResetZoom = function() {
    activeViewerState.zoom = 1;
    activeViewerState.rotation = 0;
    activeViewerState.panOffset = { x: 0, y: 0 };
    applyImageTransform();
};

window.lightboxRotate = function() {
    activeViewerState.rotation = (activeViewerState.rotation + 90) % 360;
    applyImageTransform();
};

window.lightboxDownload = function() {
    const att = activeViewerState.attachments[activeViewerState.currentIndex];
    if (!att) return;
    triggerDownload(att.dataUrl, att.name);
};

window.lightboxOpenNewTab = function() {
    const att = activeViewerState.attachments[activeViewerState.currentIndex];
    if (!att) return;
    const w = window.open('');
    if (w) {
        if (isPdfMime(att.type, att.name)) {
            w.document.write(`<iframe src="${att.dataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
        } else {
            w.document.write(`<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${att.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;"></body>`);
        }
    }
};

window.downloadAttachmentDirect = async function(transactionId, attachmentId) {
    const all = window.financeStore?.getState()?.allTransactions || window.financeStore?.getState()?.entities || [];
    const t = all.find(item => item.id === transactionId) || window.financeStore?.getState()?.activeEntity;
    if (!t) return;
    const att = (t.attachments || []).find(a => a.id === attachmentId);
    if (att) triggerDownload(att.dataUrl, att.name);
};

function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ── Direct Quick Add & Delete on Existing Transactions ──────────────

window.quickAddAttachment = async function(transactionId, input) {
    if (!input.files || input.files.length === 0) return;

    window.showToast?.('Uploading attachment...', 'info');
    try {
        const all = window.financeStore?.getState()?.allTransactions || window.financeStore?.getState()?.entities || [];
        let t = all.find(item => item.id === transactionId) || window.financeStore?.getState()?.activeEntity;
        if (!t) {
            t = await api.getTransactions().then(list => list.find(x => x.id === transactionId));
        }
        if (!t) throw new Error('Transaction not found');

        const existingAttachments = Array.isArray(t.attachments) ? [...t.attachments] : [];
        for (const file of Array.from(input.files)) {
            const processed = await processUploadFile(file);
            existingAttachments.push(processed);
        }

        await api.updateTransaction(transactionId, { attachments: existingAttachments });
        window.showToast?.('Attachment uploaded successfully!', 'success');

        // Reload data and refresh active sheet
        await window.financeStore?.loadTransactions();
        await window.financeStore?.fetchActiveEntity(transactionId);
    } catch (err) {
        window.showToast?.(err.message || 'Failed to upload attachment', 'error');
    } finally {
        input.value = '';
    }
};

window.deleteAttachmentDirect = async function(transactionId, attachmentId) {
    if (!confirm('Are you sure you want to delete this attachment? This cannot be undone.')) {
        return;
    }

    window.showToast?.('Deleting attachment...', 'info');
    try {
        const all = window.financeStore?.getState()?.allTransactions || window.financeStore?.getState()?.entities || [];
        let t = all.find(item => item.id === transactionId) || window.financeStore?.getState()?.activeEntity;
        if (!t) throw new Error('Transaction not found');

        const updated = (t.attachments || []).filter(a => a.id !== attachmentId);
        await api.updateTransaction(transactionId, { attachments: updated });
        window.showToast?.('Attachment deleted', 'success');

        await window.financeStore?.loadTransactions();
        await window.financeStore?.fetchActiveEntity(transactionId);
    } catch (err) {
        window.showToast?.(err.message || 'Failed to delete attachment', 'error');
    }
};
