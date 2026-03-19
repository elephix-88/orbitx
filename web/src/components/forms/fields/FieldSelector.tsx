// =============================================================================
// FieldSelector - Multi-select for Data Fields
// =============================================================================
// Fetches and displays available fields for a connector.
// Wraps SchemaFieldSelector with loading and error states.

import React, { useEffect, useState, useCallback } from 'react';
import { SchemaFieldSelector } from '@/components/shared/form/SchemaFieldSelector';
import { fetchClient } from '@/lib/fetchClient';
import { RefreshCw, AlertCircle, Database } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface Field {
  id: string;
  label: string;
  type?: string;
  isKey?: boolean;
  group?: string;
  description?: string;
}

export interface FieldSelectorProps {
  /** Currently selected field IDs */
  value: string[];
  /** Callback when selection changes */
  onChange: (_fieldIds: string[]) => void;
  /** API endpoint to fetch fields */
  fetchUrl: string;
  /** Transform API response to fields array */
  transformResponse?: (_data: unknown) => Field[];
  /** Label for the field */
  label?: string;
  /** Placeholder for search input */
  placeholder?: string;
  /** Custom error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Maximum height for the selector */
  maxHeight?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading message */
  loadingMessage?: string;
  /** Whether to show field count */
  showCount?: boolean;
}

// =============================================================================
// Default Transform
// =============================================================================

const defaultTransform = (data: unknown): Field[] => {
  const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data || [];

  return arr
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: String(item.field || item.id || item.name || ''),
      label: String(item.display_name || item.label || item.field || item.name || ''),
      type: item.data_type ? String(item.data_type) : undefined,
      isKey: Boolean(item.is_primary_key || item.isKey),
      group: item.group ? String(item.group) : 'General',
      description: item.description ? String(item.description) : undefined,
    }))
    .filter((f) => f.id); // Filter out items without valid IDs
};

// =============================================================================
// Component
// =============================================================================

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  value,
  onChange,
  fetchUrl,
  transformResponse = defaultTransform,
  label = 'Fields',
  placeholder = 'Search fields...',
  error,
  helperText,
  disabled: _disabled = false,
  className = '',
  maxHeight = '400px',
  emptyMessage = 'No fields available.',
  loadingMessage = 'Loading fields...',
  showCount = true,
}) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const resp = await fetchClient(fetchUrl);
      if (!resp.ok) {
        throw new Error('Failed to load fields');
      }

      const data = await resp.json();
      const transformed = transformResponse(data);

      // Filter to only active fields if there's an 'active' property
      const activeFields = transformed.filter((f) => {
        const original = (Array.isArray(data) ? data : data?.data || [])
          .find((item: Record<string, unknown>) =>
            (item.field || item.id || item.name) === f.id
          );
        return original?.active !== false;
      });

      setFields(activeFields.length > 0 ? activeFields : transformed);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, transformResponse]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const displayError = error || fetchError;

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          {label && (
            <label className="block text-sm font-medium text-text-secondary">
              {label}
            </label>
          )}
        </div>
        <div className="flex items-center justify-center py-8 text-sm text-text-tertiary">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          {loadingMessage}
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError && fields.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {fetchError}
          </div>
          <button
            type="button"
            onClick={loadFields}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (fields.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-text-tertiary">
          <Database className="w-4 h-4" />
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
        {showCount && (
          <span className="text-xs text-text-tertiary">
            {value.length} of {fields.length} selected
          </span>
        )}
      </div>

      <div style={{ maxHeight }} className="overflow-y-auto custom-scrollbar">
        <SchemaFieldSelector
          fields={fields}
          selectedIds={value}
          onChange={onChange}
          loading={loading}
          placeholder={placeholder}
        />
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

export default FieldSelector;
