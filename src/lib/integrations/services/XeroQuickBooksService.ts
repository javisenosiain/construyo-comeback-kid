import { BaseIntegrationService } from './BaseIntegrationService';

export class XeroQuickBooksService extends BaseIntegrationService {
  private provider: 'xero' | 'quickbooks';
  private baseUrl: string;

  constructor(rateLimiter: any, retryHandler: any, logger: any, provider: 'xero' | 'quickbooks') {
    super(provider, rateLimiter, retryHandler, logger);
    this.provider = provider;
    this.baseUrl = provider === 'xero' 
      ? 'https://api.xero.com/api.xro/2.0' 
      : 'https://sandbox-quickbooks.api.intuit.com/v3/company';
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'sync_invoice':
        return await this.syncInvoice(data);
      case 'create_contact':
        return await this.createContact(data);
      case 'get_invoices':
        return await this.getInvoices(data);
      case 'update_payment_status':
        return await this.updatePaymentStatus(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async syncInvoice(invoiceData: any): Promise<any> {
    if (this.provider === 'xero') {
      return await this.syncInvoiceXero(invoiceData);
    } else {
      return await this.syncInvoiceQuickBooks(invoiceData);
    }
  }

  private async syncInvoiceXero(invoiceData: any): Promise<any> {
    const url = `${this.baseUrl}/Invoices`;
    
    const payload = {
      Invoices: [{
        Type: 'ACCREC',
        Contact: {
          ContactID: invoiceData.contactId || await this.getOrCreateContactXero(invoiceData.customer)
        },
        Date: invoiceData.date || new Date().toISOString().split('T')[0],
        DueDate: invoiceData.dueDate,
        InvoiceNumber: invoiceData.invoiceNumber,
        Reference: invoiceData.reference || `CRM-${invoiceData.crmInvoiceId}`,
        LineItems: invoiceData.lineItems.map(item => ({
          Description: item.description,
          Quantity: item.quantity || 1,
          UnitAmount: item.unitAmount,
          TaxType: item.taxType || 'NONE',
          AccountCode: item.accountCode || '200'
        })),
        Status: invoiceData.status || 'DRAFT'
      }]
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
        'Xero-tenant-id': this.config?.tenantId,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  private async syncInvoiceQuickBooks(invoiceData: any): Promise<any> {
    const companyId = this.config?.companyId;
    const url = `${this.baseUrl}/${companyId}/invoice`;
    
    const payload = {
      Name: invoiceData.invoiceNumber,
      CustomerRef: {
        value: invoiceData.customerId || await this.getOrCreateContactQuickBooks(invoiceData.customer)
      },
      TxnDate: invoiceData.date || new Date().toISOString().split('T')[0],
      DueDate: invoiceData.dueDate,
      Line: invoiceData.lineItems.map((item, index) => ({
        Id: index + 1,
        Amount: item.quantity * item.unitAmount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: item.itemId || '1' // Default service item
          },
          Qty: item.quantity || 1,
          UnitPrice: item.unitAmount
        }
      }))
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  async createContact(contactData: any): Promise<any> {
    if (this.provider === 'xero') {
      return await this.createContactXero(contactData);
    } else {
      return await this.createContactQuickBooks(contactData);
    }
  }

  private async createContactXero(contactData: any): Promise<any> {
    const url = `${this.baseUrl}/Contacts`;
    
    const payload = {
      Contacts: [{
        Name: contactData.name,
        EmailAddress: contactData.email,
        Phones: contactData.phone ? [{
          PhoneType: 'DEFAULT',
          PhoneNumber: contactData.phone
        }] : [],
        Addresses: contactData.address ? [{
          AddressType: 'STREET',
          AddressLine1: contactData.address.line1,
          City: contactData.address.city,
          PostalCode: contactData.address.postalCode,
          Country: contactData.address.country
        }] : []
      }]
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
        'Xero-tenant-id': this.config?.tenantId,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  private async createContactQuickBooks(contactData: any): Promise<any> {
    const companyId = this.config?.companyId;
    const url = `${this.baseUrl}/${companyId}/customer`;
    
    const payload = {
      Name: contactData.name,
      PrimaryEmailAddr: contactData.email ? {
        Address: contactData.email
      } : undefined,
      PrimaryPhone: contactData.phone ? {
        FreeFormNumber: contactData.phone
      } : undefined,
      BillAddr: contactData.address ? {
        Line1: contactData.address.line1,
        City: contactData.address.city,
        PostalCode: contactData.address.postalCode,
        Country: contactData.address.country
      } : undefined
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  private async getOrCreateContactXero(customerData: any): Promise<string> {
    // Try to find existing contact
    const searchUrl = `${this.baseUrl}/Contacts?where=EmailAddress="${customerData.email}"`;
    
    try {
      const response = await this.makeApiCall(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.config?.accessToken}`,
          'Xero-tenant-id': this.config?.tenantId,
          'Accept': 'application/json'
        }
      });

      if (response.Contacts && response.Contacts.length > 0) {
        return response.Contacts[0].ContactID;
      }
    } catch (error) {
      // Contact not found, create new one
    }

    const newContact = await this.createContactXero(customerData);
    return newContact.Contacts[0].ContactID;
  }

  private async getOrCreateContactQuickBooks(customerData: any): Promise<string> {
    const companyId = this.config?.companyId;
    const searchUrl = `${this.baseUrl}/${companyId}/query?query=SELECT * FROM Customer WHERE PrimaryEmailAddr = '${customerData.email}'`;
    
    try {
      const response = await this.makeApiCall(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.config?.accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.QueryResponse.Customer && response.QueryResponse.Customer.length > 0) {
        return response.QueryResponse.Customer[0].Id;
      }
    } catch (error) {
      // Customer not found, create new one
    }

    const newCustomer = await this.createContactQuickBooks(customerData);
    return newCustomer.Customer.Id;
  }

  async getInvoices(queryData: any): Promise<any> {
    if (this.provider === 'xero') {
      const url = `${this.baseUrl}/Invoices`;
      return await this.makeApiCall(url, {
        headers: {
          'Authorization': `Bearer ${this.config?.accessToken}`,
          'Xero-tenant-id': this.config?.tenantId,
          'Accept': 'application/json'
        }
      });
    } else {
      const companyId = this.config?.companyId;
      const url = `${this.baseUrl}/${companyId}/query?query=SELECT * FROM Invoice`;
      return await this.makeApiCall(url, {
        headers: {
          'Authorization': `Bearer ${this.config?.accessToken}`,
          'Accept': 'application/json'
        }
      });
    }
  }

  async updatePaymentStatus(paymentData: any): Promise<any> {
    // Implementation for updating payment status
    // This would involve creating payment records and linking them to invoices
    throw new Error('Payment status update not implemented yet');
  }

  async getStatus(): Promise<any> {
    return {
      service: this.provider,
      enabled: this.config?.enabled || false,
      configured: !!(this.config?.accessToken && (this.provider === 'xero' ? this.config?.tenantId : this.config?.companyId)),
      connected: !!this.config?.accessToken,
      lastActivity: await this.getLastActivity()
    };
  }
}