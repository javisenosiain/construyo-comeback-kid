interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export class RetryHandler {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'SERVER_ERROR'
    ]
  };

  private serviceConfigs: Map<string, RetryConfig> = new Map();

  constructor() {
    // Set specific retry configs for different services
    this.serviceConfigs.set('airtable', {
      ...this.defaultConfig,
      maxRetries: 5, // Airtable can be flaky
      initialDelay: 2000
    });

    this.serviceConfigs.set('stripe', {
      ...this.defaultConfig,
      maxRetries: 2, // Stripe is usually reliable
      initialDelay: 500
    });

    this.serviceConfigs.set('openai', {
      ...this.defaultConfig,
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 60000 // Longer max delay for AI generation
    });

    this.serviceConfigs.set('runwayml', {
      ...this.defaultConfig,
      maxRetries: 2,
      initialDelay: 2000,
      maxDelay: 120000 // Very long max delay for video generation
    });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    initialDelay?: number,
    serviceName?: string
  ): Promise<T> {
    const config = serviceName ? 
      (this.serviceConfigs.get(serviceName) || this.defaultConfig) : 
      this.defaultConfig;

    const retries = maxRetries ?? config.maxRetries;
    const delay = initialDelay ?? config.initialDelay;

    let lastError: Error;
    let currentDelay = delay;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          console.log(`Operation succeeded on attempt ${attempt + 1}/${retries + 1}${serviceName ? ` for ${serviceName}` : ''}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is the last attempt
        if (attempt === retries) {
          console.error(`Operation failed after ${retries + 1} attempts${serviceName ? ` for ${serviceName}` : ''}:`, error);
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error, config)) {
          console.error(`Non-retryable error encountered${serviceName ? ` for ${serviceName}` : ''}:`, error);
          throw error;
        }

        // Log retry attempt
        console.warn(`Attempt ${attempt + 1}/${retries + 1} failed${serviceName ? ` for ${serviceName}` : ''}, retrying in ${currentDelay}ms:`, error.message);

        // Wait before retrying
        await this.delay(currentDelay);

        // Increase delay for next attempt (exponential backoff)
        currentDelay = Math.min(currentDelay * config.backoffFactor, config.maxDelay);
      }
    }

    throw lastError;
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name;

    // Check for specific error patterns
    const retryablePatterns = [
      ...config.retryableErrors.map(e => e.toLowerCase()),
      'timeout',
      'network',
      'connection',
      'socket',
      '429', // Rate limited
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      'fetch failed',
      'failed to fetch'
    ];

    return retryablePatterns.some(pattern => 
      errorMessage.includes(pattern) || errorName.toLowerCase().includes(pattern)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Specific retry methods for different types of operations
  async executeApiCall<T>(
    apiCall: () => Promise<T>,
    serviceName: string,
    operationType: 'read' | 'write' | 'create' | 'update' | 'delete' = 'read'
  ): Promise<T> {
    const config = this.getConfigForOperation(serviceName, operationType);
    
    return this.executeWithRetry(
      apiCall,
      config.maxRetries,
      config.initialDelay,
      serviceName
    );
  }

  async executeWebhookCall<T>(
    webhookCall: () => Promise<T>,
    serviceName: string = 'webhook'
  ): Promise<T> {
    // Webhooks get more retries since they're often unreliable
    return this.executeWithRetry(
      webhookCall,
      5, // More retries for webhooks
      1000, // Start with 1 second
      serviceName
    );
  }

  async executeFileOperation<T>(
    fileOperation: () => Promise<T>,
    serviceName: string = 'file'
  ): Promise<T> {
    // File operations get fewer retries but longer delays
    return this.executeWithRetry(
      fileOperation,
      2,
      2000,
      serviceName
    );
  }

  private getConfigForOperation(serviceName: string, operationType: string): RetryConfig {
    const baseConfig = this.serviceConfigs.get(serviceName) || this.defaultConfig;
    
    // Adjust retries based on operation type
    switch (operationType) {
      case 'read':
        return { ...baseConfig, maxRetries: baseConfig.maxRetries + 1 }; // More retries for reads
      case 'write':
      case 'create':
      case 'update':
        return { ...baseConfig, maxRetries: Math.max(1, baseConfig.maxRetries - 1) }; // Fewer retries for writes
      case 'delete':
        return { ...baseConfig, maxRetries: 1 }; // Very few retries for deletes
      default:
        return baseConfig;
    }
  }

  setServiceConfig(serviceName: string, config: Partial<RetryConfig>) {
    const currentConfig = this.serviceConfigs.get(serviceName) || this.defaultConfig;
    this.serviceConfigs.set(serviceName, { ...currentConfig, ...config });
  }

  getServiceConfig(serviceName: string): RetryConfig {
    return this.serviceConfigs.get(serviceName) || this.defaultConfig;
  }
}