/**
 * Node Data Prefetch Service
 *
 * Prefetches all necessary data for workflow nodes when a workflow is opened.
 * This eliminates the need to fetch data when each node editor is opened.
 */

import { fetchClient } from '@/lib/fetchClient';
import { useNodeDataCache, ConnectionOption, FieldDefinition, FacebookAdsAccount, GoogleAdsAccount, TikTokAdsAccount } from '@/store/nodeDataCache';
import { WorkflowNode } from '@/types/workflow';

interface ConnectionResponse {
  _id?: string | { $oid: string };
  service_name?: string;
  connection_name?: string;
  params?: { token_id?: string; connection_id?: string };
}

/**
 * Extract connection ID from various response formats
 */
function extractConnectionId(conn: ConnectionResponse): string {
  if (conn._id) {
    if (typeof conn._id === 'object' && '$oid' in conn._id) {
      return conn._id.$oid;
    }
    return String(conn._id);
  }
  return conn.params?.token_id || conn.params?.connection_id || '';
}

/**
 * Fetch all connections and store in cache
 */
export async function prefetchConnections(): Promise<ConnectionOption[]> {
  const cache = useNodeDataCache.getState();

  // Check if we already have valid cached data
  if (cache.hasValidCache(cache.connections)) {
    return cache.connections?.data || [];
  }

  cache.setConnectionsLoading(true);

  try {
    const resp = await fetchClient('/api/connections');
    const raw = await resp.json().catch(() => []);
    const arr: ConnectionResponse[] = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);

    const connections: ConnectionOption[] = arr.map((c) => ({
      id: extractConnectionId(c),
      name: c.connection_name || c.service_name || 'Unknown',
      service_name: c.service_name || '',
    })).filter(c => c.id);

    cache.setConnections(connections);
    return connections;
  } catch (error) {
    cache.setConnections([], error instanceof Error ? error.message : 'Failed to fetch connections');
    return [];
  }
}

/**
 * Fetch Facebook Ads fields
 */
export async function prefetchFacebookFields(): Promise<FieldDefinition[]> {
  const cache = useNodeDataCache.getState();

  if (cache.hasValidCache(cache.facebookFields)) {
    return cache.facebookFields?.data || [];
  }

  cache.setFacebookFieldsLoading(true);

  try {
    const resp = await fetchClient('/api/facebook/facebook_fields');
    if (!resp.ok) throw new Error(`Failed to load fields: ${resp.statusText}`);
    const fields: FieldDefinition[] = await resp.json();
    const activeFields = fields.filter(f => f.active ?? true);
    cache.setFacebookFields(activeFields);
    return activeFields;
  } catch (error) {
    cache.setFacebookFields([], error instanceof Error ? error.message : 'Failed to fetch Facebook fields');
    return [];
  }
}

/**
 * Fetch Google Ads fields
 */
