import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface CRMSyncButtonProps {
  recordType: 'lead' | 'customer' | 'invoice';
  recordId: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export const CRMSyncButton: React.FC<CRMSyncButtonProps> = ({
  recordType,
  recordId,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{
    status: 'success' | 'failed' | null;
    timestamp?: string;
    error?: string;
  }>({ status: null });

  /**
   * Sample call to sync lead "lead123" to HubSpot:
   * syncToExternalCRM('lead', 'lead123')
   */
  const syncToExternalCRM = async (recordType: string, recordId: string) => {
    setSyncing(true);
    
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the external CRM sync edge function
      const { data, error } = await supabase.functions.invoke('external-crm-sync', {
        body: {
          recordType,
          recordId,
          externalCrm: 'hubspot' // This would be determined by user settings
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setLastSyncStatus({
          status: 'success',
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Sync Successful",
          description: `${recordType} synced to external CRM successfully`,
        });
      } else {
        throw new Error(data.error || 'Sync failed');
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      
      setLastSyncStatus({
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync to external CRM',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = () => {
    syncToExternalCRM(recordType, recordId);
  };

  const getSyncStatusIcon = () => {
    if (syncing) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    
    if (lastSyncStatus.status === 'success') {
      return <ExternalLink className="h-3 w-3 text-green-600" />;
    }
    
    if (lastSyncStatus.status === 'failed') {
      return <AlertCircle className="h-3 w-3 text-red-600" />;
    }
    
    return <ExternalLink className="h-3 w-3" />;
  };

  const getTooltipContent = () => {
    if (syncing) {
      return 'Syncing to external CRM...';
    }
    
    if (lastSyncStatus.status === 'success') {
      return `Last synced: ${new Date(lastSyncStatus.timestamp!).toLocaleString()}`;
    }
    
    if (lastSyncStatus.status === 'failed') {
      return `Sync failed: ${lastSyncStatus.error}`;
    }
    
    return 'Sync to external CRM';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size={size}
            variant={variant}
            className={`flex items-center gap-1 ${className}`}
          >
            {getSyncStatusIcon()}
            {size !== 'sm' && (
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};