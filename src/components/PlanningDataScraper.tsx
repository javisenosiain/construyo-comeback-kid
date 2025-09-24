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
      
      const apiResponse = await fetch(url);
      if (!apiResponse.ok) throw new Error(`API error: ${apiResponse.status}`);
      const data = await apiResponse.json();

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

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `planning_search_${filterType}_${filterValue}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast.success(`Exported ${results.totalResults} planning applications`);
  };

  /**
   * Handle quick search from history
   */
  const handleHistorySearch = (searchTerm: string) => {
    const [type, value] = searchTerm.split('=');
    setFilterType(type);
    setFilterValue(value);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Planning Applications Search
        </h1>
        <p className="text-muted-foreground">
          Search UK planning applications using Searchland API
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Planning Data
          </CardTitle>
          <CardDescription>
            Enter search criteria to find planning applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterType">Search By</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postcode">Postcode</SelectItem>
                  <SelectItem value="authority">Local Authority</SelectItem>
                  <SelectItem value="applicant">Applicant Name</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filterValue">Search Value</Label>
              <Input
                id="filterValue"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={`Enter ${filterType}...`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Results Limit</Label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 results</SelectItem>
                  <SelectItem value="10">10 results</SelectItem>
                  <SelectItem value="25">25 results</SelectItem>
                  <SelectItem value="50">50 results</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={searchPlanningData} 
              disabled={loading || !filterValue.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Applications
                </>
              )}
            </Button>
            
            {results && (
              <Button variant="outline" onClick={exportResults}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            )}
          </div>

          {/* Optional Zapier Integration */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="zapierWebhook">Zapier Webhook (Optional)</Label>
            <Input
              id="zapierWebhook"
              value={zapierWebhook}
              onChange={(e) => setZapierWebhook(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleHistorySearch(search)}
                  className="text-xs"
                >
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Search Results
              {results.success && (
                <Badge variant="outline" className="ml-2">
                  {results.totalResults} found
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {results.success ? 
                `Found ${results.totalResults} planning applications for ${results.filterType}: ${results.filterValue}` :
                `Search failed: ${results.error}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.success && results.entities.length > 0 ? (
              <Tabs defaultValue="grid" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="grid">Card View</TabsTrigger>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="grid" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.entities.map((app, index) => (
                      <Card key={index} className="h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {app.name}
                            </CardTitle>
                            <Badge variant="secondary" className="ml-2 flex-shrink-0">
                              {app.localAuthority}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{app.site_address}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4 flex-shrink-0" />
                            <span>{app.postcode}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{app.startDate} - {app.endDate}</span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {app.description}
                          </p>
                          
                          {app.url && app.url !== 'N/A' && (
                            <Button variant="outline" size="sm" className="w-full" asChild>
                              <a href={app.url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                View Application
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="table">
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">ID</th>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Address</th>
                          <th className="text-left p-3 font-medium">Authority</th>
                          <th className="text-left p-3 font-medium">Dates</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.entities.map((app, index) => (
                          <tr key={index} className="border-b hover:bg-muted/25">
                            <td className="p-3 text-sm font-mono">{app.id}</td>
                            <td className="p-3 text-sm">{app.name}</td>
                            <td className="p-3 text-sm">{app.site_address}, {app.postcode}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {app.localAuthority}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{app.startDate} - {app.endDate}</td>
                            <td className="p-3">
                              {app.url && app.url !== 'N/A' && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={app.url} target="_blank" rel="noopener noreferrer">
                                    <LinkIcon className="mr-1 h-3 w-3" />
                                    View
                                  </a>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  {results.success ? 
                    "No planning applications found for your search criteria." :
                    `Search failed: ${results.error}`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
