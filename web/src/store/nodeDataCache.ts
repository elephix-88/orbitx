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

// Cache state
interface NodeDataCacheState {
  // Connections (shared across all nodes)
  connections: CacheEntry<ConnectionOption[]> | null;

  // Facebook Ads
  facebookAccounts: Record<string, CacheEntry<FacebookAdsAccount[]>>; // keyed by connection_id
  facebookFields: CacheEntry<FieldDefinition[]> | null;

  // Google Ads
  googleAdsAccounts: Record<string, CacheEntry<GoogleAdsAccount[]>>; // keyed by connection_id
  googleAdsFields: CacheEntry<FieldDefinition[]> | null;

  // TikTok Ads
  tiktokAccounts: Record<string, CacheEntry<TikTokAdsAccount[]>>; // keyed by connection_id
  tiktokFields: CacheEntry<FieldDefinition[]> | null;

  // Google Sheets
  googleSheets: Record<string, CacheEntry<GoogleSheet[]>>; // keyed by connection_id

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

  // Connections
  setConnections: (data, error = null) => set({
    connections: {
      data,
      fetchedAt: Date.now(),
      isLoading: false,
      error,
    }
  }),

  setConnectionsLoading: (loading) => set((state) => ({
    connections: state.connections
      ? { ...state.connections, isLoading: loading }
      : { data: [], fetchedAt: 0, isLoading: loading, error: null }
  })),

  // Facebook Ads
  setFacebookAccounts: (connectionId, data, error = null) => set((state) => ({
    facebookAccounts: {
      ...state.facebookAccounts,
      [connectionId]: {
        data,
        fetchedAt: Date.now(),
        isLoading: false,
        error,
      }
    }
  })),

  setFacebookAccountsLoading: (connectionId, loading) => set((state) => ({
    facebookAccounts: {
      ...state.facebookAccounts,
      [connectionId]: {
        data: state.facebookAccounts[connectionId]?.data || [],
        fetchedAt: state.facebookAccounts[connectionId]?.fetchedAt || 0,
        isLoading: loading,
        error: state.facebookAccounts[connectionId]?.error || null,
      }
    }
  })),

  setFacebookFields: (data, error = null) => set({
    facebookFields: {
      data,
      fetchedAt: Date.now(),
      isLoading: false,
      error,
    }
  }),

  setFacebookFieldsLoading: (loading) => set((state) => ({
    facebookFields: state.facebookFields
      ? { ...state.facebookFields, isLoading: loading }
      : { data: [], fetchedAt: 0, isLoading: loading, error: null }
  })),

  // Google Ads
  setGoogleAdsAccounts: (connectionId, data, error = null) => set((state) => ({
    googleAdsAccounts: {
      ...state.googleAdsAccounts,
      [connectionId]: {
        data,
        fetchedAt: Date.now(),
        isLoading: false,
        error,
      }
    }
  })),

  setGoogleAdsAccountsLoading: (connectionId, loading) => set((state) => ({
    googleAdsAccounts: {
      ...state.googleAdsAccounts,
      [connectionId]: {
        data: state.googleAdsAccounts[connectionId]?.data || [],
        fetchedAt: state.googleAdsAccounts[connectionId]?.fetchedAt || 0,
        isLoading: loading,
        error: state.googleAdsAccounts[connectionId]?.error || null,
      }
    }
  })),

  setGoogleAdsFields: (data, error = null) => set({
    googleAdsFields: {
      data,
      fetchedAt: Date.now(),
      isLoading: false,
      error,
    }
  }),

  setGoogleAdsFieldsLoading: (loading) => set((state) => ({
    googleAdsFields: state.googleAdsFields
      ? { ...state.googleAdsFields, isLoading: loading }
      : { data: [], fetchedAt: 0, isLoading: loading, error: null }
  })),

  // TikTok Ads
  setTikTokAccounts: (connectionId, data, error = null) => set((state) => ({
    tiktokAccounts: {
      ...state.tiktokAccounts,
      [connectionId]: {
        data,
        fetchedAt: Date.now(),
        isLoading: false,
        error,
      }
    }
  })),

  setTikTokAccountsLoading: (connectionId, loading) => set((state) => ({
    tiktokAccounts: {
      ...state.tiktokAccounts,
      [connectionId]: {
        data: state.tiktokAccounts[connectionId]?.data || [],
        fetchedAt: state.tiktokAccounts[connectionId]?.fetchedAt || 0,
        isLoading: loading,
        error: state.tiktokAccounts[connectionId]?.error || null,
      }
    }
  })),

  setTikTokFields: (data, error = null) => set({
    tiktokFields: {
      data,
      fetchedAt: Date.now(),
      isLoading: false,
      error,
    }
  }),

  setTikTokFieldsLoading: (loading) => set((state) => ({
    tiktokFields: state.tiktokFields
      ? { ...state.tiktokFields, isLoading: loading }
      : { data: [], fetchedAt: 0, isLoading: loading, error: null }
  })),

  // Google Sheets
  setGoogleSheets: (connectionId, data, error = null) => set((state) => ({
    googleSheets: {
      ...state.googleSheets,
      [connectionId]: {
        data,
        fetchedAt: Date.now(),
        isLoading: false,
        error,
      }
    }
  })),

  setGoogleSheetsLoading: (connectionId, loading) => set((state) => ({
    googleSheets: {
      ...state.googleSheets,
      [connectionId]: {
        data: state.googleSheets[connectionId]?.data || [],
        fetchedAt: state.googleSheets[connectionId]?.fetchedAt || 0,
        isLoading: loading,
        error: state.googleSheets[connectionId]?.error || null,
      }
    }
  })),

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
