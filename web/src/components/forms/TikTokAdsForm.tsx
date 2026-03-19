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
import { cn } from "@/lib/utils";
import { useNodeDataCache } from "@/store/nodeDataCache";
import { prefetchConnections, prefetchTikTokFields, prefetchTikTokAccounts } from "@/services/nodeDataPrefetch";

// =============================================================================
// Types
// =============================================================================

interface TikTokField {
  field: string;
  display_name: string | null;
  group: string;
  is_primary_key: boolean;
  active: boolean;
  data_type: string;
  report_level: string;
}

interface TikTokAdsAccount {
  advertiser_id: string;
  advertiser_name: string;
}

interface TikTokAdsFormData {
  connection_id: string;
  ad_account_id: string[];
  fields: string[];
  time_config: {
    time_preset: string;
    time_increment: number;
  };
}

interface TikTokAdsFormProps {
  initialData?: Partial<TikTokAdsFormData>;
  onChange: (data: TikTokAdsFormData) => void;
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

export const TikTokAdsForm: React.FC<TikTokAdsFormProps> = ({
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
  const cachedFields = cache.tiktokFields;

  // Form state
  const [formData, setFormData] = useState<TikTokAdsFormData>(() => ({
    connection_id: "",
    ad_account_id: [],
    fields: [],
    time_config: { time_preset: "last_7_days", time_increment: 1 },
    ...initialData,
  }));

  // UI state
  const [availableFields, setAvailableFields] = useState<TikTokField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<Array<{ id: string; name: string }>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<TikTokAdsAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [connectionDropdownOpen, setConnectionDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Sync from cache when available
  useEffect(() => {
    if (cachedFields?.data && cachedFields.data.length > 0) {
      setAvailableFields(cachedFields.data as TikTokField[]);
      setLoading(cachedFields.isLoading);
      setError(cachedFields.error);
    }
  }, [cachedFields]);

  useEffect(() => {
    if (cachedConnections?.data) {
      const tiktokConnections = cachedConnections.data
        .filter(c => c.service_name?.toLowerCase().includes('tiktok'))
        .map(c => ({ id: c.id, name: c.name }));
      if (tiktokConnections.length > 0) {
        setConnections(tiktokConnections);
        setConnectionsLoading(cachedConnections.isLoading);
      }
    }
  }, [cachedConnections]);

  // Sync accounts from cache
  useEffect(() => {
    if (formData.connection_id) {
      const cachedAccounts = cache.tiktokAccounts[formData.connection_id];
      if (cachedAccounts?.data && cachedAccounts.data.length > 0) {
        setAdAccounts(cachedAccounts.data);
        setAccountsLoading(cachedAccounts.isLoading);
      }
    }
  }, [formData.connection_id, cache.tiktokAccounts]);

  // Load data on mount - use cache first, fetch if needed
  useEffect(() => {
    if (!cachedFields?.data || cachedFields.data.length === 0) {
      prefetchTikTokFields();
    }
    if (!cachedConnections?.data || cachedConnections.data.length === 0) {
      prefetchConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch accounts when connection changes
  useEffect(() => {
    if (!formData.connection_id) {
      setAdAccounts([]);
      return;
    }

    const cachedAccounts = cache.tiktokAccounts[formData.connection_id];
    if (cachedAccounts?.data && cachedAccounts.data.length > 0) {
      setAdAccounts(cachedAccounts.data);
      setAccountsLoading(false);

      // Auto-select if only one account
      if (cachedAccounts.data.length === 1 && formData.ad_account_id.length === 0) {
        setFormData((prev) => ({
          ...prev,
          ad_account_id: [cachedAccounts.data[0].advertiser_id],
        }));
      }
      return;
    }

    // No cache, fetch from API
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const accounts = await prefetchTikTokAccounts(formData.connection_id);
        setAdAccounts(accounts);
        if (accounts.length === 1 && formData.ad_account_id.length === 0) {
          setFormData((prev) => ({
            ...prev,
            ad_account_id: [accounts[0].advertiser_id],
          }));
        }
      } catch (err) {
        console.error("Failed to fetch TikTok Ad Accounts:", err);
        setAdAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-run when connection changes
  }, [formData.connection_id]);

  // Hydrate initial data (only run on mount with initial snapshot)
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!initialData || Object.keys(initialData).length === 0) {
      hydratedRef.current = true;
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...initialData,
    }));
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation
  const validateForm = React.useCallback((): string[] => {
    const errors: string[] = [];
    const connIds = connections.map((c) => c.id);

    if (connIds.length === 0) {
      errors.push("No TikTok connections available");
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

  const updateFormData = (updates: Partial<TikTokAdsFormData>) => {
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
          <Link2 className="w-4 h-4 text-black dark:text-white" />
          Connection & Accounts
        </div>

        {/* Connection Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">TikTok Connection</label>
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
                    No TikTok connections found
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
                  const isSelected = formData.ad_account_id.includes(account.advertiser_id);

                  return (
                    <label
                      key={account.advertiser_id}
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
                        <div className="text-sm text-text-primary truncate">{account.advertiser_name}</div>
                        <div className="text-xs text-text-tertiary">{account.advertiser_id}</div>
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
                            if (!current.includes(account.advertiser_id)) {
                              next = [...current, account.advertiser_id];
                            } else {
                              next = current;
                            }
                          } else {
                            next = current.filter((id) => id !== account.advertiser_id);
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
              onClick={() => prefetchTikTokFields()}
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
