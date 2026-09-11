export function SearchBar({ placeholder = 'Search...', id = 'search-input' }) {
    return `
    <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]" aria-hidden="true">search</span>
        <input type="text" id="${id}" placeholder="${placeholder}" aria-label="Search"
               class="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-apple placeholder:text-secondary"/>
    </div>`;
}



export function FilterBar({ categories = [], activeCategory = '' }) {
    if (!categories.length) return '';
    
    const pills = categories.map(cat => {
        const isActive = cat.id === activeCategory;
        const activeClasses = 'bg-primary text-on-primary border-primary';

        
        const inactiveClasses = 'bg-surface-container-lowest text-secondary border-outline-variant hover:border-primary/50';
        
        return `<button role="tab" aria-selected="${isActive}" class="px-4 py-1.5 rounded-full border text-[13px] font-medium whitespace-nowrap transition-colors ${isActive ? activeClasses : inactiveClasses}" data-category="${cat.id}">
            ${cat.label}
        </button>`;
    }).join('');

    return `
    <div role="tablist" aria-label="Filter categories" class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        ${pills}
    </div>`;
}

export function SegmentedControl({ options = [], activeOption = '', id = '' }) {
    if (!options.length) return '';
    
    const tabs = options.map(opt => {
        const isActive = opt.id === activeOption;
        const activeClasses = 'bg-surface-container-lowest shadow-sm text-on-surface';
        const inactiveClasses = 'text-secondary hover:text-on-surface';
        
        return `<button role="tab" aria-selected="${isActive}" class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-apple ${isActive ? activeClasses : inactiveClasses}" data-option="${opt.id}">
            ${opt.label}
        </button>`;
    }).join('');

    return `
    <div id="${id}" role="tablist" class="flex bg-surface-variant p-1 rounded-xl w-full">
        ${tabs}
    </div>`;
}

