import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Link2,
  Calendar,
  Database,
  ChevronDown,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { SchemaFieldSelector } from "@/components/shared/form/SchemaFieldSelector";
import { fetchClient } from "@/lib/fetchClient";
import type { FacebookAdsAccount } from "@/services/facebookAdsService";
import { cn } from "@/lib/utils";
import { useNodeDataCache } from "@/store/nodeDataCache";
import { prefetchConnections, prefetchFacebookFields, prefetchFacebookAccounts } from "@/services/nodeDataPrefetch";

// =============================================================================
// Helpers
// =============================================================================

const stripAllActPrefixes = (id: string): string => {
  if (!id) return "";
  let result = id;
  while (result.startsWith("act_")) {
    result = result.slice(4);
  }
  return result;
};

const normalizeAccountId = (id: string): string => {
  const stripped = stripAllActPrefixes(id);
  return stripped ? `act_${stripped}` : "";
};


const isAccountSelected = (selectedIds: string[], accountId: string): boolean => {
  const normalizedAccountId = stripAllActPrefixes(accountId);
  return selectedIds.some((id) => stripAllActPrefixes(id) === normalizedAccountId);
};

const normalizeAccountIdArray = (ids: string[] | undefined): string[] => {
  if (!ids || !Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const normalized = normalizeAccountId(id);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
};

// =============================================================================
// Types
// =============================================================================

interface FacebookField {
  field: string;
  display_name: string | null;
  group: string;
  is_primary_key: boolean;
  active: boolean;
  data_type: string;
  action_type: string | null;
}

interface FacebookAdsFormData {
  connection_id: string;
  ad_account_id: string[];
  fields: string[];
  time_config: {
    time_preset: string;
    time_increment: number;
  };
  accessToken?: string;
  adAccountId?: string[];
  selectedFields?: string[];
  since?: string;
  until?: string;
  level?: "ad" | "adset" | "campaign" | "account";
  breakdowns?: string[];
  timeIncrement?: number;
  metrics?: string[];
  token_id?: string;
}

interface FacebookAdsFormProps {
  initialData?: Partial<FacebookAdsFormData>;
  onChange: (data: FacebookAdsFormData) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
}

// =============================================================================
// Date Presets
// =============================================================================

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_60_days", label: "Last 60 days" },
  { value: "last_90_days", label: "Last 90 days" },
];

// =============================================================================
// Component
// =============================================================================

