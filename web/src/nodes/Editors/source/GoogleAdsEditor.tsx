import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNotification } from '@/hooks/useNotification';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Link2, Calendar, Database, ChevronDown, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { GoogleAdsIcon } from '@/components/icons/BrandIcons';
import { SchemaFieldSelector } from '@/components/shared/form/SchemaFieldSelector';
import { cn } from '@/lib/utils';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections, prefetchGoogleAdsFields, prefetchGoogleAdsAccounts } from '@/services/nodeDataPrefetch';

// Types
interface GoogleAdsTimeConfig {
 time_preset: string;
 time_increment: number;
}

interface GoogleAdsFormData {
 accessToken: string;
 adAccountIds: string[];
 fields: string[];
 time_config: GoogleAdsTimeConfig;
}

interface GoogleAdsNodeData {
 connection_id?: string;
 token_id?: string;
 ad_account_id?: string[];
 customer_ids?: string[];
 fields?: string[];
 time_config?: GoogleAdsTimeConfig;
}

interface GoogleAdsEditorProps {
 nodeId?: string;
 data: GoogleAdsNodeData;
 onChange: (data: GoogleAdsFormData) => void;
 onClose: () => void;
 onValidate?: (valid: boolean, errors: string[]) => void;
 /** When true, renders only the form without BaseEditorWrapper */
 compact?: boolean;
}

interface ConnectionOption {
 id: string;
 name: string;
}

interface GoogleAdsAccount {
 id: string;
 descriptive_name: string;
}

interface GoogleAdsField {
 field: string;
 display_name: string | null;
 group?: string;
 data_type?: string;
 is_primary_key?: boolean;
 active?: boolean;
}

const DATE_PRESETS = [
 { value: 'today', label: 'Today' },
 { value: 'yesterday', label: 'Yesterday' },
 { value: 'last_7_days', label: 'Last 7 days' },
 { value: 'last_14_days', label: 'Last 14 days' },
 { value: 'last_30_days', label: 'Last 30 days' },
 { value: 'last_60_days', label: 'Last 60 days' },
 { value: 'last_90_days', label: 'Last 90 days' },
];

