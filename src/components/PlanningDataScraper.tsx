import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Search, 
  MapPin, 
  Building, 
  Calendar, 
  Download, 
  Loader2,
  Database,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Link as LinkIcon
} from "lucide-react";

interface PlanningEntity {
  id: string;
  name: string;
  address: string; // Street address of the application site
  postcode: string;
  localAuthority: string;
  startDate: string;
  endDate: string;
  description: string; // Brief description of the application
  url: string; // Link to the application details
  geometry: string;
  applicant?: {
    name: string;
    email: string;
    telephone: string;
    address: string;
  };
  raw: any;
}

interface ApiResponse {
  success: boolean;
  filterType: string;
  filterValue: string;
  totalResults: number;
  cached: boolean;
  timestamp: string;
  entities: PlanningEntity[];
  error?: string;
}

export default function PlanningDataScraper() {
  const [filterType, setFilterType] = useState("local-authority");
  const [filterValue, setFilterValue] = useState("");
  const [limit, setLimit] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [zapierWebhook, setZapierWebhook] = useState("");

  /**
   * Execute planning data search
   * Sample usage: local-authority=chichester, postcode=PO19, organisation=chichester
   */
  const searchPlanningData = async () => {
    if (!filterValue.trim()) {
      toast.error("Please enter a filter value");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`🔍 Searching Planning Data API: ${filterType}=${filterValue}`);
      
      // Call our edge function with optional Zapier integration
      const { data, error } = await supabase.functions.invoke('planning-data-scraper', {
        body: {
          filterType,
          filterValue: filterValue.toLowerCase().trim(),
          limit,
          zapierWebhook: zapierWebhook.trim() || undefined
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch planning data');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Search completed in ${duration}ms`);

      // Extract and enhance results with description and link
      const extractedResults = (data.entities || []).map((entity: any) => ({
        id: entity.id || 'N/A',
        name: entity.name || 'N/A',
        address: entity.address || 'N/A', // Street address of application
        postcode: entity.postcode || 'N/A',
        localAuthority: entity.localAuthority || entity.organisation?.name || 'N/A',
        startDate: entity.startDate || 'N/A',
        endDate: entity.endDate || 'N/A',
        description: entity.description || entity.summary || entity.decisionDetails || 'N/A', // Brief description
        url: entity.url || '#', // Link to application
        geometry: entity.geometry || 'N/A',
        applicantName: entity.applicant?.name || entity.agent?.name || 'N/A',
        applicantEmail: entity.applicant?.email || entity.agent?.email || 'Not publicly available',
        applicantPhone: entity.applicant?.telephone || entity.contact || 'N/A',
        applicantAddress: entity.applicant?.address || 'N/A',
        raw: entity
      }));

      const response: ApiResponse = {
        success: true,
        filterType,
        filterValue,
        totalResults: data.totalResults || extractedResults.length,
        cached: data.cached,
        timestamp: new Date().toISOString(),
        entities: extractedResults
      };

      setResults(response);
      
      // Add to search history
      const searchTerm = `${filterType}=${filterValue}`;
      setSearchHistory(prev => 
        [searchTerm, ...prev.filter(item => item !== searchTerm)].slice(0
