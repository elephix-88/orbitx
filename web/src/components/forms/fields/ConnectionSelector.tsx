// =============================================================================
// ConnectionSelector - Reusable OAuth Connection Picker
// =============================================================================
// Fetches and displays available connections filtered by service name.
// Handles loading states and auto-selection for single connections.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '@/components/shared/form/Select';
import { fetchClient } from '@/lib/fetchClient';
import { RefreshCw, Link2, AlertCircle, ExternalLink } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface Connection {
  id: string;
  name: string;
  serviceName?: string;
}

interface ConnectionResponse {
  _id: string | { $oid: string };
  service_name: string;
  connection_name: string;
}

export interface ConnectionSelectorProps {
  /** Currently selected connection ID */
  value: string;
  /** Callback when connection changes */
  onChange: (_connectionId: string) => void;
  /** Filter connections by service name (e.g., 'GoogleAds', 'FacebookAds') */
  serviceName: string;
  /** Label for the field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to auto-select if only one connection exists */
  autoSelectSingle?: boolean;
  /** Custom error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  value,
  onChange,
  serviceName,
  label = 'Connection',
  placeholder = 'Select a connection',
  autoSelectSingle = true,
  error,
  helperText,
  disabled = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const resp = await fetchClient('/api/connections');
      if (!resp.ok) {
        throw new Error('Failed to load connections');
      }

      const raw = await resp.json();
      const arr: ConnectionResponse[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];

      const filtered: Connection[] = arr
        .filter((c) => c.service_name === serviceName)
        .map((c) => ({
          id: String(
            c?._id && typeof c._id === 'object' && '$oid' in c._id
              ? c._id.$oid
              : c?._id || ''
          ),
          name: c?.connection_name || serviceName,
          serviceName: c.service_name,
        }));

      setConnections(filtered);

      // Auto-select if only one connection and no value selected
      if (autoSelectSingle && filtered.length === 1 && !value) {
        onChange(filtered[0].id);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [serviceName, autoSelectSingle, value, onChange]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const displayError = error || fetchError;

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2 text-sm text-text-tertiary py-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading connections...
        </div>
      </div>
    );
  }

  if (fetchError && connections.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {fetchError}
          </div>
          <button
            type="button"
            onClick={loadConnections}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/30">
              <Link2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                No {serviceName} Connection Found
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                You need to connect your {serviceName} account before configuring this node.
              </p>
              <button
                type="button"
                onClick={() => navigate('/connections')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Go to Connections
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        label={label}
        value={value}
        onChange={(val) => onChange(String(val || ''))}
        options={connections.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={placeholder}
        error={displayError || undefined}
        helperText={helperText}
        disabled={disabled}
      />
    </div>
  );
};

export default ConnectionSelector;
