export function SearchBar({ placeholder = 'Search...', id = 'search-input' }) {
    return `
    <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
        <input type="text" id="${id}" placeholder="${placeholder}" 
               class="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-[15px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-secondary"/>
    </div>`;
}

export function FilterBar({ categories = [], activeCategory = '' }) {
    if (!categories.length) return '';
    
    const pills = categories.map(cat => {
        const isActive = cat.id === activeCategory;
        const activeClasses = 'bg-primary text-on-primary border-primary';
        const inactiveClasses = 'bg-surface-container-lowest text-secondary border-outline-variant hover:border-primary/50';
        
        return `<button class="px-4 py-1.5 rounded-full border text-[13px] font-medium whitespace-nowrap transition-colors ${isActive ? activeClasses : inactiveClasses}" data-category="${cat.id}">
            ${cat.label}
        </button>`;
    }).join('');

    return `
    <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        ${pills}
    </div>`;
}

export function SegmentedControl({ options = [], activeOption = '', id = '' }) {
    if (!options.length) return '';
    
    const tabs = options.map(opt => {
        const isActive = opt.id === activeOption;
        const activeClasses = 'bg-surface-container-lowest shadow-sm text-on-surface';
        const inactiveClasses = 'text-secondary hover:text-on-surface';
        
        return `<button class="flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${isActive ? activeClasses : inactiveClasses}" data-option="${opt.id}">
            ${opt.label}
        </button>`;
    }).join('');

    return `
    <div id="${id}" class="flex bg-surface-variant p-1 rounded-xl w-full">
        ${tabs}
    </div>`;
}

export function TextInput({ label, id, placeholder = '', type = 'text', value = '', required = false, icon = '' }) {
    return `
    <div class="flex flex-col gap-2">
        <label class="text-[14px] font-semibold text-on-surface" for="${id}">${label}${required ? ' <span class="text-error">*</span>' : ''}</label>
        <div class="relative">
            ${icon ? `<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">${icon}</span>` : ''}
            <input type="${type}" id="${id}" placeholder="${placeholder}" value="${value}" ${required ? 'required' : ''}
                   class="w-full bg-surface border border-outline-variant rounded-xl ${icon ? 'pl-11' : 'px-4'} pr-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-secondary">
        </div>
    </div>`;
}

export function SelectInput({ label, id, options = [], required = false }) {
    const opts = options.map(opt => `<option value="${opt.value || opt.label}">${opt.label}</option>`).join('');
    return `
    <div class="flex flex-col gap-2">
        <label class="text-[14px] font-semibold text-on-surface" for="${id}">${label}${required ? ' <span class="text-error">*</span>' : ''}</label>
        <select id="${id}" ${required ? 'required' : ''} class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer">
            ${opts}
        </select>
    </div>`;
}

export function TextareaInput({ label, id, placeholder = '', rows = 3, value = '', required = false }) {
    return `
    <div class="flex flex-col gap-2">
        <label class="text-[14px] font-semibold text-on-surface" for="${id}">${label}${required ? ' <span class="text-error">*</span>' : ''}</label>
        <textarea id="${id}" rows="${rows}" placeholder="${placeholder}" ${required ? 'required' : ''}
                  class="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-[16px] focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all">${value}</textarea>
    </div>`;
}
