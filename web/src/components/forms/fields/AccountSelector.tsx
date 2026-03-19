// =============================================================================
// AccountSelector - Multi-select for Ad Accounts
// =============================================================================
// Fetches and displays available ad accounts for a given connection.
// Supports multi-selection with checkboxes.

import React, { useEffect, useState, useCallback } from 'react';
import { Checkbox } from '@/components/shared/form/Checkbox';
import { fetchClient } from '@/lib/fetchClient';
import { RefreshCw, AlertCircle, Building2 } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface Account {
  id: string;
  name: string;
}

export interface AccountSelectorProps {
  /** Currently selected account IDs */
  value: string[];
  /** Callback when selection changes */
  onChange: (_accountIds: string[]) => void;
  /** Connection ID to fetch accounts for */
  connectionId: string;
  /** API endpoint to fetch accounts */
  fetchUrl: string;
  /** Transform API response to accounts array */
  transformResponse?: (_data: unknown) => Account[];
  /** Label for the field */
  label?: string;
  /** Whether to auto-select if only one account exists */
  autoSelectSingle?: boolean;
  /** Custom error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading message */
  loadingMessage?: string;
}

// =============================================================================
// Default Transform
// =============================================================================

const defaultTransform = (data: unknown): Account[] => {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      id: String(item.id || item.account_id || ''),
      name: String(item.name || item.descriptive_name || item.account_name || item.id || ''),
    }));
  }
  return [];
};

// =============================================================================
// Component
// =============================================================================

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  value,
  onChange,
  connectionId,
  fetchUrl,
  transformResponse = defaultTransform,
  label = 'Accounts',
  autoSelectSingle = true,
  error,
  helperText,
  disabled = false,
  className = '',
  emptyMessage = 'No accounts found for this connection.',
  loadingMessage = 'Loading accounts...',
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!connectionId) {
      setAccounts([]);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      // Build URL with connection_id parameter
      const url = fetchUrl.includes('?')
        ? `${fetchUrl}&connection_id=${encodeURIComponent(connectionId)}`
        : `${fetchUrl}?connection_id=${encodeURIComponent(connectionId)}`;

      const resp = await fetchClient(url);
      if (!resp.ok) {
        throw new Error('Failed to load accounts');
      }

      const data = await resp.json();
      const transformed = transformResponse(data);
      setAccounts(transformed);

      // Auto-select if only one account and none selected
      if (autoSelectSingle && transformed.length === 1 && value.length === 0) {
        onChange([transformed[0].id]);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [connectionId, fetchUrl, transformResponse, autoSelectSingle, value.length, onChange]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleToggle = (accountId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, accountId]);
    } else {
      onChange(value.filter((id) => id !== accountId));
    }
  };

  const handleSelectAll = () => {
    if (value.length === accounts.length) {
      onChange([]);
    } else {
      onChange(accounts.map((a) => a.id));
    }
  };

  const displayError = error || fetchError;

  // No connection selected
  if (!connectionId) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="text-sm text-text-tertiary py-2">
          Select a connection to see available accounts.
        </div>
      </div>
    );
  }

  // Loading state
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
          {loadingMessage}
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError && accounts.length === 0) {
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
            onClick={loadAccounts}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-tertiary">
          <Building2 className="w-4 h-4" />
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">
            {value.length} of {accounts.length} selected
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium disabled:opacity-50"
          >
            {value.length === accounts.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <Checkbox
              checked={value.includes(account.id)}
              onChange={(e) => handleToggle(account.id, e.currentTarget.checked)}
              disabled={disabled}
              label={account.name}
            />
          </div>
        ))}
      </div>

      {displayError && (
        <p className="text-xs text-red-500">{displayError}</p>
      )}
      {helperText && !displayError && (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      )}
    </div>
  );
};

export default AccountSelector;