export const FacebookAdsForm: React.FC<FacebookAdsFormProps> = ({
  initialData = {},
  onChange,
  onValidate,
}) => {
  const onChangeRef = useRef(onChange);
  const onValidateRef = useRef(onValidate);
  const hydratedRef = useRef(false);

  onChangeRef.current = onChange;
  onValidateRef.current = onValidate;

  // Cache store
  const cache = useNodeDataCache();
  const cachedConnections = cache.connections;
  const cachedFields = cache.facebookFields;

  // Form state
  const [formData, setFormData] = useState<FacebookAdsFormData>(() => {
    const base: FacebookAdsFormData = {
      connection_id: "",
      ad_account_id: [],
      fields: [],
      time_config: { time_preset: "last_7_days", time_increment: 1 },
      ...initialData,
    };
    base.ad_account_id = normalizeAccountIdArray(base.ad_account_id);
    return base;
  });

  // UI state - use cache when available
  const [availableFields, setAvailableFields] = useState<FacebookField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Array<{ id: string; name: string }>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<FacebookAdsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Sync from cache when available
  useEffect(() => {
    if (cachedFields?.data && cachedFields.data.length > 0) {
      setAvailableFields(cachedFields.data as FacebookField[]);
      setLoading(cachedFields.isLoading);
      setError(cachedFields.error);
    }
  }, [cachedFields]);

  useEffect(() => {
    if (cachedConnections?.data) {
      const fbConnections = cachedConnections.data
        .filter(c => c.service_name?.toLowerCase().includes('facebook'))
        .map(c => ({ id: c.id, name: c.name }));
      if (fbConnections.length > 0) {
        setConnections(fbConnections);
        setConnectionsLoading(cachedConnections.isLoading);
      }
    }
  }, [cachedConnections]);

  // Sync accounts from cache
  useEffect(() => {
    if (formData.connection_id) {
      const cachedAccounts = cache.facebookAccounts[formData.connection_id];
      if (cachedAccounts?.data && cachedAccounts.data.length > 0) {
        // API returns { id, account_id, name, account_status }
        setAdAccounts(cachedAccounts.data);
        setAccountsLoading(cachedAccounts.isLoading);
      }
    }
  }, [formData.connection_id, cache.facebookAccounts]);

  // Load data on mount - use cache first, fetch if needed
  useEffect(() => {
    // Only fetch if cache is empty
    if (!cachedFields?.data || cachedFields.data.length === 0) {
      prefetchFacebookFields();
    }
    if (!cachedConnections?.data || cachedConnections.data.length === 0) {
      prefetchConnections();
    }
  }, []);

  // Fetch accounts when connection changes - use cache first
  useEffect(() => {
    if (!formData.connection_id) {
      setAdAccounts([]);
      return;
    }

    const cachedAccounts = cache.facebookAccounts[formData.connection_id];
    if (cachedAccounts?.data && cachedAccounts.data.length > 0) {
      // Already have cached data, use it directly
      setAdAccounts(cachedAccounts.data);
      setAccountsLoading(false);

      // Auto-select if only one account
      if (cachedAccounts.data.length === 1 && formData.ad_account_id.length === 0) {
        setFormData((prev) => ({
          ...prev,
          ad_account_id: [normalizeAccountId(cachedAccounts.data[0].account_id)],
        }));
      }
      return;
    }

    // No cache, fetch from API
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        // Use prefetch which will also update the cache
        const accounts = await prefetchFacebookAccounts(formData.connection_id);
        setAdAccounts(accounts);
        if (accounts.length === 1 && formData.ad_account_id.length === 0) {
          setFormData((prev) => ({
            ...prev,
            ad_account_id: [normalizeAccountId(accounts[0].account_id)],
          }));
        }
      } catch (err) {
        console.error("Failed to fetch Facebook Ad Accounts:", err);
        setAdAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, [formData.connection_id]);

  // Hydrate initial data
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!initialData || Object.keys(initialData).length === 0) {
      hydratedRef.current = true;
      return;
    }

    const transformedData: Partial<FacebookAdsFormData> = { ...initialData };

    if (initialData.accessToken || initialData.token_id) {
      transformedData.connection_id =
        initialData.connection_id || initialData.accessToken || initialData.token_id || "";
    }

    if (initialData.adAccountId && Array.isArray(initialData.adAccountId)) {
      transformedData.ad_account_id = normalizeAccountIdArray(
        initialData.ad_account_id || initialData.adAccountId
      );
    }

    if (initialData.selectedFields && Array.isArray(initialData.selectedFields)) {
      transformedData.fields = initialData.fields || initialData.selectedFields;
    } else if (initialData.fields && Array.isArray(initialData.fields)) {
      transformedData.fields = initialData.fields;
    } else if (initialData.metrics && Array.isArray(initialData.metrics)) {
      transformedData.fields = initialData.metrics;
    }

    if (initialData.time_config) {
      transformedData.time_config = initialData.time_config;
    } else if (initialData.timeIncrement) {
      transformedData.time_config = {
        time_preset: "last_7_days",
        time_increment: initialData.timeIncrement,
      };
    }

    if (transformedData.ad_account_id) {
      transformedData.ad_account_id = normalizeAccountIdArray(transformedData.ad_account_id);
    }

    setFormData((prev) => {
      const merged = { ...prev, ...transformedData };
      merged.ad_account_id = normalizeAccountIdArray(merged.ad_account_id);
      return merged;
    });
    hydratedRef.current = true;
  }, []);

  // Validation
  const validateForm = React.useCallback((): string[] => {
    const errors: string[] = [];
    const connIds = connections.map((c) => c.id);

    if (connIds.length === 0) {
      errors.push("No Facebook connections available");
    } else if (!formData.connection_id || !connIds.includes(formData.connection_id)) {
      errors.push("Please select a connection");
    }

    if (formData.ad_account_id.length === 0) {
      errors.push("Please select at least one ad account");
    }

    if (!Array.isArray(formData.fields) || formData.fields.length === 0) {
      errors.push("Please select at least one field");
    }

    if (!formData.time_config?.time_preset) {
      errors.push("Please select a date range");
    }

    return errors;
  }, [connections, formData]);

  const { isFormValid, validationErrors } = useMemo(() => {
    const errors = validateForm();
    return { isFormValid: errors.length === 0, validationErrors: errors };
  }, [validateForm]);

  useEffect(() => {
    if (onValidateRef.current) {
      onValidateRef.current(isFormValid, validationErrors);
    }
  }, [isFormValid, validationErrors]);

  useEffect(() => {
    onChangeRef.current(formData);
  }, [formData]);

  // API calls
  const loadFacebookFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchClient("/api/facebook/facebook_fields");
      if (!response.ok) throw new Error(`Failed to load fields: ${response.statusText}`);
      const fields: FacebookField[] = await response.json();
      setAvailableFields(fields.filter((field) => field.active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Facebook fields");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (updates: Partial<FacebookAdsFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Get selected connection name
  const selectedConnection = connections.find((c) => c.id === formData.connection_id);
  const selectedDatePreset = DATE_PRESETS.find(
    (p) => p.value === formData.time_config?.time_preset
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Connection & Account Section */}
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Link2 className="w-4 h-4 text-blue-500" />
          Connection & Accounts
        </div>

        {/* Connection Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Facebook Connection</label>
            <a
              href="/connections"
              className="text-xs text-brand-500 hover:text-brand-600 inline-flex items-center gap-1"
            >
              Manage <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setConnectionDropdownOpen(!connectionDropdownOpen)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all",
                connectionDropdownOpen
                  ? "border-brand-500 ring-2 ring-brand-500/20"
                  : "border-border-primary hover:border-border-primary/80",
                "bg-surface-primary"
              )}
            >
              <span className={selectedConnection ? "text-text-primary" : "text-text-tertiary"}>
                {connectionsLoading
                  ? "Loading..."
                  : selectedConnection
                  ? selectedConnection.name
                  : "Select a connection"}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-text-tertiary transition-transform",
                  connectionDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {connectionDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-surface-primary border border-border-primary rounded-lg shadow-lg overflow-hidden">
                {connections.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                    No Facebook connections found
                  </div>
                ) : (
                  connections.map((conn) => (
                    <button
                      key={conn.id}
                      type="button"
                      onClick={() => {
                        updateFormData({ connection_id: conn.id, ad_account_id: [] });
                        setConnectionDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors",
                        conn.id === formData.connection_id && "bg-brand-500/5"
                      )}
                    >
                      <span className="text-text-primary">{conn.name}</span>
                      {conn.id === formData.connection_id && (
                        <Check className="w-4 h-4 text-brand-500" />
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
            <label className="text-xs font-medium text-text-secondary">Ad Accounts</label>
            {formData.ad_account_id.length > 0 && (
              <span className="text-xs text-brand-500 font-medium">
                {formData.ad_account_id.length} selected
              </span>
            )}
          </div>

          <div className="bg-surface-primary border border-border-primary rounded-lg overflow-hidden">
            {accountsLoading ? (
              <div className="px-3 py-4 flex items-center justify-center gap-2 text-sm text-text-tertiary">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading accounts...
              </div>
            ) : !formData.connection_id ? (
              <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                Select a connection first
              </div>
            ) : adAccounts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-text-tertiary text-center">
                No ad accounts found
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-border-primary/50">
                {adAccounts.map((account) => {
                  const normalizedId = normalizeAccountId(account.account_id);
                  const rawId = stripAllActPrefixes(account.account_id);
                  const isSelected = isAccountSelected(formData.ad_account_id, account.account_id);

                  return (
                    <label
                      key={account.account_id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                        isSelected ? "bg-brand-500/5" : "hover:bg-surface-secondary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                          isSelected
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-border-primary bg-surface-primary"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary truncate">{account.name}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          const current = formData.ad_account_id || [];
                          let next: string[];
                          if (checked) {
                            if (!isAccountSelected(current, account.account_id)) {
                              next = [...current, normalizedId];
                            } else {
                              next = current;
                            }
                          } else {
                            next = current.filter((id) => stripAllActPrefixes(id) !== rawId);
                          }
                          updateFormData({ ad_account_id: next });
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
      <div className="bg-surface-secondary/30 border border-border-primary rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Calendar className="w-4 h-4 text-purple-500" />
          Date Range
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-all",
              dateDropdownOpen
                ? "border-brand-500 ring-2 ring-brand-500/20"
                : "border-border-primary hover:border-border-primary/80",
              "bg-surface-primary"
            )}
          >
            <span className={selectedDatePreset ? "text-text-primary" : "text-text-tertiary"}>
              {selectedDatePreset?.label || "Select date range"}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-text-tertiary transition-transform",
                dateDropdownOpen && "rotate-180"
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
                    updateFormData({
                      time_config: { ...formData.time_config, time_preset: preset.value },
                    });
                    setDateDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-surface-secondary transition-colors",
                    preset.value === formData.time_config?.time_preset && "bg-brand-500/5"
                  )}
                >
                  <span className="text-text-primary">{preset.label}</span>
                  {preset.value === formData.time_config?.time_preset && (
                    <Check className="w-4 h-4 text-brand-500" />
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
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Database className="w-4 h-4 text-green-500" />
            Fields
          </div>
          <span className="text-xs text-text-tertiary">
            {formData.fields.length} selected
          </span>
        </div>

        {error && (
          <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
            <button
              type="button"
              onClick={loadFacebookFields}
              className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
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
              group: f.group || "General",
            }))}
            selectedIds={formData.fields}
            onChange={(ids) => updateFormData({ fields: ids })}
            loading={loading}
            placeholder="Search fields..."
          />
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex-shrink-0 bg-surface-secondary/50 border border-border-primary rounded-lg px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Connection:</span>
              <span className={selectedConnection ? "text-text-primary font-medium" : "text-text-tertiary"}>
                {selectedConnection?.name || "Not selected"}
              </span>
            </div>
            <div className="w-px h-4 bg-border-primary" />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Accounts:</span>
              <span className="text-text-primary font-medium">{formData.ad_account_id.length}</span>
            </div>
            <div className="w-px h-4 bg-border-primary" />
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Fields:</span>
              <span className="text-text-primary font-medium">{formData.fields.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary">Date:</span>
            <span className="text-text-primary font-medium">
              {selectedDatePreset?.label || "Not set"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
