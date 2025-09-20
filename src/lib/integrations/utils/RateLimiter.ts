interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay?: number;
}

interface RateLimitState {
  requests: number[];
  hourlyRequests: number[];
  dailyRequests: number[];
}

export class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  // Default rate limits for different services
  private defaultLimits: Record<string, RateLimitConfig> = {
    zapier: { requestsPerMinute: 100, requestsPerHour: 1000 },
    airtable: { requestsPerMinute: 5, requestsPerHour: 1000 },
    stripe: { requestsPerMinute: 100, requestsPerHour: 1000 },
    calendly: { requestsPerMinute: 100, requestsPerHour: 1000 },
    xero: { requestsPerMinute: 60, requestsPerHour: 1000 },
    quickbooks: { requestsPerMinute: 100, requestsPerHour: 500 },
    buffer: { requestsPerMinute: 10, requestsPerHour: 300 },
    canva: { requestsPerMinute: 10, requestsPerHour: 100 },
    webflow: { requestsPerMinute: 60, requestsPerHour: 1000 },
    typedream: { requestsPerMinute: 60, requestsPerHour: 1000 },
    openai: { requestsPerMinute: 20, requestsPerHour: 500 },
    runwayml: { requestsPerMinute: 10, requestsPerHour: 100 }
  };

  constructor() {
    // Initialize default configurations
    Object.entries(this.defaultLimits).forEach(([service, config]) => {
      this.configs.set(service, config);
      this.limits.set(service, {
        requests: [],
        hourlyRequests: [],
        dailyRequests: []
      });
    });

    // Clean up old requests every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(serviceName: string): Promise<{ allowed: boolean; resetIn?: number; remaining?: number }> {
    const config = this.configs.get(serviceName) || this.defaultLimits[serviceName];
    if (!config) {
      // If no config, allow the request
      return { allowed: true };
    }

    const state = this.getOrCreateState(serviceName);
    const now = Date.now();

    // Clean up old requests
    this.cleanupServiceRequests(state, now);

    // Check minute limit
    const minuteLimit = config.requestsPerMinute;
    const recentRequests = state.requests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= minuteLimit) {
      const oldestRequest = Math.min(...recentRequests);
      const resetIn = Math.ceil((oldestRequest + 60000 - now) / 1000);
      return { 
        allowed: false, 
        resetIn,
        remaining: 0
      };
    }

    // Check hourly limit
    const hourlyLimit = config.requestsPerHour;
    const hourlyRequests = state.hourlyRequests.filter(time => now - time < 3600000);
    
    if (hourlyRequests.length >= hourlyLimit) {
      const oldestRequest = Math.min(...hourlyRequests);
      const resetIn = Math.ceil((oldestRequest + 3600000 - now) / 1000);
      return { 
        allowed: false, 
        resetIn,
        remaining: 0
      };
    }

    // Check daily limit if configured
    if (config.requestsPerDay) {
      const dailyRequests = state.dailyRequests.filter(time => now - time < 86400000);
      
      if (dailyRequests.length >= config.requestsPerDay) {
        const oldestRequest = Math.min(...dailyRequests);
        const resetIn = Math.ceil((oldestRequest + 86400000 - now) / 1000);
        return { 
          allowed: false, 
          resetIn,
          remaining: 0
        };
      }
    }

    // Record the request
    state.requests.push(now);
    state.hourlyRequests.push(now);
    if (config.requestsPerDay) {
      state.dailyRequests.push(now);
    }

    return { 
      allowed: true, 
      remaining: minuteLimit - recentRequests.length - 1
    };
  }

  private getOrCreateState(serviceName: string): RateLimitState {
    if (!this.limits.has(serviceName)) {
      this.limits.set(serviceName, {
        requests: [],
        hourlyRequests: [],
        dailyRequests: []
      });
    }
    return this.limits.get(serviceName)!;
  }

  private cleanupServiceRequests(state: RateLimitState, now: number) {
    // Remove requests older than 1 minute
    state.requests = state.requests.filter(time => now - time < 60000);
    
    // Remove requests older than 1 hour
    state.hourlyRequests = state.hourlyRequests.filter(time => now - time < 3600000);
    
    // Remove requests older than 1 day
    state.dailyRequests = state.dailyRequests.filter(time => now - time < 86400000);
  }

  private cleanup() {
    const now = Date.now();
    
    for (const [serviceName, state] of this.limits.entries()) {
      this.cleanupServiceRequests(state, now);
    }
  }

  setConfig(serviceName: string, config: RateLimitConfig) {
    this.configs.set(serviceName, config);
    if (!this.limits.has(serviceName)) {
      this.limits.set(serviceName, {
        requests: [],
        hourlyRequests: [],
        dailyRequests: []
      });
    }
  }

  getStats(serviceName: string): any {
    const state = this.limits.get(serviceName);
    const config = this.configs.get(serviceName);
    
    if (!state || !config) {
      return null;
    }

    const now = Date.now();
    const recentRequests = state.requests.filter(time => now - time < 60000);
    const hourlyRequests = state.hourlyRequests.filter(time => now - time < 3600000);
    const dailyRequests = state.dailyRequests.filter(time => now - time < 86400000);

    return {
      service: serviceName,
      minute: {
        used: recentRequests.length,
        limit: config.requestsPerMinute,
        remaining: config.requestsPerMinute - recentRequests.length
      },
      hour: {
        used: hourlyRequests.length,
        limit: config.requestsPerHour,
        remaining: config.requestsPerHour - hourlyRequests.length
      },
      ...(config.requestsPerDay && {
        day: {
          used: dailyRequests.length,
          limit: config.requestsPerDay,
          remaining: config.requestsPerDay - dailyRequests.length
        }
      })
    };
  }

  getAllStats(): any {
    const stats = {};
    for (const serviceName of this.configs.keys()) {
      stats[serviceName] = this.getStats(serviceName);
    }
    return stats;
  }
}