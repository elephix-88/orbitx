import React, { useEffect, useRef, useState } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Check,
  ExternalLink,
  RefreshCw,
  Link2,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections } from '@/services/nodeDataPrefetch';
import { fetchClient } from '@/lib/fetchClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GA4TimeConfig {
  time_preset: string;
  time_increment: number;
}

interface GA4FormData {
  connection_id: string;
  property_id: string;
  dimensions: string[];
  metrics: string[];
  time_config: GA4TimeConfig;
}

interface GA4NodeData {
  connection_id?: string;
  property_id?: string;
  dimensions?: string[];
  metrics?: string[];
  time_config?: GA4TimeConfig;
}

interface GA4EditorProps {
  nodeId?: string;
  data: GA4NodeData;
  onChange: (data: GA4FormData) => void;
  onClose: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
}

interface ConnectionOption {
  id: string;
  name: string;
}

interface GA4Property {
  property_id: string;
  display_name: string;
}

// ---------------------------------------------------------------------------
// Static field definitions
// GA4 dimensions and metrics are fixed — no need to fetch from API.
// ---------------------------------------------------------------------------

const GA4_DIMENSIONS: Array<{ value: string; label: string; group: string }> = [
  { value: 'date', label: 'Date', group: 'Time' },
  { value: 'dateHour', label: 'Date Hour', group: 'Time' },
  { value: 'week', label: 'Week', group: 'Time' },
  { value: 'month', label: 'Month', group: 'Time' },
  { value: 'year', label: 'Year', group: 'Time' },
  { value: 'sessionSource', label: 'Session Source', group: 'Traffic' },
  { value: 'sessionMedium', label: 'Session Medium', group: 'Traffic' },
  { value: 'sessionCampaignName', label: 'Campaign Name', group: 'Traffic' },
  { value: 'sessionDefaultChannelGroup', label: 'Default Channel Group', group: 'Traffic' },
  { value: 'sessionSourceMedium', label: 'Source / Medium', group: 'Traffic' },
  { value: 'country', label: 'Country', group: 'Geo' },
  { value: 'region', label: 'Region', group: 'Geo' },
  { value: 'city', label: 'City', group: 'Geo' },
  { value: 'deviceCategory', label: 'Device Category', group: 'Device' },
  { value: 'operatingSystem', label: 'Operating System', group: 'Device' },
  { value: 'browser', label: 'Browser', group: 'Device' },
  { value: 'pagePath', label: 'Page Path', group: 'Page' },
  { value: 'pageTitle', label: 'Page Title', group: 'Page' },
  { value: 'landingPage', label: 'Landing Page', group: 'Page' },
];

