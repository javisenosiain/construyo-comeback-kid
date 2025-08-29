import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Planning Data API Configuration
const PLANNING_API_BASE = 'https://www.planning.data.gov.uk';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface PlanningEntity {
  entity: string;
  name?: string;
  organisation?: string;
  'local-authority'?: string;
  postcode?: string;
  address?: string;
  geometry?: string;
  'start-date'?: string;
  'end-date'?: string;
  [key: string]: any;
}

interface ApiResponse {
  entities: PlanningEntity[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  query: string;
}

/**
 * Sleep function for implementing exponential backoff
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate cache key from query parameters
 * @param params - Query parameters object
 * @returns Hashed cache key
 */
const generateCacheKey = (params: Record<string, string>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return btoa(sortedParams).replace(/[+/=]/g, ''); // Safe for database storage
};

/**
 * Check cache for existing data
 * @param supabase - Supabase client
 * @param cacheKey - Cache key to check
 * @returns Cached data if valid, null otherwise
 */
const checkCache = async (supabase: any, cacheKey: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('planning_api_cache')
      .select('data, timestamp')
      .eq('cache_key', cacheKey)
      .single();

    if (error) {
      console.log('Cache miss or error:', error.message);
      return null;
    }

    const now = Date.now();
    const cacheAge = now - new Date(data.timestamp).getTime();
    
    if (cacheAge < CACHE_DURATION) {
      console.log(`Cache hit for key: ${cacheKey}, age: ${Math.round(cacheAge / 60000)} minutes`);
      return data.data;
    } else {
      console.log(`Cache expired for key: ${cacheKey}, age: ${Math.round(cacheAge / 60000)} minutes`);
      // Clean up expired cache entry
      await supabase
        .from('planning_api_cache')
        .delete()
        .eq('cache_key', cacheKey);
      return null;
    }
  } catch (error) {
    console.error('Cache check error:', error);
    return null;
  }
};

/**
 * Store data in cache
 * @param supabase - Supabase client
 * @param cacheKey - Cache key
 * @param data - Data to cache
 * @param query - Original query for reference
 */
const storeInCache = async (
  supabase: any, 
  cacheKey: string, 
  data: any, 
  query: string
): Promise<void> => {
  try {
    await supabase
      .from('planning_api_cache')
      .upsert({
        cache_key: cacheKey,
        data: data,
        query: query,
        timestamp: new Date().toISOString()
      });
    console.log(`Data cached with key: ${cacheKey}`);
  } catch (error) {
    console.error('Cache storage error:', error);
  }
};

/**
 * Make HTTP request with retry logic and exponential backoff
 * @param url - URL to request
 * @param retryCount - Current retry attempt
 * @returns Response data or throws error
 */