export async function prefetchGoogleAdsFields(): Promise<FieldDefinition[]> {
  const cache = useNodeDataCache.getState();

  if (cache.hasValidCache(cache.googleAdsFields)) {
    return cache.googleAdsFields?.data || [];
  }

  cache.setGoogleAdsFieldsLoading(true);

  try {
    const resp = await fetchClient('/api/google/google_ads/fields');
    if (!resp.ok) throw new Error(`Failed to load fields: ${resp.statusText}`);
    const raw = await resp.json();
    const fields: FieldDefinition[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    const activeFields = fields.filter(f => f.active ?? true);
    cache.setGoogleAdsFields(activeFields);
    return activeFields;
  } catch (error) {
    cache.setGoogleAdsFields([], error instanceof Error ? error.message : 'Failed to fetch Google Ads fields');
    return [];
  }
}

/**
 * Fetch Facebook Ads accounts for a specific connection
 */
export async function prefetchFacebookAccounts(connectionId: string): Promise<FacebookAdsAccount[]> {
  if (!connectionId) return [];

  const cache = useNodeDataCache.getState();
  const existing = cache.facebookAccounts[connectionId];

  if (cache.hasValidCache(existing)) {
    return existing?.data || [];
  }

  cache.setFacebookAccountsLoading(connectionId, true);

  try {
    const resp = await fetchClient(`/api/facebook/ads/accounts?connection_id=${encodeURIComponent(connectionId)}`);
    if (!resp.ok) {
      cache.setFacebookAccounts(connectionId, []);
      return [];
    }
    const accounts: FacebookAdsAccount[] = await resp.json().catch(() => []);
    cache.setFacebookAccounts(connectionId, accounts);
    return accounts;
  } catch (error) {
    cache.setFacebookAccounts(connectionId, [], error instanceof Error ? error.message : 'Failed to fetch accounts');
    return [];
  }
}

/**
 * Fetch Google Ads accounts for a specific connection
 */
export async function prefetchGoogleAdsAccounts(connectionId: string): Promise<GoogleAdsAccount[]> {
  if (!connectionId) return [];

  const cache = useNodeDataCache.getState();
  const existing = cache.googleAdsAccounts[connectionId];

  if (cache.hasValidCache(existing)) {
    return existing?.data || [];
  }

  cache.setGoogleAdsAccountsLoading(connectionId, true);

  try {
    const resp = await fetchClient(`/api/google/google_ads/accounts?connection_id=${encodeURIComponent(connectionId)}`);
    if (!resp.ok) {
      cache.setGoogleAdsAccounts(connectionId, []);
      return [];
    }
    const accounts: GoogleAdsAccount[] = await resp.json().catch(() => []);
    cache.setGoogleAdsAccounts(connectionId, accounts);
    return accounts;
  } catch (error) {
    cache.setGoogleAdsAccounts(connectionId, [], error instanceof Error ? error.message : 'Failed to fetch accounts');
    return [];
  }
}

/**
 * Fetch TikTok Ads fields
 */
export async function prefetchTikTokFields(): Promise<FieldDefinition[]> {
  const cache = useNodeDataCache.getState();

  if (cache.hasValidCache(cache.tiktokFields)) {
    return cache.tiktokFields?.data || [];
  }

  cache.setTikTokFieldsLoading(true);

  try {
    const resp = await fetchClient('/api/tiktok/tiktok_fields');
    if (!resp.ok) throw new Error(`Failed to load fields: ${resp.statusText}`);
    const fields: FieldDefinition[] = await resp.json();
    const activeFields = fields.filter(f => f.active ?? true);
    cache.setTikTokFields(activeFields);
    return activeFields;
  } catch (error) {
    cache.setTikTokFields([], error instanceof Error ? error.message : 'Failed to fetch TikTok fields');
    return [];
  }
}

/**
 * Fetch TikTok Ads accounts for a specific connection
 */
export async function prefetchTikTokAccounts(connectionId: string): Promise<TikTokAdsAccount[]> {
  if (!connectionId) return [];

  const cache = useNodeDataCache.getState();
  const existing = cache.tiktokAccounts[connectionId];

  if (cache.hasValidCache(existing)) {
    return existing?.data || [];
  }

  cache.setTikTokAccountsLoading(connectionId, true);

  try {
    const resp = await fetchClient(`/api/tiktok/ads/accounts?connection_id=${encodeURIComponent(connectionId)}`);
    if (!resp.ok) {
      cache.setTikTokAccounts(connectionId, []);
      return [];
    }
    const accounts: TikTokAdsAccount[] = await resp.json().catch(() => []);
    cache.setTikTokAccounts(connectionId, accounts);
    return accounts;
  } catch (error) {
    cache.setTikTokAccounts(connectionId, [], error instanceof Error ? error.message : 'Failed to fetch accounts');
    return [];
  }
}

/**
 * Prefetch all data needed for a workflow's nodes
 */
export async function prefetchWorkflowNodeData(nodes: WorkflowNode[]): Promise<void> {
  // First, fetch connections (needed by all nodes)
  const connections = await prefetchConnections();

  // Determine which services are used in the workflow
  const usedServices = new Set<string>();
  const connectionIds = new Set<string>();

  for (const node of nodes) {
    const definitionId = node.definitionId || '';

    if (definitionId === 'facebook.ads') {
      usedServices.add('facebook');
      const connId = node.data?.connection_id || node.data?.token_id || node.data?.accessToken;
      if (connId) connectionIds.add(String(connId));
    } else if (definitionId === 'google.ads') {
      usedServices.add('google_ads');
      const connId = node.data?.connection_id || node.data?.token_id || node.data?.accessToken;
      if (connId) connectionIds.add(String(connId));
    } else if (definitionId === 'tiktok.ads') {
      usedServices.add('tiktok');
      const connId = node.data?.connection_id;
      if (connId) connectionIds.add(String(connId));
    } else if (definitionId === 'dest.googlesheets') {
      usedServices.add('google_sheets');
    } else if (definitionId === 'dest.bigquery') {
      usedServices.add('bigquery');
    }
  }

  // Parallel fetch all needed data
  const promises: Promise<unknown>[] = [];

  // Fetch fields for used services
  if (usedServices.has('facebook')) {
    promises.push(prefetchFacebookFields());
  }
  if (usedServices.has('google_ads')) {
    promises.push(prefetchGoogleAdsFields());
  }
  if (usedServices.has('tiktok')) {
    promises.push(prefetchTikTokFields());
  }

  // Fetch accounts for connections used in nodes
  for (const connId of connectionIds) {
    // Determine service type from connection
    const conn = connections.find(c => c.id === connId);
    const serviceName = conn?.service_name?.toLowerCase() || '';

    if (serviceName.includes('facebook')) {
      promises.push(prefetchFacebookAccounts(connId));
    } else if (serviceName.includes('google') && serviceName.includes('ads')) {
      promises.push(prefetchGoogleAdsAccounts(connId));
    } else if (serviceName.includes('tiktok')) {
      promises.push(prefetchTikTokAccounts(connId));
    }
  }

  // Also prefetch accounts for all available connections of used services
  // This ensures data is ready when user switches connections
  const facebookConnections = connections.filter(c =>
    c.service_name?.toLowerCase().includes('facebook')
  );
  const googleAdsConnections = connections.filter(c => {
    const name = c.service_name?.toLowerCase() || '';
    return name.includes('google') && name.includes('ads');
  });
  const tiktokConnections = connections.filter(c =>
    c.service_name?.toLowerCase().includes('tiktok')
  );

  if (usedServices.has('facebook')) {
    for (const conn of facebookConnections) {
      if (!connectionIds.has(conn.id)) {
        promises.push(prefetchFacebookAccounts(conn.id));
      }
    }
  }

  if (usedServices.has('google_ads')) {
    for (const conn of googleAdsConnections) {
      if (!connectionIds.has(conn.id)) {
        promises.push(prefetchGoogleAdsAccounts(conn.id));
      }
    }
  }

  if (usedServices.has('tiktok')) {
    for (const conn of tiktokConnections) {
      if (!connectionIds.has(conn.id)) {
        promises.push(prefetchTikTokAccounts(conn.id));
      }
    }
  }

  // Wait for all fetches to complete
  await Promise.allSettled(promises);
}

/**
 * Hook to use in WorkflowBuilderPage to prefetch data when workflow loads
 */
export function usePrefetchWorkflowData(nodes: WorkflowNode[], isReady: boolean) {
  const prefetchedRef = { current: false };

  if (isReady && nodes.length > 0 && !prefetchedRef.current) {
    prefetchedRef.current = true;
    // Fire and forget - don't block UI
    prefetchWorkflowNodeData(nodes).catch(console.error);
  }
}
