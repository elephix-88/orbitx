/**
 * Node Data Cache Store
 *
 * Caches fetched data (connections, accounts, fields) for node editors.
 * Data persists until user explicitly clears it or navigates away from workflow.
 */

import { create } from 'zustand';

// Types for cached data
export interface ConnectionOption {
 id: string;
 name: string;
 service_name?: string;
}

export interface FacebookAdsAccount {
 id: string;
 account_id: string;
 name: string;
 account_status: number;
}

export interface GoogleAdsAccount {
 id: string;
 descriptive_name: string;
}

export interface TikTokAdsAccount {
 advertiser_id: string;
 advertiser_name: string;
}

export interface FieldDefinition {
 field: string;
 display_name: string | null;
 group?: string;
 data_type?: string;
 is_primary_key?: boolean;
 active?: boolean;
 action_type?: string | null;
}

export interface GoogleSheet {
 id: string;
 name: string;
}

// Cache entry with timestamp
interface CacheEntry<T> {
 data: T;
 fetchedAt: number;
 isLoading: boolean;
 error: string | null;
}

// Platform account keys that use Record<string, CacheEntry<T[]>> shape
type AccountCacheKey = 'facebookAccounts' | 'googleAdsAccounts' | 'tiktokAccounts' | 'googleSheets';

// Platform fields keys that use CacheEntry<FieldDefinition[]> | null shape
type FieldsCacheKey = 'facebookFields' | 'googleAdsFields' | 'tiktokFields';

// Cache state
interface NodeDataCacheState {
 // Connections (shared across all nodes)
 connections: CacheEntry<ConnectionOption[]> | null;

 // Facebook Ads
 facebookAccounts: Record<string, CacheEntry<FacebookAdsAccount[]>>;
 facebookFields: CacheEntry<FieldDefinition[]> | null;

 // Google Ads
 googleAdsAccounts: Record<string, CacheEntry<GoogleAdsAccount[]>>;
 googleAdsFields: CacheEntry<FieldDefinition[]> | null;

 // TikTok Ads
 tiktokAccounts: Record<string, CacheEntry<TikTokAdsAccount[]>>;
 tiktokFields: CacheEntry<FieldDefinition[]> | null;

 // Google Sheets
 googleSheets: Record<string, CacheEntry<GoogleSheet[]>>;

 // Actions
 setConnections: (data: ConnectionOption[], error?: string | null) => void;
 setConnectionsLoading: (loading: boolean) => void;

 setFacebookAccounts: (connectionId: string, data: FacebookAdsAccount[], error?: string | null) => void;
 setFacebookAccountsLoading: (connectionId: string, loading: boolean) => void;
 setFacebookFields: (data: FieldDefinition[], error?: string | null) => void;
 setFacebookFieldsLoading: (loading: boolean) => void;

 setGoogleAdsAccounts: (connectionId: string, data: GoogleAdsAccount[], error?: string | null) => void;
 setGoogleAdsAccountsLoading: (connectionId: string, loading: boolean) => void;
 setGoogleAdsFields: (data: FieldDefinition[], error?: string | null) => void;
 setGoogleAdsFieldsLoading: (loading: boolean) => void;

 setTikTokAccounts: (connectionId: string, data: TikTokAdsAccount[], error?: string | null) => void;
 setTikTokAccountsLoading: (connectionId: string, loading: boolean) => void;
 setTikTokFields: (data: FieldDefinition[], error?: string | null) => void;
 setTikTokFieldsLoading: (loading: boolean) => void;

 setGoogleSheets: (connectionId: string, data: GoogleSheet[], error?: string | null) => void;
 setGoogleSheetsLoading: (connectionId: string, loading: boolean) => void;

 // Utility
 getConnectionsByService: (serviceName: string) => ConnectionOption[];
 hasValidCache: (cacheEntry: CacheEntry<unknown> | null, maxAgeMs?: number) => boolean;
 clearCache: () => void;
 clearAccountsCache: () => void;
}

const DEFAULT_CACHE_AGE = 5 * 60 * 1000; // 5 minutes

// --- Generic helpers to eliminate per-platform duplication ---

function setAccountData<T>(
 state: NodeDataCacheState,
 key: AccountCacheKey,
 connectionId: string,
 data: T[],
 error: string | null,
): Partial<NodeDataCacheState> {
 return {
 [key]: {
 ...(state[key] as Record<string, CacheEntry<T[]>>),
 [connectionId]: {
 data,
 fetchedAt: Date.now(),
 isLoading: false,
 error,
 },
 },
 };
}

function setAccountLoading<T>(
 state: NodeDataCacheState,
 key: AccountCacheKey,
 connectionId: string,
 loading: boolean,
): Partial<NodeDataCacheState> {
 const existing = (state[key] as Record<string, CacheEntry<T[]>>)[connectionId];
 return {
 [key]: {
 ...(state[key] as Record<string, CacheEntry<T[]>>),
 [connectionId]: {
 data: existing?.data || [],
 fetchedAt: existing?.fetchedAt || 0,
 isLoading: loading,
 error: existing?.error || null,
 },
 },
 };
}

