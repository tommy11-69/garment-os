import { db } from '../data/database.js?v=5.2';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    const newUsername = document.getElementById('new-username');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const pwError = document.getElementById('password-error');
    const saveBtn = document.getElementById('save-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        pwError.classList.add('hidden');
        
        const usernameVal = newUsername.value.trim();
        const passwordVal = newPassword.value;
        const confirmVal = confirmPassword.value;

        if (!usernameVal && !passwordVal) {
            window.showToast?.('No changes to save.', 'error');
            return;
        }

        if (passwordVal && passwordVal !== confirmVal) {
            pwError.classList.remove('hidden');
            return;
        }

        // Disable button while processing
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Saving...';
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.7';

        try {
            const payload = {};
            if (usernameVal) payload.username = usernameVal;
            if (passwordVal) payload.password = passwordVal;

            await db._fetchAPI('/auth/credentials', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (passwordVal) {
                window.showToast?.('Password changed successfully. Please log in again.', 'success');
                setTimeout(() => {
                    localStorage.removeItem('gos_token');
                    window.location.replace('/auth/login.html');
                }, 1500);
            } else {
                window.showToast?.('Settings saved successfully.', 'success');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                newUsername.value = '';
            }
            
        } catch (err) {
            console.error('Failed to update credentials:', err);
            window.showToast?.(err.message || 'Failed to update credentials.', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
    });
});
