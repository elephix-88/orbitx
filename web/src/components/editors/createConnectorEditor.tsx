// =============================================================================
// Connector Editor Factory
// =============================================================================
// Factory function to generate consistent editor components for data connectors.
// This reduces boilerplate and ensures consistency across all connector editors.
//
// ## Usage Example
//
// ```tsx
// interface LinkedInAdsFormData {
//   connection_id: string;
//   ad_account_ids: string[];
//   fields: string[];
//   time_config: { time_preset: string; time_increment: number };
// }
//
// const LinkedInAdsEditor = createConnectorEditor<LinkedInAdsFormData>({
//   title: 'LinkedIn Ads',
//   sections: [
//     { id: 'connection', title: 'Connection', icon: <Settings className="w-5 h-5" /> },
//     { id: 'data', title: 'Data Options', icon: <Search className="w-5 h-5" /> },
//   ],
//   fields: [
//     { key: 'connection_id', label: 'Connection', section: 'connection', type: 'connection', serviceName: 'LinkedInAds' },
//     { key: 'ad_account_ids', label: 'Ad Accounts', section: 'connection', type: 'account-select', fetchUrl: '/api/linkedin/accounts' },
//     { key: 'fields', label: 'Fields', section: 'data', type: 'field-select', fetchUrl: '/api/linkedin/fields' },
//     { key: 'time_config', label: 'Date Range', section: 'data', type: 'date-range' },
//   ],
//   defaultValues: { connection_id: '', ad_account_ids: [], fields: [], time_config: { time_preset: 'last_7_days', time_increment: 1 } },
//   fromNodeData: (data) => ({ ...data }),
//   toCanonical: (data) => data,
//   validate: (data) => Boolean(data.connection_id && data.ad_account_ids.length > 0),
// });
// ```

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import BaseEditorWrapper from './BaseEditorWrapper';
import { ConnectionSelector } from '@/components/forms/fields/ConnectionSelector';
import { AccountSelector, Account } from '@/components/forms/fields/AccountSelector';
import { FieldSelector, Field } from '@/components/forms/fields/FieldSelector';
import { DateRangeSelector, TimeConfig } from '@/components/forms/fields/DateRangeSelector';
import { X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface EditorSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconColor?: string; // Tailwind classes like "bg-brand-500/10 text-brand-500"
}

export interface FieldConfig<TFormData> {
  /** Unique key for the field */
  key: keyof TFormData;
  /** Field label */
  label: string;
  /** Section this field belongs to */
  section: string;
  /** Field type */
  type: 'connection' | 'account-select' | 'field-select' | 'date-range' | 'date-preset' | 'select' | 'text' | 'number' | 'checkbox';
  /** Placeholder text */
  placeholder?: string;
  /** Helper text shown below field */
  helperText?: string;
  /** Whether field is required for validation */
  required?: boolean;
  /** Service name filter for connection selector (e.g., 'GoogleAds', 'FacebookAds') */
  serviceName?: string;
  /** Options for select fields */
  options?: Array<{ value: string | number; label: string }>;
  /** API endpoint for fetching options */
  fetchUrl?: string;
  /** Transform API response to options */
  transformResponse?: (_data: unknown) => Array<{ value: string; label: string }>;
  /** Transform API response for account selector */
  transformAccountResponse?: (_data: unknown) => Account[];
  /** Transform API response for field selector */
  transformFieldResponse?: (_data: unknown) => Field[];
  /** Depends on other field(s) - will refetch when those change */
  dependsOn?: Array<keyof TFormData>;
  /** Build the fetch URL dynamically based on form state */
  buildFetchUrl?: (_formData: TFormData) => string | null;
  /** Connection ID field name for account-select (defaults to 'connection_id') */
  connectionIdField?: keyof TFormData;
  /** Show time increment in date-range selector */
  showTimeIncrement?: boolean;
  /** Custom render function for complex fields */
  render?: (_props: {
    value: TFormData[keyof TFormData];
    onChange: (_value: TFormData[keyof TFormData]) => void;
    formData: TFormData;
    loading?: boolean;
    error?: string | null;
  }) => React.ReactNode;
}

export interface ConnectorEditorConfig<TFormData, TNodeData = unknown> {
  /** Editor title shown in header */
  title: string;
  /** Sections to organize fields */
  sections: EditorSection[];
  /** Field configurations */
  fields: FieldConfig<TFormData>[];
  /** Default values for the form */
  defaultValues: TFormData;
  /** Normalize incoming node data to form data */
  fromNodeData: (_nodeData: TNodeData | undefined) => Partial<TFormData>;
  /** Convert form data to canonical format for comparison and submission */
  toCanonical: (_formData: TFormData) => TFormData;
  /** Validation function - returns true if form is valid */
  validate: (_formData: TFormData) => boolean;
  /** Initial data loading hooks (e.g., load connections on mount) */
  onMount?: (_helpers: {
    setLoading: (_key: string, _loading: boolean) => void;
    setError: (_key: string, _error: string | null) => void;
    setOptions: (_key: string, _options: Array<{ value: string; label: string }>) => void;
  }) => void | Promise<void>;
}

