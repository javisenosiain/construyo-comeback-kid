import { BaseIntegrationService } from './BaseIntegrationService';

export class CalendlyService extends BaseIntegrationService {
  private baseUrl = 'https://api.calendly.com';

  constructor(rateLimiter: any, retryHandler: any, logger: any) {
    super('calendly', rateLimiter, retryHandler, logger);
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'schedule_booking':
        return await this.scheduleBooking(data);
      case 'get_availability':
        return await this.getAvailability(data);
      case 'create_event_type':
        return await this.createEventType(data);
      case 'get_scheduled_events':
        return await this.getScheduledEvents(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async scheduleBooking(bookingData: any): Promise<any> {
    // Calendly doesn't allow direct booking creation via API
    // Instead, generate a personalized booking link
    const eventTypeUri = bookingData.eventTypeUri || this.config?.defaultEventTypeUri;
    
    if (!eventTypeUri) {
      throw new Error('Event type URI not configured');
    }

    // Create a single-use scheduling link
    const url = `${this.baseUrl}/scheduling_links`;
    
    const payload = {
      max_event_count: 1,
      owner: eventTypeUri,
      owner_type: 'EventType'
    };

    const response = await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Optionally send the link via email or SMS
    if (bookingData.sendInvite) {
      await this.sendBookingInvite(bookingData, response.resource.booking_url);
    }

    return {
      booking_url: response.resource.booking_url,
      expires_at: response.resource.expires_at,
      event_type: eventTypeUri
    };
  }

  async getAvailability(availabilityData: any): Promise<any> {
    const userUri = availabilityData.userUri || this.config?.userUri;
    
    if (!userUri) {
      throw new Error('User URI not configured');
    }

    const startTime = availabilityData.startTime || new Date().toISOString();
    const endTime = availabilityData.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const url = `${this.baseUrl}/user_availability_schedules`;
    const params = new URLSearchParams({
      user: userUri,
      start_time: startTime,
      end_time: endTime
    });

    return await this.makeApiCall(`${url}?${params}`);
  }

  async createEventType(eventData: any): Promise<any> {
    const url = `${this.baseUrl}/event_types`;
    
    const payload = {
      name: eventData.name,
      duration: eventData.duration || 30,
      description_plain: eventData.description,
      kind: 'solo',
      scheduling_url: eventData.schedulingUrl,
      slug: eventData.slug,
      color: eventData.color || '#0069ff',
      type: 'StandardEventType'
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getScheduledEvents(queryData: any): Promise<any> {
    const userUri = queryData.userUri || this.config?.userUri;
    
    if (!userUri) {
      throw new Error('User URI not configured');
    }

    const url = `${this.baseUrl}/scheduled_events`;
    const params = new URLSearchParams({
      user: userUri,
      ...(queryData.status && { status: queryData.status }),
      ...(queryData.minStartTime && { min_start_time: queryData.minStartTime }),
      ...(queryData.maxStartTime && { max_start_time: queryData.maxStartTime })
    });

    return await this.makeApiCall(`${url}?${params}`);
  }

  async sendBookingInvite(bookingData: any, bookingUrl: string): Promise<any> {
    // This would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just return the data that should be sent
    return {
      to: bookingData.email,
      subject: `Schedule your ${bookingData.meetingType || 'consultation'}`,
      body: `
        Hi ${bookingData.name || 'there'},
        
        Please use the following link to schedule your appointment:
        ${bookingUrl}
        
        Best regards,
        ${bookingData.organizerName || 'Your Team'}
      `,
      bookingUrl
    };
  }

  async getStatus(): Promise<any> {
    try {
      // Test the API connection
      const url = `${this.baseUrl}/users/me`;
      const user = await this.makeApiCall(url);
      
      return {
        service: 'calendly',
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: true,
        user: user.resource?.name,
        lastActivity: await this.getLastActivity()
      };
    } catch (error) {
      return {
        service: 'calendly',
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: false,
        error: error.message,
        lastActivity: await this.getLastActivity()
      };
    }
  }
}