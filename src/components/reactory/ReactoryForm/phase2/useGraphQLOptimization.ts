import { useState, useCallback, useRef, useEffect } from 'react';

// Types for GraphQL optimization
interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

interface QueryCache {
  data: any;
  timestamp: number;
  expiresAt: number;
  queryHash: string;
}

interface BatchQuery {
  queries: GraphQLQuery[];
  batchId: string;
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface QueryStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  batchedQueries: number;
  deduplicatedQueries: number;
  averageResponseTime: number;
}

interface UseGraphQLOptimizationResult {
  executeQuery: (query: GraphQLQuery) => Promise<any>;
  executeBatch: (queries: GraphQLQuery[]) => Promise<any[]>;
  getCachedData: (query: GraphQLQuery) => any | null;
  invalidateCache: (queryHash?: string) => void;
  getStats: () => QueryStats;
  isQueryInProgress: (query: GraphQLQuery) => boolean;
  deduplicateQuery: (query: GraphQLQuery) => Promise<any>;
}

/**
 * GraphQL query optimization hook with caching, batching, and deduplication
 */
export function useGraphQLOptimization(
  endpoint: string = '/graphql',
  config: {
    enableCaching?: boolean;
    enableBatching?: boolean;
    enableDeduplication?: boolean;
    cacheTTL?: number;
    batchTimeout?: number;
    maxBatchSize?: number;
  } = {}
): UseGraphQLOptimizationResult {
  const defaultConfig = {
    enableCaching: true,
    enableBatching: true,
    enableDeduplication: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    batchTimeout: 50, // 50ms
    maxBatchSize: 10,
    ...config
  };

  const [stats, setStats] = useState<QueryStats>({
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchedQueries: 0,
    deduplicatedQueries: 0,
    averageResponseTime: 0
  });

  const cacheRef = useRef<Map<string, QueryCache>>(new Map());
  const pendingQueriesRef = useRef<Map<string, Promise<any>>>(new Map());
  const batchQueueRef = useRef<BatchQuery[]>([]);
  const responseTimesRef = useRef<number[]>([]);

  // Generate query hash for caching
  const generateQueryHash = useCallback((query: GraphQLQuery): string => {
    const queryString = JSON.stringify({
      query: query.query,
      variables: query.variables || {},
      operationName: query.operationName
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }, []);

  // Check if query is cached and valid
  const getCachedData = useCallback((query: GraphQLQuery): any | null => {
    if (!defaultConfig.enableCaching) return null;

    const queryHash = generateQueryHash(query);
    const cached = cacheRef.current.get(queryHash);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      cacheRef.current.delete(queryHash);
      return null;
    }
    
    return cached.data;
  }, [defaultConfig.enableCaching, generateQueryHash]);

  // Cache query result
  const cacheQueryResult = useCallback((query: GraphQLQuery, data: any) => {
    if (!defaultConfig.enableCaching) return;

    const queryHash = generateQueryHash(query);
    const cacheEntry: QueryCache = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + defaultConfig.cacheTTL,
      queryHash
    };
    
    cacheRef.current.set(queryHash, cacheEntry);
  }, [defaultConfig.enableCaching, defaultConfig.cacheTTL, generateQueryHash]);

  // Execute single query
  const executeQuery = useCallback(async (query: GraphQLQuery): Promise<any> => {
    const startTime = Date.now();
    
    // Check cache first
    const cachedData = getCachedData(query);
    if (cachedData) {
      setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
      return cachedData;
    }

    setStats(prev => ({ 
      ...prev, 
      cacheMisses: prev.cacheMisses + 1,
      totalQueries: prev.totalQueries + 1
    }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Cache the result
      cacheQueryResult(query, result);
      
      // Update response time stats
      const responseTime = Date.now() - startTime;
      responseTimesRef.current.push(responseTime);
      if (responseTimesRef.current.length > 100) {
        responseTimesRef.current = responseTimesRef.current.slice(-100);
      }
      
      const avgResponseTime = responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length;
      setStats(prev => ({ ...prev, averageResponseTime: avgResponseTime }));
      
      return result;
    } catch (error) {
      console.error('GraphQL query execution failed:', error);
      throw error;
    }
  }, [endpoint, getCachedData, cacheQueryResult]);

  // Deduplicate query
  const deduplicateQuery = useCallback(async (query: GraphQLQuery): Promise<any> => {
    if (!defaultConfig.enableDeduplication) {
      return executeQuery(query);
    }

    const queryHash = generateQueryHash(query);
    
    // Check if query is already in progress
    if (pendingQueriesRef.current.has(queryHash)) {
      setStats(prev => ({ ...prev, deduplicatedQueries: prev.deduplicatedQueries + 1 }));
      return pendingQueriesRef.current.get(queryHash);
    }

    // Execute query and store promise
    const queryPromise = executeQuery(query);
    pendingQueriesRef.current.set(queryHash, queryPromise);
    
    try {
      const result = await queryPromise;
      return result;
    } finally {
      pendingQueriesRef.current.delete(queryHash);
    }
  }, [defaultConfig.enableDeduplication, executeQuery, generateQueryHash]);

  // Create batch query
  const createBatchQuery = useCallback((queries: GraphQLQuery[]): GraphQLQuery => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Combine all queries into a single query
    const combinedQuery = queries.map((q, index) => {
      const alias = `query${index}`;
      return {
        query: q.query.replace(/^query\s+/, `query ${alias}`),
        variables: q.variables || {}
      };
    });

    const batchQuery: GraphQLQuery = {
      query: `query ${batchId} {\n${combinedQuery.map(q => `  ${q.query}`).join('\n')}\n}`,
      variables: combinedQuery.reduce((acc, q) => ({ ...acc, ...q.variables }), {}),
      operationName: batchId
    };

    return batchQuery;
  }, []);

  // Execute batch queries
  const executeBatch = useCallback(async (queries: GraphQLQuery[]): Promise<any[]> => {
    if (!defaultConfig.enableBatching || queries.length === 1) {
      // Execute queries individually
      return Promise.all(queries.map(query => executeQuery(query)));
    }

    setStats(prev => ({ ...prev, batchedQueries: prev.batchedQueries + queries.length }));

    try {
      const batchQuery = createBatchQuery(queries);
      const batchResult = await executeQuery(batchQuery);
      
      // Extract individual results from batch response
      const results = queries.map((_, index) => {
        const alias = `query${index}`;
        return batchResult.data?.[alias] || null;
      });

      return results;
    } catch (error) {
      console.error('Batch query execution failed:', error);
      // Fallback to individual queries
      return Promise.all(queries.map(query => executeQuery(query)));
    }
  }, [defaultConfig.enableBatching, executeQuery, createBatchQuery]);

  // Check if query is in progress
  const isQueryInProgress = useCallback((query: GraphQLQuery): boolean => {
    if (!defaultConfig.enableDeduplication) return false;
    
    const queryHash = generateQueryHash(query);
    return pendingQueriesRef.current.has(queryHash);
  }, [defaultConfig.enableDeduplication, generateQueryHash]);

  // Invalidate cache
  const invalidateCache = useCallback((queryHash?: string) => {
    if (queryHash) {
      cacheRef.current.delete(queryHash);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  // Get current stats
  const getStats = useCallback((): QueryStats => {
    return {
      ...stats,
      totalQueries: stats.totalQueries,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      batchedQueries: stats.batchedQueries,
      deduplicatedQueries: stats.deduplicatedQueries,
      averageResponseTime: stats.averageResponseTime
    };
  }, [stats]);

  // Process batch queue
  useEffect(() => {
    const processBatchQueue = () => {
      if (batchQueueRef.current.length === 0) return;

      const now = Date.now();
      const readyBatches = batchQueueRef.current.filter(
        batch => batch.status === 'pending' && 
                (now - batch.timestamp) >= defaultConfig.batchTimeout
      );

      readyBatches.forEach(async (batch) => {
        if (batch.queries.length === 0) return;

        batch.status = 'in-progress';
        
        try {
          const results = await executeBatch(batch.queries);
          batch.status = 'completed';
        } catch (error) {
          batch.status = 'failed';
          console.error('Batch processing failed:', error);
        }
      });

      // Remove completed/failed batches
      batchQueueRef.current = batchQueueRef.current.filter(
        batch => batch.status === 'pending' || batch.status === 'in-progress'
      );
    };

    const interval = setInterval(processBatchQueue, defaultConfig.batchTimeout);
    return () => clearInterval(interval);
  }, [defaultConfig.batchTimeout, executeBatch]);

  return {
    executeQuery,
    executeBatch,
    getCachedData,
    invalidateCache,
    getStats,
    isQueryInProgress,
    deduplicateQuery
  };
} 