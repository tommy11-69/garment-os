// js/components/splashScreen.js
// Renders ultra-high resolution OS Splash Loading Screen using original brand assets

export function showSplashScreen(duration = 700) {
    if (document.getElementById('gos-splash-screen')) return;

    const splash = document.createElement('div');
    splash.id = 'gos-splash-screen';
    splash.className = 'fixed inset-0 z-[9999] bg-[#0b0f19] flex flex-col items-center justify-center p-6 text-white transition-opacity duration-500 selection:bg-none';

    const isDark = document.documentElement.classList.contains('dark') || true;
    const logoSrc = isDark ? '/assets/logo-full-dark.png' : '/assets/logo-full-light.png';

    splash.innerHTML = `
        <div class="flex flex-col items-center text-center max-w-sm animate-in fade-in zoom-in-95 duration-300">
            <!-- High-Res Original Brand Logo (Uncompressed) -->
            <div class="relative mb-8 flex items-center justify-center">
                <div class="absolute -inset-4 bg-gradient-to-r from-[#ff6b00]/20 to-[#0059b5]/20 rounded-full blur-2xl opacity-75 animate-pulse"></div>
                <img src="${logoSrc}" alt="Udhayaa Textile Processing Logo" 
                     class="relative h-20 sm:h-24 w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
                     onerror="this.src='/assets/logo-monogram-dark.png'" />
            </div>

            <div class="w-48 h-1 bg-slate-800 rounded-full overflow-hidden relative mb-4">
                <div class="h-full bg-gradient-to-r from-[#ff6b00] to-[#ff9f0a] rounded-full animate-[splashProgress_0.7s_ease-out_forwards]"></div>
            </div>

            <p class="text-[12px] font-semibold text-slate-400 tracking-wider uppercase">Manufacturing Operating System</p>
        </div>

        <style>
            @keyframes splashProgress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }
        </style>
    `;

    document.body.appendChild(splash);

    // Auto fade out
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }, duration);
}

// Auto-run if initial page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showSplashScreen());
} else {
    showSplashScreen();
}