export function TextInput({ label, id, placeholder = '', type = 'text', value = '', required = false, icon = '', min = '', max = '', pattern = '', helperText = '', validationType = '' }) {
    const minAttr = min !== '' ? `min="${min}"` : '';
    const maxAttr = max !== '' ? `max="${max}"` : '';
    const patternAttr = pattern ? `pattern="${pattern}"` : '';
    const valAttr = validationType ? `data-validation="${validationType}"` : '';
    
    // We link both the helper text and the error text via aria-describedby if they exist.
    const describedBy = `${helperText ? id + '-helper ' : ''}${id}-error`.trim();
    
    return `
    <div class="flex flex-col gap-2 relative group">
        <div class="flex items-center justify-between gap-2">
            <label class="text-[14px] font-semibold text-on-surface" for="${id}">
                ${label}${required ? ' <span class="text-error" aria-hidden="true">*</span>' : ''}
            </label>
            <span class="text-[12px] text-error font-medium opacity-0 transition-opacity" id="${id}-error" aria-live="polite"></span>
        </div>
        <div class="relative">
            ${icon ? `<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary transition-colors" id="${id}-icon" aria-hidden="true">${icon}</span>` : ''}
            <input type="${type}" id="${id}" name="${id}" placeholder="${placeholder}" value="${value}" ${required ? 'required aria-required="true"' : ''} ${minAttr} ${maxAttr} ${patternAttr} ${valAttr} aria-describedby="${describedBy}"
                   class="w-full bg-surface border border-outline-variant rounded-xl ${icon ? 'pl-11' : 'px-4'} pr-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-apple placeholder:text-secondary group-[.is-invalid]:border-error group-[.is-invalid]:focus:ring-error/20 group-[.is-invalid]:focus:border-error">
        </div>
        ${helperText ? `<p class="text-[12px] text-secondary pl-1" id="${id}-helper">${helperText}</p>` : ''}
    </div>`;
}

export function SelectInput({ label, id, options = [], value = '', required = false, helperText = '', validationType = '' }) {
    const opts = options.map(opt => {
        const optVal = opt.value !== undefined ? opt.value : opt.label;
        const isSelected = String(optVal) === String(value);
        return `<option value="${optVal}" ${isSelected ? 'selected' : ''}>${opt.label}</option>`;
    }).join('');
    const valAttr = validationType ? `data-validation="${validationType}"` : '';
    const describedBy = `${helperText ? id + '-helper ' : ''}${id}-error`.trim();
    
    return `
    <div class="flex flex-col gap-2 relative group">
        <div class="flex items-center justify-between gap-2">
            <label class="text-[14px] font-semibold text-on-surface" for="${id}">
                ${label}${required ? ' <span class="text-error" aria-hidden="true">*</span>' : ''}
            </label>
            <span class="text-[12px] text-error font-medium opacity-0 transition-opacity" id="${id}-error" aria-live="polite"></span>
        </div>
        <select id="${id}" name="${id}" ${required ? 'required aria-required="true"' : ''} ${valAttr} aria-describedby="${describedBy}"
                class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer transition-apple group-[.is-invalid]:border-error group-[.is-invalid]:focus:ring-error/20 group-[.is-invalid]:focus:border-error">
            ${opts}
        </select>
        ${helperText ? `<p class="text-[12px] text-secondary pl-1" id="${id}-helper">${helperText}</p>` : ''}
    </div>`;
}

export function TextareaInput({ label, id, placeholder = '', rows = 3, value = '', required = false, helperText = '', validationType = '' }) {
    const valAttr = validationType ? `data-validation="${validationType}"` : '';
    const describedBy = `${helperText ? id + '-helper ' : ''}${id}-error`.trim();
    
    return `
    <div class="flex flex-col gap-2 relative group">
        <div class="flex items-center justify-between gap-2">
            <label class="text-[14px] font-semibold text-on-surface" for="${id}">
                ${label}${required ? ' <span class="text-error" aria-hidden="true">*</span>' : ''}
            </label>
            <span class="text-[12px] text-error font-medium opacity-0 transition-opacity" id="${id}-error" aria-live="polite"></span>
        </div>
        <textarea id="${id}" name="${id}" rows="${rows}" placeholder="${placeholder}" ${required ? 'required aria-required="true"' : ''} ${valAttr} aria-describedby="${describedBy}"
                  class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-apple group-[.is-invalid]:border-error group-[.is-invalid]:focus:ring-error/20 group-[.is-invalid]:focus:border-error">${value}</textarea>
        ${helperText ? `<p class="text-[12px] text-secondary pl-1" id="${id}-helper">${helperText}</p>` : ''}
    </div>`;
}

export function SearchableSelectInput({ label, id, options = [], value = '', required = false, helperText = '', validationType = '' }) {
    const valAttr = validationType ? `data-validation="${validationType}"` : '';
    const describedBy = `${helperText ? id + '-helper ' : ''}${id}-error`.trim();
    const selectedOption = options.find(opt => String(opt.value || opt.label) === String(value));
    const displayValue = selectedOption?.label || value || '';

    return `
    <div class="flex flex-col gap-2 w-full relative group">
        <div class="flex items-center justify-between gap-2">
            <label class="text-[14px] font-semibold text-on-surface" for="${id}">
                ${label}${required ? ' <span class="text-error" aria-hidden="true">*</span>' : ''}
            </label>
            <span class="text-[12px] text-error font-medium opacity-0 transition-opacity" id="${id}-error" aria-live="polite"></span>
        </div>
        <div class="relative w-full">
            <input type="hidden" id="${id}" name="${id}" value="${value}" ${required ? 'required aria-required="true"' : ''} ${valAttr} aria-describedby="${describedBy}">
            <div class="flex items-center gap-2 bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-apple cursor-pointer group-[.is-invalid]:border-error group-[.is-invalid]:focus-within:ring-error/20 group-[.is-invalid]:focus-within:border-error" id="${id}-display">
                <span class="material-symbols-outlined text-secondary flex-shrink-0" aria-hidden="true">search</span>
                <input type="text" id="${id}-input" value="${displayValue}" class="flex-1 w-full min-w-0 bg-transparent outline-none focus:outline-none border-none focus:ring-0 text-[16px] text-on-surface placeholder:text-secondary" placeholder="Type to search..." autocomplete="off">
            </div>
            <div id="${id}-dropdown" class="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-xl shadow-2xl max-h-80 overflow-y-auto hidden" style="z-index: 9999;">
                ${options.map(opt => {
                    const optVal = opt.value !== undefined ? opt.value : opt.label;
                    const isSelected = String(optVal) === String(value);
                    return `<div class="px-4 py-3 text-[15px] text-on-surface cursor-pointer transition-colors hover:bg-surface-container-highest flex items-center justify-between gap-3 ${isSelected ? 'bg-surface-container text-primary font-semibold' : ''}" data-value="${optVal}" data-label="${opt.label}">
                        <span class="flex-1">${opt.label}</span>
                        ${isSelected ? '<span class="material-symbols-outlined text-primary text-[18px] flex-shrink-0" aria-hidden="true">done</span>' : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>
        ${helperText ? `<p class="text-[12px] text-secondary pl-1" id="${id}-helper">${helperText}</p>` : ''}
    </div>`;
}
