import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import BaseEditorWrapper from '@components/editors/BaseEditorWrapper';
import { Select } from '@/components/shared/form/Select';
import { Input } from '@/components/shared/form/Input';
import { Settings, Table as TableIcon, RefreshCw, ExternalLink } from 'lucide-react';
import { GoogleSheetsIcon } from '@/components/icons/BrandIcons';
import { fetchClient } from '@/lib/fetchClient';
import { useNodeDataCache } from '@/store/nodeDataCache';
import { prefetchConnections } from '@/services/nodeDataPrefetch';

type GoogleSheetsAction =
  | 'append'
  | 'overwrite'
  | 'new_worksheet'
  | 'new_spreadsheet';

interface GoogleSheetsFormData {
  connection_id: string;
  action: GoogleSheetsAction;
  spreadsheet_id: string;
  worksheet_name: string;
  worksheet_id: string;
  new_spreadsheet_name: string;
  new_worksheet_name: string;
}

interface GoogleSheetsNodeData {
  connection_id?: string;
  action?: string;
  spreadsheet_id?: string;
  spreadsheetId?: string;
  worksheet_name?: string;
  worksheet?: string;
  worksheet_id?: string;
  new_spreadsheet_name?: string;
  new_worksheet_name?: string;
  insert_mode?: string;
  write_mode?: string;
  writeMode?: string;
}

interface GoogleSheetsEditorProps {
  nodeId?: string;
  data: GoogleSheetsNodeData;
  onChange: (data: GoogleSheetsFormData) => void;
  onClose: () => void;
  onValidate?: (valid: boolean, errors: string[]) => void;
  compact?: boolean;
}

interface ConnectionOption {
  id: string;
  name: string;
}

interface GoogleSheetsFile {
  id: string;
  name: string;
  web_view_link: string;
  created_time?: string;
  modified_time?: string;
  mime_type: string;
}

interface GoogleSheetsWorksheet {
  sheet_id: number;
  title: string;
  index: number;
  sheet_type: string;
  grid_properties?: {
    rowCount?: number;
    columnCount?: number;
  };
}

interface GoogleSheetsSpreadsheet {
  spreadsheet_id: string;
  name: string;
  spreadsheet_url: string;
  created_time?: string;
  modified_time?: string;
  worksheets: GoogleSheetsWorksheet[];
}

const LEGACY_INSERT_MODE_TO_ACTION: Record<string, GoogleSheetsAction> = {
  append: 'overwrite',
  truncate: 'overwrite',
  overwrite: 'overwrite',
  upsert: 'overwrite',
};

function resolveAction(data: GoogleSheetsNodeData): GoogleSheetsAction {
  if (data?.action && isValidAction(data.action)) return data.action;
  const legacy = data?.insert_mode ?? data?.write_mode ?? data?.writeMode;
  if (legacy && LEGACY_INSERT_MODE_TO_ACTION[legacy.toLowerCase()]) {
    return LEGACY_INSERT_MODE_TO_ACTION[legacy.toLowerCase()];
  }
  return 'append';
}

function isValidAction(value: string): value is GoogleSheetsAction {
  return (
    value === 'append' ||
    value === 'overwrite' ||
    value === 'new_worksheet' ||
    value === 'new_spreadsheet'
  );
}

const ACTION_OPTIONS: { value: GoogleSheetsAction; label: string; description: string }[] = [
  {
    value: 'append',
    label: 'Append - Add rows to existing worksheet',
    description:
      'Adds new rows to the end of the selected worksheet. Existing data stays untouched.',
  },
  {
    value: 'overwrite',
    label: 'Overwrite - Clear and replace existing worksheet',
    description:
      'Clears all existing data in the worksheet, then writes the new data from row 1.',
  },
  {
    value: 'new_worksheet',
    label: 'New Worksheet - Create a new tab',
    description:
      'Creates a new worksheet tab in the selected spreadsheet, then writes the data. Fails if the name already exists.',
  },
  {
    value: 'new_spreadsheet',
    label: 'New Spreadsheet - Create a new file',
    description:
      'Creates a brand-new spreadsheet in Google Drive (owned by the connected account), then writes the data.',
  },
];

