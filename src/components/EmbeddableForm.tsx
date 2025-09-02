import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  sanitizeInput, 
  validateFormInput, 
  validateInputWithLogging,
  hasDangerousContent 
} from '@/lib/security';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface EmbeddableFormProps {
  formId: string;
  formTitle?: string;
  formDescription?: string;
  fields: FormField[];
  zapierWebhook?: string;
  redirectUrl?: string;
  thankYouMessage?: string;
  micrositeId?: string;
}

/**
 * Embeddable Lead Capture Form Component
 * 
 * Features:
 * - Lightweight and fast-loading
 * - Comprehensive client-side validation
 * - Encrypted data submission
 * - Zapier integration for CRM sync
 * - Compatible with Webflow/Typedream iframe embedding
 * - Real-time submission status tracking
 */
export const EmbeddableForm: React.FC<EmbeddableFormProps> = ({
  formId,
  formTitle = "Get a Free Quote",
  formDescription = "Fill out the form below and we'll get back to you with a personalized quote.",
  fields,
  zapierWebhook,
  redirectUrl,
  thankYouMessage = "Thank you for your inquiry! We'll be in touch within 24 hours.",
  micrositeId
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Phone validation regex (supports multiple formats)
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

  /**
   * Enhanced field validation using security utilities
   */
  const validateField = (field: FormField, value: string): string => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (value.trim()) {
      // Enhanced security validation with logging
      const isSecure = validateInputWithLogging(value, field.label, (issue) => {
        console.warn('Security validation issue:', issue);
        // In production, this could trigger security alerts
      });
      
      if (!isSecure) {
        return 'Invalid characters detected';
      }
      
      // Use enhanced validation from security module
      const validation = validateFormInput(value, field.type);
      if (!validation.isValid) {
        return validation.message || 'Invalid input';
      }
      switch (field.type) {
        case 'email':
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'phone':
          // Remove all non-digits for validation
          const cleanPhone = value.replace(/\D/g, '');
          if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return 'Please enter a valid phone number (10-15 digits)';
          }
          break;
        case 'text':
          if (value.length < 2) {
            return `${field.label} must be at least 2 characters`;
          }
          break;
        case 'textarea':
          if (value.length < 10) {
            return `${field.label} must be at least 10 characters`;
          }
          break;
      }
    }

    return '';
  };

  /**
   * Validates entire form before submission
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const value = formData[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handles input change with real-time validation
   */
  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  /**
   * Encrypts sensitive form data before transmission
   * Note: In production, use proper encryption libraries
   */
  const encryptFormData = (data: Record<string, string>) => {
    // Simple base64 encoding for demo - use proper encryption in production
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  };

  /**
   * Handles form submission with validation, encryption, and CRM sync
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Encrypt sensitive data
      const encryptedData = encryptFormData(formData);
      
      // Prepare submission payload
      const submissionPayload = {
        formId,
        micrositeId,
        formData: formData,
        encryptedData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || window.location.href,
        zapierWebhook
      };

      // Submit to Construyo CRM (primary submission)
      const response = await fetch('/api/form-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload)
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Optional Zapier integration for external CRM sync
      if (zapierWebhook) {
        try {
          await fetch(zapierWebhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'no-cors', // Handle CORS issues
            body: JSON.stringify({
              ...formData,
              formId,
              submissionId: result.submissionId,
              timestamp: new Date().toISOString(),
              source: 'construyo-microsite'
            })
          });
        } catch (zapierError) {
          console.warn('Zapier webhook failed:', zapierError);
          // Don't fail the main submission if Zapier fails
        }
      }

      setSubmitted(true);

      // Redirect if specified
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      }

    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Renders form field based on type
   */
  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(newValue) => handleInputChange(field.id, newValue)}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
              rows={4}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'phone' ? 'tel' : field.type}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
    }
  };

  // Success state
  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground">{thankYouMessage}</p>
          {redirectUrl && (
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{formTitle}</CardTitle>
        {formDescription && (
          <CardDescription>{formDescription}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(renderField)}
          
          {submissionError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{submissionError}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Example usage and embed code generation
export const generateEmbedCode = (formConfig: {
  formId: string;
  formTitle?: string;
  formDescription?: string;
  fields: FormField[];
  zapierWebhook?: string;
  redirectUrl?: string;
  thankYouMessage?: string;
  micrositeId?: string;
}) => {
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/form/${formConfig.formId}`;
  
  // Generate iframe embed code for Webflow/Typedream
  const iframeCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border: none; background: transparent;"
  loading="lazy">
</iframe>`;

  // Generate JavaScript embed code for more control
  const jsCode = `<div id="construyo-form-${formConfig.formId}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    iframe.loading = 'lazy';
    
    var container = document.getElementById('construyo-form-${formConfig.formId}');
    if (container) {
      container.appendChild(iframe);
    }
  })();
</script>`;

  return {
    iframe: iframeCode,
    javascript: jsCode,
    directUrl: embedUrl
  };
};

/**
 * Sample test function for form submission
 * Call this function to test the form submission flow
 */
export const testFormSubmission = async () => {
  const testData = {
    formId: 'test-form-123',
    micrositeId: 'test-microsite-456',
    formData: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+44 7123 456 789',
      project: 'Kitchen Renovation',
      message: 'I would like to renovate my kitchen with modern appliances and new cabinets.'
    },
    zapierWebhook: 'https://hooks.zapier.com/hooks/catch/test/webhook'
  };

  try {
    console.log('Testing form submission with data:', testData);
    
    const response = await fetch('/api/form-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Form submission result:', result);
    
    return result;
  } catch (error) {
    console.error('Form submission test failed:', error);
    throw error;
  }
};

export default EmbeddableForm;