import { isValidEmail, isValidPhone, isValidGST, isValidPAN, isPositiveNumber, isNonNegativeNumber, isFutureOrToday } from './validation.js';

/**
 * Binds validation logic to a dynamically rendered form.
 * @param {string} formId - The ID of the form element
 * @param {string} submitBtnId - The ID of the submit button to toggle
 * @param {Object} options - Custom validation handlers if needed
 */
export function bindFormValidation(formId, submitBtnId, options = {}) {
    const form = document.getElementById(formId);
    const submitBtn = document.getElementById(submitBtnId);
    
    if (!form) return;
    
    // Find all inputs, selects, textareas within the form
    const elements = form.querySelectorAll('input, select, textarea');
    
    // Validate single field
    const validateField = (el) => {
        const id = el.id;
        const wrapper = el.closest('.group');
        const errorSpan = document.getElementById(`${id}-error`);
        let isValid = true;
        let errorMessage = '';

        // 1. Native HTML5 Validation (required, min, max, pattern)
        if (!el.validity.valid) {
            isValid = false;
            if (el.validity.valueMissing) errorMessage = 'Required';
            else if (el.validity.typeMismatch) errorMessage = 'Invalid format';
            else if (el.validity.rangeUnderflow) errorMessage = `Min: ${el.min}`;
            else if (el.validity.rangeOverflow) errorMessage = `Max: ${el.max}`;
            else if (el.validity.patternMismatch) errorMessage = 'Invalid format';
            else errorMessage = 'Invalid field';
        } 
        // 2. Custom Data Validation logic
        else if (el.dataset.validation && el.value) {
            const type = el.dataset.validation;
            switch (type) {
                case 'email':
                    isValid = isValidEmail(el.value);
                    if (!isValid) errorMessage = 'Invalid email';
                    break;
                case 'phone':
                    isValid = isValidPhone(el.value);
                    if (!isValid) errorMessage = 'Invalid phone number';
                    break;
                case 'gst':
                    isValid = isValidGST(el.value);
                    if (!isValid) errorMessage = 'Invalid GST format';
                    break;
                case 'pan':
                    isValid = isValidPAN(el.value);
                    if (!isValid) errorMessage = 'Invalid PAN format';
                    break;
                case 'positive':
                    isValid = isPositiveNumber(el.value);
                    if (!isValid) errorMessage = 'Must be > 0';
                    break;
                case 'non-negative':
                    isValid = isNonNegativeNumber(el.value);
                    if (!isValid) errorMessage = 'Cannot be negative';
                    break;
                case 'future-date':
                    isValid = isFutureOrToday(el.value);
                    if (!isValid) errorMessage = 'Cannot be in the past';
                    break;
            }
        }
        
        // Custom override via options
        if (isValid && options.customValidators && options.customValidators[id]) {
            const result = options.customValidators[id](el.value);
            if (result !== true) {
                isValid = false;
                errorMessage = result || 'Invalid field';
            }
        }

        // Apply UI state
        if (wrapper && errorSpan) {
            if (!isValid && el.value !== '') { // Don't show error if empty unless it was touched (blur)
                wrapper.classList.add('is-invalid');
                errorSpan.textContent = errorMessage;
                errorSpan.classList.remove('opacity-0');
                errorSpan.classList.add('opacity-100');
            } else {
                wrapper.classList.remove('is-invalid');
                errorSpan.classList.add('opacity-0');
                errorSpan.classList.remove('opacity-100');
            }
        }
        
        return isValid;
    };

    // Check overall form validity
    const checkFormValidity = () => {
        let isFormValid = true;
        
        elements.forEach(el => {
            // Check native validity
            if (!el.validity.valid) isFormValid = false;
            
            // Check custom validity (without updating UI unless they are touched)
            if (el.dataset.validation && el.value) {
                 const type = el.dataset.validation;
                 if (type === 'email' && !isValidEmail(el.value)) isFormValid = false;
                 if (type === 'phone' && !isValidPhone(el.value)) isFormValid = false;
                 if (type === 'gst' && !isValidGST(el.value)) isFormValid = false;
                 if (type === 'pan' && !isValidPAN(el.value)) isFormValid = false;
                 if (type === 'positive' && !isPositiveNumber(el.value)) isFormValid = false;
                 if (type === 'non-negative' && !isNonNegativeNumber(el.value)) isFormValid = false;
                 if (type === 'future-date' && !isFutureOrToday(el.value)) isFormValid = false;
            }
            if (options.customValidators && options.customValidators[el.id]) {
                 if (options.customValidators[el.id](el.value) !== true) isFormValid = false;
            }
        });

        // Toggle submit button
        if (submitBtn) {
            if (isFormValid) {
                submitBtn.removeAttribute('disabled');
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                submitBtn.setAttribute('disabled', 'true');
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    };

    // Attach listeners
    elements.forEach(el => {
        // Run validation check on input to enable/disable submit real-time
        el.addEventListener('input', () => {
            if (el.closest('.group').classList.contains('is-invalid')) {
                // If it's already showing error, re-validate immediately on input
                validateField(el); 
            }
            checkFormValidity();
        });
        
        // Run validation to show UI errors on blur (touch)
        el.addEventListener('blur', () => {
            validateField(el);
            // If it's empty but required, force error
            if (el.required && !el.value) {
                const wrapper = el.closest('.group');
                const errorSpan = document.getElementById(`${el.id}-error`);
                if (wrapper && errorSpan) {
                    wrapper.classList.add('is-invalid');
                    errorSpan.textContent = 'Required';
                    errorSpan.classList.remove('opacity-0');
                    errorSpan.classList.add('opacity-100');
                }
            }
            checkFormValidity();
        });
    });

    // Initial check (in case form is pre-filled or has no required fields)
    checkFormValidity();
}
