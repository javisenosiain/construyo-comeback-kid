/**
 * Security utilities for input sanitization and validation
 */

// HTML entities to escape XSS attempts
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;'
};

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input.replace(/[&<>"'`=\/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Sanitize object with string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj } as T;
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    }
  }
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Check if string contains potentially dangerous patterns
 */
export function hasDangerousContent(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
    /onfocus=/i,
    /onblur=/i,
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
    /eval\(/i,
    /expression\(/i,
    /url\(/i,
    /@import/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Enhanced input validation for forms
 */
export function validateFormInput(input: string, fieldType: string = 'text'): { isValid: boolean; message?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, message: 'Input is required' };
  }

  // Check for dangerous content
  if (hasDangerousContent(input)) {
    return { isValid: false, message: 'Input contains potentially dangerous content' };
  }

  // Field-specific validation
  switch (fieldType) {
    case 'email':
      if (!isValidEmail(input)) {
        return { isValid: false, message: 'Invalid email format' };
      }
      break;
    case 'phone':
      if (!isValidPhone(input)) {
        return { isValid: false, message: 'Invalid phone number format' };
      }
      break;
    case 'name':
      if (input.length < 2 || input.length > 100) {
        return { isValid: false, message: 'Name must be between 2 and 100 characters' };
      }
      if (!/^[a-zA-Z\s\-'\.]+$/.test(input)) {
        return { isValid: false, message: 'Name contains invalid characters' };
      }
      break;
    case 'text':
      if (input.length > 5000) {
        return { isValid: false, message: 'Text is too long (max 5000 characters)' };
      }
      break;
    case 'url':
      try {
        new URL(input);
      } catch {
        return { isValid: false, message: 'Invalid URL format' };
      }
      break;
  }

  return { isValid: true };
}

/**
 * Content Security Policy generator
 */
export function generateCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.supabase.co https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomArray[i] % chars.length];
  }
  
  return result;
}

/**
 * Rate limiting for client-side actions
 */
class ClientRateLimit {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const existing = this.attempts.get(key);
    
    if (!existing) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - existing.firstAttempt > windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }
    
    // Check if limit exceeded
    if (existing.count >= maxAttempts) {
      return false;
    }
    
    // Increment count
    existing.count++;
    return true;
  }
  
  clear(key: string): void {
    this.attempts.delete(key);
  }
}

export const clientRateLimit = new ClientRateLimit();