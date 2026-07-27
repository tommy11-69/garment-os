/**
 * Form Validation Utilities for Garment OS
 */

// Common Regex Patterns
export const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // Basic phone validation (10 digits, optional country code)
    phone: /^(\+\d{1,3}[- ]?)?\d{10}$/,
    // GSTIN format: 2 digits + 10 alphanumeric (PAN) + 1 alphanumeric + Z + 1 alphanumeric
    gst: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/i,
    // PAN format: 5 letters, 4 numbers, 1 letter
    pan: /^[A-Z]{5}\d{4}[A-Z]{1}$/i
};

/**
 * Validates an email address.
 */
export function isValidEmail(email) {
    if (!email) return true; // Optional fields pass
    return patterns.email.test(email.trim());
}

/**
 * Validates a phone number.
 */
export function isValidPhone(phone) {
    if (!phone) return true;
    return patterns.phone.test(phone.trim().replace(/[\s-]/g, ''));
}

/**
 * Validates an Indian GST number.
 */
export function isValidGST(gst) {
    if (!gst) return true;
    return patterns.gst.test(gst.trim());
}

/**
 * Validates an Indian PAN number.
 */
export function isValidPAN(pan) {
    if (!pan) return true;
    return patterns.pan.test(pan.trim());
}

/**
 * Validates that a value is a positive number (greater than 0).
 */
export function isPositiveNumber(num) {
    if (num === null || num === undefined || num === '') return false;
    const value = Number(num);
    return !isNaN(value) && value > 0;
}

/**
 * Validates that a value is not negative (greater than or equal to 0).
 */
export function isNonNegativeNumber(num) {
    if (num === null || num === undefined || num === '') return false;
    const value = Number(num);
    return !isNaN(value) && value >= 0;
}

/**
 * Validates a date string ensures it is today or in the future.
 */
export function isFutureOrToday(dateString) {
    if (!dateString) return false;
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day comparison
    return inputDate >= today;
}