const GA4_METRICS: Array<{ value: string; label: string; group: string }> = [
  { value: 'sessions', label: 'Sessions', group: 'Engagement' },
  { value: 'activeUsers', label: 'Active Users', group: 'Engagement' },
  { value: 'newUsers', label: 'New Users', group: 'Engagement' },
  { value: 'totalUsers', label: 'Total Users', group: 'Engagement' },
  { value: 'screenPageViews', label: 'Page Views', group: 'Engagement' },
  { value: 'screenPageViewsPerSession', label: 'Pages per Session', group: 'Engagement' },
  { value: 'averageSessionDuration', label: 'Avg Session Duration', group: 'Engagement' },
  { value: 'bounceRate', label: 'Bounce Rate', group: 'Engagement' },
  { value: 'engagementRate', label: 'Engagement Rate', group: 'Engagement' },
  { value: 'engagedSessions', label: 'Engaged Sessions', group: 'Engagement' },
  { value: 'conversions', label: 'Conversions', group: 'Conversion' },
  { value: 'purchaseRevenue', label: 'Purchase Revenue', group: 'Conversion' },
  { value: 'transactions', label: 'Transactions', group: 'Conversion' },
  { value: 'ecommercePurchases', label: 'Ecommerce Purchases', group: 'Conversion' },
  { value: 'addToCarts', label: 'Add to Carts', group: 'Conversion' },
  { value: 'checkouts', label: 'Checkouts', group: 'Conversion' },
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

// ---------------------------------------------------------------------------
// MultiSelect component used for dimensions and metrics
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
// GA4Editor
// ---------------------------------------------------------------------------

const GA4Editor: React.FC<GA4EditorProps> = ({
  data,
  onChange,
  onClose,
  onValidate,
  compact = false,
}) => {
  const cache = useNodeDataCache();
  const cachedConnections = cache.connections;

  const connectionDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<GA4FormData>({
    connection_id: '',
    property_id: '',
    dimensions: ['date', 'sessionSource', 'sessionMedium', 'sessionCampaignName'],
    metrics: ['sessions', 'activeUsers', 'conversions', 'purchaseRevenue', 'transactions'],
    time_config: { time_preset: 'last_7_days', time_increment: 1 },
  });

  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
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
        dateDropdownOpen &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(target)
      ) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [connectionDropdownOpen, dateDropdownOpen]);

  // Sync connections from cache
  useEffect(() => {
    if (cachedConnections?.data) {
      const ga4Connections = cachedConnections.data
        .filter(
          (c) =>
            c.service_name?.toLowerCase() === 'google_analytics' ||
            c.service_name?.toLowerCase().includes('analytics') ||
            c.service_name?.toLowerCase() === 'ga4'
        )
        .map((c) => ({ id: c.id, name: c.name }));
      setConnections(ga4Connections);
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
      if (typeof data?.property_id === 'string') next.property_id = data.property_id;
      if (Array.isArray(data?.dimensions) && data.dimensions.length > 0)
        next.dimensions = data.dimensions;
      if (Array.isArray(data?.metrics) && data.metrics.length > 0) next.metrics = data.metrics;
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

  // Fetch properties when connection changes
  useEffect(() => {
    if (!form.connection_id) {
      setProperties([]);
      return;
    }

    const fetchProperties = async () => {
      setPropertiesLoading(true);
      try {
        const response = await fetchClient(
          `/api/google/analytics/properties?connection_id=${encodeURIComponent(form.connection_id)}`,
          { method: 'GET' }
        );
        if (response.ok) {
          const json = await response.json();
          const items: GA4Property[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : [];
          setProperties(items);

          // Auto-select if only one property
          if (items.length === 1 && !form.property_id) {
            setForm((prev) => ({ ...prev, property_id: items[0].property_id }));
          }
        }
      } catch {
        setProperties([]);
      } finally {
        setPropertiesLoading(false);
      }
    };

    fetchProperties();
  }, [form.connection_id]);

  const isValid = Boolean(form.connection_id) && Boolean(form.property_id);

  // Validation callback
  useEffect(() => {
    if (!onValidate) return;
    const errors: string[] = [];
    if (!form.connection_id) errors.push('Please select a connection');
    if (!form.property_id) errors.push('Please select a GA4 property');
    onValidate(isValid, errors);
  }, [isValid, form.connection_id, form.property_id, onValidate]);

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
  const selectedProperty = properties.find((p) => p.property_id === form.property_id);
  const selectedDatePreset = DATE_PRESETS.find((p) => p.value === form.time_config.time_preset);

  const formContent = (
    <div className="h-full flex flex-col gap-4">
      {/* Connection & Property */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Link2 className="w-4 h-4 text-amber-500" />
          Connection &amp; Property
        </div>

        {/* Connection dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">
              Google Analytics Connection
            </label>
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
                    No Google Analytics connections found.{' '}
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
                        setForm((prev) => ({ ...prev, connection_id: conn.id, property_id: '' }));
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

        {/* Property dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">GA4 Property</label>

          <div className="relative" ref={propertyDropdownOpen ? undefined : undefined}>
            <button
              type="button"
              onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
              disabled={!form.connection_id}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all bg-surface-primary',
                !form.connection_id && 'opacity-50 cursor-not-allowed',
                propertyDropdownOpen
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-border-primary hover:border-border-primary/80'
              )}
            >
              <span className={selectedProperty ? 'text-text-primary' : 'text-text-tertiary'}>
                {propertiesLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Loading properties...
                  </span>
                ) : !form.connection_id ? (
                  'Select a connection first'
                ) : selectedProperty ? (
                  selectedProperty.display_name
                ) : (
                  'Select a property'
                )}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-text-tertiary transition-transform',
                  propertyDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {propertyDropdownOpen && form.connection_id && (
              <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
                {properties.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                    No properties found for this connection
                  </div>
                ) : (
                  properties.map((property) => (
                    <button
                      key={property.property_id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, property_id: property.property_id }));
                        setPropertyDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors',
                        property.property_id === form.property_id && 'bg-brand-500/5'
                      )}
                    >
                      <div>
                        <div className="text-text-primary">{property.display_name}</div>
                        <div className="text-xs text-text-tertiary">{property.property_id}</div>
                      </div>
                      {property.property_id === form.property_id && (
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
                      time_config: { ...prev.time_config, time_preset: preset.value },
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

      {/* Dimensions */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Layers className="w-4 h-4 text-blue-500" />
            Dimensions
          </div>
          <span className="text-xs text-text-tertiary">{form.dimensions.length} selected</span>
        </div>
        <MultiSelect
          label="dimensions"
          items={GA4_DIMENSIONS}
          selected={form.dimensions}
          onChange={(dimensions) => setForm((prev) => ({ ...prev, dimensions }))}
          placeholder="Search dimensions..."
        />
        {form.dimensions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.dimensions.map((dim) => {
              const found = GA4_DIMENSIONS.find((d) => d.value === dim);
              return (
                <span
                  key={dim}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs"
                >
                  {found?.label ?? dim}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        dimensions: prev.dimensions.filter((d) => d !== dim),
                      }))
                    }
                    className="hover:text-blue-300"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Metrics
          </div>
          <span className="text-xs text-text-tertiary">{form.metrics.length} selected</span>
        </div>
        <MultiSelect
          label="metrics"
          items={GA4_METRICS}
          selected={form.metrics}
          onChange={(metrics) => setForm((prev) => ({ ...prev, metrics }))}
          placeholder="Search metrics..."
        />
        {form.metrics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.metrics.map((metric) => {
              const found = GA4_METRICS.find((m) => m.value === metric);
              return (
                <span
                  key={metric}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs"
                >
                  {found?.label ?? metric}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        metrics: prev.metrics.filter((m) => m !== metric),
                      }))
                    }
                    className="hover:text-green-300"
                  >
                    ×
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
              <span className={selectedConnection ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                {selectedConnection?.name ?? 'Not selected'}
              </span>
            </div>
            <div className="w-px h-4 bg-border-primary" />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Property:</span>
              <span className={selectedProperty ? 'text-text-primary font-medium' : 'text-text-tertiary'}>
                {selectedProperty?.display_name ?? 'Not selected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Dimensions:</span>
              <span className="text-text-primary font-medium">{form.dimensions.length}</span>
            </div>
            <div className="w-px h-4 bg-border-primary" />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Metrics:</span>
              <span className="text-text-primary font-medium">{form.metrics.length}</span>
            </div>
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
      title="Google Analytics"
      icon={<BarChart3 className="w-7 h-7 text-amber-500" />}
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

export default GA4Editor;
