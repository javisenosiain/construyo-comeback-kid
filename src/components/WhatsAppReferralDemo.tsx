import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, BarChart, Users, Link as LinkIcon, CheckCircle } from 'lucide-react';

/**
 * Sample Test Component for WhatsApp Referral System
 * Demonstrates the complete workflow for user123
 */
export const WhatsAppReferralDemo: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  /**
   * Sample function call to send referral message for user with ID "user123"
   * This demonstrates the complete WhatsApp referral workflow
   */
  const sendReferralForUser123 = async () => {
    setTesting(true);
    try {
      // Sample contacts for user123
      const sampleContacts = [
        {
          id: 'contact_user123_1',
          phone: '+447123456789',
          name: 'John Smith',
          email: 'john.smith@example.com',
          status: 'pending' as const
        },
        {
          id: 'contact_user123_2', 
          phone: '+447987654321',
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          status: 'pending' as const
        }
      ];

      // Sample referral campaign data for user123
      const campaignData = {
        campaignId: 'campaign_user123_spring2024',
        campaignName: 'User123 Spring Construction Promotion',
        referralLink: 'https://example.com/microsite/user123-construction?ref=USER123SPRING&utm_source=whatsapp&utm_medium=referral&utm_campaign=spring2024',
        messageTemplate: `🏗️ Hi {name}! I recently had amazing construction work done and wanted to share this company with you. They're offering free quotes and excellent service! Check them out: {link}

Quality work, fair prices, and they really deliver on time. Let me know what you think! 😊`,
        rewardDescription: '10% discount for both referrer and new customer'
      };

      console.log('🚀 Starting WhatsApp referral send for user123...');
      console.log('Campaign:', campaignData.campaignName);
      console.log('Contacts:', sampleContacts.length);
      console.log('Message template preview:', campaignData.messageTemplate.substring(0, 100) + '...');

      // Call the WhatsApp referral edge function
      const response = await fetch('/api/whatsapp-referral-sender', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_bulk_referral',
          campaignId: campaignData.campaignId,
          contacts: sampleContacts,
          referralLink: campaignData.referralLink,
          messageTemplate: campaignData.messageTemplate,
          campaignName: campaignData.campaignName
        })
      });

      const result = await response.json();
      
      console.log('✅ Referral send result:', result);
      
      setTestResults({
        success: result.success,
        totalContacts: result.totalContacts || sampleContacts.length,
        sent: result.sent || 0,
        failed: result.failed || 0,
        merged: result.merged || 0,
        errors: result.errors || [],
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        console.log(`📱 Successfully sent ${result.sent} WhatsApp referral messages for user123`);
        console.log(`📊 Campaign: ${campaignData.campaignName}`);
        console.log(`🔗 Referral link: ${campaignData.referralLink}`);
      }

    } catch (error) {
      console.error('❌ Error sending referral for user123:', error);
      setTestResults({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Referral Demo - User123
        </CardTitle>
        <CardDescription>
          Test the complete WhatsApp referral workflow with sample data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo Information */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-semibold">Sample Campaign Details:</h4>
          <ul className="text-sm space-y-1">
            <li>• <strong>User:</strong> user123</li>
            <li>• <strong>Campaign:</strong> Spring Construction Promotion 2024</li>
            <li>• <strong>Contacts:</strong> 2 sample contacts (John Smith, Jane Doe)</li>
            <li>• <strong>Integration:</strong> Respond.io WhatsApp API</li>
            <li>• <strong>Features:</strong> Duplicate merging, rate limiting, analytics tracking</li>
          </ul>
        </div>

        {/* Test Button */}
        <Button 
          onClick={sendReferralForUser123}
          disabled={testing}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending WhatsApp Referrals...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Sample Referral for User123
            </>
          )}
        </Button>

        {/* Results Display */}
        {testResults && (
          <div className="mt-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              {testResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 bg-red-600 rounded-full" />
              )}
              <h4 className="font-semibold">
                {testResults.success ? 'Success!' : 'Failed'}
              </h4>
            </div>

            {testResults.success ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Contacts</p>
                  <p className="font-semibold">{testResults.totalContacts}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Successfully Sent</p>
                  <p className="font-semibold text-green-600">{testResults.sent}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-semibold text-red-600">{testResults.failed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contacts Merged</p>
                  <p className="font-semibold">{testResults.merged}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-red-600">Error: {testResults.error}</p>
              </div>
            )}

            {testResults.errors && testResults.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium">Errors:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {testResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Tested at: {new Date(testResults.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Feature List */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Key Features Demonstrated:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-3 w-3" />
              <span>Trackable referral links</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              <span>WhatsApp API integration</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              <span>Duplicate contact merging</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="h-3 w-3" />
              <span>Analytics tracking</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppReferralDemo;