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
  Link as LinkIcon,
  RefreshCw
} from "lucide-react";

interface PlanningEntity {
  id: string;
  name: string;
  site_address: string;
  postcode: string;
  localAuthority: string;
  description: string;
  url: string;
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
  const [filterType, setFilterType] = useState("postcode");
  const [filterValue, setFilterValue] = useState("");
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [zapierWebhook, setZapierWebhook] = useState("");
  const [showFullDB, setShowFullDB] = useState(false);
  const [fullDBResults, setFullDBResults] = useState<PlanningEntity[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  const SEARCHLAND_KEY = import.meta.env.VITE_SEARCHLAND_KEY || '';

  const searchPlanningData = async () => {
    if (!filterValue.trim()) {
      toast.error("Please enter a filter value");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`🔍 Searching: ${filterType}=${filterValue}`);
      
      const { data, error } = await supabase.functions.invoke('planning-data-scraper', {
        body: {
          filterType,
          filterValue: filterValue.toLowerCase().trim(),
          limit,
          zapierWebhook: zapierWebhook.trim() || undefined
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error(error.message || 'Failed to fetch');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Done in ${duration}ms`);

      // Fetch existing for deltas
      const { data: existing } = await supabase
        .from('planning_searches')
        .select('results')
        .eq('postcode', filterValue.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);

      const existingEntities = existing?.[0]?.results?.entities || [];
      const existingIds = new Set(existingEntities.map((e: any) => e.id));

      // Compute deltas
      const currentEntities = data.entities || [];
      const deltaEntities = currentEntities.filter((entity: any) => !existingIds.has(entity.id));
      const totalNew = deltaEntities.length;

      const response: ApiResponse
