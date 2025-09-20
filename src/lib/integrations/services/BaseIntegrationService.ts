export abstract class BaseIntegrationService {
  protected config: any = null;
  protected serviceName: string;
  protected rateLimiter: any;
  protected retryHandler: any;
  protected logger: any;

  constructor(serviceName: string, rateLimiter: any, retryHandler: any, logger: any) {
    this.serviceName = serviceName;
    this.rateLimiter = rateLimiter;
    this.retryHandler = retryHandler;
    this.logger = logger;
  }

  configure(config: any) {
    this.config = config;
  }

  abstract executeAction(action: string, data: any, metadata?: any): Promise<any>;
  abstract getStatus(): Promise<any>;

  protected async getLastActivity(): Promise<any> {
    try {
      return await this.logger.getLastActivity(this.serviceName);
    } catch (error) {
      return null;
    }
  }

  protected async makeApiCall(url: string, options: RequestInit = {}): Promise<any> {
    // Check rate limits
    const rateLimitCheck = await this.rateLimiter.checkLimit(this.serviceName);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${rateLimitCheck.resetIn} seconds`);
    }

    // Add authentication headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Construyo-Integration/1.0',
      ...options.headers
    };

    if (this.config?.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}