export interface ConnectorEditorProps<TNodeData> {
  data?: TNodeData;
  onChange: (_data: unknown) => void;
  onClose: () => void;
  onDeleteNode?: () => void;
}

// =============================================================================
// Hook: useEditorForm
// =============================================================================

interface EditorFormState<TFormData> {
  formData: TFormData;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  options: Record<string, Array<{ value: string; label: string }>>;
}

function useEditorForm<TFormData>(
  config: ConnectorEditorConfig<TFormData, unknown>,
  initialData: unknown
) {
  const [state, setState] = useState<EditorFormState<TFormData>>(() => ({
    formData: {
      ...config.defaultValues,
      ...config.fromNodeData(initialData),
    },
    loading: {},
    errors: {},
    options: {},
  }));

  const updateFormData = useCallback((updates: Partial<TFormData>) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
    }));
  }, []);

  const setFieldValue = useCallback(<K extends keyof TFormData>(key: K, value: TFormData[K]) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [key]: value },
    }));
  }, []);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading },
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [key]: error },
    }));
  }, []);

  const setOptions = useCallback((key: string, options: Array<{ value: string; label: string }>) => {
    setState((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: options },
    }));
  }, []);

  const isValid = useMemo(() => {
    return config.validate(state.formData);
  }, [config, state.formData]);

  const canonical = useMemo(() => {
    return config.toCanonical(state.formData);
  }, [config, state.formData]);

  return {
    ...state,
    updateFormData,
    setFieldValue,
    setLoading,
    setError,
    setOptions,
    isValid,
    canonical,
  };
}

// =============================================================================
// Factory Function
// =============================================================================

