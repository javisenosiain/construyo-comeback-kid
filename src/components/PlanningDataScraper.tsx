import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Search, 
  Download, 
  MapPin, 
  Building, 
  Calendar, 
  Database,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
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
  const [filterType, setFilterType] = useState<string>('local-authority');
  const [filterValue, setFilterValue] = useState<string>('chichester');
  const [limit, setLimit] = useState<number>(1000);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  /**
   * Execute planning data search
   */
  const handleSearch = async () => {
    if (!filterValue.trim()) {
      toast.error('Please enter a filter value');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log(`Searching planning data: ${filterType}=${filterValue}`);
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('planning-data-scraper', {
        body: {
          filterType,
          filterValue: filterValue.trim().toLowerCase(),
          limit
        }
      });

      const duration = Date.now() - startTime;

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch planning data');
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      setResults(data);
      
      // Add to search history
      const historyEntry = {
        id: Date.now(),
        filterType,
        filterValue,
        totalResults: data.totalResults,
        cached: data.cached,
        duration,
        timestamp: new Date().toISOString()
      };
      
      setSearchHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10 searches
      
      toast.success(
        `Found ${data.totalResults} entities in ${duration}ms ${data.cached ? '(cached)' : '(fresh)'}`
      );

    } catch (error) {
      console.error('Planning data search error:', error);
      toast.error(`Search failed: ${error.message}`);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export results to CSV
   */
  const exportToCSV = () => {
    if (!results?.entities.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['ID', 'Name', 'Address', 'Postcode', 'Local Authority', 'Start Date', 'End Date'];
    const csvContent = [
      headers.join(','),
      ...results.entities.map(entity => [
        entity.id,
        `"${entity.name.replace(/"/g, '""')}"`,
        `"${entity.address.replace(/"/g, '""')}"`,
        entity.postcode,
        entity.localAuthority,
        entity.startDate,
        entity.endDate
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-data-${filterType}-${filterValue}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Data exported to CSV');
  };

  /**
   * Clear search results and history
   */
  const clearData = () => {
    setResults(null);
    setSearchHistory([]);
    toast.success('Data cleared');
  };

  /**
   * Repeat a previous search
   */
  const repeatSearch = (historyItem: any) => {
    setFilterType(historyItem.filterType);
    setFilterValue(historyItem.filterValue);
    handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Planning Data Scraper</h2>
          <p className="text-muted-foreground">
            Extract planning permission data from the UK Planning Data API
          </p>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Planning Data Search</span>
              </CardTitle>
              <CardDescription>
                Search the UK Planning Data API for planning applications, authorities, and related entities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filterType">Filter Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="filterValue">Filter Value</Label>
                  <Input
                    id="filterValue"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={
                      filterType === 'local-authority' ? 'e.g., chichester' :
                      filterType === 'postcode' ? 'e.g., PO19 1RL' :
                      filterType === 'organisation' ? 'e.g., department-for-levelling-up' :
                      'Enter entity ID'
                    }
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleSearch()}
                  />
                </div>

                <div>
                  <Label htmlFor="limit">Max Results</Label>
                  <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="5000">5,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleSearch} 
                  disabled={loading || !filterValue.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Planning Data
                    </>
                  )}
                </Button>
                
                {results && (
                  <Button variant="outline" onClick={clearData}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Sample queries */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Sample Searches:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterType('local-authority');
                      setFilterValue('chichester');
                    }}
                  >
                    Chichester Council
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterType('postcode');
                      setFilterValue('SW1A 1AA');
                    }}
                  >
                    Central London
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterType('organisation');
                      setFilterValue('planning-inspectorate');
                    }}
                  >
                    Planning Inspectorate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Search Results</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={results.cached ? "secondary" : "default"}>
                        {results.cached ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Cached
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Fresh
                          </>
                        )}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Found {results.totalResults} entities for {results.filterType} = "{results.filterValue}"
                    {results.cached && ' (from cache)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.entities.map((entity, index) => (
                      <div key={entity.id || index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{entity.name}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                              {entity.address && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{entity.address}</span>
                                </div>
                              )}
                              {entity.postcode && (
                                <div className="flex items-center space-x-1">
                                  <Building className="h-3 w-3" />
                                  <span>{entity.postcode}</span>
                                </div>
                              )}
                              {entity.startDate && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Start: {entity.startDate}</span>
                                </div>
                              )}
                              {entity.localAuthority && (
                                <div className="flex items-center space-x-1">
                                  <Building className="h-3 w-3" />
                                  <span>{entity.localAuthority}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {entity.id.split('/').pop()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No search results to display.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the Search tab to query planning data.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Search History</span>
              </CardTitle>
              <CardDescription>
                Your recent planning data searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchHistory.length > 0 ? (
                <div className="space-y-3">
                  {searchHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{item.filterType}</Badge>
                          <span className="font-medium">{item.filterValue}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.totalResults} results • {item.duration}ms • 
                          {new Date(item.timestamp).toLocaleString()}
                          {item.cached && ' • Cached'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => repeatSearch(item)}
                      >
                        Repeat
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>No search history yet.</p>
                  <p className="text-sm mt-2">Your searches will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}