/**
 * Node Data Prefetch Service
 *
 * Prefetches all necessary data for workflow nodes when a workflow is opened.
 * This eliminates the need to fetch data when each node editor is opened.
 */

import { fetchClient } from '@/lib/fetchClient';
import { useNodeDataCache, ConnectionOption, FieldDefinition, FacebookAdsAccount, GoogleAdsAccount, TikTokAdsAccount } from '@/store/nodeDataCache';

interface ConnectionResponse {
 _id?: string | { $oid: string };
 service_name?: string;
 connection_name?: string;
 params?: { token_id?: string; connection_id?: string };
}

type Platform = 'facebook' | 'googleAds' | 'tiktok';

const PLATFORM_CONFIG: Record<Platform, {
 fieldsEndpoint: string;
 accountsEndpoint: string;
 fieldsCacheKey: 'facebookFields' | 'googleAdsFields' | 'tiktokFields';
 accountsCacheKey: 'facebookAccounts' | 'googleAdsAccounts' | 'tiktokAccounts';
 definitionId: string;
 serviceKey: string;
 serviceMatch: (name: string) => boolean;
 setFieldsLoading: (loading: boolean) => void;
 setFields: (data: FieldDefinition[], error?: string | null) => void;
 setAccountsLoading: (connectionId: string, loading: boolean) => void;
 setAccounts: (connectionId: string, data: unknown[], error?: string | null) => void;
}> = {
 facebook: {
 fieldsEndpoint: '/api/facebook/facebook_fields',
 accountsEndpoint: '/api/facebook/ads/accounts',
 fieldsCacheKey: 'facebookFields',
 accountsCacheKey: 'facebookAccounts',
 definitionId: 'facebook.ads',
 serviceKey: 'facebook',
 serviceMatch: (name) => name.includes('facebook'),
 setFieldsLoading: (loading) => useNodeDataCache.getState().setFacebookFieldsLoading(loading),
 setFields: (data, error) => useNodeDataCache.getState().setFacebookFields(data, error),
 setAccountsLoading: (id, loading) => useNodeDataCache.getState().setFacebookAccountsLoading(id, loading),
 setAccounts: (id, data, error) => useNodeDataCache.getState().setFacebookAccounts(id, data as FacebookAdsAccount[], error),
 },
 googleAds: {
 fieldsEndpoint: '/api/google/ads/fields',
 accountsEndpoint: '/api/google/ads/accounts',
 fieldsCacheKey: 'googleAdsFields',
 accountsCacheKey: 'googleAdsAccounts',
 definitionId: 'google.ads',
 serviceKey: 'google_ads',
 serviceMatch: (name) => name.includes('google') && name.includes('ads'),
 setFieldsLoading: (loading) => useNodeDataCache.getState().setGoogleAdsFieldsLoading(loading),
 setFields: (data, error) => useNodeDataCache.getState().setGoogleAdsFields(data, error),
 setAccountsLoading: (id, loading) => useNodeDataCache.getState().setGoogleAdsAccountsLoading(id, loading),
 setAccounts: (id, data, error) => useNodeDataCache.getState().setGoogleAdsAccounts(id, data as GoogleAdsAccount[], error),
 },
 tiktok: {
 fieldsEndpoint: '/api/tiktok/tiktok_fields',
 accountsEndpoint: '/api/tiktok/ads/accounts',
 fieldsCacheKey: 'tiktokFields',
 accountsCacheKey: 'tiktokAccounts',
 definitionId: 'tiktok.ads',
 serviceKey: 'tiktok',
 serviceMatch: (name) => name.includes('tiktok'),
 setFieldsLoading: (loading) => useNodeDataCache.getState().setTikTokFieldsLoading(loading),
 setFields: (data, error) => useNodeDataCache.getState().setTikTokFields(data, error),
 setAccountsLoading: (id, loading) => useNodeDataCache.getState().setTikTokAccountsLoading(id, loading),
 setAccounts: (id, data, error) => useNodeDataCache.getState().setTikTokAccounts(id, data as TikTokAdsAccount[], error),
 },
};

function extractConnectionId(conn: ConnectionResponse): string {
 if (conn._id) {
 if (typeof conn._id === 'object' && '$oid' in conn._id) {
 return conn._id.$oid;
 }
 return String(conn._id);
 }
 return conn.params?.token_id || conn.params?.connection_id || '';
}

export async function prefetchConnections(): Promise<ConnectionOption[]> {
 const cache = useNodeDataCache.getState();

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

async function prefetchFields(platform: Platform): Promise<FieldDefinition[]> {
 const cache = useNodeDataCache.getState();
 const config = PLATFORM_CONFIG[platform];
 const existing = cache[config.fieldsCacheKey];

 if (cache.hasValidCache(existing)) {
 return existing?.data || [];
 }

 config.setFieldsLoading(true);

 try {
 const resp = await fetchClient(config.fieldsEndpoint);
 if (!resp.ok) throw new Error(`Failed to load fields: ${resp.statusText}`);
 const raw = await resp.json();
 const fields: FieldDefinition[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
 const activeFields = fields.filter(f => f.active ?? true);
 config.setFields(activeFields);
 return activeFields;
 } catch (error) {
 config.setFields([], error instanceof Error ? error.message : `Failed to fetch ${platform} fields`);
 return [];
 }
}

async function prefetchAccounts(platform: Platform, connectionId: string): Promise<unknown[]> {
 if (!connectionId) return [];

 const cache = useNodeDataCache.getState();
 const config = PLATFORM_CONFIG[platform];
 const existing = (cache[config.accountsCacheKey] as Record<string, unknown>)[connectionId] as { data?: unknown[] } | undefined;

 if (cache.hasValidCache(existing as Parameters<typeof cache.hasValidCache>[0])) {
 return existing?.data || [];
 }

 config.setAccountsLoading(connectionId, true);

 try {
 const resp = await fetchClient(`${config.accountsEndpoint}?connection_id=${encodeURIComponent(connectionId)}`);
 if (!resp.ok) {
 config.setAccounts(connectionId, []);
 return [];
 }
 const accounts = await resp.json().catch(() => []);
 config.setAccounts(connectionId, accounts);
 return accounts;
 } catch (error) {
 config.setAccounts(connectionId, [], error instanceof Error ? error.message : 'Failed to fetch accounts');
 return [];
 }
}

// Backward-compatible named exports
export async function prefetchFacebookFields(): Promise<FieldDefinition[]> {
 return prefetchFields('facebook');
}

export async function prefetchGoogleAdsFields(): Promise<FieldDefinition[]> {
 return prefetchFields('googleAds');
}

export async function prefetchTikTokFields(): Promise<FieldDefinition[]> {
 return prefetchFields('tiktok');
}

export async function prefetchFacebookAccounts(connectionId: string): Promise<FacebookAdsAccount[]> {
 return prefetchAccounts('facebook', connectionId) as Promise<FacebookAdsAccount[]>;
}

export async function prefetchGoogleAdsAccounts(connectionId: string): Promise<GoogleAdsAccount[]> {
 return prefetchAccounts('googleAds', connectionId) as Promise<GoogleAdsAccount[]>;
}

export async function prefetchTikTokAccounts(connectionId: string): Promise<TikTokAdsAccount[]> {
 return prefetchAccounts('tiktok', connectionId) as Promise<TikTokAdsAccount[]>;
}

