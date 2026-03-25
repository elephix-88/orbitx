import React, { useEffect, useRef, useState } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import {
  MessageCircle,
  Calendar,
  ChevronDown,
  Check,
  ExternalLink,
  RefreshCw,
  Link2,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections } from '@/services/nodeDataPrefetch';
import { fetchClient } from '@/lib/fetchClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineAdsTimeConfig {
  time_preset: string;
}

interface LineAdsFormData {
  connection_id: string;
  ad_account_id: string;
  fields: string[];
  time_config: LineAdsTimeConfig;
}

interface LineAdsNodeData {
  connection_id?: string;
  ad_account_id?: string;
  fields?: string[];
  time_config?: LineAdsTimeConfig;
}

interface LineAdsEditorProps {
  nodeId?: string;
  data: LineAdsNodeData;
  onChange: (data: LineAdsFormData) => void;
  onClose: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
}

interface ConnectionOption {
  id: string;
  name: string;
}

interface LineAdsAccount {
  account_id: string;
  account_name: string;
}

// ---------------------------------------------------------------------------
// Static field definitions
// LINE Ads fields are a fixed set — no need to fetch from API.
// ---------------------------------------------------------------------------

const LINE_ADS_FIELDS: Array<{ value: string; label: string; group: string }> = [
  { value: 'impressions', label: 'Impressions', group: 'Delivery' },
  { value: 'clicks', label: 'Clicks', group: 'Delivery' },
  { value: 'reach', label: 'Reach', group: 'Delivery' },
  { value: 'cost', label: 'Cost', group: 'Cost' },
  { value: 'conversions', label: 'Conversions', group: 'Conversion' },
  { value: 'conversion_value', label: 'Conversion Value', group: 'Conversion' },
  { value: 'campaign_name', label: 'Campaign Name', group: 'Campaign' },
  { value: 'campaign_id', label: 'Campaign ID', group: 'Campaign' },
  { value: 'adgroup_name', label: 'Ad Group Name', group: 'Ad Group' },
  { value: 'adgroup_id', label: 'Ad Group ID', group: 'Ad Group' },
  { value: 'ad_name', label: 'Ad Name', group: 'Ad' },
  { value: 'ad_id', label: 'Ad ID', group: 'Ad' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_14_days', label: 'Last 14 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_60_days', label: 'Last 60 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
];

const DEFAULT_FIELDS = [
  'impressions',
  'clicks',
  'cost',
  'conversions',
  'campaign_name',
  'campaign_id',
];

// ---------------------------------------------------------------------------
// MultiSelect — reused pattern from GA4Editor
// ---------------------------------------------------------------------------

interface MultiSelectProps {
  label: string;
  items: Array<{ value: string; label: string; group: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  items,
  selected,
  onChange,
  placeholder = 'Search...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.value.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-surface-primary',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-border-primary hover:border-border-primary/80'
        )}
      >
        <span className={selected.length > 0 ? 'text-text-primary' : 'text-text-tertiary'}>
          {selected.length > 0 ? `${selected.length} ${label} selected` : `Select ${label}`}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border-primary">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-2 py-1.5 text-sm bg-surface-secondary rounded border border-border-primary text-text-primary placeholder-text-tertiary outline-none focus:border-brand-500"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {Object.entries(grouped).length === 0 ? (
              <div className="px-3 py-3 text-sm text-text-tertiary text-center">No results</div>
            ) : (
              Object.entries(grouped).map(([group, groupItems]) => (
                <div key={group}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider bg-surface-secondary/50">
                    {group}
                  </div>
                  {groupItems.map((item) => {
                    const isSelected = selected.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggle(item.value)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors',
                          isSelected && 'bg-brand-500/5'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                              isSelected
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'border-border-primary bg-surface-primary'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                          </div>
                          <span className="text-text-primary">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-border-primary">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// LineAdsEditor
// ---------------------------------------------------------------------------

const LineAdsEditor: React.FC<LineAdsEditorProps> = ({
  data,
  onChange,
  onClose,
  onValidate,
  compact = false,
}) => {
  const cache = useNodeDataCache();
  const cachedConnections = cache.connections;

  const connectionDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<LineAdsFormData>({
    connection_id: '',
    ad_account_id: '',
    fields: DEFAULT_FIELDS,
    time_config: { time_preset: 'last_7_days' },
  });

  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [accounts, setAccounts] = useState<LineAdsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Click-outside for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        connectionDropdownOpen &&
        connectionDropdownRef.current &&
        !connectionDropdownRef.current.contains(target)
      ) {
        setConnectionDropdownOpen(false);
      }
      if (
        accountDropdownOpen &&
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(target)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        dateDropdownOpen &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(target)
      ) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [connectionDropdownOpen, accountDropdownOpen, dateDropdownOpen]);

  // Sync connections from cache — filter for LINE Ads connections
  useEffect(() => {
    if (cachedConnections?.data) {
      const lineConnections = cachedConnections.data
        .filter((c) => c.service_name?.toLowerCase().includes('lineads') || c.service_name?.toLowerCase().includes('line_ads') || c.service_name?.toLowerCase().includes('line ads'))
        .map((c) => ({ id: c.id, name: c.name }));
      setConnections(lineConnections);
      setConnectionsLoading(cachedConnections.isLoading);
    }
  }, [cachedConnections]);

  // Initialize from data prop once on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setForm((prev) => {
      const next = { ...prev };
      if (typeof data?.connection_id === 'string') next.connection_id = data.connection_id;
      if (typeof data?.ad_account_id === 'string') next.ad_account_id = data.ad_account_id;
      if (Array.isArray(data?.fields) && data.fields.length > 0) next.fields = data.fields;
      if (data?.time_config) next.time_config = data.time_config;
      return next;
    });
  }, [data]);

  // Load connections on mount
  useEffect(() => {
    if (!cachedConnections?.data || cachedConnections.data.length === 0) {
      prefetchConnections();
    }
  }, []);

  // Fetch ad accounts when connection changes
  useEffect(() => {
    if (!form.connection_id) {
      setAccounts([]);
      return;
    }

    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const response = await fetchClient(
          `/api/line/ads/accounts?connection_id=${encodeURIComponent(form.connection_id)}`,
          { method: 'GET' }
        );
        if (response.ok) {
          const json = await response.json();
          const items: LineAdsAccount[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : [];
          setAccounts(items);

          // Auto-select if only one account
          if (items.length === 1 && !form.ad_account_id) {
            setForm((prev) => ({ ...prev, ad_account_id: items[0].account_id }));
          }
        }
      } catch {
        setAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, [form.connection_id]);

  const isValid = Boolean(form.connection_id) && Boolean(form.ad_account_id);

  // Validation callback
  useEffect(() => {
    if (!onValidate) return;
    const errors: string[] = [];
    if (!form.connection_id) errors.push('Please select a connection');
    if (!form.ad_account_id) errors.push('Please select an ad account');
    onValidate(isValid, errors);
  }, [isValid, form.connection_id, form.ad_account_id, onValidate]);

  // Compact mode: propagate immediately
  useEffect(() => {
    if (compact && onChange) onChange(form);
  }, [compact, form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onChange(form);
    onClose();
  };

  const selectedConnection = connections.find((c) => c.id === form.connection_id);
  const selectedAccount = accounts.find((a) => a.account_id === form.ad_account_id);
  const selectedDatePreset = DATE_PRESETS.find((p) => p.value === form.time_config.time_preset);

  const formContent = (
    <div className="h-full flex flex-col gap-4">
      {/* Connection & Account */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Link2 className="w-4 h-4 text-green-500" />
          Connection &amp; Account
        </div>

        {/* Connection dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">LINE Ads Connection</label>
            <a
              href="/connections"
              className="text-xs text-brand-500 hover:text-brand-600 inline-flex items-center gap-1"
            >
              Manage <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative" ref={connectionDropdownRef}>
            <button
              type="button"
              onClick={() => setConnectionDropdownOpen(!connectionDropdownOpen)}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-surface-primary',
                connectionDropdownOpen
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-border-primary hover:border-border-primary/80'
              )}
            >
              <span className={selectedConnection ? 'text-text-primary' : 'text-text-tertiary'}>
                {connectionsLoading
                  ? 'Loading...'
                  : selectedConnection
                    ? selectedConnection.name
                    : 'Select a connection'}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-text-tertiary transition-transform',
                  connectionDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {connectionDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
                {connections.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                    No LINE Ads connections found.{' '}
                    <a href="/connections" className="text-brand-500 hover:underline">
                      Add one
                    </a>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, connection_id: conn.id, ad_account_id: '' }));
                        setConnectionDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors',
                        conn.id === form.connection_id && 'bg-brand-500/5'
                      )}
                    >
                      <span className="text-text-primary">{conn.name}</span>
                      {conn.id === form.connection_id && (
                        <Check className="w-4 h-4 text-brand-500" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ad Account dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">Ad Account</label>

          <div className="relative" ref={accountDropdownRef}>
            <button
              type="button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              disabled={!form.connection_id}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-surface-primary',
                !form.connection_id && 'opacity-50 cursor-not-allowed',
                accountDropdownOpen
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-border-primary hover:border-border-primary/80'
              )}
            >
              <span className={selectedAccount ? 'text-text-primary' : 'text-text-tertiary'}>
                {accountsLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Loading accounts...
                  </span>
                ) : !form.connection_id ? (
                  'Select a connection first'
                ) : selectedAccount ? (
                  selectedAccount.account_name
                ) : (
                  'Select an ad account'
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-text-tertiary transition-transform',
                  accountDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {accountDropdownOpen && form.connection_id && (
              <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
                {accounts.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                    No ad accounts found for this connection
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.account_id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, ad_account_id: account.account_id }));
                        setAccountDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors',
                        account.account_id === form.ad_account_id && 'bg-brand-500/5'
                      )}
                    >
                      <div>
                        <div className="text-text-primary">{account.account_name}</div>
                        <div className="text-xs text-text-tertiary">{account.account_id}</div>
                      </div>
                      {account.account_id === form.ad_account_id && (
                        <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Calendar className="w-4 h-4 text-purple-500" />
          Date Range
        </div>

        <div className="relative" ref={dateDropdownRef}>
          <button
            type="button"
            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-surface-primary',
              dateDropdownOpen
                ? 'border-brand-500 ring-2 ring-brand-500/20'
                : 'border-border-primary hover:border-border-primary/80'
            )}
          >
            <span className={selectedDatePreset ? 'text-text-primary' : 'text-text-tertiary'}>
              {selectedDatePreset?.label ?? 'Select date range'}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-text-tertiary transition-transform',
                dateDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {dateDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      time_config: { time_preset: preset.value },
                    }));
                    setDateDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors',
                    preset.value === form.time_config.time_preset && 'bg-brand-500/5'
                  )}
                >
                  <span className="text-text-primary">{preset.label}</span>
                  {preset.value === form.time_config.time_preset && (
                    <Check className="w-4 h-4 text-brand-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            Fields
          </div>
          <span className="text-xs text-text-tertiary">{form.fields.length} selected</span>
        </div>
        <MultiSelect
          label="fields"
          items={LINE_ADS_FIELDS}
          selected={form.fields}
          onChange={(fields) => setForm((prev) => ({ ...prev, fields }))}
          placeholder="Search fields..."
        />
        {form.fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.fields.map((field) => {
              const found = LINE_ADS_FIELDS.find((f) => f.value === field);
              return (
                <span
                  key={field}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs"
                >
                  {found?.label ?? field}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        fields: prev.fields.filter((f) => f !== field),
                      }))
                    }
                    className="hover:text-blue-300"
                  >
                    x
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 bg-surface-secondary/50 border border-border-primary rounded-lg px-4 py-3">
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Connection:</span>
              <span
                className={
                  selectedConnection ? 'text-text-primary font-medium' : 'text-text-tertiary'
                }
              >
                {selectedConnection?.name ?? 'Not selected'}
              </span>
            </div>
            <div className="w-px h-4 bg-border-primary" />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Account:</span>
              <span
                className={
                  selectedAccount ? 'text-text-primary font-medium' : 'text-text-tertiary'
                }
              >
                {selectedAccount?.account_name ?? 'Not selected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary">Fields:</span>
            <span className="text-text-primary font-medium">{form.fields.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <BaseEditorWrapper
      title="LINE Ads"
      icon={<MessageCircle className="w-7 h-7 text-green-500" />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={isValid}
      initialValues={form}
      currentValues={form}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default LineAdsEditor;