export function createConnectorEditor<TFormData, TNodeData = unknown>(
  config: ConnectorEditorConfig<TFormData, TNodeData>
): React.FC<ConnectorEditorProps<TNodeData>> {
  const ConnectorEditor: React.FC<ConnectorEditorProps<TNodeData>> = ({
    data,
    onChange,
    onClose,
    onDeleteNode,
  }) => {
    const {
      formData,
      loading,
      errors,
      options,
      setFieldValue,
      setLoading,
      setError,
      setOptions,
      isValid,
      canonical,
    } = useEditorForm(config as unknown as ConnectorEditorConfig<TFormData, unknown>, data);

    const initialRef = useRef(canonical);

    // Call onMount hook
    useEffect(() => {
      if (config.onMount) {
        config.onMount({ setLoading, setError, setOptions });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid) return;
      onChange(canonical);
      onClose();
    };

    // Group fields by section
    const fieldsBySection = useMemo(() => {
      const grouped: Record<string, FieldConfig<TFormData>[]> = {};
      for (const field of config.fields) {
        if (!grouped[field.section]) {
          grouped[field.section] = [];
        }
        grouped[field.section].push(field);
      }
      return grouped;
    }, []);

    const renderField = (field: FieldConfig<TFormData>) => {
      const value = formData[field.key];
      const fieldLoading = loading[String(field.key)];
      const fieldError = errors[String(field.key)];
      const fieldOptions = options[String(field.key)] || field.options || [];

      // Custom render
      if (field.render) {
        return field.render({
          value,
          onChange: (v) => setFieldValue(field.key, v),
          formData,
          loading: fieldLoading,
          error: fieldError,
        });
      }

      // Default field rendering based on type
      switch (field.type) {
        case 'connection':
          return (
            <ConnectionSelector
              value={String(value || '')}
              onChange={(connectionId) => setFieldValue(field.key, connectionId as TFormData[keyof TFormData])}
              serviceName={field.serviceName || ''}
              label={field.label}
              placeholder={field.placeholder}
              helperText={field.helperText}
              error={fieldError || undefined}
            />
          );

        case 'account-select': {
          const connectionIdField = field.connectionIdField || 'connection_id';
          const connectionId = String(formData[connectionIdField as keyof TFormData] || '');
          const accountValues = Array.isArray(value) ? value as string[] : [];

          if (!field.fetchUrl) {
            return <div className="text-sm text-red-500">fetchUrl is required for account-select</div>;
          }

          return (
            <AccountSelector
              value={accountValues}
              onChange={(accountIds) => setFieldValue(field.key, accountIds as TFormData[keyof TFormData])}
              connectionId={connectionId}
              fetchUrl={field.fetchUrl}
              transformResponse={field.transformAccountResponse}
              label={field.label}
              helperText={field.helperText}
              error={fieldError || undefined}
            />
          );
        }

        case 'field-select': {
          const fieldValues = Array.isArray(value) ? value as string[] : [];

          if (!field.fetchUrl) {
            return <div className="text-sm text-red-500">fetchUrl is required for field-select</div>;
          }

          return (
            <FieldSelector
              value={fieldValues}
              onChange={(fields) => setFieldValue(field.key, fields as TFormData[keyof TFormData])}
              fetchUrl={field.fetchUrl}
              transformResponse={field.transformFieldResponse}
              label={field.label}
              placeholder={field.placeholder}
              helperText={field.helperText}
              error={fieldError || undefined}
            />
          );
        }

        case 'date-range': {
          const timeConfig = (value as TimeConfig) || { time_preset: 'last_7_days', time_increment: 1 };

          return (
            <DateRangeSelector
              value={timeConfig}
              onChange={(config) => setFieldValue(field.key, config as TFormData[keyof TFormData])}
              label={field.label}
              showIncrement={field.showTimeIncrement}
              helperText={field.helperText}
            />
          );
        }

        case 'text':
          return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="text"
                value={String(value || '')}
                onChange={(e) => setFieldValue(field.key, e.target.value as TFormData[keyof TFormData])}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {field.helperText && (
                <p className="text-xs text-text-tertiary">{field.helperText}</p>
              )}
            </div>
          );

        case 'number':
          return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type="number"
                value={Number(value) || 0}
                onChange={(e) => setFieldValue(field.key, Number(e.target.value) as TFormData[keyof TFormData])}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {field.helperText && (
                <p className="text-xs text-text-tertiary">{field.helperText}</p>
              )}
            </div>
          );

        case 'select':
        case 'date-preset':
          return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {fieldLoading ? (
                <div className="text-sm text-text-tertiary">Loading...</div>
              ) : (
                <select
                  value={String(value || '')}
                  onChange={(e) => setFieldValue(field.key, e.target.value as TFormData[keyof TFormData])}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="">{field.placeholder || 'Select...'}</option>
                  {fieldOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {fieldError && (
                <p className="text-xs text-red-500">{fieldError}</p>
              )}
              {field.helperText && !fieldError && (
                <p className="text-xs text-text-tertiary">{field.helperText}</p>
              )}
            </div>
          );

        case 'checkbox':
          return (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => setFieldValue(field.key, e.target.checked as TFormData[keyof TFormData])}
                className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
              />
              <label className="text-sm font-medium text-text-secondary">
                {field.label}
              </label>
            </div>
          );

        default:
          return (
            <div className="text-sm text-text-tertiary">
              Field type "{field.type}" requires custom render function
            </div>
          );
      }
    };

    return (
      <BaseEditorWrapper
        title={config.title}
        onClose={onClose}
        onSubmit={handleSubmit}
        isValid={isValid}
        initialValues={initialRef.current}
        currentValues={canonical}
        onDeleteNode={onDeleteNode}
      >
        <div className="space-y-6">
          {config.sections.map((section) => {
            const sectionFields = fieldsBySection[section.id] || [];
            if (sectionFields.length === 0) return null;

            return (
              <div key={section.id} className="glass-panel p-6 rounded-2xl space-y-6">
                <h4 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${section.iconColor || 'bg-brand-500/10 text-brand-500'}`}>
                    {section.icon}
                  </div>
                  {section.title}
                </h4>
                <div className="space-y-4">
                  {sectionFields.map((field) => (
                    <div key={String(field.key)}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Global errors */}
          {Object.entries(errors).some(([, err]) => err) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-1">
                    Please fix the following errors:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(errors)
                      .filter(([, err]) => err)
                      .map(([key, err]) => (
                        <li key={key}>• {err}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </BaseEditorWrapper>
    );
  };

  ConnectorEditor.displayName = `${config.title.replace(/\s+/g, '')}Editor`;

  return ConnectorEditor;
}

// =============================================================================
// Common Date Preset Options
// =============================================================================

export const DATE_PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_14_days', label: 'Last 14 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_60_days', label: 'Last 60 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
];

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { default as BaseEditorWrapper } from './BaseEditorWrapper';

// Re-export form field components for custom render functions
export { ConnectionSelector } from '@/components/forms/fields/ConnectionSelector';
export { AccountSelector } from '@/components/forms/fields/AccountSelector';
export { FieldSelector } from '@/components/forms/fields/FieldSelector';
export { DateRangeSelector } from '@/components/forms/fields/DateRangeSelector';

// Re-export types
export type { Account } from '@/components/forms/fields/AccountSelector';
export type { Field } from '@/components/forms/fields/FieldSelector';
export type { TimeConfig } from '@/components/forms/fields/DateRangeSelector';