const TemplateTokensHint: React.FC = () => (
  <div className="bg-bg-card/50 rounded-lg p-3 border border-line-1 text-xs text-text-2 space-y-2">
    <div>
      <div className="font-medium text-text-1">Variables available</div>
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
        <div>
          <code className="bg-bg-muted px-1 rounded border border-line-1">{'{{date}}'}</code>{' '}
          — run date (YYYY-MM-DD)
        </div>
        <div>
          <code className="bg-bg-muted px-1 rounded border border-line-1">{'{{datetime}}'}</code>{' '}
          — run datetime (YYYY-MM-DD_HH-MM-SS)
        </div>
        <div>
          <code className="bg-bg-muted px-1 rounded border border-line-1">{'{{timestamp}}'}</code>{' '}
          — unix seconds
        </div>
        <div>
          <code className="bg-bg-muted px-1 rounded border border-line-1">{'{{run_id}}'}</code>{' '}
          — execution id
        </div>
      </div>
    </div>
    <div className="text-text-3">
      If you don't include any variable, we automatically append{' '}
      <code className="bg-bg-muted px-1 rounded border border-line-1">_{'{{datetime}}'}</code> so
      scheduled runs don't collide.
    </div>
  </div>
);

const GoogleSheetsEditor: React.FC<GoogleSheetsEditorProps> = ({
  data,
  onChange,
  onClose,
  onValidate,
  compact = false,
}) => {
  const cache = useNodeDataCache();
  const cachedConnections = cache.connections;

  const initializedRef = useRef(false);

  const [formData, setFormData] = useState<GoogleSheetsFormData>({
    connection_id: data?.connection_id || '',
    action: resolveAction(data),
    spreadsheet_id: data?.spreadsheet_id || data?.spreadsheetId || '',
    worksheet_name: data?.worksheet_name || data?.worksheet || '',
    worksheet_id: data?.worksheet_id || '',
    new_spreadsheet_name: data?.new_spreadsheet_name || '',
    new_worksheet_name: data?.new_worksheet_name || 'Sheet1',
  });

  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsReady, setConnectionsReady] = useState(false);

  const [spreadsheets, setSpreadsheets] = useState<GoogleSheetsFile[]>([]);
  const [spreadsheetsLoading, setSpreadsheetsLoading] = useState(false);
  const [worksheets, setWorksheets] = useState<GoogleSheetsWorksheet[]>([]);
  const [worksheetsLoading, setWorksheetsLoading] = useState(false);
  const [spreadsheetsError, setSpreadsheetsError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedConnections?.data) {
      const gsConnections = cachedConnections.data
        .filter((c) => {
          const serviceName = c.service_name?.toLowerCase() || '';
          return serviceName.includes('googlesheet') || serviceName.includes('google_sheet');
        })
        .map((c) => ({ id: c.id, name: c.name }));
      setConnections(gsConnections);
      setConnectionsLoading(cachedConnections.isLoading);
    }
  }, [cachedConnections]);

  useEffect(() => {
    if (connections.length === 0 && !connectionsLoading) {
      setConnectionsReady(true);
      return;
    }
    if (connections.length === 0) return;
    const currentValid = connections.some((c) => c.id === formData.connection_id);
    if (!currentValid) {
      const nextId = connections.length === 1 ? connections[0].id : '';
      setFormData((prev) => ({ ...prev, connection_id: nextId }));
    }
    setConnectionsReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, connectionsLoading]);

  useEffect(() => {
    if (!cachedConnections?.data || cachedConnections.data.length === 0) {
      prefetchConnections();
    }
  }, []);

  const needsExistingSpreadsheet =
    formData.action === 'append' ||
    formData.action === 'overwrite' ||
    formData.action === 'new_worksheet';

  const needsExistingWorksheet =
    formData.action === 'append' || formData.action === 'overwrite';

  const loadSpreadsheets = useCallback(async () => {
    if (!formData.connection_id) return;

    setSpreadsheetsLoading(true);
    setSpreadsheetsError(null);
    try {
      const resp = await fetchClient(
        `/api/google/sheets/spreadsheets?connection_id=${encodeURIComponent(
          formData.connection_id
        )}`
      );

      if (!resp.ok) {
        throw new Error(`Failed to load spreadsheets: ${resp.statusText}`);
      }

      const sheets = await resp.json();
      const arr: GoogleSheetsFile[] = Array.isArray(sheets) ? sheets : [];
      setSpreadsheets(arr);

      if (!formData.spreadsheet_id && arr.length === 1) {
        setFormData((prev) => ({
          ...prev,
          spreadsheet_id: arr[0].id,
          worksheet_name: '',
          worksheet_id: '',
        }));
      }
    } catch (error) {
      setSpreadsheetsError(
        error instanceof Error ? error.message : 'Failed to load spreadsheets'
      );
      setSpreadsheets([]);
    } finally {
      setSpreadsheetsLoading(false);
    }
  }, [formData.connection_id, formData.spreadsheet_id]);

  const loadWorksheets = useCallback(async () => {
    if (!formData.connection_id || !formData.spreadsheet_id) return;

    setWorksheetsLoading(true);
    try {
      const resp = await fetchClient(
        `/api/google/sheets/spreadsheets/${encodeURIComponent(
          formData.spreadsheet_id
        )}?connection_id=${encodeURIComponent(formData.connection_id)}`
      );

      if (!resp.ok) {
        throw new Error(`Failed to load worksheets: ${resp.statusText}`);
      }

      const spreadsheetDetails: GoogleSheetsSpreadsheet = await resp.json();
      setWorksheets(spreadsheetDetails.worksheets || []);

      if (!formData.worksheet_name && spreadsheetDetails.worksheets.length === 1) {
        const firstWorksheet = spreadsheetDetails.worksheets[0];
        setFormData((prev) => ({
          ...prev,
          worksheet_name: firstWorksheet.title,
          worksheet_id: firstWorksheet.sheet_id.toString(),
        }));
      }
    } catch (error) {
      console.error('Error loading worksheets:', error);
      setWorksheets([]);
    } finally {
      setWorksheetsLoading(false);
    }
  }, [formData.connection_id, formData.spreadsheet_id, formData.worksheet_name]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (data?.connection_id && data.connection_id !== formData.connection_id) {
      setFormData((prev) => ({
        ...prev,
        connection_id: data?.connection_id || prev.connection_id,
        action: resolveAction(data),
        spreadsheet_id: data?.spreadsheet_id || data?.spreadsheetId || prev.spreadsheet_id,
        worksheet_name: data?.worksheet_name || data?.worksheet || prev.worksheet_name,
        worksheet_id: data?.worksheet_id || prev.worksheet_id,
        new_spreadsheet_name: data?.new_spreadsheet_name ?? prev.new_spreadsheet_name,
        new_worksheet_name: data?.new_worksheet_name || prev.new_worksheet_name,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.connection_id]);

  useEffect(() => {
    if (!connectionsReady || !formData.connection_id) {
      setSpreadsheets([]);
      setWorksheets([]);
      return;
    }
    if (!needsExistingSpreadsheet) return;
    loadSpreadsheets();
  }, [connectionsReady, formData.connection_id, needsExistingSpreadsheet, loadSpreadsheets]);

  useEffect(() => {
    if (
      !connectionsReady ||
      !formData.connection_id ||
      !formData.spreadsheet_id ||
      !needsExistingWorksheet
    ) {
      if (!needsExistingWorksheet) setWorksheets([]);
      return;
    }
    loadWorksheets();
  }, [
    connectionsReady,
    formData.connection_id,
    formData.spreadsheet_id,
    needsExistingWorksheet,
    loadWorksheets,
  ]);

  const handleChange = (updates: Partial<GoogleSheetsFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canonical = (d: GoogleSheetsFormData | GoogleSheetsNodeData): GoogleSheetsFormData => ({
    connection_id: d?.connection_id || '',
    action: resolveAction(d as GoogleSheetsNodeData),
    spreadsheet_id:
      (d as GoogleSheetsFormData)?.spreadsheet_id ||
      (d as GoogleSheetsNodeData)?.spreadsheetId ||
      '',
    worksheet_name:
      (d as GoogleSheetsFormData)?.worksheet_name ||
      (d as GoogleSheetsNodeData)?.worksheet ||
      '',
    worksheet_id: d?.worksheet_id || '',
    new_spreadsheet_name: (d as GoogleSheetsFormData)?.new_spreadsheet_name || '',
    new_worksheet_name: (d as GoogleSheetsFormData)?.new_worksheet_name || 'Sheet1',
  });

  const canonicalFormData = useMemo(() => canonical(formData), [formData]);

  const { isValid, validationErrors } = useMemo(() => {
    const errors: string[] = [];
    if (!canonicalFormData.connection_id.trim()) errors.push('Please select a connection');
    const action = canonicalFormData.action;
    if (action === 'append' || action === 'overwrite') {
      if (!canonicalFormData.spreadsheet_id.trim()) errors.push('Please select a spreadsheet');
      if (!canonicalFormData.worksheet_name.trim()) errors.push('Please select a worksheet');
    } else if (action === 'new_worksheet') {
      if (!canonicalFormData.spreadsheet_id.trim()) errors.push('Please select a spreadsheet');
      if (!canonicalFormData.worksheet_name.trim())
        errors.push('Please enter a name for the new worksheet');
    } else if (action === 'new_spreadsheet') {
      if (!canonicalFormData.new_spreadsheet_name.trim())
        errors.push('Please enter a name for the new spreadsheet');
      if (!canonicalFormData.new_worksheet_name.trim())
        errors.push('Please enter a worksheet/tab name');
    }
    return { isValid: errors.length === 0, validationErrors: errors };
  }, [canonicalFormData]);

  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;

  const prevValidationRef = useRef<{ isValid: boolean; errorCount: number } | null>(null);

  useEffect(() => {
    const currentValidation = { isValid, errorCount: validationErrors.length };
    if (
      onValidateRef.current &&
      (!prevValidationRef.current ||
        prevValidationRef.current.isValid !== currentValidation.isValid ||
        prevValidationRef.current.errorCount !== currentValidation.errorCount)
    ) {
      prevValidationRef.current = currentValidation;
      onValidateRef.current(isValid, validationErrors);
    }
  }, [isValid, validationErrors]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (compact && onChangeRef.current) {
      onChangeRef.current(canonicalFormData);
    }
  }, [compact, canonicalFormData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onChange(canonical(formData));
    onClose();
  };

  const activeActionOption = ACTION_OPTIONS.find((o) => o.value === formData.action);

  const formContent = (
    <div className="space-y-4 sm:space-y-6">
      {/* Connection */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-primary/10 text-blue-primary ">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Connection</h3>
              <p className="text-xs text-secondary">Select your Google Sheets connection</p>
            </div>
          </div>
          {formData.connection_id && (
            <div className="sm:ml-auto">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success-bg text-success text-xs font-medium">
                <ExternalLink className="w-3 h-3" />
                Connected
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Select
              value={formData.connection_id || ''}
              onChange={(val) => handleChange({ connection_id: String(val || '') })}
              options={
                connectionsLoading
                  ? []
                  : connections.map((c) => ({ value: c.id, label: c.name }))
              }
              placeholder={
                connectionsLoading ? 'Loading connections...' : 'Choose a Google Sheets connection'
              }
            />
          </div>
          <div className="flex-shrink-0">
            <a
              href="/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-primary hover:text-blue-primary hover:bg-blue-soft rounded-lg transition-colors border border-blue-border whitespace-nowrap h-10"
              title="Manage connections"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Manage</span>
            </a>
          </div>
        </div>

        {!connectionsLoading && connections.length === 0 && (
          <div className="p-3 rounded-lg bg-warning-bg border border-warning/20">
            <p className="text-sm text-warning">
              No Google Sheets connections found. Please create one in the Connections page.
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-line-1">
          <div className="p-2 rounded-lg bg-warning-bg text-warning">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-1">Action</h3>
            <p className="text-xs text-text-2">Choose how the data should be written</p>
          </div>
        </div>

        <div className="space-y-3">
          <Select
            label="Action"
            value={formData.action}
            onChange={(val) => {
              const next = String(val || 'append') as GoogleSheetsAction;
              handleChange({ action: next });
            }}
            options={ACTION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {activeActionOption && (
            <div className="bg-blue-primary/10 rounded-lg p-3 border border-blue-primary/20">
              <div className="text-xs text-blue-primary">
                <strong>
                  {activeActionOption.label.split(' - ')[0]}:
                </strong>{' '}
                {activeActionOption.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target Selection */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 border-b border-primary/20">
          <div className="p-2 rounded-lg bg-success-bg text-success">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Target</h3>
            <p className="text-xs text-secondary">
              {formData.action === 'new_spreadsheet'
                ? 'Name the new spreadsheet and worksheet tab'
                : formData.action === 'new_worksheet'
                  ? 'Choose the spreadsheet and name the new worksheet'
                  : 'Choose the target spreadsheet and worksheet'}
            </p>
          </div>
        </div>

        {needsExistingSpreadsheet && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  label="Spreadsheet"
                  value={formData.spreadsheet_id || ''}
                  onChange={(val) =>
                    handleChange({
                      spreadsheet_id: String(val || ''),
                      worksheet_name: '',
                      worksheet_id: '',
                    })
                  }
                  options={
                    spreadsheetsLoading
                      ? []
                      : spreadsheets.map((s) => ({ value: s.id, label: s.name }))
                  }
                  placeholder={
                    !formData.connection_id
                      ? 'Select a connection first'
                      : spreadsheetsLoading
                        ? 'Loading spreadsheets...'
                        : spreadsheets.length === 0
                          ? 'No spreadsheets found'
                          : 'Select a spreadsheet'
                  }
                  disabled={!formData.connection_id || spreadsheetsLoading}
                />
              </div>
              {formData.connection_id && (
                <button
                  type="button"
                  onClick={loadSpreadsheets}
                  disabled={spreadsheetsLoading}
                  className="p-2 text-blue-primary hover:text-blue-800 disabled:text-gray-400"
                  title="Refresh spreadsheets"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${spreadsheetsLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              )}
            </div>

            {spreadsheetsError && (
              <div className="text-sm text-red-600 bg-red-500/10 border border-red-200/50 rounded-md p-2">
                {spreadsheetsError}
              </div>
            )}
          </div>
        )}

        {needsExistingWorksheet && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                label="Worksheet"
                value={formData.worksheet_name || ''}
                onChange={(val) => {
                  const selectedWorksheet = worksheets.find((w) => w.title === val);
                  handleChange({
                    worksheet_name: String(val || ''),
                    worksheet_id: selectedWorksheet
                      ? selectedWorksheet.sheet_id.toString()
                      : '',
                  });
                }}
                options={
                  worksheetsLoading
                    ? []
                    : worksheets.map((w) => ({
                        value: w.title,
                        label: `${w.title} (${w.grid_properties?.rowCount || '?'} rows × ${w.grid_properties?.columnCount || '?'} cols)`,
                      }))
                }
                placeholder={
                  !formData.spreadsheet_id
                    ? 'Select a spreadsheet first'
                    : worksheetsLoading
                      ? 'Loading worksheets...'
                      : worksheets.length === 0
                        ? 'No worksheets found'
                        : 'Select a worksheet'
                }
                disabled={!formData.spreadsheet_id || worksheetsLoading}
              />
            </div>
            {formData.spreadsheet_id && (
              <button
                type="button"
                onClick={loadWorksheets}
                disabled={worksheetsLoading}
                className="p-2 text-blue-primary hover:text-blue-800 disabled:text-gray-400"
                title="Refresh worksheets"
              >
                <RefreshCw className={`w-4 h-4 ${worksheetsLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}

        {formData.action === 'new_worksheet' && (
          <div className="space-y-3">
            <Input
              label="New worksheet name"
              value={formData.worksheet_name || ''}
              onChange={(e) => handleChange({ worksheet_name: e.currentTarget.value })}
              placeholder="e.g. Daily_{{date}}"
              helperText="Must not already exist in the spreadsheet at run time."
            />
            <TemplateTokensHint />
          </div>
        )}

        {formData.action === 'new_spreadsheet' && (
          <div className="space-y-3">
            <Input
              label="New spreadsheet name"
              value={formData.new_spreadsheet_name || ''}
              onChange={(e) =>
                handleChange({ new_spreadsheet_name: e.currentTarget.value })
              }
              placeholder="e.g. Q1 Report_{{date}}"
              helperText="A new file is created in Google Drive, owned by the connected account."
            />
            <Input
              label="Worksheet tab name"
              value={formData.new_worksheet_name || ''}
              onChange={(e) =>
                handleChange({ new_worksheet_name: e.currentTarget.value })
              }
              placeholder="Sheet1"
              helperText="Name of the first tab inside the new spreadsheet."
            />
            <TemplateTokensHint />
          </div>
        )}

        {needsExistingSpreadsheet &&
          formData.spreadsheet_id &&
          spreadsheets.length > 0 && (
            <div className="text-xs text-text-2 bg-bg-card/50 rounded-md p-3 border border-line-1">
              <div className="font-medium text-text-1">Selected Spreadsheet:</div>
              <div className="mt-1">
                {(() => {
                  const selected = spreadsheets.find((s) => s.id === formData.spreadsheet_id);
                  return selected ? (
                    <div>
                      <div className="text-text-1">{selected.name}</div>
                      <a
                        href={selected.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-primary hover:text-blue-primary inline-flex items-center gap-1"
                      >
                        Open in Google Sheets
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    'Unknown spreadsheet'
                  );
                })()}
              </div>
            </div>
          )}
      </div>
    </div>
  );

  if (compact) {
    return <div className="space-y-4">{formContent}</div>;
  }

  return (
    <BaseEditorWrapper
      title="Google Sheets"
      icon={<GoogleSheetsIcon size={28} />}
      onClose={onClose}
      onSubmit={handleSubmit}
      isValid={isValid}
      initialValues={canonical(data)}
      currentValues={canonical(formData)}
    >
      {formContent}
    </BaseEditorWrapper>
  );
};

export default GoogleSheetsEditor;
