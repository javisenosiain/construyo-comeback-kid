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
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
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