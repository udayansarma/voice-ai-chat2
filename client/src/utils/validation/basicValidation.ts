/**
 * Simple validation helpers for form fields
 * No external dependencies - just basic string validation
 */

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  
  if (value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  
  return null;
};

export const validateLength = (value: string, max: number, fieldName: string): string | null => {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  
  if (value.length > max) {
    return `${fieldName} must be less than ${max} characters`;
  }
  
  return null;
};

export const validateMinLength = (value: string, min: number, fieldName: string): string | null => {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  
  if (value.trim().length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  
  return null;
};

/**
 * Validate a field with multiple rules
 * Returns the first error found, or null if valid
 */
export const validateField = (
  value: string, 
  fieldName: string, 
  rules: {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
  }
): string | null => {
  if (rules.required) {
    const requiredError = validateRequired(value, fieldName);
    if (requiredError) return requiredError;
  }
  
  if (rules.minLength !== undefined) {
    const minLengthError = validateMinLength(value, rules.minLength, fieldName);
    if (minLengthError) return minLengthError;
  }
  
  if (rules.maxLength !== undefined) {
    const maxLengthError = validateLength(value, rules.maxLength, fieldName);
    if (maxLengthError) return maxLengthError;
  }
  
  return null;
};

/**
 * Common validation rules for different entity types
 */
export const validationRules = {
  name: { required: true, maxLength: 100, minLength: 1 },
  description: { maxLength: 500 },
  prompt: { required: true, maxLength: 2000, minLength: 1 },
  mood: { required: true, maxLength: 50, minLength: 1 }
} as const;