function setFieldsData(
 key: FieldsCacheKey,
 data: FieldDefinition[],
 error: string | null,
): Partial<NodeDataCacheState> {
 return {
 [key]: {
 data,
 fetchedAt: Date.now(),
 isLoading: false,
 error,
 },
 };
}

function setFieldsLoading(
 state: NodeDataCacheState,
 key: FieldsCacheKey,
 loading: boolean,
): Partial<NodeDataCacheState> {
 const existing = state[key];
 return {
 [key]: existing
 ? { ...existing, isLoading: loading }
 : { data: [] as FieldDefinition[], fetchedAt: 0, isLoading: loading, error: null },
 };
}

export const useNodeDataCache = create<NodeDataCacheState>((set, get) => ({
 // Initial state
 connections: null,
 facebookAccounts: {},
 facebookFields: null,
 googleAdsAccounts: {},
 googleAdsFields: null,
 tiktokAccounts: {},
 tiktokFields: null,
 googleSheets: {},

 // Connections (unique shape — not per-platform)
 setConnections: (data, error = null) => set({
 connections: { data, fetchedAt: Date.now(), isLoading: false, error },
 }),

 setConnectionsLoading: (loading) => set((state) => ({
 connections: state.connections
 ? { ...state.connections, isLoading: loading }
 : { data: [], fetchedAt: 0, isLoading: loading, error: null },
 })),

 // Facebook Ads
 setFacebookAccounts: (connectionId, data, error = null) =>
 set((state) => setAccountData(state, 'facebookAccounts', connectionId, data, error)),
 setFacebookAccountsLoading: (connectionId, loading) =>
 set((state) => setAccountLoading(state, 'facebookAccounts', connectionId, loading)),
 setFacebookFields: (data, error = null) =>
 set(setFieldsData('facebookFields', data, error)),
 setFacebookFieldsLoading: (loading) =>
 set((state) => setFieldsLoading(state, 'facebookFields', loading)),

 // Google Ads
 setGoogleAdsAccounts: (connectionId, data, error = null) =>
 set((state) => setAccountData(state, 'googleAdsAccounts', connectionId, data, error)),
 setGoogleAdsAccountsLoading: (connectionId, loading) =>
 set((state) => setAccountLoading(state, 'googleAdsAccounts', connectionId, loading)),
 setGoogleAdsFields: (data, error = null) =>
 set(setFieldsData('googleAdsFields', data, error)),
 setGoogleAdsFieldsLoading: (loading) =>
 set((state) => setFieldsLoading(state, 'googleAdsFields', loading)),

 // TikTok Ads
 setTikTokAccounts: (connectionId, data, error = null) =>
 set((state) => setAccountData(state, 'tiktokAccounts', connectionId, data, error)),
 setTikTokAccountsLoading: (connectionId, loading) =>
 set((state) => setAccountLoading(state, 'tiktokAccounts', connectionId, loading)),
 setTikTokFields: (data, error = null) =>
 set(setFieldsData('tiktokFields', data, error)),
 setTikTokFieldsLoading: (loading) =>
 set((state) => setFieldsLoading(state, 'tiktokFields', loading)),

 // Google Sheets
 setGoogleSheets: (connectionId, data, error = null) =>
 set((state) => setAccountData(state, 'googleSheets', connectionId, data, error)),
 setGoogleSheetsLoading: (connectionId, loading) =>
 set((state) => setAccountLoading(state, 'googleSheets', connectionId, loading)),

 // Utility functions
 getConnectionsByService: (serviceName: string) => {
 const connections = get().connections?.data || [];
 const serviceNameLower = serviceName.toLowerCase();
 return connections.filter(c =>
 c.service_name?.toLowerCase().includes(serviceNameLower)
 );
 },

 hasValidCache: (cacheEntry, maxAgeMs = DEFAULT_CACHE_AGE) => {
 if (!cacheEntry) return false;
 if (cacheEntry.isLoading) return true; // Consider loading as "valid" to prevent duplicate fetches
 if (cacheEntry.error) return false;
 const age = Date.now() - cacheEntry.fetchedAt;
 return age < maxAgeMs;
 },

 clearCache: () => set({
 connections: null,
 facebookAccounts: {},
 facebookFields: null,
 googleAdsAccounts: {},
 googleAdsFields: null,
 tiktokAccounts: {},
 tiktokFields: null,
 googleSheets: {},
 }),

 clearAccountsCache: () => set({
 facebookAccounts: {},
 googleAdsAccounts: {},
 tiktokAccounts: {},
 googleSheets: {},
 }),
}));
