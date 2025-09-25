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

      const existingEntities = (existing?.[0]?.results as any)?.entities || [];
      const existingIds = new Set(existingEntities.map((e: any) => e.id));

      // Compute deltas
      const currentEntities = data.entities || [];
      const deltaEntities = currentEntities.filter((entity: any) => !existingIds.has(entity.id));
      const totalNew = deltaEntities.length;

      const response: ApiResponse = {
        success: true,
        filterType,
        filterValue,
        totalResults: totalNew,
        cached: data.cached,
        timestamp: new Date().toISOString(),
        entities: deltaEntities
      };

      setResults(response);
      
      // Save full data
      await supabase.from('planning_searches').insert({
        postcode: filterValue,
        results: deltaEntities
      });
      
    } catch (error) {
      console.error('Error fetching planning data:', error);
      setResults({
        success: false,
        filterType,
        filterValue,
        totalResults: 0,
        cached: false,
        timestamp: new Date().toISOString(),
        entities: [],
        error: 'Failed to fetch planning data'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Planning Data Scraper
          </CardTitle>
          <CardDescription>
            Search for planning applications and development data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterType">Filter Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postcode">Postcode</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                  <SelectItem value="authority">Local Authority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filterValue">Search Value</Label>
              <Input
                id="filterValue"
                placeholder="e.g. SW1A 1AA"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPlanningData()}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={searchPlanningData} 
            disabled={loading || !filterValue.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Planning Data
              </>
            )}
          </Button>

          {results && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Results</h3>
                <Badge variant={results.success ? "default" : "destructive"}>
                  {results.totalResults} new results
                </Badge>
              </div>
              
              {results.entities.length > 0 ? (
                <div className="grid gap-4">
                  {results.entities.slice(0, 5).map((entity) => (
                    <Card key={entity.id} className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">{entity.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entity.site_address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entity.description}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No new planning applications found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
