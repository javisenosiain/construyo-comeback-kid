import { supabase } from "@/integrations/supabase/client";

export interface IntegrationActivity {
  serviceName: string;
  action: string;
  data?: any;
  metadata?: {
    userId?: string;
    projectId?: string;
    leadId?: string;
    customerId?: string;
    [key: string]: any;
  };
  status: 'started' | 'success' | 'error' | 'retry';
  response?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

export interface IntegrationMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  commonErrors: Array<{ error: string; count: number }>;
  requestsByService: Record<string, number>;
  requestsByHour: Array<{ hour: string; count: number }>;
}

export class IntegrationLogger {
  private activeRequests: Map<string, { startTime: number; activity: IntegrationActivity }> = new Map();

  async logActivity(activity: IntegrationActivity): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const logEntry = {
        user_id: activity.metadata?.userId || user?.id,
        service_name: activity.serviceName,
        action: activity.action,
        status: activity.status,
        request_data: activity.data ? JSON.stringify(activity.data) : null,
        response_data: activity.response ? JSON.stringify(activity.response) : null,
        error_message: activity.error,
        metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
        duration_ms: activity.duration,
        created_at: activity.timestamp || new Date().toISOString()
      };

      const { error } = await supabase
        .from('integration_activity_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log integration activity:', error);
      }

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${activity.serviceName}] ${activity.action}: ${activity.status}`, {
          data: activity.data,
          response: activity.response,
          error: activity.error,
          duration: activity.duration
        });
      }
    } catch (error) {
      console.error('Error logging integration activity:', error);
    }
  }

  async startActivity(activityId: string, activity: IntegrationActivity): Promise<void> {
    const startTime = Date.now();
    this.activeRequests.set(activityId, {
      startTime,
      activity: { ...activity, status: 'started' }
    });

    await this.logActivity({ ...activity, status: 'started' });
  }

  async endActivity(activityId: string, status: 'success' | 'error', response?: any, error?: string): Promise<void> {
    const activeRequest = this.activeRequests.get(activityId);
    
    if (!activeRequest) {
      console.warn(`No active request found for activity ID: ${activityId}`);
      return;
    }

    const duration = Date.now() - activeRequest.startTime;
    
    await this.logActivity({
      ...activeRequest.activity,
      status,
      response,
      error,
      duration
    });

    this.activeRequests.delete(activityId);
  }

  async logError(serviceName: string, action: string, error: Error, metadata?: any): Promise<void> {
    await this.logActivity({
      serviceName,
      action,
      status: 'error',
      error: error.message,
      metadata,
      data: { errorStack: error.stack }
    });
  }

  async logRetry(serviceName: string, action: string, attempt: number, error: Error, metadata?: any): Promise<void> {
    await this.logActivity({
      serviceName,
      action: `${action}_retry_${attempt}`,
      status: 'retry',
      error: error.message,
      metadata: { ...metadata, retryAttempt: attempt }
    });
  }

  async getLastActivity(serviceName?: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let query = supabase
        .from('integration_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (serviceName) {
        query = query.eq('service_name', serviceName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get last activity:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting last activity:', error);
      return null;
    }
  }

  async getAnalytics(serviceName?: string, timeRange?: { start: Date; end: Date }): Promise<IntegrationMetrics> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('integration_activity_logs')
        .select('*')
        .eq('user_id', user.id);

      if (serviceName) {
        query = query.eq('service_name', serviceName);
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start.toISOString())
          .lte('created_at', timeRange.end.toISOString());
      } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      const { data: logs, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return this.calculateMetrics(logs || []);
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  private calculateMetrics(logs: any[]): IntegrationMetrics {
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.status === 'success').length;
    const errorRequests = logs.filter(log => log.status === 'error').length;
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // Calculate average response time
    const logsWithDuration = logs.filter(log => log.duration_ms > 0);
    const averageResponseTime = logsWithDuration.length > 0 
      ? logsWithDuration.reduce((sum, log) => sum + log.duration_ms, 0) / logsWithDuration.length
      : 0;

    // Count requests by service
    const requestsByService: Record<string, number> = {};
    logs.forEach(log => {
      requestsByService[log.service_name] = (requestsByService[log.service_name] || 0) + 1;
    });

    // Count errors
    const errorCounts: Record<string, number> = {};
    logs.filter(log => log.error_message).forEach(log => {
      const error = log.error_message;
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count requests by hour
    const requestsByHour: Array<{ hour: string; count: number }> = [];
    const hourCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      const hour = new Date(log.created_at).getHours().toString().padStart(2, '0') + ':00';
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      requestsByHour.push({ hour, count: hourCounts[hour] || 0 });
    }

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      commonErrors,
      requestsByService,
      requestsByHour
    };
  }

  async getServiceStatus(serviceName: string): Promise<any> {
    try {
      const recentActivity = await this.getLastActivity(serviceName);
      const analytics = await this.getAnalytics(serviceName, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      });

      return {
        serviceName,
        lastActivity: recentActivity,
        last24Hours: analytics,
        isHealthy: analytics.errorRate < 10 // Consider healthy if error rate < 10%
      };
    } catch (error) {
      console.error(`Error getting service status for ${serviceName}:`, error);
      return {
        serviceName,
        lastActivity: null,
        last24Hours: null,
        isHealthy: false,
        error: error.message
      };
    }
  }

  // Helper method to generate unique activity IDs
  generateActivityId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}