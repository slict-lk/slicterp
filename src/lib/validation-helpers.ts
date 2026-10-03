/**
 * Validation Helper Functions
 * Common validation utilities for forms and data
 */

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (basic international format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// SKU validation (alphanumeric with dashes)
export function isValidSKU(sku: string): boolean {
  const skuRegex = /^[A-Z0-9\-]+$/;
  return skuRegex.test(sku);
}

// Price validation (positive number with max 2 decimals)
export function isValidPrice(price: number | string): boolean {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) && num >= 0 && /^\d+(\.\d{1,2})?$/.test(num.toString());
}

// Quantity validation (positive number)
export function isValidQuantity(quantity: number | string): boolean {
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  return !isNaN(num) && num > 0;
}

// Tax percentage validation (0-100)
export function isValidTaxRate(rate: number | string): boolean {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate;
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Discount validation (0-100)
export function isValidDiscount(discount: number | string): boolean {
  const num = typeof discount === 'string' ? parseFloat(discount) : discount;
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Date validation (not in past for certain fields)
export function isValidFutureDate(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

// Password strength validation
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Include lowercase letters');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Include uppercase letters');
  } else {
    score++;
  }

  if (!/\d/.test(password)) {
    feedback.push('Include numbers');
  } else {
    score++;
  }

  if (!/[!@#$%^&*]/.test(password)) {
    feedback.push('Include special characters (!@#$%^&*)');
  } else {
    score++;
  }

  return {
    isValid: score >= 3,
    score,
    feedback,
  };
}

// Credit card validation (Luhn algorithm)
export function isValidCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleaned)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// File validation
export interface FileValidation {
  isValid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): FileValidation {
  const { maxSizeMB = 5, allowedTypes = [] } = options;

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (allowedTypes.length > 0) {
    const fileType = file.type;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    const isTypeAllowed = allowedTypes.some(
      type => fileType.includes(type) || fileExtension === type
    );
    
    if (!isTypeAllowed) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}`,
      };
    }
  }

  return { isValid: true };
}

// Business number validation (EIN for US)
export function isValidEIN(ein: string): boolean {
  const cleanedEIN = ein.replace(/\D/g, '');
  return cleanedEIN.length === 9;
}

// Postal code validation (flexible)
export function isValidPostalCode(postalCode: string, country: string = 'US'): boolean {
  const patterns: { [key: string]: RegExp } = {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  };

  const pattern = patterns[country];
  return pattern ? pattern.test(postalCode) : true;
}

// Required field validation
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// Min/Max length validation
export function validateLength(
  value: string,
  min: number,
  max: number
): { isValid: boolean; error?: string } {
  if (value.length < min) {
    return { isValid: false, error: `Minimum ${min} characters required` };
  }
  if (value.length > max) {
    return { isValid: false, error: `Maximum ${max} characters allowed` };
  }
  return { isValid: true };
}

// Range validation
export function validateRange(
  value: number,
  min: number,
  max: number
): { isValid: boolean; error?: string } {
  if (value < min) {
    return { isValid: false, error: `Minimum value is ${min}` };
  }
  if (value > max) {
    return { isValid: false, error: `Maximum value is ${max}` };
  }
  return { isValid: true };
}

// Array validation
export function validateArray(
  arr: any[],
  options: {
    minLength?: number;
    maxLength?: number;
    unique?: boolean;
  } = {}
): { isValid: boolean; error?: string } {
  const { minLength = 0, maxLength = Infinity, unique = false } = options;

  if (arr.length < minLength) {
    return { isValid: false, error: `At least ${minLength} items required` };
  }

  if (arr.length > maxLength) {
    return { isValid: false, error: `Maximum ${maxLength} items allowed` };
  }

  if (unique && new Set(arr).size !== arr.length) {
    return { isValid: false, error: 'All items must be unique' };
  }

  return { isValid: true };
}

// Custom regex validation
export function validatePattern(
  value: string,
  pattern: RegExp,
  errorMessage: string
): { isValid: boolean; error?: string } {
  if (!pattern.test(value)) {
    return { isValid: false, error: errorMessage };
  }
  return { isValid: true };
}

// Sanitize input (remove dangerous characters)
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate object has required fields
export function validateRequiredFields(
  obj: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => !isRequired(obj[field]));
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// Format validation error message
export function formatValidationError(field: string, error: string): string {
  return `${field}: ${error}`;
}

// Batch validation
export function batchValidate(
  validations: Array<() => { isValid: boolean; error?: string }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const validation of validations) {
    const result = validation();
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