const GoogleAdsEditor: React.FC<GoogleAdsEditorProps> = ({ data, onChange, onClose, onValidate, compact = false }) => {
 const { notify } = useNotification();

 // Cache store
 const cache = useNodeDataCache();
 const cachedConnections = cache.connections;
 const cachedFields = cache.googleAdsFields;

 // Refs for click-outside handling
 const connectionDropdownRef = useRef<HTMLDivElement>(null);
 const dateDropdownRef = useRef<HTMLDivElement>(null);

 const [form, setForm] = useState<GoogleAdsFormData>({
 accessToken: '',
 adAccountIds: [],
 fields: [],
 time_config: { time_preset: 'last_7_days', time_increment: 1 },
 });

 const [connections, setConnections] = useState<ConnectionOption[]>([]);
 const [loading, setLoading] = useState(false);
 const [accountsLoading, setAccountsLoading] = useState(false);
 const [accountsByToken, setAccountsByToken] = useState<Record<string, GoogleAdsAccount[]>>({});
 const [fieldsLoading, setFieldsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [availableFields, setAvailableFields] = useState<GoogleAdsField[]>([]);
 const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);
 const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

 // Click outside to close dropdowns
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 const target = event.target as Node;

 // Close connection dropdown if clicked outside
 if (connectionDropdownOpen && connectionDropdownRef.current && !connectionDropdownRef.current.contains(target)) {
 setConnectionDropdownOpen(false);
 }

 // Close date dropdown if clicked outside
 if (dateDropdownOpen && dateDropdownRef.current && !dateDropdownRef.current.contains(target)) {
 setDateDropdownOpen(false);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [connectionDropdownOpen, dateDropdownOpen]);

 // Sync from cache when available
 useEffect(() => {
 if (cachedFields?.data && cachedFields.data.length > 0) {
 setAvailableFields(cachedFields.data as GoogleAdsField[]);
 setFieldsLoading(cachedFields.isLoading);
 setError(cachedFields.error);
 }
 }, [cachedFields]);

 useEffect(() => {
 if (cachedConnections?.data) {
 const googleAdsConnections = cachedConnections.data
 .filter(c => c.service_name?.toLowerCase() === 'googleads' || c.service_name?.toLowerCase().includes('google ads'))
 .map(c => ({ id: c.id, name: c.name }));
 if (googleAdsConnections.length > 0) {
 setConnections(googleAdsConnections);
 setLoading(cachedConnections.isLoading);
 }
 }
 }, [cachedConnections]);

 // Clear stale connection when connections load
 useEffect(() => {
 if (connections.length === 0 || !form.accessToken) return;
 const currentValid = connections.some(c => c.id === form.accessToken);
 if (!currentValid) {
 const nextId = connections.length === 1 ? connections[0].id : '';
 notify.warning('Connection changed', 'Please re-select your ad accounts.');
 setForm((prev) => ({ ...prev, accessToken: nextId, adAccountIds: [] }));
 }
 }, [connections, form.accessToken]);

 // Sync accounts from cache
 useEffect(() => {
 if (form.accessToken) {
 const cachedAccounts = cache.googleAdsAccounts[form.accessToken];
 if (cachedAccounts?.data) {
 setAccountsByToken(prev => ({ ...prev, [form.accessToken]: cachedAccounts.data }));
 setAccountsLoading(cachedAccounts.isLoading);
 }
 }
 }, [form.accessToken, cache.googleAdsAccounts]);

 // Sync from data prop only on mount (not on every data change to avoid infinite loop)
 // The infinite loop happens when: data changes → setForm → onChange → parent updates data → repeat
 const initializedRef = useRef(false);
 useEffect(() => {
 if (initializedRef.current) return; // Only run once on mount
 initializedRef.current = true;

 setForm((prev) => {
 const next: GoogleAdsFormData = { ...prev };
 if (typeof data?.connection_id === 'string') next.accessToken = data.connection_id;
 else if (typeof data?.token_id === 'string') next.accessToken = data.token_id;
 if (Array.isArray(data?.ad_account_id)) next.adAccountIds = data.ad_account_id;
 else if (Array.isArray(data?.customer_ids)) next.adAccountIds = data.customer_ids;
 if (Array.isArray(data?.fields)) next.fields = data.fields;
 if (data?.time_config && typeof data.time_config === 'object') next.time_config = data.time_config;
 return next;
 });
 }, [data]);

 // Load data on mount - use cache first
 useEffect(() => {
 if (!cachedFields?.data || cachedFields.data.length === 0) {
 prefetchGoogleAdsFields();
 }
 if (!cachedConnections?.data || cachedConnections.data.length === 0) {
 prefetchConnections();
 }
 }, []);

 // Fetch accounts when connection changes - use cache first
 useEffect(() => {
 if (!form.accessToken) return;

 const cachedAccounts = cache.googleAdsAccounts[form.accessToken];
 if (cachedAccounts?.data && cachedAccounts.data.length > 0) {
 // Use cached data
 setAccountsByToken(prev => ({ ...prev, [form.accessToken]: cachedAccounts.data }));
 setAccountsLoading(false);

 // Auto-select if only one account
 if (!form.adAccountIds || form.adAccountIds.length === 0) {
 if (cachedAccounts.data.length === 1) {
 setForm((prev) => ({ ...prev, adAccountIds: [cachedAccounts.data[0].id] }));
 }
 }
 return;
 }

 // No cache, fetch from API
 const fetchAccounts = async () => {
 setAccountsLoading(true);
 try {
 const accs = await prefetchGoogleAdsAccounts(form.accessToken);
 setAccountsByToken(prev => ({ ...prev, [form.accessToken]: accs }));
 if (!form.adAccountIds || form.adAccountIds.length === 0) {
 if (accs.length === 1) setForm((prev) => ({ ...prev, adAccountIds: [accs[0].id] }));
 }
 } finally {
 setAccountsLoading(false);
 }
 };
 fetchAccounts();
 }, [form.accessToken]);

 const isValid = useMemo(() => {
 return Boolean(form.accessToken.trim()) && form.adAccountIds.length > 0;
 }, [form]);

 // Notify parent of validation changes
 useEffect(() => {
 if (onValidate) {
 const errors: string[] = [];
 if (!form.accessToken.trim()) errors.push('Please select a connection');
 if (form.adAccountIds.length === 0) errors.push('Please select at least one account');
 onValidate(isValid, errors);
 }
 }, [isValid, form.accessToken, form.adAccountIds, onValidate]);

 // In compact mode, propagate changes immediately
 useEffect(() => {
 if (compact && onChange) {
 onChange(canonical(form));
 }
 }, [compact, form]);

 const canonical = (d: GoogleAdsFormData): GoogleAdsFormData => ({
 accessToken: d?.accessToken || '',
 adAccountIds: Array.isArray(d?.adAccountIds) ? d.adAccountIds : [],
 fields: Array.isArray(d?.fields) ? d.fields : [],
 time_config: d?.time_config || { time_preset: 'last_7_days', time_increment: 1 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!isValid) return;
 onChange(canonical(form));
 onClose();
 };

 const selectedConnection = connections.find((c) => c.id === form.accessToken);
 const selectedDatePreset = DATE_PRESETS.find((p) => p.value === form.time_config?.time_preset);
 const accounts = accountsByToken[form.accessToken] || [];

 // Form content - shared between compact and full mode
 const formContent = (
 <div className="h-full flex flex-col gap-4">
 {/* Connection & Account Section */}
 <div className="bg-bg-card/30 border border-line-1 rounded-xl p-4 space-y-4">
 <div className="flex items-center gap-2 text-sm font-medium text-text-1">
 <Link2 className="w-4 h-4 text-blue-primary" />
 Connection & Accounts
 </div>

 {/* Connection Dropdown */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-text-2">Google Ads Connection</label>
 <a
 href="/connections"
 className="text-xs text-blue-primary hover:text-blue-primary inline-flex items-center gap-1"
 >
 Manage <ExternalLink className="w-3 h-3" />
 </a>
 </div>

 <div className="relative" ref={connectionDropdownRef}>
 <button
 type="button"
 onClick={() => setConnectionDropdownOpen(!connectionDropdownOpen)}
 className={cn(
 "w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all",
 connectionDropdownOpen
 ? "border-blue-primary ring-2 ring-blue-soft"
 : "border-line-1 hover:border-line-1/80",
 "bg-bg-page"
 )}
 >
 <span className={selectedConnection ? "text-text-1" : "text-text-3"}>
 {loading ? "Loading..." : selectedConnection ? selectedConnection.name : "Select a connection"}
 </span>
 <ChevronDown
 className={cn(
 "w-4 h-4 text-text-3 transition-transform",
 connectionDropdownOpen && "rotate-180"
 )}
 />
 </button>

 {connectionDropdownOpen && (
 <div className="absolute z-50 mt-1 w-full bg-bg-page border border-line-1 rounded-lg shadow-lg overflow-hidden">
 {connections.length === 0 ? (
 <div className="px-3 py-4 text-sm text-text-3 text-center">
 No Google Ads connections found
 </div>
 ) : (
 connections.map((conn) => (
 <button
 key={conn.id}
 type="button"
 onClick={() => {
 setForm((prev) => ({ ...prev, accessToken: conn.id, adAccountIds: [] }));
 setConnectionDropdownOpen(false);
 }}
 className={cn(
 "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-bg-card transition-colors",
 conn.id === form.accessToken && "bg-blue-soft"
 )}
 >
 <span className="text-text-1">{conn.name}</span>
 {conn.id === form.accessToken && (
 <Check className="w-4 h-4 text-blue-primary" />
 )}
 </button>
 ))
 )}
 </div>
 )}
 </div>
 </div>

 {/* Ad Accounts */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-text-2">Ad Accounts</label>
 {form.adAccountIds.length > 0 && (
 <span className="text-xs text-blue-primary font-medium">
 {form.adAccountIds.length} selected
 </span>
 )}
 </div>

 <div className="bg-bg-page border border-line-1 rounded-lg overflow-hidden">
 {accountsLoading ? (
 <div className="px-3 py-4 flex items-center justify-center gap-2 text-sm text-text-3">
 <RefreshCw className="w-4 h-4 animate-spin" />
 Loading accounts...
 </div>
 ) : !form.accessToken ? (
 <div className="px-3 py-4 text-sm text-text-3 text-center">
 Select a connection first
 </div>
 ) : accounts.length === 0 ? (
 <div className="px-3 py-4 text-sm text-text-3 text-center">
 No ad accounts found
 </div>
 ) : (
 <div className="max-h-48 overflow-y-auto divide-y divide-border-primary/50">
 {accounts.map((account) => {
 const isSelected = form.adAccountIds.includes(account.id);

 return (
 <label
 key={account.id}
 className={cn(
 "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
 isSelected ? "bg-blue-soft" : "hover:bg-bg-card/50"
 )}
 >
 <div
 className={cn(
 "w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
 isSelected
 ? "bg-blue-primary border-blue-primary text-white"
 : "border-line-1 bg-bg-page"
 )}
 >
 {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
 </div>
 <div className="flex-1 min-w-0">
 <div className="text-sm text-text-1 truncate">{account.descriptive_name}</div>
 </div>
 <input
 type="checkbox"
 className="hidden"
 checked={isSelected}
 onChange={(e) => {
 const checked = e.currentTarget.checked;
 setForm((prev) => {
 const set = new Set<string>(prev.adAccountIds);
 if (checked) set.add(account.id);
 else set.delete(account.id);
 return { ...prev, adAccountIds: Array.from(set) };
 });
 }}
 />
 </label>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Date Range Section */}
 <div className="bg-bg-card/30 border border-line-1 rounded-xl p-4 space-y-3">
 <div className="flex items-center gap-2 text-sm font-medium text-text-1">
 <Calendar className="w-4 h-4 text-violet" />
 Date Range
 </div>

 <div className="relative" ref={dateDropdownRef}>
 <button
 type="button"
 onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
 className={cn(
 "w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all",
 dateDropdownOpen
 ? "border-blue-primary ring-2 ring-blue-soft"
 : "border-line-1 hover:border-line-1/80",
 "bg-bg-page"
 )}
 >
 <span className={selectedDatePreset ? "text-text-1" : "text-text-3"}>
 {selectedDatePreset?.label || "Select date range"}
 </span>
 <ChevronDown
 className={cn(
 "w-4 h-4 text-text-3 transition-transform",
 dateDropdownOpen && "rotate-180"
 )}
 />
 </button>

 {dateDropdownOpen && (
 <div className="absolute z-50 mt-1 w-full bg-bg-page border border-line-1 rounded-lg shadow-lg overflow-hidden">
 {DATE_PRESETS.map((preset) => (
 <button
 key={preset.value}
 type="button"
 onClick={() => {
 setForm((prev) => ({
 ...prev,
 time_config: { ...prev.time_config, time_preset: preset.value },
 }));
 setDateDropdownOpen(false);
 }}
 className={cn(
 "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-bg-card transition-colors",
 preset.value === form.time_config?.time_preset && "bg-blue-soft"
 )}
 >
 <span className="text-text-1">{preset.label}</span>
 {preset.value === form.time_config?.time_preset && (
 <Check className="w-4 h-4 text-blue-primary" />
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Fields Section */}
 <div className="flex-1 min-h-0 flex flex-col">
 <div className="flex-shrink-0 flex items-center justify-between mb-3">
 <div className="flex items-center gap-2 text-sm font-medium text-text-1">
 <Database className="w-4 h-4 text-green-500" />
 Fields
 </div>
 <span className="text-xs text-text-3">
 {form.fields.length} selected
 </span>
 </div>

 {error && (
 <div className="mb-3 bg-danger-bg border border-danger-border/20 rounded-lg p-3 flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
 <span className="text-error text-sm">{error}</span>
 <button
 type="button"
 onClick={() => {
 setError(null);
 prefetchGoogleAdsFields().then(fields => {
 if (fields.length > 0) {
 setAvailableFields(fields);
 }
 }).catch(err => {
 setError(err instanceof Error ? err.message : 'Failed to load fields');
 });
 }}
 className="ml-auto text-sm text-error hover:underline"
 >
 Retry
 </button>
 </div>
 )}

 <div className="flex-1 min-h-0 overflow-y-auto">
 <SchemaFieldSelector
 fields={availableFields.map((f) => ({
 id: f.field,
 label: f.display_name || f.field,
 type: f.data_type,
 isKey: f.is_primary_key,
 group: f.group || 'General',
 }))}
 selectedIds={form.fields}
 onChange={(ids) => setForm((prev) => ({ ...prev, fields: ids }))}
 loading={fieldsLoading}
 placeholder="Search Google Ads fields..."
 />
 </div>
 </div>

 {/* Summary Bar */}
 <div className="flex-shrink-0 bg-bg-card/50 border border-line-1 rounded-lg px-4 py-3">
 <div className="flex items-center justify-between text-sm">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <span className="text-text-3">Connection:</span>
 <span className={selectedConnection ? "text-text-1 font-medium" : "text-text-3"}>
 {selectedConnection?.name || "Not selected"}
 </span>
 </div>
 <div className="w-px h-4 bg-border-primary" />
 <div className="flex items-center gap-2">
 <span className="text-text-3">Accounts:</span>
 <span className="text-text-1 font-medium">{form.adAccountIds.length}</span>
 </div>
 <div className="w-px h-4 bg-border-primary" />
 <div className="flex items-center gap-2">
 <span className="text-text-3">Fields:</span>
 <span className="text-text-1 font-medium">{form.fields.length}</span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-text-3">Date:</span>
 <span className="text-text-1 font-medium">
 {selectedDatePreset?.label || "Not set"}
 </span>
 </div>
 </div>
 </div>
 </div>
 );

 // Compact mode - render just the form without wrapper
 if (compact) {
 return <div className="space-y-4">{formContent}</div>;
 }

 // Full mode - render with BaseEditorWrapper
 return (
 <BaseEditorWrapper
 title="Google Ads"
 icon={<GoogleAdsIcon size={28} />}
 onClose={onClose}
 onSubmit={handleSubmit}
 isValid={isValid}
 initialValues={canonical(form)}
 currentValues={canonical(form)}
 >
 {formContent}
 </BaseEditorWrapper>
 );
};

export default GoogleAdsEditor;