const makeRequestWithRetry = async (url: string, retryCount = 0): Promise<Response> => {
  try {
    console.log(`Making request to: ${url} (attempt ${retryCount + 1})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Construyo-LeadGen/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Rate limited. Retrying after ${delay}ms`);
        await sleep(delay);
        return makeRequestWithRetry(url, retryCount + 1);
      } else {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }
    }
    
    // Handle server errors with retry
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Server error ${response.status}. Retrying after ${delay}ms`);
      await sleep(delay);
      return makeRequestWithRetry(url, retryCount + 1);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
    }
    
    return response;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request timeout');
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Timeout. Retrying after ${delay}ms`);
        await sleep(delay);
        return makeRequestWithRetry(url, retryCount + 1);
      }
    }
    
    if (retryCount < MAX_RETRIES && 
        (error.name === 'TypeError' || error.message.includes('network'))) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Network error. Retrying after ${delay}ms`);
      await sleep(delay);
      return makeRequestWithRetry(url, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Parse and validate JSON response
 * @param response - HTTP response
 * @returns Parsed JSON data
 */
const parseJsonResponse = async (response: Response): Promise<any> => {
  try {
    const text = await response.text();
    
    if (!text.trim()) {
      throw new Error('Empty response body');
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
};

/**
 * Fetch planning entities with pagination
 * @param filterType - Type of filter (e.g., 'local-authority', 'postcode')
 * @param filterValue - Value to filter by
 * @param limit - Number of results per page (default: 1000)
 * @returns Array of planning entities
 */
const fetchPlanningEntities = async (
  filterType: string, 
  filterValue: string, 
  limit = 1000
): Promise<PlanningEntity[]> => {
  const allEntities: PlanningEntity[] = [];
  let offset = 0;
  let hasMore = true;
  
  console.log(`Starting fetch for ${filterType}=${filterValue}`);
  
  while (hasMore) {
    // Construct URL with query parameters
    const params = new URLSearchParams({
      [filterType]: filterValue,
      limit: limit.toString(),
      offset: offset.toString(),
      format: 'json'
    });
    
    const url = `${PLANNING_API_BASE}/entity?${params.toString()}`;
    
    try {
      const response = await makeRequestWithRetry(url);
      const data = await parseJsonResponse(response);
      
      // Handle different response formats from the API
      let entities: PlanningEntity[] = [];
      
      if (Array.isArray(data)) {
        entities = data;
      } else if (data.entities && Array.isArray(data.entities)) {
        entities = data.entities;
      } else if (data.data && Array.isArray(data.data)) {
        entities = data.data;
      } else {
        console.log('Unexpected API response format:', Object.keys(data));
        entities = [];
      }
      
      console.log(`Fetched ${entities.length} entities from offset ${offset}`);
      
      // Add entities to results
      allEntities.push(...entities);
      
      // Check if there are more results
      hasMore = entities.length === limit;
      offset += limit;
      
      // Safety check to prevent infinite loops
      if (offset > 50000) { // Max 50k results
        console.log('Safety limit reached, stopping pagination');
        break;
      }
      
      // Small delay between requests to be respectful
      if (hasMore) {
        await sleep(100); // 100ms delay between requests
      }
      
    } catch (error) {
      console.error(`Error fetching page at offset ${offset}:`, error);
      
      // If first page fails, throw error
      if (offset === 0) {
        throw error;
      }
      
      // If subsequent pages fail, return what we have
      console.log(`Returning ${allEntities.length} entities due to error on page ${offset / limit + 1}`);
      break;
    }
  }
  
  console.log(`Total entities fetched: ${allEntities.length}`);
  return allEntities;
};

/**
 * Structure and clean entity data
 * @param entities - Raw entities from API
 * @returns Structured entity data
 */
const structureEntityData = (entities: PlanningEntity[]): any[] => {
  return entities.map(entity => ({
    id: entity.entity || '',
    name: entity.name || entity.organisation || 'Unknown',
    address: entity.address || '',
    postcode: entity.postcode || '',
    localAuthority: entity['local-authority'] || '',
    startDate: entity['start-date'] || '',
    endDate: entity['end-date'] || '',
    geometry: entity.geometry || '',
    raw: entity // Keep raw data for advanced use
  })).filter(entity => entity.id); // Remove entries without IDs
};

/**
 * Main handler function
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client for caching
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { filterType, filterValue, limit = 1000 } = await req.json();
    
    // Validate input parameters
    if (!filterType || !filterValue) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: filterType and filterValue' 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const validFilters = ['local-authority', 'postcode', 'organisation', 'entity'];
    if (!validFilters.includes(filterType)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid filterType. Must be one of: ${validFilters.join(', ')}` 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing request: ${filterType}=${filterValue}`);

    // Check cache first
    const cacheKey = generateCacheKey({ filterType, filterValue, limit: limit.toString() });
    const cachedData = await checkCache(supabase, cacheKey);
    
    if (cachedData) {
      console.log('Returning cached data');
      return new Response(
        JSON.stringify(cachedData), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch fresh data from API
    console.log('Fetching fresh data from Planning Data API');
    const entities = await fetchPlanningEntities(filterType, filterValue, limit);
    
    // Structure the data
    const structuredData = structureEntityData(entities);
    
    const result = {
      success: true,
      filterType,
      filterValue,
      totalResults: structuredData.length,
      cached: false,
      timestamp: new Date().toISOString(),
      entities: structuredData
    };

    // Cache the results
    const queryString = `${filterType}=${filterValue}&limit=${limit}`;
    await storeInCache(supabase, cacheKey, result, queryString);

    console.log(`Successfully processed request: ${structuredData.length} entities found`);

    return new Response(
      JSON.stringify(result), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in planning-data-scraper function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});