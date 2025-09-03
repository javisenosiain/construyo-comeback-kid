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
  AlertTriangle
} from "lucide-react";

interface PlanningEntity {
  id: string;
  name: string;
  address: string;
  postcode: string;
  localAuthority: string;
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

      setResults(data as ApiResponse);
      
      // Add to search history
      const searchTerm = `${filterType}=${filterValue}`;
      setSearchHistory(prev => 
        [searchTerm, ...prev.filter(item => item !== searchTerm)].slice(0, 5)
      );

      // Show success message
      const cacheStatus = data.cached ? "from cache" : "fresh data";
      const zapierStatus = zapierWebhook ? " (sent to Zapier)" : "";
      toast.success(
        `Found ${data.totalResults} entities ${cacheStatus} in ${duration}ms${zapierStatus}`
      );

    } catch (error) {
      console.error('Planning data search error:', error);
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

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `planning_data_${results.filterType}_${results.filterValue}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  /**
   * Quick search with predefined examples
   */
  const quickSearch = (type: string, value: string) => {
    setFilterType(type);
    setFilterValue(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Planning Data Scraper</h2>
          <p className="text-muted-foreground">
            Scrape planning permission data from government databases with intelligent caching
          </p>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Planning Data Search</span>
              </CardTitle>
              <CardDescription>
                Search UK planning data by local authority, postcode, or organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filterType">Filter Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local-authority">Local Authority</SelectItem>
                      <SelectItem value="postcode">Postcode</SelectItem>
                      <SelectItem value="organisation">Organisation</SelectItem>
                      <SelectItem value="entity">Entity ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filterValue">Search Value</Label>
                  <Input
                    id="filterValue"
                    placeholder={
                      filterType === "local-authority" ? "e.g., chichester" :
                      filterType === "postcode" ? "e.g., PO19" :
                      filterType === "organisation" ? "e.g., chichester" :
                      "e.g., entity-id"
                    }
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPlanningData()}
                  />
                </div>

                <div>
                  <Label htmlFor="limit">Results Limit</Label>
                  <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 results</SelectItem>
                      <SelectItem value="500">500 results</SelectItem>
                      <SelectItem value="1000">1,000 results</SelectItem>
                      <SelectItem value="5000">5,000 results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Zapier Integration */}
              <div>
                <Label htmlFor="zapierWebhook">Zapier Webhook URL (Optional)</Label>
                <Input
                  id="zapierWebhook"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={zapierWebhook}
                  onChange={(e) => setZapierWebhook(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically send results to Google Sheets, Excel, or other apps via Zapier
                </p>
              </div>

              <Button 
                onClick={searchPlanningData} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching Planning Data...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Planning Data
                  </>
                )}
              </Button>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Recent Searches</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {searchHistory.map((search, index) => (
                      <Badge 
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          const [type, value] = search.split('=');
                          quickSearch(type, value);
                        }}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results ? (
            <>
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Search Results</span>
                    </CardTitle>
                    {results.success && results.entities.length > 0 && (
                      <Button variant="outline" onClick={exportResults}>
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {results.success ? (
                      <div className="flex items-center space-x-4 text-sm">
                        <span>Query: {results.filterType}={results.filterValue}</span>
                        <span>•</span>
                        <span>{results.totalResults} results</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          {results.cached ? (
                            <>
                              <Database className="h-3 w-3" />
                              <span>Cached</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Fresh</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Search failed: {results.error}</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Results List */}
              {results.success && results.entities.length > 0 && (
                <div className="space-y-4">
                  {results.entities.slice(0, 20).map((entity, index) => (
                    <Card key={entity.id || index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-lg">{entity.name}</h4>
                            <p className="text-sm text-muted-foreground">ID: {entity.id}</p>
                            
                            {entity.address && (
                              <div className="flex items-center space-x-1 mt-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{entity.address}</span>
                              </div>
                            )}
                            
                            {entity.postcode && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{entity.postcode}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {entity.localAuthority && (
                              <div>
                                <span className="text-sm font-medium">Local Authority: </span>
                                <span className="text-sm">{entity.localAuthority}</span>
                              </div>
                            )}
                            
                            {entity.startDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Start: {entity.startDate}</span>
                              </div>
                            )}
                            
                            {entity.endDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">End: {entity.endDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {results.entities.length > 20 && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                          Showing first 20 of {results.totalResults} results
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Export to see all results
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {results.success && results.entities.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No entities found for your search criteria</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No search performed yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the Search tab to find planning data
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Searches</CardTitle>
              <CardDescription>
                Click any example to run a sample search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed hover:border-solid cursor-pointer transition-colors"
                      onClick={() => quickSearch("local-authority", "chichester")}>
                  <CardContent className="pt-4">
                    <h4 className="font-medium">Chichester Local Authority</h4>
                    <p className="text-sm text-muted-foreground">local-authority=chichester</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Search for all planning entities in Chichester district
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed hover:border-solid cursor-pointer transition-colors"
                      onClick={() => quickSearch("postcode", "PO19")}>
                  <CardContent className="pt-4">
                    <h4 className="font-medium">PO19 Postcode Area</h4>
                    <p className="text-sm text-muted-foreground">postcode=PO19</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Search for planning entities in the PO19 postcode area
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed hover:border-solid cursor-pointer transition-colors"
                      onClick={() => quickSearch("organisation", "brighton")}>
                  <CardContent className="pt-4">
                    <h4 className="font-medium">Brighton Organisation</h4>
                    <p className="text-sm text-muted-foreground">organisation=brighton</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Search for Brighton-related planning organisations
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed hover:border-solid cursor-pointer transition-colors"
                      onClick={() => quickSearch("local-authority", "london")}>
                  <CardContent className="pt-4">
                    <h4 className="font-medium">London Boroughs</h4>
                    <p className="text-sm text-muted-foreground">local-authority=london</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Search for London local authority entities
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">API Features:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✅ Automated pagination (fetches all available results)</li>
                  <li>✅ 24-hour intelligent caching (faster subsequent searches)</li>
                  <li>✅ Exponential backoff retry logic (handles rate limits)</li>
                  <li>✅ Structured data output (clean, consistent format)</li>
                  <li>✅ Error handling with detailed logging</li>
                  <li>✅ Memory-efficient streaming (minimal resource usage)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}