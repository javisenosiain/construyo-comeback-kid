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
  Link as LinkIcon
} from "lucide-react";

interface PlanningEntity {
  id: string;
  name: string;
  site_address: string; // Street address where work happens
  postcode: string;
  localAuthority: string;
  description: string; // Brief overview of project
  url: string; // Link to application
  startDate: string;
  endDate: string;
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
  const [filterType, setFilterType] = useState("postcode"); // Default to postcode for apps
  const [filterValue, setFilterValue] = useState("");
  const [limit, setLimit] = useState(10); // Lower for apps
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [zapierWebhook, setZapierWebhook] = useState("");

  const SEARCHLAND_KEY = import.meta.env.VITE_SEARCHLAND_KEY || ''; // From .env

  /**
   * Execute planning data search using Searchland API for applications
   */
  const searchPlanningData = async () => {
    if (!filterValue.trim()) {
      toast.error("Please enter a filter value");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`🔍 Searching Planning Applications: ${filterType}=${filterValue}`);
      
      // Use Searchland API for detailed planning apps
      const query = `${filterType}:${filterValue}`;
      const url = `https://api.searchland.co.uk/planning-applications?api_key=${SEARCHLAND_KEY}&q=${encodeURIComponent(query)}&limit=${limit}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      const duration = Date.now() - startTime;
      console.log(`✅ Search completed in ${duration}ms`);

      // Extract key fields for applications
      const extractedResults = (data.results || data.applications || []).map((app: any) => ({
        id: app.id || app.application_reference || 'N/A',
        name: app.development_type || app.proposal || 'N/A', // As overview
        site_address: app.site_address || app.development_address || 'N/A', // Street address where work happens
        postcode: app.postcode || 'N/A',
        localAuthority: app.local_authority || app.authority || 'N/A',
        description: app.description || app.proposal_details || app.decision_summary || 'No description available', // Brief project overview
        url: app.application_url || app.link || `https://planning.data.gov.uk/application/${app.id}`, // Link to app
        startDate: app.validation_date || app.start_date || 'N/A',
        endDate: app.decision_date || app.end_date || 'N/A',
        geometry: app.coordinates || 'N/A', // Lat/long if available
        applicantName: app.applicant_name || 'N/A',
        applicantEmail: app.applicant_email || 'Not publicly available',
        applicantPhone: app.applicant_phone || 'N/A',
        applicantAddress: app.applicant_address || 'N/A',
        raw: app
      }));

      const response: ApiResponse = {
        success: true,
        filterType,
        filterValue,
        totalResults: data.total || extractedResults.length,
        cached: false, // Add caching if needed
        timestamp: new Date().toISOString(),
        entities: extractedResults
      };

      setResults(response);
      
      // Add to search history
      const searchTerm = `${filterType}=${filterValue}`;
      setSearchHistory(prev => 
        [searchTerm, ...prev.filter(item => item !== searchTerm)].slice(0, 5)
      );

      toast.success(
        `Found ${response.totalResults} applications in ${duration}ms`
      );

      // Optional Zapier trigger
      if (zapierWebhook && extractedResults.length > 0) {
        await fetch(zapierWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        });
      }

      // Save to Supabase
      await supabase.from('planning_searches').insert({
        postcode: filterValue,
        results: response
      });

    } catch (error) {
      console.error('Search failed:', error);
      toast.error(`Search failed: ${error.message}`);
      setResults({
        success: false,
        error: error.message,
        filterType,
        filterValue,
        totalResults: 0,
        cached: false,
        timestamp: new Date().toISOString(),
        entities: []
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export results to JSON file
   */
  const exportResults = () => {
    if (!results || !results.entities.length) {
      toast.error("No data to export");
      return;
    }

    const dataStr
